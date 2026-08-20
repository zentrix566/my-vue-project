import { createRouter, createWebHistory } from 'vue-router'
import { buildFeatureRoutes } from '../features/registry.js'

const Home = () => import('../views/Home.vue')
const Changelog = () => import('../views/Changelog.vue')

// 所有子项目（feature）的路由由 registry 自动聚合：
// 新增子项目只需在 src/features/<slug>/index.js 写 manifest，无需在此手动登记。
const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/changelog', name: 'changelog', component: Changelog, meta: { title: '更新日志 · Changelog' } },
  ...buildFeatureRoutes()
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 按路由 meta.title 设置浏览器标签页标题
router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = to.meta.title
  }
})

export default router
