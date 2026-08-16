<template>
  <div class="emperor-page">
    <RouterLink class="back" to="/">← 返回首页</RouterLink>
    <h1 class="title">👑 皇帝模拟器 · 日理万机</h1>
    <p class="subtitle">
      你登基了。奏折一份份呈上来，赈灾、边患、党争、选秀……朱笔一勾，便是天下。
      国库、民心、军力、朝纲、圣躬，五者其一归零即亡国；寿数一到，史官自会给你一个谥号。
    </p>

    <!-- 开局：定年号、登基 -->
    <div v-if="phase === 'start'" class="start-card">
      <h2 class="start-title">先帝驾崩，梓宫前，礼部请拟新年号</h2>
      <div class="era-row">
        <input
          v-model="eraInput"
          class="era-input"
          maxlength="4"
          placeholder="拟一个年号（至多四字）"
        />
        <button class="btn ghost" @click="randomEra">换个 🎲</button>
      </div>
      <p class="start-hint">例：永乐 · 万历 · 康熙 · 天佑 · 靖安</p>
      <label class="fast-toggle">
        <input type="checkbox" v-model="startFastMode" />
        <span>⚡ 快速模式（自动批阅，一路直达结局）</span>
      </label>
      <button class="btn primary big" @click="startGame">登基 · 亲政</button>
      <div class="start-rules">
        <p>🗓️ 每月批一份奏折，十二月后岁末结算：税银入库、军饷官俸支出。</p>
        <p>💀 民心尽失则义军入京，军力尽丧则胡马渡江，朝纲崩坏则权臣篡位，国库告罄则将士哗变。</p>
        <p>🕯️ 健康归零或大限已至便驾崩，史官依政绩上庙号、谥号。批折劳形，且行且惜。</p>
      </div>
    </div>

    <!-- 在位：朝堂主界面 -->
    <div v-else-if="phase === 'play'" class="game-grid">
      <section class="main-col">
        <div class="status-panel">
          <div class="reign-line">
            <span class="era-badge">{{ state.eraName }}</span>
            <span class="year-text">{{ cnYear(state.year) }} · {{ MONTH_NAMES[state.month - 1] }}</span>
            <span class="fast-badge" v-if="fastMode">⚡ 快速</span>
            <span class="age-text">朕 {{ state.age }} 岁</span>
          </div>
          <div class="fast-bar" v-if="fastMode">
            <span class="fast-hint">⚡ 自动批阅中…</span>
            <button class="btn ghost sm" @click="takeOver">✋ 接管</button>
            <button class="btn ghost sm" @click="simulateToEnd">⏭ 直接看结局</button>
          </div>
          <div class="stat-row" v-for="st in statList" :key="st.key">
            <span class="stat-label">{{ st.icon }} {{ st.name }}</span>
            <div class="stat-bar">
              <div
                class="stat-fill"
                :class="{ danger: st.value < 25 }"
                :style="{ width: st.pct + '%' }"
              ></div>
            </div>
            <span class="stat-value">{{ st.display }}</span>
          </div>
        </div>

        <Transition name="card" mode="out-in">
          <!-- 岁末结算 -->
          <div v-if="cardMode === 'summary'" key="summary" class="memorial summary">
            <div class="summary-head">📜 {{ state.eraName }}{{ cnYear(state.year - 1) }} · 岁末结算</div>
            <ul class="summary-list">
              <li v-for="row in settlement.rows" :key="row.label" :class="{ gain: row.value > 0, loss: row.value < 0 }">
                <span>{{ row.label }}</span>
                <span>{{ row.value > 0 ? '+' : '' }}{{ row.value }} 万两</span>
              </li>
              <li class="total">
                <span>岁计盈亏</span>
                <span>{{ settlement.net > 0 ? '+' : '' }}{{ settlement.net }} 万两</span>
              </li>
            </ul>
            <p class="summary-note">{{ settlement.note }}</p>
            <button class="btn primary" @click="continuePlay">明年再说 →<span v-if="countdown > 0 && !fastMode"> ({{ countdown }})</span></button>
          </div>

          <!-- 奏折：事件 -->
          <div v-else-if="cardMode === 'event' && currentEvent" :key="currentEvent.id" class="memorial">
            <span class="tag">{{ currentEvent.tag }}</span>
            <span class="vertical-deco">奏·折</span>
            <h2 class="memorial-title">【{{ currentEvent.title }}】</h2>
            <p class="memorial-from">{{ currentEvent.from }}</p>
            <p class="memorial-text">{{ currentEvent.text }}</p>
            <div class="options">
              <button
                v-for="opt in currentEvent.options"
                :key="opt.label"
                class="btn option"
                @click="choose(opt)"
              >{{ opt.label }}</button>
            </div>
          </div>

          <!-- 奏折：朱批结果 -->
          <div v-else-if="cardMode === 'result'" key="result" class="memorial result">
            <span class="tag">朱批</span>
            <div class="seal">朕已阅</div>
            <p class="result-text">{{ chosen.result }}</p>
            <div class="delta-chips">
              <span
                v-for="d in appliedDeltas"
                :key="d.label"
                class="chip"
                :class="{ gain: d.value > 0, loss: d.value < 0 }"
              >{{ d.label }} {{ d.value > 0 ? '+' : '' }}{{ d.value }}</span>
            </div>
            <button class="btn primary" @click="continuePlay">继续批阅 →<span v-if="countdown > 0 && !fastMode"> ({{ countdown }})</span></button>
          </div>
        </Transition>
      </section>

      <aside class="history-panel">
        <h3>🖋️ 史官记事</h3>
        <p class="history-empty" v-if="!history.length">臣提笔以待，静观圣裁。</p>
        <ol class="history-list">
          <li v-for="(h, i) in historyView" :key="history.length - i">
            <span class="h-when">{{ state.eraName }}{{ cnYear(h.y) }}{{ h.m }}</span>
            <span class="h-text">{{ h.text }}</span>
          </li>
        </ol>
      </aside>
    </div>

    <!-- 结局：盖棺论定 -->
    <div v-else class="end-card" :class="ending.kind">
      <p class="end-kicker">{{ ending.kind === 'ruin' ? 'ᅳ 国祚已终 ᅳ' : 'ᅳ 龙驭上宾 ᅳ' }}</p>
      <h2 class="end-temple">{{ ending.temple }}</h2>
      <p class="end-title">{{ ending.posthumous }}</p>
      <p class="end-text">{{ ending.text }}</p>
      <div class="end-stats">
        <span>年号 {{ state.eraName }}</span>
        <span>在位 {{ state.year }} 年</span>
        <span>享年 {{ state.age }} 岁</span>
        <span>批阅奏章 {{ state.handled }} 道</span>
      </div>
      <button class="btn primary big" @click="restart">再世为人 · 重开一局</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { emperorEvents } from '../data/emperorEvents.js'

