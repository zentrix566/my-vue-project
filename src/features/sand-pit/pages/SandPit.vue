<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 沙土堆 · 挖洞砌渠
 * 还原小时候的玩法：在沙土堆上挖洞掏隧道、用砖头砌水渠、放水引水。
 *
 * 实现是经典的「下落沙」元胞自动机：
 * - 每个格子是 沙 / 水 / 砖 / 水龙头 / 地漏 之一，按规则逐帧演化；
 * - 沙会竖直下落、往斜下方滑（自然堆出斜坡）、在水中下沉；
 * - 水会下落、斜向滑、并沿水平方向快速铺开（模拟流动），只会流进空格；
 * - 砖是静止的，用来砌渠筑坝；水龙头每帧往下滴水；地漏把流到的水排走。
 *
 * 从下往上、每行交替左右方向扫描，配合 moved 标记，
 * 保证每个粒子每步只动一次，不会因为扫描顺序产生偏流。
 */

const COLS = 260
const ROWS = 150
const CELL = 4 // 每格渲染像素，画布固定 1040×600，CSS 拉伸自适应
const STEPS = 2 // 每帧跑几步模拟，越大沙水落得越快
const DISPERSION = 5 // 水单步能横向铺开的格数

const EMPTY = 0
const SAND = 1
const WATER = 2
const BRICK = 3
const FAUCET = 4
const DRAIN = 5

const TOOLS = [
  { id: 'dig', label: '挖空', emoji: '⛏️', swatch: null },
  { id: 'sand', label: '沙子', emoji: null, swatch: '#d2a055' },
  { id: 'water', label: '清水', emoji: null, swatch: '#4a86d8' },
  { id: 'brick', label: '砖头', emoji: null, swatch: '#a83f2b' },
  { id: 'faucet', label: '水龙头', emoji: '🚰', swatch: null },
  { id: 'drain', label: '地漏', emoji: '🕳️', swatch: null }
]

const tool = ref('dig')
const brush = ref(3)
const paused = ref(false)
const sandCount = ref(0)
const waterCount = ref(0)

let grid = new Uint8Array(COLS * ROWS)
let shade = new Uint8Array(COLS * ROWS) // 每格的颜色抖动种子，放置时定死避免闪烁
let flow = new Int8Array(COLS * ROWS) // 水粒子的偏好流向，堵住时翻转减少来回抖动
let moved = new Uint8Array(COLS * ROWS)

let rafId = 0
let stepCount = 0
let painting = false
let lastCell = null // 上一次落笔的格子，快速拖动时在两点间补插值
let hover = null // 悬停位置，画笔刷圈

let canvas = null
let ctx = null
let off = null
let offCtx = null
let imageData = null
let pixels = null // imageData 的 Uint32 视图，逐格写像素
let voidByRow = null // 空格背景按行渐变（上浅下微深，营造剖面感）

// 32 位颜色按小端序写 ABGR
function rgb(r, g, b) {
  return (255 << 24) | (b << 16) | (g << 8) | r
}

const SAND_SHADES = [
  rgb(216, 163, 92), rgb(209, 156, 85), rgb(201, 148, 77),
  rgb(223, 172, 102), rgb(194, 142, 70), rgb(213, 167, 95)
]
const WATER_SHADES = [
  rgb(58, 116, 201), rgb(64, 124, 209), rgb(54, 110, 192), rgb(70, 130, 214)
]
const WATER_SURFACE = rgb(127, 177, 232)
const BRICK_SHADES = [rgb(168, 63, 43), rgb(178, 73, 50), rgb(158, 56, 38)]
const MORTAR = rgb(150, 120, 110)

function spawn(i, type) {
  grid[i] = type
  shade[i] = (Math.random() * 256) | 0
  flow[i] = 0
}

// ---------- 场景 ----------

function brickFloor() {
  for (let y = ROWS - 2; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) spawn(y * COLS + x, BRICK)
  }
}

function clearAll() {
  grid.fill(EMPTY)
  brickFloor()
}

// 生成一座中间高两边缓的沙土堆，边缘随机起伏
function newMound() {
  grid.fill(EMPTY)
  brickFloor()
  const cx = COLS * 0.5 + ((Math.random() * 60 - 30) | 0)
  const sigma = COLS * 0.15
  const hMax = ROWS * 0.5
  const floorTop = ROWS - 2
  for (let x = 0; x < COLS; x++) {
    const bell = Math.exp(-((x - cx) * (x - cx)) / (2 * sigma * sigma))
    const h = Math.round(hMax * bell * (0.88 + Math.random() * 0.24))
    for (let y = floorTop - h; y < floorTop; y++) {
      if (y >= 0) spawn(y * COLS + x, SAND)
    }
  }
}

