export default {
  slug: 'dynasty-map',
  title: '历代疆域·历史地图',
  emoji: '🏯',
  description: '在东亚地貌底图上浏览历代疆域：多彩政权、山川水系、周边国家、都城重镇与郡州边界分层呈现。',
  order: 3,
  routes: [
    {
      path: '/dynasty-map',
      name: 'dynasty-map',
      loader: () => import('./pages/DynastyMap.vue'),
      meta: { title: '历代疆域 · 历史地图' }
    }
  ]
}
