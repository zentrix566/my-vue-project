<template>
  <div class="fight-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">🥊 擂台投注 · 火柴人格斗</h1>
    <p class="subtitle">
      红蓝两个火柴人擂台火并：直拳、重拳、上勾拳、扫堂腿、飞踢轮番上阵，
      蓄满怒气还能放出「波动拳」。下注猜胜者，猜对赢双倍；快速投注模式自动连打，看多少轮输光。
    </p>

    <div class="arena" :class="{ engaged: fighting }">
      <div class="fighter red-side" :class="{ ko: red.hp <= 0, attacker: turn === 'red', defender: turn === 'blue' && fighting }">
        <div class="fighter-head">
          <span class="fighter-name red">红方</span>
          <span class="move-tag" v-if="redMove">{{ redMove }}</span>
        </div>
        <div class="bar hp-bar">
          <div class="hp-fill red" :style="{ width: (red.hp / red.maxHp * 100) + '%' }"></div>
          <span class="bar-text">{{ Math.ceil(red.hp) }} / {{ red.maxHp }}</span>
        </div>
        <div class="bar energy-bar">
          <div class="energy-fill" :class="{ full: red.energy >= 100 }" :style="{ width: red.energy + '%' }"></div>
          <span class="bar-text">怒气 {{ Math.floor(red.energy) }}</span>
        </div>
        <div class="stage">
          <svg class="stickman red" viewBox="0 0 100 140" aria-hidden="true">
            <g class="skeleton" :class="redPose">
              <g class="leg back"><line x1="50" y1="86" x2="32" y2="120" /></g>
              <g class="leg front"><line x1="50" y1="86" x2="68" y2="120" /></g>
              <line class="torso" x1="50" y1="36" x2="50" y2="86" />
              <g class="arm back"><line x1="50" y1="50" x2="28" y2="70" /></g>
              <g class="arm front"><line x1="50" y1="50" x2="72" y2="70" /></g>
              <g class="head"><circle cx="50" cy="22" r="14" /></g>
            </g>
          </svg>
          <div class="impact" v-if="redImpact">💥</div>
          <div class="float-layer">
            <span v-for="f in floats.filter(x => x.side === 'red')" :key="f.id" class="float" :class="f.cls">{{ f.text }}</span>
          </div>
        </div>
      </div>

      <div class="vs" :class="{ hidden: fighting }">VS</div>

      <div class="fighter blue-side" :class="{ ko: blue.hp <= 0, attacker: turn === 'blue', defender: turn === 'red' && fighting }">
        <div class="fighter-head">
          <span class="fighter-name blue">蓝方</span>
          <span class="move-tag" v-if="blueMove">{{ blueMove }}</span>
        </div>
        <div class="bar hp-bar">
          <div class="hp-fill blue" :style="{ width: (blue.hp / blue.maxHp * 100) + '%' }"></div>
          <span class="bar-text">{{ Math.ceil(blue.hp) }} / {{ blue.maxHp }}</span>
        </div>
        <div class="bar energy-bar">
          <div class="energy-fill" :class="{ full: blue.energy >= 100 }" :style="{ width: blue.energy + '%' }"></div>
          <span class="bar-text">怒气 {{ Math.floor(blue.energy) }}</span>
        </div>
        <div class="stage">
          <svg class="stickman blue" viewBox="0 0 100 140" aria-hidden="true">
            <g class="mirror">
            <g class="skeleton" :class="bluePose">
              <g class="leg back"><line x1="50" y1="86" x2="32" y2="120" /></g>
              <g class="leg front"><line x1="50" y1="86" x2="68" y2="120" /></g>
              <line class="torso" x1="50" y1="36" x2="50" y2="86" />
              <g class="arm back"><line x1="50" y1="50" x2="28" y2="70" /></g>
              <g class="arm front"><line x1="50" y1="50" x2="72" y2="70" /></g>
              <g class="head"><circle cx="50" cy="22" r="14" /></g>
            </g>
            </g>
          </svg>
          <div class="impact" v-if="blueImpact">💥</div>
          <div class="float-layer">
            <span v-for="f in floats.filter(x => x.side === 'blue')" :key="f.id" class="float" :class="f.cls">{{ f.text }}</span>
          </div>
        </div>
      </div>

      <div class="projectile" :class="proj.from" v-if="proj.active"></div>
    </div>

    <div class="betbar">
      <div class="bankroll">
        <span class="bankroll-label">当前本金</span>
        <span class="bankroll-value" :class="{ broke: bankroll <= 0, flash: bankrollFlash }">💰 {{ bankroll }}</span>
      </div>
      <div class="betbar-controls">
        <div class="field inline">
          <label>单局下注</label>
          <input v-model.number="betAmount" type="number" min="1" :max="bankroll" :disabled="fighting || quickRunning" />
        </div>
        <div class="chip-row">
          <button class="chip" @click="betAmount = Math.min(bankroll, 10)" :disabled="fighting || quickRunning">10</button>
          <button class="chip" @click="betAmount = Math.min(bankroll, 50)" :disabled="fighting || quickRunning">50</button>
          <button class="chip" @click="betAmount = Math.min(bankroll, 100)" :disabled="fighting || quickRunning">100</button>
          <button class="chip" @click="betAmount = Math.min(bankroll, Math.floor(bankroll / 2))" :disabled="fighting || quickRunning">半仓</button>
          <button class="chip" @click="betAmount = bankroll" :disabled="fighting || quickRunning">全押</button>
        </div>
        <div class="side-row">
          <button class="side red" :class="{ active: pick === 'red' }" @click="pick = 'red'" :disabled="fighting || quickRunning">押红方</button>
          <button class="side blue" :class="{ active: pick === 'blue' }" @click="pick = 'blue'" :disabled="fighting || quickRunning">押蓝方</button>
        </div>
        <button class="primary fight-btn" :disabled="!canFight" @click="startSingleFight">开打！</button>
      </div>
      <div class="bankroll-actions">
        <div class="field inline small">
          <label>初始本金</label>
          <input v-model.number="bankrollInput" type="number" min="1" :disabled="fighting || quickRunning" />
        </div>
        <button class="reset" @click="resetGame" :disabled="fighting || quickRunning">重置本金</button>
      </div>
    </div>

    <div class="result-banner" v-if="lastResult" :class="{ win: lastResult.includes('赢'), lose: lastResult.includes('输') }">
      {{ lastResult }}
      <span class="result-bankroll">（当前本金 {{ bankroll }}）</span>
    </div>

    <div class="panel">
      <div class="panel-section quick">
        <h2>⚡ 快速投注模式</h2>
        <p class="hint">自动连续下注，直到本金不足以支付下一局（输光），或你手动停止。</p>
        <div class="field">
          <label>选边策略</label>
          <select v-model="quickSide" :disabled="quickRunning">
            <option value="pick">始终押当前选边</option>
            <option value="alternate">红蓝交替</option>
            <option value="random">随机乱押</option>
          </select>
        </div>
        <div class="field">
          <label>下注策略</label>
          <select v-model="quickStake" :disabled="quickRunning">
            <option value="fixed">固定金额（用单局下注值）</option>
            <option value="percent">每局按本金百分比</option>
          </select>
        </div>
        <div class="field" v-if="quickStake === 'percent'">
          <label>百分比：{{ quickPercent }}%</label>
          <input v-model.number="quickPercent" type="range" min="1" max="100" step="1" :disabled="quickRunning" />
        </div>
        <div class="field">
          <label>速度：每帧处理 {{ quickBatch }} 局</label>
          <input v-model.number="quickBatch" type="range" min="1" max="300" step="1" :disabled="quickRunning" />
        </div>
        <button v-if="!quickRunning" class="primary quick-btn" :disabled="!canQuick" @click="startQuick">开始快速投注</button>
        <button v-else class="danger" @click="stopQuick">停止</button>
        <div class="progress" v-if="quickRunning || bankrupt">
          已自动进行 <strong>{{ stats.rounds }}</strong> 局
          <span v-if="bankrupt">，第 <strong>{{ bankruptRound }}</strong> 局输光 💸</span>
        </div>
      </div>

      <div class="panel-section stats">
        <h2>战绩</h2>
        <div class="stat-grid">
          <div><span>总局数</span><strong>{{ stats.rounds }}</strong></div>
          <div><span>猜胜</span><strong class="win">{{ stats.wins }}</strong></div>
          <div><span>猜负</span><strong class="lose">{{ stats.losses }}</strong></div>
          <div><span>胜率</span><strong>{{ winRate }}%</strong></div>
          <div><span>最高本金</span><strong>{{ stats.peak }}</strong></div>
          <div><span>最长连胜</span><strong>{{ stats.maxWinStreak }}</strong></div>
          <div><span>最长连败</span><strong>{{ stats.maxLoseStreak }}</strong></div>
          <div><span>输光轮数</span><strong>{{ bankruptRound ?? '—' }}</strong></div>
        </div>
      </div>
    </div>

    <div class="log">
      <h2>战报</h2>
      <ul>
        <li v-for="(line, i) in log" :key="i" :class="line.cls">{{ line.text }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'

const MAX_HP = 120
const DODGE_CHANCE = 0.08
const MAX_ENERGY = 100

// 招式表：不同的前置/收招时间、伤害、暴击率、怒气获取与姿势
const MOVES = {
  jab:     { name: '直拳',   min: 6,  max: 12, crit: 0.10, energy: 12, pose: 'punch',  windup: 90,  recover: 120 },
  hook:    { name: '重拳',   min: 10, max: 18, crit: 0.15, energy: 14, pose: 'hook',   windup: 120, recover: 160 },
  upper:   { name: '上勾拳', min: 12, max: 22, crit: 0.22, energy: 16, pose: 'upper',  windup: 140, recover: 180 },
  sweep:   { name: '扫堂腿', min: 10, max: 16, crit: 0.10, energy: 15, pose: 'sweep',  windup: 150, recover: 200, knockdown: 0.5 },
  kick:    { name: '飞踢',   min: 15, max: 26, crit: 0.22, energy: 18, pose: 'kick',   windup: 200, recover: 220, knockdown: 0.25 },
  special: { name: '波动拳', min: 36, max: 56, crit: 0.25, energy: 0,  pose: 'special', windup: 360, recover: 260, cost: 100, projectile: true }
}

const makeFighter = () => ({ hp: MAX_HP, maxHp: MAX_HP, energy: 0 })

const red = reactive(makeFighter())
const blue = reactive(makeFighter())

const redPose = ref('idle')
const bluePose = ref('idle')
const redMove = ref('')
const blueMove = ref('')
const redImpact = ref(false)
const blueImpact = ref(false)

const floats = ref([])
let floatId = 0

const proj = reactive({ active: false, from: 'from-red' })

const bankrollInput = ref(1000)
const bankroll = ref(1000)
const betAmount = ref(50)
const pick = ref('red')

const fighting = ref(false)
const turn = ref('')
const lastResult = ref('')
const bankrollFlash = ref(false)
let flashTimer = 0

const log = ref([])
const stats = reactive({
  rounds: 0,
  wins: 0,
  losses: 0,
  peak: 1000,
  maxWinStreak: 0,
  maxLoseStreak: 0,
  winStreak: 0,
  loseStreak: 0
})

const quickSide = ref('pick')
const quickStake = ref('fixed')
const quickPercent = ref(10)
const quickBatch = ref(80)
const quickRunning = ref(false)
const bankrupt = ref(false)
const bankruptRound = ref(null)

let quickRaf = 0
let battleToken = 0

const winRate = computed(() => {
  if (!stats.rounds) return 0
  return (stats.wins / stats.rounds * 100).toFixed(1)
})

const canFight = computed(() =>
  !fighting.value && !quickRunning.value &&
  betAmount.value > 0 && betAmount.value <= bankroll.value
)

const canQuick = computed(() =>
  !fighting.value && !quickRunning.value &&
  (quickStake.value !== 'fixed' || betAmount.value > 0) &&
  bankroll.value > 0
)

// 本金变化时跳动高亮
watch(bankroll, () => {
  bankrollFlash.value = true
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => { bankrollFlash.value = false }, 400)
})

