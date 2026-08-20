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
const year = new Date().getFullYear()
</script>
