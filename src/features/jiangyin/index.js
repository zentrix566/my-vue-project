export default {
  slug: 'jiangyin',
  title: '江阴保卫战·形势图',
  emoji: '🗺️',
  description: '清军与义军交战路线互动地图，点箭头看事件。',
  order: 210,
  routes: [
    {
      path: '/jiangyin',
      name: 'jiangyin',
      loader: () => import('./pages/JiangyinBattle.vue'),
      meta: { title: '江阴保卫战 · 形势图' }
    }
  ]
}
