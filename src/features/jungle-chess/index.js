export default {
  slug: 'jungle-chess',
  title: '斗兽棋·鼠吃大象',
  emoji: '🐘',
  description:
    '童年经典斗兽棋：象狮虎豹狼狗猫鼠八兽捉对比拼，狮虎跳河、老鼠下水，小老鼠反吃大象；攻入兽穴获胜，人机对战或双人同屏。',
  order: 100,
  routes: [
    {
      path: '/jungle',
      name: 'jungle',
      loader: () => import('./pages/JungleChess.vue'),
      meta: { title: '斗兽棋 · 鼠吃大象' }
    }
  ]
}
