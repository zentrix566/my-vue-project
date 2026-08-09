<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 毛笔书法 · 停笔 2 秒自动优化（可向标准字形靠拢）
 * - 在中间「宣纸」上用鼠标/手指书写，逐笔记录坐标与时间戳
 * - 每次抬笔后开始 2 秒倒计时，期间再次落笔则取消计时
 * - 倒计时归零即视为「书写结束」，自动把你写的笔迹优化成大师笔法：
 *   原始轨迹预平滑去抖 + Catmull-Rom 样条 + 提按粗细 + 起收笔锋形 + 淡墨晕染
 * - 若填了「目标字」，会从 hanzi-writer-data 取该字标准笔画中线，
 *   把你的每一笔朝对应标准笔画形变，滑块控制「保留原迹 ↔ 靠近标准」
 * 线条优化纯前端离线；向标准字形形变需联网取字形数据（仅 CDN，无 key），
 * 离线 / 取不到 / 笔数不符时自动降级为仅线条优化
 */

const IDLE_MS = 2000 // 停笔多久判定为写完
const INK = '#1a1a1a' // 墨色
const RESAMPLE_N = 64 // 形变时每笔重采样点数
const GLYPH_BASE = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2' // 标准字形数据
const PRESETS = ['永', '福', '寿', '和', '安', '书']

const maxWidth = ref(28) // 最粗笔锋宽度(px)
const targetChar = ref('') // 目标字（选填），留空则仅线条优化
const morphAlpha = ref(0.6) // 靠近标准字形的程度 0~1

const rawCanvas = ref(null)
const niceCanvas = ref(null)
let rawCtx = null
let niceCtx = null
let dpr = 1

const strokes = [] // 每一笔：[{x, y, t}]
let current = null
let drawing = false

const hasInk = ref(false)
const beautified = ref(false)
const loading = ref(false)
const statusMsg = ref('') // 加载中 / 降级提示
const countdown = ref(0) // 距离自动优化剩余秒数
let idleTimer = 0
let tickTimer = 0

const glyphCache = new Map() // char -> medians
let lastMedians = null // 当前已优化所用的标准字形，供拖动滑块即时重绘

// 在画布上画一层米字格，给书写留参考
function drawGuide(ctx, w, h) {
  ctx.save()
  ctx.fillStyle = '#fdfbf4'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(200, 120, 90, 0.35)'
  ctx.lineWidth = 1
  ctx.strokeRect(8, 8, w - 16, h - 16)
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(w / 2, 8)
  ctx.lineTo(w / 2, h - 8)
  ctx.moveTo(8, h / 2)
  ctx.lineTo(w - 8, h / 2)
  ctx.moveTo(8, 8)
  ctx.lineTo(w - 8, h - 8)
  ctx.moveTo(w - 8, 8)
  ctx.lineTo(8, h - 8)
  ctx.stroke()
  ctx.restore()
}

function canvasSize(canvas) {
  return { w: canvas.clientWidth, h: canvas.clientHeight }
}

function setupCanvas(canvas) {
  dpr = window.devicePixelRatio || 1
  const { w, h } = canvasSize(canvas)
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return ctx
}

// 重画生笔迹画布：清掉重新铺格子，再用细线描出每一笔
function redrawRaw() {
  const { w, h } = canvasSize(rawCanvas.value)
  drawGuide(rawCtx, w, h)
  rawCtx.strokeStyle = 'rgba(40, 40, 40, 0.8)'
  rawCtx.lineWidth = 2.5
  for (const s of strokes) {
    if (s.length < 2) {
      const p = s[0]
      if (p) {
        rawCtx.beginPath()
        rawCtx.arc(p.x, p.y, 1.6, 0, Math.PI * 2)
        rawCtx.fillStyle = 'rgba(40, 40, 40, 0.8)'
        rawCtx.fill()
      }
      continue
    }
    rawCtx.beginPath()
    rawCtx.moveTo(s[0].x, s[0].y)
    for (let i = 1; i < s.length; i++) rawCtx.lineTo(s[i].x, s[i].y)
    rawCtx.stroke()
  }
}

