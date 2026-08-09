<template>
  <div class="home">
    <h1>Zentrix 个人小游戏合集</h1>
    <p class="subtitle">几个用 Vue 写的小玩具，点开即玩。</p>
    <div class="cards">
      <RouterLink class="card" to="/worldcup">
        <div class="emoji">⚽</div>
        <h2>世界杯 · 点球大战</h2>
        <p>拖拽调整角度和力度，10 次射门挑战 AI 守门员。</p>
      </RouterLink>
      <RouterLink class="card" to="/jiangyin">
        <div class="emoji">🗺️</div>
        <h2>江阴保卫战 · 形势图</h2>
        <p>清军与义军交战路线互动地图，点箭头看事件。</p>
      </RouterLink>
      <RouterLink class="card" to="/interval-training">
        <div class="emoji">🏃</div>
        <h2>400 米间歇训练</h2>
        <p>配速趋势、评级、日历与导入导出的跑步数据看板。</p>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// 首页：三个小游戏的入口卡片
</script>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
}

.subtitle {
  color: var(--color-muted);
  margin-top: -8px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 24px;
  color: var(--color-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

.card .emoji {
  font-size: 36px;
}

.card h2 {
  font-size: 18px;
  margin: 12px 0 8px;
}

.card p {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0;
}
</style>
