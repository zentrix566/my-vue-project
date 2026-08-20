export default {
  slug: 'dynasty-map',
  title: '历代地图·疆域城邑',
  emoji: '🏯',
  description: '下拉切换朝代，在今日中国地图上标注长安、洛阳、宛城等历代都城州郡的今址；点击省份可立体凸起，点城邑看说明。',
  order: 20,
  routes: [
    {
      path: '/dynasty-map',
      name: 'dynasty-map',
      loader: () => import('./pages/DynastyMap.vue'),
      meta: { title: '历代地图 · 疆域城邑' }
    }
  ]
}
