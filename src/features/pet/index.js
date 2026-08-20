export default {
  slug: 'pet',
  title: '宠物模拟器·云养毛孩子',
  emoji: '🐾',
  description: '养一只哈基米、大狗、兔子或仓鼠：喂食、陪玩、洗澡、哄睡，四项状态随时间变化，逗宠小游戏赚金币，升级解锁。',
  order: 150,
  routes: [
    {
      path: '/pet',
      name: 'pet',
      loader: () => import('./pages/PetSimulator.vue'),
      meta: { title: '宠物模拟器 · 云养毛孩子' }
    }
  ]
}
