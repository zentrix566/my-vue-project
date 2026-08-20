export default {
  slug: 'emperor',
  title: '皇帝模拟器·日理万机',
  emoji: '🐉',
  description: '拟年号登基，每月朱批奏折：赈灾、边患、党争、选秀。国库民心军力朝纲圣躬五端须平衡，盖棺论定看谥号。',
  order: 100,
  routes: [
    {
      path: '/emperor',
      name: 'emperor',
      loader: () => import('./pages/EmperorSim.vue'),
      meta: { title: '皇帝模拟器 · 日理万机' }
    }
  ]
}
