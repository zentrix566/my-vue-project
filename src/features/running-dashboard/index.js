export default {
  slug: 'running-dashboard',
  title: '跑步数据·月度看板',
  emoji: '🏃',
  description: '按月查看跑量、配速、次数与累计爬升；一键切换仅跑步或包含越野。',
  order: 80,
  routes: [
    {
      path: '/running',
      name: 'running-dashboard',
      loader: () => import('./pages/RunningDashboard.vue'),
      meta: { title: '跑步数据 · 月度看板' }
    }
  ]
}
