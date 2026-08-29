export default {
  slug: 'minister',
  title: '大臣模拟器·宦海沉浮',
  emoji: '👑',
  description: '扮演大雍朝官员，批答奏报、周旋同僚；圣眷政绩名望家财四端须平衡，任何一端崩盘都仕途终结。',
  order: 290,
  routes: [
    {
      path: '/minister',
      name: 'minister',
      loader: () => import('./pages/MinisterSimulator.vue'),
      meta: { title: '大臣模拟器 · 宦海沉浮' }
    }
  ]
}
