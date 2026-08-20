export default {
  slug: 'stick-fight',
  title: '火柴人格斗·龙潭虎穴',
  emoji: '🥋',
  description: '火柴人连闯六个房间：三段拳脚连击、飞踢、翻滚闪避加炸药包，红色血液四溅，清空敌人开门突入。',
  order: 140,
  routes: [
    {
      path: '/stickfight',
      name: 'stickfight',
      loader: () => import('./pages/StickFight.vue'),
      meta: { title: '火柴人格斗 · 龙潭虎穴' }
    }
  ]
}
