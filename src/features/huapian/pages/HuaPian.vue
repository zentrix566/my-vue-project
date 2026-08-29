<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  createGame,
  playSlap,
  aiPower,
  needOf,
  GROUNDS,
  DIFFICULTIES,
  FOUL,
  NEAR,
  SWEET,
} from '../utils/engine.js'
import {
  isMuted,
  toggleMuted,
  startCharge,
  playSlapHit,
  playResult,
  playWin,
  playLose,
} from '../utils/sound.js'
import HuaPianCard from '../components/HuaPianCard.vue'

const phase = ref('setup') // setup | play
const game = ref(null)
const groundKey = ref('rough')
const diffKey = ref('normal')
const soundOn = ref(!isMuted())
const busy = ref(false) // 动画与对方回合期间锁输入
const charging = ref(false)
const power = ref(0)
const fx = ref(null) // { side, card, anim } 动画期间把被作用的旧牌顶在台上
const burst = ref(null)
const shake = ref(false)

const RESULT_LABEL = {
  flip: '翻面!',
  'scatter-flip': '瞎翻!',
  near: '掀角',
  miss: '白拍',
  scatter: '乱流',
  foul: '犯规',
}
const ANIM_DUR = { flip: 780, 'scatter-flip': 780, near: 560, miss: 400, scatter: 720, foul: 780 }

const canSlap = computed(
  () => phase.value === 'play' && game.value && !game.value.over && !busy.value && game.value.turn === 'me' && !charging.value
)

const turnText = computed(() => {
  const g = game.value
  if (!g) return ''
  if (g.over) return '终局'
  if (charging.value) return '松手开拍！'
  if (busy.value) return '结算中…'
  return g.turn === 'me' ? '轮到你出手' : `${g.names.ai}正盯着牌呢…`
})

// 蓄力条分区按当前要拍的牌实时算（我出手拍对面的，对面出手拍我的）
const showNeed = computed(() => {
  const g = game.value
  if (!g || g.over) return null
  const side = g.turn === 'me' ? 'ai' : 'me'
  return needOf(g.groundCards[side], g.ground, g.loosen[side])
})

const bands = computed(() => {
  const need = showNeed.value
  if (need == null) return []
  const list = [
    { from: 0, to: need - NEAR, cls: 'weak', label: '太轻' },
    { from: need - NEAR, to: need, cls: 'near', label: '掀角' },
    { from: need, to: Math.min(FOUL, need + SWEET), cls: 'sweet', label: '拍正' },
  ]
  if (need + SWEET < FOUL) list.push({ from: need + SWEET, to: FOUL, cls: 'over', label: '过猛' })
  list.push({ from: FOUL, to: 100, cls: 'foul', label: '压牌' })
  return list
})

const chargeHint = computed(() => {
  if (charging.value) return '就是现在，松手！'
  if (!game.value || game.value.over) return ''
  if (busy.value) return '稍等，牌还没落定…'
  if (game.value.turn !== 'me') return '看对面出手'
  return '按住蓄力、松手开拍（空格也行）'
})

const displayLog = computed(() => (game.value ? game.value.log.map((e) => e).reverse() : []))

function slotCard(side) {
  const g = game.value
  if (!g) return null
  if (fx.value && fx.value.side === side) return fx.value.card
  return g.groundCards[side]
}

function slotAnim(side) {
  return fx.value && fx.value.side === side ? fx.value.anim : ''
}

// 被拍方上桌的牌是被拍目标，谁出手就提示谁
function slotTargeted(side) {
  const g = game.value
  return !!g && !g.over && !busy.value && g.turn !== side
}

function flyStyle(side) {
  return side === 'me'
    ? { '--fly-x': '170px', '--fly-y': '-120px' }
    : { '--fly-x': '-170px', '--fly-y': '120px' }
}

// ---------- 蓄力：按住一路爬升到顶再折返，松手开拍 ----------
let raf = null
let dir = 1
let lastT = 0
let chargeHandle = null
const CHARGE_SPEED = 150 // 每秒力道

