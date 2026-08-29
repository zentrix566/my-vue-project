<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  ANIMALS, BLUE, COLS, DENS, RED, applyMove, chooseAIMove, createGame,
  denOwner, genAllMoves, isRiver, other, rankOf, sideOf, trapOwner,
} from '../utils/engine.js'
import { isMuted, playCapture, playJump, playLose, playSplash, playStep, playUpset, playWin, toggleMuted } from '../utils/sound.js'

const game = reactive(createGame())
const history = ref([])
const mode = ref('ai') // 'ai' 人机 / 'hotseat' 双人同屏
const difficulty = ref('normal')
const selected = ref(null)
const busy = ref(false) // 电脑思考中
const soundOn = ref(!isMuted())
let aiTimer = null

const humanTurn = computed(() => !game.over && !busy.value && (mode.value === 'hotseat' || game.turn === RED))

const statusText = computed(() => {
  if (game.over) return '终局'
  if (busy.value) return '蓝方思考中…'
  if (mode.value === 'ai') return '轮到你（红方）走棋'
  return game.turn === RED ? '轮到红方走棋' : '轮到蓝方走棋'
})

const alive = (side) => game.board.filter((code) => code && sideOf(code) === side).length
const alivePct = (side) => (alive(side) / 8) * 100 + '%'
const fallenOf = (side) =>
  game.log.filter((e) => e.captured && sideOf(e.captured) === side).map((e) => ANIMALS[rankOf(e.captured) - 1].emoji)

const legalTargets = computed(() => {
  if (selected.value === null || game.over) return []
  return genAllMoves(game.board, game.turn).filter((m) => m.from === selected.value)
})

// 战报倒序：最新一步永远在最上面
const displayLog = computed(() => game.log.map((e, i) => ({ e, no: i + 1 })).reverse())

const winByText = { den: '攻入兽穴', annihilate: '吃光对方', stuck: '对方无棋可走' }
const winnerName = computed(() => {
  if (game.winner === RED) return mode.value === 'ai' ? '你（红方）' : '红方'
  return mode.value === 'ai' ? '电脑（蓝方）' : '蓝方'
})

function sideLabel(side) {
  if (mode.value === 'hotseat') return side === RED ? '红方（先行）' : '蓝方'
  return side === RED ? '红方 · 玩家' : `蓝方 · 电脑${{ easy: '简单', normal: '普通', hard: '困难' }[difficulty.value]}`
}

function sideActive(side) {
  return !game.over && game.turn === side
}

function cellTerrain(i) {
  const den = denOwner(i)
  if (den) return den === RED ? 'den-red' : 'den-blue'
  const trap = trapOwner(i)
  if (trap) return trap === RED ? 'trap-red' : 'trap-blue'
  if (isRiver(i)) return 'river'
  return 'land'
}

const terrainTag = (i) => (denOwner(i) ? '穴' : trapOwner(i) ? '陷' : '')

const isMark = (i) => !!game.lastMove && (game.lastMove.from === i || game.lastMove.to === i)
const isSelectable = (i) => humanTurn.value && !!game.board[i] && sideOf(game.board[i]) === game.turn

function hintOf(i) {
  if (selected.value === null) return ''
  const mv = legalTargets.value.find((m) => m.to === i)
  if (!mv) return ''
  return mv.captured ? 'hint-capture' : 'hint-empty'
}

const animalOf = (code) => ANIMALS[rankOf(code) - 1]

function snapshot() {
  return JSON.parse(JSON.stringify({ board: game.board, turn: game.turn, over: game.over, winner: game.winner, winBy: game.winBy, lastMove: game.lastMove, log: game.log }))
}

function playEffects(move, mover) {
  if (move.captured) {
    rankOf(move.captured) === 8 && rankOf(mover) === 1 ? playUpset() : playCapture()
  } else if (move.jump) {
    playJump()
  } else if (move.splash) {
    playSplash()
  } else {
    playStep()
  }
}

function doMove(move) {
  history.value.push(snapshot())
  const mover = game.board[move.from]
  applyMove(game, move)
  selected.value = null
  playEffects(move, mover)
  if (game.over) {
    if (mode.value === 'ai' && game.winner === BLUE) playLose()
    else playWin()
    return
  }
  if (mode.value === 'ai' && game.turn === BLUE) scheduleAI()
}

