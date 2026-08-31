<template>
  <section class="section page-section running-page">
    <div class="container">
      <header class="page-head">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Monthly Running</p>
        <h1>跑步数据看板</h1>
        <p>按月汇总跑量、配速、次数与累计爬升；切换口径可直观看到越野对训练负荷的影响。</p>
      </header>

      <div class="mode-switch" role="group" aria-label="统计口径">
        <button type="button" :class="{ active: mode === 'plain' }" @click="setMode('plain')">仅跑步</button>
        <button type="button" :class="{ active: mode === 'all' }" @click="setMode('all')">含越野</button>
      </div>

      <div class="metric-grid" aria-label="本月跑步统计">
        <div class="metric-item metric-item-current"><span>本月距离</span><strong>{{ latest.distance.toFixed(2) }}</strong><small>公里 · {{ labelOf(latest) }}</small></div>
        <div class="metric-item"><span>较上月</span><strong :class="changeClass(monthChange.distance)">{{ signed(monthChange.distance) }}</strong><small>公里</small></div>
        <div class="metric-item"><span>较去年同期</span><strong :class="changeClass(yearChange.distance)">{{ signed(yearChange.distance) }}</strong><small>公里</small></div>
        <div class="metric-item"><span>本月平均配速</span><strong>{{ formatPace(latest.pace) }}</strong><small>/km</small></div>
        <div class="metric-item"><span>本月次数</span><strong>{{ latest.sessions }}</strong><small>平均 {{ latest.averageDistance.toFixed(2) }} km / 次</small></div>
        <div class="metric-item"><span>本月累计爬升</span><strong>{{ latest.elevation.toLocaleString() }}</strong><small>米 <template v-if="latest.mountain">· 有爬山</template></small></div>
      </div>

      <section class="dashboard-panel wide-panel">
        <div class="panel-heading"><div><h2>月度距离趋势</h2><p>横轴为月份，纵轴为月跑量；点击节点查看当月完整数据。</p></div></div>
        <div class="chart-shell"><svg :viewBox="`0 0 ${distanceChart.W} ${distanceChart.H}`" role="img" aria-label="月度距离趋势图">
          <g class="chart-grid-lines"><line v-for="tick in distanceChart.ticks" :key="tick.value" :x1="distanceChart.L" :x2="distanceChart.W-distanceChart.R" :y1="tick.y" :y2="tick.y" /><line v-for="tick in distanceChart.xTicks" :key="`g${tick.label}`" :x1="tick.x" :x2="tick.x" :y1="distanceChart.T" :y2="distanceChart.H-distanceChart.B" /></g>
          <text v-for="tick in distanceChart.ticks" :key="`t${tick.value}`" x="8" :y="tick.y+4" font-size="11" fill="var(--muted)">{{ tick.value }}</text>
          <text v-for="tick in distanceChart.xTicks" :key="tick.label" :x="tick.x" :y="distanceChart.H-distanceChart.B+20" font-size="10" fill="var(--muted)" text-anchor="middle">{{ tick.label }}</text>
          <rect v-for="bar in distanceChart.bars" :key="bar.record.key" :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h" rx="2" class="monthly-distance-bar" @click="selected = bar.record" @mouseenter="selected = bar.record"><title>{{ labelOf(bar.record) }}：{{ bar.record.distance.toFixed(2) }} km</title></rect>
          <g v-if="selected" class="chart-tip" :transform="`translate(${distanceChart.tipX}, ${distanceChart.tipY})`"><rect width="154" height="70" rx="7" /><text x="10" y="19">{{ labelOf(selected) }} · {{ selected.distance.toFixed(2) }} km</text><text x="10" y="38">配速 {{ formatPace(selected.pace) }} /km</text><text x="10" y="57">{{ selected.sessions }} 次 · 爬升 {{ selected.elevation }} m</text></g>
        </svg></div>
      </section>

      <section class="dashboard-panel wide-panel"><div class="panel-heading"><div><h2>分年度距离趋势</h2><p>每年单独一张柱状图，横轴为月份；鼠标移到柱子上可查看该月距离、配速与次数。</p></div></div><div class="year-chart-grid"><article v-for="chart in yearCharts" :key="chart.year" class="year-chart"><h3>{{ chart.year }} 年 <small>共 {{ chart.total.toFixed(1) }} km</small></h3><div class="chart-shell"><svg :viewBox="`0 0 ${chart.W} ${chart.H}`" role="img" :aria-label="`${chart.year}年距离柱状图`"><g class="chart-grid-lines"><line v-for="tick in chart.ticks" :key="tick.value" :x1="chart.L" :x2="chart.W-chart.R" :y1="tick.y" :y2="tick.y" /></g><text v-for="tick in chart.ticks" :key="`l${tick.value}`" x="4" :y="tick.y+4" font-size="10" fill="var(--muted)">{{ tick.value }}</text><rect v-for="bar in chart.bars" :key="bar.record.key" :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h" rx="3" class="distance-bar" :class="{ 'is-max': bar.isMax, 'is-min': bar.isMin }" @mouseenter="yearSelected = bar.record" @mouseleave="yearSelected = null"><title>{{ labelOf(bar.record) }}：{{ bar.record.distance.toFixed(2) }} km</title></rect><text v-for="bar in chart.bars" :key="`m${bar.record.key}`" :x="bar.cx" :y="chart.H-chart.B+17" font-size="10" fill="var(--muted)" text-anchor="middle">{{ bar.record.month }}月</text><g v-if="chart.tooltip" class="chart-tip" :transform="`translate(${chart.tooltip.x}, ${chart.tooltip.y})`"><rect width="132" height="56" rx="7" /><text x="9" y="18">{{ labelOf(chart.tooltip.record) }}</text><text x="9" y="36">{{ chart.tooltip.record.distance.toFixed(2) }} km · {{ formatPace(chart.tooltip.record.pace) }}</text><text x="9" y="51">{{ chart.tooltip.record.sessions }} 次</text></g></svg></div></article></div></section>

      <section class="dashboard-panel wide-panel"><div class="panel-heading"><div><h2>逐月明细与同比</h2><p>同一个月横向比较各年份：大字为距离，小字为平均配速；红色为该月历年最高跑量，绿色为最低跑量。</p></div></div><div class="table-shell comparison-shell"><table class="comparison-table"><thead><tr><th>月份</th><th v-for="year in comparison.years" :key="year">{{ year }} 年</th></tr></thead><tbody><tr v-for="row in comparison.rows" :key="row.month"><th>{{ row.month }}月</th><td v-for="cell in row.cells" :key="cell.year" :class="{ 'comparison-max': cell.record && cell.record.distance === row.max, 'comparison-min': cell.record && cell.record.distance === row.min, 'is-latest': cell.record && cell.record.key === latest.key }"><template v-if="cell.record"><strong>{{ cell.record.distance.toFixed(2) }} <small>km</small></strong><span>{{ formatPace(cell.record.pace) }}/km</span></template><template v-else>—</template></td></tr></tbody></table></div></section>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { monthlyRunning } from '../data/monthlyRunning.js'

