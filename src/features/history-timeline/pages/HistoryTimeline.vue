<template>
  <div class="ht-page">
    <header class="ht-header">
      <div class="ht-topbar">
        <RouterLink to="/" class="back">← 返回首页</RouterLink>
        <span class="counts">{{ eras.length }} 个时期 · {{ groupCount }} 朝 · {{ totalFigures }} 人</span>
      </div>
      <h1>中国历史 · 风流人物长卷</h1>
      <p class="sub">
        自炎黄传说至今约四千六百年，按帝王/统治者分栏；<strong>👑 统治者紧贴轴线排在第一位</strong>，
        风流人物向上生长。<em>"江山代有才人出"——数风流人物，还看今朝。</em>
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
          placeholder="搜索帝王 / 人物 / 身份 / 事迹，如：霍去病"
        />
        <span v-if="query.trim()" class="match-info">
          {{ matchCount ? `命中 ${matchCount} 人/朝` : '没有找到' }}
        </span>
        <span v-else class="hint">拖拽 / 滚轮横移 · 点击人物或统治者看简介</span>
      </div>
    </header>

    <div
      ref="canvas"
      class="ht-canvas"
      :class="{ dragging }"
      @wheel.prevent="onWheel"
      @pointerdown="onPointerDown"
      @scroll="onScroll"
      @click.capture="onClickCapture"
    >
      <div class="ht-inner" :style="{ width: totalWidth + 'px' }">
        <!-- 每个时期一列，内部按帝王分栏 -->
        <section
          v-for="era in layout"
          :key="era.key"
          class="era"
          :style="{ left: era.x + 'px', width: era.width + 'px' }"
        >
          <!-- 该时期的所有帝王子列：人物向上、统治者贴轴 -->
          <div class="groups">
            <div
              v-for="(g, gi) in era.groups"
              :key="era.key + '-' + gi"
              class="group-col"
              :class="{ dim: matchGroups && !matchGroups.has(era.key + '/' + gi) }"
              :style="{ left: g.off + 'px', width: g.width + 'px' }"
            >
              <button
                v-for="fig in g.figures"
                :key="fig.name"
                class="chip"
                :class="{ active: isFigActive(era, g, fig) }"
                :style="{ borderLeftColor: era.color }"
                :title="fig.note"
                @click="openFigure(era, g, fig)"
              >
                <span class="chip-name">{{ fig.name }}</span>
                <span class="chip-role">{{ fig.role }}</span>
              </button>
              <button
                v-if="g.ruler"
                class="ruler-chip"
                :class="{ active: isRulerActive(era, g) }"
                :style="{ background: era.color, borderColor: era.color }"
                :title="g.blurb"
                @click="openRuler(era, g)"
              >
                <span class="crown">👑</span>
                <span class="ruler-main">
                  <span class="ruler-name">{{ g.ruler }}</span>
                  <span class="ruler-title">{{ g.rulerTitle }}</span>
                </span>
              </button>
            </div>
          </div>

          <!-- 朝代色带（横跨整个时期） -->
          <button
            class="era-band"
            :class="{ active: panel?.type === 'era' && panel.era.key === era.key }"
            :style="{ background: era.color + '26', borderTopColor: era.color }"
            @click="openEra(era)"
          >
            <span class="band-name" :style="{ color: era.color }">{{ era.name }}</span>
            <span class="band-years">{{ rangeText(era) }}</span>
          </button>

          <!-- 每个子列的帝王标签 -->
          <div class="group-labels">
            <span
              v-for="(g, gi) in era.groups"
              :key="'gl-' + gi"
              class="g-label"
              :class="{ ruler: g.ruler }"
              :style="{ left: g.off + 'px', width: g.width + 'px' }"
            >{{ g.label }}</span>
          </div>
        </section>

        <!-- 轴线与时期分界刻度 -->
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

    <!-- 详情面板遮罩 -->
    <div v-if="panel" class="detail-backdrop" @click="panel = null"></div>

    <!-- 详情面板 -->
    <aside v-if="panel" class="detail" :style="{ '--era-color': panel.era.color }">
      <button class="close" aria-label="关闭" @click="panel = null">✕</button>
      <template v-if="panel.type === 'figure'">
        <p class="d-era">{{ panel.era.name }} · {{ panel.group.label }}</p>
        <h2>{{ panel.fig.name }}</h2>
        <p class="d-role">{{ panel.fig.role }}</p>
        <p class="d-note">{{ panel.fig.note }}</p>
        <button class="linklike" @click="openEra(panel.era)">
          查看「{{ panel.era.name }}」时期概览 →
        </button>
      </template>
      <template v-else-if="panel.type === 'ruler'">
        <p class="d-era">{{ panel.era.name }} · {{ panel.group.label }}</p>
        <h2>👑 {{ panel.group.ruler }}</h2>
        <p class="d-role">{{ panel.group.rulerTitle }}</p>
        <p class="d-note" v-if="panel.group.blurb">{{ panel.group.blurb }}</p>
        <p class="d-note muted" v-else>该阶段无单一统治者，以群雄并立或权臣执政为主。</p>
        <button class="linklike" @click="openEra(panel.era)">
          查看「{{ panel.era.name }}」时期概览 →
        </button>
      </template>
      <template v-else>
        <p class="d-era">{{ rangeText(panel.era) }} · {{ panel.era.groups.length }} 朝</p>
        <h2>{{ panel.era.name }}</h2>
        <p class="d-tagline">{{ panel.era.tagline }}</p>
        <p class="d-note">{{ panel.era.intro }}</p>
        <div
          v-for="(g, gi) in panel.era.groups"
          :key="'d-' + gi"
          class="d-group"
        >
          <button
            class="d-group-head"
            @click="g.ruler ? openRuler(panel.era, g) : null"
            :disabled="!g.ruler"
          >
            <span class="d-crown">{{ g.ruler ? '👑' : '◈' }}</span>
            <strong>{{ g.label }}</strong>
            <em v-if="g.ruler">{{ g.ruler }}</em>
          </button>
          <div class="d-figs">
            <button
              v-for="fig in g.figures"
              :key="'df-' + fig.name"
              @click="openFigure(panel.era, g, fig)"
            >{{ fig.name }}</button>
          </div>
        </div>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
