<template>
  <div class="minister-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">👑 大臣模拟器 · 宦海沉浮</h1>
    <p class="subtitle">
      大雍景和年间，你初入仕途。批答奏报、周旋同僚、面对诱惑与弹劾——
      圣眷、政绩、名望、家财，任何一项跌到 0 或涨满 100，宦海之旅都会戛然而止。
    </p>

    <!-- 开局：取名 + 选出身 -->
    <div v-if="stage === 'start'" class="start-panel">
      <div class="name-row">
        <label for="minister-name">尊姓大名</label>
        <input id="minister-name" v-model.trim="nameInput" maxlength="6" placeholder="顾清源" />
      </div>
      <div class="bg-grid">
        <button v-for="bg in backgrounds" :key="bg.id" class="bg-card" @click="startGame(bg)">
          <span class="bg-emoji">{{ bg.emoji }}</span>
          <span class="bg-name">{{ bg.name }}</span>
          <span class="bg-desc">{{ bg.desc }}</span>
          <span class="bg-stats">
            <i v-for="d in statDefs" :key="d.key">{{ d.emoji }} {{ bg.stats[d.key] }}</i>
          </span>
        </button>
      </div>
      <details class="guide">
        <summary>🎭 玩法说明</summary>
        <ul>
          <li v-for="d in statDefs" :key="d.key"><b>{{ d.emoji }} {{ d.name }}</b>：{{ d.tip }}</li>
          <li>每处理一件公务过一个月；每三年正月「京察」一次，考语决定升降；在朝满二十年可告老还乡，求一个善终与谥号。</li>
        </ul>
      </details>
    </div>

    <!-- 在任 -->
    <div v-if="stage === 'play' && current" class="play-panel">
      <div class="status-row">
        <span class="date-chip">📅 景和{{ cnYear(meta.year) }}年 · {{ months[meta.month - 1] }}</span>
        <span class="office-chip">{{ meta.name }} · {{ rankText }}</span>
        <button class="auto-btn" :class="{ on: entrusted }" @click="entrusted ? takeOver() : entrust()">
          {{ entrusted ? '✋ 接管' : '⚡ 托管' }}
        </button>
      </div>

      <div class="stat-grid">
        <div
          v-for="d in statDefs"
          :key="d.key"
          class="stat-item"
          :class="{ danger: isDanger(stats[d.key]) }"
          :title="d.tip"
        >
          <div class="stat-head">
            <span>{{ d.emoji }} {{ d.name }}</span>
            <b>{{ Math.round(stats[d.key]) }}</b>
          </div>
          <div class="stat-bar">
            <div class="stat-fill" :style="{ width: stats[d.key] + '%', background: d.color }"></div>
          </div>
        </div>
      </div>

      <div class="event-card" :key="current.id + '-' + meta.turns">
        <div class="who">
          <span class="who-emoji">{{ current.who.emoji }}</span>
          <div class="who-info">
            <b>{{ current.who.name }}</b>
            <i>{{ current.who.tag }}</i>
          </div>
        </div>
        <p class="event-text">{{ current.text }}</p>

        <div v-if="phase === 'choose'" class="options">
          <button
            v-for="opt in current.options"
            :key="opt.label"
            class="option-btn"
            @click="chooseOption(opt)"
          >
            {{ opt.label }}
          </button>
        </div>
        <div v-else class="result">
          <p class="result-text">{{ chosen.result }}</p>
          <div class="delta-chips">
            <span
              v-for="d in statDefs.filter((x) => chosen.actualEffects[x.key])"
              :key="d.key"
              class="delta-chip"
              :class="chosen.actualEffects[d.key] > 0 ? 'up' : 'down'"
            >
              {{ d.name }} {{ chosen.actualEffects[d.key] > 0 ? '+' : '' }}{{ chosen.actualEffects[d.key] }}
            </span>
          </div>
          <button class="primary-btn" @click="finishTurn">
            {{ pendingEnd ? '阅毕 · 天命已定' : '继续 · 次月' }}
          </button>
        </div>
      </div>

      <details class="chronicle">
        <summary>📜 大事记（{{ log.length }}）</summary>
        <ol>
          <li v-for="(item, i) in log" :key="i">
            <span class="log-date">{{ item.date }}</span>{{ item.text }}<i class="log-choice"> —— {{ item.choice }}</i>
          </li>
        </ol>
      </details>
    </div>

    <!-- 结局 -->
    <div v-if="stage === 'end' && ending" class="ending-panel" :class="ending.tone">
      <div class="ending-emoji">{{ ending.emoji }}</div>
      <h2 class="ending-title">{{ ending.title }}</h2>
      <p class="ending-text">{{ ending.text }}</p>
      <div v-if="evaluation" class="evaluation">
        <div class="shiho">盖棺论定 · 谥曰「{{ evaluation.shiho }}」</div>
        <p class="eval-label">{{ evaluation.label }}</p>
      </div>
      <div class="final-stats">
        <span v-for="d in statDefs" :key="d.key">{{ d.emoji }} {{ d.name }} {{ Math.round(stats[d.key]) }}</span>
      </div>
      <p class="final-office">官至{{ rankText }} · 仕途 {{ meta.age - 27 }} 年 · 处置公务 {{ meta.turns }} 件</p>
      <div class="ending-actions">
        <button class="primary-btn" @click="restart">再入仕途</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { ministerEvents } from '../data/ministerEvents.js'

