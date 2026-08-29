export default {
  slug: 'officials',
  title: '中国官职·古今对比',
  emoji: '⚖️',
  description: '以现代行政级别为轴，横向对比各王朝相当官职，支持王朝、级别筛选。',
  order: 340,
  routes: [
    {
      path: '/officials',
      name: 'officials',
      loader: () => import('./pages/OfficialComparison.vue'),
      meta: { title: '中国官职 · 古今对比' }
    }
  ]
}
