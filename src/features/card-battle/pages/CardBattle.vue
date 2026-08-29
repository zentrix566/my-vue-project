<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { createGame, revealCard, resolveRound } from '../utils/engine.js'
import { isMuted, playFlip, playResolve, toggleMuted } from '../utils/sound.js'
import PlayingCard from '../components/PlayingCard.vue'

const game = reactive(createGame())
const auto = ref(false)
const speed = ref('middle')
const resolving = ref(false)
const soundOn = ref(!isMuted())
let timer = null
let resolveTimer = null

const SPEEDS = { slow: 1400, middle: 900, fast: 550 }
const RESOLVE_BEAT = 520 // 第二张翻开后的定格时长，吊足胃口再弹出结果

const canFlip = computed(() => !game.over && !game.awaitResolve && !resolving.value)

const prompt = computed(() => {
  if (game.over) return '终局'
  if (resolving.value || game.awaitResolve) return '结算中…'
  return `轮到${game.currentSide === 'red' ? '红队' : '蓝队'}翻牌`
})

const leftCount = (side) => game.decks[side].length
const meterPct = (side) => (leftCount(side) / 27) * 100 + '%'
const teamActive = (side) => !game.over && !game.awaitResolve && !resolving.value && game.currentSide === side

// 战报倒序展示：最新一轮永远在最上面
const displayRounds = computed(() => game.rounds.map((round, i) => ({ round, no: i + 1 })).reverse())
const winnerName = computed(() => (game.winner === 'red' ? '红队' : '蓝队'))

function toneOf(round, side) {
  if (!round.result) return 'neutral'
  if (round.result === 'tie') return 'dead'
  return round.result === side ? 'win' : 'dead'
}

function chipText(round) {
  if (round.result === 'tie') return '平局 · 双弃'
  const winner = round[round.result]
  const loser = round[round.result === 'red' ? 'blue' : 'red']
  const text = `${winner.label} 吃 ${loser.label}`
  return round.upset ? `🔥 以下克上！${text}` : text
}

function flip() {
  if (!canFlip.value) return
  if (!revealCard(game)) return
  playFlip()
  if (game.awaitResolve) {
    resolving.value = true
    resolveTimer = setTimeout(() => {
      const round = resolveRound(game)
      resolving.value = false
      if (round) playResolve(round.upset)
    }, RESOLVE_BEAT)
  }
}

function toggleSound() {
  soundOn.value = toggleMuted()
  if (soundOn.value) playFlip() // 重新开启时给一声反馈
}

function toggleAuto() {
  auto.value ? stopAuto() : startAuto()
}

function startAuto() {
  auto.value = true
  timer = setInterval(() => {
    if (game.over) {
      stopAuto()
      return
    }
    flip()
  }, SPEEDS[speed.value])
}

