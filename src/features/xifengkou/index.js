export default {
  slug: 'xifengkou',
  title: '喜峰口·大刀夜袭',
  emoji: '🔪',
  description: '1933 年白台子夜袭模拟：摸进日军营地，避灯潜行、背后挥刀，天亮前撤出，配《大刀进行曲》。',
  order: 270,
  routes: [
    {
      path: '/xifengkou',
      name: 'xifengkou',
      loader: () => import('./pages/NightRaid.vue'),
      meta: { title: '喜峰口 · 大刀夜袭' }
    }
  ]
}
