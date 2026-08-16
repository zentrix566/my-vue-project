<template>
  <div class="ht-page">
    <header class="ht-header">
      <div class="ht-topbar">
        <RouterLink to="/" class="back">← 返回首页</RouterLink>
        <span class="counts">{{ eras.length }} 个时期 · {{ totalFigures }} 位人物</span>
      </div>
      <h1>中国历史 · 风流人物长卷</h1>
      <p class="sub">
        自炎黄传说至今约四千六百年，一条横轴看尽各时代当仁不让的风流人物。
        <em>"江山代有才人出"——数风流人物，还看今朝。</em>
      </p>
      <div class="toolbar">
        <div class="modes" role="group" aria-label="时间轴比例">
          <button :class="{ on: mode === 'scale' }" @click="mode = 'scale'">按时长</button>
          <button :class="{ on: mode === 'equal' }" @click="mode = 'equal'">等宽</button>
        </div>
        <input
          v-model="query"
          class="search"
          type="search"
          placeholder="搜索人物 / 身份 / 事迹，如：霍去病"
        />
        <span v-if="query.trim()" class="match-info">
          {{ matchCount ? `命中 ${matchCount} 人` : '没有找到' }}
        </span>
        <span v-else class="hint">拖拽 / 滚轮横移 · 点击人物或朝代色带看详情</span>
      </div>
    </header>

    <div
      ref="canvas"
      class="ht-canvas"
      :class="{ dragging }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @scroll="onScroll"
      @click.capture="onClickCapture"
    >
      <div class="ht-inner" :style="{ width: totalWidth + 'px' }">
        <!-- 轴线上方：各时期人物卡片列 -->
        <div
          v-for="era in layout"
          :key="era.key"
          class="era-col"
          :class="{ faded: hoverKey && hoverKey !== era.key }"
          :style="{
            left: era.x + 'px',
            width: era.width + 'px',
            background: era.color + '0d',
            borderLeftColor: era.color + '55'
          }"
        >
          <button
            v-for="fig in era.figures"
            :key="fig.name"
            class="chip"
            :class="{
              dim: matchSet && !matchSet.has(era.key + '/' + fig.name),
              active: panel?.type === 'figure' && panel.era.key === era.key && panel.fig.name === fig.name
            }"
            :style="{ borderLeftColor: era.color }"
            @click="openFigure(era, fig)"
            @pointerenter="hoverKey = era.key"
            @pointerleave="hoverKey = null"
          >
            <span class="chip-name">{{ fig.name }}</span>
            <span class="chip-role">{{ fig.role }}</span>
          </button>
        </div>

        <!-- 朝代色带 -->
        <button
          v-for="era in layout"
          :key="'band-' + era.key"
          class="era-band"
          :class="{ faded: hoverKey && hoverKey !== era.key, active: panel?.type === 'era' && panel.era.key === era.key }"
          :style="{
            left: era.x + 'px',
            width: era.width + 'px',
            background: era.color + '26',
            borderTopColor: era.color
          }"
          @click="openEra(era)"
          @pointerenter="hoverKey = era.key"
          @pointerleave="hoverKey = null"
        >
          <span class="band-name" :style="{ color: era.color }">{{ era.name }}</span>
          <span class="band-years">{{ rangeText(era) }}</span>
        </button>

        <!-- 轴线与刻度 -->
        <div class="axis-line"></div>
        <span
          v-for="(tick, i) in ticks"
          :key="'tick-' + i"
          class="tick"
          :style="{ left: tick.x + 'px' }"
        >{{ tick.label }}</span>
      </div>
    </div>

    <div class="ht-progress" aria-hidden="true">
      <div
        class="thumb"
        :style="{ width: thumbW + '%', transform: `translateX(${thumbX}px)` }"
      ></div>
    </div>

    <!-- 详情面板 -->
    <aside v-if="panel" class="detail" :style="{ '--era-color': panel.era.color }">
      <button class="close" aria-label="关闭" @click="panel = null">✕</button>
      <template v-if="panel.type === 'figure'">
        <p class="d-era">{{ panel.era.name }} · {{ panel.fig.stage }}</p>
        <h2>{{ panel.fig.name }}</h2>
        <p class="d-role">{{ panel.fig.role }}</p>
        <p class="d-note">{{ panel.fig.note }}</p>
        <button class="linklike" @click="panel = { type: 'era', era: panel.era }">
          查看「{{ panel.era.name }}」时期概览 →
        </button>
      </template>
      <template v-else>
        <p class="d-era">{{ rangeText(panel.era) }} · {{ panel.era.figures.length }} 位人物</p>
        <h2>{{ panel.era.name }}</h2>
        <p class="d-tagline">{{ panel.era.tagline }}</p>
        <p class="d-note">{{ panel.era.intro }}</p>
        <div class="d-figs">
          <button
            v-for="fig in panel.era.figures"
            :key="'d-' + fig.name"
            :class="{ on: panel.selName === fig.name }"
            @click="panel = { type: 'figure', era: panel.era, fig, selName: fig.name }"
          >{{ fig.name }}</button>
        </div>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { eras } from '../data/chineseHistory.js'

