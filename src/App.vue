<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="nav-container" aria-label="主导航">
        <ul class="nav-links">
          <li><RouterLink to="/worldcup">世界杯点球大战</RouterLink></li>
          <li><RouterLink to="/jiangyin">江阴保卫战</RouterLink></li>
          <li><RouterLink to="/interval-training">400 米间歇训练</RouterLink></li>
          <li><RouterLink to="/domino">多米诺骨牌</RouterLink></li>
          <li><RouterLink to="/calligraphy">毛笔书法</RouterLink></li>
          <li><RouterLink to="/officials">官职对比</RouterLink></li>
          <li><RouterLink to="/nexus">炉石脸伤</RouterLink></li>
        </ul>
      </nav>
    </header>
    <main class="main-content">
      <RouterView />
    </main>
    <footer class="site-footer">
      <p>© {{ year }} Zentrix. 个人小游戏合集。</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const year = new Date().getFullYear()
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-header {
  background: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.nav-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: 18px;
  margin: 0;
  padding: 0;
  flex-wrap: wrap;
}

.nav-links a {
  color: var(--color-text);
  font-size: 15px;
}

.nav-links a.router-link-active {
  color: var(--color-primary);
  font-weight: 600;
}

.main-content {
  flex: 1;
  width: 100%;
}

.site-footer {
  text-align: center;
  color: var(--color-muted);
  font-size: 13px;
  padding: 16px;
}
</style>