// 四维属性：sj 圣眷 / zj 政绩 / mw 名望 / jc 家财，两端（0 或 100）都是绝路
const statDefs = [
  { key: 'sj', name: '圣眷', emoji: '👑', color: '#d4a017', tip: '皇帝的信任。太低会被弃用，太高则功高震主' },
  { key: 'zj', name: '政绩', emoji: '🏛️', color: '#3f8f5f', tip: '治理成果。荒废到头会被问责罢官，做到极致可青史留名' },
  { key: 'mw', name: '名望', emoji: '📣', color: '#4a7fc1', tip: '士林与民间口碑。声名扫地会被弹劾倒台' },
  { key: 'jc', name: '家财', emoji: '💰', color: '#c25b3a', tip: '家产。太少贫病交加，太多招御史查抄' }
]

const months = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']

// 官阶阶梯，京察升降沿此移动
const ranks = [
  { grade: '从七品', office: '翰林院编修' },
  { grade: '正六品', office: '各部主事' },
  { grade: '从五品', office: '各部员外郎' },
  { grade: '正五品', office: '各部郎中' },
  { grade: '正四品', office: '大理寺少卿' },
  { grade: '正三品', office: '六部侍郎' },
  { grade: '从二品', office: '都察院左都御史' },
  { grade: '正二品', office: '六部尚书' },
  { grade: '从一品', office: '内阁大学士' },
  { grade: '正一品', office: '太傅' }
]

const backgrounds = [
  {
    id: 'hanmen',
    emoji: '📚',
    name: '寒门书生',
    desc: '两榜进士出身，一篇策论动京华。清名在外，囊中羞涩。',
    stats: { sj: 45, zj: 50, mw: 58, jc: 20 }
  },
  {
    id: 'shijia',
    emoji: '🏯',
    name: '世家子弟',
    desc: '祖父两代宰辅，门生故吏半朝。起点极高，众人拿着放大镜看你。',
    stats: { sj: 58, zj: 35, mw: 45, jc: 70 }
  },
  {
    id: 'jiangmen',
    emoji: '🗡️',
    name: '军功之后',
    desc: '父兄战死北疆，荫封入京为官。皇帝念旧情，士林却与你陌生。',
    stats: { sj: 50, zj: 55, mw: 30, jc: 40 }
  }
]

const endings = {
  liufang: {
    emoji: '🏚️', title: '圣眷断绝 · 革职流放', tone: 'bad',
    text: '一纸上谕：交部严议，革职，流三千里。你离京那日，没有人敢来送行。'
  },
  zhuzhen: {
    emoji: '🍷', title: '功高震主', tone: 'bad',
    text: '你的权势与圣眷终于越过了那条线。上谕措辞温和、赏赐丰厚——然后，是一杯酒。史书对你的记载，停在「暴疾而卒」四个字上。'
  },
  minyuan: {
    emoji: '🔥', title: '民怨沸腾 · 罢官', tone: 'bad',
    text: '灾荒四起、赋役繁苛，最后都算到了你的头上。罢官那天，城门口有人烧了你的官靴。'
  },
  nengchen: {
    emoji: '🏆', title: '治世能臣 · 青史留名', tone: 'good',
    text: '你主政的这些年，仓廪实、狱讼平、河工固。致仕离京那日，百姓沿街设香案相送。后来，你的牌位入了贤良祠。'
  },
  shengbai: {
    emoji: '🗡️', title: '身败名裂', tone: 'bad',
    text: '弹章如雪片飞来，门生故旧避你如避瘟疫。革职、查办、家产充公，你的名字被刊进了《佞臣传》。'
  },
  qingliu: {
    emoji: '🎐', title: '清流领袖 · 万民请留', tone: 'good',
    text: '天下士人仰望，万民拦轿请留。皇帝亲自赐诗送你荣归：「朝廷不失直臣，朕不失诤友。」'
  },
  pinkun: {
    emoji: '🥣', title: '贫病还乡', tone: 'neutral',
    text: '变卖了京中最后的宅子。归乡的船上，你数了数箱笼：书二十一箱，银子七两。'
  },
  tanmo: {
    emoji: '⛓️', title: '贪墨案发 · 查抄流放', tone: 'bad',
    text: '家财万贯的那一天，都察院的封条也贴上了你家大门。查抄、流放，家产尽没——你替别人攒了半辈子。'
  },
  tuixiu: {
    emoji: '🏔️', title: '急流勇退 · 告老还乡', tone: 'good',
    text: '二十年宦海浮沉，你上表乞骸骨。皇帝准了，加太子少保衔致仕。出都门那日，你回头望了望宫墙，转身走向江湖。'
  }
}