function onCellClick(i) {
  if (!humanTurn.value) return
  if (selected.value !== null) {
    const move = legalTargets.value.find((m) => m.to === i)
    if (move) {
      doMove(move)
      return
    }
  }
  const code = game.board[i]
  if (code && sideOf(code) === game.turn) {
    selected.value = selected.value === i ? null : i
    if (selected.value !== null) playStep()
  } else {
    selected.value = null
  }
}

function scheduleAI() {
  busy.value = true
  aiTimer = setTimeout(() => {
    aiTimer = null
    busy.value = false
    if (game.over || game.turn !== BLUE || mode.value !== 'ai') return
    // 引擎会临时借用棋盘做搜索，传入副本隔离响应式代理
    const move = chooseAIMove(game.board.slice(), difficulty.value, BLUE)
    if (move) doMove(move)
  }, 320)
}

function undo() {
  if (busy.value || !history.value.length) return
  let snap = null
  if (mode.value === 'ai') {
    // 人机模式一次退回「你上一步走棋前」，把电脑的那步一起撤掉
    while (history.value.length) {
      snap = history.value.pop()
      if (snap.turn === RED) break
    }
  } else {
    snap = history.value.pop()
  }
  if (!snap) return
  Object.assign(game, snap)
  selected.value = null
}

function restart() {
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = null
  }
  busy.value = false
  selected.value = null
  history.value = []
  Object.assign(game, createGame())
}

function toggleSound() {
  soundOn.value = toggleMuted()
  if (soundOn.value) playStep()
}

watch(mode, restart)

onBeforeUnmount(() => {
  if (aiTimer) clearTimeout(aiTimer)
})

// 战报文案
function moveText(e) {
  const self = e.side === RED ? '红' : '蓝'
  const foe = e.side === RED ? '蓝' : '红'
  if (e.to === DENS[other(e.side)]) return `攻入${foe}方兽穴！`
  if (e.captured) {
    const upset = e.rank === 1 && rankOf(e.captured) === 8
    return `${e.jump ? '跳河' : ''}吃掉 ${foe}${ANIMALS[rankOf(e.captured) - 1].name}${upset ? '，鼠吃大象！' : ''}`
  }
  if (e.jump) return '一跃过河'
  if (e.splash) return isRiver(e.to) ? '游进河里' : '游上岸'
  return '走了一步'
}
</script>

