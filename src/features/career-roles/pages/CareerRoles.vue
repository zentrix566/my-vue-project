<template>
  <div class="page">
    <RouterLink to="/" class="back">← 返回主页</RouterLink>

    <header class="page-header">
      <h1>现代职业 · 古代岗位</h1>
      <p class="intro">
        今天的职业在古代叫什么、由谁来做？下面是预设对照，也可以自己输入一个现代行业或职业，让 AI 推想它在古代的对应岗位。
      </p>
    </header>

    <!-- AI 推想区 -->
    <section class="ai-panel">
      <h2>AI 推想</h2>
      <form class="search-bar" @submit.prevent="onAsk">
        <input
          v-model="query"
          type="text"
          placeholder="例如：外卖员、心理咨询师、电竞选手、产品经理"
          autocomplete="off"
          :disabled="loading"
        >
        <button type="submit" class="btn-primary" :disabled="loading || !query.trim()">
          {{ loading ? '推想中…' : '查古代对应' }}
        </button>
      </form>
      <p class="hint">由大模型根据社会职能推断，对应关系仅供趣味参考。</p>

      <div v-if="loading" class="loading">
        <span class="spinner"></span>
        <p>正在检索古代职官志，请稍候…</p>
      </div>

      <div v-else-if="error" class="error">
        <strong>推想失败</strong>
        <p>{{ error }}</p>
      </div>

      <article v-else-if="aiResult" class="ai-result">
        <div class="match-row">
          <div class="match-side ancient">
            <span v-if="aiResult.era" class="era-badge">{{ aiResult.era }}</span>
            <strong class="side-value">{{ aiResult.ancient }}</strong>
          </div>
          <div class="match-arrow">↔</div>
          <div class="match-side">
            <span class="side-label">现代职业</span>
            <strong class="side-value">{{ aiResult.modern || query }}</strong>
          </div>
        </div>
        <p v-if="aiResult.reason" class="reason">{{ aiResult.reason }}</p>
        <div v-if="aiResult.duties" class="duties">
          <span class="duties-label">主要职责</span>
          <p>{{ aiResult.duties }}</p>
        </div>
        <p v-if="aiResult.note" class="note">💡 {{ aiResult.note }}</p>
      </article>
    </section>

    <!-- 预设对照区 -->
    <section class="browse-section">
      <h2>预设对照</h2>

      <div class="filters">
        <div class="chips">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            class="chip"
            :class="{ active: activeCategory === cat.key }"
            @click="activeCategory = cat.key"
          >
            {{ cat.label }}
          </button>
        </div>
        <input
          v-model="keyword"
          type="search"
          class="keyword"
          placeholder="搜索职业或岗位…"
        >
      </div>

      <div class="grid">
        <article v-for="(p, idx) in filtered" :key="idx" class="role-card">
          <div class="match-row">
            <div class="match-side ancient">
              <span v-if="p.era && p.era !== '—'" class="era-badge">{{ p.era }}</span>
              <strong class="side-value">{{ p.ancient }}</strong>
            </div>
            <div class="match-arrow">↔</div>
            <div class="match-side">
              <span class="side-label">现代</span>
              <strong class="side-value">{{ p.modern }}</strong>
            </div>
          </div>
          <span class="cat-tag">{{ p.category }}</span>
          <p class="reason">{{ p.reason }}</p>
          <p v-if="p.note" class="note">💡 {{ p.note }}</p>
        </article>
      </div>

      <p v-if="!filtered.length" class="empty">没有匹配的职业，换个关键词试试。</p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { professions, categories } from '../data/professions.js'
import { fetchAncientRole } from '../ark.js'

const query = ref('')
const loading = ref(false)
const error = ref('')
const aiResult = ref(null)

const activeCategory = ref('all')
const keyword = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return professions.filter((p) => {
    if (activeCategory.value !== 'all' && p.category !== activeCategory.value) return false
    if (kw) {
      const haystack = `${p.modern} ${p.ancient} ${p.reason} ${p.note || ''}`.toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    return true
  })
})

async function onAsk() {
  const q = query.value.trim()
  if (!q || loading.value) return

  loading.value = true
  error.value = ''
  aiResult.value = null
  try {
    aiResult.value = await fetchAncientRole(q)
  } catch (err) {
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page {
  max-width: 920px;
  margin: 0 auto;
  padding: 32px 20px 60px;
}

.back:hover {
  text-decoration: underline;
}

.page-header {
  margin: 16px 0 28px;
}

.page-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.intro {
  color: var(--color-muted);
  margin: 0;
  line-height: 1.7;
}

/* ---- AI 推想区 ---- */
.ai-panel {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 24px;
  margin-bottom: 36px;
}

.ai-panel h2 {
  margin: 0 0 16px;
  font-size: 20px;
}

.search-bar {
  display: flex;
  gap: 10px;
}

.search-bar input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 15px;
  background: var(--color-bg);
  color: var(--color-text);
}

.search-bar input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: #fff;
  font-size: 15px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  color: var(--color-muted);
  font-size: 13px;
  margin: 10px 0 0;
}

.loading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  color: var(--color-muted);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error {
  margin-top: 18px;
  padding: 12px 16px;
  border-left: 4px solid var(--color-danger);
  background: rgba(212, 69, 47, 0.06);
  border-radius: 6px;
}

.error strong {
  display: block;
  margin-bottom: 4px;
}

.error p {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
}

.ai-result {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--color-border);
}

/* ---- 通用对照行 ---- */
.match-row {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.match-side {
  flex: 1;
  min-width: 0;
}

.match-side:first-child {
  text-align: right;
  padding-right: 36px;
}

.match-side:last-child {
  text-align: left;
  padding-left: 36px;
}

.side-label {
  display: block;
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.side-value {
  font-size: 20px;
}

.match-side.ancient .side-value {
  color: var(--color-primary);
}

.match-arrow {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  color: var(--color-muted);
}

.era-badge {
  display: block;
  width: fit-content;
  margin: 0 0 6px auto;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.reason {
  margin: 0 0 8px;
  line-height: 1.7;
  font-size: 14px;
}

.duties {
  margin: 12px 0;
  padding: 12px 14px;
  background: var(--color-bg);
  border-radius: 8px;
}

.duties-label {
  display: block;
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 4px;
}

.duties p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.note {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--color-muted);
  line-height: 1.6;
}

/* ---- 预设对照区 ---- */
.browse-section h2 {
  font-size: 20px;
  margin: 0 0 16px;
}

.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chip {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-card);
  color: var(--color-text);
  font-size: 13px;
  cursor: pointer;
}

.chip.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.keyword {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-card);
  color: var(--color-text);
  min-width: 200px;
}

.keyword:focus {
  outline: none;
  border-color: var(--color-primary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.role-card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 18px;
}

.role-card .match-row {
  margin-bottom: 10px;
}

.role-card .side-value {
  font-size: 18px;
}

.cat-tag {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(47, 111, 237, 0.08);
  border-radius: 6px;
  margin-bottom: 10px;
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 40px 0;
}

@media (max-width: 600px) {
  .search-bar {
    flex-direction: column;
  }

  .btn-primary {
    width: 100%;
  }

  .match-side:first-child {
    padding-right: 28px;
  }

  .match-side:last-child {
    padding-left: 28px;
  }

  .side-value {
    font-size: 17px;
  }

  .match-arrow {
    font-size: 18px;
  }
}
</style>
