// 聊天引擎：模块级 reactive 状态 + 导演循环。
// 双模式：'ai' 用大模型逐句接龙（走 /ark-api 代理，仅本地 dev 可用），
// 'script' 按内置话题剧本演出（生产环境兜底）。探活失败自动降级。
import { reactive } from 'vue'
import { chatCompletion } from '../../../lib/llm.js'
import { PACE } from './constants.js'
import { personaOf, makeEmployees } from './personas.js'
import { TOPICS, BOSS_HIJACKS, REACTIONS, SYSTEM_EVENTS } from './topics.js'

let msgId = 0
let timer = null
let ticker = null
let topic = null // 当前剧本话题（运行期副本，含 cursor）
let pendingTopic = null // 用户点播的下一个话题
let lastTopicId = null
let aiTopicTurns = 0 // AI 模式在当前话题上已聊的轮数

export const sim = reactive({
  running: false,
  speed: 1,
  mode: 'boot', // boot | ai | script
  aiReady: false,
  aiBusy: false,
  aiFailStreak: 0,
  aiQuota: 10, // 每批 AI 轮数上限（省 token：用完自动暂停，手动「继续」再加一批）
  aiUsed: 0, // 本批已聊的 AI 轮数
  scene: null, // 剧情模式：{ theme, cast, turnsLeft, lastWho }，null=日常闲聊
  employees: [],
  messages: [],
  topicTitle: ''
})

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function clock() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function bubbleTtl(text) {
  return Math.min(PACE.bubbleMax, PACE.bubbleBase + text.length * PACE.bubblePerChar)
}

function trimFeed() {
  if (sim.messages.length > 140) sim.messages.splice(0, sim.messages.length - 140)
}

// —— 消息出口：右侧群聊 feed + 舞台气泡，两处同步 ——

function pushSystem(text) {
  sim.messages.push({ id: ++msgId, kind: 'sys', text, time: clock() })
  trimFeed()
}

function say(key, text) {
  const emp = sim.employees.find((e) => e.key === key)
  if (!emp || !text) return
  emp.bubble = text
  emp.bubbleUntil = Date.now() + bubbleTtl(text)
  emp.speaking = true
  setTimeout(() => {
    emp.speaking = false
  }, 450)
  sim.messages.push({ id: ++msgId, kind: 'chat', who: key, text, time: clock() })
  trimFeed()
}

function clearExpiredBubbles() {
  const now = Date.now()
  for (const emp of sim.employees) {
    if (emp.bubble && now > emp.bubbleUntil) emp.bubble = ''
  }
}

// —— 导演循环 ——

function schedule(base) {
  clearTimeout(timer)
  if (!sim.running) return
  const jitter = base + Math.random() * base * 0.4
  timer = setTimeout(nextTurn, Math.max(700, jitter / sim.speed))
}

function nextTurn() {
  if (!sim.running) return
  // 剧情模式进行中：一心开会，不插日常琐事
  if (sim.scene) {
    sceneTurn()
    return
  }
  // 偶发氛围事件与老板突袭，打乱节奏
  if (Math.random() < 0.06) {
    pushSystem(pick(SYSTEM_EVENTS))
    schedule(2600)
    return
  }
  if (Math.random() < 0.07) {
    say('boss', pick(BOSS_HIJACKS))
    schedule(2800)
    return
  }
  if (sim.mode === 'ai') aiTurn()
  else scriptTurn()
}

// —— 剧本引擎：话题剧本顺序演出 ——

function nextTopic() {
  const t = pendingTopic || pick(TOPICS.filter((x) => x.id !== lastTopicId))
  pendingTopic = null
  lastTopicId = t.id
  return { id: t.id, title: t.title, cast: t.cast, lines: t.lines, cursor: 0 }
}

function scriptTurn() {
  if (!topic || topic.cursor >= topic.lines.length) {
    topic = nextTopic()
    if (sim.topicTitle !== topic.title) pushSystem(`📢 新话题：${topic.title}`)
    sim.topicTitle = topic.title
    schedule(PACE.topicGap)
    return
  }
  // 两成概率让话题外的人插一句自己的碎碎念
  if (Math.random() < 0.18) {
    const bystanders = sim.employees.filter((e) => !topic.cast.includes(e.key))
    if (bystanders.length) {
      const b = pick(bystanders)
      say(b.key, pick(b.persona.idle))
    }
  }
  const line = topic.lines[topic.cursor++]
  say(line.who, line.text)
  if (topic.cursor >= topic.lines.length) topic = null
  schedule(line.wait || PACE.lineGap)
}

// —— AI 接龙：每轮挑一个人，让大模型以该人设说一句话 ——

function pickAiSpeaker() {
  const chats = sim.messages.filter((m) => m.kind === 'chat' && m.who !== 'me')
  const last = chats[chats.length - 1]
  // 七成顺着上一条话头，从"爱接他的话"的人里挑
  if (last && Math.random() < 0.7) {
    const prev = personaOf(last.who)
    if (prev && prev.repliers.length && Math.random() < 0.8) return pick(prev.repliers)
  }
  return pick(sim.employees).key
}

