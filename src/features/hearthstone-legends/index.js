export default {
  slug: 'hearthstone-legends',
  title: '炉石传说·上传说记录',
  emoji: '🪄',
  description: '按月记录狂野、标准与幻变模式的上传说卡组；一眼回看每个赛季用什么上传说。',
  order: 60,
  routes: [
    {
      path: '/hearthstone-legends',
      name: 'hearthstone-legends',
      loader: () => import('./pages/HearthstoneLegends.vue'),
      meta: { title: '炉石传说 · 上传说记录' }
    }
  ]
}