const stage = ref('start') // start | play | end
const nameInput = ref('')
const stats = reactive({ sj: 50, zj: 50, mw: 50, jc: 50 })
const meta = reactive({ name: '', year: 1, month: 1, rank: 0, age: 27, turns: 0 })
const current = ref(null)
const phase = ref('choose') // choose | result
const chosen = ref(null)
const pendingEnd = ref(null)
const ending = ref(null)
const evaluation = ref(null)
const log = ref([])
const recentIds = ref([])

// 托管 / 接管：托管时自动处置公务，可随时接管转回手动
const entrusted = ref(false)
let autoTimer = null
function clearAutoTimer() {
  if (autoTimer) { clearTimeout(autoTimer); autoTimer = null }
}
function pickOption(options) {
  return options[Math.floor(Math.random() * options.length)]
}
// 根据当前阶段安排下一步自动动作
function scheduleAuto() {
  clearAutoTimer()
  if (!entrusted.value) return
  if (phase.value === 'choose' && current.value?.options?.length) {
    autoTimer = setTimeout(() => {
      if (entrusted.value && phase.value === 'choose') chooseOption(pickOption(current.value.options))
    }, 600)
  } else if (phase.value === 'result') {
    autoTimer = setTimeout(() => {
      if (entrusted.value && phase.value === 'result') finishTurn()
    }, 900)
  }
}
function entrust() {
  entrusted.value = true
  scheduleAuto()
}
function takeOver() {
  entrusted.value = false
  clearAutoTimer()
}
onUnmounted(clearAutoTimer)

const rankText = computed(() => `${ranks[meta.rank].grade} · ${ranks[meta.rank].office}`)

function cnYear(n) {
  const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (n < 10) return digits[n - 1]
  if (n === 10) return '十'
  if (n < 20) return '十' + digits[n - 11]
  if (n === 20) return '二十'
  return '二十' + digits[n - 21]
}

function dateText() {
  return `景和${cnYear(meta.year)}年${months[meta.month - 1]}`
}

function isDanger(v) {
  return v <= 15 || v >= 85
}

function clamp(v) {
  return Math.max(0, Math.min(100, v))
}

function startGame(bg) {
  clearAutoTimer()
  entrusted.value = false
  Object.assign(stats, bg.stats)
  Object.assign(meta, {
    name: nameInput.value || '顾清源',
    year: 1,
    month: 1,
    rank: 0,
    age: 27,
    turns: 0
  })
  log.value = []
  recentIds.value = []
  pendingEnd.value = null
  ending.value = null
  evaluation.value = null
  stage.value = 'play'
  nextEvent()
}

// 三年一度的京察：按圣眷与三项总分动态生成考语
function buildJingcha() {
  const score = stats.sj + stats.zj + stats.mw
  let option
  if (stats.sj < 25 && meta.rank > 0) {
    meta.rank -= 1
    option = {
      label: '跪领申饬',
      effects: { sj: -2, mw: -4 },
      result: `考语「浮躁浅露」，降为${ranks[meta.rank].grade}${ranks[meta.rank].office}。走出席位时，你听见有人嗤笑。`
    }
  } else if (score >= 180 && meta.rank < ranks.length - 1) {
    meta.rank += 1
    option = {
      label: '叩谢天恩',
      effects: { sj: 4, mw: 3, zj: 2 },
      result: `考语「才守兼优」，擢为${ranks[meta.rank].grade}${ranks[meta.rank].office}！贺客盈门，你的帖盒又满了。`
    }
  } else if (score < 90) {
    option = {
      label: '领旨',
      effects: { sj: -4 },
      result: '考语「平常」，交部议处。吏部的文书里，你的名字后面多了个小注。'
    }
  } else {
    option = {
      label: '领旨',
      effects: { zj: 2 },
      result: `考语「称职」，着仍原任${ranks[meta.rank].office}。不好不坏，宦海常态。`
    }
  }
  return {
    id: 'jingcha',
    who: { emoji: '📋', name: '吏部文书', tag: '京察 · 三年一考' },
    text: `景和${cnYear(meta.year)}年京察。都察院会同吏部考察京官，你的考语已经拟好，只待领旨。`,
    options: [option]
  }
}

