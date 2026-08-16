import { createRouter, createWebHistory } from 'vue-router'
import { loadWorldCupPage } from '../features/world-cup/index.js'
import { loadJiangyinPage } from '../features/jiangyin/index.js'
import { loadIntervalTrainingPage } from '../features/interval-training/index.js'
import { loadDominoPage } from '../features/domino/index.js'
import { loadCalligraphyPage } from '../features/calligraphy/index.js'
import { loadOfficialsPage } from '../features/officials/index.js'
import { loadNexusPage } from '../features/nexus/index.js'
import { loadFightPage } from '../features/fight/index.js'
import { loadHistoryTimelinePage } from '../features/history-timeline/index.js'

const Home = () => import('../views/Home.vue')

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/worldcup', name: 'worldcup', component: loadWorldCupPage },
  { path: '/jiangyin', name: 'jiangyin', component: loadJiangyinPage },
  { path: '/interval-training', name: 'interval-training', component: loadIntervalTrainingPage },
  { path: '/domino', name: 'domino', component: loadDominoPage, meta: { title: '多米诺骨牌 · 沿路线连锁倒下' } },
  { path: '/calligraphy', name: 'calligraphy', component: loadCalligraphyPage, meta: { title: '毛笔书法 · 停笔 2 秒自动优化' } },
  { path: '/officials', name: 'officials', component: loadOfficialsPage, meta: { title: '中国官职 · 古今对比' } },
  { path: '/nexus', name: 'nexus', component: loadNexusPage, meta: { title: '炉石魔网 · 脸伤计算器' } },
  { path: '/fight', name: 'fight', component: loadFightPage, meta: { title: '擂台投注 · 小人打架' } },
  { path: '/history', name: 'history', component: loadHistoryTimelinePage, meta: { title: '中国历史 · 风流人物长卷' } }
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
