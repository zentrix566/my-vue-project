// 拍画片引擎：牌库、场地、出手结算全部纯数据 + 纯函数，便于 Node 无头复跑验证。
// 规则：双方各把一张画片正面朝上摆在场地中央，轮流抡圆了拍——把对方的牌拍翻面就赢走它，
// 一方画片被赢光即输；掀角会把牌拍松（越拍越好翻），手压到牌上算犯规、自己的牌白送一张。

export const DESIGNS = [
  { name: '猪八戒', emoji: '🐷', rarity: 'plain' },
  { name: '白龙马', emoji: '🐎', rarity: 'plain' },
  { name: '雪孩子', emoji: '⛄', rarity: 'plain' },
  { name: '唐老鸭', emoji: '🦆', rarity: 'plain' },
  { name: '蓝精灵', emoji: '🍄', rarity: 'plain' },
  { name: '花仙子', emoji: '🌸', rarity: 'plain' },
  { name: '小蝌蚪', emoji: '🐸', rarity: 'plain' },
  { name: '黑猫警长', emoji: '🐱', rarity: 'hard' },
  { name: '舒克', emoji: '✈️', rarity: 'hard' },
  { name: '贝塔', emoji: '🚜', rarity: 'hard' },
  { name: '阿凡提', emoji: '🐴', rarity: 'hard' },
  { name: '九色鹿', emoji: '🦌', rarity: 'hard' },
  { name: '一休哥', emoji: '🧘', rarity: 'hard' },
  { name: '齐天大圣', emoji: '🐒', rarity: 'foil' },
  { name: '哪吒闹海', emoji: '🌊', rarity: 'foil' },
  { name: '擎天柱', emoji: '🚚', rarity: 'foil' },
  { name: '奥特曼', emoji: '🦸', rarity: 'foil' },
  { name: '小龙人', emoji: '🐲', rarity: 'foil' },
]

export const RARITY = {
  plain: { label: '普通', hardness: 1 },
  hard: { label: '硬卡', hardness: 1.32 },
  foil: { label: '闪卡', hardness: 1.72 },
}

// 越硬的牌越难拍翻，抽卡时普通款也更常见
const WEIGHT = { plain: 5, hard: 3, foil: 2 }

export const GROUNDS = [
  { key: 'smooth', name: '光滑水泥面', grip: 0.85, feel: '滑 · 好拍', desc: '堂屋水泥地擦得发亮，牌搁上就打滑' },
  { key: 'rough', name: '巷口水泥地', grip: 1, feel: '正 · 标准', desc: '放学路队标准赛场，手感最正' },
  { key: 'wet', name: '返潮泥土地', grip: 1.28, feel: '粘 · 难拍', desc: '头天下过雨，牌角吸在地上不肯动' },
]

export const DIFFICULTIES = [
  { key: 'easy', name: '新手小豆丁', jitter: 16, blurb: '拍得没准头，忽轻忽重还爱犯规' },
  { key: 'normal', name: '常客二胖', jitter: 9, blurb: '巷口常客，手上有点数' },
  { key: 'hard', name: '巷战老康', jitter: 4.5, blurb: '赢遍三条巷子，力道毒辣' },
]

export const STACK_SIZE = 12
export const NEED_BASE = 42 // 普通卡在标准场地的需求线
export const SWEET = 20 // 需求线以上这段算「拍正」，稳翻
export const NEAR = 12 // 差线这段以内算「掀角」，牌会拍松
export const FOUL = 94 // 力道到这儿手就压牌上了
export const SCATTER_FLIP_RATE = 0.42 // 过猛乱流仍有这概率瞎翻
export const LOOSEN_STEP = 5 // 每掀一次角，需求线降这么多
export const MAX_LOOSEN = 3

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const other = (side) => (side === 'me' ? 'ai' : 'me')
const pick = (rng, list) => list[Math.floor(rng() * list.length)]

export function makeCard(design, id) {
  const r = RARITY[design.rarity]
  return { id, name: design.name, emoji: design.emoji, rarity: design.rarity, rarityLabel: r.label, hardness: r.hardness }
}

export function buildStack(side, rng = Math.random) {
  const pool = []
  DESIGNS.forEach((d, i) => {
    for (let k = 0; k < WEIGHT[d.rarity]; k++) pool.push(i)
  })
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, STACK_SIZE).map((di, n) => makeCard(DESIGNS[di], `${side}${n}-${DESIGNS[di].name}`))
}

// 需求线 = 基础 × 硬度 × 场地吸附 − 松动折扣，封顶压在犯规线之下
export function needOf(card, ground, loosen = 0) {
  return clamp(Math.round(NEED_BASE * card.hardness * ground.grip - loosen * LOOSEN_STEP), 14, FOUL - 1)
}

// 出手结算：出手自带 ±4 手抖，再按力道分区判结果
export function resolveSlap(power, need, rng = Math.random) {
  const p = power + rng() * 8 - 4
  if (p >= FOUL) return 'foul'
  if (p >= need + SWEET) return rng() < SCATTER_FLIP_RATE ? 'scatter-flip' : 'scatter'
  if (p >= need) return 'flip'
  if (p >= need - NEAR) return 'near'
  return 'miss'
}

