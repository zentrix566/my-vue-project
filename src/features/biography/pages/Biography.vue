<template>
  <section class="section page-section biography-page">
    <div class="container biography-container">
      <header class="biography-header">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Biography</p>
        <h1>人物生平 · 纪年查询</h1>
        <p>输入历史人物姓名，输出可直接复制的纯文本年谱：生卒年、主要事迹及当时年纪、死因与终年。</p>
      </header>

      <form class="biography-search" @submit.prevent="onSearch">
        <input
          v-model="name"
          type="text"
          placeholder="例如：苏武、霍成君、苏轼、王阳明"
          autocomplete="off"
          :disabled="loading"
        >
        <button type="submit" class="button" :disabled="loading || !name.trim()">
          {{ loading ? '查询中…' : '查询' }}
        </button>
      </form>

      <div v-if="loading" class="biography-loading">
        <span class="biography-spinner"></span>
        <p>正在翻检史料，请稍候…</p>
      </div>

      <div v-else-if="error" class="biography-error">
        <strong>查询失败</strong>
        <p>{{ error }}</p>
      </div>

      <div v-else-if="result || sources.length || modelError" class="biography-result">
        <!-- 模型生成被拦截提示（检索数据正常时也要展示来源） -->
        <div v-if="modelError" class="biography-model-error">
          <strong>⚠ 年谱生成被拦截</strong>
          <p>{{ modelError }}</p>
          <p class="biography-model-error-hint">检索数据已正常获取（见下方参考来源），点击标题可查看原始词条全文。</p>
        </div>

        <template v-if="result">
          <div class="biography-result-head">
            <span class="biography-result-label">生平年谱（可直接复制）</span>
            <button type="button" class="button biography-copy-btn" @click="copyResult">
              {{ copied ? '已复制 ✓' : '复制全文' }}
            </button>
          </div>
          <textarea
            ref="resultText"
            readonly
            :value="result"
            class="biography-text"
            rows="6"
          ></textarea>
        </template>

        <div v-if="searchError" class="biography-search-error">
          <strong>⚠ 检索来源失败</strong>
          <p>{{ searchError }}</p>
        </div>

        <div v-if="sources.length" class="biography-sources">
          <button type="button" class="biography-sources-toggle" @click="sourcesOpen = !sourcesOpen">
            <span>参考来源（{{ sources.length }} 条）</span>
            <span class="biography-sources-caret" :class="{ open: sourcesOpen }">▸</span>
          </button>
          <ul v-show="sourcesOpen" class="biography-sources-list">
            <li v-for="(s, i) in sources" :key="i" class="biography-source-item">
              <div class="biography-source-title">
                <span class="biography-source-tag">{{ s.source }}</span>
                <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.title }}</a>
              </div>
              <p class="biography-source-snippet">{{ s.snippet }}</p>
            </li>
          </ul>
        </div>

        <!-- 调试面板：展示检索原始 JSON / 喂给模型的 prompt / 模型原始输出 -->
        <div v-if="debug" class="biography-debug">
          <button type="button" class="biography-sources-toggle" @click="debugOpen = !debugOpen">
            <span>🔧 调试信息（原始数据）</span>
            <span class="biography-sources-caret" :class="{ open: debugOpen }">▸</span>
          </button>
          <pre v-show="debugOpen" class="biography-debug-pre">{{ debugText }}</pre>
        </div>
      </div>

      <p class="form-hint biography-hint">
        内容由大模型基于实时检索整理，重要史实请以权威史料为准。
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { fetchBiography } from '../ark.js'
import '../biography.css'

const name = ref('')
const loading = ref(false)
const error = ref('')
const result = ref('')
const sources = ref([])
const searchError = ref('')
const modelError = ref('')
const sourcesOpen = ref(false)
const copied = ref(false)
const resultText = ref(null)
const debug = ref(null)
const debugOpen = ref(false)
const debugText = computed(() => (debug.value ? JSON.stringify(debug.value, null, 2) : ''))

async function onSearch() {
  const query = name.value.trim()
  if (!query || loading.value) return

  loading.value = true
  error.value = ''
  result.value = ''
  sources.value = []
  searchError.value = ''
  modelError.value = ''
  sourcesOpen.value = false
  debug.value = null
  debugOpen.value = false
  try {
    const data = await fetchBiography(query)
    result.value = data.result || ''
    sources.value = data.sources || []
    searchError.value = data.searchError || ''
    modelError.value = data.modelError || ''
    debug.value = data.debug || null
    // 默认展开，方便用户一眼看到依据
    sourcesOpen.value = sources.value.length > 0
  } catch (err) {
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value)
  } catch {
    const ta = resultText.value
    if (ta) {
      ta.select()
      document.execCommand('copy')
    }
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

// 结果返回后让文本框自适应内容高度，方便整体阅读与复制
watch(result, async () => {
  await nextTick()
  const ta = resultText.value
  if (ta) {
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }
})
</script>
