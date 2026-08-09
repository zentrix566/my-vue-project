<template>
  <div class="home">
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
      <RouterLink class="card" to="/domino">
        <div class="emoji">🎴</div>
        <h2>多米诺骨牌 · 连锁倒下</h2>
        <p>鼠标画一条路线生成骨牌，点推倒，连锁波沿曲线一节节倒下。</p>
      </RouterLink>
      <RouterLink class="card" to="/calligraphy">
        <div class="emoji">✒️</div>
        <h2>毛笔书法 · 停笔自动优化</h2>
        <p>宣纸上书写，停笔 2 秒自动优化成大师笔法，可向标准字形靠拢。</p>
      </RouterLink>
      <RouterLink class="card" to="/officials">
        <div class="emoji">⚖️</div>
        <h2>中国官职 · 古今对比</h2>
        <p>以现代行政级别为轴，横向对比各王朝相当官职，支持王朝、级别筛选。</p>
      </RouterLink>
      <RouterLink class="card" to="/nexus">
        <div class="emoji">🔮</div>
        <h2>炉石魔网 · 脸伤计算器</h2>
        <p>输入法强与场上怪血量，模拟随机砸怪溢出，算脸伤期望、最大最小与分布。</p>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// 首页：各小功能的入口卡片
</script>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
}

.subtitle {
  color: var(--color-muted);
  margin-top: 0;
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
