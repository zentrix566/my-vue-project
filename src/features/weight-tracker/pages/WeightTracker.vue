<template>
  <section class="section page-section weight-page">
    <div class="container">
      <div class="page-head">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Weight Tracker</p>
        <h1>体重变化看板</h1>
        <p>身高 {{ HEIGHT_CM }}cm，按月记录体重（单位：斤），展示整体趋势、分年度变化与月度增减。</p>
      </div>

      <div class="metric-grid" aria-label="体重统计">
        <div class="metric-item">
          <span>起始体重</span>
          <strong>{{ formatJin(stats.first.value) }}</strong>
          <small>{{ labelOf(stats.first) }}</small>
        </div>
        <div class="metric-item">
          <span>当前体重</span>
          <strong>{{ formatJin(stats.last.value) }}</strong>
          <small>{{ labelOf(stats.last) }}</small>
        </div>
        <div class="metric-item">
          <span>累计变化</span>
          <strong :class="stats.total < 0 ? 'trend-down' : 'trend-up'">{{ signed(stats.total) }}</strong>
          <small>斤</small>
        </div>
        <div class="metric-item">
          <span>最轻体重</span>
          <strong class="trend-down">{{ formatJin(stats.min.value) }}</strong>
          <small>{{ labelOf(stats.min) }}</small>
        </div>
        <div class="metric-item">
          <span>最重体重</span>
          <strong class="trend-up">{{ formatJin(stats.max.value) }}</strong>
          <small>{{ labelOf(stats.max) }}</small>
        </div>
        <div class="metric-item">
          <span>当前 BMI</span>
          <strong>{{ stats.bmi.toFixed(1) }}</strong>
          <small>kg/m²</small>
        </div>
      </div>

      <section class="dashboard-panel wide-panel">
        <div class="panel-heading">
          <div>
            <h2>整体趋势</h2>
            <p>2023 年 7 月至今，红色标注最重、绿色标注最轻、蓝色标注最新。鼠标移到任意点可看当月体重。</p>
          </div>
        </div>
        <div class="chart-shell">
          <svg :viewBox="`0 0 ${overall.W} ${overall.H}`" role="img" aria-label="整体体重趋势图">
            <g class="chart-grid-lines">
              <line
                v-for="t in overall.yTicks" :key="'gy'+t.value"
                :x1="overall.L" :y1="t.y" :x2="overall.W - overall.R" :y2="t.y"
              />
              <line
                v-for="t in overall.xTicks" :key="'gx'+t.x"
                :x1="t.x" :y1="overall.T" :x2="t.x" :y2="overall.H - overall.B"
              />
            </g>
            <line class="chart-axis-line" :x1="overall.L" :y1="overall.T" :x2="overall.L" :y2="overall.H - overall.B" />
            <line class="chart-axis-line" :x1="overall.L" :y1="overall.H - overall.B" :x2="overall.W - overall.R" :y2="overall.H - overall.B" />
            <text v-for="t in overall.yTicks" :key="'yl'+t.value" x="6" :y="t.y + 4" font-size="11" fill="var(--muted)">{{ t.value }}</text>
            <text v-for="t in overall.xTicks" :key="'xl'+t.x" :x="t.x" :y="overall.H - overall.B + 18" font-size="10" fill="var(--muted)" text-anchor="middle">{{ t.label }}</text>
            <text v-for="t in overall.janTicks" :key="'xy'+t.x" :x="t.x" :y="overall.H - overall.B + 33" font-size="10" font-weight="700" fill="var(--text)" text-anchor="middle">{{ t.year }}</text>
            <path class="trend-path" :d="overall.path" />
            <g v-for="(r,i) in weightRecords" :key="'pt'+i">
              <circle :cx="overall.x(i)" :cy="overall.y(r.value)" r="11" fill="transparent" pointer-events="all" class="hit" @mouseenter="onOverallEnter(r,i)" @mouseleave="overallHover=null" />
              <circle :cx="overall.x(i)" :cy="overall.y(r.value)" r="2.4" class="dot" :class="{ 'dot-max': r.value===stats.max.value, 'dot-min': r.value===stats.min.value }" />
            </g>
            <g v-for="m in overall.markers" :key="m.kind">
              <circle :cx="m.x" :cy="m.y" r="5" :class="'marker-'+m.kind" />
              <rect :x="m.bx" :y="m.by" :width="m.bw" :height="m.bh" rx="4" class="marker-bg" />
              <text :x="m.tx" :y="m.ty" :text-anchor="m.anchor" font-size="12" font-weight="700" :class="'marker-text-'+m.kind">{{ m.text }}</text>
            </g>
            <g v-if="overallHover" class="chart-tip">
              <rect :x="overallHover.tip.x" :y="overallHover.tip.y" :width="overallHover.tip.w" :height="overallHover.tip.h" rx="6" />
              <text v-for="(ln,li) in overallHover.tip.lines" :key="li" :x="overallHover.tip.textX" :y="overallHover.tip.y + overallHover.tip.padY + li*overallHover.tip.lineH + 11" font-size="12" font-weight="600">{{ ln }}</text>
            </g>
          </svg>
        </div>
      </section>

      <section class="dashboard-panel">
        <div class="panel-heading">
          <div>
            <h2>分年度趋势</h2>
            <p>每年一张图，标出该年内的最重与最轻节点。</p>
          </div>
        </div>
        <div class="year-grid">
          <div v-for="yc in yearCharts" :key="yc.year" class="year-card">
            <h3>{{ yc.year }} 年</h3>
            <div class="chart-shell year-chart-shell">
              <svg :viewBox="`0 0 ${yc.W} ${yc.H}`" role="img" :aria-label="yc.year + '年体重趋势'">
                <g class="chart-grid-lines">
                  <line v-for="t in yc.yTicks" :key="'y'+yc.year+t.value" :x1="yc.L" :y1="t.y" :x2="yc.W - yc.R" :y2="t.y" />
                </g>
                <line class="chart-axis-line" :x1="yc.L" :y1="yc.H - yc.B" :x2="yc.W - yc.R" :y2="yc.H - yc.B" />
                <text v-for="t in yc.yTicks" :key="'yl'+yc.year+t.value" x="6" :y="t.y + 4" font-size="10" fill="var(--muted)">{{ t.value }}</text>
                <text v-for="p in yc.xLabels" :key="'x'+yc.year+p.label" :x="p.x" :y="yc.H - yc.B + 16" font-size="10" fill="var(--muted)" text-anchor="middle">{{ p.label }}</text>
                <path class="trend-path" :d="yc.path" />
                <g v-for="(p,i) in yc.points" :key="'p'+yc.year+p.label">
                  <circle :cx="p.x" :cy="p.y" r="9" fill="transparent" pointer-events="all" class="hit" @mouseenter="onYearEnter(yc.year, p)" @mouseleave="yearHover=null" />
                  <circle :cx="p.x" :cy="p.y" r="2.4" class="dot" :class="{ 'dot-max': p.kind==='max', 'dot-min': p.kind==='min' }" />
                  <circle v-if="p.kind" :cx="p.x" :cy="p.y" r="5" :class="'marker-'+p.kind" />
                  <text v-if="p.kind" :x="p.tx" :y="p.ty" :text-anchor="p.anchor" font-size="11" font-weight="700" :class="'marker-text-'+p.kind">{{ p.value }}</text>
                </g>
                <g v-if="yearHover && yearHover.year===yc.year" class="chart-tip">
                  <rect :x="yearHover.tip.x" :y="yearHover.tip.y" :width="yearHover.tip.w" :height="yearHover.tip.h" rx="6" />
                  <text v-for="(ln,li) in yearHover.tip.lines" :key="li" :x="yearHover.tip.textX" :y="yearHover.tip.y + yearHover.tip.padY + li*yearHover.tip.lineH + 11" font-size="12" font-weight="600">{{ ln }}</text>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section class="dashboard-panel wide-panel">
        <div class="panel-heading">
          <div>
            <h2>月度变化</h2>
            <p>每个月经较上月的增减：红色为增重，绿色为减重（斤）。鼠标移到柱子上可看当月体重与增减。</p>
          </div>
        </div>
        <div class="chart-shell">
          <svg :viewBox="`0 0 ${delta.W} ${delta.H}`" role="img" aria-label="月度体重变化图">
            <g class="chart-grid-lines">
              <line
                v-for="t in delta.yTicks" :key="'dy'+t.value"
                :x1="delta.L" :y1="t.y" :x2="delta.W - delta.R" :y2="t.y"
              />
            </g>
            <line class="chart-axis-line" :x1="delta.L" :y1="delta.base" :x2="delta.W - delta.R" :y2="delta.base" />
            <text v-for="t in delta.yTicks" :key="'dl'+t.value" x="6" :y="t.y + 4" font-size="11" fill="var(--muted)">{{ t.value }}</text>
            <text v-for="t in delta.xTicks" :key="'dx'+t.x" :x="t.x" :y="delta.H - delta.B + 18" font-size="10" fill="var(--muted)" text-anchor="middle">{{ t.label }}</text>
            <g v-for="b in delta.bars" :key="'bar'+b.label">
              <rect
                :x="b.x" :y="b.top" :width="b.w" :height="b.h"
                :class="b.value >= 0 ? 'bar-up' : 'bar-down'"
                rx="1.5"
                class="hit"
                @mouseenter="onDeltaEnter(b)" @mouseleave="deltaHover=null"
              />
              <text
                v-if="Math.abs(b.value) >= 4"
                :x="b.cx" :y="b.value >= 0 ? b.top - 6 : b.top + b.h + 14"
                font-size="10" font-weight="700"
                :fill="b.value >= 0 ? 'var(--danger)' : 'var(--accent)'"
                text-anchor="middle"
              >{{ signed(b.value) }}</text>
            </g>
            <g v-if="deltaHover" class="chart-tip">
              <rect :x="deltaHover.tip.x" :y="deltaHover.tip.y" :width="deltaHover.tip.w" :height="deltaHover.tip.h" rx="6" />
              <text v-for="(ln,li) in deltaHover.tip.lines" :key="li" :x="deltaHover.tip.textX" :y="deltaHover.tip.y + deltaHover.tip.padY + li*deltaHover.tip.lineH + 11" font-size="12" font-weight="600">{{ ln }}</text>
            </g>
          </svg>
        </div>
      </section>

      <section class="dashboard-panel">
        <div class="panel-heading">
          <div>
            <h2>逐月明细</h2>
            <p>按月体重及与上月的增减（斤）。可选择年份查看。</p>
          </div>
          <label class="year-select">
            <span>年份</span>
            <select v-model="selectedYear">
              <option value="all">全部</option>
              <option v-for="y in years" :key="y" :value="y">{{ y }} 年</option>
            </select>
          </label>
        </div>
        <div class="table-shell">
          <table class="data-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>体重（斤）</th>
                <th>较上月</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="row.label" :class="{ 'is-min': row.isMin, 'is-max': row.isMax }">
                <td>{{ row.label }}</td>
                <td>{{ formatJin(row.value) }}</td>
                <td :class="row.delta === null ? 'delta-flat' : row.delta > 0 ? 'delta-up' : row.delta < 0 ? 'delta-down' : 'delta-flat'">
                  {{ row.delta === null ? '—' : signed(row.delta) }}
                </td>
                <td>
                  <span v-if="row.isMin" class="tag tag-min">年度最轻</span>
                  <span v-if="row.isMax" class="tag tag-max">年度最重</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="dashboard-panel wide-panel">
        <div class="panel-heading">
          <div>
            <h2>跨年度同月对比</h2>
            <p>同一月份在不同年份的体重（分组柱状图，鼠标移上去看具体数值）。下方表格中绿色为该月历年最轻、红色为历年最重。</p>
          </div>
          <div class="chart-legend cmp-legend">
            <span v-for="y in years" :key="y" :style="{ borderLeftColor: yearColors[y] || 'var(--primary)' }">{{ y }} 年</span>
          </div>
        </div>
        <div class="chart-shell">
          <svg :viewBox="`0 0 ${monthChart.W} ${monthChart.H}`" role="img" aria-label="跨年度同月体重对比图">
            <g class="chart-grid-lines">
              <line v-for="t in monthChart.yTicks" :key="'cy'+t.value" :x1="monthChart.L" :y1="t.y" :x2="monthChart.W - monthChart.R" :y2="t.y" />
            </g>
            <line class="chart-axis-line" :x1="monthChart.L" :y1="monthChart.T" :x2="monthChart.L" :y2="monthChart.H - monthChart.B" />
            <line class="chart-axis-line" :x1="monthChart.L" :y1="monthChart.H - monthChart.B" :x2="monthChart.W - monthChart.R" :y2="monthChart.H - monthChart.B" />
            <text v-for="t in monthChart.yTicks" :key="'cyl'+t.value" x="6" :y="t.y + 4" font-size="11" fill="var(--muted)">{{ t.value }}</text>
            <text v-for="t in monthChart.xLabels" :key="'cx'+t.x" :x="t.x" :y="monthChart.H - monthChart.B + 18" font-size="11" fill="var(--muted)" text-anchor="middle">{{ t.label }}</text>
            <rect
              v-for="(b, i) in monthChart.bars"
              :key="'bar'+i"
              :x="b.x" :y="b.y" :width="b.w" :height="b.h"
              :fill="b.color"
              rx="1.5"
              class="hit"
              @mouseenter="onCmpEnter(b)" @mouseleave="cmpHover=null"
            />
            <g v-if="cmpHover" class="chart-tip">
              <rect :x="cmpHover.tip.x" :y="cmpHover.tip.y" :width="cmpHover.tip.w" :height="cmpHover.tip.h" rx="6" />
              <text v-for="(ln,li) in cmpHover.tip.lines" :key="li" :x="cmpHover.tip.textX" :y="cmpHover.tip.y + cmpHover.tip.padY + li*cmpHover.tip.lineH + 11" font-size="12" font-weight="600">{{ ln }}</text>
            </g>
          </svg>
        </div>
        <div class="table-shell">
          <table class="cmp-table">
            <thead>
              <tr>
                <th>月份</th>
                <th v-for="y in monthComparison.years" :key="y">{{ y }} 年</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in monthComparison.rows" :key="row.month">
                <td>{{ row.month }} 月</td>
                <td
                  v-for="(v, yi) in row.cells"
                  :key="monthComparison.years[yi]"
                  class="cmp-cell"
                  :class="{ 'cmp-min': v != null && v === row.min, 'cmp-max': v != null && v === row.max }"
                >{{ v == null ? '—' : formatJin(v) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { HEIGHT_CM, weightRecords } from '../data/weightData.js'

const formatJin = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
const labelOf = (r) => `${r.year}年${r.month}月`
const signed = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`

const textWidth = (s, fs) => {
  let w = 0
  for (const ch of s) w += ch.charCodeAt(0) > 255 ? fs : fs * 0.6
  return w
}

const makeTip = (cx, cy, lines, opts = {}) => {
  const padX = 10
  const padY = 8
  const lineH = 16
  const fs = 12
  const w = Math.max(...lines.map((l) => textWidth(l, fs))) + padX * 2
  const h = lines.length * lineH + padY * 2
  const maxX = opts.maxX ?? 9999
  const minY = opts.minY ?? 0
  let x = cx + 12
  if (x + w > maxX) x = cx - 12 - w
  if (x < (opts.minX ?? 0)) x = opts.minX ?? 0
  let y = cy - h - 10
  if (y < minY) y = cy + 16
  return { x, y, w, h, lines, textX: x + padX, padY, lineH }
}

const overallHover = ref(null)
const yearHover = ref({ year: null, tip: null })
const deltaHover = ref(null)

const onOverallEnter = (r, i) => {
  overallHover.value = { tip: makeTip(overall.value.x(i), overall.value.y(r.value), [labelOf(r), `体重 ${formatJin(r.value)} 斤`]) }
}

const onYearEnter = (year, p) => {
  yearHover.value = {
    year,
    tip: makeTip(p.x, p.y, [`${year}年${p.label}`, `体重 ${formatJin(p.value)} 斤`], { maxX: 380 - 16, minY: 34 })
  }
}

const onDeltaEnter = (b) => {
  deltaHover.value = {
    tip: makeTip(b.cx, b.value >= 0 ? b.top : b.top + b.h, [b.label, `体重 ${formatJin(b.weight)} 斤`, `较上月 ${signed(b.value)} 斤`], { maxX: delta.value.W - delta.value.R })
  }
}

const stats = computed(() => {
  const first = weightRecords[0]
  const last = weightRecords[weightRecords.length - 1]
  let min = weightRecords[0]
  let max = weightRecords[0]
  for (const r of weightRecords) {
    if (r.value < min.value) min = r
    if (r.value > max.value) max = r
  }
  const total = last.value - first.value
  const kg = last.value / 2
  const bmi = kg / Math.pow(HEIGHT_CM / 100, 2)
  return { first, last, min, max, total, bmi }
})

const years = [...new Set(weightRecords.map((r) => r.year))].sort()
const selectedYear = ref(years[years.length - 1])

const overall = computed(() => {
  const W = 1120
  const H = 420
  const L = 54
  const R = 30
  const T = 50
  const B = 48
  const iW = W - L - R
  const iH = H - T - B
  const vMin = 148
  const vMax = 204
  const n = weightRecords.length
  const x = (i) => L + (i / (n - 1)) * iW
  const y = (v) => T + ((vMax - v) / (vMax - vMin)) * iH

  const yTicks = []
  for (let v = 150; v <= 200; v += 10) yTicks.push({ value: v, y: y(v) })

  const xTicks = weightRecords.map((r, i) => ({ label: String(r.month), x: x(i), isJan: r.month === 1 }))
  const janTicks = weightRecords.filter((r) => r.month === 1).map((r, i) => ({ year: r.year, x: x(weightRecords.indexOf(r)) }))

  const path = weightRecords
    .map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`)
    .join(' ')

  const markers = []
  const addMarker = (kind, r, i, place) => {
    const px = x(i)
    const py = y(r.value)
    const text = `${kind === 'max' ? '最重' : kind === 'min' ? '最轻' : '最新'} ${formatJin(r.value)} · ${labelOf(r)}`
    const tw = textWidth(text, 12)
    let tx = px
    let ty = py
    let anchor = 'start'
    if (place === 'right-above') { tx = px + 12; ty = py - 10; anchor = 'start' }
    if (place === 'right-below') { tx = px + 12; ty = py + 18; anchor = 'start' }
    if (place === 'left-above') { tx = px - 12; ty = py - 10; anchor = 'end' }
    if (anchor === 'start' && tx + tw > W - R) { tx = px - 12; anchor = 'end' }
    if (anchor === 'end' && tx - tw < L) { tx = px + 12; anchor = 'start' }
    if (ty < T + 14) ty = py + 18
    if (ty > H - B) ty = py - 10
    const bx = anchor === 'start' ? tx - 4 : tx - tw - 4
    const by = ty - 12
    markers.push({ kind, x: px, y: py, tx, ty, anchor, text, bx, by, bw: tw + 8, bh: 18 })
  }
  const maxIndex = weightRecords.indexOf(stats.value.max)
  const minIndex = weightRecords.indexOf(stats.value.min)
  addMarker('max', stats.value.max, maxIndex, 'right-above')
  addMarker('min', stats.value.min, minIndex, 'right-below')
  addMarker('current', stats.value.last, n - 1, 'left-above')

  return { W, H, L, R, T, B, yTicks, xTicks, janTicks, path, markers, x, y }
})