function addLog(text, cls = '') {
  log.value.unshift({ text, cls })
  if (log.value.length > 40) log.value.pop()
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function pickMove(fighter) {
  if (fighter.energy >= MAX_ENERGY && Math.random() < 0.78) return 'special'
  const pool = ['jab', 'jab', 'jab', 'hook', 'hook', 'upper', 'sweep', 'kick']
  return pool[Math.floor(Math.random() * pool.length)]
}

// 计算一次出招结果，动画与快速模式共用
function performMove(moveKey, attacker, defender) {
  const m = MOVES[moveKey]
  let dmg = m.min + Math.random() * (m.max - m.min)
  const crit = Math.random() < m.crit
  if (crit) dmg *= 2
  const dodge = Math.random() < DODGE_CHANCE
  let dealt = 0
  let knock = false
  if (!dodge) {
    dealt = dmg
    defender.hp = Math.max(0, defender.hp - dmg)
    defender.energy = Math.min(MAX_ENERGY, defender.energy + 8)
    if (m.knockdown && Math.random() < m.knockdown) knock = true
  }
  if (moveKey === 'special') {
    attacker.energy = 0
  } else {
    attacker.energy = Math.min(MAX_ENERGY, attacker.energy + m.energy)
  }
  return { moveKey, dmg: dealt, crit, dodge, knock }
}

function setPose(side, pose) {
  if (side === 'red') redPose.value = pose
  else bluePose.value = pose
}

function setMoveName(side, name) {
  if (side === 'red') redMove.value = name
  else blueMove.value = name
}

function popFloat(side, text, cls = '') {
  const id = ++floatId
  floats.value.push({ id, side, text, cls })
  setTimeout(() => {
    floats.value = floats.value.filter(f => f.id !== id)
  }, 750)
}

function flashImpact(side) {
  const ref = side === 'red' ? redImpact : blueImpact
  ref.value = true
  setTimeout(() => { ref.value = false }, 220)
}

function launchProjectile(fromSide) {
  proj.from = fromSide === 'red' ? 'from-red' : 'from-blue'
  proj.active = true
  setTimeout(() => { proj.active = false }, 360)
}

async function animateMove(side, moveKey, defenderSide, result) {
  const m = MOVES[moveKey]
  setMoveName(side, m.name)
  setPose(side, m.pose)
  if (m.projectile) launchProjectile(side)

  await delay(m.windup)

  if (result.dodge) {
    popFloat(defenderSide, '闪避！', 'dodge')
    addLog(`${side === 'red' ? '红方' : '蓝方'}使出${m.name}，被对方闪避`, 'dodge')
  } else {
    setPose(defenderSide, 'hurt')
    flashImpact(defenderSide)
    popFloat(defenderSide, Math.round(result.dmg), result.crit ? 'crit' : 'hit')
    const who = side === 'red' ? '红方' : '蓝方'
    const tail = result.crit ? '（暴击！）' : (result.knock ? '（击倒！）' : '')
    addLog(`${who}${m.name}命中，造成 ${Math.round(result.dmg)} 点伤害${tail}`, result.crit ? 'crit' : 'hit')
  }

  await delay(m.recover)
  setPose(side, 'idle')
  setMoveName(side, '')
  return result.knock
}

async function startSingleFight() {
  if (!canFight.value) return
  const token = ++battleToken
  fighting.value = true
  lastResult.value = ''
  resetFighters()
  const stake = Math.min(betAmount.value, bankroll.value)

  const sides = ['red', 'blue']
  let turnIdx = Math.random() < 0.5 ? 0 : 1
  const down = [0, 0]

  // 双方走到中场贴身
  turn.value = ''
  await delay(420)

  while (red.hp > 0 && blue.hp > 0) {
    if (token !== battleToken) return
    if (down[turnIdx] > 0) {
      down[turnIdx]--
      turn.value = ''
      setPose(sides[turnIdx], 'down')
      await delay(180)
      setPose(sides[turnIdx], 'idle')
      turnIdx = 1 - turnIdx
      continue
    }

    turn.value = sides[turnIdx]
    const side = sides[turnIdx]
    const defenderSide = sides[1 - turnIdx]
    const attacker = side === 'red' ? red : blue
    const defender = side === 'red' ? blue : red

    const moveKey = pickMove(attacker)
    const result = performMove(moveKey, attacker, defender)
    const knock = await animateMove(side, moveKey, defenderSide, result)

    if (knock) down[1 - turnIdx] = 1
    if (defender.hp <= 0) {
      setPose(defenderSide, 'ko')
      break
    }
    setPose(defenderSide, 'idle')
    turn.value = ''
    await delay(60)
    turnIdx = 1 - turnIdx
  }

  if (token !== battleToken) return
  const winner = red.hp > 0 ? 'red' : 'blue'
  turn.value = winner
  setPose(winner, 'win')
  settle(winner, stake)
  fighting.value = false
}

function simulateRoundInstant() {
  const a = { hp: MAX_HP, energy: 0 }
  const b = { hp: MAX_HP, energy: 0 }
  const down = { a: 0, b: 0 }
  let turn = Math.random() < 0.5 ? 'a' : 'b'
  while (a.hp > 0 && b.hp > 0) {
    if (down[turn] > 0) { down[turn]--; turn = turn === 'a' ? 'b' : 'a'; continue }
    const me = turn === 'a' ? a : b
    const op = turn === 'a' ? b : a
    const moveKey = pickMove(me)
    const res = performMove(moveKey, me, op)
    if (res.knock) down[turn === 'a' ? 'b' : 'a'] = 1
    turn = turn === 'a' ? 'b' : 'a'
  }
  return a.hp > 0 ? 'red' : 'blue'
}

function chooseQuickSide(roundIndex) {
  if (quickSide.value === 'alternate') return roundIndex % 2 === 0 ? pick.value : (pick.value === 'red' ? 'blue' : 'red')
  if (quickSide.value === 'random') return Math.random() < 0.5 ? 'red' : 'blue'
  return pick.value
}

function currentStake() {
  if (quickStake.value === 'percent') {
    return Math.max(1, Math.floor(bankroll.value * quickPercent.value / 100))
  }
  return Math.min(betAmount.value, bankroll.value)
}

function recordRound(win) {
  stats.rounds++
  if (win) {
    stats.wins++
    stats.winStreak++
    stats.loseStreak = 0
    stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak)
  } else {
    stats.losses++
    stats.loseStreak++
    stats.winStreak = 0
    stats.maxLoseStreak = Math.max(stats.maxLoseStreak, stats.loseStreak)
  }
  stats.peak = Math.max(stats.peak, bankroll.value)
}

