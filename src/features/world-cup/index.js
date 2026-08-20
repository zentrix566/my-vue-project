export default {
  slug: 'world-cup',
  title: '世界杯·点球大战',
  emoji: '⚽',
  description: '拖拽调整角度和力度，10 次射门挑战 AI 守门员。',
  order: 220,
  routes: [
    {
      path: '/worldcup',
      name: 'worldcup',
      loader: () => import('./pages/WorldCupKick.vue'),
      meta: { title: '世界杯 · 点球大战' }
    }
  ]
}
