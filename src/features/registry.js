// 自动发现并聚合所有 feature 的 manifest。
// 每个 feature 在自己的 index.js 里默认导出一个 manifest（见 AGENTS-features.md），
// 路由和首页卡片都从这里生成，新增 feature 无需在目录外任何地方注册。
//
// 用 eager 导入是为了在启动时拿到元信息（标题/路径/排序），
// 但页面组件仍是 `() => import(...)` 懒加载，不会被打进主包。
const modules = import.meta.glob('./*/index.js', { eager: true })

export const features = Object.values(modules)
  .map((m) => m.default)
  .filter((m) => m && m.slug && Array.isArray(m.routes))
  .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000))

// 首页卡片：默认展示，manifest 里 card:false 可隐藏（如纯详情页路由）
export const homeCards = features.filter((f) => f.card !== false)

// 展开成 vue-router 路由记录
export function buildFeatureRoutes() {
  return features.flatMap((feature) =>
    feature.routes.map(({ loader, ...route }) => ({
      ...route,
      component: loader
    }))
  )
}