function clearNice() {
  const { w, h } = canvasSize(niceCanvas.value)
  drawGuide(niceCtx, w, h)
}

function pointFromEvent(e) {
  const rect = rawCanvas.value.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() }
}

function onPointerDown(e) {
  e.currentTarget.setPointerCapture?.(e.pointerId)
  // 优化完成后再次落笔 = 开始新作品
  if (beautified.value) resetAll()
  cancelIdle()
  drawing = true
  current = [pointFromEvent(e)]
}

function onPointerMove(e) {
  if (!drawing) return
  const p = pointFromEvent(e)
  const last = current[current.length - 1]
  if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return
  current.push(p)
  rawCtx.strokeStyle = 'rgba(40, 40, 40, 0.8)'
  rawCtx.lineWidth = 2.5
  rawCtx.beginPath()
  rawCtx.moveTo(last.x, last.y)
  rawCtx.lineTo(p.x, p.y)
  rawCtx.stroke()
}

function onPointerUp() {
  if (!drawing) return
  drawing = false
  if (current && current.length) {
    strokes.push(current)
    hasInk.value = true
  }
  current = null
  startIdle()
}

// 抬笔后开始倒计时；期间再次落笔会被 cancelIdle 打断
function startIdle() {
  cancelIdle()
  if (!hasInk.value) return
  countdown.value = Math.round(IDLE_MS / 1000)
  tickTimer = window.setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
  }, 1000)
  idleTimer = window.setTimeout(() => {
    cancelIdle()
    finish()
  }, IDLE_MS)
}

function cancelIdle() {
  clearTimeout(idleTimer)
  clearInterval(tickTimer)
  idleTimer = 0
  tickTimer = 0
  countdown.value = 0
}

// 从 CDN 按字取标准笔画中线（medians），本地缓存
async function loadGlyph(char) {
  if (glyphCache.has(char)) return glyphCache.get(char)
  const res = await fetch(`${GLYPH_BASE}/${encodeURIComponent(char)}.json`)
  if (!res.ok) throw new Error('glyph not found')
  const data = await res.json()
  const medians = Array.isArray(data.medians) ? data.medians : null
  glyphCache.set(char, medians)
  return medians
}

// 停笔判定写完：先（按需）取标准字形，再优化绘制
async function finish() {
  const char = (targetChar.value || '').trim()
  lastMedians = null
  if (char) {
    loading.value = true
    statusMsg.value = `正在加载「${char}」标准字形…`
    try {
      lastMedians = await loadGlyph(char)
      statusMsg.value = ''
    } catch {
      lastMedians = null
      statusMsg.value = `取不到「${char}」标准字形（可能离线或非常用字），已仅做线条优化`
    }
    loading.value = false
  } else {
    statusMsg.value = ''
  }
  beautify(lastMedians)
}

