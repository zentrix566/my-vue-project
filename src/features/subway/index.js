export default {
  slug: 'subway',
  title: '北京地铁·站站距离',
  emoji: '🚇',
  description: '覆盖全部运营线路，算任意两站最短路径的总距离、换乘次数与逐段里程；也能按线路逐站看相邻站间距。',
  order: 4,
  routes: [
    {
      path: '/subway',
      name: 'subway',
      loader: () => import('./pages/SubwayDistance.vue'),
      meta: { title: '北京地铁 · 站站距离' }
    }
  ]
}