function settle(winner, stake) {
  const won = pick.value === winner
  if (won) {
    bankroll.value += stake
    lastResult.value = `🏆 ${winner === 'red' ? '红方' : '蓝方'}胜！你赢了 ${stake}`
  } else {
    bankroll.value -= stake
    lastResult.value = `💀 ${winner === 'red' ? '红方' : '蓝方'}胜，你押的${winner === 'red' ? '蓝' : '红'}方败了，输掉 ${stake}`
  }
  recordRound(won)
  addLog(lastResult.value, won ? 'win' : 'lose')
  const minStake = quickStake.value === 'percent' ? 1 : betAmount.value
  bankrupt.value = bankroll.value < minStake
  if (bankrupt.value && bankruptRound.value === null) {
    bankruptRound.value = stats.rounds
  }
}

function startQuick() {
  if (!canQuick.value) return
  quickRunning.value = true
  bankrupt.value = false
  bankruptRound.value = null
  lastResult.value = '⚡ 快速投注进行中…'
  resetFighters()

  const tick = () => {
    if (!quickRunning.value) return
    for (let i = 0; i < quickBatch.value; i++) {
      const stake = currentStake()
      if (stake <= 0 || stake > bankroll.value) {
        finishBankrupt()
        return
      }
      const side = chooseQuickSide(stats.rounds)
      pick.value = side
      const winner = simulateRoundInstant()
      if (winner === side) {
        bankroll.value += stake
        stats.wins++
        stats.winStreak++
        stats.loseStreak = 0
        stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak)
      } else {
        bankroll.value -= stake
        stats.losses++
        stats.loseStreak++
        stats.winStreak = 0
        stats.maxLoseStreak = Math.max(stats.maxLoseStreak, stats.loseStreak)
      }
      stats.rounds++
      stats.peak = Math.max(stats.peak, bankroll.value)

      const nextStake = quickStake.value === 'percent'
        ? Math.max(1, Math.floor(bankroll.value * quickPercent.value / 100))
        : betAmount.value
      if (bankroll.value < nextStake || bankroll.value <= 0) {
        bankroll.value = Math.max(0, bankroll.value)
        finishBankrupt()
        return
      }
    }
    quickRaf = requestAnimationFrame(tick)
  }
  quickRaf = requestAnimationFrame(tick)
}