// 历史数据（23 时期 / 133 帝王朝）从 JSON 读取，改内容直接编辑该文件
import { eras } from '../data/chineseHistory.json'

// 布局常量
const PAD = 24
const ERA_GAP = 18
const GROUP_GAP = 6
const PX_PER_YEAR = 1.9
const GROUP_MIN_W = 100
const EQUAL_GROUP_W = 142

const mode = ref('scale')
const query = ref('')
const canvas = ref(null)
const panel = ref(null)
const dragging = ref(false)
const thumbW = ref(10)
const thumbX = ref(0)

const groupCount = eras.reduce((n, e) => n + e.groups.length, 0)
const totalFigures = eras.reduce(
  (n, e) => n + e.groups.reduce((a, g) => a + g.figures.length + (g.ruler ? 1 : 0), 0),
  0
)

// 计算每个时期及内部每个帝王子列的横向位置/宽度
const layout = computed(() => {
  const items = []
  let x = PAD
  for (const era of eras) {
    let off = 0
    const groups = era.groups.map((g) => {
      const years = Math.max(1, g.end - g.start)
      const width = mode.value === 'equal'
        ? EQUAL_GROUP_W
        : Math.max(GROUP_MIN_W, Math.round(years * PX_PER_YEAR))
      const col = { ...g, off, width }
      off += width + GROUP_GAP
      return col
    })
    const groupsWidth = off - GROUP_GAP
    const eraWidth = Math.max(groupsWidth, era.minW || 0)
    items.push({ ...era, x, width: eraWidth, groups })
    x += eraWidth + ERA_GAP
  }
  return items
})

const totalWidth = computed(() => {
  const last = layout.value[layout.value.length - 1]
  return last.x + last.width + PAD
})

// 打平所有子列，便于搜索定位
const flatGroups = computed(() =>
  layout.value.flatMap((era) =>
    era.groups.map((g, gi) => ({ era, g, gi, absX: era.x + g.off }))
  )
)

// 时期分界刻度
const ticks = computed(() => {
  const list = layout.value.map((it) => ({ x: it.x - ERA_GAP / 2, label: fmtYear(it.start) }))
  const last = layout.value[layout.value.length - 1]
  list.push({ x: last.x + last.width + ERA_GAP / 2, label: fmtYear(last.end) })
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

// 搜索：命中统治者或任一人物的子列整列高亮
const matchGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return null
  const set = new Set()
  flatGroups.value.forEach(({ era, g, gi }) => {
    const hay = [
      g.label, g.ruler, g.rulerTitle, g.blurb,
      ...g.figures.flatMap((f) => [f.name, f.role, f.note])
    ].filter(Boolean).join(' ').toLowerCase()
    if (hay.includes(q)) set.add(era.key + '/' + gi)
  })
  return set
})