const mode = ref('plain')
const selected = ref(null)
const yearSelected = ref(null)
const labelOf = (r) => `${r.year}年${r.month}月`
const formatPace = (seconds) => `${Math.floor(seconds / 60)}分${String(Math.round(seconds % 60)).padStart(2, '0')}`
const signed = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`
const changeClass = (value) => value <= 0 ? 'trend-down' : 'trend-up'
const setMode = (nextMode) => {
  mode.value = nextMode
  selected.value = null
  yearSelected.value = null
}

const records = computed(() => monthlyRunning.map((item) => ({ ...item[mode.value], year: item.year, month: item.month, key: `${item.year}-${item.month}`, mountain: mode.value === 'all' && item.all.mountain })))
const latest = computed(() => records.value.at(-1))
const prior = computed(() => records.value.at(-2))
const lastYear = computed(() => records.value.find((item) => item.year === latest.value.year - 1 && item.month === latest.value.month))
const monthChange = computed(() => ({ distance: latest.value.distance - prior.value.distance }))
const yearChange = computed(() => ({ distance: latest.value.distance - lastYear.value.distance }))

const distanceChart = computed(() => {
  const W = 1080, H = 330, L = 52, R = 24, T = 26, B = 48
  const max = Math.ceil(Math.max(...records.value.map((r) => r.distance)) / 50) * 50
  const x = (i) => L + (i / (records.value.length - 1)) * (W - L - R)
  const y = (v) => T + ((max - v) / max) * (H - T - B)
  const points = records.value.map((record, i) => ({ record, key: record.key, x: x(i), y: y(record.distance) }))
  const slot = (W - L - R) / records.value.length
  const bars = points.map((point) => ({ record: point.record, x: point.x - slot * .31, y: point.y, w: Math.max(4, slot * .62), h: H - B - point.y }))
  const ticks = Array.from({ length: 5 }, (_, i) => ({ value: Math.round((max / 4) * i), y: y((max / 4) * i) }))
  const xTicks = records.value.filter((r, i) => i % 3 === 0 || r.key === latest.value.key).map((r) => ({ label: `${String(r.year).slice(2)}/${r.month}`, x: x(records.value.indexOf(r)) }))
  const focus = selected.value || latest.value
  const focusPoint = points.find((p) => p.record.key === focus.key)
  const tipX = Math.min(focusPoint.x + 14, W - R - 158)
  const tipY = Math.max(T, focusPoint.y - 78)
  return { W, H, L, R, T, B, bars, ticks, xTicks, tipX, tipY }
})

const yearCharts = computed(() => [...new Set(records.value.map((r) => r.year))].map((year) => {
  const source = records.value.filter((r) => r.year === year)
  const W = 390, H = 250, L = 34, R = 12, T = 20, B = 38
  const max = Math.ceil(Math.max(...source.map((r) => r.distance)) / 50) * 50
  const chartW = W - L - R, chartH = H - T - B, slot = chartW / source.length
  const hi = Math.max(...source.map((r) => r.distance)), lo = Math.min(...source.map((r) => r.distance))
  const bars = source.map((record, i) => { const h = record.distance / max * chartH; return { record, x: L + i * slot + slot * .16, y: H - B - h, w: Math.max(5, slot * .68), h, cx: L + (i + .5) * slot, isMax: record.distance === hi, isMin: record.distance === lo } })
  const ticks = [0, max / 2, max].map((value) => ({ value: Math.round(value), y: H - B - value / max * chartH }))
  const selectedBar = yearSelected.value && yearSelected.value.year === year
    ? bars.find((bar) => bar.record.key === yearSelected.value.key)
    : null
  const tooltip = selectedBar ? {
    record: selectedBar.record,
    x: Math.min(selectedBar.x + 8, W - R - 136),
    y: Math.max(T, selectedBar.y - 62)
  } : null
  return { year, W, H, L, R, B, bars, ticks, total: source.reduce((sum, r) => sum + r.distance, 0), tooltip }
}))

const comparison = computed(() => {
  const years = [...new Set(records.value.map((r) => r.year))]
  const rows = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const cells = years.map((year) => ({ year, record: records.value.find((r) => r.year === year && r.month === month) || null }))
    const values = cells.filter((cell) => cell.record).map((cell) => cell.record.distance)
    return { month, cells, min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null }
  })
  return { years, rows }
})
</script>

<style scoped>
.running-page { padding-top: 60px; }
.page-head h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 8px 0 12px; }
.page-head p { color: var(--muted); max-width: 760px; }
.mode-switch { display: inline-flex; gap: 4px; margin: 24px 0 4px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.mode-switch button { border: 0; border-radius: 8px; padding: 9px 16px; color: var(--muted); background: transparent; font: inherit; font-weight: 700; cursor: pointer; }
.mode-switch button.active { color: #fff; background: var(--primary); box-shadow: 0 3px 9px rgba(37, 99, 235, .24); }
.metric-grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(156px, 1fr)); margin: 22px 0 30px; }
.metric-item { display: flex; flex-direction: column; padding: 18px 20px; }
.metric-item-current { background: linear-gradient(135deg, var(--primary-soft), var(--surface)); border-color: color-mix(in srgb, var(--primary) 24%, var(--line)); }
.metric-item span, .metric-item small { color: var(--muted); font-size: .88rem; }.metric-item strong { margin-top: 4px; color: var(--text); font-size: 1.75rem; }.metric-item small { margin-top: 5px; }.trend-down { color: var(--accent) !important; }.trend-up { color: var(--danger) !important; }
.dashboard-panel { margin-top: 20px; }.wide-panel .panel-heading { align-items: flex-start; }.chart-shell { overflow-x: auto; }.chart-shell svg { display: block; min-width: 520px; width: 100%; }.chart-grid-lines line { stroke: var(--line); stroke-dasharray: 3 4; }.monthly-distance-bar { fill: var(--primary); opacity: .7; cursor: pointer; }.monthly-distance-bar:hover { opacity: 1; }.chart-tip { pointer-events: none; }.chart-tip rect { fill: rgba(15,23,42,.92); }.chart-tip text { fill: #fff; font-size: 11px; }.year-chart-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }.year-chart { border: 1px solid var(--line); border-radius: 12px; padding: 14px; }.year-chart h3 { margin: 0 0 10px; font-size: 1rem; }.year-chart h3 small { color: var(--muted); font-weight: 500; }.year-chart .chart-shell svg { min-width: 300px; }.distance-bar { fill: var(--primary); opacity: .7; cursor: pointer; }.distance-bar.is-max { fill: var(--danger); opacity: 1; }.distance-bar.is-min { fill: var(--accent); opacity: 1; }.table-shell { overflow-x: auto; }.comparison-table { width: 100%; min-width: 720px; border-collapse: collapse; font-variant-numeric: tabular-nums; }.comparison-table th, .comparison-table td { min-width: 150px; padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: center; }.comparison-table thead th { color: var(--muted); font-size: .84rem; }.comparison-table th:first-child { min-width: 72px; text-align: left; color: var(--text); }.comparison-table td { color: var(--muted); }.comparison-table td strong { display: block; color: var(--text); font-size: 1rem; }.comparison-table td strong small { font-size: .7rem; font-weight: 600; }.comparison-table td span { display: block; margin-top: 3px; font-size: .76rem; }.comparison-table td.comparison-max { color: var(--danger); background: rgba(185,28,28,.14); }.comparison-table td.comparison-max strong { color: var(--danger); }.comparison-table td.comparison-min { color: var(--accent); background: rgba(15,118,110,.14); }.comparison-table td.comparison-min strong { color: var(--accent); }.comparison-table td.is-latest { box-shadow: inset 0 0 0 2px var(--primary); }
@media (max-width: 760px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.metric-item { padding: 15px; }.metric-item strong { font-size: 1.45rem; }.year-chart-grid { grid-template-columns: 1fr; } }
</style>
