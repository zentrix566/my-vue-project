// 当代人物追踪：按领域收录当代人物，记录出生日期与主要事迹，并支持持续观察。
// 样式 style.css 由两个页面各自 import，保持本文件只含 manifest，
// 这样 registry 可以 eager 加载元信息而不产生全局副作用。
export default {
  slug: 'contemporary-figures',
  title: '当代人物追踪',
  emoji: '👤',
  description: '按领域收录当代人物，看出生日期与主要事迹时间轴，并给每个人写观察笔记、标记追踪状态。',
  order: 70,
  routes: [
    {
      path: '/contemporary-figures',
      name: 'contemporary-figures',
      loader: () => import('./pages/ContemporaryFigures.vue'),
      meta: { title: '当代人物追踪' }
    },
    {
      path: '/contemporary-figures/:id',
      name: 'contemporary-figure-detail',
      loader: () => import('./pages/FigureDetail.vue'),
      props: true,
      meta: { title: '当代人物追踪 · 详情' }
      // 详情页从列表跳入；首页卡片指向首条路由 /contemporary-figures
    }
  ]
}
