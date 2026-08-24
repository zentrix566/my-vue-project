export default {
  slug: 'dynasty-map',
  title: '历代疆域·3D地图',
  emoji: '🏯',
  description: '秦至清十五个时期的 3D 疆域沙盘：疆域按郡/州划块立体拔起，都城与重镇化作光柱，悬停显示郡名，支持自动巡游。',
  order: 20,
  routes: [
    {
      path: '/dynasty-map',
      name: 'dynasty-map',
      loader: () => import('./pages/DynastyMap.vue'),
      meta: { title: '历代疆域 · 3D 地图' }
    }
  ]
}
