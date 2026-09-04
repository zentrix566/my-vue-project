<template>
  <section class="page world-map-page">
    <header class="atlas-header">
      <RouterLink class="back" to="/">← 返回主页</RouterLink>
      <p class="eyebrow">WORLD ATLAS · CONTEMPORARY BORDERS</p>
      <h1>当代世界地图</h1>
      <p>拖动与缩放地图，按大洲筛选，或直接检索国家。边界用于地理浏览，不表达任何政治立场。</p>
    </header>

    <div class="atlas-controls" aria-label="世界地图筛选">
      <label class="search-field">
        <span>检索国家</span>
        <input v-model.trim="query" type="search" placeholder="例如 中国、日本、巴西" />
      </label>
      <div class="region-tabs" role="tablist" aria-label="按大洲筛选">
        <button
          v-for="region in regionOrder"
          :key="region"
          type="button"
          role="tab"
          :aria-selected="activeRegion === region"
          :class="{ active: activeRegion === region }"
          @click="activeRegion = region"
        >
          {{ region }} <small>{{ regionCounts[region] }}</small>
        </button>
      </div>
    </div>

    <div class="atlas-layout">
      <div class="map-panel">
        <div class="map-toolbar" aria-label="地图视图控制">
          <span class="map-hint">滚轮缩放 · 拖动平移 · 点按国家</span>
          <div>
            <button type="button" aria-label="放大地图" @click="zoomBy(1.25)">＋</button>
            <button type="button" aria-label="缩小地图" @click="zoomBy(0.8)">－</button>
            <button type="button" class="reset-button" @click="resetView">复位</button>
          </div>
        </div>
        <div
          ref="viewportRef"
          class="map-viewport"
          :class="{ dragging: dragging }"
          @wheel.prevent="onWheel"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <svg viewBox="0 0 1000 500" role="img" aria-labelledby="map-title map-description">
            <title id="map-title">当代世界国界地图</title>
            <desc id="map-description">可缩放和拖动。国家可点击，支持按大洲与关键词筛选。</desc>
            <defs>
              <radialGradient id="ocean" cx="42%" cy="38%" r="80%">
                <stop offset="0" stop-color="#164e78" />
                <stop offset="1" stop-color="#071a31" />
              </radialGradient>
              <pattern id="grid" width="83.33" height="55.56" patternUnits="userSpaceOnUse">
                <path d="M 83.33 0 L 0 0 0 55.56" fill="none" stroke="rgba(191,219,254,.13)" stroke-width=".7" />
              </pattern>
            </defs>
            <rect width="1000" height="500" fill="url(#ocean)" />
            <rect width="1000" height="500" fill="url(#grid)" />
            <g :transform="`translate(${view.x} ${view.y}) scale(${view.scale})`">
              <path
                v-for="country in countries"
                :key="country.id"
                :d="country.path"
                class="country"
                :class="{
                  selected: selectedCountry?.id === country.id,
                  muted: isMuted(country),
                  matched: isMatched(country)
                }"
                :fill="regionColors[country.region]"
                tabindex="0"
                role="button"
                :aria-label="`${country.label}，${country.region}`"
                @click="selectCountry(country)"
                @keydown.enter.prevent="selectCountry(country)"
                @keydown.space.prevent="selectCountry(country)"
                @mouseenter="hoveredCountry = country"
                @mouseleave="hoveredCountry = null"
              />
            </g>
          </svg>
          <div v-if="hoveredCountry && !dragging" class="map-tooltip" :style="tooltipStyle">
            <strong>{{ hoveredCountry.label }}</strong><span>{{ hoveredCountry.region }}</span>
          </div>
        </div>
        <p class="map-status" aria-live="polite">{{ statusText }}</p>
      </div>

      <aside class="country-panel" aria-live="polite">
        <template v-if="selectedCountry">
          <p class="panel-kicker"><i :style="{ background: regionColors[selectedCountry.region] }"></i>{{ selectedCountry.region }}</p>
          <h2>{{ selectedCountry.label }}</h2>
          <p>已在地图中高亮。可继续拖动地图，或使用筛选与搜索跳转到其他国家。</p>
          <dl>
            <div><dt>地图编号</dt><dd>{{ selectedCountry.id.padStart(3, '0') }}</dd></div>
            <div><dt>边界数据</dt><dd>Natural Earth · 1:110m</dd></div>
          </dl>
          <button type="button" class="clear-selection" @click="selectedCountry = null">取消选择</button>
        </template>
        <template v-else>
          <p class="panel-kicker"><i></i>探索提示</p>
          <h2>从一片国界开始</h2>
          <p>地图收录 {{ countries.length }} 个国家/地区轮廓。点击任意区域以查看名称、所属大洲和地图编号。</p>
          <ul class="legend" aria-label="大洲图例">
            <li v-for="region in regionOrder.slice(1)" :key="region"><i :style="{ background: regionColors[region] }"></i>{{ region }}<span>{{ regionCounts[region] }}</span></li>
          </ul>
        </template>
      </aside>
    </div>

    <p class="atlas-source">国界底图：Natural Earth，比例尺 1:110m，公共领域数据；仅作当代地理浏览与学习使用。</p>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import worldTopology from '../data/countries-110m.json'
