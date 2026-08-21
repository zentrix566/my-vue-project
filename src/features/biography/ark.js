// 大模型接口调用：输入人名，返回纯文本年谱
// 请求经由 Vite 代理 /ark-api 转发（火山方舟优先，回退 DeepSeek），鉴权头在服务端注入，前端不接触密钥
import { chatCompletion } from '../../lib/llm.js'

const SYSTEM_PROMPT = `你是一位严谨的中国史人物年谱整理助手，依据「百度百科」（baike.baidu.com）人物词条进行整理。用户输入一个人名，你按下面固定的纯文本格式整理其生平。只输出这几行纯文本，不要输出 markdown、代码块、标题或任何额外说明。

格式模板：
姓名（出生年—死亡年），朝代身份
时间，XX岁，事件简述。
时间，XX岁，事件简述。
卒年死因，终年XX岁

示例（苏武，出使、被扣、牧羊是一件事的连续经过，合并成一行）：
苏武（前140年—前60年），西汉外交家
前100年，40岁，以中郎将持节出使匈奴，副使张胜卷入匈奴内乱受牵连被扣，拒降卫律威逼，被迁至北海牧羊，留居十九年持汉节不屈。
前81年，59岁，汉匈和亲，汉使寻得苏武下落，获释归汉，拜典属国。
前80年，60岁，因子苏元卷入上官桀谋反案受牵连被免官。
前60年病逝，终年80岁

示例（上官桀，注意每行都打包了相邻年份的相关事件，全文只有三行事迹，饱满不零散。就按这个密度来写）：
上官桀（不详—前80年），西汉外戚大臣
前87年，受汉武帝遗诏辅政少帝刘弗陵，与霍光、金日磾同领尚书事。前86年，封安阳侯。
前85年，其子上官安娶霍光女为妻，家族与霍氏结为姻亲。前84年，上官安之女上官氏被立为皇后，上官桀以上官安封桑乐侯、进拜车骑将军。
前81年，联合桑弘羊、燕王刘旦谋诛霍光、废昭帝，事泄被霍光先发举奏。前80年，被族诛。
前80年被诛，终年不详

示例（王莽，注意全部用数字年份，正文里绝不出现"始建国""天凤"等年号字样；年代改元只写"称帝建国，国号新"）：
王莽（前45年—23年），新朝开国皇帝
前22年，23岁，入朝为黄门侍郎，迁射声校尉。前16年，29岁，封新都侯，迁光禄大夫、骑都尉。
前8年，37岁，代王根为大司马辅政。前1年，44岁，哀帝崩，复任大司马，迎立平帝。
6年，50岁，鸩杀平帝，立刘婴（孺子），自称"假皇帝"摄政。9年，53岁，废刘婴称帝，国号新，推行王田、私属、五均六筦及币制改革。
17年，61岁，改制失败，绿林、赤眉相继起义。23年，67岁，绿林军攻入长安，王莽被杀于渐台。
23年被杀，终年67岁

规则：
0. **资料来源限定（最高优先级之一）**：用户消息中会附上检索到的网页资料（优先为百度百科词条内容）。你必须以这些资料为依据整理年谱——生卒年、身份、事迹一律以资料内容为准，不要凭记忆自作主张；若多条资料冲突，以百度百科条目内容优先。若资料确实缺失某关键信息，再按通行说法补充，但正文里不写来源注释或争议。当检索资料为空时，才完全按你的记忆并优先以百度百科口径整理。
1. 第一行：姓名（出生年—死亡年），朝代+身份（如"西汉外交家""北宋文学家"）。生卒年用破折号"—"连接。
2. **纪年一律用数字年份，全文严禁出现年号字样**：所有时间必须写成"前XXX年"（公元前）或"XXX年"（公元后），已知月日的补在年后（如 1037年1月8日、23年10月6日、1368年正月）。**绝对禁止以年号纪年或在正文提及年号**，例如"始建国元年""天凤四年""建安十三年""年号洪武""建元洪武""改元居摄"等一律不允许——把年号换算成对应公元年份后直接写事，正文里也绝不留年号二字（如称帝就写"称帝，国号大明"，不要写"年号洪武"）。提到皇帝时用姓名或庙号，**不要用年号代指**（不要写"洪武借此废丞相"，写"朱元璋借此废丞相"）。公元前的"前"字不能漏也不能多：公元3年写"3年"，公元前3年写"前3年"。不可考写"不详"，绝不用问号"?"或波浪号"~"。不要用"——"连接两个年份表示时间范围，跨多年的事件只写起始年份，跨度在正文里用文字说明（如"留居匈奴十九年"）。同一行内的多个事件也必须按年份由早到晚排列，不要把早年的事写到晚年后面。
   年号换算示例：王莽"始建国元年"=9年，"天凤四年"=17年，"地皇四年"=23年；汉武帝"元狩四年"=前119年；"洪武元年"=1368年。
3. 中间每行写事迹，按时间由早到晚。每个子事件的格式为"时间，XX岁，事件简述。"年纪按周岁，用年份数字直接相减：公元前用大数减小数（例：生于前140年，前100年时为 140-100=40 岁，前81年时为 140-81=59 岁），公元后年份直接相减；跨公元前后的，年纪=公元后年份+公元前年份-1（例：生于前45年，3年时为 45+3-1=47 岁）。**若生年不可考导致年纪算不出，则整段"XX岁，"必须省略，直接写"时间，事件简述。"，绝不能写"不详"占位**。文字简洁，每件事一句话即可。
   **事件行的年份一律写确定的数字年份，行首绝不加"约"字**（"约"只能出现在第一行生卒年里表示生年不详，如"约49年—120年"）；事迹年份本身取通行说法的整数年即可，不要写"约63年""约92年"，否则会被当成格式错误丢弃。
   **行数限制（最高优先级，违反即为失败）**：首行与末行之间的事迹行**严格不超过 5 行，3-5 行最佳**。从整个人生中只挑选最关键的 3-5 个转折点（如出仕/登基、最重大功业、人生转折、失势/被废），其余次要的升迁、封赏、琐事、细碎年份全部舍去或并入相邻行。**最后一条事迹行必须是此人最近期（最近几年）的状况**——在世人物尤其如此，务必写到其最新动态或当前状态，不要停在多年前。像示例那样把同一阶段、相邻年份的几件事打包进同一行，行间用句号衔接。同一年的事件必须在同一行。跨多年的事件用起始年份，跨度在正文写明（如"留居匈奴十九年"），不要写"前100年—前81年"这种范围。
4. 最后一行单独写死亡，以卒年开头、句末写"终年XX岁"，中间不加句号，格式如"前60年病逝，终年80岁"。终年必须是整数周岁（由生卒年推算），实在无法确定才写"终年不详"。
   **死因详略规则**：
   - 自然病逝、年老善终：死因简写为"病逝"或"病卒"即可，如"前60年病逝，终年80岁"。
   - 非正常死亡（被杀、赐死、毒死、自杀、战死、饿死、腰斩、凌迟等）：要写一句稍详细的经过，交代**是谁、以何种方式、在何种情形下**致死，但不超过两小句、三四十字。例如"23年，绿林军攻入长安，王莽被商人杜吴杀于渐台，终年67岁""198年，因反对曹操进位魏王，被曹操赐毒酒鸩杀，终年58岁""前208年，与赵高争权失败，被腰斩于咸阳闹市，夷三族，终年72岁""978年七夕，被宋太宗以牵机药毒杀，终年42岁"。
   - 死因用一个准确的说法，不要堆砌近义词（如不要写"战死被杀"）。
   - **死亡经过只写在最后这一行**，前面的事迹行里不要描述死亡情形（不要出现"X年被杀""X年病逝"等），以免和末行重复。
   **若死亡发生在最后一个事迹行的同一年，把该事迹并进上一行，不要让事迹行和死亡行年份相同。**
5. 生卒年有争议时取通行说法，正文里不写争议或注释，也不要编造没有史料依据的细节。**不要把庙号、谥号、陵号、追赠等身后名单独列为事迹行**（这些不是生平事迹，一概不写）。
6. 不空行、不加序号、不加 markdown 符号，每行就是一个自然段落。第一行末尾不加句号；中间事迹行末尾加句号（一行内多个事件各自以句号结尾）；最后一行不加句号。
7. **在世人物规则（最高优先级之一）**：若用户提供的检索资料中没有任何死亡信息——无"逝世日期"、无去世/病逝/离世/死因等记载——说明该人物可能仍在世。此时**绝对禁止编造死亡年份、死因或"终年"**：首行生卒年写"出生年—至今"（如"许家印（1958年10月9日—至今），中国恒大集团原董事局主席"）；事迹行只列到最近可考的事件；最后一行写成"至今在世"（不加句号）。只有当资料明确记载了死亡（逝世日期、死因）时，才按规则 4 写死亡行。`

