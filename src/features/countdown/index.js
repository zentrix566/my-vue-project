export default {
  slug: 'countdown',
  title: '人生倒计时',
  emoji: '⏳',
  description: '输入出生日期与性别，一屏看距 35 岁斩杀线、退休与预期寿命还剩多久，还能自定义一个目标节点倒计时。',
  order: 250,
  routes: [
    {
      path: '/countdown',
      name: 'countdown',
      loader: () => import('./pages/Countdown.vue'),
      meta: { title: '人生倒计时 · 关键节点还剩多久' }
    }
  ]
}