async function askAi(emp, opts = null) {
  const transcript = sim.messages
    .filter((m) => m.kind === 'chat' || m.kind === 'user')
    .slice(-14)
    .map((m) => {
      if (m.kind === 'user') return `我（大老板的朋友）：${m.text}`
      const p = personaOf(m.who)
      return `${p.name}（${p.role}）：${m.text}`
    })
    .join('\n')
  // 剧情模式的议题上下文
  let sceneLine = ''
  if (opts && opts.sceneSummary) {
    sceneLine = `老板布置的议题「${opts.sceneSummary}」讨论结束，请你做一句总结陈词：直接给老板结论，不超过 30 个字。`
  } else if (sim.scene) {
    sceneLine = `当前是老板布置的议题讨论会「${sim.scene.theme}」，发言必须围绕这个议题，可以接同事的话头、补充或抬杠。`
  }
  const system = [
    '这是一场公司群聊模拟：一家中小型互联网公司，员工们在微信群里聊天。',
    `现在轮到「${emp.name}」发言，岗位：${emp.role}。`,
    `人设：${emp.persona.quirk}`,
    sceneLine || (sim.topicTitle && !sim.scene ? `当前话题：${sim.topicTitle}。` : ''),
    '要求：直接输出这个人说的那一句话，不要名字、引号、旁白或解释；不超过 30 个字；口语化、有人味、符合人设；最多带一个 emoji；要接住上文或推动话题。'
  ]
    .filter(Boolean)
    .join('\n')
  const content = await chatCompletion({
    system,
    user: transcript || '（群里还没人说话，随便开个头）',
    temperature: 0.95,
    // deepseek-v4-flash 等推理模型会先输出思维链再给正文，上限太小时正文被截空
    maxTokens: 1000
  })
  return sanitizeAiText(content, emp)
}

