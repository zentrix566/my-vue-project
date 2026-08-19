import { createRouter, createWebHistory } from 'vue-router'
import { loadWorldCupPage } from '../features/world-cup/index.js'
import { loadJiangyinPage } from '../features/jiangyin/index.js'
import { loadIntervalTrainingPage } from '../features/interval-training/index.js'
import { loadDominoPage } from '../features/domino/index.js'
import { loadCalligraphyPage } from '../features/calligraphy/index.js'
import { loadOfficialsPage } from '../features/officials/index.js'
import { loadNexusPage } from '../features/nexus/index.js'
import { loadFightPage } from '../features/fight/index.js'
import { loadHistoryTimelinePage, loadWorldTimelinePage } from '../features/history-timeline/index.js'
import { loadCanghaiPage } from '../features/canghai/index.js'
import { loadMinisterPage } from '../features/minister/index.js'
import { loadStickFightPage } from '../features/stick-fight/index.js'
import { loadXifengkouPage } from '../features/xifengkou/index.js'
import { loadPetPage } from '../features/pet/index.js'
import { loadEmperorPage } from '../features/emperor/index.js'
import { loadDrivingPage } from '../features/driving/index.js'
import { loadSecureStoragePage } from '../features/secure-storage/index.js'
import { loadSubwayPage } from '../features/subway/index.js'
import { loadCountdownPage } from '../features/countdown/index.js'
import { loadWeightTrackerPage } from '../features/weight-tracker/index.js'
import {
  loadContemporaryFiguresPage,
  loadContemporaryFigureDetailPage
} from '../features/contemporary-figures/index.js'
import { loadBiographyPage } from '../features/biography/index.js'
import { loadCareerRolesPage } from '../features/career-roles/index.js'
import { loadDynastyMapPage } from '../features/dynasty-map/index.js'

const Home = () => import('../views/Home.vue')
const Changelog = () => import('../views/Changelog.vue')

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/changelog', name: 'changelog', component: Changelog, meta: { title: '更新日志 · Changelog' } },
  { path: '/worldcup', name: 'worldcup', component: loadWorldCupPage },
  { path: '/jiangyin', name: 'jiangyin', component: loadJiangyinPage },
  { path: '/interval-training', name: 'interval-training', component: loadIntervalTrainingPage },
  { path: '/domino', name: 'domino', component: loadDominoPage, meta: { title: '多米诺骨牌 · 沿路线连锁倒下' } },
  { path: '/calligraphy', name: 'calligraphy', component: loadCalligraphyPage, meta: { title: '毛笔书法 · 停笔 2 秒自动优化' } },
  { path: '/officials', name: 'officials', component: loadOfficialsPage, meta: { title: '中国官职 · 古今对比' } },
  { path: '/nexus', name: 'nexus', component: loadNexusPage, meta: { title: '炉石魔网 · 脸伤计算器' } },
  { path: '/fight', name: 'fight', component: loadFightPage, meta: { title: '擂台投注 · 小人打架' } },
  { path: '/history', name: 'history', component: loadHistoryTimelinePage, meta: { title: '历史 · 中国' } },
  { path: '/world-history', name: 'world-history', component: loadWorldTimelinePage, meta: { title: '历史 · 国外' } },
  { path: '/canghai', name: 'canghai', component: loadCanghaiPage, meta: { title: '沧海一声笑 · 古琴和曲' } },
  { path: '/minister', name: 'minister', component: loadMinisterPage, meta: { title: '大臣模拟器 · 宦海沉浮' } },
  { path: '/stickfight', name: 'stickfight', component: loadStickFightPage, meta: { title: '火柴人格斗 · 龙潭虎穴' } },
  { path: '/xifengkou', name: 'xifengkou', component: loadXifengkouPage, meta: { title: '喜峰口 · 大刀夜袭' } },
  { path: '/pet', name: 'pet', component: loadPetPage, meta: { title: '宠物模拟器 · 云养毛孩子' } },
  { path: '/emperor', name: 'emperor', component: loadEmperorPage, meta: { title: '皇帝模拟器 · 日理万机' } },
  { path: '/driving', name: 'driving', component: loadDrivingPage, meta: { title: '模拟驾驶 · 转弯掉头变道练习场' } },
  { path: '/secure-storage', name: 'secure-storage', component: loadSecureStoragePage, meta: { title: '端到端加密 · 云端密文存储' } },
  { path: '/subway', name: 'subway', component: loadSubwayPage, meta: { title: '北京地铁 · 站站距离' } },
  { path: '/countdown', name: 'countdown', component: loadCountdownPage, meta: { title: '人生倒计时 · 关键节点还剩多久' } },
  { path: '/weight', name: 'weight', component: loadWeightTrackerPage, meta: { title: '体重变化 · 趋势分析' } },
  { path: '/contemporary-figures', name: 'contemporary-figures', component: loadContemporaryFiguresPage, meta: { title: '当代人物追踪' } },
  { path: '/contemporary-figures/:id', name: 'contemporary-figure-detail', component: loadContemporaryFigureDetailPage, props: true, meta: { title: '当代人物追踪 · 详情' } },
  { path: '/biography', name: 'biography', component: loadBiographyPage, meta: { title: '人物生平 · 纪年查询' } },
  { path: '/career-roles', name: 'career-roles', component: loadCareerRolesPage, meta: { title: '现代职业 · 古代岗位' } },
  { path: '/dynasty-map', name: 'dynasty-map', component: loadDynastyMapPage, meta: { title: '历代地图 · 疆域城邑' } }
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