// ---------- 模拟 ----------

function stepSand(x, y, i) {
  if (y + 1 >= ROWS) return
  const b = i + COLS
  if (grid[b] === EMPTY || grid[b] === WATER) {
    // 沙落进水里与其交换：沙沉底、水鼓泡上浮
    const target = grid[b]
    grid[b] = SAND
    grid[i] = target === WATER ? WATER : EMPTY
    moved[b] = 1
    return
  }
  const first = Math.random() < 0.5 ? 1 : -1
  for (const d of [first, -first]) {
    const nx = x + d
    if (nx < 0 || nx >= COLS) continue
    const j = b + d
    if (grid[j] === EMPTY || grid[j] === WATER) {
      const target = grid[j]
      grid[j] = SAND
      grid[i] = target === WATER ? WATER : EMPTY
      moved[j] = 1
      return
    }
  }
}

// 沿水平方向铺开：找最远能到达的连续空格，途中碰到下方空洞就顺势落下去
function tryFlow(x, y, i, dir) {
  let target = -1
  for (let k = 1; k <= DISPERSION; k++) {
    const nx = x + dir * k
    if (nx < 0 || nx >= COLS) break
    const j = y * COLS + nx
    if (grid[j] !== EMPTY) break
    target = j
    if (y + 1 < ROWS && grid[j + COLS] === EMPTY) break
  }
  if (target >= 0) {
    grid[target] = WATER
    shade[target] = shade[i]
    flow[target] = dir
    grid[i] = EMPTY
    moved[target] = 1
    return true
  }
  return false
}

function stepWater(x, y, i) {
  if (y + 1 < ROWS) {
    const b = i + COLS
    if (grid[b] === EMPTY) {
      grid[b] = WATER
      shade[b] = shade[i]
      grid[i] = EMPTY
      moved[b] = 1
      return
    }
    const first = Math.random() < 0.5 ? 1 : -1
    for (const d of [first, -first]) {
      const nx = x + d
      if (nx < 0 || nx >= COLS) continue
      const j = b + d
      if (grid[j] === EMPTY) {
        grid[j] = WATER
        shade[j] = shade[i]
        grid[i] = EMPTY
        moved[j] = 1
        return
      }
    }
  }
  const dir = flow[i] || (Math.random() < 0.5 ? 1 : -1)
  if (tryFlow(x, y, i, dir)) return
  if (tryFlow(x, y, i, -dir)) return
  flow[i] = -dir // 两个方向都堵死，下次换个方向试探
}

function stepFaucet(x, y, i) {
  if (y + 1 >= ROWS) return
  const b = i + COLS
  if (grid[b] === EMPTY && Math.random() < 0.85) spawn(b, WATER)
}

function stepDrain(x, y, i) {
  const neighbors = [i - COLS, i + COLS, i - 1, i + 1]
  for (const j of neighbors) {
    if (j < 0 || j >= grid.length) continue
    // 左右邻居要同一行才算贴着
    if ((j === i - 1 && x === 0) || (j === i + 1 && x === COLS - 1)) continue
    if (grid[j] === WATER) grid[j] = EMPTY
  }
}

function step() {
  moved.fill(0)
  for (let y = ROWS - 1; y >= 0; y--) {
    const ltr = ((y + stepCount) & 1) === 0
    for (let k = 0; k < COLS; k++) {
      const x = ltr ? k : COLS - 1 - k
      const i = y * COLS + x
      const t = grid[i]
      if (t === EMPTY || t === BRICK || moved[i]) continue
      if (t === SAND) stepSand(x, y, i)
      else if (t === WATER) stepWater(x, y, i)
      else if (t === FAUCET) stepFaucet(x, y, i)
      else if (t === DRAIN) stepDrain(x, y, i)
    }
  }
  stepCount++
}

// ---------- 笔刷 ----------

