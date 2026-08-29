// 主播收藏馆：按平台收藏创作者主页链接。
export default {
  slug: 'creator-hall',
  title: '主播收藏馆',
  emoji: '🎙️',
  description: '按平台收藏喜欢的主播与创作者：主页链接、内容标签、关注状态与备注集中管理，支持自定义平台与备份导入导出。',
  order: 150,
  routes: [
    {
      path: '/creators',
      name: 'creators',
      loader: () => import('./pages/CreatorHall.vue'),
      meta: { title: '主播收藏馆 · 创作者关注管理' }
    }
  ]
}
