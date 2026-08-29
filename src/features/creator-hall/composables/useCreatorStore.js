import { reactive } from 'vue'

// 创作者收藏的本地存储
// 每条记录：{ id, name, platform, url, tags: [], status, note, createdAt, updatedAt }
// platform 为预设 key（见 data/platforms.js）或 'custom:名字' 的自定义 key
// status 含义：following=关注中, paused=搁置中, quit=已取关

const STORAGE_KEY = 'creator-hall:collection'

export const STATUS_OPTIONS = [
  { key: 'following', label: '关注中' },
  { key: 'paused', label: '搁置中' },
  { key: 'quit', label: '已取关' }
]

function loadAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((it) => it && typeof it.name === 'string' && it.name.trim()) : []
  } catch {
    return []
  }
}

const state = reactive({ list: loadAll() })

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.list))
}

function normalize(data) {
  return {
    id: data.id || Date.now() + Math.floor(Math.random() * 1000),
    name: String(data.name || '').trim(),
    platform: data.platform || 'other',
    url: String(data.url || '').trim(),
    tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t).trim()).filter(Boolean) : [],
    status: STATUS_OPTIONS.some((s) => s.key === data.status) ? data.status : 'following',
    note: String(data.note || '').trim(),
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString()
  }
}

export function useCreatorStore() {
  return {
    creators: state.list,
    add(data) {
      state.list.push(normalize(data))
      persist()
    },
    update(id, patch) {
      const i = state.list.findIndex((c) => c.id === id)
      if (i === -1) return
      state.list[i] = { ...normalize({ ...state.list[i], ...patch }), updatedAt: new Date().toISOString() }
      persist()
    },
    remove(id) {
      const i = state.list.findIndex((c) => c.id === id)
      if (i === -1) return
      state.list.splice(i, 1)
      persist()
    },
    // 合并导入：同 id 或同名同平台视为重复跳过，返回新增/跳过条数
    importItems(items) {
      let added = 0
      let skipped = 0
      for (const raw of items) {
        const item = normalize(raw)
        if (!item.name) {
          skipped++
          continue
        }
        const dup = state.list.some((c) => c.id === item.id || (c.name === item.name && c.platform === item.platform))
        if (dup) {
          skipped++
          continue
        }
        state.list.push(item)
        added++
      }
      persist()
      return { added, skipped }
    },
    exportItems() {
      return JSON.parse(JSON.stringify(state.list))
    },
    clearAll() {
      state.list.splice(0, state.list.length)
      persist()
    }
  }
}
