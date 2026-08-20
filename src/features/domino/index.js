export default {
  slug: 'domino',
  title: '多米诺骨牌·连锁倒下',
  emoji: '🎴',
  description: '鼠标画一条路线生成骨牌，点推倒，连锁波沿曲线一节节倒下。',
  order: 160,
  routes: [
    {
      path: '/domino',
      name: 'domino',
      loader: () => import('./pages/DominoFall.vue'),
      meta: { title: '多米诺骨牌 · 沿路线连锁倒下' }
    }
  ]
}