const matchCount = computed(() => (matchGroups.value ? matchGroups.value.size : 0))

watch(query, () => {
  if (!matchGroups.value || matchCount.value === 0) return
  const first = flatGroups.value.find((fg) =>
    matchGroups.value.has(fg.era.key + '/' + fg.gi)
  )
  if (first && canvas.value) {
    canvas.value.scrollTo({ left: Math.max(0, first.absX - 80), behavior: 'smooth' })
  }
})

function openFigure(era, group, fig) {
  panel.value = { type: 'figure', era, group, fig }
}
function openRuler(era, group) {
  panel.value = { type: 'ruler', era, group }
}
function openEra(era) {
  panel.value = { type: 'era', era }
}

function isFigActive(era, g, fig) {
  const p = panel.value
  return p?.type === 'figure' && p.era.key === era.key && p.group.label === g.label && p.fig.name === fig.name
}
function isRulerActive(era, g) {
  const p = panel.value
  return p?.type === 'ruler' && p.era.key === era.key && p.group.label === g.label
}

// 滚轮：纵向滚动转横向
function onWheel(e) {
  if (!canvas.value) return
  canvas.value.scrollLeft += e.deltaY + e.deltaX
}

// 鼠标拖拽平移：用 window 监听 move/up，避免在画布上 setPointerCapture 把
// 卡片的 click 也劫持走（那会导致点卡片弹不出简介）
let dragStartX = 0
let dragStartLeft = 0
let moved = 0

function onPointerDown(e) {
  if (e.pointerType !== 'mouse' || e.button !== 0 || !canvas.value) return
  dragging.value = true
  moved = 0
  dragStartX = e.clientX
  dragStartLeft = canvas.value.scrollLeft
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragUp, { once: true })
}

function onDragMove(e) {
  const dx = e.clientX - dragStartX
  moved = Math.max(moved, Math.abs(dx))
  if (canvas.value) canvas.value.scrollLeft = dragStartLeft - dx
}

function onDragUp() {
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
}

// 拖拽松手会触发一次 click，这里把它拦掉；普通点击（moved≈0）放行给卡片
function onClickCapture(e) {
  const wasDrag = moved > 8
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
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragUp)
})
</script>

<style scoped>
.ht-page {
  padding: 24px 0 40px;
}

.ht-header {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 20px 18px;
}

.ht-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.back { font-size: 14px; }
.counts { color: var(--color-muted); font-size: 13px; }

