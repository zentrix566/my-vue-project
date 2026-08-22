export default {
  slug: 'dynasty-map',
  title: '历代疆域·3D地图',
  emoji: '🏯',
  description: '秦至清十五个时期的 3D 疆域地图：历代版图以立体色块拔起，标注都城、州郡与边关今址；三国、南北朝、五代十国、宋辽金夏并立政权分色呈现，支持自动巡游与键盘翻页。',
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