const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const ERA_SUGGESTIONS = ['天佑', '弘业', '昌隆', '靖安', '永熙', '泰宁', '乾元', '昭武', '广德', '承光', '嘉运', '隆安', '明德', '盛平', '延祚', '景和']
const STAT_META = [
  { key: 'treasury', name: '国库', icon: '💰', kind: 'money' },
  { key: 'people', name: '民心', icon: '❤️', kind: 'percent' },
  { key: 'army', name: '军力', icon: '⚔️', kind: 'percent' },
  { key: 'court', name: '朝纲', icon: '⚖️', kind: 'percent' },
  { key: 'health', name: '圣躬', icon: '🌿', kind: 'percent' }
]

const phase = ref('start')
const cardMode = ref('event')
const eraInput = ref('')
const currentEvent = ref(null)
const chosen = ref(null)
const appliedDeltas = ref([])
const history = ref([])
const settlement = reactive({ rows: [], net: 0, note: '' })
const ending = reactive({ kind: 'death', temple: '', posthumous: '', text: '' })

// ── 快速模式 & 自动批阅 ──
const fastMode = ref(false) // 当前是否在位中处于快速模式
const startFastMode = ref(false) // 开局界面勾选的快速模式
const countdown = ref(0) // 普通模式「继续批阅」倒计时
let advanceTimer = null
let countdownTimer = null
let autoPickTimer = null

function clearAllTimers() {
  if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null }
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
  if (autoPickTimer) { clearTimeout(autoPickTimer); autoPickTimer = null }
  countdown.value = 0
}

