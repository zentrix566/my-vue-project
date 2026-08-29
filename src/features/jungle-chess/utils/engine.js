// 斗兽棋引擎：地形、走法生成、吃子/陷阱/兽穴/河流规则与 AI 搜索，纯数据 + 纯函数，便于 Node 无头复跑验证。
// 棋子编码：0 空；红方 1-8（鼠猫狗狼豹虎狮象），蓝方 9-16。红在下方，红先行。

export const COLS = 7
export const ROWS = 9
export const CELLS = COLS * ROWS

export const RED = 'red'
export const BLUE = 'blue'
export const other = (side) => (side === RED ? BLUE : RED)

export const ANIMALS = [
  { key: 'rat', name: '鼠', rank: 1, emoji: '🐭' },
  { key: 'cat', name: '猫', rank: 2, emoji: '🐱' },
  { key: 'dog', name: '狗', rank: 3, emoji: '🐶' },
  { key: 'wolf', name: '狼', rank: 4, emoji: '🐺' },
  { key: 'leopard', name: '豹', rank: 5, emoji: '🐆' },
  { key: 'tiger', name: '虎', rank: 6, emoji: '🐯' },
  { key: 'lion', name: '狮', rank: 7, emoji: '🦁' },
  { key: 'elephant', name: '象', rank: 8, emoji: '🐘' },
]

export const codeOf = (side, rank) => (side === BLUE ? rank + 8 : rank)
export const rankOf = (code) => (code > 8 ? code - 8 : code)
export const sideOf = (code) => (code > 8 ? BLUE : RED)

// 地形：两片 2x3 河流（中间第 3 列是陆桥）、双方兽穴与兽穴周围三格陷阱
const RIVER_FLAGS = new Uint8Array(CELLS)
for (const y of [3, 4, 5]) for (const x of [1, 2, 4, 5]) RIVER_FLAGS[y * COLS + x] = 1
const TRAP_OWNER = new Uint8Array(CELLS) // 0 无 / 1 红 / 2 蓝
for (const i of [2, 4, COLS + 3]) TRAP_OWNER[i] = 2
for (const i of [8 * COLS + 2, 8 * COLS + 4, 7 * COLS + 3]) TRAP_OWNER[i] = 1

export const DENS = { blue: 3, red: 8 * COLS + 3 } // 蓝 (3,0)，红 (3,8)
export const isRiver = (i) => RIVER_FLAGS[i] === 1
export const trapOwner = (i) => (TRAP_OWNER[i] === 1 ? RED : TRAP_OWNER[i] === 2 ? BLUE : null)
export const denOwner = (i) => (i === DENS.blue ? BLUE : i === DENS.red ? RED : null)

// 标准开局：狮虎守角、狗猫次角、鼠豹狼象列前，双方点对称
const START = [
  [BLUE, 7, 0], [BLUE, 6, 6], [BLUE, 3, 8], [BLUE, 2, 12],
  [BLUE, 1, 14], [BLUE, 5, 16], [BLUE, 4, 18], [BLUE, 8, 20],
  [RED, 7, 62], [RED, 6, 56], [RED, 3, 54], [RED, 2, 50],
  [RED, 1, 48], [RED, 5, 46], [RED, 4, 44], [RED, 8, 42],
]

export function createGame() {
  const board = new Array(CELLS).fill(0)
  for (const [side, rank, at] of START) board[at] = codeOf(side, rank)
  return { board, turn: RED, over: false, winner: null, winBy: null, lastMove: null, log: [] }
}

// 吃子判定：守方站在攻方陷阱里武力归零任吃；否则按等级，特例鼠吃象、象吃不到鼠
function canCapture(attCode, defCode, defIdx) {
  if (TRAP_OWNER[defIdx] === (sideOf(attCode) === RED ? 1 : 2)) return true
  const a = rankOf(attCode)
  const d = rankOf(defCode)
  if (a === 8 && d === 1) return false
  if (a === 1 && d === 8) return true
  return a >= d
}

// 生成某一方全部合法走法：{ from, to, captured, jump, splash }
export function genAllMoves(board, side) {
  const out = []
  for (let i = 0; i < CELLS; i++) {
    const code = board[i]
    if (!code || sideOf(code) !== side) continue
    const rank = rankOf(code)
    const x = i % COLS
    const y = (i / COLS) | 0
    const inWater = RIVER_FLAGS[i] === 1
    const isRat = rank === 1

    const steps = []
    if (x > 0) steps.push(i - 1)
    if (x < COLS - 1) steps.push(i + 1)
    if (y > 0) steps.push(i - COLS)
    if (y < ROWS - 1) steps.push(i + COLS)
    for (const to of steps) {
      if (to === DENS[side]) continue // 不可进自家兽穴
      const toRiver = RIVER_FLAGS[to] === 1
      if (toRiver && !isRat) continue // 只有鼠能下水
      const target = board[to]
      if (target === 0) {
        out.push({ from: i, to, captured: 0, jump: false, splash: toRiver !== !!inWater })
      } else if (sideOf(target) !== side) {
        if (inWater && !toRiver) continue // 水里的鼠吃不到岸上的子
        if (canCapture(code, target, to)) out.push({ from: i, to, captured: target, jump: false, splash: toRiver !== !!inWater })
      }
    }

    // 狮虎跳河：沿直线越过连续河格落到对岸，河中任何棋子（鼠）挡道即跳不成
    if (rank === 6 || rank === 7) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let tx = x + dx
        let ty = y + dy
        let crossed = 0
        let blocked = false
        while (tx >= 0 && tx < COLS && ty >= 0 && ty < ROWS && RIVER_FLAGS[ty * COLS + tx] === 1) {
          if (board[ty * COLS + tx] !== 0) { blocked = true; break }
          crossed++
          tx += dx
          ty += dy
        }
        if (blocked || crossed === 0) continue
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) continue
        const to = ty * COLS + tx
        if (to === DENS[side]) continue
        const target = board[to]
        if (target !== 0 && sideOf(target) === side) continue
        if (target !== 0 && !canCapture(code, target, to)) continue
        out.push({ from: i, to, captured: target, jump: true, splash: false })
      }
    }
  }
  return out
}

