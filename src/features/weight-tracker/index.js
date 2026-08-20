// 体重趋势分析：懒加载体重看板页面。
export default {
  slug: 'weight-tracker',
  title: '体重变化·趋势分析',
  emoji: '⚖️',
  description: '按月记录体重，看整体走势、分年度变化和每月增减多少斤，标出最重与最轻节点。',
  order: 50,
  routes: [
    {
      path: '/weight',
      name: 'weight',
      loader: () => import('./pages/WeightTracker.vue'),
      meta: { title: '体重变化 · 趋势分析' }
    }
  ]
}
