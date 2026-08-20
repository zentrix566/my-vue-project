export default {
  slug: 'history-timeline',
  title: '历史·时间轴',
  emoji: '📜',
  description: '默认中国历史；可在页面顶部选择国外国家与文明。人物、统治者和事件均支持按时间查看。',
  order: 10,
  routes: [
    {
      path: '/history',
      name: 'history',
      loader: () => import('./pages/HistoryTimeline.vue'),
      meta: { title: '历史 · 中国' }
    },
    {
      path: '/world-history',
      name: 'world-history',
      loader: () => import('./pages/WorldTimeline.vue'),
      meta: { title: '历史 · 国外' }
      // 国外史是中国史页内切换的辅助路由；首页卡片指向首条路由 /history
    }
  ]
}
