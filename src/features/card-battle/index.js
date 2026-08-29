export default {
  slug: 'card-battle',
  title: '纸牌对战·以小胜大',
  emoji: '🃏',
  description:
    '54 张牌平分红蓝两队，逐张翻开捉对比大小：大牌吃小牌，A/2/3 反杀 J/Q/K 与双王；输牌弃掉、赢牌回堆再战，一方翻光即负。',
  order: 140,
  routes: [
    {
      path: '/cards',
      name: 'cards',
      loader: () => import('./pages/CardBattle.vue'),
      meta: { title: '纸牌对战 · 以小胜大' }
    }
  ]
}