// 原始轨迹预平滑：书写抖动大，先做几遍三点移动平均去抖（保留时间戳）
function presmooth(stroke) {
  if (stroke.length < 3) return stroke
  let pts = stroke.map((p) => ({ x: p.x, y: p.y, t: p.t }))
  for (let pass = 0; pass < 2; pass++) {
    const next = pts.map((p) => ({ ...p }))
    for (let i = 1; i < pts.length - 1; i++) {
      next[i].x = (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4
      next[i].y = (pts[i - 1].y + pts[i].y * 2 + pts[i + 1].y) / 4
    }
    pts = next
  }
  return pts
}

// Catmull-Rom 样条：把稀疏笔迹插值成顺滑密集曲线，点上带原始分数索引 i
function smoothPath(stroke) {
  const n = stroke.length
  if (n < 3) return stroke.map((p, i) => ({ x: p.x, y: p.y, i }))
  const out = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = stroke[i - 1] || stroke[i]
    const p1 = stroke[i]
    const p2 = stroke[i + 1]
    const p3 = stroke[i + 2] || p2
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const steps = Math.max(2, Math.round(segLen / 3))
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      const t2 = t * t
      const t3 = t2 * t
      out.push({
        x:
          0.5 *
          (2 * p1.x +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y:
          0.5 *
          (2 * p1.y +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        i: i + t
      })
    }
  }
  out.push({ x: stroke[n - 1].x, y: stroke[n - 1].y, i: n - 1 })
  return out
}

// 按弧长把点序列重采样成 n 个点，附带原始分数索引 fi（用于取提按宽度）
function resampleStroke(pts, n) {
  if (pts.length === 1) {
    return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y, fi: 0 }))
  }
  const acc = [0]
  for (let i = 1; i < pts.length; i++) {
    acc[i] = acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  }
  const total = acc[acc.length - 1] || 1
  const out = []
  let seg = 1
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1)
    while (seg < pts.length - 1 && acc[seg] < target) seg++
    const a = pts[seg - 1]
    const b = pts[seg]
    const segLen = acc[seg] - acc[seg - 1] || 1
    const t = Math.min(1, Math.max(0, (target - acc[seg - 1]) / segLen))
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, fi: seg - 1 + t })
  }
  return out
}

// 由运笔速度推算每个原始采样点的提按粗细：运笔慢=按得重=粗，运笔快=提得轻=细
function computeSpeedWidths(stroke) {
  const n = stroke.length
  const widths = new Array(n)
  for (let i = 0; i < n; i++) {
    const a = stroke[i - 1] || stroke[i]
    const b = stroke[i + 1] || stroke[i]
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const dt = Math.max(1, b.t - a.t)
    const speed = dist / dt // px/ms
    widths[i] = maxWidth.value * (0.22 + 0.78 / (1 + speed * 1.4))
  }
  const smooth = widths.slice()
  for (let i = 1; i < n - 1; i++) {
    smooth[i] = (widths[i - 1] + widths[i] * 2 + widths[i + 1]) / 4
  }
  return smooth
}

function sampleWidth(arr, fi) {
  const i0 = Math.max(0, Math.floor(fi))
  const i1 = Math.min(arr.length - 1, i0 + 1)
  const t = fi - i0
  return arr[i0] * (1 - t) + arr[i1] * t
}

// 起笔藏锋（先尖后迅速按足）、收笔出锋（渐细到near 0），做出毛笔的「锋」
function applyTips(pts) {
  const n = pts.length
  if (n < 4) return
  const head = Math.max(2, Math.floor(n * 0.1))
  const tail = Math.max(2, Math.floor(n * 0.16))
  for (let i = 0; i < head; i++) {
    const k = i / head
    pts[i].w *= 0.45 + 0.55 * Math.sqrt(k)
  }
  for (let i = 0; i < tail; i++) {
    const k = i / tail
    pts[n - 1 - i].w *= 0.05 + 0.95 * Math.pow(k, 0.8)
  }
}

// 对点序列做几遍三点平滑（仅位置），抹平形变插值带来的折角
function smoothXY(pts, passes) {
  let p = pts
  for (let s = 0; s < passes; s++) {
    const next = p.map((o) => ({ ...o }))
    for (let i = 1; i < p.length - 1; i++) {
      next[i].x = (p[i - 1].x + p[i].x * 2 + p[i + 1].x) / 4
      next[i].y = (p[i - 1].y + p[i].y * 2 + p[i + 1].y) / 4
    }
    p = next
  }
  return p
}

// 变宽笔画绘制：相邻点连成梯形 + 每点补一个圆，保证转折处平滑无缝
function paintRibbon(ctx, pts, color, grow) {
  ctx.fillStyle = color
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const ar = (a.w + grow) / 2
    const br = (b.w + grow) / 2
    ctx.beginPath()
    ctx.moveTo(a.x + nx * ar, a.y + ny * ar)
    ctx.lineTo(b.x + nx * br, b.y + ny * br)
    ctx.lineTo(b.x - nx * br, b.y - ny * br)
    ctx.lineTo(a.x - nx * ar, a.y - ny * ar)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.arc(a.x, a.y, ar, 0, Math.PI * 2)
    ctx.fill()
  }
  const last = pts[pts.length - 1]
  ctx.beginPath()
  ctx.arc(last.x, last.y, (last.w + grow) / 2, 0, Math.PI * 2)
  ctx.fill()
}

