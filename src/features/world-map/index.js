export default {
  slug: 'world-map',
  title: '当代世界地图',
  emoji: '🌐',
  description: '可缩放、拖拽和检索的当代世界国界地图，按大洲浏览各国。',
  order: 50,
  routes: [
    {
      path: '/world-map',
      name: 'world-map',
      loader: () => import('./pages/WorldMap.vue'),
      meta: { title: '当代世界地图 · World Atlas' }
    }
  ]
}