function beginCharge() {
  if (!canSlap.value) return
  charging.value = true
  power.value = 0
  dir = 1
  lastT = 0
  chargeHandle = startCharge()
  raf = requestAnimationFrame(stepCharge)
}

function stepCharge(t) {
  if (!lastT) lastT = t
  const dt = Math.min(0.05, (t - lastT) / 1000)
  lastT = t
  power.value += dir * CHARGE_SPEED * dt
  if (power.value >= 100) {
    power.value = 100
    dir = -1
  } else if (power.value <= 0) {
    power.value = 0
    dir = 1
  }
  chargeHandle && chargeHandle.setPower(power.value)
  raf = requestAnimationFrame(stepCharge)
}

function stopCharge() {
  if (!charging.value) return false
  charging.value = false
  cancelAnimationFrame(raf)
  raf = null
  if (chargeHandle) {
    chargeHandle.stop()
    chargeHandle = null
  }
  return true
}

function releaseCharge() {
  if (!stopCharge()) return
  slap(power.value)
}

// ---------- 对局推进 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let runId = 0

async function slap(powerVal) {
  const g = game.value
  if (!g || g.over) return
  const gid = runId
  busy.value = true
  const entry = playSlap(g, powerVal)
  if (!entry) {
    busy.value = false
    return
  }
  playSlapHit()
  burst.value = { seq: entry.seq, side: entry.atk }
  const animMap = { flip: 'flip', 'scatter-flip': 'flip', near: 'near', miss: 'miss', scatter: 'scatter', foul: 'forfeit' }
  fx.value = {
    side: entry.result === 'foul' ? entry.atk : entry.def,
    card: entry.result === 'foul' ? entry.mine : entry.card,
    anim: animMap[entry.result],
  }
  if (entry.result === 'flip' || entry.result === 'scatter-flip' || entry.result === 'foul') {
    shake.value = true
    setTimeout(() => (shake.value = false), 480)
  }
  playResult(entry.result)
  await sleep(ANIM_DUR[entry.result])
  if (gid !== runId) return
  fx.value = null
  burst.value = null
  await sleep(340) // 定格半拍再继续，吊足胃口
  if (gid !== runId) return
  if (g.over) {
    busy.value = false
    g.winner === 'me' ? playWin() : playLose()
    return
  }
  if (g.turn === 'ai') {
    await sleep(650 + Math.random() * 550)
    if (gid !== runId) return
    const need = needOf(g.groundCards.me, g.ground, g.loosen.me)
    await slap(aiPower(need, g.diff))
  } else {
    busy.value = false
  }
}

function start() {
  runId++
  stopCharge()
  fx.value = null
  burst.value = null
  shake.value = false
  game.value = createGame(groundKey.value, diffKey.value)
  phase.value = 'play'
  busy.value = false
  power.value = 0
}

function restart() {
  start()
}

function backToSetup() {
  runId++
  stopCharge()
  fx.value = null
  burst.value = null
  phase.value = 'setup'
  game.value = null
}

function toggleSound() {
  soundOn.value = toggleMuted()
}

function onKeydown(e) {
  if (e.code !== 'Space' || e.repeat || phase.value !== 'play') return
  e.preventDefault()
  beginCharge()
}

function onKeyup(e) {
  if (e.code === 'Space') releaseCharge()
}

function onPointerUp() {
  if (charging.value) releaseCharge()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
})

onBeforeUnmount(() => {
  runId++
  stopCharge()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
})
</script>

