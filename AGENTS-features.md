# AGENTS-features.md

本文件指导 AI（或人类协作者）如何在本仓库**新增一个子项目（feature）**，以及**如何把一个子项目整体复制到另一个项目**。改动前请通读本文件。

> 根目录的 `AGENTS.md` 只讲 `history-timeline` 这一支的**数据结构**；本文件讲**所有** feature 的**通用接入约定**。两者不冲突：往 history-timeline 里加人物/皇帝走 `AGENTS.md`，新增一个全新 feature 走本文件。

---

## 一、核心原则：子项目只活在 `src/features/<slug>/` 里

- 每个子项目（世界杯、江阴、历史时间轴……）都是一个**自包含文件夹**，统一放在 `src/features/<slug>/`。
- `slug` 用小写英文/连字符（如 `world-cup`、`history-timeline`），全局唯一，同时作为路由锚点。
- **严禁**把子项目的页面/数据/组件散落到 `src/features/` 之外——不要新建顶层目录、不要改 `src/main.js`、不要改 `src/App.vue`、不要改 `src/router/index.js` 和 `src/views/Home.vue` 里的路由/卡片清单。
- 注册是**自动**的：路由与首页卡片都由 `src/features/registry.js` 从各 `index.js` 的 manifest 聚合生成。**新增子项目不需要改任何目录外的文件。** 这就是「不要在目录外加，在某个地方加」的含义——那个「地方」就是 `src/features/<slug>/`。

---

## 二、manifest 契约（每个 `feature/index.js` 必须默认导出）

```js
// src/features/<slug>/index.js
export default {
  slug: 'world-cup',            // 必填，与文件夹名一致，全局唯一
  title: '世界杯·点球大战',      // 必填，首页卡片标题
  emoji: '⚽',                   // 必填，首页卡片图标
  description: '拖拽调整角度……',  // 必填，首页卡片简介（一句话）
  order: 220,                   // 选填，首页/下拉排序，越小越靠前；缺省 1000
  card: true,                   // 选填，false 则首页不显示卡片（仅留路由）；默认显示
  routes: [                     // 必填，至少一条
    {
      path: '/worldcup',                              // 路由路径，全局唯一
      name: 'worldcup',                              // 路由名，全局唯一
      loader: () => import('./pages/WorldCupKick.vue'), // 懒加载页面，勿静态 import 进主包
      meta: { title: '世界杯 · 点球大战' },          // 浏览器标签标题
      props: true                                    // 选填，动态路由（含 :id）时加
    }
  ]
}
```

约定：

- 页面文件放 `src/features/<slug>/pages/`，用懒加载 `() => import('./pages/Xxx.vue')`，不要静态 `import` 进主包（保持首屏小）。
- 数据 / 组件 / 组合式函数 / 样式都放本文件夹内（`data/`、`components/`、`composables/`、`utils/`、`*.css`），互不串门。
- 第一条 `routes` 应是该子项目的「主入口页」，首页卡片会链接到 `routes[0].path`。
- 只有「纯详情页」之类不需要首页入口的子项目，才设 `card: false`。

---

## 三、新增一个子项目（最常见）

1. 在 `src/features/` 下新建文件夹 `<slug>/`。
2. 写 `src/features/<slug>/index.js`，默认导出上面的 manifest（`routes[0].loader` 指向 `./pages/Xxx.vue`）。
3. 写页面 `src/features/<slug>/pages/Xxx.vue`（按需加 `data/`、`components/` 等）。
4. **完事。** 不要去动 `src/router/index.js`、`src/views/Home.vue`、`src/main.js`、`src/App.vue`——`registry.js` 会自动把它们收进路由与首页卡片。
5. 验证：见第五节。

> 若子项目需要大模型能力（见第四节「跨项目依赖」），额外准备 LLM 接入。

---

## 四、把一个子项目复制到另一个项目

`src/features/<slug>/` 是自包含的，复制 = 整文件夹搬运。但先排查依赖：

1. 复制整个 `src/features/<slug>/` 文件夹到目标项目的 `src/features/`。
2. 查依赖（用 grep 扫本文件夹内的 import）：
   - **大模型（LLM）依赖**：若文件夹里有 `ark.js`，或 `index.js` / 页面里 `import` 了 `virtual:llm-config` / `src/lib/llm.js` / 调用了 `/ark-api`。这类子项目需要目标项目也具备：
     - `vite.config.js` 里的 `llmConfigPlugin` + `/ark-api` 代理（见本仓库 `vite.config.js`）；
     - `src/lib/llm.js`；
     - 环境变量 `HUOSHAN_KEY`/`ARK_API_KEY` 或 `DEEPSEEK_KEY`/`DEEPSEEK_API_KEY`（目标项目需有 `.env` 与 `.env.example`，**密钥绝不进版本库**）。
     缺任何一项，把对应文件 / 配置一并搬过去。
   - **共享模块依赖**：若 `import` 了本文件夹之外的东西（`src/data/`、`src/lib/`（非 llm）、其它 feature 的组件、`src/styles.css` / `src/global.css` 的 CSS 变量）。把这些也一并复制或在目标项目里补齐；全局样式变量（如 `--muted`）来自 `src/styles.css` / `src/global.css`，目标项目需保留。
   - 其余情况（纯自包含、只用到 `vue` / `echarts` 等顶层依赖）：直接复制即可。
3. 改 `slug`：确认目标项目 `src/features/` 下没有同名，避免冲突；必要时改文件夹名 + manifest 的 `slug` + 路由 `path` / `name`。
4. 目标项目必须也有 `src/features/registry.js` 且 router / Home 走自动聚合（见下「目标项目尚无 registry 时的移植」）。若没有，把本仓库的 `registry.js` + router / Home 的两行自动加载逻辑搬过去。
5. 验证：见第五节。

### 目标项目尚无 registry / 自动聚合时的移植

把本仓库以下三处原样搬过去，即可获得「新增子项目零目录外改动」的能力：

- `src/features/registry.js`（自动发现全部 `./ */index.js` 的 manifest，导出 `features` / `homeCards` / `buildFeatureRoutes()`）；
- `src/router/index.js` 用 `...buildFeatureRoutes()` 拼路由（保留 `/` 与 `/changelog` 手动路由）；
- `src/views/Home.vue` 用 `homeCards` 通过 `v-for` 渲染卡片（保留 changelog 卡片）。

具体代码以本仓库这两个文件的当前实现为准。

---

## 五、验证

```bash
npm install   # 若目标项目缺依赖
npm run build # 必须零错误；若有动态路由 / 懒加载告警需排查
npm run dev   # 打开 http://localhost:5173/<slug路径> 看页面与首页卡片
```

---

## 六、registry.js 工作原理（备查，不必改）

`src/features/registry.js`：

```js
const modules = import.meta.glob('./*/index.js', { eager: true })
export const features = Object.values(modules)
  .map((m) => m.default)
  .filter((m) => m && m.slug && Array.isArray(m.routes))
  .sort((a, b) => (a.order ?? 1000) - (b.order ?? 1000))
export const homeCards = features.filter((f) => f.card !== false)
export function buildFeatureRoutes() {
  return features.flatMap((feature) =>
    feature.routes.map(({ loader, ...route }) => ({ ...route, component: loader }))
  )
}
```

- 用 eager 导入是为了在启动时拿到元信息（标题 / 路径 / 排序）；
- 页面组件仍是 `() => import(...)` 懒加载，不会被打进主包。
