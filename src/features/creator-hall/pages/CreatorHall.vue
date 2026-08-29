<template>
  <section class="section page-section creators-page">
    <div class="container">
      <div class="page-head">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Creator Hall</p>
        <h1>主播收藏馆</h1>
        <p>
          按平台收藏喜欢的主播与创作者：主页链接、内容标签、关注状态与文字备注集中管理。
          只记录公开主页链接，不上传照片；数据保存在本浏览器，可导出备份迁移。
        </p>
      </div>

      <section class="dashboard-panel" id="creator-form">
        <div class="panel-heading heading-row">
          <div>
            <h2>{{ editingId ? '编辑收藏' : '添加收藏' }}</h2>
            <p>名称必填，其余按需填写；标签用逗号分隔，可写内容类型、更新频率、入坑理由等。</p>
          </div>
        </div>
        <form class="creator-form" @submit.prevent="submitForm">
          <label class="field">
            <span>名称 *</span>
            <input v-model="form.name" type="text" required placeholder="如：某某老师" />
          </label>
          <label class="field">
            <span>平台</span>
            <select v-model="form.platform">
              <option v-for="p in platformOptions" :key="p.key" :value="p.key">{{ p.label }}</option>
              <option value="__custom">＋ 自定义平台…</option>
            </select>
          </label>
          <label v-if="form.platform === '__custom'" class="field">
            <span>自定义平台名 *</span>
            <input v-model="form.customPlatform" type="text" required placeholder="如：网易云电台" />
          </label>
          <label class="field">
            <span>主页链接</span>
            <input v-model="form.url" type="text" placeholder="https://space.bilibili.com/…" />
          </label>
          <label class="field">
            <span>标签</span>
            <input v-model="form.tagsText" type="text" list="known-tags" placeholder="游戏, 唱歌, 读书" />
            <datalist id="known-tags">
              <option v-for="t in knownTags" :key="t" :value="t" />
            </datalist>
          </label>
          <label class="field">
            <span>状态</span>
            <select v-model="form.status">
              <option v-for="s in STATUS_OPTIONS" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </label>
          <label class="field form-note">
            <span>备注</span>
            <textarea v-model="form.note" rows="2" placeholder="代表作品、直播时间、喜欢的点……"></textarea>
          </label>
          <div class="form-actions">
            <button type="submit" class="btn primary">{{ editingId ? '保存修改' : '添加收藏' }}</button>
            <button v-if="editingId" type="button" class="btn ghost" @click="resetForm">取消编辑</button>
          </div>
        </form>
      </section>

      <section class="dashboard-panel">
        <div class="panel-heading heading-row">
          <div>
            <h2>收藏清单</h2>
            <p>
              共 {{ creators.length }} 位 · 关注中 {{ countByStatus('following') }} · 搁置中
              {{ countByStatus('paused') }} · 已取关 {{ countByStatus('quit') }}
            </p>
          </div>
          <div class="head-actions">
            <button class="btn ghost small" @click="exportBackup" :disabled="!creators.length">导出备份</button>
            <button class="btn ghost small" @click="triggerImport">导入备份</button>
            <button class="btn danger small" @click="clearAll" :disabled="!creators.length">清空</button>
            <input ref="importInput" type="file" accept="application/json,.json" class="import-input" @change="onImportFile" />
          </div>
        </div>

        <div v-if="creators.length" class="platform-tabs" role="tablist" aria-label="按平台筛选">
          <button
            class="platform-tab"
            :class="{ active: platformFilter === 'all' }"
            @click="platformFilter = 'all'"
          >全部 <b>{{ creators.length }}</b></button>
          <button
            v-for="p in platformTabs"
            :key="p.key"
            class="platform-tab"
            :class="{ active: platformFilter === p.key }"
            :style="platformFilter === p.key ? { borderColor: p.color, color: p.color } : null"
            @click="platformFilter = platformFilter === p.key ? 'all' : p.key"
          >
            <span>{{ p.emoji }} {{ p.name }}</span> <b>{{ p.count }}</b>
          </button>
        </div>

        <div v-if="creators.length" class="filter-row">
          <input v-model="keyword" type="search" placeholder="搜索名称、标签或备注…" aria-label="搜索" />
          <select v-model="statusFilter" aria-label="按状态筛选">
            <option value="all">全部状态</option>
            <option v-for="s in STATUS_OPTIONS" :key="s.key" :value="s.key">{{ s.label }}</option>
          </select>
          <select v-model="tagFilter" aria-label="按标签筛选">
            <option value="all">全部标签</option>
            <option v-for="t in knownTags" :key="t" :value="t">{{ t }}</option>
          </select>
          <select v-model="sortBy" aria-label="排序方式">
            <option value="recent">最近添加</option>
            <option value="name">按名称</option>
            <option value="platform">按平台</option>
          </select>
        </div>

        <div v-if="filtered.length" class="creator-grid">
          <article v-for="c in filtered" :key="c.id" class="creator-card">
            <header class="card-top">
              <span class="platform-chip" :style="platformStyle(c.platform)">
                {{ platformInfo(c.platform).emoji }} {{ platformInfo(c.platform).name }}
              </span>
              <span class="tag" :class="statusClass(c.status)">{{ statusLabel(c.status) }}</span>
            </header>
            <h3 class="card-name">
              <a v-if="c.url" :href="c.url" target="_blank" rel="noopener noreferrer" :title="c.url">
                {{ c.name }} <span class="link-arrow">↗</span>
              </a>
              <span v-else>{{ c.name }}</span>
            </h3>
            <div v-if="c.tags.length" class="card-tags">
              <button
                v-for="t in c.tags"
                :key="t"
                type="button"
                class="tag tag-click"
                title="按此标签筛选"
                @click="tagFilter = tagFilter === t ? 'all' : t"
              >{{ t }}</button>
            </div>
            <p v-if="c.note" class="card-note">{{ c.note }}</p>
            <footer class="card-foot">
              <small>收藏于 {{ formatDate(c.createdAt) }}</small>
              <div class="card-ops">
                <button class="btn ghost small" @click="startEdit(c)">编辑</button>
                <button class="btn danger small" @click="removeOne(c)">删除</button>
              </div>
            </footer>
          </article>
        </div>
        <div v-else-if="creators.length" class="empty">
          <p>没有符合条件的收藏，试试调整平台、状态、标签或关键词。</p>
        </div>
        <div v-else class="empty">
          <p>还没有收藏。用上方「添加收藏」表单记录第一位创作者吧。</p>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { PLATFORMS, customPlatformKeys, platformInfo } from '../data/platforms.js'
