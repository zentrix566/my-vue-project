<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { formatMoney, shuffle } from '../utils/deal-engine.js'
import { QUESTIONS } from '../utils/questions.js'
import { addRecord } from '../utils/records.js'
import { playBundle, playDrop, playLose, playWin } from '../utils/sound.js'

const emit = defineEmits(['finished'])
const fmt = formatMoney
const BUNDLE = 25000
const TOTAL_BUNDLES = 40
const QUESTION_COUNT = 4
const TIME_LIMIT = 60

// idle 开场 | place 押注 | reveal 揭晓 | end 终局
const phase = ref('idle')
const run = ref([])
const qIdx = ref(0)
const hand = ref(0)
const stacks = ref([0, 0, 0, 0])
const bank = ref(TOTAL_BUNDLES)
const recap = ref([])
const timeLeft = ref(TIME_LIMIT)
const timing = ref(localStorage.getItem('game-show:timing') !== '0')
const lockWarn = ref(false)
const prize = ref(0)
const recorded = ref(false)
let tick = null
let revealTimer = null
let warnTimer = null

const current = computed(() => run.value[qIdx.value] || null)
const bankMoney = computed(() => bank.value * BUNDLE)

function pickQuestions() {
  return shuffle(QUESTIONS)
    .slice(0, QUESTION_COUNT)
    .map(q => {
      const order = shuffle([0, 1, 2, 3])
      return { q: q.q, opts: order.map(k => q.opts[k]), a: order.indexOf(q.a) }
    })
}

function toggleTiming() {
  timing.value = !timing.value
  localStorage.setItem('game-show:timing', timing.value ? '1' : '0')
}

function stopTimer() {
  if (tick) {
    clearInterval(tick)
    tick = null
  }
}

function stopTimers() {
  stopTimer()
  clearTimeout(revealTimer)
  clearTimeout(warnTimer)
}

function startTimer() {
  stopTimer()
  if (!timing.value) return
  timeLeft.value = TIME_LIMIT
  tick = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) doReveal()
  }, 1000)
}

function start() {
  stopTimers()
  run.value = pickQuestions()
  qIdx.value = 0
  hand.value = TOTAL_BUNDLES
  stacks.value = [0, 0, 0, 0]
  bank.value = TOTAL_BUNDLES
  recap.value = []
  prize.value = 0
  recorded.value = false
  lockWarn.value = false
  phase.value = 'place'
  startTimer()
}

function place(i) {
  if (phase.value !== 'place' || hand.value <= 0) return
  hand.value--
  stacks.value[i]++
  playBundle()
}

function takeBack(i) {
  if (phase.value !== 'place' || stacks.value[i] <= 0) return
  stacks.value[i]--
  hand.value++
  playBundle()
}

// 手里还有钱时锁定要二次确认——未上桌的现金会被直接收走
function lockClick() {
  if (phase.value !== 'place') return
  if (hand.value > 0 && !lockWarn.value) {
    lockWarn.value = true
    clearTimeout(warnTimer)
    warnTimer = setTimeout(() => { lockWarn.value = false }, 3200)
    return
  }
  doReveal()
}

function doReveal() {
  if (phase.value !== 'place') return
  stopTimer()
  lockWarn.value = false
  phase.value = 'reveal'
  const cur = current.value
  const kept = stacks.value[cur.a]
  const wrong = stacks.value.reduce((s, v, i) => (i === cur.a ? s : s + v), 0)
  const dropped = (wrong + hand.value) * BUNDLE
  bank.value = kept
  recap.value.push({ q: cur.q, correct: cur.opts[cur.a], kept, dropped })
  if (dropped > 0) playDrop()
  revealTimer = setTimeout(() => {
    if (bank.value <= 0 || qIdx.value >= QUESTION_COUNT - 1) {
      finish()
      return
    }
    qIdx.value++
    stacks.value = [0, 0, 0, 0]
    hand.value = bank.value
    phase.value = 'place'
    startTimer()
  }, 2600)
}

function finish() {
  phase.value = 'end'
  prize.value = bank.value * BUNDLE
  if (prize.value >= 250000) playWin()
  else playLose()
  if (!recorded.value) {
    recorded.value = true
    addRecord({
      ts: Date.now(),
      game: 'drop',
      prize: prize.value,
      note: `${QUESTION_COUNT} 题闯关 · 幸存 ${bank.value} 捆`
    })
    emit('finished')
  }
}

onBeforeUnmount(stopTimers)
</script>

