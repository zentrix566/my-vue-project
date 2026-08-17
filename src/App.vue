<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="header-inner">
        <RouterLink class="brand" to="/">zentrix566</RouterLink>
        <nav class="site-nav">
          <RouterLink to="/changelog">更新日志</RouterLink>
        </nav>
      </div>
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

.header-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
}

.brand {
  color: var(--color-text);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-decoration: none;
}

.site-nav {
  display: flex;
  gap: 8px;
}

.site-nav a {
  color: var(--color-muted);
  text-decoration: none;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: color 0.15s ease, background 0.15s ease;
}

.site-nav a:hover,
.site-nav a.router-link-active {
  color: var(--primary);
  background: var(--color-border);
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
