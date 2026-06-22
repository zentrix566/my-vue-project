<script setup>
import { RouterLink } from 'vue-router'

// 功能页索引：以后新增页面只需在这里追加一项
const pages = [
  {
    to: '/jiangyin',
    title: '江阴保卫战 · 形势图',
    desc: '清军与江阴义军民两军交战路线图，点击箭头查看具体事件。',
    tag: '历史 · 互动地图'
  },
  {
    to: '/domino',
    title: '多米诺骨牌 · 沿路线连锁倒下',
    desc: '鼠标画一条路线生成骨牌，点推倒，连锁波顺着你画的曲线一节节倒下。',
    tag: '互动 · 动画'
  }
]
</script>

<template>
  <main class="home">
    <header class="hero">
      <h1>my-vue-project</h1>
      <p class="subtitle">zentrix566 的 Vue 前端页面集合</p>
    </header>

    <section class="grid">
      <RouterLink v-for="p in pages" :key="p.to" :to="p.to" class="card">
        <span class="tag">{{ p.tag }}</span>
        <h2>{{ p.title }}</h2>
        <p>{{ p.desc }}</p>
        <span class="arrow">进入 →</span>
      </RouterLink>
    </section>

    <footer class="foot">
      <span>© 2026 zentrix566</span>
    </footer>
  </main>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 64px 24px;
}

.hero h1 {
  margin: 0 0 8px;
  font-size: 36px;
  letter-spacing: 0.5px;
}

.subtitle {
  margin: 0 0 40px;
  color: var(--color-muted);
}

.grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.card {
  display: block;
  padding: 22px 22px 18px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  color: inherit;
  text-decoration: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  text-decoration: none;
}

.tag {
  display: inline-block;
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(47, 111, 237, 0.08);
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 10px;
}

.card h2 {
  margin: 0 0 6px;
  font-size: 18px;
}

.card p {
  margin: 0 0 14px;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.55;
}

.arrow {
  font-size: 13px;
  color: var(--color-primary);
}

.foot {
  margin-top: 60px;
  font-size: 12px;
  color: var(--color-muted);
  text-align: center;
}
</style>
