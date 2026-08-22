// 虚拟博物馆：按编年体把文物放回历史场景的沉浸式展厅页（/museum）。
// 数据结构：data/artifacts.json = { halls: { <eraKey>: { scene, greeting } }, artifacts: [...] }，
// artifact 的 eraKey 与 chineseHistory.json 的 era.key 对齐，relateTo 人名须存在于 personDetails.json。
//
// 跨 feature 依赖（共享模块）：页面只读 import 了 ../history-timeline/data/ 下的
// chineseHistory.json（朝代骨架/朝代色/同期事件/同期人物）与 personDetails.json（人物生卒与摘要）。
// 复制本 feature 到其它项目时需一并搬运这两个 JSON。
export default {
  slug: 'virtual-museum',
  title: '虚拟博物馆·文物编年',
  emoji: '🏺',
  description: '按编年体逛 17 座朝代展厅：文物放回真实场景，同步同期大事与人物，支持盖章打卡。',
  order: 15,
  routes: [
    {
      path: '/museum',
      name: 'museum',
      loader: () => import('./pages/Museum.vue'),
      meta: { title: '虚拟博物馆 · 文物编年' }
    }
  ]
}
