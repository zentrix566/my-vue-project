// 服务端网页检索中间件：在 vite dev / preview 中提供 /websearch?q=人名 接口。
// 由代理替大模型去搜索引擎抓取「人名 百度百科」的结果摘要，再喂给现有大模型，
// 让生成的年谱基于实时网页资料，而非模型凭记忆臆造。
// 多源兜底：Bing → 百度 → DuckDuckGo，任一可用即取；全部失败再回退维基百科 API；
// 仍失败则返回空结果数组，由调用方降级为「模型凭记忆整理」。
import http from 'node:http'
import https from 'node:https'
import tls from 'node:tls'
import { URL as NodeURL } from 'node:url'

// 本地代理（v2rayN/Xray 等默认 HTTP 代理端口），用于访问被网络拦截的站点（如 wikipedia.org）。
// 可用环境变量 WIKI_PROXY 覆盖，格式 host:port，例如 WIKI_PROXY=127.0.0.1:10808
const PROXY = (process.env.WIKI_PROXY || '127.0.0.1:10808').split(':')
const PROXY_HOST = PROXY[0]
const PROXY_PORT = Number(PROXY[1] || 10808)

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

// 通过本地 HTTP 代理（CONNECT 隧道）抓取 HTTPS 页面：
// 用于访问被网络拦截的站点（如 wikipedia.org）。返回结构与 fetchText 一致。
function fetchTextViaProxy(url, { timeout = 8000 } = {}) {
  return new Promise((resolve) => {
    const u = new NodeURL(url)
    const connectReq = http.request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: `${u.hostname}:443`,
      headers: { Host: `${u.hostname}:443` }
    })
    connectReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy()
        return resolve({ status: res.statusCode || 502, data: '' })
      }
      const tlsSocket = tls.connect({ socket, servername: u.hostname }, () => {
        const req = https.request(
          {
            createConnection: () => tlsSocket,
            host: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: { 'User-Agent': UA, Accept: 'application/json,text/html,*/*' }
          },
          (res2) => {
            let data = ''
            res2.setEncoding('utf8')
            res2.on('data', (c) => (data += c))
            res2.on('end', () => resolve({ status: res2.statusCode, data }))
          }
        )
        req.on('error', () => resolve({ status: 0, data: '' }))
        req.end()
      })
      tlsSocket.on('error', () => resolve({ status: 0, data: '' }))
      tlsSocket.setTimeout(timeout, () => {
        tlsSocket.destroy()
        resolve({ status: 0, data: '' })
      })
    })
    connectReq.on('error', () => resolve({ status: 0, data: '' }))
    connectReq.setTimeout(timeout, () => {
      connectReq.destroy()
      resolve({ status: 0, data: '' })
    })
    connectReq.end()
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

// 维基百科 API 兜底（结构化 JSON）：取词条导言作为上下文。
// 走本地代理（WIKI_PROXY，默认 127.0.0.1:10808）访问 wikipedia.org；代理不通快速失败。
async function wikiExtract(name) {
  const url = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(
    name
  )}&format=json`
  try {
    const r = await fetchTextViaProxy(url, { timeout: 8000 })
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
      snippet: ext // 维基 API 没有正文长度限制，传完整导言让模型有最丰富上下文
    }
  } catch {
    return null
  }
}

// 百度百科开放 API：直连、无需 cookie / 登录、返回结构化 JSON。
// 这是最权威且最稳的来源，优先使用；失败再走搜索引擎兜底。
async function baikeApi(name) {
  const url = `https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?scope=103&format=json&appid=379020&bk_key=${encodeURIComponent(name)}`
  const t0 = Date.now()
  try {
    const r = await fetchText(url)
    if (r.status !== 200 || !r.data) {
      console.log(`[websearch] 百度百科API「${name}」: HTTP ${r.status}，未命中（${Date.now() - t0}ms）`)
      return null
    }
    let j
    try {
      j = JSON.parse(r.data)
    } catch (e) {
      console.log(`[websearch] 百度百科API「${name}」: 返回非JSON（${Date.now() - t0}ms）`)
      return null
    }
    if (!j?.title || !j?.abstract) {
      console.log(`[websearch] 百度百科API「${name}」: 词条「${j?.title || '?'}」无摘要或不存在（${Date.now() - t0}ms）`)
      return null
    }
    // 信息卡（字/所处时代/出生日期/逝世日期等）拼进摘要，正文 abstract 截断保留
    const cardText = (j.card || [])
      .filter((c) => c.name && Array.isArray(c.value))
      .map((c) => `${c.name}：${stripHtml(c.value.join('、')).slice(0, 80)}`)
      .join('；')
    const abstractLen = stripHtml(j.abstract).length
    // 在世检测：卡片有"出生日期"但无"逝世日期" → 疑似在世
    const hasDeathDate = (j.card || []).some((c) => c.name === '逝世日期')
    const alive = !hasDeathDate
    console.log(`[websearch] 百度百科API「${name}」: ✅ 命中词条「${j.title}」（${j.desc || '无简介'}），摘要 ${abstractLen} 字${alive ? '，⚠ 无逝世日期（疑似在世）' : ''}，耗时 ${Date.now() - t0}ms`)
    return {
      title: `${j.title}（百度百科）`,
      url: j.url || `https://baike.baidu.com/item/${encodeURIComponent(name)}`,
      snippet: `${j.desc ? j.desc + '。' : ''}${cardText ? cardText + '。' : ''}${stripHtml(j.abstract).slice(0, 900)}`,
      alive,
      raw: j // 百度百科 API 的完整原始返回（card/abstract/catalog 等全字段），供前端调试面板展示
    }
  } catch (e) {
    console.log(`[websearch] 百度百科API「${name}」: 请求异常 ${e.message || e}（${Date.now() - t0}ms）`)
    return null
  }
}