// 对手出招：瞄在需求线上方一点，再按难度抖动；贴着犯规线的牌宁可轻拍等掀松
export function aiPower(need, diff, rng = Math.random) {
  const aim = Math.min(need + 10, FOUL - 5)
  return clamp(aim + (rng() * 2 - 1) * diff.jitter, 5, 99)
}

const TEXTS = {
  flip: [
    (an, name) => `「啪」一声脆响，${name}当场翻面，被${an}一把抄走！`,
    (an, name) => `掌风又正又稳，${name}「啪叽」翻了个身——归了${an}。`,
    (an, name) => `${name}被拍得蹦起来翻了个面，${an}眼疾手快按住：我的了！`,
  ],
  'scatter-flip': [
    (an, name) => `劲使得太猛，反倒把${name}瞎掀翻——${an}白捡一张，笑得见牙不见眼。`,
    (an, name) => `乱流卷得${name}晕头转向翻了过去，${an}赶紧抢到手。`,
  ],
  near: [
    (name) => `差一口气！${name}掀了个角又落回去，牌拍松了（更好翻）。`,
    (name) => `${name}边角翘起晃了两晃，愣是没翻过去——不过牌已经松了。`,
  ],
  miss: [
    (name) => `力道太软，${name}纹丝不动，白拍一下。`,
    (name) => `掌风只够掸灰，${name}理都不理。`,
  ],
  scatter: [
    (name) => `用力过猛！气流乱成一团，${name}原地打转又落回原地。`,
    (name) => `这一掌抡狠了，${name}跳起来转了两圈，落下来还是老样子。`,
  ],
  foul: [
    (an, dn, mine) => `拍歪了！手掌直接压到牌上——按巷子规矩，${an}自己的「${mine}」白送${dn}一张。`,
    (an, dn, mine) => `${an}这掌没收住，手压在了牌上：犯规！「${mine}」赔给${dn}。`,
  ],
}

// 开新局：双方各 12 张洗乱当牌堆，各自先铺一张上桌，你先出手
export function createGame(groundKey = 'rough', diffKey = 'normal', rng = Math.random) {
  const ground = GROUNDS.find((x) => x.key === groundKey) || GROUNDS[1]
  const diff = DIFFICULTIES.find((x) => x.key === diffKey) || DIFFICULTIES[1]
  const stacks = { me: buildStack('me', rng), ai: buildStack('ai', rng) }
  return {
    ground,
    diff,
    names: { me: '你', ai: diff.name },
    stacks,
    groundCards: { me: stacks.me.shift(), ai: stacks.ai.shift() },
    loosen: { me: 0, ai: 0 },
    won: { me: [], ai: [] },
    turn: 'me',
    over: false,
    winner: null, // 'me' | 'ai'
    log: [],
    seq: 0,
    stats: { meFlips: 0, aiFlips: 0, meFouls: 0, aiFouls: 0, nears: 0 },
  }
}

// 拍一掌：结算并把结果写进战报；牌被赢走立刻由牌堆补位，牌堆也空了就是终局
export function playSlap(game, power, rng = Math.random) {
  if (game.over) return null
  const atk = game.turn
  const def = other(atk)
  const target = game.groundCards[def]
  const need = needOf(target, game.ground, game.loosen[def])
  const result = resolveSlap(power, need, rng)
  const an = game.names[atk]
  const dn = game.names[def]
  const entry = { seq: ++game.seq, atk, def, card: target, power: Math.round(power), need, result, text: '' }

  if (result === 'flip' || result === 'scatter-flip') {
    game.won[atk].push(target)
    game.groundCards[def] = game.stacks[def].shift() || null
    game.loosen[def] = 0
    game.stats[`${atk}Flips`]++
    entry.text = pick(rng, TEXTS[result])(an, target.name)
  } else if (result === 'near') {
    game.loosen[def] = Math.min(MAX_LOOSEN, game.loosen[def] + 1)
    game.stats.nears++
    entry.text = pick(rng, TEXTS.near)(target.name)
  } else if (result === 'miss') {
    entry.text = pick(rng, TEXTS.miss)(target.name)
  } else if (result === 'scatter') {
    entry.text = pick(rng, TEXTS.scatter)(target.name)
  } else {
    // 犯规：出手方自己的场上牌白送对方，再从牌堆补一张
    const mine = game.groundCards[atk]
    entry.mine = mine
    game.stats[`${atk}Fouls`]++
    if (mine) {
      game.won[def].push(mine)
      game.groundCards[atk] = game.stacks[atk].shift() || null
      game.loosen[atk] = 0
      entry.text = pick(rng, TEXTS.foul)(an, dn, mine.name)
    }
  }
  game.log.push(entry)

  const meOut = !game.groundCards.me && !game.stacks.me.length
  const aiOut = !game.groundCards.ai && !game.stacks.ai.length
  if (meOut || aiOut) {
    game.over = true
    game.winner = meOut ? 'ai' : 'me'
  } else {
    game.turn = def
  }
  return entry
}
