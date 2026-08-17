<template>
  <div class="changelog-page">
    <div class="wrap">
      <RouterLink class="back" to="/">← 返回主页</RouterLink>
      <header class="page-head">
        <h1>更新日志 · Changelog</h1>
        <p>项目主要功能与数据更新，按提交日期整理，每天一条。</p>
      </header>
      <section v-for="entry in changelog" :key="entry.date" class="entry">
        <div class="entry-head">
          <span class="date">{{ entry.date }}</span>
          <h2>{{ entry.title }}</h2>
        </div>
        <ul class="changes">
          <li v-for="(c, i) in entry.changes" :key="i">{{ c }}</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { changelog } from '../data/changelog.js'
</script>

<style scoped>
.changelog-page {
  min-height: calc(100vh - 137px);
  padding: 28px 20px 48px;
  background: var(--bg);
}

.wrap {
  max-width: 860px;
  margin: 0 auto;
}

.back {
  display: inline-block;
  color: var(--color-muted);
  text-decoration: none;
  font-weight: 700;
  margin-bottom: 18px;
}

.back:hover {
  color: var(--primary);
}

.page-head {
  margin-bottom: 28px;
}

.page-head h1 {
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 0 0 8px;
  color: var(--color-text);
}

.page-head p {
  color: var(--color-muted);
  margin: 0;
}

.entry {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 22px 24px;
  margin-bottom: 18px;
}

.entry-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.date {
  background: var(--surface-soft);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  font-size: 0.85rem;
  font-weight: 800;
  padding: 4px 12px;
  white-space: nowrap;
}

.entry-head h2 {
  font-size: 1.2rem;
  margin: 0;
  color: var(--color-text);
}

.changes {
  margin: 0;
  padding-left: 20px;
  color: var(--color-muted);
  line-height: 1.75;
}

.changes li {
  margin-bottom: 6px;
}
</style>
