# 个人小游戏合集

几个用 Vue 3 写的个人小玩具，统一收拢在这个站点里，点开即玩。从原 `my-index` 个人索引站迁移而来，独立成仓库便于单独维护。

## 主要功能

- **世界杯 · 点球大战（`/worldcup`）**：俯视点球点近景，拖拽调整角度和力度射门，10 次挑战 AI 守门员。
- **江阴保卫战 · 形势图（`/jiangyin`）**：清军与义军交战路线互动地图，点箭头看具体事件与经过。
- **400 米间歇训练（`/interval-training`）**：配速趋势图、评级、日历与导入导出。
- **多米诺骨牌（`/domino`）**：鼠标画一条路线生成骨牌，点推倒，连锁波沿曲线一节节倒下。
- **毛笔书法（`/calligraphy`）**：宣纸上书写，停笔 2 秒自动优化成大师笔法，可向标准字形靠拢。
- **中国官职 · 古今对比（`/officials`）**：以现代行政级别为轴，横向对比各王朝相当官职，支持王朝、级别筛选。
- **炉石魔网 · 脸伤计算器（`/nexus`）**：输入法强与场上怪血量，模拟随机砸怪溢出，算脸伤期望、最大最小与分布。
- **擂台投注 · 火柴人格斗（`/fight`）**：红蓝火柴人逐招对打（直拳、重拳、上勾拳、扫堂腿、飞踢，怒气满放波动拳），带暴击、闪避、击倒与伤害飘字；下注猜胜者赢双倍，快速投注模式可自动连打，统计多少轮把本金输光。
- **中国历史 · 风流人物长卷（`/history`）**：从炎黄传说到当代的横轴时间轴，覆盖 23 个时期、约 340 位风流人物；支持"按时长/等宽"两种比例、人名与事迹搜索，点击人物或朝代色带查看详情。

## 运行方式

安装依赖：

```bash
npm install
```

启动开发服务器（默认 http://localhost:5173）：

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
│  ├─ App.vue             站点外壳（zentrix566 标识 + 路由出口）
│  ├─ styles.css          全局样式与 CSS 变量
│  ├─ global.css          间歇训练看板等组件的排版样式
│  ├─ router/index.js     路由定义（九个功能懒加载）
│  ├─ views/Home.vue      首页入口卡片
│  └─ features/           各小游戏功能
│     ├─ world-cup/          世界杯点球大战
│     ├─ jiangyin/           江阴保卫战形势图
│     ├─ interval-training/  400 米间歇训练
│     ├─ domino/             多米诺骨牌
│     ├─ calligraphy/        毛笔书法
│     ├─ officials/          中国官职古今对比
│     ├─ nexus/              炉石魔网脸伤计算器
│     ├─ fight/              擂台投注小人打架
│     └─ history-timeline/   中国历史风流人物长卷（数据 + 时间轴页）
├─ public/
│  └─ jiangyin-map.png    江阴保卫战底图
└─ README.md / LICENSE / .gitignore
```

> 说明：江阴保卫战的底图放在 `public/jiangyin-map.png`，前端以 `/jiangyin-map.png` 直接引用；缺图时组件会自动回退到纯色衬底，互动箭头与事件仍可正常使用。

## 作者

zentrix566

## 许可证

本项目基于 [MIT](./LICENSE) 许可证开源。
