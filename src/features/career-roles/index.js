export default {
  slug: 'career-roles',
  title: '现代职业·古代岗位',
  emoji: '🏛️',
  description: '看看公务员、收银员、流水线工人在古代叫什么；也能输入任意现代行业，让 AI 推想对应的古代职业。',
  order: 200,
  routes: [
    {
      path: '/career-roles',
      name: 'career-roles',
      loader: () => import('./pages/CareerRoles.vue'),
      meta: { title: '现代职业 · 古代岗位' }
    }
  ]
}