function paintAt(cx, cy) {
  const id = tool.value
  const r = brush.value
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r + Math.max(1, r * 0.4)) continue
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue
      const i = y * COLS + x
      if (id === 'dig') {
        grid[i] = EMPTY
      } else if (id === 'sand') {
        if (grid[i] === EMPTY) spawn(i, SAND)
      } else if (id === 'water') {
        if (grid[i] === EMPTY) spawn(i, WATER)
      } else if (id === 'brick') {
        // 砖可以直接砌进水里，方便在水下筑坝
        if (grid[i] === EMPTY || grid[i] === WATER) spawn(i, BRICK)
      } else if (id === 'faucet') {
        if (grid[i] === EMPTY) spawn(i, FAUCET)
      } else if (id === 'drain') {
        if (grid[i] === EMPTY || grid[i] === WATER) spawn(i, DRAIN)
      }
    }
  }
}

// 两格之间补插值，快速拖动时笔迹不断线
function paintLine(a, b) {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1)
  for (let t = 0; t <= steps; t++) {
    paintAt(
      Math.round(a.x + ((b.x - a.x) * t) / steps),
      Math.round(a.y + ((b.y - a.y) * t) / steps)
    )
  }
}

function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect()
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * COLS)
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * ROWS)
  return {
    x: Math.min(COLS - 1, Math.max(0, x)),
    y: Math.min(ROWS - 1, Math.max(0, y))
  }
}

function onPointerDown(e) {
  // 鼠标只认左键，避免中键/右键误触发画笔
  if (e.pointerType === 'mouse' && e.button !== 0) return
  canvas.setPointerCapture(e.pointerId)
  painting = true
  const c = cellFromEvent(e)
  paintAt(c.x, c.y)
  lastCell = c
}

function onPointerMove(e) {
  hover = cellFromEvent(e)
  if (!painting) return
  const c = cellFromEvent(e)
  if (lastCell) paintLine(lastCell, c)
  else paintAt(c.x, c.y)
  lastCell = c
}

function onPointerUp() {
  painting = false
  lastCell = null
}

// 指针捕获异常中断时兜底，防止画笔卡在「一直按住」状态
function onLostCapture() {
  painting = false
  lastCell = null
}

// ---------- 渲染 ----------

function initRender() {
  off = document.createElement('canvas')
  off.width = COLS
  off.height = ROWS
  offCtx = off.getContext('2d')
  imageData = offCtx.createImageData(COLS, ROWS)
  pixels = new Uint32Array(imageData.data.buffer)
  voidByRow = new Uint32Array(ROWS)
  for (let y = 0; y < ROWS; y++) {
    const t = y / ROWS
    voidByRow[y] = rgb(
      Math.round(242 - 16 * t),
      Math.round(248 - 15 * t),
      Math.round(251 - 12 * t)
    )
  }
}

function cellColor(x, y, i) {
  const t = grid[i]
  if (t === EMPTY) return voidByRow[y]
  if (t === SAND) return SAND_SHADES[shade[i] % SAND_SHADES.length]
  if (t === WATER) {
    const surface = y === 0 || grid[i - COLS] === EMPTY
    return surface ? WATER_SURFACE : WATER_SHADES[shade[i] % WATER_SHADES.length]
  }
  if (t === BRICK) {
    // 5×3 一块砖，左、上留灰缝，错缝观感靠块序抖动
    if (x % 5 === 0 || y % 3 === 0) return MORTAR
    const block = ((x / 5) | 0) * 131 + ((y / 3) | 0) * 37
    return BRICK_SHADES[(block + shade[i]) % BRICK_SHADES.length]
  }
  if (t === FAUCET) {
    return ((x + y) & 3) === 0 ? rgb(138, 148, 162) : rgb(95, 105, 119)
  }
  if (t === DRAIN) {
    return x % 3 === 1 || y % 3 === 1 ? rgb(40, 37, 34) : rgb(66, 62, 57)
  }
  return voidByRow[y]
}

function render() {
  let sand = 0
  let water = 0
  for (let y = 0; y < ROWS; y++) {
    const row = y * COLS
    for (let x = 0; x < COLS; x++) {
      const i = row + x
      const t = grid[i]
      if (t === SAND) sand++
      else if (t === WATER) water++
      pixels[i] = cellColor(x, y, i)
    }
  }
  sandCount.value = sand
  waterCount.value = water
  offCtx.putImageData(imageData, 0, 0)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(off, 0, 0, COLS * CELL, ROWS * CELL)

  if (hover) {
    const cx = hover.x * CELL + CELL / 2
    const cy = hover.y * CELL + CELL / 2
    const r = brush.value * CELL + CELL / 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(20,30,45,0.65)'
    ctx.stroke()
  }
}

