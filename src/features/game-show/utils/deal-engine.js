// 「一锤定音」（Deal or No Deal）纯逻辑引擎：不依赖 DOM，可在 Node 里无头复跑验证

// 美版 26 只箱子的金额表
export const CASE_VALUES = [
  0.01, 1, 5, 10, 25, 50, 75, 100, 200, 300, 400, 500, 750,
  1000, 5000, 10000, 25000, 50000, 75000, 100000, 200000, 300000, 400000, 500000, 750000, 1000000
]

// 每轮需要打开的箱子数（美版节奏），总和 24，最后剩 2 箱进入换箱/揭晓
export const ROUND_PLAN = [6, 5, 4, 3, 2, 1, 1, 1, 1]

// 银行家报价系数：轮次越靠后越接近剩余期望值
const OFFER_FACTORS = [0.25, 0.35, 0.45, 0.55, 0.65, 0.72, 0.78, 0.84, 0.9]

export function shuffle(list) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function buildCases() {
  const values = shuffle(CASE_VALUES)
  return values.map((value, i) => ({ id: i + 1, value, opened: false }))
}

// 报价 = 剩余期望值 × 谈判系数 × 轻微浮动，并取整到顺眼的档位
export function bankerOffer(remainingValues, offersMade) {
  const ev = remainingValues.reduce((s, v) => s + v, 0) / remainingValues.length
  const factor = OFFER_FACTORS[Math.min(offersMade, OFFER_FACTORS.length - 1)]
  const jitter = 1 + (Math.random() * 0.06 - 0.03)
  const raw = ev * factor * jitter
  const step = raw < 1000 ? 50 : raw < 100000 ? 500 : 1000
  return Math.max(step, Math.round(raw / step) * step)
}

export function formatMoney(v) {
  if (v === 0) return '$0'
  if (v < 1) return '$' + v.toFixed(2)
  return '$' + Math.round(v).toLocaleString('en-US')
}