// 朱批结果 / 岁末结算后，安排自动进入下一道
function scheduleAdvance() {
  clearAllTimers()
  if (fastMode.value) {
    advanceTimer = setTimeout(continuePlay, 200)
    return
  }
  countdown.value = 5
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
  advanceTimer = setTimeout(continuePlay, 5000)
}

const state = reactive({
  eraName: '',
  year: 1,
  month: 1,
  age: 18,
  lifespan: 65,
  treasury: 1200,
  people: 60,
  army: 60,
  court: 60,
  health: 90,
  handled: 0
})

const statList = computed(() =>
  STAT_META.map((m) => {
    const value = state[m.key]
    return {
      ...m,
      value,
      pct: m.kind === 'money' ? Math.min(100, Math.round((value / 3000) * 100)) : Math.max(0, Math.min(100, value)),
      display: m.kind === 'money' ? `${Math.round(value)} 万两` : Math.round(value)
    }
  })
)

const historyView = computed(() => history.value.slice(-40).reverse())

// 数字转中文年份：1 → 元，21 → 二十一
function cnYear(y) {
  if (y <= 1) return '元年'
  const digits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  let text = ''
  const tens = Math.floor(y / 10)
  if (tens > 1) text += digits[tens]
  if (tens >= 1) text += '十'
  const ones = y % 10
  text += digits[ones]
  return text + '年'
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomEra() {
  eraInput.value = pick(ERA_SUGGESTIONS.filter((e) => e !== eraInput.value))
}

function startGame() {
  clearAllTimers()
  const era = eraInput.value.trim()
  fastMode.value = startFastMode.value
  state.eraName = era || pick(ERA_SUGGESTIONS)
  state.year = 1
  state.month = 1
  state.age = 16 + Math.floor(Math.random() * 7)
  state.lifespan = 55 + Math.floor(Math.random() * 21)
  state.treasury = 1200
  state.people = 60
  state.army = 60
  state.court = 60
  state.health = 90
  state.handled = 0
  history.value = []
  chosen.value = null
  phase.value = 'play'
  cardMode.value = 'event'
  drawEvent()
  history.value.push({
    y: 1,
    m: '正月',
    text: `新帝即位，改元${state.eraName}，大赦天下（除了没钱大赦，就意思一下）。`
  })
}

// 效果数值上下浮动两成，免得每局一模一样
function jitter(v) {
  return Math.round(v * (0.8 + Math.random() * 0.4))
}

function selectEvent() {
  const pool = emperorEvents.filter((e) => !e.cond || e.cond(state))
  const usable = pool.filter((e) => e.id !== lastEventId.value)
  const candidates = usable.length ? usable : pool
  const total = candidates.reduce((sum, e) => {
    const w = typeof e.weight === 'function' ? e.weight(state) : (e.weight ?? 10)
    return sum + w
  }, 0)
  let roll = Math.random() * total
  for (const e of candidates) {
    const w = typeof e.weight === 'function' ? e.weight(state) : (e.weight ?? 10)
    roll -= w
    if (roll <= 0) {
      lastEventId.value = e.id
      return e
    }
  }
  return candidates[candidates.length - 1]
}

function drawEvent() {
  currentEvent.value = selectEvent()
  // 快速模式：稍候自动朱批，无需手动点选项
  if (fastMode.value) {
    autoPickTimer = setTimeout(() => {
      if (currentEvent.value && currentEvent.value.options && currentEvent.value.options.length) {
        choose(pick(currentEvent.value.options))
      }
    }, 450)
  }
}

const lastEventId = ref('')

function applyChoice(opt) {
  const applied = {}
  for (const [key, raw] of Object.entries(opt.effects ?? {})) {
    applied[key] = jitter(raw)
    state[key] += applied[key]
  }
  state.people = Math.max(0, Math.min(100, state.people))
  state.army = Math.max(0, Math.min(100, state.army))
  state.court = Math.max(0, Math.min(100, state.court))
  state.health = Math.max(0, Math.min(100, state.health))
  state.treasury = Math.max(0, state.treasury)

  history.value.push({
    y: state.year,
    m: MONTH_NAMES[state.month - 1],
    text: `${currentEvent.value.title}，${opt.label}。`
  })
  state.handled += 1
  return applied
}

function choose(opt) {
  const applied = applyChoice(opt)
  appliedDeltas.value = STAT_META.filter((m) => applied[m.key])
    .map((m) => ({
      label: `${m.icon}${m.name}${m.kind === 'money' ? '(万两)' : ''}`,
      value: applied[m.key]
    }))
  chosen.value = opt
  cardMode.value = 'result'
  scheduleAdvance()
}

// 快速模式：一键模拟到结局（不发事件动画，直接跑完数值）
function simulateToEnd() {
  clearAllTimers()
  let guard = 0
  while (guard++ < 5000) {
    if (state.month >= 12) {
      if (checkEndings()) return
      yearEnd()
      if (checkEndings()) return
    } else {
      const e = selectEvent()
      currentEvent.value = e
      const opt = pick(e.options)
      applyChoice(opt)
      state.month += 1
      if (checkEndings()) return
    }
  }
}

// 快速模式中途接管，转回手动批阅
function takeOver() {
  clearAllTimers()
  fastMode.value = false
}

function continuePlay() {
  clearAllTimers()
  // 结算卡之后的继续：进入新年第一份奏折
  if (cardMode.value === 'summary') {
    if (checkEndings()) return
    drawEvent()
    cardMode.value = 'event'
    return
  }
  // 朱批之后的继续：先看本月是否年关
  if (state.month >= 12) {
    yearEnd()
    if (checkEndings()) return
    cardMode.value = 'summary'
    scheduleAdvance()
  } else {
    state.month += 1
    if (checkEndings()) return
    drawEvent()
    cardMode.value = 'event'
  }
}

function yearEnd() {
  const tax = Math.round(600 + state.people * 6 + (Math.random() * 100 - 50))
  const armyCost = Math.round(state.army * 3.5)
  const courtCost = 150
  state.treasury = Math.max(0, state.treasury + tax - armyCost - courtCost)
  state.year += 1
  state.month = 1
  state.age += 1
  state.health = Math.max(0, Math.min(100, state.health - 1))

  settlement.rows = [
    { label: '五花八门税银入库', value: tax },
    { label: '军饷开支', value: -armyCost },
    { label: '官俸与宫用', value: -courtCost },
    { label: '长了一岁（圣躬 -1）', value: 0 }
  ]
  settlement.net = tax - armyCost - courtCost
  settlement.note =
    settlement.net >= 0
      ? '这一年总算有进项，户部尚书的腰杆直了些。'
      : '入不敷出，户部尚书又开始称病不朝了。'
  history.value.push({
    y: state.year - 1,
    m: '岁末',
    text: `岁计：入${tax}万两，出${armyCost + courtCost}万两，${settlement.net >= 0 ? '尚有盈余' : '亏空'}。`
  })
}

// 返回 true 表示局面已终，进入结局
function checkEndings() {
  if (state.people <= 0) {
    finishRuin('思宗', '庄烈愍皇帝', '民怨如沸，义军百万，终于攻破京师。你在煤山望着漫天烽火，身边只剩一个太监。「朕非亡国之君，诸臣皆亡国之臣」——这句话，史官记下了，后世笑了。')
    return true
  }
  if (state.army <= 0) {
    finishRuin('恭帝', '孝哀皇帝', '边关尽失，胡马饮马于江。城破那日，守军只剩老弱，敌军入城如入无人之境。宗庙社稷，一朝倾覆。')
    return true
  }
  if (state.court <= 0) {
    finishRuin('废帝', '炀皇帝', '政令不出宫门，权臣带甲入朝。「禅位」诏书已替你拟好，只等你用印。你盯着那方玉玺看了很久，终究还是盖了下去。')
    return true
  }
  if (state.treasury <= 0) {
    finishRuin('殇帝', '厉皇帝', '国库见底，欠饷经年。哗变的乱兵攻入紫禁城那天，你才明白：天下最锋利的刀，是发不出饷的军队。')
    return true
  }
  if (state.health <= 0 || state.age >= state.lifespan) {
    finishDeath()
    return true
  }
  return false
}

function finishRuin(temple, posthumous, text) {
  ending.kind = 'ruin'
  ending.temple = temple
  ending.posthumous = posthumous
  ending.text = text
  phase.value = 'end'
}

function finishDeath() {
  const score = state.year * 3 + state.people + state.court + Math.floor(state.army / 2) + Math.floor(state.treasury / 100)
  let temple = '哀宗'
  let posthumous = '哀皇帝'
  let text = '你走得默默无闻。史书上关于你的记载薄薄几页，后世读者常常把你和你前后那几位皇帝搞混。'
  if (state.year >= 50) {
    temple = '圣祖'
    posthumous = '合天弘运文武睿哲恭俭宽裕孝敬诚信功德大成仁皇帝'
    text = '在位半百，日日勤政。你走的那天，天下百姓自发戴孝，市井罢市，哭声连成一片。你的庙号被后世帝王反复引用——作为标杆，也作为压力。'
  } else if (score >= 260) {
    temple = '仁宗'
    posthumous = '敬天体道纯诚至德仁孝文武大圣皇帝'
    text = '你在位期间轻徭薄赋、虚心纳谏，百姓不知兵戈为何物。驾崩之讯传出，天下自发戴孝，史称一代仁君。'
  } else if (score >= 200) {
    temple = '宣宗'
    posthumous = '宪天崇道英明圣德昭皇帝'
    text = '你于危局中稳住朝政，内安百姓，外靖边尘，有中兴守成之功。史官评价：虽不至开天辟地，亦可谓守土有方。'
  } else if (score >= 140) {
    temple = '中宗'
    posthumous = '昭文帝'
    text = '功过参半，褒贬不一。你的陵墓修得中规中矩，正如你的统治——不好，也不坏，历史长河里普普通通的一段。'
  } else if (score >= 80) {
    temple = '穆宗'
    posthumous = '庄皇帝'
    text = '你晚年颇好安逸，政务多委于臣下。史书对你的评价是「宽仁有余，振作不足」，算是比较客气的说法。'
  }
  ending.kind = 'death'
  ending.temple = temple
  ending.posthumous = posthumous
  ending.text = `${text}\n帝崩于乾清宫，在位 ${state.year} 年，享年 ${state.age} 岁。`
  phase.value = 'end'
}

function restart() {
  clearAllTimers()
  phase.value = 'start'
  eraInput.value = ''
  cardMode.value = 'event'
}

onUnmounted(clearAllTimers)
</script>

<style scoped>
.emperor-page {
  min-height: 100vh;
  padding: 32px 20px 60px;
  background:
    radial-gradient(circle at 15% 0%, rgba(212, 160, 23, 0.08), transparent 40%),
    linear-gradient(160deg, #2b1110 0%, #170907 70%);
  color: #f0e6cf;
}

.back {
  color: #d4a017;
  font-size: 14px;
}

.title {
  margin: 18px 0 10px;
  font-size: 28px;
  color: #f0c060;
  letter-spacing: 1px;
}

.subtitle {
  max-width: 760px;
  margin: 0 0 28px;
  color: #c9b896;
  font-size: 14px;
  line-height: 1.8;
}

/* ── 开局 ── */
.start-card {
  max-width: 520px;
  margin: 0 auto;
  padding: 36px 32px;
  background: #f6eeda;
  color: #3a2a18;
  border: 1px solid #caa14f;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  text-align: center;
}

.start-title {
  margin: 0 0 22px;
  font-size: 18px;
}

.era-row {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.era-input {
  width: 240px;
  padding: 10px 14px;
  font-size: 16px;
  text-align: center;
  border: 1px solid #b08d4a;
  border-radius: 8px;
  background: #fffaf0;
  color: #3a2a18;
  letter-spacing: 2px;
}

.era-input:focus {
  outline: 2px solid #d4a017;
}

.start-hint {
  margin: 10px 0 22px;
  font-size: 13px;
  color: #8a7454;
}

.start-rules {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px dashed #c8ab72;
  text-align: left;
  font-size: 13px;
  line-height: 2;
  color: #6b573b;
}

.fast-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 22px;
  padding: 8px 14px;
  background: rgba(180, 52, 42, 0.08);
  border: 1px solid #d4a017;
  border-radius: 8px;
  font-size: 14px;
  color: #5a4424;
  cursor: pointer;
  user-select: none;
}

.fast-toggle input {
  width: 16px;
  height: 16px;
  accent-color: #b4342a;
  cursor: pointer;
}

.fast-badge {
  padding: 1px 9px;
  background: #d4a017;
  color: #2b1110;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
}

.fast-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
}

.fast-hint {
  font-size: 13px;
  color: #d4a017;
  letter-spacing: 1px;
}

.btn.ghost.sm {
  padding: 6px 14px;
  font-size: 13px;
  letter-spacing: 1px;
}

/* ── 按钮 ── */
.btn {
  cursor: pointer;
  border-radius: 8px;
  font-family: inherit;
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}

.btn:active {
  transform: scale(0.97);
}

.btn.primary {
  padding: 10px 26px;
  background: linear-gradient(160deg, #b4342a, #8f231b);
  color: #f8ecd0;
  border: 1px solid #d4a017;
  font-size: 15px;
  letter-spacing: 2px;
}

.btn.primary:hover {
  box-shadow: 0 6px 18px rgba(180, 52, 42, 0.5);
}

.btn.big {
  padding: 13px 40px;
  font-size: 17px;
}

.btn.ghost {
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #b08d4a;
  color: #7a5c28;
  font-size: 14px;
}

.btn.ghost:hover {
  background: rgba(176, 141, 74, 0.12);
}

.btn.option {
  display: block;
  width: 100%;
  padding: 12px 18px;
  margin-top: 10px;
  background: #fffaf0;
  border: 1px solid #b08d4a;
  border-radius: 8px;
  color: #4a3418;
  font-size: 15px;
  text-align: left;
  letter-spacing: 1px;
}

.btn.option:hover {
  border-color: #b4342a;
  background: #fdf3dd;
  box-shadow: 0 4px 14px rgba(122, 74, 28, 0.18);
}

/* ── 朝堂布局 ── */
.game-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 22px;
  max-width: 980px;
  margin: 0 auto;
  align-items: start;
}

.status-panel {
  padding: 18px 22px;
  background: rgba(246, 238, 218, 0.06);
  border: 1px solid rgba(212, 160, 23, 0.35);
  border-radius: 10px;
}

.reign-line {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(212, 160, 23, 0.3);
}

.era-badge {
  padding: 2px 12px;
  background: #b4342a;
  color: #f8ecd0;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
}

.year-text {
  font-size: 17px;
  color: #f0c060;
  letter-spacing: 1px;
}

.age-text {
  margin-left: auto;
  font-size: 13px;
  color: #c9b896;
}

.stat-row {
  display: grid;
  grid-template-columns: 92px 1fr 76px;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.stat-label {
  font-size: 13px;
  color: #e0d3b4;
}

.stat-bar {
  height: 10px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 5px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #d4a017, #f0c060);
  transition: width 0.4s ease;
}

/* 各属性配色 */
.stat-row:nth-child(3) .stat-fill { background: linear-gradient(90deg, #a3322a, #e05d44); }
.stat-row:nth-child(4) .stat-fill { background: linear-gradient(90deg, #4a5c78, #7d94b5); }
.stat-row:nth-child(5) .stat-fill { background: linear-gradient(90deg, #6b4fa0, #9b7fd1); }
.stat-row:nth-child(6) .stat-fill { background: linear-gradient(90deg, #3d7a52, #66a97f); }

.stat-fill.danger {
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  from { opacity: 1; }
  to { opacity: 0.45; }
}

.stat-value {
  font-size: 13px;
  text-align: right;
  color: #f0e6cf;
  font-variant-numeric: tabular-nums;
}

/* ── 奏折卡 ── */
.memorial {
  position: relative;
  margin-top: 20px;
  padding: 30px 34px 26px 30px;
  background: #f6eeda;
  border: 1px solid #caa14f;
  border-radius: 10px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  color: #3a2a18;
}

.memorial::before {
  content: '';
  position: absolute;
  inset: 7px;
  border: 1px solid rgba(176, 141, 74, 0.35);
  border-radius: 6px;
  pointer-events: none;
}

.tag {
  position: absolute;
  top: -12px;
  left: 22px;
  padding: 3px 14px;
  background: #b4342a;
  color: #f8ecd0;
  font-size: 12px;
  border-radius: 4px;
  letter-spacing: 2px;
}

.vertical-deco {
  position: absolute;
  top: 30px;
  right: 22px;
  writing-mode: vertical-rl;
  font-size: 14px;
  letter-spacing: 8px;
  color: rgba(122, 74, 28, 0.35);
}

.memorial-title {
  margin: 0 0 6px;
  font-size: 20px;
  letter-spacing: 1px;
}

.memorial-from {
  margin: 0 0 14px;
  font-size: 13px;
  color: #8a7454;
}

.memorial-text {
  margin: 0 0 18px;
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', serif;
  font-size: 16px;
  line-height: 2;
}

/* 朱批结果 */
.memorial.result {
  text-align: center;
}

.result-text {
  margin: 6px 0 16px;
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', serif;
  font-size: 16px;
  line-height: 2;
}

.seal {
  position: absolute;
  top: 18px;
  right: 26px;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(180, 52, 42, 0.75);
  border-radius: 50%;
  color: rgba(180, 52, 42, 0.85);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  transform: rotate(-12deg);
  pointer-events: none;
}

.delta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 18px;
}

.chip {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.chip.gain {
  background: rgba(61, 122, 82, 0.14);
  color: #2c6b45;
}

.chip.loss {
  background: rgba(180, 52, 42, 0.12);
  color: #9c2b22;
}

/* 岁末结算 */
.summary-head {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 14px;
}

.summary-list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  font-size: 14px;
}

.summary-list li {
  display: flex;
  justify-content: space-between;
  padding: 7px 4px;
  border-bottom: 1px dashed rgba(176, 141, 74, 0.3);
  font-variant-numeric: tabular-nums;
}

.summary-list li.gain span:last-child { color: #2c6b45; }
.summary-list li.loss span:last-child { color: #9c2b22; }

.summary-list .total {
  border-bottom: none;
  font-weight: 700;
}

.summary-note {
  margin: 0 0 18px;
  font-size: 13px;
  color: #8a7454;
}

.memorial .btn.primary {
  display: block;
  margin: 0 auto;
}

/* ── 史官记事 ── */
.history-panel {
  padding: 18px 20px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(212, 160, 23, 0.3);
  border-radius: 10px;
}

.history-panel h3 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #f0c060;
  letter-spacing: 2px;
}

.history-empty {
  font-size: 13px;
  color: #9c8a66;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 520px;
  overflow-y: auto;
}

.history-list li {
  padding: 8px 0;
  border-bottom: 1px dashed rgba(212, 160, 23, 0.15);
  font-size: 13px;
  line-height: 1.7;
}

.h-when {
  display: block;
  color: #d4a017;
  font-size: 12px;
}

.h-text {
  color: #d8c9a5;
}

/* ── 结局 ── */
.end-card {
  max-width: 560px;
  margin: 30px auto 0;
  padding: 44px 40px;
  text-align: center;
  background: linear-gradient(170deg, #1c1210, #0d0705);
  border: 1px solid rgba(212, 160, 23, 0.5);
  border-radius: 12px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

.end-card.ruin {
  border-color: rgba(180, 52, 42, 0.6);
}

.end-kicker {
  margin: 0;
  font-size: 13px;
  letter-spacing: 6px;
  color: #9c8a66;
}

.end-temple {
  margin: 14px 0 4px;
  font-size: 42px;
  color: #f0c060;
  letter-spacing: 6px;
  text-shadow: 0 4px 24px rgba(212, 160, 23, 0.35);
}

.end-card.ruin .end-temple {
  color: #d05a4a;
  text-shadow: 0 4px 24px rgba(180, 52, 42, 0.4);
}

.end-title {
  margin: 0 0 18px;
  font-size: 15px;
  color: #c9b896;
}

.end-text {
  margin: 0 0 22px;
  font-size: 14px;
  line-height: 2.1;
  color: #d8c9a5;
  white-space: pre-line;
  text-align: left;
}

.end-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  justify-content: center;
  margin-bottom: 28px;
  padding: 14px 0;
  border-top: 1px dashed rgba(212, 160, 23, 0.3);
  border-bottom: 1px dashed rgba(212, 160, 23, 0.3);
  font-size: 13px;
  color: #c9b896;
}

/* ── 卡片切换动画 ── */
.card-enter-active,
.card-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.card-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ── 响应式 ── */
@media (max-width: 860px) {
  .game-grid {
    grid-template-columns: 1fr;
  }

  .history-list {
    max-height: 260px;
  }

  .vertical-deco {
    display: none;
  }
}
</style>