function pickEvent() {
  const available = ministerEvents.filter((e) => {
    if (meta.year < (e.minYear || 1) || meta.year > (e.maxYear || 99)) return false
    if (meta.rank < (e.minRank || 0)) return false
    if (e.cond && !e.cond(stats)) return false
    return !recentIds.value.includes(e.id)
  })
  const pool = available.length
    ? available
    : ministerEvents.filter((e) => !recentIds.value.includes(e.id))
  const total = pool.reduce((sum, e) => sum + (e.weight || 1), 0)
  let r = Math.random() * total
  for (const e of pool) {
    r -= e.weight || 1
    if (r <= 0) return e
  }
  return pool[pool.length - 1]
}

function nextEvent() {
  if (meta.year > 20) {
    applyEnding('tuixiu')
    return
  }
  if (meta.month === 1 && meta.year > 1 && meta.year % 3 === 0) {
    current.value = buildJingcha()
  } else {
    const e = pickEvent()
    recentIds.value.push(e.id)
    if (recentIds.value.length > 10) recentIds.value.shift()
    current.value = e
  }
  phase.value = 'choose'
  chosen.value = null
  scheduleAuto()
}

function chooseOption(opt) {
  if (phase.value !== 'choose') return
  let effects = opt.effects
  let result = opt.result
  if (opt.risk && Math.random() < opt.risk.chance) {
    effects = opt.risk.effects
    result = opt.risk.result
  }
  for (const d of statDefs) {
    if (effects[d.key]) stats[d.key] = clamp(stats[d.key] + effects[d.key])
  }
  chosen.value = { ...opt, result, actualEffects: effects }
  phase.value = 'result'
  log.value.unshift({
    date: dateText(),
    text: `${current.value.who.name}：${current.value.text.slice(0, 16)}……`,
    choice: opt.label
  })
  if (log.value.length > 40) log.value.pop()
  const ext = extremeKey()
  if (ext) pendingEnd.value = ext
  scheduleAuto()
}

function finishTurn() {
  if (pendingEnd.value) {
    applyEnding(pendingEnd.value)
    return
  }
  meta.month += 1
  if (meta.month > 12) {
    meta.month = 1
    meta.year += 1
    meta.age += 1
  }
  meta.turns += 1
  nextEvent()
}

function extremeKey() {
  if (stats.sj <= 0) return 'liufang'
  if (stats.sj >= 100) return 'zhuzhen'
  if (stats.zj <= 0) return 'minyuan'
  if (stats.zj >= 100) return 'nengchen'
  if (stats.mw <= 0) return 'shengbai'
  if (stats.mw >= 100) return 'qingliu'
  if (stats.jc <= 0) return 'pinkun'
  if (stats.jc >= 100) return 'tanmo'
  return null
}

// 善终结局（治世能臣 / 清流领袖 / 告老还乡）附谥号评定
function buildEvaluation() {
  const avg = (stats.zj + stats.mw + stats.sj) / 3 - (stats.jc > 70 ? 12 : 0)
  const shiho = avg >= 85 ? '文正' : avg >= 70 ? '文忠' : avg >= 55 ? '文清' : avg >= 40 ? '恭僖' : '平'
  const maxKey = ['sj', 'zj', 'mw', 'jc'].reduce((a, b) => (stats[a] >= stats[b] ? a : b))
  const labels = {
    sj: '世人评你：圣眷优渥的宠臣',
    zj: '世人评你：实心任事的能臣',
    mw: '世人评你：士林仰望的清流',
    jc: '世人评你：家资巨万的富家翁'
  }
  return { shiho, label: labels[maxKey], score: Math.round(avg) }
}

function applyEnding(key) {
  ending.value = endings[key]
  if (endings[key].tone === 'good') evaluation.value = buildEvaluation()
  stage.value = 'end'
}

function restart() {
  clearAutoTimer()
  entrusted.value = false
  stage.value = 'start'
  nameInput.value = ''
  current.value = null
  ending.value = null
  evaluation.value = null
  pendingEnd.value = null
}
</script>

<style scoped>
.minister-page {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 20px;
}

.title {
  margin: 0 0 8px;
}

.subtitle {
  color: var(--color-muted);
  margin: 0 0 24px;
}

