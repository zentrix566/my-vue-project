export default {
  slug: 'driving',
  title: '模拟驾驶·练车找手感',
  emoji: '🚗',
  description: '俯视小车练习变道、转弯、掉头：转向灯时机、导向车道、压线扣分一样不少，方向盘打多少回多少。',
  order: 120,
  routes: [
    {
      path: '/driving',
      name: 'driving',
      loader: () => import('./pages/DrivingPractice.vue'),
      meta: { title: '模拟驾驶 · 转弯掉头变道练习场' }
    }
  ]
}
