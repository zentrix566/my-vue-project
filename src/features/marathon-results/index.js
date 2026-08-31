export default {
  slug: 'marathon-results',
  title: '路跑与越野·比赛成绩',
  emoji: '🏅',
  description: '公路赛与越野赛分开展示，用成绩趋势、配速和爬升回看每一次进步。',
  order: 70,
  routes: [
    {
      path: '/marathon-results',
      name: 'marathon-results',
      loader: () => import('./pages/MarathonResults.vue'),
      meta: { title: '路跑与越野 · 比赛成绩' }
    }
  ]
}