<template>
  <div class="page jc-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">🐘 斗兽棋 · 鼠吃大象</h1>
    <p class="subtitle">
      童年经典斗兽棋：象狮虎豹狼狗猫鼠八兽捉对比拼，大吃小，小老鼠却能反吃大象；
      狮虎跳河、老鼠下水，攻入对方兽穴即获胜。
    </p>

    <div class="topbar card">
      <div class="side blue" :class="{ active: sideActive(BLUE) }">
        <div class="side-head">
          <span class="side-name">{{ sideLabel(BLUE) }}</span>
          <span v-if="sideActive(BLUE)" class="turn-tag">▸ 走棋中</span>
        </div>
        <div class="alive-num"><b>{{ alive(BLUE) }}</b><span>只存活</span></div>
        <div class="meter"><i :style="{ width: alivePct(BLUE) }"></i></div>
        <div class="fallen">
          <span>阵亡</span>
          <template v-if="fallenOf(BLUE).length"><i v-for="(f, k) in fallenOf(BLUE)" :key="k">{{ f }}</i></template>
          <em v-else>—</em>
        </div>
      </div>

      <div class="console">
        <div class="status-line">{{ statusText }}</div>
        <div class="ctrl-row">
          <select v-model="mode" class="sel">
            <option value="ai">🤖 人机对战</option>
            <option value="hotseat">👥 双人同屏</option>
          </select>
          <select v-if="mode === 'ai'" v-model="difficulty" class="sel">
            <option value="easy">简单</option>
            <option value="normal">普通</option>
            <option value="hard">困难</option>
          </select>
          <button class="btn" :disabled="!history.length || busy" @click="undo">↩ 悔棋</button>
          <button class="btn ghost" @click="restart">↻ 重新开局</button>
          <button class="btn ghost" @click="toggleSound">{{ soundOn ? '🔊 音效开' : '🔇 已静音' }}</button>
        </div>
      </div>

      <div class="side red" :class="{ active: sideActive(RED) }">
        <div class="side-head">
          <span class="side-name">{{ sideLabel(RED) }}</span>
          <span v-if="sideActive(RED)" class="turn-tag">▸ 走棋中</span>
        </div>
        <div class="alive-num"><b>{{ alive(RED) }}</b><span>只存活</span></div>
        <div class="meter"><i :style="{ width: alivePct(RED) }"></i></div>
        <div class="fallen">
          <span>阵亡</span>
          <template v-if="fallenOf(RED).length"><i v-for="(f, k) in fallenOf(RED)" :key="k">{{ f }}</i></template>
          <em v-else>—</em>
        </div>
      </div>
    </div>

    <div v-if="game.over" class="verdict card" :class="game.winner">
      <div class="verdict-top">
        <span class="verdict-main">🏆 {{ winnerName }}获胜！</span>
        <span class="verdict-sub">获胜方式：{{ winByText[game.winBy] }} · 共 {{ game.log.length }} 步</span>
        <button class="btn primary" @click="restart">再来一局</button>
      </div>
    </div>

    <div class="board-wrap card">
      <div class="board">
        <button
          v-for="i in COLS * 9"
          :key="i"
          class="cell"
          :class="[
            cellTerrain(i - 1),
            {
              selectable: isSelectable(i - 1),
              selected: selected === i - 1,
              mark: isMark(i - 1),
              [hintOf(i - 1)]: !!hintOf(i - 1),
            },
          ]"
          @click="onCellClick(i - 1)"
        >
          <span v-if="terrainTag(i - 1)" class="terrain-tag">{{ terrainTag(i - 1) }}</span>
          <span v-if="game.board[i - 1]" class="piece" :class="sideOf(game.board[i - 1])">
            {{ animalOf(game.board[i - 1]).emoji }}
          </span>
        </button>
      </div>
      <p class="board-note">
        <span class="tag red">🟥 红方在下</span>
        <span class="tag blue">🟦 蓝方在上</span>
        点自己的棋子亮出落点，再点落点走棋；鼠可入河、狮虎可跳河。
      </p>
    </div>

    <div class="log-card card">
      <div class="log-head">📜 战报（最新在上）</div>
      <div class="log">
        <div v-for="item in displayLog" :key="item.no" class="row" :class="{ latest: item.no === game.log.length }">
          <span class="idx">{{ item.no }}</span>
          <span class="chip" :class="item.e.side">{{ item.e.side === RED ? '红' : '蓝' }}{{ ANIMALS[item.e.rank - 1].name }}</span>
          <span class="row-text" :class="{ hot: item.e.rank === 1 && item.e.captured && rankOf(item.e.captured) === 8 }">
            {{ moveText(item.e) }}
          </span>
        </div>
        <div v-if="!game.log.length" class="log-empty">红方先行——点一只棋子开始吧</div>
      </div>
    </div>

    <details class="rules card">
      <summary>📜 规则说明（点开查看）</summary>
      <ul>
        <li><b>棋盘</b>：7×9，中间两片河、各留一条陆桥；每方一个兽穴，穴周有三格陷阱。</li>
        <li><b>走法</b>：所有棋子每步横竖走一格；<b>狮、虎</b>可沿横竖方向一跃过河落到对岸（河中有鼠挡道则跳不成）；<b>鼠</b>是唯一能下河游泳的棋子。</li>
        <li><b>吃子</b>：象＞狮＞虎＞豹＞狼＞狗＞猫＞鼠，大的吃小的或同级互吃；特例——<b>鼠吃大象</b>、大象吃不到鼠。</li>
        <li><b>水陆</b>：鼠在水里时，岸上的动物吃不到它，它也吃不到岸上的子（包括象）；水里的鼠之间可以互吃。</li>
        <li><b>陷阱</b>：敌子踩进我方陷阱武力归零，我方任何棋子都能吃它；自家陷阱不影响自家棋子。</li>
        <li><b>胜负</b>：攻入对方兽穴、吃光对方棋子、或让对方无棋可走即获胜；任何棋子不可进入自家兽穴。</li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
/* 顶部红蓝面板 */
.topbar {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 380px) 1fr;
  gap: 14px;
  align-items: stretch;
  padding: 16px;
}

.side {
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--surface);
  transition: box-shadow 0.25s ease;
}

.side.red {
  box-shadow: inset 0 3px 0 var(--danger);
}

.side.blue {
  box-shadow: inset 0 3px 0 var(--primary);
}

.side.red.active {
  box-shadow: inset 0 3px 0 var(--danger), 0 0 0 3px var(--danger-soft);
}

.side.blue.active {
  box-shadow: inset 0 3px 0 var(--primary), 0 0 0 3px var(--primary-soft);
}

.side-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.side-name {
  font-size: 1.02rem;
  font-weight: 800;
}

.side.red .side-name {
  color: var(--danger);
}

.side.blue .side-name {
  color: var(--primary);
}