<template>
  <div class="drop">
    <div v-if="phase === 'idle'" class="drop-intro">
      <p class="drop-headline">💰 $1,000,000 现金摆在桌上</p>
      <p class="drop-desc">
        40 捆 × $25,000 的现金，4 道四选一常识题。每题把现金捆压到你认为正确的机关门上——
        答案揭晓时，错误门上的现金当场坠落，<b>没放上桌的现金也会一并被收走</b>。
        四题过后，桌上剩多少，你就带走多少。
      </p>
      <div class="drop-start">
        <button class="btn primary big" @click="start">开始闯关</button>
        <label class="timing-toggle">
          <input type="checkbox" :checked="timing" @change="toggleTiming" />
          每题 60 秒倒计时（更有美秀内味儿）
        </label>
      </div>
    </div>

    <template v-else>
      <div class="drop-hud">
        <div class="hud-cell">
          <span class="hud-label">题目</span>
          <span class="hud-value">第 {{ qIdx + 1 }} / {{ QUESTION_COUNT }} 题</span>
        </div>
        <div class="hud-cell gold">
          <span class="hud-label">桌上现金</span>
          <span class="hud-value">{{ fmt(bankMoney) }}</span>
        </div>
        <div class="hud-cell" :class="{ warn: hand > 0 }">
          <span class="hud-label">手里未上桌</span>
          <span class="hud-value">{{ hand }} 捆 · {{ fmt(hand * BUNDLE) }}</span>
        </div>
        <div v-if="timing && phase === 'place'" class="hud-cell">
          <span class="hud-label">倒计时</span>
          <span class="hud-value">{{ timeLeft }}s</span>
        </div>
      </div>

      <div v-if="timing && phase === 'place'" class="timebar">
        <i :style="{ width: (timeLeft / TIME_LIMIT) * 100 + '%' }"></i>
      </div>

      <div v-if="current" class="question">
        <p class="q-text">{{ current.q }}</p>

        <div v-if="phase === 'place'" class="drop-actions">
          <p v-if="lockWarn" class="lock-warn">
            手里还有 {{ hand }} 捆（{{ fmt(hand * BUNDLE) }}）——锁定后会被直接收走！再点一次确认。
          </p>
          <p v-else-if="hand > 0" class="lock-hint">点机关门放一捆 $25,000 · 没上桌的钱锁定后会被收走</p>
          <p v-else class="lock-hint safe">全部现金已上桌——可以放心开闸</p>
          <button class="btn primary big" @click="lockClick">锁定答案，开闸！</button>
        </div>

        <div class="doors">
          <div
            v-for="(opt, i) in current.opts"
            :key="i"
            class="door"
            :class="{
              right: phase === 'reveal' && i === current.a,
              wrong: phase === 'reveal' && i !== current.a && stacks[i] > 0,
              blank: phase === 'reveal' && i !== current.a && stacks[i] === 0,
              clickable: phase === 'place'
            }"
            @click="place(i)"
          >
            <span class="door-tag">{{ String.fromCharCode(65 + i) }}</span>
            <span class="door-label">{{ opt }}</span>
            <div class="door-money">
              <div class="chips" :class="{ fall: phase === 'reveal' && i !== current.a && stacks[i] > 0 }">
                <span v-for="n in Math.min(stacks[i], 8)" :key="n" class="cash">$25K</span>
                <b v-if="stacks[i] > 8" class="more">+{{ stacks[i] - 8 }}</b>
              </div>
              <span v-if="stacks[i]" class="stack-amount">{{ fmt(stacks[i] * BUNDLE) }}</span>
              <span v-else class="stack-empty">未押注</span>
            </div>
            <button
              v-if="phase === 'place' && stacks[i] > 0"
              class="door-minus"
              title="取回一捆"
              @click.stop="takeBack(i)"
            >−</button>
          </div>
        </div>
      </div>

      <div v-if="phase === 'reveal' && current" class="drop-verdict">
        <p v-if="stacks[current.a] > 0" class="verdict-good">
          正确答案：{{ current.opts[current.a] }} —— 门上 {{ fmt(stacks[current.a] * BUNDLE) }} 保住了！
        </p>
        <p v-else class="verdict-bad">
          正确答案是「{{ current.opts[current.a] }}」，桌上现金全部坠落……
        </p>
      </div>

      <div v-if="phase === 'end'" class="drop-end stage">
        <p class="final-prize">{{ fmt(prize) }}</p>
        <p class="stage-line">{{ prize > 0 ? `你从 ${QUESTION_COUNT} 道题里守住了这笔奖金！` : '一捆都没保住——被机关门吞得干干净净。' }}</p>
        <ul class="recap">
          <li v-for="(r, i) in recap" :key="i">
            <span class="recap-q">第{{ i + 1 }}题 · {{ r.q }}</span>
            <span class="recap-a">
              答案「{{ r.correct }}」 · 保住 {{ fmt(r.kept * BUNDLE) }}<template v-if="r.dropped"> · 坠落 {{ fmt(r.dropped) }}</template>
            </span>
          </li>
        </ul>
        <div class="stage-btns">
          <button class="btn primary big" @click="start">再来一局</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.drop-intro {
  text-align: center;
  padding: 26px 16px;
  border: 1px dashed rgba(245, 197, 66, 0.4);
  border-radius: 16px;
  background: rgba(245, 197, 66, 0.05);
}
.drop-headline {
  font-size: clamp(22px, 4vw, 32px);
  font-weight: 900;
  color: #ffd968;
  margin: 0 0 10px;
}
.drop-desc {
  max-width: 620px;
  margin: 0 auto 18px;
  line-height: 1.8;
  color: #cfd4e4;
}
.drop-desc b {
  color: #ff9d7a;
}
.drop-start {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
}
.timing-toggle {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  color: #9aa3bd;
  cursor: pointer;
}
.drop-hud {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
}
.timebar {
  height: 8px;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  margin-bottom: 14px;
}
.timebar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #f5c542, #ef6c4d);
  transition: width 1s linear;
}
.q-text {
  font-size: clamp(17px, 2.6vw, 22px);
  font-weight: 700;
  text-align: center;
  margin: 6px 0 16px;
}
.doors {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}
.door {
  position: relative;
  overflow: hidden;
  border-radius: 14px;
  padding: 14px 16px 12px;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(180deg, #1b2340, #141a30);
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
}
.door.clickable {
  cursor: pointer;
}
.door.clickable:hover {
  border-color: rgba(245, 197, 66, 0.6);
}
.door.right {
  border-color: #4ade80;
  background: linear-gradient(180deg, #12301f, #0e2117);
  box-shadow: 0 0 24px rgba(74, 222, 128, 0.3);
}
.door.wrong {
  border-color: #f87171;
  background: linear-gradient(180deg, #331419, #220d10);
}
.door.blank {
  opacity: 0.4;
}
.door-tag {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  font-size: 12px;
  font-weight: 800;
  color: #9aa3bd;
}
.door-label {
  font-size: 16px;
  font-weight: 700;
  padding-right: 30px;
}
.door-money {
  margin-top: auto;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-height: 22px;
  margin-bottom: 6px;
}
.cash {
  background: linear-gradient(180deg, #7fd67f, #3f9d4e);
  color: #0b2a12;
  font-size: 11px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}
.chips .more {
  color: #7fd67f;
  font-size: 12px;
  align-self: center;
}
.chips.fall .cash {
  animation: chip-fall 0.65s ease-in forwards;
}
@keyframes chip-fall {
  to {
    transform: translateY(120px) rotate(10deg);
    opacity: 0;
  }
}
.stack-amount {
  color: #ffd968;
  font-weight: 800;
}
.stack-empty {
  color: #6d7590;
  font-size: 12px;
}
.door-minus {
  position: absolute;
  left: 12px;
  bottom: 10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #e8e2cf;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}
.door-minus:hover {
  background: rgba(255, 255, 255, 0.18);
}
.drop-actions {
  text-align: center;
  margin: 2px 0 14px;
}
.lock-hint {
  font-size: 13px;
  color: #9aa3bd;
  margin: 0 0 10px;
}
.lock-hint.safe {
  color: #7fd67f;
}
.lock-warn {
  font-size: 14px;
  font-weight: 700;
  color: #ff9d7a;
  margin: 0 0 10px;
}
.drop-verdict {
  text-align: center;
  margin-top: 14px;
}
.verdict-good,
.verdict-bad {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
}
.verdict-good {
  color: #7fd67f;
}
.verdict-bad {
  color: #ff9d7a;
}
.recap {
  list-style: none;
  margin: 12px auto 0;
  padding: 0;
  max-width: 620px;
  text-align: left;
}
.recap li {
  padding: 7px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.recap-q {
  font-size: 14px;
  color: #e8e2cf;
}
.recap-a {
  font-size: 12px;
  color: #9aa3bd;
}
</style>