import { STATUS_OPTIONS, useCreatorStore } from '../composables/useCreatorStore.js'

const { creators, add, update, remove, importItems, exportItems, clearAll: clearAllItems } = useCreatorStore()

const PLATFORM_CUSTOM = '__custom'

const STATUS_CLASS = { following: 'primary', paused: 'warn', quit: '' }
const statusLabel = (key) => STATUS_OPTIONS.find((s) => s.key === key)?.label || '关注中'
const statusClass = (key) => STATUS_CLASS[key] || ''

function platformStyle(key) {
  const { color } = platformInfo(key)
  return { color, borderColor: `${color}55`, background: `${color}14` }
}

// ---------- 表单 ----------

const form = reactive({
  name: '',
  platform: 'bilibili',
  customPlatform: '',
  url: '',
  tagsText: '',
  status: 'following',
  note: ''
})
const editingId = ref(null)

// 平台下拉：预设 + 数据里出现过的自定义平台
const platformOptions = computed(() => {
  const used = customPlatformKeys(creators.map((c) => c.platform))
  return [
    ...PLATFORMS.map((p) => ({ key: p.key, label: `${p.emoji} ${p.name}` })),
    ...used.map((k) => ({ key: k, label: `${platformInfo(k).emoji} ${platformInfo(k).name}（自定义）` }))
  ]
})