function sanitizeAiText(text, emp) {
  let t = (text || '').trim().replace(/\s+/g, ' ')
  t = t.replace(new RegExp(`^${emp.name}[:：]`), '')
  t = t.replace(/^["'「『]|["'」』]$/g, '')
  if (t.length > 60) t = t.slice(0, 58) + '…'
  if (!t) throw new Error('AI 返回了空内容')
  return t
}

async function aiTurn(forcedKey = null, opts = null) {
  clearTimeout(timer)
  const who = forcedKey || pickAiSpeaker()
  const emp = sim.employees.find((e) => e.key === who)
  if (!emp) {
    schedule(1500)
    return
  }
  sim.aiBusy = true
  try {
    const text = await askAi(emp, opts)
    sim.aiFailStreak = 0
    say(who, text)
    if (opts && opts.sceneSummary) {
      pushSystem('✅ 议题讨论完毕，散会！')
      if (sim.topicTitle.startsWith('👑')) sim.topicTitle = ''
      aiTopicTurns = 0
    } else if (sim.topicTitle && !sim.scene && ++aiTopicTurns > 7) {
      sim.topicTitle = ''
      aiTopicTurns = 0
    }
    // 省 token：本批额度用完自动暂停，等人工「继续」再放行下一批
    sim.aiUsed++
    if (sim.aiUsed >= sim.aiQuota) {
      sim.running = false
      clearTimeout(timer)
      const midScene = sim.scene ? '（议题还没聊完，继续后接着开）' : ''
      pushSystem(
        `💤 AI 已连聊 ${sim.aiQuota} 轮，自动暂停省 token——点「▶ 继续」再加一批${midScene ? '，' + midScene : ''}，或切「📜 剧本模式」免费畅聊`
      )
      return
    }
    schedule(PACE.aiGap)
  } catch {
    sim.aiFailStreak++
    if (sim.aiFailStreak >= 2) {
      sim.mode = 'script'
      sim.aiBusy = false
      sim.scene = null
      pushSystem('⚠️ AI 接口连不上了，切回剧本模式')
      schedule(2200)
      return
    }
    schedule(2500)
  } finally {
    sim.aiBusy = false
  }
}

// —— 剧情模式：用户以王总身份布置议题，指定员工开会讨论，李经理收尾 ——

function sceneTurn() {
  const sc = sim.scene
  if (!sc) {
    schedule(1500)
    return
  }
  if (sc.turnsLeft <= 0) {
    const theme = sc.theme
    sim.scene = null
    aiTurn('pm', { sceneSummary: theme })
    return
  }
  sc.turnsLeft--
  // 不连着两个人重复发言
  const pool = sc.cast.filter((k) => k !== sc.lastWho)
  const who = pick(pool.length ? pool : sc.cast)
  sc.lastWho = who
  aiTurn(who)
}

export function startBossScene(theme) {
  const t = (theme || '').trim().slice(0, 40)
  if (!t) return
  if (sim.mode !== 'ai') {
    pushSystem('📜 剧情讨论需要大模型，当前是剧本模式，连上 AI 再开吧')
    return
  }
  if (!sim.running) {
    pushSystem('⏸ 当前已暂停，先点「▶ 继续」再开会')
    return
  }
  if (sim.scene) {
    pushSystem('👑 上一场会还没散，稍等')
    return
  }
  clearTimeout(timer)
  // 王总必不入会（他就是布置任务的人），产品经理必入（负责收尾总结）
  const others = sim.employees
    .filter((e) => e.key !== 'boss' && e.key !== 'pm')
    .sort(() => Math.random() - 0.5)
    .slice(0, 4)
    .map((e) => e.key)
  sim.scene = { theme: t, cast: ['pm', ...others], turnsLeft: 8, lastWho: null }
  sim.topicTitle = `👑 议题：${t}`
  aiTopicTurns = 0
  say('boss', `@全体成员 关于「${t}」，都谈谈看法，散会前给我结论`)
  schedule(2400)
}

// —— 对外 API（页面层调用）——

async function probeAi() {
  try {
    // 上限给足：推理模型的思维链会先消耗 token，太小会导致正文为空误判失败
    await chatCompletion({ system: '只回复一个词：ok', user: 'ok', maxTokens: 512 })
    sim.aiReady = true
    sim.aiFailStreak = 0
    if (sim.mode !== 'ai') {
      sim.mode = 'ai'
      pushSystem('🤖 已连上大模型，切换到 AI 接龙模式')
    }
  } catch {
    sim.aiReady = false
    if (sim.mode === 'boot') {
      sim.mode = 'script'
      pushSystem('📜 大模型不可用，进入剧本模式')
    } else {
      pushSystem('⚠️ AI 接口连接失败，可在上方重试')
    }
  }
}

export function initSim() {
  clearTimeout(timer)
  clearInterval(ticker)
  sim.employees = makeEmployees()
  sim.messages = []
  topic = null
  pendingTopic = null
  lastTopicId = null
  aiTopicTurns = 0
  sim.mode = 'boot'
  sim.aiReady = false
  sim.aiFailStreak = 0
  sim.aiBusy = false
  sim.aiUsed = 0
  sim.scene = null
  sim.running = true
  pushSystem('🕘 新的一天，公司开工，群聊开始刷屏……')
  schedule(1400)
  ticker = setInterval(clearExpiredBubbles, 400)
  probeAi()
}

export function destroySim() {
  clearTimeout(timer)
  clearInterval(ticker)
  timer = null
  ticker = null
  sim.running = false
}

// 重置＝重新初始化（人设、feed、话题全量归零）
export function resetSim() {
  initSim()
}

export function setRunning(on) {
  sim.running = on
  if (on) {
    // 手动续跑＝人工放行，重新发满一批额度
    sim.aiUsed = 0
    schedule(1000)
  } else {
    clearTimeout(timer)
  }
}

export function setSpeed(v) {
  sim.speed = v
}

export function setMode(mode) {
  if (mode === 'ai' && !sim.aiReady) return
  sim.mode = mode
  pushSystem(mode === 'ai' ? '🤖 切换到 AI 接龙' : '📜 切换到剧本模式')
  schedule(1200)
}

export function retryAi() {
  if (sim.mode === 'ai') return
  pushSystem('🤝 正在尝试连接大模型……')
  probeAi()
}

// 点播话题：剧本模式下一轮立即切过去；AI 模式则把话题塞进 prompt
export function requestTopic(title) {
  const t = TOPICS.find((x) => x.title === title)
  if (!t) return
  pendingTopic = t
  topic = null
  sim.topicTitle = t.title
  aiTopicTurns = 0
  pushSystem(`📢 点播话题：${t.title}`)
  schedule(1000)
}

// 用户以"我"的身份插话
export function sendUserMessage(text) {
  const t = (text || '').trim().slice(0, 60)
  if (!t) return
  sim.messages.push({ id: ++msgId, kind: 'user', who: 'me', text: t, time: clock() })
  trimFeed()
  if (!sim.running) {
    pushSystem('⏸ 当前已暂停（省 token），点「▶ 继续」后大家才会接话')
    return
  }
  // 挑两位群友回应；AI 模式只请一位，避免并发请求
  const responders = [...sim.employees].sort(() => Math.random() - 0.5)
  const count = sim.mode === 'ai' ? 1 : 2
  responders.slice(0, count).forEach((emp, i) => {
    setTimeout(() => {
      if (!sim.running) return
      if (sim.mode === 'ai') aiTurn(emp.key)
      else say(emp.key, pick(REACTIONS))
    }, 1200 + i * 2000)
  })
  // 剧本模式再来个四分之一的老板突袭
  if (sim.mode !== 'ai' && Math.random() < 0.25) {
    setTimeout(() => {
      if (sim.running) say('boss', pick(BOSS_HIJACKS))
    }, 5200)
  }
}

// 戳一戳
export function pokeEmployee(key) {
  const emp = sim.employees.find((e) => e.key === key)
  if (emp) say(key, pick(emp.persona.poke))
}
