// 日期相关工具函数

// 根据出生日期计算当前年龄；无法解析时返回 null
export function ageFrom(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

// 距离下一次生日还有多少天；无法解析时返回 null
export function daysToNextBirthday(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  const next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next < now) next.setFullYear(now.getFullYear() + 1)
  return Math.ceil((next - now) / 86400000)
}

// 将 ISO 字符串格式化为 YYYY-MM-DD HH:mm
export function formatDateTime(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`
}

// 仅取日期部分 YYYY-MM-DD
export function formatDateOnly(iso) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
