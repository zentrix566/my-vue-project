export default {
  slug: 'fight',
  title: '擂台投注·小人打架',
  emoji: '🥊',
  description: '红蓝两个小人随机对打，下注猜胜者；快速投注模式自动连打，看多少轮输光本金。',
  order: 320,
  routes: [
    {
      path: '/fight',
      name: 'fight',
      loader: () => import('./pages/FightBet.vue'),
      meta: { title: '擂台投注 · 小人打架' }
    }
  ]
}
