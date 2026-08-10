<template>
  <div class="app-shell">
    <header class="site-header">
      <RouterLink class="brand" to="/">zentrix566</RouterLink>
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

.brand {
  display: block;
  max-width: 960px;
  margin: 0 auto;
  padding: 14px 20px;
  color: var(--color-text);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-decoration: none;
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