// 布局常量：间距、每年像素（"按时长"模式）、等宽模式的段宽
const GAP = 14
const PAD = 28
const PX_PER_YEAR = 1.7
const EQUAL_W = 460
const DEFAULT_MIN_W = 240

const mode = ref('scale')
const query = ref('')
const canvas = ref(null)
const panel = ref(null)
const hoverKey = ref(null)
const dragging = ref(false)
const thumbW = ref(10)
const thumbX = ref(0)

const totalFigures = eras.reduce((n, e) => n + e.figures.length, 0)

// 计算每个时期的横向位置与宽度
const layout = computed(() => {
  const items = []
  let x = PAD
  for (const era of eras) {
    const years = era.end - era.start
    const width = mode.value === 'equal'
      ? EQUAL_W
      : Math.max(era.minW || DEFAULT_MIN_W, Math.round(years * PX_PER_YEAR))
    items.push({ ...era, x, width })
    x += width + GAP
  }
  return items
})

const totalWidth = computed(() => {
  const last = layout.value[layout.value.length - 1]
  return last.x + last.width + PAD
})

// 轴线刻度：每个时期起点一处，末尾补一处终点
const ticks = computed(() => {
  const items = layout.value
  const list = items.map((it) => ({ x: it.x - GAP / 2, label: fmtYear(it.start) }))
  const last = items[items.length - 1]
  list.push({ x: last.x + last.width + GAP / 2, label: fmtYear(last.end) })
  return list
})

function fmtYear(y) {
  if (y < 0) return `前${-y}`
  if (y > 0 && y < 100) return `公元${y}`
  return `${y}`
}

function rangeText(era) {
  const end = era.key === 'dangdai' ? '今' : fmtYear(era.end)
  return `${fmtYear(era.start)} – ${end}（${era.end - era.start} 年）`
}

// 搜索：按姓名 / 身份 / 时期 / 事迹模糊匹配
const matchSet = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return null
  const set = new Set()
  for (const era of eras) {
    for (const fig of era.figures) {
      const hay = (fig.name + fig.role + fig.stage + fig.note).toLowerCase()
      if (hay.includes(q)) set.add(era.key + '/' + fig.name)
    }
  }
  return set
})

const matchCount = computed(() => (matchSet.value ? matchSet.value.size : 0))

watch(query, () => {
  if (!matchSet.value || matchCount.value === 0) return
  const first = layout.value.find((it) =>
    it.figures.some((f) => matchSet.value.has(it.key + '/' + f.name))
  )
  if (first && canvas.value) {
    canvas.value.scrollTo({ left: Math.max(0, first.x - 80), behavior: 'smooth' })
  }
})

function openFigure(era, fig) {
  panel.value = { type: 'figure', era, fig, selName: fig.name }
}

function openEra(era) {
  panel.value = { type: 'era', era }
}

// 滚轮：纵向滚动转横向平移
function onWheel(e) {
  if (!canvas.value) return
  canvas.value.scrollLeft += e.deltaY + e.deltaX
}

// 鼠标拖拽平移（触摸交给浏览器原生滚动）
let dragStartX = 0
let dragStartLeft = 0
let moved = 0

function onPointerDown(e) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !canvas.value) return
  dragging.value = true
  moved = 0
  dragStartX = e.clientX
  dragStartLeft = canvas.value.scrollLeft
  canvas.value.setPointerCapture(e.pointerId)
}

function onPointerMove(e) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  moved = Math.max(moved, Math.abs(dx))
  canvas.value.scrollLeft = dragStartLeft - dx
}

function onPointerUp() {
  dragging.value = false
  // 松手后留一帧再清零，让随后的 click 能读到 moved 值以判断是否拖拽
  setTimeout(() => {
    moved = 0
  }, 0)
}

// 拖拽后松手误触的点击要拦掉；无论是否拦截都重置，避免状态残留挡住后续点击
function onClickCapture(e) {
  const wasDrag = moved > 6
  moved = 0
  if (wasDrag) {
    e.stopPropagation()
    e.preventDefault()
  }
}

function onScroll() {
  const el = canvas.value
  if (!el || !el.scrollWidth) return
  const ratio = el.clientWidth / el.scrollWidth
  thumbW.value = Math.max(4, ratio * 100)
  thumbX.value = (el.scrollLeft / el.scrollWidth) * el.clientWidth
}

function onKeydown(e) {
  if (e.key === 'Escape') panel.value = null
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  onScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.ht-page {
  padding: 24px 0 40px;
}

.ht-header {
  max-width: 1180px;
  margin: 0 auto;
  padding: 0 20px 18px;
}

.ht-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back {
  font-size: 14px;
}

.counts {
  color: var(--color-muted);
  font-size: 13px;
}

.ht-header h1 {
  margin: 10px 0 6px;
  font-size: 26px;
}

.ht-header .sub {
  margin: 0;
  color: var(--color-muted);
  font-size: 14px;
}

.ht-header .sub em {
  font-style: normal;
  color: var(--color-text);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.modes {
  display: inline-flex;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-card);
}

.modes button {
  border: none;
  background: transparent;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-muted);
}