const yearCharts = computed(() => {
  const years = [...new Set(weightRecords.map((r) => r.year))].sort()
  return years.map((year) => {
    const rs = weightRecords.filter((r) => r.year === year)
    const W = 380
    const H = 260
    const L = 48
    const R = 16
    const T = 34
    const B = 44
    const iW = W - L - R
    const iH = H - T - B
    const vs = rs.map((r) => r.value)
    let lo = Math.min(...vs)
    let hi = Math.max(...vs)
    const pad = Math.max(2, (hi - lo) * 0.15)
    lo -= pad
    hi += pad
    const x = (i) => L + (i / (rs.length - 1)) * iW
    const y = (v) => T + ((hi - v) / (hi - lo)) * iH
    const path = rs.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(r.value).toFixed(1)}`).join(' ')
    const step = Math.max(1, Math.round((hi - lo) / 4))
    const yTicks = []
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) yTicks.push({ value: v, y: y(v) })
    const xLabels = rs.map((r, i) => ({ label: `${r.month}月`, x: x(i) }))
    const yearMin = Math.min(...vs)
    const yearMax = Math.max(...vs)
    const points = rs.map((r, i) => {
      const px = x(i)
      const py = y(r.value)
      const isMax = r.value === yearMax
      const isMin = r.value === yearMin
      const kind = isMax ? 'max' : isMin ? 'min' : null
      const placeAbove = px < L + 40
      return {
        x: px,
        y: py,
        label: `${r.month}月`,
        value: r.value,
        kind,
        tx: placeAbove ? px + 8 : px - 8,
        ty: py - 8,
        anchor: placeAbove ? 'start' : 'end'
      }
    })
    return { year, W, H, L, R, T, B, path, yTicks, xLabels, points }
  })
})

const delta = computed(() => {
  const W = 1120
  const H = 360
  const L = 54
  const R = 30
  const T = 40
  const B = 52
  const iW = W - L - R
  const iH = H - T - B
  const items = weightRecords.slice(1).map((r, i) => ({
    label: labelOf(r),
    value: r.value - weightRecords[i].value,
    weight: r.value
  }))
  const maxAbs = Math.max(...items.map((d) => Math.abs(d.value)))
  const lim = Math.ceil(maxAbs)
  const scale = lim
  const base = T + iH / 2
  const y = (v) => T + ((scale - v) / (2 * scale)) * iH
  const barW = (iW / items.length) * 0.62
  const bars = items.map((d, i) => {
    const cx = L + ((i + 0.5) / items.length) * iW
    const h = (Math.abs(d.value) / scale) * (iH / 2)
    const top = d.value >= 0 ? y(d.value) : base
    return { ...d, cx, top, h, w: barW, x: cx - barW / 2 }
  })
  const yTicks = []
  const yStep = Math.max(1, Math.ceil((lim * 2) / 6))
  for (let v = -lim; v <= lim; v += yStep) yTicks.push({ value: v, y: y(v) })
  const xTicks = []
  items.forEach((d, i) => {
    const r = weightRecords[i + 1]
    xTicks.push({ label: String(r.month), x: L + ((i + 0.5) / items.length) * iW })
  })
  return { W, H, L, R, T, B, base, bars, yTicks, xTicks }
})

const tableRows = computed(() => {
  const src = selectedYear.value === 'all'
    ? weightRecords
    : weightRecords.filter((r) => r.year === selectedYear.value)
  return src.map((r) => {
    const g = weightRecords.indexOf(r)
    const yearRecords = weightRecords.filter((x) => x.year === r.year)
    const yearValues = yearRecords.map((x) => x.value)
    return {
      label: labelOf(r),
      value: r.value,
      delta: g === 0 ? null : +(r.value - weightRecords[g - 1].value).toFixed(1),
      isMin: r.value === Math.min(...yearValues),
      isMax: r.value === Math.max(...yearValues)
    }
  })
})

const monthComparison = computed(() => {
  const yearCols = years
  const rows = []
  for (let m = 1; m <= 12; m++) {
    const cells = yearCols.map((y) => {
      const rec = weightRecords.find((r) => r.year === y && r.month === m)
      return rec ? rec.value : null
    })
    const vals = cells.filter((v) => v != null)
    rows.push({
      month: m,
      cells,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null
    })
  }
  return { years: yearCols, rows }
})

const yearColors = { 2023: '#2563eb', 2024: '#0f766e', 2025: '#b45309', 2026: '#7c3aed' }

const monthChart = computed(() => {
  const W = 1120
  const H = 420
  const L = 54
  const R = 30
  const T = 56
  const B = 64
  const iW = W - L - R
  const iH = H - T - B
  const vMin = 148
  const vMax = 204
  const y = (v) => T + ((vMax - v) / (vMax - vMin)) * iH
  const yTicks = []
  for (let v = 150; v <= 200; v += 10) yTicks.push({ value: v, y: y(v) })
  const slotW = iW / 12
  const xCenter = (m) => L + (m - 0.5) * slotW
  const xLabels = []
  for (let m = 1; m <= 12; m++) xLabels.push({ label: `${m}月`, x: xCenter(m) })
  const bars = []
  for (let m = 1; m <= 12; m++) {
    const present = years.filter((yr) => weightRecords.some((r) => r.year === yr && r.month === m))
    if (!present.length) continue
    const barW = Math.min((slotW * 0.72) / present.length, slotW * 0.2)
    const startX = xCenter(m) - (present.length * barW) / 2
    present.forEach((yr, k) => {
      const rec = weightRecords.find((r) => r.year === yr && r.month === m)
      const bx = startX + k * barW
      const by = y(rec.value)
      const h = H - B - by
      const w = barW * 0.86
      bars.push({
        year: yr,
        month: m,
        value: rec.value,
        x: bx,
        y: by,
        w,
        h,
        color: yearColors[yr] || 'var(--primary)',
        cx: bx + w / 2
      })
    })
  }
  return { W, H, L, R, T, B, yTicks, xLabels, bars }
})

const cmpHover = ref(null)

const onCmpEnter = (b) => {
  cmpHover.value = {
    tip: makeTip(b.cx, b.y, [`${b.year}年${b.month}月`, `体重 ${formatJin(b.value)} 斤`], { maxX: monthChart.value.W - monthChart.value.R })
  }
}
</script>

<style scoped>
.weight-page {
  padding-top: 60px;
}

.back {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--color-muted);
  font-size: 14px;
  text-decoration: none;
}

.page-head h1 {
  font-size: clamp(2rem, 4vw, 3rem);
  margin: 8px 0 12px;
}

.page-head p {
  color: var(--muted);
  max-width: 760px;
}

.metric-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  margin: 26px 0 30px;
}

.metric-item {
  display: flex;
  flex-direction: column;
  padding: 18px 20px;
}

.metric-item span {
  color: var(--muted);
  font-size: 0.9rem;
}

.metric-item strong {
  color: var(--text);
  font-size: 1.9rem;
  line-height: 1.2;
  margin-top: 4px;
}

.metric-item small {
  color: var(--muted);
  margin-top: 4px;
}

.trend-down {
  color: var(--accent) !important;
}

.trend-up {
  color: var(--danger) !important;
}

.trend-path {
  fill: none;
  stroke: var(--primary);
  stroke-linejoin: round;
  stroke-linecap: round;
  stroke-width: 2.2;
}

.hit {
  cursor: pointer;
}

.dot {
  fill: var(--text);
  opacity: 0.55;
  pointer-events: none;
}

.dot-max {
  fill: var(--danger);
  opacity: 1;
}

.dot-min {
  fill: var(--accent);
  opacity: 1;
}

.chart-tip {
  pointer-events: none;
}

.chart-tip rect {
  fill: rgba(15, 23, 42, 0.92);
  stroke: rgba(255, 255, 255, 0.18);
}

.chart-tip text {
  fill: #ffffff;
  font-weight: 600;
}

.marker-bg {
  fill: rgba(255, 255, 255, 0.92);
  stroke: var(--line);
  stroke-width: 1;
}

.cmp-table {
  border-collapse: collapse;
  font-size: 0.9rem;
  width: 100%;
}

.cmp-table th,
.cmp-table td {
  border-bottom: 1px solid var(--line);
  padding: 9px 10px;
  text-align: center;
}

.cmp-table th {
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.cmp-table td:first-child,
.cmp-table th:first-child {
  color: var(--text);
  font-weight: 700;
  text-align: left;
}

.cmp-cell {
  font-variant-numeric: tabular-nums;
}

.cmp-min {
  background: rgba(15, 118, 110, 0.16);
  color: var(--accent);
  font-weight: 700;
}

.cmp-max {
  background: rgba(185, 28, 28, 0.16);
  color: var(--danger);
  font-weight: 700;
}

.year-select {
  align-items: center;
  color: var(--muted);
  display: inline-flex;
  font-size: 0.9rem;
  font-weight: 700;
  gap: 8px;
}

.year-select select {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font: inherit;
  font-weight: 700;
  min-height: 34px;
  padding: 4px 10px;
}

.wide-panel .panel-heading {
  align-items: flex-start;
}

.marker-max {
  fill: var(--danger);
}

.marker-min {
  fill: var(--accent);
}

.marker-current {
  fill: var(--primary);
}

.marker-text-max {
  fill: var(--danger);
}

.marker-text-min {
  fill: var(--accent);
}

.marker-text-current {
  fill: var(--primary);
}

.year-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
}

.year-card h3 {
  font-size: 1.05rem;
  margin: 0 0 10px;
}

.year-chart-shell {
  min-height: 200px;
}

.year-chart-shell svg {
  min-width: 0;
  width: 100%;
}

.bar-up {
  fill: var(--danger);
}

.bar-down {
  fill: var(--accent);
}

.table-shell {
  overflow-x: auto;
}

.data-table {
  border-collapse: collapse;
  font-size: 0.92rem;
  width: 100%;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--line);
  padding: 9px 12px;
  text-align: left;
}

.data-table th {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.delta-up {
  color: var(--danger);
  font-weight: 700;
}

.delta-down {
  color: var(--accent);
  font-weight: 700;
}

.delta-flat {
  color: var(--muted);
}

.tag {
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
}

.tag-min {
  background: rgba(15, 118, 110, 0.12);
  color: var(--accent);
}

.tag-max {
  background: rgba(185, 28, 28, 0.12);
  color: var(--danger);
}

tr.is-min td:first-child {
  box-shadow: inset 3px 0 0 var(--accent);
}

tr.is-max td:first-child {
  box-shadow: inset 3px 0 0 var(--danger);
}
</style>

