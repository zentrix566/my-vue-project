export default {
  slug: '3d-project',
  title: '3D 项目',
  emoji: '🏗️',
  description: 'Three.js 3D 场景合集：可交互教室与别墅，支持多场景切换与多视角漫游。',
  order: 40,
  routes: [
    {
      path: '/3d',
      name: '3d-project',
      loader: () => import('./pages/Scene3D.vue'),
      meta: { title: '3D 项目 · Three.js Scenes' }
    }
  ]
}