<template>
  <div class="page hp-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">🎴 拍画片 · 啪叽响</h1>
    <p class="subtitle">
      童年水泥地经典：把对面的画片拍翻面就归你。掀角会把牌拍松、越拍越好翻；
      手压到牌上算犯规，自己的牌白送一张——先赢光对方全部画片者胜。
    </p>

    <!-- 开局：挑场地与对手 -->
    <div v-if="phase === 'setup'" class="setup card">
      <div class="setup-sec">
        <div class="setup-label">① 挑块场地</div>
        <div class="option-row">
          <button
            v-for="gr in GROUNDS"
            :key="gr.key"
            class="option ground"
            :class="[`og-${gr.key}`, { picked: groundKey === gr.key }]"
            @click="groundKey = gr.key"
          >
            <span class="opt-name">{{ gr.name }}</span>
            <span class="opt-feel">{{ gr.feel }}</span>
            <span class="opt-desc">{{ gr.desc }}</span>
          </button>
        </div>
      </div>
      <div class="setup-sec">
        <div class="setup-label">② 挑个对手</div>
        <div class="option-row">
          <button
            v-for="d in DIFFICULTIES"
            :key="d.key"
            class="option rival"
            :class="{ picked: diffKey === d.key }"
            @click="diffKey = d.key"
          >
            <span class="opt-name">{{ d.name }}</span>
            <span class="opt-desc">{{ d.blurb }}</span>
          </button>
        </div>
      </div>
      <div class="setup-actions">
        <button class="btn primary big" @click="start">🖐️ 摆摊开拍</button>
        <span class="setup-tip">双方各 12 张画片，普通卡好翻、闪卡最硬；实在拍不动就先掀它几个角。</span>
      </div>
    </div>

    <!-- 对局 -->
    <template v-else>
      <div class="topbar card">
        <div class="side me" :class="{ active: game.turn === 'me' && !game.over }">
          <div class="side-head">
            <span class="side-name">你</span>
            <span v-if="game.turn === 'me' && !game.over" class="turn-tag">▸ 出手中</span>
          </div>
          <div class="side-nums">
            <span>场上 <b>{{ game.groundCards.me ? game.groundCards.me.name : '—' }}</b></span>
            <span>牌堆 <b>{{ game.stacks.me.length }}</b></span>
            <span>赢得 <b>{{ game.won.me.length }}</b></span>
          </div>
          <div class="fan">
            <HuaPianCard v-for="c in game.won.me.slice(-6)" :key="c.id" :card="c" size="mini" />
          </div>
        </div>

        <div class="console">
          <div class="round-line">第 <b>{{ game.log.length }}</b> 掌 · {{ turnText }}</div>
          <div class="chips">
            <span class="chip-info">📍 {{ game.ground.name }}</span>
            <span class="chip-info">🧒 对手 · {{ game.diff.name }}</span>
          </div>
          <div class="ctrl-row">
            <button class="btn ghost" @click="toggleSound">{{ soundOn ? '🔊 音效开' : '🔇 已静音' }}</button>
            <button class="btn ghost" @click="restart">↻ 再来一局</button>
            <button class="btn ghost" @click="backToSetup">⚙ 换场地</button>
          </div>
        </div>

        <div class="side ai" :class="{ active: game.turn === 'ai' && !game.over }">
          <div class="side-head">
            <span class="side-name">{{ game.names.ai }}</span>
            <span v-if="game.turn === 'ai' && !game.over" class="turn-tag">▸ 出手中</span>
          </div>
          <div class="side-nums">
            <span>场上 <b>{{ game.groundCards.ai ? game.groundCards.ai.name : '—' }}</b></span>
            <span>牌堆 <b>{{ game.stacks.ai.length }}</b></span>
            <span>赢得 <b>{{ game.won.ai.length }}</b></span>
          </div>
          <div class="fan right">
            <HuaPianCard v-for="c in game.won.ai.slice(-6)" :key="c.id" :card="c" size="mini" />
          </div>
        </div>
      </div>

      <div class="arena" :class="[`g-${game.ground.key}`, { shake }]">
        <div
          class="slot ai-slot"
          :class="{ targeted: slotTargeted('ai'), [`anim-${slotAnim('ai')}`]: !!slotAnim('ai') }"
          :style="flyStyle('ai')"
        >
          <div v-if="slotCard('ai')" class="slot-inner" :style="{ transform: `rotate(${game.loosen.ai * 2.5}deg)` }">
            <span v-if="game.loosen.ai > 0" class="loosen-tag">牌已松动 ×{{ game.loosen.ai }}</span>
            <HuaPianCard :card="slotCard('ai')" size="md" />
          </div>
          <span v-else class="slot-empty">被赢走了</span>
        </div>

        <div v-if="burst" class="burst" :class="burst.side === 'me' ? 'at-me' : 'at-ai'">
          <span class="burst-word">啪!</span>
          <i v-for="n in 8" :key="n" class="dust" />
        </div>

        <div
          class="slot me-slot"
          :class="{ targeted: slotTargeted('me'), [`anim-${slotAnim('me')}`]: !!slotAnim('me') }"
          :style="flyStyle('me')"
        >
          <div v-if="slotCard('me')" class="slot-inner" :style="{ transform: `rotate(${game.loosen.me * -2.5}deg)` }">
            <span v-if="game.loosen.me > 0" class="loosen-tag">牌已松动 ×{{ game.loosen.me }}</span>
            <HuaPianCard :card="slotCard('me')" size="md" />
          </div>
          <span v-else class="slot-empty">被赢走了</span>
        </div>
      </div>

      <!-- 蓄力条：分区随目标牌实时变化 -->
      <div v-if="!game.over" class="slapbar card">
        <div class="bar-track">
          <div
            v-for="(b, i) in bands"
            :key="i"
            class="band"
            :class="b.cls"
            :style="{ left: b.from + '%', width: b.to - b.from + '%' }"
          >
            <span v-if="b.to - b.from > 7">{{ b.label }}</span>
          </div>
          <div class="handle" :style="{ left: power + '%' }" />
        </div>
        <div class="bar-meta">
          <span>力道 <b>{{ Math.round(power) }}</b></span>
          <span>需求线 ≈ <b>{{ showNeed ?? '—' }}</b></span>
          <span class="bar-hint">{{ chargeHint }}</span>
        </div>
        <button class="slap-btn" :class="{ ready: canSlap, charging }" @pointerdown.prevent="beginCharge">
          🖐️ 按住蓄力
        </button>
      </div>

      <!-- 终局 -->
      <div v-else class="verdict card" :class="game.winner">
        <div class="verdict-main">
          {{ game.winner === 'me' ? `🏆 你把${game.names.ai}赢光了！` : `💧 ${game.names.ai}把你的画片赢光了…` }}
        </div>
        <div class="verdict-sub">
          共 {{ game.log.length }} 掌 · 你拍翻 {{ game.stats.meFlips }} 张 · 对方拍翻 {{ game.stats.aiFlips }} 张 ·
          掀角 {{ game.stats.nears }} 次 · 犯规 你{{ game.stats.meFouls }} / 对方{{ game.stats.aiFouls }}
        </div>
        <div class="verdict-fans">
          <div class="vf">
            <span class="vf-label">你的战利品（{{ game.won.me.length }}）</span>
            <div class="fan"><HuaPianCard v-for="c in game.won.me" :key="c.id" :card="c" size="mini" /></div>
          </div>
          <div class="vf">
            <span class="vf-label">{{ game.names.ai }}的战利品（{{ game.won.ai.length }}）</span>
            <div class="fan right"><HuaPianCard v-for="c in game.won.ai" :key="c.id" :card="c" size="mini" /></div>
          </div>
        </div>
        <div class="verdict-btns">
          <button class="btn primary" @click="restart">同场地再来一局</button>
          <button class="btn" @click="backToSetup">换场地 / 换对手</button>
        </div>
      </div>

      <!-- 战报 -->
      <div class="board card">
        <div class="log">
          <div v-for="e in displayLog" :key="e.seq" class="row" :class="{ latest: e.seq === game.log.length }">
            <span class="idx">{{ e.seq }}</span>
            <span class="who" :class="e.atk">{{ game.names[e.atk] }}</span>
            <span class="chip" :class="e.result">{{ RESULT_LABEL[e.result] }}</span>
            <span class="text">{{ e.text }}</span>
            <span class="meta">力道 {{ e.power }} · 线 {{ e.need }}</span>
          </div>
          <div v-if="!game.log.length" class="log-empty">第一掌还没拍下去…</div>
        </div>
      </div>

      <details class="rules card">
        <summary>📜 规则说明（点开查看）</summary>
        <ul>
          <li><b>开局</b>：双方各 12 张画片洗乱，各铺一张正面朝上在场地中央，你先出手，之后轮流。</li>
          <li><b>出手</b>：按住蓄力条（或空格）攒力道，松手开拍；出手自带 ±4 手抖，没人能回回拍正。</li>
          <li><b>力道分区</b>：差需求线 12 点以内算「掀角」——牌没翻但被拍松，需求线每次降 5，最多拍松 3 次；需求线以上 20 点以内是「拍正」，稳稳翻面；再往上劲太大乱流瞎转，只有四成概率瞎翻；顶到 94 以上手掌压到牌上，算犯规，自己的牌白送对面一张。</li>
          <li><b>牌性</b>：普通卡软好翻，硬卡次之，闪卡最硬最值钱；场地也挑人——光滑水泥面好拍，返潮泥土地吸牌。</li>
          <li><b>结算</b>：拍翻对面的牌就收入囊中，对方立刻从牌堆补一张上桌；谁场上没牌、牌堆也空了就输光。</li>
          <li><b>战报</b>：每一掌的力道、需求线与结果都在下方流水里，最新一掌置顶。</li>
        </ul>
      </details>
    </template>
  </div>
