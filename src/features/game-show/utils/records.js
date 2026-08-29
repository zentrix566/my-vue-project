// 战绩存取：localStorage，最多保留 50 条
const KEY = 'game-show:records'

export function loadRecords() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function addRecord(entry) {
  const list = [entry, ...loadRecords()].slice(0, 50)
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}

export function clearRecords() {
  localStorage.removeItem(KEY)
}

export function bestPrize(list) {
  return list.reduce((max, r) => Math.max(max, r.prize || 0), 0)
}
