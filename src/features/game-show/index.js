export default {
  slug: 'game-show',
  title: '美式游戏秀·百万奖金',
  emoji: '💼',
  description:
    '还原老美刺激游戏秀：26 只箱子藏 $0.01–$1,000,000 的「一锤定音」开箱谈判，与把 $1,000,000 全押上四道题机关门的「金钱坠落」——看看你最后能带走多少奖金。',
  order: 120,
  routes: [
    {
      path: '/gameshow',
      name: 'gameshow',
      loader: () => import('./pages/GameShow.vue'),
      meta: { title: '美式游戏秀 · 百万奖金挑战' }
    }
  ]
}
