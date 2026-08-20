export default {
  slug: 'calligraphy',
  title: '毛笔书法·停笔自动优化',
  emoji: '✒️',
  description: '宣纸上书写，停笔 2 秒自动优化成大师笔法，可向标准字形靠拢。',
  order: 170,
  routes: [
    {
      path: '/calligraphy',
      name: 'calligraphy',
      loader: () => import('./pages/BrushCalligraphy.vue'),
      meta: { title: '毛笔书法 · 停笔 2 秒自动优化' }
    }
  ]
}
