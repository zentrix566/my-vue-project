import { createRouter, createWebHistory } from 'vue-router'
import { loadWorldCupPage } from '../features/world-cup/index.js'
import { loadJiangyinPage } from '../features/jiangyin/index.js'
import { loadIntervalTrainingPage } from '../features/interval-training/index.js'

const Home = () => import('../views/Home.vue')

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/worldcup', name: 'worldcup', component: loadWorldCupPage },
  { path: '/jiangyin', name: 'jiangyin', component: loadJiangyinPage },
  { path: '/interval-training', name: 'interval-training', component: loadIntervalTrainingPage }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