.ht-header h1 { margin: 10px 0 6px; font-size: 26px; }
.ht-header .sub { margin: 0; color: var(--color-muted); font-size: 14px; }
.ht-header .sub strong { color: var(--color-text); }
.ht-header .sub em { font-style: normal; color: var(--color-text); }

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
.modes button.on { background: var(--color-primary); color: #fff; }

.search {
  flex: 0 1 320px;
  min-width: 200px;
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 13px;
  background: var(--color-card);
  color: var(--color-text);
}
.hint, .match-info { font-size: 12px; color: var(--color-muted); }

/* ---------- 时间轴画布 ---------- */
.ht-canvas {
  position: relative;
  margin: 6px 12px 0;
  height: 640px;
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
.ht-canvas.dragging { cursor: grabbing; }
.ht-inner { position: relative; height: 100%; }

/* 每个时期 */
.era {
  position: absolute;
  bottom: 0;
  height: 100%;
}

/* 子列容器：人物与统治者都在其中 */
.groups {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 118px;
  height: 470px;
}

.group-col {
  position: absolute;
  bottom: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  gap: 6px;
  padding: 0 3px;
  transition: opacity 0.15s ease;
}
.group-col.dim { opacity: 0.14; }
.group-col.dim .chip,
.group-col.dim .ruler-chip { pointer-events: none; }

/* 人物卡片 */
.chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 3px 8px 4px 7px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-left: 3px solid #999;
  border-radius: 7px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.chip:hover { transform: translateY(-2px); box-shadow: 0 5px 14px rgba(0,0,0,0.14); }
.chip.active { box-shadow: 0 0 0 2px rgba(47,111,237,0.5); }
.chip-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.chip-role { font-size: 10.5px; color: var(--color-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }

/* 统治者卡片：贴轴、突出 */
.ruler-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border: 2px solid #999;
  border-radius: 8px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.25);
  cursor: pointer;
  max-width: 100%;
  overflow: hidden;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}
.ruler-chip:hover { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 6px 16px rgba(0,0,0,0.2); }
.ruler-chip.active { box-shadow: 0 0 0 2px rgba(47,111,237,0.6), 0 6px 16px rgba(0,0,0,0.2); }
.ruler-chip .crown { font-size: 15px; line-height: 1; flex: 0 0 auto; }
.ruler-main { display: flex; flex-direction: column; align-items: stretch; line-height: 1.15; min-width: 0; flex: 1; overflow: hidden; }
.ruler-name { font-size: 13.5px; font-weight: 700; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.ruler-title { font-size: 10px; opacity: 0.9; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }

/* 朝代色带 */
.era-band {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 78px;
  height: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1px;
  border: none;
  border-top: 3px solid #999;
  border-radius: 0 0 6px 6px;
  cursor: pointer;
  transition: filter 0.15s ease, box-shadow 0.15s ease;
}
.era-band:hover { filter: brightness(0.96); }
.era-band.active { box-shadow: inset 0 0 0 2px rgba(47,111,237,0.4); }
.band-name { font-size: 15px; font-weight: 700; line-height: 1.1; }
.band-years { font-size: 10px; color: #6b6455; }

/* 每个子列的帝王标签 */
.group-labels {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 30px;
  height: 40px;
}
.g-label {
  position: absolute;
  text-align: center;
  font-size: 10.5px;
  color: #857a63;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
}
.g-label.ruler { color: #6b5a35; font-weight: 600; }

/* 轴线与刻度 */
.axis-line {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 72px;
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
  bottom: 20px;
  width: 1px;
  height: 8px;
  background: #a89c82;
}

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
  left: 0; top: 0;
  height: 100%;
  min-width: 8px;
  border-radius: 2px;
  background: var(--color-primary);
  opacity: 0.6;
}

/* ---------- 详情面板 ---------- */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 20, 30, 0.28);
  z-index: 29;
  animation: ht-fade 0.15s ease;
}

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
  box-shadow: 0 12px 36px rgba(0,0,0,0.22);
  padding: 18px 20px 20px;
  z-index: 30;
  animation: ht-panel-in 0.18s ease;
}

@keyframes ht-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes ht-panel-in {
  from { opacity: 0; transform: translateX(18px); }
  to { opacity: 1; transform: none; }
}
.detail .close {
  position: absolute; right: 10px; top: 10px;
  border: none; background: transparent;
  font-size: 14px; color: var(--color-muted);
  cursor: pointer; padding: 4px 6px; border-radius: 6px;
}
.detail .close:hover { background: var(--color-bg); color: var(--color-text); }
.d-era { margin: 0 0 2px; font-size: 12px; color: var(--era-color, var(--color-primary)); font-weight: 600; }
.detail h2 { margin: 0 0 6px; font-size: 24px; }
.d-tagline { margin: 0 0 8px; font-size: 13px; color: var(--color-muted); }
.d-role { margin: 0 0 10px; font-size: 13px; color: var(--color-muted); }
.d-note { margin: 0 0 12px; font-size: 14px; line-height: 1.7; }
.d-note.muted { color: var(--color-muted); font-style: italic; }
.linklike {
  border: none; background: transparent;
  color: var(--color-primary);
  font-size: 13px; cursor: pointer; padding: 0;
}
.linklike:hover { text-decoration: underline; }

.d-group { margin-top: 12px; border-top: 1px dashed var(--color-border); padding-top: 8px; }
.d-group-head {
  display: flex; align-items: center; gap: 6px;
  width: 100%;
  border: none; background: transparent;
  padding: 2px 0;
  font-size: 13px;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}
.d-group-head:disabled { cursor: default; }
.d-group-head em { color: var(--color-muted); font-style: normal; font-size: 12px; }
.d-group-head:not(:disabled):hover strong { color: var(--color-primary); }
.d-crown { font-size: 13px; }
.d-figs { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.d-figs button {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  cursor: pointer;
  color: var(--color-text);
}
.d-figs button:hover { border-color: var(--era-color, var(--color-primary)); }

@media (max-width: 640px) {
  .ht-canvas { height: 560px; margin: 6px 8px 0; }
  .groups { height: 400px; }
  .detail {
    left: 12px; right: 12px;
    top: auto; bottom: 12px;
    width: auto; max-height: 50vh;
  }
}
</style>
