<template>
  <div class="page home">
    <h1 class="page-title">
      zentrix566 的小玩具
      <span class="count-badge">{{ homeCards.length }}</span>
    </h1>
    <p class="page-subtitle">按用途整理的小玩具，点开即玩。</p>
    <nav class="category-nav" aria-label="首页分类">
      <a v-for="category in categories" :key="category.key" :href="`#${category.key}`">{{ category.name }}</a>
    </nav>
    <section v-for="category in visibleCategories" :id="category.key" :key="category.key" class="category-section">
      <div class="category-heading">
        <span>{{ category.emoji }}</span>
        <h2>{{ category.name }}</h2>
        <small>{{ category.cards.length }} 项</small>
      </div>
      <div class="cards">
        <RouterLink
          v-for="f in category.cards"
          :key="f.slug"
          class="card"
          :to="f.routes[0].path"
        >
          <div class="emoji">{{ f.emoji }}</div>
          <h3>{{ f.title }}</h3>
          <p>{{ f.description }}</p>
        </RouterLink>
      </div>
    </section>
    <section class="category-section">
      <div class="category-heading">
        <span>📋</span>
        <h2>项目记录</h2>
      </div>
      <div class="cards">
      <RouterLink class="card" to="/changelog">
        <div class="emoji">📋</div>
        <h3>更新日志 · Changelog</h3>
        <p>项目主要功能与数据更新记录，按提交日期整理，每天一条。</p>
      </RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
// 首页：各子项目入口卡片由 registry 的 homeCards 自动生成，
// 新增子项目无需在此手写卡片，只需在其 index.js 的 manifest 里填好
// emoji / title / description（card:false 可隐藏卡片但保留路由）。
import { computed } from 'vue'
import { homeCards } from '../features/registry.js'

// 首页分类特意在这里静态维护：调整归属只需改 slug，不影响 feature 的自动注册和路由。
const categories = [
  { key: 'favorites', name: '收藏', emoji: '★', slugs: ['history-timeline', 'biography', 'dynasty-map', 'subway', 'weight-tracker'] },
  { key: 'history', name: '历史', emoji: '🏛️', slugs: ['virtual-museum', 'officials', 'career-roles', 'contemporary-figures', 'jiangyin', 'xifengkou'] },
  { key: 'games', name: '游戏', emoji: '🎮', slugs: ['jungle-chess', 'huapian', 'game-show', 'card-battle', 'emperor', 'minister', 'pet', 'stick-fight', 'fight', 'world-cup', 'canghai', 'domino', 'sand-pit', 'driving', 'transformer'] },
  { key: 'life-tools', name: '生活与工具', emoji: '🧰', slugs: ['interval-training', 'countdown', 'creator-hall', 'secure-storage', 'calligraphy', 'nexus', 'office-chat'] }
]

const visibleCategories = computed(() => {
  const cards = new Map(homeCards.map((card) => [card.slug, card]))
  const assigned = new Set(categories.flatMap((category) => category.slugs))
  const grouped = categories
    .map((category) => ({ ...category, cards: category.slugs.map((slug) => cards.get(slug)).filter(Boolean) }))
    .filter((category) => category.cards.length)
  const remaining = homeCards.filter((card) => !assigned.has(card.slug))
  return remaining.length ? [...grouped, { key: 'other', name: '其他', emoji: '🧩', cards: remaining }] : grouped
})
</script>

<style scoped>
.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  border-radius: var(--radius-pill);
  background: var(--primary-soft);
  color: var(--primary-dark);
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0;
}

.category-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
}

.category-nav a {
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--muted);
  font-size: 0.88rem;
  font-weight: 700;
  padding: 6px 11px;
  text-decoration: none;
}

.category-nav a:hover {
  background: var(--primary-soft);
  color: var(--primary-dark);
}

.category-section {
  margin-top: 34px;
  scroll-margin-top: 20px;
}

.category-heading {
  align-items: center;
  display: flex;
  gap: 8px;
}

.category-heading h2 {
  font-size: 1.22rem;
  margin: 0;
}

.category-heading small {
  color: var(--muted);
  font-size: 0.78rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.card .emoji {
  font-size: 36px;
}

.card h3 {
  font-size: 18px;
  margin: 12px 0 8px;
}

.card p {
  color: var(--muted);
  font-size: 14px;
  margin: 0;
}
</style>