.turn-tag {
  font-size: 12px;
  color: var(--muted);
  animation: blink 1.1s ease infinite;
}

.alive-num {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 6px 0;
}

.alive-num b {
  font-size: 1.8rem;
  line-height: 1;
}

.alive-num span {
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
  background: var(--primary);
  transition: width 0.4s ease;
}

.side.red .meter i {
  background: var(--danger);
}

.fallen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--muted);
}

.fallen i {
  font-style: normal;
  font-size: 15px;
  filter: grayscale(1);
  opacity: 0.55;
}

.fallen em {
  font-style: normal;
}

.console {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.status-line {
  text-align: center;
  font-weight: 700;
}

.ctrl-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.sel {
  min-height: 40px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--surface);
  padding: 0 8px;
}

/* 棋盘 */
.board-wrap {
  margin-top: 14px;
  padding: 18px 14px 12px;
}

.board {
  --edge: #8a6a45;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  aspect-ratio: 7 / 9;
  max-width: 540px;
  margin: 0 auto;
  border: 4px solid var(--edge);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(138, 106, 69, 0.3);
  background: #f0e8d5;
  padding: 0;
  font: inherit;
}

.cell.river {
  background:
    repeating-linear-gradient(45deg, transparent 0 6px, rgba(255, 255, 255, 0.35) 6px 9px),
    linear-gradient(180deg, #bfe0f5, #9fcdec);
}

.cell.trap-red {
  background: #f6ddc9;
}

.cell.trap-blue {
  background: #dbe7fb;
}

.cell.den-red {
  background: #f2c3ae;
}

.cell.den-blue {
  background: #c3d6f6;
}

.terrain-tag {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
  font-weight: 800;
  color: rgba(90, 62, 30, 0.45);
  pointer-events: none;
}

.cell.selectable {
  cursor: pointer;
}

.cell.selectable:hover .piece {
  transform: translateY(-2px);
}

.cell.mark {
  box-shadow: inset 0 0 0 2px rgba(180, 83, 9, 0.4);
}

.cell.selected {
  box-shadow: inset 0 0 0 3px #f59e0b;
  z-index: 1;
}

.cell.hint-capture {
  box-shadow: inset 0 0 0 3px rgba(212, 69, 47, 0.6);
  cursor: pointer;
}

.cell.hint-empty {
  cursor: pointer;
}

.cell.hint-empty::after {
  content: '';
  width: 26%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: rgba(180, 83, 9, 0.38);
}

.piece {
  width: 84%;
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(16px, 4vw, 30px);
  border: 2px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  user-select: none;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
  pointer-events: none;
}

.piece.red {
  background: radial-gradient(circle at 32% 28%, #ef7057, #c23a24);
}

.piece.blue {
  background: radial-gradient(circle at 32% 28%, #6f9bf5, #2f6fed);
}

.cell.selected .piece {
  transform: translateY(-2px) scale(1.07);
  box-shadow: 0 0 0 3px #f59e0b, 0 4px 8px rgba(0, 0, 0, 0.25);
}

.board-note {
  margin: 10px 0 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--muted);
}

.board-note .tag {
  margin: 0 4px;
  font-weight: 700;
}

.board-note .tag.red {
  color: var(--danger);
}

.board-note .tag.blue {
  color: var(--primary);
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

/* 战报 */
.log-card {
  margin-top: 14px;
  padding-bottom: 6px;
}

.log-head {
  padding: 12px 14px 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--muted);
}

.log {
  max-height: 300px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 14px;
  border-bottom: 1px dashed var(--line);
  font-size: 13.5px;
}

.row.latest {
  background: linear-gradient(90deg, var(--danger-soft), var(--primary-soft));
}

.idx {
  width: 28px;
  font-size: 11px;
  color: var(--muted);
  text-align: right;
}

.chip {
  flex: none;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
}

.chip.red {
  color: var(--danger);
  background: var(--danger-soft);
}

.chip.blue {
  color: var(--primary);
  background: var(--primary-soft);
}

.row-text {
  flex: 1;
}

.log-empty {
  padding: 30px 0;
  text-align: center;
  color: var(--muted);
}

.row-text.hot {
  color: #b45309;
  font-weight: 700;
  animation: shake 0.45s ease 0.1s;
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

@keyframes drop {
  from {
    transform: translateY(-10px);
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

@media (max-width: 760px) {
  .topbar {
    grid-template-columns: 1fr;
  }

  .board {
    border-width: 3px;
  }

  .verdict .btn {
    margin-left: 0;
  }
}
</style>
