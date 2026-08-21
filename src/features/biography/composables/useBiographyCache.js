// 人物生平查询结果本地缓存
// 结构：{ [key]: { result, sources, searchError, modelError, debug, name, savedAt } }
// key 为规范化后的人名（trim + 折叠多余空白）；上限 MAX_ENTRIES 条，按最旧 savedAt 淘汰。

const STORAGE_KEY = 'biography:results-v3'
const MAX_ENTRIES = 20

function loadAll() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  } catch {
    return {}
  }
}

const store = loadAll()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* 存储配额或隐私模式下静默忽略 */
  }
}

// 人名规范化：去首尾空白、折叠内部连续空白为单个空格
export function normalizeKey(name) {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

export function useBiographyCache() {
  return {
    get(key) {
      const k = normalizeKey(key)
      return k ? store[k] : undefined
    },
    save(key, data) {
      const k = normalizeKey(key)
      if (!k) return
      store[k] = {
        ...data,
        name: k,
        savedAt: Date.now()
      }
      evict()
      persist()
    },
    remove(key) {
      const k = normalizeKey(key)
      if (k && store[k]) {
        delete store[k]
        persist()
      }
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k])
      persist()
    },
    // 最近查询列表，按 savedAt 降序
    recent(n = MAX_ENTRIES) {
      return Object.values(store)
        .filter((x) => x && x.savedAt)
        .sort((a, b) => b.savedAt - a.savedAt)
        .slice(0, n)
        .map((x) => ({ key: x.name, name: x.name, savedAt: x.savedAt }))
    }
  }
}

// 超出上限时淘汰最旧的条目
function evict() {
  const keys = Object.keys(store)
  if (keys.length <= MAX_ENTRIES) return
  const oldest = keys
    .map((k) => [k, store[k]?.savedAt || 0])
    .sort((a, b) => a[1] - b[1])
    .slice(0, keys.length - MAX_ENTRIES)
  for (const [k] of oldest) delete store[k]
}
