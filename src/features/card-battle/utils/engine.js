// 纸牌对战引擎：发牌、比大小（以小胜大）、逐轮结算，全部纯数据 + 纯函数，便于无头复跑验证。
// 规则：普通大小 A < 2 < … < K < 小王 < 大王，大的吃小的；特例 A、2、3 反过来吃 J/Q/K 与双王。

export const SUITS = [
  { key: 'spade', symbol: '♠', red: false },
  { key: 'heart', symbol: '♥', red: true },
  { key: 'club', symbol: '♣', red: false },
  { key: 'diamond', symbol: '♦', red: true },
]

const RANK_LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }
// rank 即基线大小：A=1 … K=13，小王=14，大王=15

export function buildDeck() {
  const cards = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({
        id: `${suit.key}${rank}`,
        kind: 'normal',
        rank,
        label: RANK_LABELS[rank] || String(rank),
        suit: suit.key,
        suitSymbol: suit.symbol,
        red: suit.red,
      })
    }
  }
  cards.push({ id: 'joker-small', kind: 'joker', rank: 14, label: '小王', suit: null, suitSymbol: '', red: false })
  cards.push({ id: 'joker-big', kind: 'joker', rank: 15, label: '大王', suit: null, suitSymbol: '', red: true })
  return cards
}

export function shuffle(list) {
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// 比牌：1 = a 胜，-1 = b 胜，0 = 平局
// 基线按 rank 比大小；特例 A/2/3（rank ≤ 3）反过来吃 J/Q/K 与双王（rank ≥ 11）
export function compareCards(a, b) {
  if (a.rank === b.rank) return 0
  if (a.rank <= 3 && b.rank >= 11) return 1
  if (b.rank <= 3 && a.rank >= 11) return -1
  return a.rank > b.rank ? 1 : -1
}

export const isSlayer = (card) => card.rank <= 3

const other = (side) => (side === 'red' ? 'blue' : 'red')

// 开新局：54 张洗乱，红蓝各 27 张，currentSide 翻完一张即换边，先手每轮自然交替
export function createGame() {
  const deck = shuffle(buildDeck())
  return {
    decks: { red: deck.slice(0, 27), blue: deck.slice(27) },
    rounds: [], // { first, red, blue, result: 'red'|'blue'|'tie'|null, upset }
    currentSide: 'red',
    awaitResolve: false, // 一轮两张都已翻开，等待 resolveRound 结算
    over: false,
    winner: null, // 'red' | 'blue' | 'draw'
    stats: { redCaptured: 0, blueCaptured: 0, upsets: 0 },
  }
}

// 翻一张：currentSide 翻出牌堆顶并登记到本轮；一轮两张翻齐后置 awaitResolve，换边暂停等结算
export function revealCard(game) {
  if (game.over || game.awaitResolve) return null
  const side = game.currentSide
  if (!game.decks[side].length) return null // 正常流程下结算即终局，此处兜底防御
  const card = game.decks[side].shift()
  let round = game.rounds[game.rounds.length - 1]
  if (!round || (round.red && round.blue)) {
    round = { first: side, red: null, blue: null, result: null, upset: false }
    game.rounds.push(round)
  }
  round[side] = card
  if (round.red && round.blue) {
    game.awaitResolve = true
  } else {
    game.currentSide = other(side)
  }
  return { side, card }
}

// 结算当前轮：输牌弃掉不再回来，赢牌压回赢家牌堆底部继续出战；随后判终局
export function resolveRound(game) {
  if (!game.awaitResolve) return null
  const round = game.rounds[game.rounds.length - 1]
  const cmp = compareCards(round.red, round.blue)
  if (cmp === 0) {
    round.result = 'tie'
  } else {
    const winSide = cmp === 1 ? 'red' : 'blue'
    const loseSide = other(winSide)
    round.result = winSide
    round.upset = isSlayer(round[winSide]) && round[loseSide].rank >= 11
    if (round.upset) game.stats.upsets++
    game.stats[`${winSide}Captured`]++
    game.decks[winSide].push(round[winSide])
  }
  game.awaitResolve = false
  const redLeft = game.decks.red.length
  const blueLeft = game.decks.blue.length
  if (!redLeft || !blueLeft) {
    game.over = true
    game.winner = !redLeft && !blueLeft ? 'draw' : redLeft ? 'red' : 'blue'
  } else {
    game.currentSide = other(round.first)
  }
  return round
}