/* 开局 */
.start-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 24px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.name-row label {
  font-weight: 600;
  white-space: nowrap;
}

.name-row input {
  flex: 1;
  max-width: 220px;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 15px;
}

.bg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.bg-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 18px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: var(--color-text);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.bg-card:hover {
  transform: translateY(-3px);
  border-color: var(--color-primary);
}

.bg-emoji {
  font-size: 30px;
}

.bg-name {
  font-weight: 700;
  font-size: 16px;
}

.bg-desc {
  color: var(--color-muted);
  font-size: 13px;
  line-height: 1.5;
}

.bg-stats {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-muted);
}

.bg-stats i {
  font-style: normal;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 8px;
}

.guide {
  margin-top: 18px;
  color: var(--color-muted);
  font-size: 14px;
}

.guide summary {
  cursor: pointer;
  color: var(--color-text);
  font-weight: 600;
}

.guide ul {
  padding-left: 18px;
  margin: 8px 0 0;
}

/* 在任 */
.status-row {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.date-chip,
.office-chip {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 14px;
}

.auto-btn {
  margin-left: auto;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 5px 16px;
  background: var(--color-card);
  color: var(--color-text);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.auto-btn.on {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-card));
  color: var(--color-primary);
}

.office-chip {
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.stat-item {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 10px 12px;
}

.stat-item.danger {
  border-color: var(--color-danger);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 69, 47, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(212, 69, 47, 0); }
}

.stat-head {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 6px;
}

.stat-bar {
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* 事件卡 */
.event-card {
  background: #faf5ea;
  border: 1px solid #e3d8bf;
  border-top: 4px solid #c9a24b;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 24px;
  animation: cardIn 0.35s ease;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.who-emoji {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1e7d0;
  border-radius: 50%;
  font-size: 24px;
}

.who-info {
  display: flex;
  flex-direction: column;
}

.who-info b {
  font-size: 15px;
}

.who-info i {
  font-style: normal;
  color: var(--color-muted);
  font-size: 12px;
}

.event-text {
  font-size: 16px;
  line-height: 1.8;
  margin: 0 0 18px;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  padding: 12px 16px;
  background: var(--color-card);
  border: 1px solid #d8c9a3;
  border-radius: 8px;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  color: var(--color-text);
  font-family: inherit;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.option-btn:hover {
  border-color: #c9a24b;
  background: #fffdf7;
}

.result-text {
  font-size: 15px;
  line-height: 1.8;
  background: #f5edda;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 0 0 14px;
}

.delta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.delta-chip {
  font-size: 13px;
  border-radius: 999px;
  padding: 3px 10px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
}

.delta-chip.up {
  color: #2e7d4f;
  border-color: #bfe0cd;
}

.delta-chip.down {
  color: #c04a35;
  border-color: #eac6bd;
}

.primary-btn {
  padding: 11px 28px;
  background: #8a6d2f;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
}

.primary-btn:hover {
  background: #755c27;
}

/* 大事记 */
.chronicle {
  margin-top: 18px;
  color: var(--color-muted);
  font-size: 14px;
}

.chronicle summary {
  cursor: pointer;
  color: var(--color-text);
  font-weight: 600;
}

.chronicle ol {
  padding-left: 18px;
  margin: 8px 0 0;
}

.chronicle li {
  margin-bottom: 6px;
  line-height: 1.6;
}

.log-date {
  color: #8a6d2f;
  margin-right: 8px;
  font-size: 12px;
  white-space: nowrap;
}

.log-choice {
  color: var(--color-muted);
  font-style: normal;
}

/* 结局 */
.ending-panel {
  text-align: center;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 40px 24px;
  animation: cardIn 0.5s ease;
}

.ending-panel.good { border-top: 4px solid #3f8f5f; }
.ending-panel.bad { border-top: 4px solid var(--color-danger); }
.ending-panel.neutral { border-top: 4px solid #b09a5a; }

.ending-emoji {
  font-size: 52px;
}

.ending-title {
  margin: 12px 0 10px;
}

.ending-text {
  color: var(--color-muted);
  max-width: 520px;
  margin: 0 auto 18px;
  line-height: 1.8;
}

.evaluation {
  background: #faf5ea;
  border: 1px solid #e3d8bf;
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 18px;
}

.shiho {
  font-size: 18px;
  font-weight: 700;
  color: #8a6d2f;
  margin-bottom: 4px;
}

.eval-label {
  color: var(--color-muted);
  margin: 0;
  font-size: 14px;
}

.final-stats {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.final-stats span {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 13px;
}

.final-office {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0 0 20px;
}

@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

</style>