// 先铺一层略胖的淡墨做渗墨晕染，再压一层实色墨，更像宣纸上的毛笔
function drawRibbon(ctx, pts) {
  paintRibbon(ctx, pts, 'rgba(26, 26, 26, 0.16)', 2.4)
  paintRibbon(ctx, pts, INK, 0)
}

function drawDot(p) {
  if (!p) return
  niceCtx.fillStyle = INK
  niceCtx.beginPath()
  niceCtx.arc(p.x, p.y, maxWidth.value * 0.45, 0, Math.PI * 2)
  niceCtx.fill()
}

function bboxOf(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY }
}

// 保持长宽比，把标准字外接框居中映射到你写的区域
function makePlacement(userBox, stdBox) {
  const sw = stdBox.maxX - stdBox.minX || 1
  const sh = stdBox.maxY - stdBox.minY || 1
  const uw = userBox.maxX - userBox.minX || 1
  const uh = userBox.maxY - userBox.minY || 1
  const scale = Math.min(uw / sw, uh / sh)
  const ucx = (userBox.minX + userBox.maxX) / 2
  const ucy = (userBox.minY + userBox.maxY) / 2
  const scx = (stdBox.minX + stdBox.maxX) / 2
  const scy = (stdBox.minY + stdBox.maxY) / 2
  return (p) => ({ x: ucx + (p.x - scx) * scale, y: ucy + (p.y - scy) * scale })
}

// 仅线条优化：保留你的字形，只把线条做毛笔风
function renderStrokeLine(stroke) {
  if (stroke.length < 2) return drawDot(stroke[0])
  const clean = presmooth(stroke)
  const baseW = computeSpeedWidths(clean)
  const pts = smoothPath(clean).map((p) => ({
    x: p.x,
    y: p.y,
    w: sampleWidth(baseW, p.i)
  }))
  applyTips(pts)
  drawRibbon(niceCtx, pts)
}

// 向标准笔画形变：你的笔与标准笔逐点按 α 插值，提按仍取你的运笔
function renderStrokeMorph(stroke, stdStroke, placement, alpha) {
  if (stroke.length < 2) return drawDot(stroke[0])
  const clean = presmooth(stroke)
  const baseW = computeSpeedWidths(clean)
  const uRes = resampleStroke(clean, RESAMPLE_N)
  const sRes = resampleStroke(stdStroke, RESAMPLE_N)
  let pts = uRes.map((u, k) => {
    const s = placement(sRes[k])
    return {
      x: u.x + (s.x - u.x) * alpha,
      y: u.y + (s.y - u.y) * alpha,
      w: sampleWidth(baseW, u.fi)
    }
  })
  pts = smoothXY(pts, 2)
  applyTips(pts)
  drawRibbon(niceCtx, pts)
}

// 把你写的笔迹优化绘制到右侧画布；medians 存在且笔数相符则向标准字形形变
function beautify(medians) {
  clearNice()
  const alpha = morphAlpha.value
  const canMorph = medians && medians.length === strokes.length && alpha > 0
  if (canMorph) {
    const stdStrokes = medians.map((m) => m.map(([x, y]) => ({ x, y: -y })))
    const userAll = strokes.flatMap((s) => s.map((p) => ({ x: p.x, y: p.y })))
    const stdAll = stdStrokes.flat()
    const placement = makePlacement(bboxOf(userAll), bboxOf(stdAll))
    for (let i = 0; i < strokes.length; i++) {
      renderStrokeMorph(strokes[i], stdStrokes[i], placement, alpha)
    }
  } else {
    for (const stroke of strokes) renderStrokeLine(stroke)
    if (medians && medians.length !== strokes.length) {
      statusMsg.value = `你写了 ${strokes.length} 笔，「${targetChar.value}」是 ${medians.length} 笔，已仅做线条优化；请按标准笔顺逐笔书写`
    }
  }
  beautified.value = true
}