.modes button.on {
  background: var(--color-primary);
  color: #fff;
}

.search {
  flex: 0 1 280px;
  min-width: 180px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  background: var(--color-card);
  color: var(--color-text);
}

.hint,
.match-info {
  font-size: 12px;
  color: var(--color-muted);
}

/* ---------- 时间轴画布 ---------- */

.ht-canvas {
  position: relative;
  margin: 6px 12px 0;
  height: 560px;
  overflow-x: auto;
  overflow-y: hidden;
  background: linear-gradient(to bottom, #faf7f0, #f3eee2);
  border: 1px solid #e7e0cf;
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  cursor: grab;
  user-select: none;
  touch-action: pan-x pan-y;
  scrollbar-width: thin;
}

.ht-canvas.dragging {
  cursor: grabbing;
}

.ht-inner {
  position: relative;
  height: 100%;
}

/* 人物卡片列：wrap-reverse 让第一行贴着轴线，向上生长 */
.era-col {
  position: absolute;
  bottom: 96px;
  height: 400px;
  display: flex;
  flex-wrap: wrap-reverse;
  align-content: flex-start;
  align-items: flex-start;
  gap: 7px;
  padding: 6px 6px 8px;
  border-left: 2px solid transparent;
  border-radius: 0 10px 10px 0;
  transition: opacity 0.15s ease;
}

.chip {
  flex: 0 1 auto;
  max-width: 148px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 4px 9px 4px 8px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-left: 3px solid #999;
  border-radius: 8px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.15s ease;
}

.chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.14);
}

.chip.active {
  box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.5);
}

.chip.dim {
  opacity: 0.16;
  pointer-events: none;
}

.chip-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.chip-role {
  font-size: 10.5px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 朝代色带 */
.era-band {
  position: absolute;
  bottom: 50px;
  height: 46px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1px;
  border: none;
  border-top: 3px solid #999;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  transition: opacity 0.15s ease, filter 0.15s ease;
}

.era-band:hover {
  filter: brightness(0.96);
}

.era-band.active {
  box-shadow: inset 0 0 0 2px rgba(47, 111, 237, 0.35);
}

.band-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.band-years {
  font-size: 10.5px;
  color: #6b6455;
}

.faded {
  opacity: 0.35;
}

/* 轴线与刻度 */
.axis-line {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 44px;
  height: 2px;
  background: linear-gradient(to right, #b9ae95, #8f7f5f, #b9ae95);
  border-radius: 1px;
}

.tick {
  position: absolute;
  bottom: 8px;
  transform: translateX(-50%);
  font-size: 10.5px;
  color: #857a63;
  white-space: nowrap;
}

.tick::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 24px;
  width: 1px;
  height: 8px;
  background: #a89c82;
}

/* 滚动进度条 */
.ht-progress {
  position: relative;
  height: 4px;
  margin: 10px 12px 0;
  border-radius: 2px;
  background: var(--color-border);
  overflow: hidden;
}

.ht-progress .thumb {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  min-width: 8px;
  border-radius: 2px;
  background: var(--color-primary);
  opacity: 0.6;
}

/* ---------- 详情面板 ---------- */

.detail {
  position: fixed;
  right: 20px;
  top: 84px;
  width: 340px;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-top: 4px solid var(--era-color, var(--color-primary));
  border-radius: var(--radius);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
  padding: 18px 20px 20px;
  z-index: 30;
}

.detail .close {
  position: absolute;
  right: 10px;
  top: 10px;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
}

.detail .close:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.d-era {
  margin: 0 0 2px;
  font-size: 12px;
  color: var(--era-color, var(--color-primary));
  font-weight: 600;
}

.detail h2 {
  margin: 0 0 6px;
  font-size: 24px;
}

.d-tagline {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--color-muted);
}

.d-role {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--color-muted);
}

.d-note {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.7;
}

.linklike {
  border: none;
  background: transparent;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.linklike:hover {
  text-decoration: underline;
}

.d-figs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.d-figs button {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 999px;
  padding: 3px 11px;
  font-size: 12px;
  cursor: pointer;
  color: var(--color-text);
}

.d-figs button.on {
  background: var(--era-color, var(--color-primary));
  border-color: var(--era-color, var(--color-primary));
  color: #fff;
}

@media (max-width: 640px) {
  .ht-canvas {
    height: 500px;
    margin: 6px 8px 0;
  }

  .era-col {
    height: 350px;
  }

  .detail {
    left: 12px;
    right: 12px;
    top: auto;
    bottom: 12px;
    width: auto;
  }
}
</style>
