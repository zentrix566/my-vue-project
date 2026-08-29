export default {
  slug: 'interval-training',
  title: '400 米间歇训练',
  emoji: '🏃',
  description: '配速趋势、评级、日历与导入导出的跑步数据看板。',
  order: 390,
  routes: [
    {
      path: '/interval-training',
      name: 'interval-training',
      loader: () => import('./pages/IntervalTraining.vue'),
      meta: { title: '400 米间歇训练 · 数据看板' }
    }
  ]
}