// 已优化状态下拖动滑块即时重绘（不重新取字形数据）
function onAdjust() {
  if (beautified.value) beautify(lastMedians)
}

function resetAll() {
  cancelIdle()
  strokes.length = 0
  current = null
  drawing = false
  hasInk.value = false
  beautified.value = false
  statusMsg.value = ''
  lastMedians = null
  redrawRaw()
  clearNice()
}

function onResize() {
  rawCtx = setupCanvas(rawCanvas.value)
  niceCtx = setupCanvas(niceCanvas.value)
  redrawRaw()
  if (beautified.value) beautify(lastMedians)
  else clearNice()
}

onMounted(() => {
  rawCtx = setupCanvas(rawCanvas.value)
  niceCtx = setupCanvas(niceCanvas.value)
  redrawRaw()
  clearNice()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelIdle()
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <main class="calli">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>毛笔书法 · 停笔 2 秒自动优化</h1>
      <p class="subtitle">
        在「宣纸」上书写，停笔 2 秒自动优化成大师笔法。填「目标字」可向标准字形靠拢（请按标准笔顺、笔数一致书写）。
      </p>
    </header>

    <section class="panel">
      <label class="field">
        <span>目标字（选填）</span>
        <input class="char-input" v-model="targetChar" maxlength="1" placeholder="如 永" />
      </label>

      <div class="presets">
        <button
          v-for="c in PRESETS"
          :key="c"
          class="chip"
          :class="{ active: c === targetChar }"
          @click="targetChar = c"
        >
          {{ c }}
        </button>
      </div>

      <label class="field">
        <span>靠近标准 {{ Math.round(morphAlpha * 100) }}%</span>
        <input
          v-model.number="morphAlpha"
          type="range"
          min="0"
          max="1"
          step="0.05"
          @input="onAdjust"
        />
      </label>

      <label class="field">
        <span>笔锋 {{ maxWidth }}px</span>
        <input v-model.number="maxWidth" type="range" min="14" max="48" @input="onAdjust" />
      </label>

      <button class="reset" @click="resetAll">重写</button>

      <span class="status">
        <template v-if="loading">⏳ {{ statusMsg }}</template>
        <template v-else-if="countdown > 0">⏳ {{ countdown }} 秒后自动优化</template>
        <template v-else-if="statusMsg">{{ statusMsg }}</template>
        <template v-else-if="beautified">✓ 优化完成，落笔可重写</template>
        <template v-else>✍️ 落笔开始书写</template>
      </span>
    </section>

    <section class="boards">
      <div class="board">
        <span class="label">你写的（原笔迹）</span>
        <canvas
          ref="rawCanvas"
          class="sheet"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        ></canvas>
      </div>

      <div class="board">
        <span class="label">优化后（大师笔法）</span>
        <canvas ref="niceCanvas" class="sheet"></canvas>
      </div>
    </section>
  </main>
</template>

<style scoped>
.calli {
  max-width: 1180px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.back {
  font-size: 14px;
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
  gap: 22px;
  padding: 16px 22px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.field input[type='range'] {
  width: 150px;
}

.char-input {
  width: 64px;
  padding: 6px 8px;
  font-size: 20px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  width: 34px;
  height: 34px;
  font-size: 17px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.chip.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.reset {
  padding: 9px 18px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.reset:hover {
  box-shadow: var(--shadow-card);
}

.status {
  margin-left: auto;
  font-size: 14px;
  color: var(--color-muted);
  max-width: 360px;
  text-align: right;
}

.boards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 26px;
}

.board {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.label {
  font-size: 13px;
  color: var(--color-muted);
}

.sheet {
  width: 100%;
  height: 380px;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  touch-action: none;
  cursor: crosshair;
}
</style>
