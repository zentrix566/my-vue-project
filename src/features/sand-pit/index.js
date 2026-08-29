export default {
  slug: 'sand-pit',
  title: '沙土堆·挖洞砌渠',
  emoji: '⛏️',
  description: '在沙堆上挖洞掏隧道，用砖砌水渠，放个水龙头看水流顺着渠道一路淌。',
  order: 180,
  routes: [
    {
      path: '/sandpit',
      name: 'sandpit',
      loader: () => import('./pages/SandPit.vue'),
      meta: { title: '沙土堆 · 挖洞砌渠' }
    }
  ]
}
