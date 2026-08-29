<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { CASE_VALUES, ROUND_PLAN, bankerOffer, buildCases, formatMoney } from '../utils/deal-engine.js'
import { addRecord } from '../utils/records.js'
import { playCaseFlip, playDealHammer, playLose, playRing, playWin } from '../utils/sound.js'

const emit = defineEmits(['finished'])
const fmt = formatMoney
const LOW_RAIL = CASE_VALUES.slice(0, 13)
const HIGH_RAIL = [...CASE_VALUES.slice(13)].reverse()

const cases = ref([])
const myCaseId = ref(null)
// pick 选箱 | open 开箱 | offer 报价 | swap 换箱 | hypo 已成交假想 | reveal 揭晓 | end 终局
const phase = ref('pick')
const roundIdx = ref(0)
const openedInRound = ref(0)
const offer = ref(0)
const offerShown = ref(false)
const dealt = ref(null)
const offerLog = ref([])
const swapped = ref(false)
const prize = ref(0)
const endText = ref('')
const recorded = ref(false)
let ringTimer = null
let revealTimer = null

const toOpen = computed(() => ROUND_PLAN[Math.min(roundIdx.value, ROUND_PLAN.length - 1)])
const remaining = computed(() => cases.value.filter(c => !c.opened))
const myCase = computed(() => cases.value.find(c => c.id === myCaseId.value) || null)
const otherCase = computed(() => remaining.value.find(c => c.id !== myCaseId.value) || null)
const ev = computed(() => {
  const rs = remaining.value
  return rs.length ? rs.reduce((s, c) => s + c.value, 0) / rs.length : 0
})
const openedValues = computed(() => new Set(cases.value.filter(c => c.opened).map(c => c.value)))

const phaseText = computed(() => {
  switch (phase.value) {
    case 'pick': return '选一只属于你的箱子'
    case 'open': return `本轮还要开 ${toOpen.value - openedInRound.value} 只`
    case 'offer': return '银行家来电……'
    case 'swap': return '最后的换箱抉择'
    case 'hypo': return '已成交 · 假想继续'
    case 'reveal': return '揭晓时刻……'
    case 'end': return '本局结束'
  }
  return ''
})

const stageHint = computed(() => {
  switch (phase.value) {
    case 'pick': return '26 只箱子里藏着 $0.01 – $1,000,000。先选一只「你的箱子」，它的金额要到最后一刻才揭晓。'
    case 'open': return `本轮要开 ${toOpen.value} 只箱子，已开 ${openedInRound.value} 只——每轮开完银行家都会来电报价。`
    case 'reveal': return '命运之箱缓缓打开……'
  }
  return ''
})

function pickable(c) {
  return phase.value === 'pick' && !c.opened
}

function canOpen(c) {
  return (phase.value === 'open' || phase.value === 'hypo') && !c.opened && c.id !== myCaseId.value
}

function onCase(c) {
  if (pickable(c)) {
    myCaseId.value = c.id
    phase.value = 'open'
    playCaseFlip()
    return
  }
  if (!canOpen(c)) return
  c.opened = true
  openedInRound.value++
  playCaseFlip()
  if (openedInRound.value < toOpen.value) return
  if (phase.value === 'hypo') {
    if (remaining.value.length <= 2) {
      toReveal()
    } else {
      roundIdx.value++
      openedInRound.value = 0
    }
  } else {
    bankerCall()
  }
}

function bankerCall() {
  phase.value = 'offer'
  offerShown.value = false
  offer.value = bankerOffer(remaining.value.map(c => c.value), offerLog.value.length)
  playRing()
  clearTimeout(ringTimer)
  ringTimer = setTimeout(() => { offerShown.value = true }, 1000)
}

function acceptDeal() {
  offerLog.value.push({ round: roundIdx.value + 1, amount: offer.value, action: '成交' })
  dealt.value = offer.value
  playDealHammer()
  if (remaining.value.length <= 2) {
    toReveal()
    return
  }
  phase.value = 'hypo'
  roundIdx.value++
  openedInRound.value = 0
}

function rejectDeal() {
  offerLog.value.push({ round: roundIdx.value + 1, amount: offer.value, action: '拒绝' })
  if (roundIdx.value >= ROUND_PLAN.length - 1) {
    phase.value = 'swap'
  } else {
    roundIdx.value++
    openedInRound.value = 0
    phase.value = 'open'
  }
}

function chooseSwap(doSwap) {
  if (doSwap && otherCase.value) {
    myCaseId.value = otherCase.value.id
    swapped.value = true
  }
  toReveal()
}

// 成交后不想慢慢看：一口气开到只剩两只再揭晓
function fastForward() {
  const others = remaining.value.filter(c => c.id !== myCaseId.value)
  others.slice(0, others.length - 1).forEach(c => { c.opened = true })
  toReveal()
}

function toReveal() {
  clearTimeout(ringTimer)
  const mine = myCase.value
  const other = otherCase.value
  if (mine && !mine.opened) mine.opened = true
  if (other && !other.opened) other.opened = true
  phase.value = 'reveal'
  clearTimeout(revealTimer)
  revealTimer = setTimeout(finish, 1500)
}