// 调用本地 /websearch 代理，抓取人物相关的网页摘要（优先百度百科）。
// 失败或返回空都安全降级：返回空数组，由调用方回退为「模型凭记忆整理」。
async function fetchWebContext(name) {
  try {
    console.log(`[biography] 检索来源: ${name}`)
    const res = await fetch(`/websearch?q=${encodeURIComponent(name)}`)
    const text = await res.text()
    // 如果中间件没生效，Vite 会返回 index.html，这里直接识别并给出明确提示
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('检索服务未启动，请重启 npm run dev 后再试')
    }
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`检索服务返回异常: ${text.slice(0, 80)}`)
    }
    const n = Array.isArray(data?.results) ? data.results.length : 0
    console.log(`[biography] 检索完成: 拿到 ${n} 条来源${data?.usedBackends?.length ? `（来源通道: ${data.usedBackends.join(', ')}）` : ''}${data?.alive ? '，⚠ 疑似在世' : ''}`)
    return {
      results: Array.isArray(data.results) ? data.results : [],
      alive: !!data.alive,
      raw: data // 完整原始 JSON，供页面调试面板展示
    }
  } catch (e) {
    // 把错误继续向上抛，让 UI 能提示用户，而不是静默降级
    console.warn(`[biography] 检索失败: ${e.message}`)
    throw e
  }
}