import { chineseNameOf } from '../data/countryNames.js'
import { regionColors, regionOf, regionOrder } from '../data/regions.js'
import { topologyToCountries } from '../utils/topology.js'

const decodedCountries = topologyToCountries(worldTopology)
const taiwanShape = decodedCountries.find((country) => country.name === 'Taiwan')
const countries = decodedCountries
  .filter((country) => country.name !== 'Taiwan')
  .map((country) => ({
    ...country,
    path: country.name === 'China' && taiwanShape ? `${country.path}${taiwanShape.path}` : country.path,
    label: chineseNameOf(country.name),
    region: regionOf(country.name)
  }))
const query = ref('')
const activeRegion = ref('全部')
const selectedCountry = ref(null)
const hoveredCountry = ref(null)
const viewportRef = ref(null)
const dragging = ref(false)
const view = ref({ x: 0, y: 0, scale: 1 })
const pointerStart = ref(null)
const tooltipPosition = ref({ x: 16, y: 16 })
let ignoreNextCountryClick = false

const normalizedQuery = computed(() => query.value.toLocaleLowerCase())
const regionCounts = computed(() => Object.fromEntries(regionOrder.map((region) => [
  region,
  region === '全部' ? countries.length : countries.filter((country) => country.region === region).length
])))
const statusText = computed(() => {
  const filtered = countries.filter((country) => !isMuted(country)).length
  return selectedCountry.value
    ? `已选择 ${selectedCountry.value.label} · ${selectedCountry.value.region}`
    : `当前显示 ${filtered} 个国家/地区轮廓`
})
const tooltipStyle = computed(() => ({ left: `${tooltipPosition.value.x}px`, top: `${tooltipPosition.value.y}px` }))

function isMatched(country) {
  return Boolean(normalizedQuery.value) && (
    country.label.includes(query.value) || country.name.toLocaleLowerCase().includes(normalizedQuery.value)
  )
}

function isMuted(country) {
  const outsideRegion = activeRegion.value !== '全部' && country.region !== activeRegion.value
  const outsideQuery = Boolean(normalizedQuery.value) && !isMatched(country)
  return outsideRegion || outsideQuery
}

function selectCountry(country) {
  if (ignoreNextCountryClick) return
  selectedCountry.value = country
}

function zoomBy(multiplier) {
  view.value = { ...view.value, scale: Math.min(5, Math.max(1, view.value.scale * multiplier)) }
}

function resetView() {
  view.value = { x: 0, y: 0, scale: 1 }
}

function onWheel(event) {
  zoomBy(event.deltaY < 0 ? 1.12 : 0.89)
}

function onPointerDown(event) {
  pointerStart.value = { x: event.clientX, y: event.clientY, viewX: view.value.x, viewY: view.value.y }
  dragging.value = false
  ignoreNextCountryClick = false
}

function onPointerMove(event) {
  const viewport = viewportRef.value
  if (viewport) {
    const rect = viewport.getBoundingClientRect()
    tooltipPosition.value = { x: event.clientX - rect.left + 14, y: event.clientY - rect.top + 14 }
  }
  if (!pointerStart.value) return
  const dx = event.clientX - pointerStart.value.x
  const dy = event.clientY - pointerStart.value.y
  dragging.value = Math.abs(dx) + Math.abs(dy) > 5
  if (dragging.value) {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    view.value = { ...view.value, x: pointerStart.value.viewX + dx, y: pointerStart.value.viewY + dy }
  }
}

function onPointerUp(event) {
  if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  ignoreNextCountryClick = dragging.value
  pointerStart.value = null
  window.setTimeout(() => {
    dragging.value = false
    ignoreNextCountryClick = false
  }, 0)
}
</script>

