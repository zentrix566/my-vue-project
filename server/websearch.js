// 服务端网页检索中间件：在 vite dev / preview 中提供 /websearch?q=人名 接口。
// 由代理替大模型去搜索引擎抓取「人名 百度百科」的结果摘要，再喂给现有大模型，
// 让生成的年谱基于实时网页资料，而非模型凭记忆臆造。
// 多源兜底：Bing → 百度 → DuckDuckGo，任一可用即取；全部失败再回退维基百科 API；
// 仍失败则返回空结果数组，由调用方降级为「模型凭记忆整理」。
import https from 'node:https'
import { URL as NodeURL } from 'node:url'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// 单次抓取：不自动跟随重定向（搜索引擎 302 多为反爬校验页，跟随无意义）。
function fetchText(url, { timeout = 12000 } = {}) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' }, timeout },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume()
          return resolve({ status: res.statusCode, data: '' })
        }
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: 200, data }))
      }
    )
    req.on('error', () => resolve({ status: 0, data: '' }))
    req.setTimeout(timeout, () => {
      req.destroy()
      resolve({ status: 0, data: '' })
    })
  })
}

function decodeEntities(s = '') {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(s = '') {
  return decodeEntities(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// 从 DuckDuckGo 的跳转链接里解出真实 URL（/redirect?uddg=编码地址）
function realUrl(raw = '') {
  try {
    const u = new NodeURL(raw, 'https://html.duckduckgo.com')
    if (u.searchParams.has('uddg')) return decodeURIComponent(u.searchParams.get('uddg'))
    return raw
  } catch {
    return raw
  }
}

// ---- 各搜索引擎结果解析（尽力而为，HTML 结构变动时可能需要微调） ----

function parseBing(html) {
  const out = []
  const blocks = html.split(/<li[^>]*class="b_algo"/i).slice(1)
  for (const b of blocks) {
    const titleM = b.match(/<h2>([\s\S]*?)<\/h2>/i)
    if (!titleM) continue
    const linkM = b.match(/<h2>\s*<a[^>]+href="([^"]+)"/i)
    const snippetM = b.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
    out.push({
      title: stripHtml(titleM[1]),
      url: linkM ? linkM[1] : '',
      snippet: snippetM ? stripHtml(snippetM[1]) : ''
    })
  }
  return out.filter((x) => x.title && x.snippet)
}

function parseBaidu(html) {
  const out = []
  const blocks = html.split(/<div[^>]*class="[^"]*c-container/i).slice(1)
  for (const b of blocks) {
    const titleM = b.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
    if (!titleM) continue
    const linkM = b.match(/<a[^>]+href="([^"]+)"/i)
    const snippetM =
      b.match(/<div[^>]*class="[^"]*c-abstract[^"]*"[^>]*>([\s\S]*?)<\/div>/i) ||
      b.match(/<span[^>]*class="[^"]*content-right[^"]*"[^>]*>([\s\S]*?)<\/span>/i)
    out.push({
      title: stripHtml(titleM[1]),
      url: linkM ? linkM[1] : '',
      snippet: snippetM ? stripHtml(snippetM[1]) : ''
    })
  }
  return out.filter((x) => x.title && x.snippet)
}

function parseDDG(html) {
  const out = []
  const re =
    /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    out.push({
      url: realUrl(m[1]),
      title: stripHtml(m[2]),
      snippet: stripHtml(m[3])
    })
  }
  return out.filter((x) => x.title && x.snippet)
}

// 维基百科 API 兜底（结构化 JSON，最稳）：取词条导言作为上下文
async function wikiExtract(name) {
  const url = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(
    name
  )}&format=json`
  try {
    const r = await fetchText(url)
    if (r.status !== 200 || !r.data) return null
    const j = JSON.parse(r.data)
    const pages = j?.query?.pages
    if (!pages) return null
    const k = Object.keys(pages)[0]
    const ext = pages[k]?.extract
    if (!ext) return null
    return {
      title: `${name}（维基百科）`,
      url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(name)}`,
      snippet: ext.slice(0, 600)
    }
  } catch {
    return null
  }
}

// 编排：依次尝试搜索引擎，优先收录 baike.baidu.com 结果；全失败时回退维基
async function search(name) {
  const q = `${name} 百度百科 生平`
  const eq = encodeURIComponent(q)
  const backends = [
    { key: 'bing', url: `https://www.bing.com/search?q=${eq}`, parse: parseBing },
    { key: 'baidu', url: `https://www.baidu.com/s?wd=${eq}`, parse: parseBaidu },
    { key: 'ddg', url: `https://html.duckduckgo.com/html/?q=${eq}`, parse: parseDDG }
  ]

  let all = []
  const usedBackends = []
  for (const b of backends) {
    try {
      const r = await fetchText(b.url)
      if (r.status === 200 && r.data) {
        const res = b.parse(r.data).map((x) => ({ ...x, source: b.key }))
        if (res.length) usedBackends.push(b.key)
        const baike = res.filter((x) => /baike\.baidu\.com/.test(x.url))
        all = all.concat(baike, res.filter((x) => !/baike\.baidu\.com/.test(x.url)))
      }
    } catch {
      /* 忽略单个源失败，继续下一个 */
    }
    if (all.length >= 5) break
  }

  if (all.length === 0) {
    const w = await wikiExtract(name)
    if (w) {
      w.source = 'wikipedia'
      usedBackends.push('wikipedia')
      all.push(w)
    }
  }

  // 去重并截断
  const seen = new Set()
  const out = []
  for (const x of all) {
    const key = x.title + x.snippet.slice(0, 20)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(x)
    if (out.length >= 6) break
  }
  return out
}

// Vite 中间件：挂载到 /websearch
export function webSearchMiddleware(req, res, next) {
  const u = new NodeURL(req.url, 'http://localhost')
  if (!u.pathname.startsWith('/websearch')) return next()

  const q = u.searchParams.get('q') || ''
  if (!q) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'missing q' }))
    return
  }

  console.log(`[websearch] 接收查询: "${q}"`)
  search(q)
    .then((results) => {
      const usedBackends = [...new Set(results.map((r) => r.source))]
      console.log(`[websearch] "${q}" 命中 ${results.length} 条，来源: ${usedBackends.join(', ') || '无'}`)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ query: q, results, usedBackends }))
    })
    .catch((e) => {
      console.error(`[websearch] "${q}" 检索失败:`, e)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ query: q, results: [], error: String(e) }))
    })
}