function stopAuto() {
  auto.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(speed, () => {
  if (auto.value) {
    stopAuto()
    startAuto()
  }
})

watch(
  () => game.over,
  (over) => {
    if (over) stopAuto()
  }
)

function restart() {
  stopAuto()
  clearTimeout(resolveTimer)
  resolving.value = false
  Object.assign(game, createGame())
}

onBeforeUnmount(() => {
  stopAuto()
  clearTimeout(resolveTimer)
})
</script>

<template>
  <div class="page cb-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">🃏 纸牌对战 · 以小胜大</h1>
    <p class="subtitle">
      一副 54 张牌洗乱后平分红蓝两队、背面朝上，逐张翻开捉对比大小：大牌吃小牌，
      A、2、3 却能反杀 J/Q/K 和大小王；输的弃掉、赢的回堆再战，一方翻光即负。
    </p>

    <div class="topbar card">
      <div class="team red" :class="{ active: teamActive('red') }">
        <div class="team-head">
          <span class="team-name">红队</span>
          <span v-if="teamActive('red')" class="turn-tag">▸ 翻牌中</span>
        </div>
        <div class="deck-num"><b>{{ leftCount('red') }}</b><span>张待翻</span></div>
        <div class="meter"><i :style="{ width: meterPct('red') }"></i></div>
        <div class="team-tags">
          <span>吃子 {{ game.stats.redCaptured }}</span>
          <span>阵亡 {{ game.stats.blueCaptured }}</span>
        </div>
      </div>

      <div class="console">
        <div class="round-line">第 <b>{{ game.rounds.length }}</b> 轮 · {{ prompt }}</div>
        <div class="ctrl-row">
          <button class="btn primary" :disabled="!canFlip" @click="flip">🎴 翻一张</button>
          <button class="btn" :class="{ danger: auto }" :disabled="game.over && !auto" @click="toggleAuto">
            {{ auto ? '⏸ 停止自动' : '▶ 自动对战' }}
          </button>
          <select v-model="speed" class="speed" :disabled="!auto">
            <option value="slow">慢速</option>
            <option value="middle">中速</option>
            <option value="fast">快速</option>
          </select>
          <button class="btn ghost" @click="toggleSound">{{ soundOn ? '🔊 音效开' : '🔇 已静音' }}</button>
          <button class="btn ghost" @click="restart">↻ 重新开局</button>
        </div>
      </div>

      <div class="team blue" :class="{ active: teamActive('blue') }">
        <div class="team-head">
          <span class="team-name">蓝队</span>
          <span v-if="teamActive('blue')" class="turn-tag">▸ 翻牌中</span>
        </div>
        <div class="deck-num"><b>{{ leftCount('blue') }}</b><span>张待翻</span></div>
        <div class="meter"><i :style="{ width: meterPct('blue') }"></i></div>
        <div class="team-tags">
          <span>吃子 {{ game.stats.blueCaptured }}</span>
          <span>阵亡 {{ game.stats.redCaptured }}</span>
        </div>
      </div>
    </div>

    <div v-if="game.over" class="verdict card" :class="game.winner">
      <div class="verdict-top">
        <span class="verdict-main">
          <template v-if="game.winner === 'draw'">🤝 平局收场——两队同时翻光了！</template>
          <template v-else-if="game.winner === 'red'">🏆 红队获胜！</template>
          <template v-else>🏆 蓝队获胜！</template>
        </span>
        <span class="verdict-sub">
          共 {{ game.rounds.length }} 轮 · 红吃 {{ game.stats.redCaptured }} 张 · 蓝吃 {{ game.stats.blueCaptured }} 张 ·
          以下克上 {{ game.stats.upsets }} 次
        </span>
        <button class="btn primary" @click="restart">再来一局</button>
      </div>
      <div v-if="game.winner !== 'draw'" class="survivors">
        <span class="survivors-label">🛡️ {{ winnerName }}存活 {{ leftCount(game.winner) }} 张</span>
        <div class="survivor-cards">
          <PlayingCard v-for="card in game.decks[game.winner]" :key="card.id" :card="card" :side="game.winner" />
        </div>
      </div>
    </div>

    <div class="board card">
      <div class="log-head">
        <span class="lh red">🟥 红队</span>
        <span class="lh mid">结果</span>
        <span class="lh blue">蓝队 🟦</span>
      </div>
      <div class="log">
        <div
          v-for="item in displayRounds"
          :key="item.no"
          class="row"
          :class="{ latest: item.no === game.rounds.length }"
        >
          <span class="idx">{{ item.no }}</span>
          <div class="cell red-cell"><PlayingCard :card="item.round.red" :tone="toneOf(item.round, 'red')" side="red" /></div>
          <div class="chip-slot">
            <span v-if="item.round.result" class="chip" :class="[item.round.result, { upset: item.round.upset }]">{{ chipText(item.round) }}</span>
            <span v-else-if="item.round.red && item.round.blue" class="chip pending">…</span>
          </div>
          <div class="cell blue-cell"><PlayingCard :card="item.round.blue" :tone="toneOf(item.round, 'blue')" side="blue" /></div>
        </div>
        <div v-if="!game.rounds.length" class="log-empty">点「🎴 翻一张」揭开第一张牌…</div>
      </div>
    </div>

    <details class="rules card">
      <summary>📜 规则说明（点开查看）</summary>
      <ul>
        <li><b>发牌</b>：54 张牌（A–K 四花色 + 小王 + 大王）洗乱平分，红蓝各 27 张，背面朝上。</li>
        <li>
          <b>比大小</b>：每轮两队各翻一张捉对比拼。普通大小 A &lt; 2 &lt; 3 &lt; … &lt; J &lt; Q &lt; K &lt; 小王 &lt;
          大王，大的吃小的。
        </li>
        <li><b>以小胜大</b>：A、2、3 反过来能吃 J、Q、K、小王、大王（但遇到 4–10 仍算小牌，会被吃掉）。</li>
        <li><b>结算</b>：输的牌盖「弃」印退出战场；赢的牌压回本队牌堆底部，之后还会再翻出来出战；同点平局两张一起弃。</li>
        <li><b>胜负</b>：一队没牌可翻即告负，另一队获胜；两家同时翻光算平局。</li>
        <li><b>节奏</b>：红蓝逐张交替先翻，最新一轮置顶展示；可以手动一张张揭，也可以开自动对战三档变速看全程，右上角可开关音效。</li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.cb-page {
  --cb-card-w: 66px;
}

.topbar {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 360px) 1fr;
  gap: 14px;
  align-items: stretch;
  padding: 16px;
}

.team {
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  transition: box-shadow 0.25s ease;
}

.team.red {
  box-shadow: inset 0 3px 0 #d4452f;
}

.team.blue {
  box-shadow: inset 0 3px 0 var(--primary);
}

.team.red.active {
  box-shadow: inset 0 3px 0 #d4452f, 0 0 0 3px rgba(212, 69, 47, 0.22);
}