// 编排：优先百度百科开放 API，失败时依次尝试搜索引擎；全失败回退维基百科
async function search(name) {
  const t0 = Date.now()

  // 1. 最优先：百度百科开放 API（权威、结构化、几乎不被反爬）
  const baike = await baikeApi(name)
  if (baike) {
    // 百度百科命中后，并行尝试维基百科作为补充来源（走本地代理，快速失败不影响主结果）
    const wiki = await wikiExtract(name)
    const results = [{ ...baike, source: 'baike' }]
    if (wiki) {
      console.log(`[websearch] 维基百科「${name}」: ✅ 命中并作为补充来源`)
      results.push({ ...wiki, source: 'wikipedia' })
    } else {
      console.log(`[websearch] 维基百科「${name}」: 未命中或代理不可达（跳过）`)
    }
    return results
  }

  // 2. 兜底：搜索引擎结果摘要
  console.log(`[websearch] 百度百科API未命中「${name}」，降级尝试搜索引擎…`)
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
    const bt = Date.now()
    try {
      const r = await fetchText(b.url)
      if (r.status === 200 && r.data) {
        const res = b.parse(r.data).map((x) => ({ ...x, source: b.key }))
        console.log(`[websearch] 兜底源 ${b.key}「${name}」: ${res.length ? `解析到 ${res.length} 条` : '解析到 0 条'}（${Date.now() - bt}ms）`)
        if (res.length) usedBackends.push(b.key)
        const baike = res.filter((x) => /baike\.baidu\.com/.test(x.url))
        all = all.concat(baike, res.filter((x) => !/baike\.baidu\.com/.test(x.url)))
      } else {
        console.log(`[websearch] 兜底源 ${b.key}「${name}」: HTTP ${r.status} 无数据（${Date.now() - bt}ms）`)
      }
    } catch (e) {
      console.log(`[websearch] 兜底源 ${b.key}「${name}」: 异常 ${e.message || e}（${Date.now() - bt}ms）`)
    }
    if (all.length >= 5) break
  }

  if (all.length === 0) {
    const w = await wikiExtract(name)
    if (w) {
      console.log(`[websearch] 维基百科兜底「${name}」: ✅ 命中`)
      w.source = 'wikipedia'
      usedBackends.push('wikipedia')
      all.push(w)
    } else {
      console.log(`[websearch] 维基百科兜底「${name}」: 未命中`)
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
  console.log(`[websearch] 「${name}」检索完成：${out.length} 条，来源 ${usedBackends.join(', ') || '无'}，总耗时 ${Date.now() - t0}ms`)
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
  const reqT0 = Date.now()
  search(q)
    .then((results) => {
      const usedBackends = [...new Set(results.map((r) => r.source))]
      const alive = results.some((r) => r.alive)
      console.log(`[websearch] "${q}" 响应完成：${results.length} 条，来源: ${usedBackends.join(', ') || '无'}${alive ? '，⚠ 疑似在世' : ''}，接口总耗时 ${Date.now() - reqT0}ms`)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ query: q, results, usedBackends, alive }))
    })
    .catch((e) => {
      console.error(`[websearch] "${q}" 检索失败:`, e)
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ query: q, results: [], error: String(e) }))
    })
}

