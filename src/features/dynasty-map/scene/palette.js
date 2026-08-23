// 莫兰迪色系推导与城市等级常量。
// 数据文件里各政权的原始颜色饱和度不一，这里统一做「降饱和 + 统一明度」的
// HSL 压缩，政权之间仍可区分，但整体呈低饱和莫兰迪观感。

// hex → HSL（h: 0-360, s/l: 0-1）
function hexToHsl(hex) {
  const m = String(hex).replace('#', '')
  const full = m.length === 3 ? m.split('').map((ch) => ch + ch).join('') : m
  const n = parseInt(full, 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  const f = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = f(p, q, h + 1 / 3)
    g = f(p, q, h)
    b = f(p, q, h - 1 / 3)
  }
  const to = (v) => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 原始 faction 色 → 莫兰迪主色（顶面）/ 深色（侧面）/ 亮色（边界与高亮）
export function morandi(hex) {
  const { h, s } = hexToHsl(hex)
  const top = hslToHex(h, clamp(s, 0.14, 0.3), 0.62)
  const side = hslToHex(h, clamp(s, 0.16, 0.32), 0.4)
  const bright = hslToHex(h, clamp(s, 0.3, 0.5), 0.76)
  return { top, side, bright }
}

// 城市等级：光柱高度 / 半径 / 自发光色 / 标签优先级
export const CITY_TIERS = {
  capital: { label: '都城', rank: 0, height: 7.6, radius: 0.4, color: '#ff5a3c', glow: 1.0 },
  city: { label: '州郡重镇', rank: 1, height: 5.2, radius: 0.26, color: '#43b8ff', glow: 0.72 },
  pass: { label: '边关要塞', rank: 2, height: 4.3, radius: 0.24, color: '#ffb340', glow: 0.62 },
  town: { label: '城邑', rank: 3, height: 3.4, radius: 0.18, color: '#9fb2d8', glow: 0.42 }
}

// 缩放分层阈值（相机到目标点的距离，越小越近）：
// 远景只显都城与重镇，中景淡入关隘，近景淡入城邑，最近档显示郡/州名
export const ZOOM_TIERS = {
  passMax: 88, // 距离小于该值时关隘标签淡入
  townMax: 58, // 距离小于该值时城邑标签淡入
  divisionMax: 46 // 距离小于该值时郡/州区划名淡入
}