.team.blue.active {
  box-shadow: inset 0 3px 0 var(--primary), 0 0 0 3px rgba(47, 111, 237, 0.22);
}

.team-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.team-name {
  font-size: 1.05rem;
  font-weight: 800;
}

.team.red .team-name {
  color: #d4452f;
}

.team.blue .team-name {
  color: var(--primary);
}

.turn-tag {
  font-size: 12px;
  color: var(--muted);
  animation: blink 1.1s ease infinite;
}

.deck-num {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0;
}

.deck-num b {
  font-size: 1.9rem;
  line-height: 1;
}

.deck-num span {
  font-size: 12px;
  color: var(--muted);
}

.meter {
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--surface-soft);
  overflow: hidden;
}

.meter i {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.4s ease;
}

.team.red .meter i {
  background: #d4452f;
}

.team.blue .meter i {
  background: var(--primary);
}

.team-tags {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--muted);
}

.console {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.round-line {
  text-align: center;
  font-weight: 700;
  color: var(--text);
}

.round-line b {
  color: var(--warm);
  font-size: 1.4rem;
}

.ctrl-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.speed {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 0 8px;
}

/* 终局横幅 */
.verdict {
  margin-top: 14px;
  padding: 14px 18px;
  animation: drop 0.4s ease;
}

.verdict-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.verdict.red {
  border-color: rgba(212, 69, 47, 0.45);
  background: linear-gradient(90deg, var(--danger-soft), var(--surface));
}

.verdict.blue {
  border-color: rgba(47, 111, 237, 0.45);
  background: linear-gradient(90deg, var(--primary-soft), var(--surface));
}

.verdict.draw {
  border-color: var(--line);
}

.verdict-main {
  font-size: 1.25rem;
  font-weight: 800;
}

.verdict-sub {
  font-size: 13px;
  color: var(--muted);
}

.verdict .btn {
  margin-left: auto;
}

/* 幸存手牌 */
.survivors {
  --cb-card-w: 44px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--line);
}

.survivors-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
}

.survivor-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 战报：两列对决 */
.board {
  margin-top: 14px;
  padding: 0;
  overflow: hidden;
}

.log-head,
.row {
  display: grid;
  grid-template-columns: 30px 1fr 132px 1fr;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
}

.log-head {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
  padding-top: 12px;
  padding-bottom: 12px;
  font-size: 13px;
  font-weight: 800;
}

.lh.red {
  grid-column: 2;
  justify-self: end;
  color: #d4452f;
}

.lh.mid {
  grid-column: 3;
  justify-self: center;
  color: var(--muted);
  font-weight: 500;
}

.lh.blue {
  grid-column: 4;
  justify-self: start;
  color: var(--primary);
}

.log {
  max-height: 440px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.row {
  border-bottom: 1px dashed var(--line);
}

.row.latest {
  background: linear-gradient(90deg, rgba(212, 69, 47, 0.05), rgba(47, 111, 237, 0.05));
}

.idx {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
}

.cell.red-cell {
  justify-self: end;
}

.cell.blue-cell {
  justify-self: start;
}

.chip-slot {
  text-align: center;
}

.chip {
  display: inline-block;
  max-width: 128px;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--line);
  background: var(--surface-soft);
  font-size: 12px;
  font-weight: 700;
  animation: pop 0.25s ease;
}

.chip.red {
  color: #d4452f;
  background: var(--danger-soft);
  border-color: transparent;
}

.chip.blue {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: transparent;
}

.chip.tie {
  color: var(--muted);
}

.chip.pending {
  color: var(--muted);
  animation: none;
}

.chip.upset {
  background: #fef3c7;
  color: #b45309;
  animation: pop 0.25s ease, shake 0.45s ease 0.12s;
}

.log-empty {
  padding: 36px 0;
  text-align: center;
  color: var(--muted);
}

/* 规则说明 */
.rules {
  margin-top: 14px;
  font-size: 14px;
}

.rules summary {
  cursor: pointer;
  font-weight: 700;
}

.rules ul {
  margin: 10px 0 0;
  padding-left: 20px;
}

.rules li {
  margin: 4px 0;
}

.rules b {
  color: var(--primary);
}

@keyframes blink {
  50% {
    opacity: 0.35;
  }
}

@keyframes pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
}

@keyframes shake {
  25% {
    transform: translateX(-3px) rotate(-2deg);
  }
  50% {
    transform: translateX(3px) rotate(2deg);
  }
  75% {
    transform: translateX(-2px);
  }
}

@keyframes drop {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
}

@media (max-width: 760px) {
  .cb-page {
    --cb-card-w: 52px;
  }

  .topbar {
    grid-template-columns: 1fr;
  }

  .log-head,
  .row {
    grid-template-columns: 22px 1fr 96px 1fr;
    padding-left: 8px;
    padding-right: 8px;
  }

  .chip {
    max-width: 94px;
    font-size: 11px;
  }

  .verdict .btn {
    margin-left: 0;
  }
}
</style>
