# Zentrix 小游戏合集

几个用 Vue 3 写的个人小玩具，统一收拢在这个站点里，点开即玩。从原 `my-index` 个人索引站迁移而来，独立成仓库便于单独维护。

## 主要功能

- **世界杯 · 点球大战（`/worldcup`）**：俯视点球点近景，拖拽调整角度和力度射门，10 次挑战 AI 守门员。
- **江阴保卫战 · 形势图（`/jiangyin`）**：清军与义军交战路线互动地图，点箭头看具体事件与经过。
- **400 米间歇训练（`/interval-training`）**：配速趋势图、评级、日历与导入导出。

## 运行方式

安装依赖：

```bash
npm install
```

启动开发服务器（默认 http://localhost:5174）：

```bash
npm run dev
```

构建生产产物（输出到 `dist/`）：

```bash
npm run build
```

本地预览构建产物：

```bash
npm run preview
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm install` | 安装项目依赖 |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览构建产物 |

## 目录结构

```
my-vue-project/
├─ index.html              页面入口
├─ vite.config.js         Vite 配置
├─ src/
│  ├─ main.js             应用入口，挂载路由
│  ├─ App.vue             站点外壳（导航 + 路由出口）
│  ├─ styles.css          全局样式与 CSS 变量
│  ├─ router/index.js     路由定义（三个功能懒加载）
│  ├─ views/Home.vue      首页入口卡片
│  └─ features/           各小游戏功能
│     ├─ world-cup/       世界杯点球大战
│     ├─ jiangyin/        江阴保卫战形势图
│     └─ interval-training/ 400 米间歇训练
└─ README.md / LICENSE / .gitignore
```

> 说明：江阴保卫战的底图托管在 OSS，原站通过服务端反代 `/site-assets/jiangyin-map.webp` 提供；本纯前端工程无后端反代，缺图时组件会自动回退到纯色衬底，互动箭头与事件仍可正常使用。

## 作者

zentrix566

## 许可证

本项目基于 [MIT](./LICENSE) 许可证开源。
