// 全局常量：办公室尺寸、节奏参数、场景装饰物

// 办公室尺寸（世界坐标，px）；wallHeight 为顶部墙面高度，其下为地毯
export const ROOM = {
  width: 960,
  height: 560,
  wallHeight: 110
}

// 聊天节奏（毫秒，实际间隔会再加随机抖动，并除以速度倍率）
export const PACE = {
  lineGap: 2100, // 剧本台词间隔
  topicGap: 1700, // 话题开场前的停顿
  aiGap: 3200, // AI 接龙每条间隔
  bubbleBase: 2600, // 气泡基础存留
  bubblePerChar: 95, // 每个字追加的存留
  bubbleMax: 9500 // 气泡存留上限
}

// 速度档位（ControlBar 与 engine 共用）
export const SPEEDS = [
  { value: 0.6, label: '🐢 慢' },
  { value: 1, label: '🚶 正常' },
  { value: 1.8, label: '🚀 快' }
]

// 场景装饰：layer 'wall' 贴墙 / 'floor' 落地；坐标为房间像素
export const DECOR = [
  // —— 墙面：窗户、挂钟、海报、白板 ——
  { emoji: '🖼️', x: 95, y: 50, size: 30, layer: 'wall' },
  { emoji: '🪟', x: 210, y: 52, size: 44, layer: 'wall' },
  { emoji: '🪟', x: 480, y: 52, size: 44, layer: 'wall' },
  { emoji: '🪟', x: 730, y: 52, size: 44, layer: 'wall' },
  { emoji: '🕒', x: 615, y: 48, size: 28, layer: 'wall' },
  { emoji: '📋', x: 890, y: 56, size: 34, layer: 'wall' },
  // —— 老板角：办公桌 ——
  { emoji: '🖥️', x: 115, y: 205, size: 30, layer: 'floor' },
  { emoji: '🗄️', x: 58, y: 392, size: 30, layer: 'floor' },
  // —— 工位 A 排（张伟 / 小陈 / Tony）——
  { emoji: '💻', x: 230, y: 218, size: 28, layer: 'floor' },
  { emoji: '💻', x: 340, y: 218, size: 28, layer: 'floor' },
  { emoji: '💻', x: 450, y: 218, size: 28, layer: 'floor' },
  // —— 工位 B 排（王姐 / 刘哥 / Fiona）——
  { emoji: '💻', x: 230, y: 352, size: 28, layer: 'floor' },
  { emoji: '💻', x: 340, y: 352, size: 28, layer: 'floor' },
  { emoji: '💻', x: 450, y: 352, size: 28, layer: 'floor' },
  // —— 打印机旁是实习生的窝 ——
  { emoji: '🖨️', x: 545, y: 182, size: 28, layer: 'floor' },
  // —— 茶水间 ——
  { emoji: '☕', x: 770, y: 205, size: 28, layer: 'floor' },
  { emoji: '🚰', x: 845, y: 205, size: 26, layer: 'floor' },
  { emoji: '🍵', x: 800, y: 165, size: 22, layer: 'floor' },
  // —— 会议室圆桌椅 ——
  { emoji: '🪑', x: 615, y: 435, size: 22, layer: 'floor' },
  { emoji: '🪑', x: 765, y: 435, size: 22, layer: 'floor' },
  { emoji: '🪑', x: 615, y: 512, size: 22, layer: 'floor' },
  { emoji: '🪑', x: 765, y: 512, size: 22, layer: 'floor' },
  // —— 绿植收尾 ——
  { emoji: '🪴', x: 38, y: 150, size: 30, layer: 'floor' },
  { emoji: '🪴', x: 922, y: 152, size: 26, layer: 'floor' },
  { emoji: '🪴', x: 40, y: 540, size: 30, layer: 'floor' },
  { emoji: '🪴', x: 922, y: 542, size: 30, layer: 'floor' }
]

// 会议室圆桌（CSS 椭圆绘制）
export const MEETING_TABLE = { x: 690, y: 472, rx: 82, ry: 46 }

// 功能区（虚线垫子）
export const ZONES = [
  { label: '茶水间', x: 715, y: 140, w: 225, h: 118 },
  { label: '老板角', x: 55, y: 175, w: 130, h: 118 }
]
