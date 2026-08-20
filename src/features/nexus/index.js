export default {
  slug: 'nexus',
  title: '炉石魔网·脸伤计算器',
  emoji: '🔮',
  description: '输入法强与场上怪血量，模拟随机砸怪溢出，算脸伤期望、最大最小与分布。',
  order: 190,
  routes: [
    {
      path: '/nexus',
      name: 'nexus',
      loader: () => import('./pages/HearthstoneNexus.vue'),
      meta: { title: '炉石魔网 · 脸伤计算器' }
    }
  ]
}
