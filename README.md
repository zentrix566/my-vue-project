# my-vue-project

> zentrix566 的 Vue 前端页面集合：主页 + 一系列功能页面，统一以 Vue Router 组织。

## 主要功能

- **主页（`/`）**：展示所有功能页的入口卡片，未来新增页面只需在 `src/views/Home.vue` 的 `pages` 数组里追加一项即可
- **江阴保卫战 · 形势图（`/jiangyin`）**：以古风地图为底，叠加 SVG 虚线箭头表示交战双方进军方向
  - 蓝色虚线：江阴义军民（阎应元 / 陈明遇）
  - 红色虚线：清军（博洛 / 刘良佐）
  - 点击任意一条箭头任意位置，会在点击位置弹出对应历史事件详情
- **多米诺骨牌 · 沿路线连锁倒下（`/domino`）**：在画布区按住鼠标画一条路线，松手沿路线生成骨牌，点「推倒」让连锁波顺着曲线一节节传播
  - 鼠标自由绘制任意路线（直线、曲线、回环都行），松手即按路线等间距摆放骨牌
  - 可调间距（18~60px），间距越小骨牌越密、数量越多
  - 俯视视角：每块骨牌横跨路线站立，被触发后向前扑倒并伸长扑向下一块
  - 倒下音效：用 Web Audio API 实时合成木质敲击声（无需音频文件），音高随序号轻微上行，连锁起来有旋律感，可一键静音
  - 实时显示已生成块数与已倒下数量，倒完可「推倒」重来或「重画」换路线

## 目录结构

```
my-vue-project/
├─ public/                 静态资源（把江阴地图存为 public/jiangyin-map.png 即生效）
├─ src/
│  ├─ views/               页面组件（每个功能页对应一个 .vue 文件）
│  │  ├─ Home.vue          主页
│  │  ├─ JiangyinBattle.vue 江阴保卫战形势图
│  │  └─ DominoFall.vue     多米诺骨牌连锁倒下
│  ├─ styles/global.css    全局样式
│  ├─ App.vue              路由出口
│  └─ main.js              应用入口与路由配置
├─ index.html
├─ vite.config.js
├─ package.json
├─ LICENSE
└─ README.md
```

## 运行

安装依赖：

```bash
npm install
```

启动开发服务器（默认 http://localhost:5173 ）：

```bash
npm run dev
```

打包生产产物到 `dist/`：

```bash
npm run build
```

预览打包后的产物：

```bash
npm run preview
```

## 常用命令

- `npm run dev`：启动 Vite 本地开发服务器，支持热更新
- `npm run build`：构建生产环境静态文件
- `npm run preview`：本地预览构建产物，常用于上线前自测

## 替换江阴地图底图

页面默认会读取 `public/jiangyin-map.png` 作为底图，缺图时使用纯色衬底但箭头依然可点。把你那张古风地图保存为该文件名放到 `public/` 下即可：

```
public/jiangyin-map.png
```

如需调整箭头位置：编辑 `src/views/JiangyinBattle.vue` 中的 `routes` 数组里的 `path`（SVG path 语法），以及 `places` 数组里的地名坐标（viewBox 为 `1000 × 900`）。

## 新增功能页

1. 在 `src/views/` 下新建 `XXX.vue`
2. 在 `src/main.js` 的 `routes` 中追加一条路由
3. 在 `src/views/Home.vue` 的 `pages` 数组里追加一张卡片

## 作者

zentrix566

## 许可证

[MIT](./LICENSE)