function hasAnyPiece(board, side) {
  for (let i = 0; i < CELLS; i++) {
    const code = board[i]
    if (code && sideOf(code) === side) return true
  }
  return false
}

// 落子（就地修改 state）：进穴 / 吃光对方 / 对方无棋可走即终局
export function applyMove(state, move) {
  const code = state.board[move.from]
  state.board[move.to] = code
  state.board[move.from] = 0
  state.lastMove = { from: move.from, to: move.to }
  state.log.push({ side: sideOf(code), rank: rankOf(code), from: move.from, to: move.to, captured: move.captured, jump: move.jump, splash: move.splash })
  state.turn = other(state.turn)
  const loser = state.turn
  if (move.to === DENS[other(sideOf(code))]) {
    state.over = true
    state.winner = sideOf(code)
    state.winBy = 'den'
  } else if (!hasAnyPiece(state.board, loser)) {
    state.over = true
    state.winner = sideOf(code)
    state.winBy = 'annihilate'
  } else if (genAllMoves(state.board, loser).length === 0) {
    state.over = true
    state.winner = sideOf(code)
    state.winBy = 'stuck'
  }
  return state
}

// ---------- AI：negamax + alpha-beta 剪枝，评估 = 子力 + 逼近敌穴 ----------

const MATE = 1e6
const VALUES = [0, 560, 500, 540, 580, 680, 790, 840, 900] // 鼠因能吃象、能下水而略高于猫
const ADVANCE = 9 // 每逼近敌穴一格的奖励权重

function evaluate(board) {
  let score = 0
  for (let i = 0; i < CELLS; i++) {
    const code = board[i]
    if (!code) continue
    const side = sideOf(code)
    const rank = rankOf(code)
    let v = VALUES[rank]
    const den = DENS[other(side)]
    const dist = Math.abs((i % COLS) - (den % COLS)) + Math.abs(((i / COLS) | 0) - ((den / COLS) | 0))
    v += (14 - dist) * ADVANCE
    const owner = TRAP_OWNER[i]
    if (owner && (owner === 1) !== (side === RED)) v -= 40 // 深陷敌营陷阱
    score += side === RED ? v : -v
  }
  return score
}

const evalFor = (board, side) => (side === RED ? evaluate(board) : -evaluate(board))

let nodeBudget = 0

function orderMoves(moves, side) {
  const key = (m) => (m.to === DENS[other(side)] ? 1e9 : m.captured ? 1000 + VALUES[rankOf(m.captured)] : 0)
  moves.sort((a, b) => key(b) - key(a))
}

function negamax(board, depth, alpha, beta, side, ply) {
  if (nodeBudget <= 0) return evalFor(board, side)
  nodeBudget--
  if (depth <= 0) return evalFor(board, side)
  const moves = genAllMoves(board, side)
  if (!moves.length) return -(MATE - ply) // 无棋可走即负，快输的扣分更重
  orderMoves(moves, side)
  let best = -Infinity
  for (const m of moves) {
    let score
    if (m.to === DENS[other(side)]) {
      score = MATE - ply
    } else {
      const captured = board[m.to]
      board[m.to] = board[m.from]
      board[m.from] = 0
      score = -negamax(board, depth - 1, -beta, -alpha, other(side), ply + 1)
      board[m.from] = board[m.to]
      board[m.to] = captured
    }
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best
}

const LEVELS = {
  easy: { depth: 2, jitter: 90, budget: 30000 },
  normal: { depth: 4, jitter: 20, budget: 100000 },
  hard: { depth: 6, jitter: 0, budget: 260000 },
}

// 电脑走一步：返回一个合法走法（aiSide 默认蓝方）；输入的 board 会被临时借用但不改变结果
export function chooseAIMove(board, level = 'normal', aiSide = BLUE) {
  const { depth, jitter, budget } = LEVELS[level] || LEVELS.normal
  const moves = genAllMoves(board, aiSide)
  if (!moves.length) return null
  nodeBudget = budget
  orderMoves(moves, aiSide)
  let bestScore = -Infinity
  let bestMoves = []
  for (const m of moves) {
    let score
    if (m.to === DENS[other(aiSide)]) {
      score = MATE
    } else {
      const captured = board[m.to]
      board[m.to] = board[m.from]
      board[m.from] = 0
      score = -negamax(board, depth - 1, -Infinity, -bestScore + jitter * 2 + 1, other(aiSide), 1)
      board[m.from] = board[m.to]
      board[m.to] = captured
    }
    if (jitter) score += (Math.random() * 2 - 1) * jitter
    if (score > bestScore + 0.5) {
      bestScore = score
      bestMoves = [m]
    } else if (score > bestScore - 0.5) {
      bestMoves.push(m)
    }
  }
  return bestMoves[(Math.random() * bestMoves.length) | 0]
}