// 全部已知标签，用于筛选下拉与输入自动补全
const knownTags = computed(() => {
  const set = new Set()
  for (const c of creators) for (const t of c.tags) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

function splitTags(text) {
  return [...new Set(text.split(/[,，、]/).map((t) => t.trim()).filter(Boolean))]
}

function normalizeUrl(url) {
  const u = url.trim()
  if (!u) return ''
  return /^https?:\/\//i.test(u) ? u : `https://${u}`
}

function submitForm() {
  const name = form.name.trim()
  if (!name) return
  let platform = form.platform
  if (platform === PLATFORM_CUSTOM) {
    const customName = form.customPlatform.trim()
    if (!customName) return
    platform = `custom:${customName}`
  }
  const data = {
    name,
    platform,
    url: normalizeUrl(form.url),
    tags: splitTags(form.tagsText),
    status: form.status,
    note: form.note.trim()
  }
  if (editingId.value) {
    update(editingId.value, data)
    editingId.value = null
  } else {
    add(data)
  }
  resetForm()
}

function startEdit(c) {
  editingId.value = c.id
  form.name = c.name
  form.platform = c.platform
  form.customPlatform = ''
  form.url = c.url
  form.tagsText = c.tags.join(', ')
  form.status = c.status
  form.note = c.note
  document.getElementById('creator-form')?.scrollIntoView({ behavior: 'smooth' })
}

function resetForm() {
  editingId.value = null
  form.name = ''
  form.platform = 'bilibili'
  form.customPlatform = ''
  form.url = ''
  form.tagsText = ''
  form.status = 'following'
  form.note = ''
}

function removeOne(c) {
  if (!confirm(`确定删除「${c.name}」的收藏？`)) return
  if (editingId.value === c.id) resetForm()
  remove(c.id)
}

// ---------- 筛选与排序 ----------

const platformFilter = ref('all')
const statusFilter = ref('all')
const tagFilter = ref('all')
const keyword = ref('')
const sortBy = ref('recent')

const platformTabs = computed(() => {
  const count = (key) => creators.filter((c) => c.platform === key).length
  const tabs = PLATFORMS.map((p) => ({ ...p, count: count(p.key) }))
  for (const k of customPlatformKeys(creators.map((c) => c.platform))) {
    tabs.push({ ...platformInfo(k), count: count(k) })
  }
  return tabs
})

const filtered = computed(() => {
  let list = [...creators]
  if (platformFilter.value !== 'all') list = list.filter((c) => c.platform === platformFilter.value)
  if (statusFilter.value !== 'all') list = list.filter((c) => c.status === statusFilter.value)
  if (tagFilter.value !== 'all') list = list.filter((c) => c.tags.includes(tagFilter.value))
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        c.note.toLowerCase().includes(kw) ||
        c.tags.some((t) => t.toLowerCase().includes(kw))
    )
  }
  if (sortBy.value === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  } else if (sortBy.value === 'platform') {
    list.sort(
      (a, b) =>
        platformInfo(a.platform).name.localeCompare(platformInfo(b.platform).name, 'zh-Hans-CN') ||
        b.createdAt.localeCompare(a.createdAt)
    )
  } else {
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return list
})

const countByStatus = (key) => creators.filter((c) => c.status === key).length

function formatDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ---------- 备份 ----------

const importInput = ref(null)

function exportBackup() {
  const payload = { version: 1, exportedAt: new Date().toISOString(), creators: exportItems() }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `creator-hall-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

function triggerImport() {
  importInput.value?.click()
}

function onImportFile(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result))
      const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.creators) ? parsed.creators : null
      if (!items) {
        alert('备份文件格式不对：没有找到收藏数组')
        return
      }
      const { added, skipped } = importItems(items)
      alert(`导入完成：新增 ${added} 位，跳过 ${skipped} 位（已存在）`)
    } catch {
      alert('备份文件解析失败，请确认选择的是导出的 JSON 文件')
    }
  }
  reader.readAsText(file, 'utf-8')
}

function clearAll() {
  if (!creators.length) return
  if (!confirm(`确定清空全部 ${creators.length} 条收藏？此操作不可恢复。`)) return
  clearAllItems()
}
</script>

<style scoped>
.creators-page {
  padding-top: 60px;
}

.page-head h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 8px 0 12px;
}

.page-head p {
  color: var(--muted);
  max-width: 760px;
}

.heading-row {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.head-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 8px;
}

.import-input {
  display: none;
}

/* ---------- 表单 ---------- */

.creator-form {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.creator-form .form-note {
  grid-column: span 2;
}

.form-actions {
  display: flex;
  gap: 10px;
  grid-column: span 2;
}

@media (max-width: 640px) {
  .creator-form {
    grid-template-columns: 1fr;
  }

  .creator-form .form-note,
  .form-actions {
    grid-column: auto;
  }
}

/* ---------- 平台标签页 ---------- */

.platform-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.platform-tab {
  align-items: center;
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  color: var(--muted);
  cursor: pointer;
  display: inline-flex;
  font-size: 0.85rem;
  font-weight: 650;
  gap: 6px;
  padding: 6px 12px;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.platform-tab:hover {
  color: var(--text);
}

.platform-tab.active {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary-dark);
}

.platform-tab b {
  font-variant-numeric: tabular-nums;
}

/* ---------- 筛选行 ---------- */

.filter-row {
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  margin-bottom: 18px;
}

@media (max-width: 800px) {
  .filter-row {
    grid-template-columns: 1fr 1fr;
  }
}

/* ---------- 收藏卡片 ---------- */

.creator-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

.creator-card {
  background: var(--surface-soft);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
}

.card-top {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.platform-chip {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 3px 10px;
  white-space: nowrap;
}

.card-name {
  font-size: 1.08rem;
  margin: 0;
  overflow-wrap: anywhere;
}

.card-name a {
  color: var(--text);
}

.card-name a:hover {
  color: var(--primary);
}

.link-arrow {
  color: var(--primary);
  font-size: 0.85rem;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-click {
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 4px 11px;
}

.tag-click:hover {
  border-color: var(--primary);
  color: var(--primary-dark);
}

.card-note {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.card-foot {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-top: auto;
}

.card-foot small {
  color: var(--muted);
}

.card-ops {
  display: flex;
  gap: 8px;
}

.empty {
  color: var(--muted);
  padding: 30px 0 10px;
  text-align: center;
}

.empty p {
  margin: 0 0 12px;
}
</style>