function finishBankrupt() {
  quickRunning.value = false
  bankrupt.value = true
  bankruptRound.value = stats.rounds
  lastResult.value = `💸 第 ${stats.rounds} 局输光，本金归零。`
  addLog(lastResult.value, 'lose')
  cancelAnimationFrame(quickRaf)
}

function stopQuick() {
  quickRunning.value = false
  cancelAnimationFrame(quickRaf)
  lastResult.value = `已停止，当前本金 ${bankroll.value}`
  addLog(lastResult.value, 'info')
}

function resetFighters() {
  red.hp = red.maxHp
  blue.hp = blue.maxHp
  red.energy = 0
  blue.energy = 0
  redPose.value = bluePose.value = 'idle'
  redMove.value = blueMove.value = ''
  redImpact.value = blueImpact.value = false
  turn.value = ''
  proj.active = false
}

function resetGame() {
  battleToken++
  cancelAnimationFrame(quickRaf)
  quickRunning.value = false
  fighting.value = false
  bankroll.value = Math.max(1, bankrollInput.value || 1000)
  betAmount.value = Math.min(betAmount.value || 50, bankroll.value)
  resetFighters()
  lastResult.value = ''
  bankrupt.value = false
  bankruptRound.value = null
  stats.rounds = 0
  stats.wins = 0
  stats.losses = 0
  stats.peak = bankroll.value
  stats.maxWinStreak = 0
  stats.maxLoseStreak = 0
  stats.winStreak = 0
  stats.loseStreak = 0
  floats.value = []
  log.value = []
  addLog('新的一局开始，本金 ' + bankroll.value, 'info')
}

