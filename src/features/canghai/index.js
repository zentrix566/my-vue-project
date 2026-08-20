export default {
  slug: 'canghai',
  title: '沧海一声笑·古琴和曲',
  emoji: '🌊',
  description: '月下沧海、孤剑侠客，五弦下落音符和一曲《沧海一声笑》，D F G J K 拨弦，评 S/A/B/C/D 境界。',
  order: 240,
  routes: [
    {
      path: '/canghai',
      name: 'canghai',
      loader: () => import('./pages/CanghaiXiao.vue'),
      meta: { title: '沧海一声笑 · 古琴和曲' }
    }
  ]
}
