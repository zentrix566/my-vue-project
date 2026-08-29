export default {
  slug: 'office-chat',
  title: 'AI 公司·摸鱼群聊',
  emoji: '🏢',
  description: '十位 AI 人设员工在公司群里自动开聊：老板画饼、产品改需求、程序员救火，办公室谁说话谁冒泡。',
  order: 130,
  routes: [
    {
      path: '/office-chat',
      name: 'office-chat',
      loader: () => import('./pages/OfficeChat.vue'),
      meta: { title: 'AI 公司 · 摸鱼群聊' }
    }
  ]
}