function finish() {
  const mine = myCase.value
  if (!mine) return
  const boxValue = mine.value
  prize.value = dealt.value != null ? dealt.value : boxValue
  phase.value = 'end'
  const beat = dealt.value != null ? boxValue > dealt.value : prize.value >= 100000
  if (beat) playWin()
  else playLose()
  endText.value = dealt.value != null
    ? (boxValue > dealt.value
        ? `箱子里其实是 ${fmt(boxValue)}——银行家赌赢了，比成交价多的 ${fmt(boxValue - dealt.value)} 留在了台上。`
        : `箱子里只有 ${fmt(boxValue)}——你比银行家的报价多拿了 ${fmt(dealt.value - boxValue)}，成交就是胜利！`)
    : `${swapped.value ? '换箱之后' : '坚守原箱'}，你带着 ${fmt(prize.value)} 离开舞台。`
  if (!recorded.value) {
    recorded.value = true
    addRecord({
      ts: Date.now(),
      game: 'deal',
      prize: prize.value,
      note: dealt.value != null
        ? `第${offerLog.value.length}轮成交 · 箱内 ${fmt(boxValue)}`
        : `${swapped.value ? '换箱揭晓' : '原箱揭晓'} · 箱内 ${fmt(boxValue)}`
    })
    emit('finished')
  }
}

function reset() {
  clearTimeout(ringTimer)
  clearTimeout(revealTimer)
  cases.value = buildCases()
  myCaseId.value = null
  phase.value = 'pick'
  roundIdx.value = 0
  openedInRound.value = 0
  offer.value = 0
  offerShown.value = false
  dealt.value = null
  offerLog.value = []
  swapped.value = false
  prize.value = 0
  endText.value = ''
  recorded.value = false
}

reset()

onBeforeUnmount(() => {
  clearTimeout(ringTimer)
  clearTimeout(revealTimer)
})
</script>

<template>
  <div class="deal">
    <div class="deal-hud">
      <div class="hud-cell">
        <span class="hud-label">阶段</span>
        <span class="hud-value">{{ phaseText }}</span>
      </div>
      <div class="hud-cell">
        <span class="hud-label">我的箱子</span>
        <span class="hud-value">{{ myCase ? '#' + myCase.id : '—' }}</span>
      </div>
      <div class="hud-cell" :class="{ gold: dealt != null || phase === 'end' }">
        <span class="hud-label">{{ dealt != null ? '成交奖金' : phase === 'end' ? '最终奖金' : '潜在头奖' }}</span>
        <span class="hud-value">{{ dealt != null ? fmt(dealt) : phase === 'end' ? fmt(prize) : '$1,000,000' }}</span>
      </div>
      <button class="btn ghost hud-reset" @click="reset">重新开局</button>
    </div>

    <section v-if="phase === 'offer'" class="stage">
      <span class="phone">☎️</span>
      <template v-if="offerShown">
        <p class="stage-line">银行家开价——</p>
        <p class="offer">{{ fmt(offer) }}</p>
        <p class="stage-sub">剩余期望值 ≈ {{ fmt(ev) }} · 已拒绝 {{ offerLog.filter(o => o.action === '拒绝').length }} 次报价</p>
        <div class="stage-btns">
          <button class="btn primary big" @click="acceptDeal">DEAL！成交</button>
          <button class="btn danger big" @click="rejectDeal">NO DEAL！继续</button>
        </div>
      </template>
      <p v-else class="stage-line">铃铃铃……银行家正在拨号……</p>
    </section>

    <section v-else-if="phase === 'swap' && myCase && otherCase" class="stage">
      <p class="stage-line">只剩两只箱子：你的 <b class="gold">#{{ myCase.id }}</b> 和 <b class="gold">#{{ otherCase.id }}</b>。</p>
      <p class="stage-sub">银行家允许你最后换一次——命运的箱子，换还是不换？</p>
      <div class="stage-btns">
        <button class="btn primary big" @click="chooseSwap(false)">留下 #{{ myCase.id }}</button>
        <button class="btn secondary big" @click="chooseSwap(true)">换成 #{{ otherCase.id }}</button>
      </div>
    </section>

    <section v-else-if="phase === 'hypo'" class="stage compact">
      <p class="stage-line">已以 <b class="gold">{{ fmt(dealt) }}</b> 成交 · 剩下的箱子照开，看看你是赚是亏</p>
      <p class="stage-sub">本轮还要开 {{ toOpen - openedInRound }} 只</p>
      <div class="stage-btns">
        <button class="btn ghost" @click="fastForward">跳过，直接揭晓</button>
      </div>
    </section>

    <section v-else-if="phase === 'end'" class="stage">
      <p class="final-prize">{{ fmt(prize) }}</p>
      <p class="stage-line">{{ endText }}</p>
      <ul v-if="offerLog.length" class="offer-log">
        <li v-for="(o, i) in offerLog" :key="i" :class="{ taken: o.action === '成交' }">
          第{{ o.round }}轮报价 {{ fmt(o.amount) }} —— {{ o.action }}
        </li>
      </ul>
      <div class="stage-btns">
        <button class="btn primary big" @click="reset">再来一局</button>
      </div>
    </section>

    <section v-else class="stage compact">
      <p class="stage-line">{{ stageHint }}</p>
      <p v-if="phase === 'open'" class="stage-sub">拿稳现金，还是赌那只没开的箱子？</p>
    </section>

    <div class="deal-table">
      <div class="rail rail-low">
        <span v-for="v in LOW_RAIL" :key="'l' + v" class="chip" :class="{ out: openedValues.has(v) }">{{ fmt(v) }}</span>
      </div>

      <div class="board">
        <button
          v-for="c in cases"
          :key="c.id"
          class="case"
          :class="{
            open: c.opened,
            mine: myCase && c.id === myCase.id && !c.opened,
            pickable: pickable(c),
            hot: (phase === 'swap' || phase === 'reveal') && (c.id === (myCase && myCase.id) || c.id === (otherCase && otherCase.id))
          }"
          :disabled="!(pickable(c) || canOpen(c))"
          @click="onCase(c)"
        >
          <span class="case-inner">
            <span class="case-face front">
              <b>{{ c.id }}</b>
              <i v-if="myCase && c.id === myCase.id">我的</i>
            </span>
            <!-- 背面金额对读屏/DOM 快照隐藏，避免剧透；仅靠 3D 翻面在视觉上揭示 -->
            <span class="case-face back" :class="c.value >= 1000 ? 'big' : 'small'" aria-hidden="true">{{ fmt(c.value) }}</span>
          </span>
        </button>
      </div>

      <div class="rail rail-high">
        <span v-for="v in HIGH_RAIL" :key="'h' + v" class="chip" :class="{ out: openedValues.has(v) }">{{ fmt(v) }}</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.deal-hud {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 14px;
}
.hud-reset {
  margin-left: auto;
}
.deal-table {
  display: flex;
  gap: 14px;
  align-items: stretch;
  margin-top: 16px;
}
.rail {
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}
.chip {
  font-size: 13px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 8px;
  text-align: right;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  transition: opacity 0.3s;
}
.chip:not(.out) {
  color: #9fe0ff;
}
.rail-high .chip:not(.out) {
  color: #ffd968;
}
.chip.out {
  opacity: 0.28;
  text-decoration: line-through;
}
.board {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  gap: 10px;
  align-content: start;
}
.case {
  position: relative;
  perspective: 600px;
  aspect-ratio: 1 / 1.08;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}