<style scoped>
.atlas-header { max-width: 760px; }
.atlas-header h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 4px 0 8px; }
.atlas-header > p:last-child { color: var(--muted); margin: 0; }
.atlas-controls { display: grid; gap: 14px; margin: 26px 0 16px; }
.search-field { display: grid; gap: 6px; max-width: 390px; }
.search-field span { font-size: .82rem; font-weight: 800; color: var(--muted); }
.region-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.region-tabs button, .map-toolbar button, .clear-selection { background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius-pill); color: var(--text); cursor: pointer; font-weight: 750; min-height: 40px; padding: 7px 13px; }
.region-tabs button small { color: var(--muted); margin-left: 3px; }
.region-tabs button.active { background: var(--primary); border-color: var(--primary); color: white; }
.region-tabs button.active small { color: rgba(255,255,255,.78); }
.atlas-layout { display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 278px; }
.map-panel, .country-panel { background: #0a2340; border: 1px solid #244766; border-radius: 16px; box-shadow: 0 14px 32px rgba(15, 23, 42, .15); color: #e7f2ff; overflow: hidden; }
.map-toolbar { align-items: center; border-bottom: 1px solid rgba(191,219,254,.16); display: flex; gap: 12px; justify-content: space-between; padding: 10px 12px; }
.map-toolbar > div { display: flex; gap: 7px; }
.map-toolbar button { background: rgba(255,255,255,.08); border-color: rgba(191,219,254,.2); color: #f8fbff; min-height: 34px; min-width: 34px; padding: 4px 9px; }
.map-toolbar .reset-button { min-width: auto; }
.map-hint { color: #b9d4ec; font-size: .78rem; font-weight: 650; }
.map-viewport { cursor: grab; overflow: hidden; position: relative; touch-action: none; }
.map-viewport.dragging { cursor: grabbing; }
.map-viewport svg { display: block; height: auto; min-height: 310px; width: 100%; }
.country { cursor: pointer; stroke: rgba(225,242,255,.62); stroke-linejoin: round; stroke-width: .55; transition: fill-opacity .16s ease, stroke .16s ease, stroke-width .16s ease; }
.country:hover, .country:focus-visible, .country.selected { fill: #f8fafc !important; outline: none; stroke: #fbbf24; stroke-width: 1.65; }
.country.muted { fill-opacity: .15; stroke-opacity: .2; }
.country.matched { stroke: #fff7d6; stroke-width: 1.5; }
.map-tooltip { background: rgba(3, 15, 30, .92); border: 1px solid rgba(191,219,254,.35); border-radius: 8px; display: grid; font-size: .78rem; gap: 1px; max-width: 165px; padding: 6px 8px; pointer-events: none; position: absolute; z-index: 2; }
.map-tooltip span { color: #b9d4ec; }
.map-status { border-top: 1px solid rgba(191,219,254,.16); color: #b9d4ec; font-size: .8rem; margin: 0; padding: 9px 13px; }
.country-panel { background: #102f4f; padding: 22px; }
.panel-kicker { align-items: center; color: #b9d4ec; display: flex; font-size: .76rem; font-weight: 800; gap: 7px; letter-spacing: .06em; margin: 0; text-transform: uppercase; }
.panel-kicker i, .legend i { background: #b9d4ec; border-radius: 50%; display: inline-block; height: 9px; width: 9px; }
.country-panel h2 { font-size: 1.42rem; margin: 8px 0; }
.country-panel > p:not(.panel-kicker) { color: #c5d9eb; font-size: .9rem; margin: 0; }
dl { border-top: 1px solid rgba(191,219,254,.18); display: grid; gap: 9px; margin: 20px 0; padding-top: 14px; }
dl div { display: flex; justify-content: space-between; gap: 8px; } dt { color: #9dbbd5; font-size: .8rem; } dd { font-size: .82rem; font-weight: 750; margin: 0; text-align: right; }
.clear-selection { background: rgba(255,255,255,.08); border-color: rgba(191,219,254,.26); color: #fff; width: 100%; }
.legend { display: grid; gap: 9px; list-style: none; margin: 20px 0 0; padding: 0; }
.legend li { align-items: center; border-bottom: 1px solid rgba(191,219,254,.13); display: flex; font-size: .84rem; gap: 8px; padding-bottom: 8px; }.legend span { color: #b9d4ec; margin-left: auto; }
.atlas-source { color: var(--muted); font-size: .78rem; margin: 12px 2px 0; }
button:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid rgba(47,111,237,.4); outline-offset: 2px; }
@media (max-width: 800px) { .atlas-layout { grid-template-columns: 1fr; }.country-panel { min-height: 0; }.map-toolbar { align-items: flex-start; flex-direction: column; }.map-viewport svg { min-height: 240px; }.map-hint { display: none; } }
@media (prefers-reduced-motion: reduce) { .country { transition: none; } }
</style>