</template>

<style scoped>
.hp-page {
  --hp-card-w: 116px;
}

/* ---------- 开局 ---------- */
.setup {
  padding: 20px;
  display: grid;
  gap: 18px;
}

.setup-label {
  font-weight: 700;
  margin-bottom: 10px;
  color: var(--text);
}

.option-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.option {
  text-align: left;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 2px solid var(--line);
  background: var(--surface-soft);
  cursor: pointer;
  display: grid;
  gap: 4px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  font: inherit;
}

.option:hover {
  transform: translateY(-2px);
}

.option.picked {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
  background: var(--surface);
}

.opt-name {
  font-weight: 700;
  font-size: 15px;
}

.opt-feel {
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
}

.opt-desc {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
}

.og-smooth {
  background: linear-gradient(135deg, #e8ebee, #d5dbe0);
}

.og-rough {
  background:
    radial-gradient(rgba(90, 80, 60, 0.14) 1px, transparent 1.5px) 0 0 / 8px 8px,
    linear-gradient(135deg, #d9d2c4, #c9c0ae);
}

.og-wet {
  background:
    radial-gradient(ellipse 26px 10px at 30% 40%, rgba(70, 90, 100, 0.35), transparent 70%),
    radial-gradient(ellipse 34px 12px at 75% 70%, rgba(70, 90, 100, 0.3), transparent 70%),
    linear-gradient(135deg, #b3a488, #97876a);
}

.setup-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.setup-tip {
  font-size: 13px;
  color: var(--muted);
}

/* ---------- 顶部双方面板 ---------- */
.topbar {
  display: grid;
  grid-template-columns: 1fr minmax(240px, 320px) 1fr;
  gap: 14px;
  align-items: stretch;
  padding: 16px;
}

.side {
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface-soft);
  transition: box-shadow 0.25s ease;
}

.side.active {
  box-shadow: inset 0 3px 0 var(--primary);
}

.side-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.side-name {
  font-weight: 800;
  font-size: 16px;
}

.turn-tag {
  font-size: 12px;
  color: var(--primary);
  animation: blink 1.2s ease-in-out infinite;
}

@keyframes blink {
  50% {
    opacity: 0.35;
  }
}

.side-nums {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}

.side-nums b {
  color: var(--text);
}

.fan {
  display: flex;
  min-height: 50px;
  align-items: flex-end;
}

.fan > * + * {
  margin-left: -24px;
}

.fan.right {
  justify-content: flex-end;
}

.console {
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: center;
  text-align: center;
}

.round-line {
  font-size: 15px;
}

.round-line b {
  color: var(--primary);
  font-size: 18px;
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.chip-info {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
}

.ctrl-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ---------- 场地 ---------- */
.arena {
  position: relative;
  min-height: 330px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  box-shadow: inset 0 4px 18px rgba(15, 23, 42, 0.18);
  overflow: hidden;
}

.arena.g-smooth {
  background:
    radial-gradient(ellipse 60% 45% at 30% 20%, rgba(255, 255, 255, 0.5), transparent 70%),
    linear-gradient(135deg, #ccd2d8, #b4bcc4);
}

.arena.g-rough {
  background:
    radial-gradient(rgba(90, 80, 60, 0.16) 1px, transparent 1.5px) 0 0 / 9px 9px,
    radial-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1.5px) 4px 5px / 11px 11px,
    linear-gradient(135deg, #cfc7b8, #b8ae9a);
}

.arena.g-wet {
  background:
    radial-gradient(ellipse 120px 46px at 22% 30%, rgba(62, 84, 96, 0.45), transparent 70%),
    radial-gradient(ellipse 160px 56px at 78% 72%, rgba(62, 84, 96, 0.4), transparent 70%),
    radial-gradient(ellipse 90px 30px at 60% 22%, rgba(62, 84, 96, 0.3), transparent 70%),
    linear-gradient(135deg, #96865f, #7c6f4c);
}

.arena.shake {
  animation: arena-shake 0.46s ease;
}

@keyframes arena-shake {
  0%,
  100% {
    transform: translate(0, 0);
  }
  20% {
    transform: translate(-5px, 3px);
  }
  40% {
    transform: translate(5px, -3px);
  }
  60% {
    transform: translate(-3px, -2px);
  }
  80% {
    transform: translate(3px, 2px);
  }
}

.slot {
  position: absolute;
}

.slot.ai-slot {
  top: 11%;
  right: 12%;
  transform: rotate(3deg);
}

.slot.me-slot {
  bottom: 11%;
  left: 12%;
  transform: rotate(-3deg);
}

.slot-inner {
  position: relative;
  transition: transform 0.25s ease;
}

.loosen-tag {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  color: var(--warm);
  background: rgba(255, 244, 214, 0.92);
  border: 1px solid rgba(180, 83, 9, 0.4);
  padding: 1px 8px;
  border-radius: var(--radius-pill);
}

.slot.targeted::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 16px;
  border: 2px dashed rgba(255, 255, 255, 0.85);
  animation: target-pulse 1.2s ease-in-out infinite;
}

@keyframes target-pulse {
  50% {
    opacity: 0.35;
    inset: -14px;
  }
}

.slot-empty {
  display: inline-block;
  padding: 34px 26px;
  border: 2px dashed rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}

/* 出手结果动画（挂在 slot 上） */
.anim-flip {
  animation: card-flip 0.78s ease forwards;
}

@keyframes card-flip {
  0% {
    opacity: 1;
  }
  30% {
    transform: translateY(-26px) scale(1.18) rotate(40deg);
  }
  100% {
    transform: translateY(4px) scale(0.85) rotate(385deg);
    opacity: 0;
  }
}

.anim-scatter {
  animation: card-scatter 0.72s ease forwards;
}

@keyframes card-scatter {
  0% {
    transform: rotate(0);
  }
  35% {
    transform: rotate(200deg) translateY(-20px) scale(1.12);
  }
  70% {
    transform: rotate(340deg) translateY(-4px);
  }
  100% {
    transform: rotate(360deg);
  }
}

.anim-near {
  animation: card-near 0.56s ease forwards;
}

@keyframes card-near {
  0%,
  100% {
    transform: rotate(0);
  }
  30% {
    transform: perspective(300px) rotateX(26deg) translateY(-7px);
  }
  55% {
    transform: perspective(300px) rotateX(10deg);
  }
}

.anim-miss {
  animation: card-miss 0.4s ease forwards;
}

@keyframes card-miss {
  0%,
  100% {
    transform: translateX(0);
  }
  30% {
    transform: translateX(-4px);
  }
  60% {
    transform: translateX(4px);
  }
}

.anim-forfeit {
  animation: card-forfeit 0.78s ease-in forwards;
}

@keyframes card-forfeit {
  0% {
    opacity: 1;
  }
  100% {
    transform: translate(var(--fly-x), var(--fly-y)) scale(0.45) rotate(24deg);
    opacity: 0;
  }
}

/* 拍击爆点与扬尘 */
.burst {
  position: absolute;
  pointer-events: none;
  z-index: 3;
}

.burst.at-ai {
  top: 11%;
  right: 26%;
}

.burst.at-me {
  bottom: 11%;
  left: 26%;
}

.burst-word {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate(-50%, -50%);
  font-size: 44px;
  font-weight: 900;
  font-style: italic;
  color: #fff;
  text-shadow:
    0 0 12px rgba(255, 196, 60, 0.9),
    2px 3px 0 rgba(120, 60, 0, 0.55);
  animation: burst-pop 0.6s ease forwards;
}

@keyframes burst-pop {
  0% {
    transform: translate(-50%, -50%) scale(0.3) rotate(-14deg);
    opacity: 0;
  }
  25% {
    transform: translate(-50%, -50%) scale(1.35) rotate(4deg);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) scale(1) rotate(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -60%) scale(0.9);
    opacity: 0;
  }
}

.dust {
  position: absolute;
  left: 0;
  top: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(120, 100, 70, 0.6);
  opacity: 0;
  animation: dust-fly 0.55s ease-out forwards;
}

.dust:nth-of-type(1) {
  --dx: -48px;
  --dy: -40px;
}

.dust:nth-of-type(2) {
  --dx: 0;
  --dy: -56px;
}

.dust:nth-of-type(3) {
  --dx: 48px;
  --dy: -40px;
}

.dust:nth-of-type(4) {
  --dx: -62px;
  --dy: 6px;
}

.dust:nth-of-type(5) {
  --dx: 62px;
  --dy: 6px;
}

.dust:nth-of-type(6) {
  --dx: -42px;
  --dy: 44px;
}

.dust:nth-of-type(7) {
  --dx: 0;
  --dy: 52px;
}

.dust:nth-of-type(8) {
  --dx: 42px;
  --dy: 44px;
}

@keyframes dust-fly {
  0% {
    opacity: 0.9;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.4);
  }
}

/* ---------- 蓄力条 ---------- */
.slapbar {
  padding: 16px;
  display: grid;
  gap: 10px;
}

.bar-track {
  position: relative;
  height: 40px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.band {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: rgba(30, 35, 45, 0.55);
  transition:
    left 0.3s ease,
    width 0.3s ease;
}

.band.weak {
  background: #e2e5ea;
}

.band.near {
  background: #ffe8b3;
}

.band.sweet {
  background: #bfe8c4;
  color: #1c6b2e;
}

.band.over {
  background: #ffd6a8;
}

.band.foul {
  background: #f6b8ab;
  color: #8f2313;
}

.handle {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 5px;
  border-radius: 3px;
  background: var(--primary);
  box-shadow: 0 0 8px rgba(47, 111, 237, 0.8);
  transform: translateX(-50%);
  transition: none;
}

.bar-meta {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--muted);
  align-items: center;
}

.bar-meta b {
  color: var(--text);
}

.bar-hint {
  color: var(--primary);
  font-weight: 600;
}

.slap-btn {
  justify-self: center;
  min-width: 220px;
  padding: 14px 26px;
  font-size: 17px;
  font-weight: 800;
  border-radius: var(--radius-pill);
  border: 2px solid var(--line);
  background: var(--surface-soft);
  color: var(--muted);
  cursor: not-allowed;
  touch-action: none;
  user-select: none;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    background 0.2s ease;
}

.slap-btn.ready {
  cursor: pointer;
  border-color: var(--primary);
  color: var(--primary);
  background: var(--surface);
  box-shadow: 0 4px 14px rgba(47, 111, 237, 0.25);
}

.slap-btn.charging {
  transform: scale(1.05);
  background: var(--primary-soft);
  border-color: var(--primary-dark);
  color: var(--primary-dark);
  box-shadow: 0 6px 20px rgba(47, 111, 237, 0.4);
}

/* ---------- 终局 ---------- */
.verdict {
  padding: 20px;
  display: grid;
  gap: 12px;
  justify-items: center;
  text-align: center;
}

.verdict.me {
  background: linear-gradient(160deg, #f0f7ee, var(--surface));
}

.verdict.ai {
  background: linear-gradient(160deg, #f7eeec, var(--surface));
}

.verdict-main {
  font-size: 22px;
  font-weight: 800;
}

.verdict-sub {
  font-size: 13px;
  color: var(--muted);
}

.verdict-fans {
  display: flex;
  gap: 26px;
  flex-wrap: wrap;
  justify-content: center;
}

.vf {
  display: grid;
  gap: 6px;
  justify-items: start;
}

.vf-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}

.vf .fan {
  max-width: 330px;
  flex-wrap: wrap;
  row-gap: 6px;
}

.vf .fan > * + * {
  margin-left: -24px;
}

.verdict-btns {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ---------- 战报 ---------- */
.board {
  padding: 14px 16px;
}

.log {
  display: grid;
  gap: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-soft);
  font-size: 13px;
}

.row.latest {
  box-shadow: inset 0 0 0 2px var(--primary-soft);
}

.idx {
  flex: none;
  width: 30px;
  color: var(--muted);
  font-size: 12px;
}

.who {
  flex: none;
  width: 74px;
  font-weight: 700;
  font-size: 12px;
  text-align: center;
  padding: 2px 0;
  border-radius: var(--radius-pill);
}

.who.me {
  background: var(--primary-soft);
  color: var(--primary);
}

.who.ai {
  background: var(--danger-soft);
  color: var(--danger);
}

.chip {
  flex: none;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
}

.chip.flip {
  background: #bfe8c4;
  color: #1c6b2e;
}

.chip.scatter-flip {
  background: #ffe9a8;
  color: #8a6100;
}

.chip.near {
  background: #ffe8b3;
  color: var(--warm);
}

.chip.miss {
  background: #e2e5ea;
  color: var(--muted);
}

.chip.scatter {
  background: #ffd6a8;
  color: #92400e;
}

.chip.foul {
  background: #f6b8ab;
  color: #8f2313;
}

.text {
  flex: 1;
  min-width: 0;
  line-height: 1.5;
}

.meta {
  flex: none;
  font-size: 11px;
  color: var(--muted);
}

.log-empty {
  padding: 18px;
  text-align: center;
  color: var(--muted);
  font-size: 13px;
}

/* ---------- 规则 ---------- */
.rules {
  padding: 14px 18px;
  font-size: 13px;
  color: var(--text);
}

.rules summary {
  cursor: pointer;
  font-weight: 700;
}

.rules ul {
  margin: 10px 0 0;
  padding-left: 20px;
  display: grid;
  gap: 6px;
  line-height: 1.7;
}

@media (max-width: 860px) {
  .topbar {
    grid-template-columns: 1fr;
  }

  .slot.ai-slot {
    top: 6%;
    right: 6%;
  }

  .slot.me-slot {
    bottom: 6%;
    left: 6%;
  }
}
</style>
