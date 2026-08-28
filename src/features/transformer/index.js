export default {
  slug: 'transformer',
  title: '变形金刚·变形玩具',
  emoji: '🤖',
  description: '一台会变形的机甲玩具：零件咔咔翻折，一秒从机器人变成跑车；能走路跳跃，也能踩油门飙一圈。',
  order: 270,
  routes: [
    {
      path: '/transformer',
      name: 'transformer',
      loader: () => import('./pages/Transformer.vue'),
      meta: { title: '变形金刚 · 变形玩具' }
    }
  ]
}