onUnmounted(() => {
  cancelAnimationFrame(quickRaf)
  clearTimeout(flashTimer)
  battleToken++
})

addLog('欢迎来到擂台，初始本金 ' + bankroll.value, 'info')
</script>

<style scoped>
.fight-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 20px 60px;
}

.back { color: var(--color-muted); font-size: 14px; }
.title { margin: 8px 0 4px; }
.subtitle { color: var(--color-muted); margin-top: 0; font-size: 14px; }

.arena {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 70px 1fr;
  align-items: end;
  gap: 8px;
  background:
    radial-gradient(120% 80% at 50% 120%, rgba(212, 160, 23, 0.18), transparent 60%),
    linear-gradient(180deg, #2a1a1a, #160f0f);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 22px 18px 26px;
  margin: 18px 0;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

.fighter { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.fighter-head { display: flex; align-items: center; gap: 8px; min-height: 22px; }
.fighter-name { font-weight: 700; font-size: 15px; }
.fighter-name.red { color: #ff8787; }
.fighter-name.blue { color: #74c0fc; }
.move-tag {
  font-size: 12px;
  font-weight: 700;
  color: #1a1212;
  background: #f0c060;
  padding: 2px 8px;
  border-radius: 10px;
  animation: pop 0.18s ease;
}
@keyframes pop { from { transform: scale(0.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.bar {
  position: relative;
  width: 100%;
  max-width: 240px;
  height: 18px;
  background: #3a2a2a;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.5);
}
.energy-bar { height: 12px; }
.hp-fill, .energy-fill { height: 100%; transition: width 0.18s ease; }
.hp-fill.red { background: linear-gradient(90deg, #ff6b6b, #fa5252); }
.hp-fill.blue { background: linear-gradient(90deg, #4dabf7, #228be6); }
.energy-fill {
  width: 0;
  background: linear-gradient(90deg, #fcc419, #fab005);
}
.energy-fill.full {
  background: linear-gradient(90deg, #ffe066, #ff922b);
  animation: energyPulse 0.6s ease-in-out infinite alternate;
}
@keyframes energyPulse { to { filter: brightness(1.35); } }
.bar-text {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
}

.stage {
  position: relative;
  height: 170px;
  width: 160px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.3, 0.8, 0.4, 1);
}

/* 开打时双方滑到中场贴身（血条与名字仍留在两侧） */
.arena.engaged .red-side .stage {
  transform: translateX(clamp(140px, 29vw, 268px));
}
.arena.engaged .blue-side .stage {
  transform: translateX(clamp(-140px, -29vw, -268px));
}
/* 攻击者出招瞬间再向前探身，形成真正打进对方身体的距离感 */
.arena.engaged .fighter.attacker .stage {
  transition: transform 0.1s ease-out;
}
.arena.engaged .red-side.attacker .stage {
  transform: translateX(clamp(168px, 32vw, 296px));
}
.arena.engaged .blue-side.attacker .stage {
  transform: translateX(clamp(-168px, -32vw, -296px));
}
.fighter.attacker .stage { z-index: 2; }
.fighter.defender .stage { z-index: 1; }

/* 火柴人 -------------------------------------------------- */
.stickman {
  width: 150px;
  height: 170px;
  overflow: visible;
}
.stickman line,
.stickman circle {
  stroke-width: 4.5;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.stickman.red line,
.stickman.red circle { stroke: #ff8787; }
.stickman.blue line,
.stickman.blue circle { stroke: #74c0fc; }
.stickman circle { fill: rgba(255, 255, 255, 0.05); }

.skeleton { transform-origin: 50px 130px; animation: breathe 2.4s ease-in-out infinite; }
.mirror { transform: scaleX(-1); transform-origin: 50px 70px; }
@keyframes breathe {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1.5px); }
}

/* 肢体旋转基点 */
.arm.front, .arm.back { transform-origin: 50px 50px; transition: transform 0.12s ease; }
.leg.front, .leg.back { transform-origin: 50px 86px; transition: transform 0.12s ease; }
.head { transform-origin: 50px 30px; transition: transform 0.12s ease; }
.torso { stroke-width: 5; }

/* idle 站姿 */
.skeleton.idle .arm.back { transform: rotate(20deg); }
.skeleton.idle .leg.back { transform: rotate(-12deg); }
.skeleton.idle .leg.front { transform: rotate(10deg); }

/* 直拳 */
.skeleton.punch { animation: lunge 0.25s ease; }
.skeleton.punch .arm.front { transform: rotate(-58deg) translateX(-2px); }
.skeleton.punch .arm.back { transform: rotate(30deg); }

/* 重拳：横扫 */
.skeleton.hook { animation: lungeBig 0.3s ease; }
.skeleton.hook .arm.front { transform: rotate(-30deg); }
.skeleton.hook .arm.back { transform: rotate(-60deg); }
.skeleton.hook .torso { transform: rotate(-8deg); transform-origin: 50px 86px; }

/* 上勾拳 */
.skeleton.upper { animation: upperLean 0.32s ease; }
.skeleton.upper .arm.front { transform: rotate(-140deg); }
.skeleton.upper .arm.back { transform: rotate(35deg); }
.skeleton.upper .head { transform: translateY(-3px); }

/* 扫堂腿：低身横扫 */
.skeleton.sweep { animation: crouch 0.35s ease; }
.skeleton.sweep .leg.front { transform: rotate(-22deg) translateY(6px); }
.skeleton.sweep .leg.back { transform: rotate(18deg); }
.skeleton.sweep .arm.front { transform: rotate(-40deg); }
.skeleton.sweep .arm.back { transform: rotate(40deg); }

/* 飞踢：高飞前冲 */
.skeleton.kick { animation: jumpKick 0.42s ease; }
.skeleton.kick .leg.front { transform: rotate(-78deg) translateY(-4px); }
.skeleton.kick .leg.back { transform: rotate(25deg); }
.skeleton.kick .arm.front { transform: rotate(40deg); }
.skeleton.kick .arm.back { transform: rotate(-130deg); }

/* 波动拳：聚气推出 */
.skeleton.special { animation: charge 0.5s ease; }
.skeleton.special .arm.front,
.skeleton.special .arm.back { transform: rotate(-82deg) translateX(-6px); }
.skeleton.special .leg.front { transform: rotate(16deg); }
.skeleton.special .leg.back { transform: rotate(-16deg); }

/* 受击 */
.skeleton.hurt {
  animation: hurtShake 0.22s ease;
  filter: brightness(1.9) drop-shadow(0 0 8px #ffd43b);
}
.skeleton.hurt .head { transform: rotate(-20deg); }
.skeleton.hurt .arm.front { transform: rotate(40deg); }

/* 被击倒 */
.skeleton.down { animation: fallDown 0.3s ease forwards; }

/* KO */
.skeleton.ko { animation: koFall 0.5s ease forwards; }

/* 胜利 */
.skeleton.win { animation: victory 0.6s ease; }
.skeleton.win .arm.front,
.skeleton.win .arm.back { transform: rotate(-150deg); }
.skeleton.win .head { transform: translateY(-2px); }

@keyframes lunge {
  0% { transform: translateX(0); }
  50% { transform: translateX(16px); }
  100% { transform: translateX(0); }
}
@keyframes lungeBig {
  0% { transform: translateX(0); }
  50% { transform: translateX(20px); }
  100% { transform: translateX(0); }
}
@keyframes upperLean {
  0% { transform: translateX(0) translateY(6px); }
  50% { transform: translateX(10px) translateY(-6px); }
  100% { transform: translateX(0); }
}
@keyframes crouch {
  0% { transform: translateY(0); }
  50% { transform: translateY(12px) translateX(8px); }
  100% { transform: translateY(0); }
}
@keyframes jumpKick {
  0% { transform: translateY(0); }
  40% { transform: translateY(-26px) translateX(18px); }
  70% { transform: translateY(-10px) translateX(24px); }
  100% { transform: translateY(0) translateX(0); }
}
@keyframes charge {
  0% { transform: translateX(0) scale(1); }
  40% { transform: translateX(-8px) scale(1.08); filter: drop-shadow(0 0 10px #74c0fc); }
  100% { transform: translateX(0) scale(1); }
}
@keyframes hurtShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px) rotate(-6deg); }
  75% { transform: translateX(-4px) rotate(4deg); }
}
@keyframes fallDown {
  to { transform: rotate(-55deg) translate(-6px, 20px); }
}
@keyframes koFall {
  0% { transform: rotate(0); }
  100% { transform: rotate(-86deg) translate(10px, 28px); opacity: 0.7; }
}
@keyframes victory {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
  60% { transform: translateY(-4px); }
}

/* 冲击与飘字 --------------------------------------------- */
.impact {
  position: absolute;
  top: 38%;
  font-size: 40px;
  animation: impactPop 0.22s ease;
  pointer-events: none;
}
.fighter:nth-child(3) .impact { left: 18%; }
.fighter:nth-child(1) .impact { right: 18%; }
@keyframes impactPop {
  0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.3) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 0; }
}

.float-layer { position: absolute; inset: 0; pointer-events: none; }
.float {
  position: absolute;
  top: 30%;
  left: 50%;
  font-weight: 800;
  font-size: 20px;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  animation: floatUp 0.75s ease forwards;
}
.float.hit { color: #ffe066; }
.float.crit { color: #ff6b6b; font-size: 26px; }
.float.dodge { color: #b197fc; font-size: 16px; }
@keyframes floatUp {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  20% { transform: translate(-50%, -10px) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -60px) scale(1); opacity: 0; }
}

/* 波动拳飞行物 ------------------------------------------- */
.projectile {
  position: absolute;
  top: 42%;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffffff 0%, #74c0fc 35%, rgba(116, 192, 252, 0.3) 70%, transparent 75%);
  box-shadow: 0 0 24px 6px rgba(116, 192, 252, 0.6);
  pointer-events: none;
}
.projectile.from-red { left: 20%; animation: flyRight 0.36s linear forwards; }
.projectile.from-blue { right: 20%; animation: flyLeft 0.36s linear forwards; }
@keyframes flyRight { to { left: 70%; transform: scale(1.3); } }
@keyframes flyLeft { to { right: 70%; transform: scale(1.3); } }

.vs {
  color: #f0c060;
  font-size: 26px;
  font-weight: 800;
  padding-bottom: 80px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.vs.hidden {
  opacity: 0;
  transform: scale(0.6);
}

/* 擂台下方的下注控制条 ----------------------------------- */
.betbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 14px 18px;
  margin-bottom: 14px;
}
.bankroll {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 18px;
  border-right: 1px solid var(--color-border);
  min-width: 140px;
}
.bankroll-label {
  font-size: 12px;
  color: var(--color-muted);
}
.bankroll-value {
  font-size: 28px;
  font-weight: 800;
  color: #2f9e44;
  font-variant-numeric: tabular-nums;
  transition: transform 0.2s ease, color 0.2s ease;
}
.bankroll-value.broke { color: var(--color-danger); }
.bankroll-value.flash { animation: bankrollPop 0.4s ease; }
@keyframes bankrollPop {
  0% { transform: scale(1); }
  40% { transform: scale(1.18); }
  100% { transform: scale(1); }
}
.betbar-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
}
.field.inline {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}
.field.inline.small input { width: 90px; }
.betbar .chip-row { margin-top: 0; }
.fight-btn {
  width: auto;
  margin-top: 0;
  padding: 12px 28px;
  font-size: 17px;
  align-self: flex-end;
}
.bankroll-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 18px;
  border-left: 1px solid var(--color-border);
}
.bankroll-actions .reset { width: auto; margin-top: 0; padding: 6px 12px; }

@media (max-width: 760px) {
  .betbar { grid-template-columns: 1fr; gap: 12px; }
  .bankroll {
    flex-direction: row;
    align-items: baseline;
    gap: 10px;
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 10px;
  }
  .bankroll-actions {
    flex-direction: row;
    align-items: flex-end;
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding-top: 10px;
  }
  .fight-btn { width: 100%; }
}

.result-banner {
  text-align: center;
  font-weight: 700;
  font-size: 16px;
  padding: 10px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.result-banner.win { color: #2f9e44; border-color: #b2f2bb; }
.result-banner.lose { color: var(--color-danger); border-color: #ffc9c9; }
.result-bankroll { color: var(--color-muted); font-weight: 500; font-size: 14px; }

.panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.panel-section {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow-card);
}
.panel-section h2 { margin: 0 0 12px; font-size: 16px; }

.field { margin-bottom: 12px; }
.field label { display: block; font-size: 13px; color: var(--color-muted); margin-bottom: 4px; }
.field input[type="number"], .field select {
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--color-border); border-radius: 8px;
  font-size: 14px; background: var(--color-bg); color: var(--color-text);
}
.field input[type="range"] { width: 100%; }

.chip-row, .side-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip {
  padding: 4px 10px; font-size: 13px;
  border: 1px solid var(--color-border); background: var(--color-bg);
  border-radius: 16px; cursor: pointer; color: var(--color-text);
}
.chip:hover:not(:disabled) { border-color: var(--color-primary); }
.side { flex: 1; padding: 8px; border-radius: 8px; border: 2px solid transparent; font-weight: 700; cursor: pointer; color: #fff; }
.side.red { background: #fa5252; }
.side.blue { background: #228be6; }
.side.red.active { box-shadow: 0 0 0 3px rgba(250, 82, 82, 0.35); }
.side.blue.active { box-shadow: 0 0 0 3px rgba(34, 139, 230, 0.35); }

.primary, .danger, .reset {
  width: 100%; padding: 10px; border-radius: 8px; border: none;
  font-size: 15px; font-weight: 700; cursor: pointer; margin-top: 6px; color: #fff;
}
.primary { background: var(--color-primary); }
.primary:hover:not(:disabled) { filter: brightness(1.08); }
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.danger { background: var(--color-danger); }
.reset { background: transparent; color: var(--color-muted); border: 1px solid var(--color-border); margin-top: 8px; }
.quick-btn { background: #f59f00; }

.hint { font-size: 12px; color: var(--color-muted); margin: -4px 0 12px; }
.progress {
  margin-top: 10px; font-size: 14px; color: var(--color-text);
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 8px 10px;
}
.progress strong { color: var(--color-primary); }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-grid div {
  display: flex; flex-direction: column;
  background: var(--color-bg); border: 1px solid var(--color-border);
  border-radius: 8px; padding: 8px 10px;
}
.stat-grid span { font-size: 12px; color: var(--color-muted); }
.stat-grid strong { font-size: 18px; }
.stat-grid .win { color: #2f9e44; }
.stat-grid .lose { color: var(--color-danger); }

.log {
  margin-top: 20px;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow-card);
}
.log h2 { margin: 0 0 8px; font-size: 15px; }
.log ul { list-style: none; margin: 0; padding: 0; max-height: 240px; overflow-y: auto; }
.log li { font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--color-border); color: var(--color-muted); }
.log li.win { color: #2f9e44; }
.log li.lose { color: var(--color-danger); }
.log li.hit { color: var(--color-text); }
.log li.crit { color: #e8590c; font-weight: 700; }
.log li.dodge { color: #7048e8; }
.log li.info { color: var(--color-muted); }
</style>
