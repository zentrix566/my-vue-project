import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import JiangyinBattle from './views/JiangyinBattle.vue'
import DominoFall from './views/DominoFall.vue'
import BrushCalligraphy from './views/BrushCalligraphy.vue'
import OfficialComparison from './views/OfficialComparison.vue'

import './styles/global.css'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: '主页' } },
    {
      path: '/jiangyin',
      name: 'jiangyin',
      component: JiangyinBattle,
      meta: { title: '江阴保卫战 · 形势图' }
    },
    {
      path: '/domino',
      name: 'domino',
      component: DominoFall,
      meta: { title: '多米诺骨牌 · 沿路线连锁倒下' }
    },
    {
      path: '/calligraphy',
      name: 'calligraphy',
      component: BrushCalligraphy,
      meta: { title: '毛笔书法 · 停笔 2 秒自动优化' }
    },
    {
      path: '/officials',
      name: 'officials',
      component: OfficialComparison,
      meta: { title: '中国官职 · 古今对比' }
    }
  ]
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} · my-vue-project`
  }
})

createApp(App).use(router).mount('#app')
