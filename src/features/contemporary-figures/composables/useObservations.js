import { reactive } from 'vue'

// 观察记录本地存储
// 结构：{ [figureId]: { status: 'watching' | 'following' | 'paused', notes: [{ id, date, content, mood }] } }
// status 含义：watching=观察中, following=关注中, paused=已搁置
// mood 含义：neutral=普通, positive=正向, concern=存疑/关注

const STORAGE_KEY = 'cf-observations'

function loadAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

const store = reactive(loadAll())

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function ensure(id) {
  if (!store[id]) {
    store[id] = { status: 'watching', notes: [] }
  }
  return store[id]
}

export const STATUS_OPTIONS = [
  { key: 'watching', label: '观察中', color: 'var(--primary)' },
  { key: 'following', label: '关注中', color: 'var(--positive)' },
  { key: 'paused', label: '已搁置', color: 'var(--muted)' }
]

export const MOOD_OPTIONS = [
  { key: 'neutral', label: '普通', color: 'var(--muted)' },
  { key: 'positive', label: '正向', color: 'var(--positive)' },
  { key: 'concern', label: '存疑', color: 'var(--concern)' }
]

export function statusLabel(key) {
  return STATUS_OPTIONS.find((s) => s.key === key)?.label || '观察中'
}

export function moodLabel(key) {
  return MOOD_OPTIONS.find((m) => m.key === key)?.label || '普通'
}

export function useObservations() {
  return {
    getRecord(id) {
      return ensure(id)
    },
    setStatus(id, status) {
      const rec = ensure(id)
      rec.status = status
      persist()
    },
    addNote(id, content, mood = 'neutral') {
      const rec = ensure(id)
      const text = content.trim()
      if (!text) return
      rec.notes.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        content: text,
        mood
      })
      persist()
    },
    removeNote(id, noteId) {
      const rec = ensure(id)
      rec.notes = rec.notes.filter((n) => n.id !== noteId)
      persist()
    },
    clearAll() {
      Object.keys(store).forEach((k) => delete store[k])
      persist()
    }
  }
}