.case:disabled {
  cursor: default;
}
.case-inner {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0.1, 0.3, 1);
}
.case.open .case-inner {
  transform: rotateY(180deg);
}
.case-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.case-face.front {
  background: linear-gradient(160deg, #2a3560, #1a2142);
  color: #f2ecdc;
  font-size: 22px;
}
.case-face.front b {
  font-size: 24px;
}
.case-face.front i {
  font-style: normal;
  font-size: 11px;
  color: #ffd968;
  letter-spacing: 0.1em;
}
.case-face.back {
  transform: rotateY(180deg);
  font-weight: 800;
  font-size: 15px;
}
.case-face.back.small {
  background: linear-gradient(160deg, #14304a, #0d1f33);
  color: #9fe0ff;
}
.case-face.back.big {
  background: linear-gradient(160deg, #4a3410, #2c1e08);
  color: #ffd968;
  font-size: 14px;
}
.case.pickable:not(:disabled):hover .case-face.front,
.case.open {
  border-color: rgba(245, 197, 66, 0.55);
}
.case.pickable:not(:disabled):hover .case-face.front {
  background: linear-gradient(160deg, #35427a, #232b56);
}
.case.mine .case-face.front {
  border-color: #f5c542;
  box-shadow: 0 0 16px rgba(245, 197, 66, 0.4);
}
.case.hot .case-face {
  border-color: #f5c542;
  box-shadow: 0 0 18px rgba(245, 197, 66, 0.35);
}
.offer {
  font-size: clamp(34px, 6vw, 52px);
  font-weight: 900;
  color: #ffd968;
  margin: 2px 0;
  text-shadow: 0 0 26px rgba(245, 197, 66, 0.4);
}
.phone {
  display: inline-block;
  font-size: 44px;
  animation: gs-shake 0.5s ease-in-out infinite;
}
.offer-log {
  list-style: none;
  margin: 12px auto 0;
  padding: 0;
  max-width: 420px;
  max-height: 180px;
  overflow: auto;
  text-align: left;
}
.offer-log li {
  font-size: 13px;
  color: #9aa3bd;
  padding: 3px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
}
.offer-log li.taken {
  color: #ffd968;
  font-weight: 700;
}
@media (max-width: 980px) {
  .deal-table {
    flex-direction: column;
  }
  .rail {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .rail:first-child {
    order: 0;
  }
  .board {
    order: 1;
  }
  .rail:last-child {
    order: 2;
  }
  .chip {
    text-align: center;
  }
}
</style>
