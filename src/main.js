import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import JiangyinBattle from './views/JiangyinBattle.vue'

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
    }
  ]
})

router.afterEach((to) => {
  if (to.meta?.title) {
    document.title = `${to.meta.title} · my-vue-project`
  }
})

createApp(App).use(router).mount('#app')
