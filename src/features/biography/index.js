export default {
  slug: 'biography',
  title: '人物生平·纪年查询',
  emoji: '📖',
  description: '输入历史人物姓名，输出姓名（生卒年）、主要事迹及当时年纪、死亡原因与享年，由大模型整理年谱。',
  order: 40,
  routes: [
    {
      path: '/biography',
      name: 'biography',
      loader: () => import('./pages/Biography.vue'),
      meta: { title: '人物生平 · 纪年查询' }
    }
  ]
}
