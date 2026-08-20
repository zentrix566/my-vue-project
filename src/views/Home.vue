<template>
  <div class="page home">
    <h1 class="page-title">zentrix566 的小玩具</h1>
    <p class="page-subtitle">几个用 Vue 写的小玩具，点开即玩。</p>
    <div class="cards">
      <RouterLink
        v-for="f in homeCards"
        :key="f.slug"
        class="card"
        :to="f.routes[0].path"
      >
        <div class="emoji">{{ f.emoji }}</div>
        <h2>{{ f.title }}</h2>
        <p>{{ f.description }}</p>
      </RouterLink>
      <RouterLink class="card" to="/changelog">
        <div class="emoji">📋</div>
        <h2>更新日志 · Changelog</h2>
        <p>项目主要功能与数据更新记录，按提交日期整理，每天一条。</p>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// 首页：各子项目入口卡片由 registry 的 homeCards 自动生成，
// 新增子项目无需在此手写卡片，只需在其 index.js 的 manifest 里填好
// emoji / title / description（card:false 可隐藏卡片但保留路由）。
import { homeCards } from '../features/registry.js'
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.card .emoji {
  font-size: 36px;
}

.card h2 {
  font-size: 18px;
  margin: 12px 0 8px;
}

.card p {
  color: var(--muted);
  font-size: 14px;
  margin: 0;
}
</style>
