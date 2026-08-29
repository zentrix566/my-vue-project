export default {
  slug: 'huapian',
  title: '拍画片 · 啪叽响',
  emoji: '🎴',
  description:
    '童年水泥地经典：按住蓄力松手开拍，把对面的画片拍翻面就归你；掀角拍松越拍越好翻，手压到牌上算犯规白送一张。',
  order: 110,
  routes: [
    {
      path: '/huapian',
      name: 'huapian',
      loader: () => import('./pages/HuaPian.vue'),
      meta: { title: '拍画片 · 啪叽响' }
    }
  ]
}