function frame() {
  rafId = requestAnimationFrame(frame)
  if (!paused.value) {
    for (let s = 0; s < STEPS; s++) step()
  }
  // 按住不动也持续出料，水笔/水龙头才有「哗哗放水」的感觉
  if (painting && lastCell) paintAt(lastCell.x, lastCell.y)
  render()
}

// ---------- 键盘快捷键 ----------

function onKeyDown(e) {
  if (e.code === 'Space') {
    e.preventDefault()
    paused.value = !paused.value
    return
  }
  if (e.key === '[') {
    brush.value = Math.max(0, brush.value - 1)
    return
  }
  if (e.key === ']') {
    brush.value = Math.min(14, brush.value + 1)
    return
  }
  const n = parseInt(e.key, 10)
  if (n >= 1 && n <= TOOLS.length) tool.value = TOOLS[n - 1].id
}

// ---------- 生命周期 ----------

onMounted(() => {
  canvas = document.getElementById('sandpit-canvas')
  ctx = canvas.getContext('2d')
  initRender()
  newMound()
  window.addEventListener('keydown', onKeyDown)
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <main class="sandpit">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>沙土堆 · 挖洞砌渠</h1>
      <p class="subtitle">
        小时候的沙堆玩法：⛏️ 在沙堆上挖洞掏隧道，🧱 用砖砌水渠，🚰 放个水龙头看水一路淌。
      </p>
    </header>

    <section class="panel">
      <div class="tools">
        <button
          v-for="(t, i) in TOOLS"
          :key="t.id"
          class="tool"
          :class="{ active: tool === t.id }"
          @click="tool = t.id"
        >
          <i v-if="t.swatch" class="dot" :style="{ background: t.swatch }"></i>
          <span v-else class="emoji">{{ t.emoji }}</span>
          {{ t.label }}<sup>{{ i + 1 }}</sup>
        </button>
      </div>

      <label class="field">
        <span>笔刷 {{ brush * 2 + 1 }} 格</span>
        <input v-model.number="brush" type="range" min="0" max="14" />
      </label>

      <div class="buttons">
        <button @click="newMound">🎁 新沙堆</button>
        <button @click="clearAll">🧹 清空场地</button>
        <button class="toggle" @click="paused = !paused">
          {{ paused ? '▶️ 继续' : '⏸️ 暂停' }}
        </button>
      </div>

      <span class="status">
        沙 {{ sandCount.toLocaleString() }} · 水 {{ waterCount.toLocaleString() }}
      </span>
    </section>

    <section class="stage">
      <canvas
        id="sandpit-canvas"
        width="1040"
        height="600"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onLostCapture"
        @pointerleave="hover = null"
        @contextmenu.prevent
      ></canvas>
    </section>

    <p class="hint">
      玩法：先拿「挖空」往沙堆里掏个洞；切到「砖头」在洞口砌几道墙围成水渠；
      再放一个「水龙头」在渠首，水就会顺着砖渠流进洞里。「地漏」放在低处可以排水。
      快捷键：1-6 切工具，<code>[</code> <code>]</code> 调笔刷，空格暂停。
    </p>
  </main>
</template>

<style scoped>
.sandpit {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.top h1 {
  margin: 14px 0 6px;
  font-size: 30px;
}

.subtitle {
  margin: 0 0 28px;
  color: var(--color-muted);
}

.panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 16px 22px;
  margin-bottom: 18px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s;
}

.tool sup {
  font-size: 10px;
  color: var(--color-muted);
}

.tool .dot {
  width: 13px;
  height: 13px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.18);
}

.tool .emoji {
  font-size: 15px;
  line-height: 1;
}

.tool:hover {
  border-color: var(--color-primary);
}

.tool.active {
  background: var(--primary-soft, rgba(47, 111, 237, 0.1));
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 600;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.field input[type='range'] {
  width: 130px;
  accent-color: var(--color-primary);
}

.buttons {
  display: flex;
  gap: 10px;
}

.status {
  font-size: 13px;
  color: var(--color-muted);
  white-space: nowrap;
}

.stage {
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: #eef6fb;
}

.stage canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: crosshair;
  image-rendering: pixelated;
}

.hint {
  margin: 16px 4px 0;
  font-size: 14px;
  line-height: 1.9;
  color: var(--color-muted);
}

.hint code {
  padding: 1px 6px;
  font-size: 12px;
  background: var(--surface-soft, #eef2f7);
  border-radius: 5px;
}

@media (max-width: 720px) {
  .sandpit {
    padding: 24px 12px 48px;
  }

  .top h1 {
    font-size: 24px;
  }
}
</style>
