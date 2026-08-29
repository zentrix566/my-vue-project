// 预设平台清单与平台展示信息（颜色、图标）。
// 自定义平台以 'custom:名字' 作为 key 存储，展示时从调色板取色。

export const PLATFORMS = [
  { key: 'bilibili', name: '哔哩哔哩', emoji: '📺', color: '#fb7299' },
  { key: 'douyin', name: '抖音', emoji: '🎵', color: '#fe2c55' },
  { key: 'kuaishou', name: '快手', emoji: '⚡', color: '#ff7300' },
  { key: 'xiaohongshu', name: '小红书', emoji: '📕', color: '#ff2442' },
  { key: 'weibo', name: '微博', emoji: '📢', color: '#e6162d' },
  { key: 'douyu', name: '斗鱼', emoji: '🐟', color: '#ff5d23' },
  { key: 'huya', name: '虎牙', emoji: '🐯', color: '#e8a20c' },
  { key: 'youtube', name: 'YouTube', emoji: '▶️', color: '#ff0000' },
  { key: 'twitch', name: 'Twitch', emoji: '🎮', color: '#9146ff' },
  { key: 'other', name: '其他', emoji: '🔗', color: '#64748b' }
]

const CUSTOM_PREFIX = 'custom:'

const CUSTOM_PALETTE = ['#2f6fed', '#0f766e', '#b45309', '#7c3aed', '#be185d', '#475569']

// 简单字符串哈希，用名字稳定取色（同名平台每次颜色一致）
function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

// 平台的展示信息：预设直接查表，自定义平台从调色板取色
export function platformInfo(key) {
  const preset = PLATFORMS.find((p) => p.key === key)
  if (preset) return preset
  if (typeof key === 'string' && key.startsWith(CUSTOM_PREFIX)) {
    const name = key.slice(CUSTOM_PREFIX.length) || '自定义'
    return { key, name, emoji: '🏷️', color: CUSTOM_PALETTE[hashCode(name) % CUSTOM_PALETTE.length] }
  }
  return { key: 'other', name: '未知平台', emoji: '🔗', color: '#64748b' }
}

// 把数据里出现过的自定义平台 key 收拢成一个去重数组
export function customPlatformKeys(platformList) {
  return [...new Set(platformList.filter((k) => typeof k === 'string' && k.startsWith(CUSTOM_PREFIX)))]
}