export async function fetchBiography(name) {
  // 先去服务端检索实时网页资料，作为模型整理的权威上下文
  let context = []
  let alive = false
  let searchError = ''
  let rawApi = null
  try {
    const ctx = await fetchWebContext(name)
    context = ctx.results
    alive = ctx.alive
    rawApi = ctx.raw
  } catch (e) {
    searchError = e.message || String(e)
  }

  let user = name
  if (context.length) {
    const ctx = context
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n来源: ${r.url}`)
      .join('\n\n')
    user = `人物姓名：${name}\n\n以下是检索到的网页资料（优先采用百度百科条目内容），请据此整理其年谱：\n\n${ctx}`
  }

  // 疑似在世：把该信号作为最高优先级约束传给模型，防止臆造死因
  if (alive) {
    user += `\n\n【重要】以上资料中未记载该人物的逝世日期与任何死亡信息，说明此人可能仍在世。请严格按规则 7：不得编造死亡年份、死因或"终年"，首行写"出生年—至今"，末行写"至今在世"。`
  }

  // 硬上限：5 行密集事迹约 600-800 tokens，留足余量；防止模型失控写十几行
  // 模型调用失败（含内容安全审核拦截）不吞掉检索结果：单独记 modelError，sources 照常返回
  let modelError = ''
  let normalized = ''
  let rawOutput = ''
  try {
    const content = await chatCompletion({
      system: SYSTEM_PROMPT,
      user,
      temperature: 0.1,
      maxTokens: 1500
    })
    rawOutput = content
    normalized = normalize(content, { alive })
    console.log(`[biography] 模型输出完成: ${content.length} 字符 → 规范化后 ${normalized.split('\n').length} 行，检索错误: ${searchError || '无'}${alive ? '，⚠ 在世兜底已启用' : ''}`)
  } catch (e) {
    modelError = e.message || String(e)
    console.warn(`[biography] 模型调用失败（检索数据仍可用）: ${modelError}`)
  }
  return {
    result: normalized,
    sources: context,
    searchError,
    modelError,
    // 调试面板用：原始检索 JSON、喂给模型的完整 prompt、模型原始输出
    debug: {
      api: rawApi,
      prompt: user,
      rawOutput
    }
  }
}

  // 对模型输出做轻量规范化，纠正它偶尔不遵守格式的小问题
  // alive: 检索确认疑似在世时，强制剔除编造的死亡行/死因
  function normalize(text, { alive = false } = {}) {
    let lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // 第一行生卒年里出现的问号（半角/全角）统一改成"不详"
      if (line.includes('（') && line.includes('—')) {
        line = line.replace(/[?？]/g, '不详')
      }
      // 事迹行行首的"约"去掉（约只用于首行生卒年不确定时，事件年份一律写数字年）
      line = line.replace(/^约(?=前?\d{1,4}年)/, '')
      // 删掉正文中残留的年号字样（如"年号洪武""改元居摄""神龙元年"）
      line = line
        .replace(/[，、；。]?\s*(?:年号|建元|改元)\s*[\u4e00-\u9fa5]{1,6}/g, '')
        .replace(/[，、；。]?\s*[\u4e00-\u9fa5]{2,4}元年(?:正月|闰?[一二三四五六七八九十冬腊]{1,2}月)?/g, '')
        // 把"前XXX年，YY岁—ZZZ年"或"XXX年，YY岁—ZZZ年"的年份范围截断为起始年
        .replace(/(前?\d{1,4}年，\s*\d{1,3}岁)\s*[—–-]\s*前?\d{1,4}年/g, '$1')
        // 把行首"前XXX年—前YYY年"或"XXX年—YYY年"的范围截断为起始年
        .replace(/^(前?\d{1,4})年\s*[—–-]\s*前?\d{1,4}年/, '$1年')
        // 把"27岁至30岁"这种年龄范围改为起始年龄
        .replace(/(\d{1,3})岁\s*[至到—–-]\s*\d{1,3}岁/g, '$1岁')
        // 去掉末行可能重复的年份前缀（如"1101年，1101年7月28日，" → "1101年7月28日，"）
        .replace(/^((?:前)?\d{1,4}年)[，,]\s*((?:前)?\d{1,4}年)/, '$2')
        .replace(/，{2,}/g, '，')
        .replace(/^[，、；。]/, '')
        .replace(/[，、；。]+$/g, (m) => (m.includes('。') ? '。' : ''))
      return line
    })

  // 过滤掉首行与末行之间不以年份开头的行（模型偶发输出的庙号谥号等非事迹行）
  if (lines.length >= 3) {
    const header = lines[0]
    const death = lines[lines.length - 1]
    const events = lines.slice(1, -1).filter((l) => /^前?\d+年/.test(l))
    // 事件行按首个年份由早到晚排序（公元前记为负数），纠正模型偶发的乱序
    events.sort((a, b) => yearSortKey(a) - yearSortKey(b))
    lines = [header, ...events, death]
  }

  // 末个事迹行若混入了死亡年份的死亡描述，把详情提升到死亡行，再从事迹行删掉那一句
  if (lines.length >= 3) {
    const deathLine = lines[lines.length - 1]
    const lastEventLine = lines[lines.length - 2]
    const deathYear = extractYear(deathLine)
    if (deathYear && lastEventLine.includes(deathYear)) {
      const sentences = lastEventLine
        .split('。')
        .map((s) => s.trim())
        .filter(Boolean)
      const idx = sentences.findIndex((s) => s.includes(deathYear) && hasDeathKeyword(s))
      if (idx !== -1) {
        // 把事迹行里更详细的死亡描述提升为末行
        const detail = sentences[idx]
          .replace(/^前?\d+年(?:[闰正二三四五六七八九十冬腊]{1,2}月)?[，,]\s*(?:\d{1,3}岁[，,]\s*)?/, '')
        const ageMatch = deathLine.match(/终年.+$/)
        lines[lines.length - 1] = `${deathYear}，${detail}，${ageMatch ? ageMatch[0] : '终年不详'}`
        sentences.splice(idx, 1)
      }
      const kept = sentences.join('。')
      if (kept) {
        lines[lines.length - 2] = kept + '。'
      } else {
        lines.splice(lines.length - 2, 1)
      }
    }
  }

  // 事迹行最多保留 5 行：均匀采样——始终保留首条（人生起点）与末条（最新/最近状况），
  // 中间按等分取点，避免只留早期事迹而丢掉人物近况
  const MAX_EVENTS = 5
  if (lines.length - 2 > MAX_EVENTS) {
    const header = lines[0]
    const death = lines[lines.length - 1]
    const allEvents = lines.slice(1, -1)
    const n = allEvents.length
    const idxs = new Set([0, n - 1])
    for (let k = 1; k <= MAX_EVENTS - 2; k++) {
      idxs.add(Math.round((k * (n - 1)) / (MAX_EVENTS - 1)))
    }
    const events = [...idxs].sort((a, b) => a - b).map((i) => allEvents[i])
    lines = [header, ...events, death]
  }

  // 若末行漏写"终年"，但首行有生卒年，自动计算补全
  if (lines.length >= 2) {
    const header = lines[0]
    const lifeMatch = header.match(/\uff08\s*(约?前?\d+年)\s*[\u2014\u2013\u002d\uff0d\u007e\uff5e]\s*(约?前?\d+年|[\u4e0d\u8be6\uff1f?]+)\s*\uff09/)
    if (lifeMatch) {
      const deathLine = lines[lines.length - 1]
      if (!deathLine.includes('终年')) {
        const age = calcLifeAge(lifeMatch[1], lifeMatch[2])
        if (age !== null) {
          lines[lines.length - 1] = `${deathLine.replace(/[\u3002\.]+$/, '')}\uff0c终年${age}\u5c81`
        } else {
          lines[lines.length - 1] = `${deathLine.replace(/[\u3002\.]+$/, '')}\uff0c终年不详`
        }
      }
    }
  }

  // 疑似在世兜底：若末行被模型编造成了死亡行，强制改回"至今在世"；
  // 首行若出现"出生年—死亡年"的编造死亡年，一并改为"出生年—至今"。
  if (alive && lines.length) {
    const last = lines[lines.length - 1]
    if (hasDeathKeyword(last) || /终年/.test(last)) {
      lines[lines.length - 1] = '至今在世'
    }
    lines[0] = lines[0].replace(
      /(\uff08\s*前?\d+年(?:\d+月\d+日)?\s*[\u2014\u2013\u002d\uff0d\u007e\uff5e]\s*)前?\d+年(?:\d+月\d+日)?(\s*\uff09)/,
      '$1至今$2'
    )
  }

  // 末行（死亡行）末尾不加句号
  if (lines.length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[\u3002\.]+$/, '')
  }

  return lines.join('\n')
}

// 根据首行生卒年计算周岁：两字段均为"前XX年"或"XX年"或"不详"
function calcLifeAge(birthStr, deathStr) {
  if (!birthStr || !deathStr) return null
  if (/不详|？|\?/.test(birthStr) || /不详|？|\?/.test(deathStr)) return null
  const bcBirth = /前/.test(birthStr)
  const bcDeath = /前/.test(deathStr)
  const b = parseInt(birthStr.replace(/^约?前?/, ''), 10)
  const d = parseInt(deathStr.replace(/^约?前?/, ''), 10)
  if (Number.isNaN(b) || Number.isNaN(d)) return null
  if (!bcBirth && !bcDeath) return d - b          // 都公元后
  if (bcBirth && bcDeath) return b - d            // 都公元前
  if (bcBirth && !bcDeath) return b + d - 1       // 跨公元前/公元后
  return null                                      // 生于公元后死于公元前（不可能）
}

// 取一行开头年份用于排序：公元前返回负数，公元后返回正数
function yearSortKey(line) {
  const bc = line.match(/^前(\d+)年/)
  if (bc) return -Number(bc[1])
  const ad = line.match(/^(\d+)年/)
  if (ad) return Number(ad[1])
  return 0
}

// 提取一行开头的年份（公元前/公元后，含年月日时取年），无则返回 null
function extractYear(line) {
  const bc = line.match(/^前(\d+)年/)
  if (bc) return '前' + bc[1] + '年'
  const ad = line.match(/^(\d+)年/)
  if (ad) return ad[1] + '年'
  return null
}

// 判断一行是否描述了死亡（用于过滤与死亡行重复的事迹行）
function hasDeathKeyword(line) {
  return /病逝|病卒|病亡|卒于|去世|过[逝世]|死亡|薨|崩|被诛|族诛|伏诛|诛杀|被杀|杀害|所杀|杀于|遇害|见杀|杀身|身死|斩杀|擒杀|击杀|射杀|缢杀|绞杀|坑杀|扼杀|赐死|自杀|自缢|自裁|自尽|自焚|战死|阵亡|遇弑|弑杀|毒死|鸩杀|药杀|处斩|斩首|腰斩|弃市|凌迟|饿死|溺死|吓死|忧死/.test(line)
}
