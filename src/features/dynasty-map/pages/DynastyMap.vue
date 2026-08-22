<template>
  <section class="page dynasty-map-page">
    <header class="dm-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <p class="eyebrow">Dynasty Map · 3D</p>
      <h1>历代疆域 · 3D 地图</h1>
      <p class="dm-sub">以今日省界为底座，历代疆域以立体色块拔地而起；可拖拽旋转、滚轮缩放，点击城邑与疆域查看详情。</p>
    </header>

    <div class="dm-stage" :class="{ 'is-switching': switching }" :style="{ '--accent': dynasty.color }">
      <div ref="chartRef" class="dm-chart"></div>
      <div class="dm-vignette" aria-hidden="true"></div>

      <!-- 左上：朝代信息 -->
      <div class="dm-info glass" v-if="ready">
        <div class="dm-info-head">
          <span class="dm-info-dot"></span>
          <span class="dm-info-name">{{ dynasty.name }}</span>
        </div>
        <p class="dm-info-year">{{ dynasty.year }}</p>
        <p class="dm-info-intro">{{ dynasty.intro }}</p>
        <p class="dm-info-capital">都城：{{ dynasty.capital }}</p>
        <div class="dm-legend" v-if="dynasty.legend">
          <button v-for="(label, key) in dynasty.legend" :key="key" type="button"
            class="dm-chip" :class="{ active: selectedFaction === key }"
            :style="{ '--c': factionColor[key] }" @click="toggleFaction(key)">
            <i class="dot"></i>{{ label }}
          </button>
        </div>
        <div class="dm-legend" v-else>
          <span class="dm-legend-item"><i class="dot" :style="{ background: typeMeta.capital.color }"></i>都城</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: typeMeta.city.color }"></i>州郡重镇</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: typeMeta.town.color }"></i>城邑</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: typeMeta.pass.color }"></i>边关要塞</span>
        </div>
      </div>

      <!-- 右上：工具 -->
      <div class="dm-toolbar glass" v-if="ready">
        <button type="button" class="dm-tool" :class="{ on: touring }" :title="touring ? '停止巡游' : '自动巡游历代'"
          @click="toggleTour">{{ touring ? '⏸' : '▶' }}<span>巡游</span></button>
        <button type="button" class="dm-tool" :class="{ on: autoRotate }" title="自动旋转视角"
          @click="toggleRotate">⟳<span>旋转</span></button>
        <button type="button" class="dm-tool" :class="{ on: showLabels }" title="显示全部城邑名称"
          @click="toggleLabels">🏷<span>城名</span></button>
        <button type="button" class="dm-tool" title="复位视角" @click="resetView">⌂<span>复位</span></button>
      </div>

      <!-- 右侧：城邑列表 -->
      <aside class="dm-side glass" :class="{ collapsed: sideCollapsed }" v-if="ready">
        <button type="button" class="dm-side-toggle" :title="sideCollapsed ? '展开城邑列表' : '收起城邑列表'"
          @click="sideCollapsed = !sideCollapsed">{{ sideCollapsed ? '‹' : '›' }}</button>
        <div class="dm-card" v-if="selectedCity">
          <div class="dm-card-type" :style="{ color: cityColor(selectedCity) }">{{ cityTypeLabel(selectedCity) }}</div>
          <h3>{{ selectedCity.name }}</h3>
          <p class="dm-card-modern">今址：{{ selectedCity.modern }}</p>
          <p class="dm-card-note">{{ selectedCity.note }}</p>
        </div>
        <div class="dm-card dm-hint" v-else-if="selectedProvince">
          <h3>{{ selectedProvince }}</h3>
          <p class="dm-card-note">今{{ selectedProvince }}境内可考城邑共 <strong>{{ provinceCities.length }}</strong> 处。</p>
          <ul v-if="provinceCities.length" class="dm-card-list">
            <li v-for="c in provinceCities" :key="c.name">
              <a href="#" @click.prevent="selectCity(c)">
                <i class="dot" :style="{ background: cityColor(c) }"></i>{{ c.name }}
                <span class="modern">{{ c.modern }}</span>
              </a>
            </li>
          </ul>
        </div>
        <div class="dm-card dm-hint" v-else>
          <h3>探索指南</h3>
          <p class="dm-card-note">点击疆域色块可查看对应政权；点击城邑标记显示古名今址；底部时间条切换朝代，或用 ← → 键翻页。</p>
        </div>
        <div class="dm-list" v-show="!sideCollapsed">
          <h4>本图城邑（{{ visibleCities.length }}）</h4>
          <div v-for="g in cityGroups" :key="g.key" class="dm-group">
            <div class="dm-group-head" v-if="g.key !== '__all__'">
              <i class="dot" :style="{ background: factionColor[g.key] || '#94a3b8' }"></i>{{ g.label }}
            </div>
            <ul>
              <li v-for="c in g.cities" :key="c.name" :class="{ active: selectedCity && selectedCity.name === c.name }">
                <a href="#" @click.prevent="selectCity(c)">
                  <i class="dot" :style="{ background: cityColor(c) }"></i>
                  <span class="name">{{ c.name }}</span>
                  <span class="modern">{{ c.modern }}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- 底部：时间条 -->
      <nav class="dm-timeline glass" v-if="ready" aria-label="朝代时间条">
        <button type="button" class="dm-nav" :disabled="eraIndex === 0" @click="stepEra(-1)">‹</button>
        <div class="dm-strip" ref="stripRef">
          <button v-for="(d, i) in dynasties" :key="d.key" type="button"
            class="dm-era" :class="{ active: i === eraIndex }" :style="{ '--c': d.color }"
            :ref="el => { if (i === eraIndex) activeEraEl = el }"
            @click="setEra(i)">
            <span class="dm-era-name">{{ d.name }}</span>
            <span class="dm-era-year">{{ shortYear(d.startYear) }}</span>
          </button>
        </div>
        <button type="button" class="dm-nav" :disabled="eraIndex === dynasties.length - 1" @click="stepEra(1)">›</button>
      </nav>

      <div v-if="loading" class="dm-overlay">
        <span class="dm-spinner"></span>
        <p>正在载入中国地图底座…</p>
      </div>
      <div v-else-if="error" class="dm-overlay dm-error">
        <strong>地图加载失败</strong>
        <p>{{ error }}</p>
        <button type="button" class="button" @click="loadMap">重试</button>
      </div>
    </div>

    <p class="form-hint dm-foot">
      底座为现代中国省级行政区划（阿里云 DataV）；历代疆域为参照谭其骧《中国历史地图集》手绘的简化示意轮廓，城邑坐标取今址经纬度，仅作地理大势参考，非精确历史边界。
    </p>
  </section>
</template>

<script setup>
import { ref, shallowRef, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import { dynasties } from '../data/dynasties.js'
import { territories, walls } from '../data/territories.js'
import '../dynasty-map.css'

const GEO_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

// 3D 高度体系：疆域块薄拔起（地图观感而非仰视沙盘），标记略浮于其上
const BASE_HEIGHT = 2
const TERRITORY_BASE = 6
const MARKER_Z = 11
const BEAM_TOP = 18
const LABEL_Z = 13
const WALL_Z = 3

const typeMeta = {
  capital: { label: '都城', color: '#ffd54f', size: 17 },
  city: { label: '州郡重镇', color: '#42a5f5', size: 10 },
  pass: { label: '边关要塞', color: '#ef5350', size: 10 },
  town: { label: '城邑', color: '#b0bec5', size: 6.5 }
}

const chartRef = ref(null)
const stripRef = ref(null)
const activeEraEl = ref(null)
const chart = shallowRef(null)
let geoJson = null
let provinceCount = 0
let territoryFactions = []
let resizeObserver = null
let abortController = null
let tourTimer = null
let canvasClickHandler = null
let regionNameByIndex = []

const loading = ref(true)
const error = ref('')
const ready = computed(() => !loading.value && !error.value && !!chart.value)

const eraIndex = ref(0)
const dynasty = computed(() => dynasties[eraIndex.value])
const switching = ref(false)

const autoRotate = ref(false)
const showLabels = ref(false)
const touring = ref(false)
const sideCollapsed = ref(false)
const selectedProvince = ref('')
const selectedCity = ref(null)
const selectedFaction = ref('')

const factions = computed(() => territories[dynasty.value.key] || [])
const factionColor = computed(() => Object.fromEntries(factions.value.map((f) => [f.key, f.color])))

const shortYear = (y) => (y < 0 ? '前' + -y : String(y))

const cityColor = (c) => (c.faction && factionColor.value[c.faction]) || typeMeta[c.type].color
const cityTypeLabel = (c) => {
  const t = typeMeta[c.type].label
  if (!c.faction) return t
  const f = factions.value.find((x) => x.key === c.faction)
  return f ? f.name + ' · ' + t : t
}

const visibleCities = computed(() =>
  selectedFaction.value ? dynasty.value.cities.filter((c) => c.faction === selectedFaction.value) : dynasty.value.cities
)

const cityGroups = computed(() => {
  const legend = dynasty.value.legend
  if (!legend) return [{ key: '__all__', label: '', cities: visibleCities.value }]
  const groups = factions.value
    .filter((f) => legend[f.key])
    .map((f) => ({ key: f.key, label: legend[f.key], cities: visibleCities.value.filter((c) => c.faction === f.key) }))
    .filter((g) => g.cities.length)
  const rest = visibleCities.value.filter((c) => !c.faction)
  if (rest.length) groups.push({ key: '__none', label: '交界地带', cities: rest })
  return groups
})

const provinceCities = computed(() => {
  if (!selectedProvince.value || !geoJson) return []
  const feature = geoJson.features.find((f) => f.properties && f.properties.name === selectedProvince.value)
  if (!feature) return []
  const { type, coordinates } = feature.geometry
  const inShape = (lng, lat) => type === 'MultiPolygon'
    ? coordinates.some((poly) => pointInPolygon(lng, lat, poly))
    : pointInPolygon(lng, lat, coordinates)
  return dynasty.value.cities.filter((c) => inShape(c.lng, c.lat))
})

function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointInPolygon(x, y, polygon) {
  if (!polygon || !polygon.length || !pointInRing(x, y, polygon[0])) return false
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(x, y, polygon[i])) return false
  }
  return true
}

// 合并底座省份与疆域多边形为一张地图：省份命名照旧，疆域以「疆域·key」命名
function buildEraGeoJson(era) {
  const base = geoJson.features.map((f) => ({
    type: 'Feature',
    properties: { name: f.properties && f.properties.name },
    geometry: f.geometry
  }))
  provinceCount = base.length
  territoryFactions = territories[era.key] || []
  for (const fac of territoryFactions) {
    base.push({
      type: 'Feature',
      properties: { name: '疆域·' + fac.key, faction: fac.key },
      geometry: { type: 'MultiPolygon', coordinates: fac.rings.map((r) => [r]) }
    })
  }
  regionNameByIndex = base.map((f) => f.properties.name)
  return { type: 'FeatureCollection', features: base }
}

function buildRegions() {
  const provinces = geoJson.features
    .map((f) => f.properties && f.properties.name)
    .filter(Boolean)
    .map((name) => {
      if (name === selectedProvince.value) {
        return { name, regionHeight: BASE_HEIGHT, itemStyle: { color: '#2d4a6e', borderColor: '#7eb0ff', borderWidth: 1.2 } }
      }
      // 底座统一深色、无边框，避免省界网格透出形成碎纹
      return { name, regionHeight: BASE_HEIGHT, itemStyle: { color: '#15233a', borderWidth: 0 } }
    })
  territoryFactions.forEach((fac, i) => {
    provinces.push({
      name: '疆域·' + fac.key,
      regionHeight: TERRITORY_BASE,
      itemStyle: {
        color: fac.color,
        opacity: selectedFaction.value && selectedFaction.value !== fac.key ? 0.32 : 1,
        // 不描边：echarts-gl 会把多边形三角剖分的内边也描出来，形成条状碎纹
        borderWidth: 0
      }
    })
  })
  return provinces
}

function buildSeriesData() {
  return dynasty.value.cities.map((c) => ({
    name: c.name,
    value: [c.lng, c.lat, MARKER_Z],
    city: c,
    symbolSize: typeMeta[c.type].size,
    itemStyle: { color: cityColor(c) }
  }))
}

function baseViewControl() {
  return {
    alpha: 60,
    beta: 5,
    distance: 100,
    center: [0, 0, 0],
    minAlpha: 30,
    maxAlpha: 85,
    minDistance: 45,
    maxDistance: 280,
    autoRotate: autoRotate.value,
    autoRotateSpeed: 0.8,
    autoRotateAfterStill: false,
    panMouseButton: 'left',
    rotateMouseButton: 'right',
    animation: true,
    animationDurationUpdate: 750
  }
}

function buildOption({ resetCamera = false } = {}) {
  const capitals = dynasty.value.cities.filter((c) => c.type === 'capital' && (!selectedFaction.value || c.faction === selectedFaction.value))
  const series = [
    {
      type: 'scatter3D',
      coordinateSystem: 'geo3D',
      data: buildSeriesData(),
      symbol: 'circle',
      symbolSize: (v, p) => p.data.symbolSize,
      itemStyle: { opacity: 0.95, borderColor: '#ffffff', borderWidth: 0.5 },
      label: {
        show: showLabels.value,
        formatter: (p) => p.data.city.name,
        position: 'top',
        textStyle: { color: '#f1f5f9', fontSize: 11, backgroundColor: 'rgba(10,18,35,0.72)', padding: [2, 5], borderRadius: 3 }
      },
      emphasis: { label: { show: true }, itemStyle: { borderColor: '#fff', borderWidth: 1.2 } }
    }
  ]
  // 都城光柱：从地面直冲疆域上方的金色光束
  if (capitals.length) {
    series.push({
      type: 'lines3D',
      coordinateSystem: 'geo3D',
      silent: true,
      lineStyle: { width: 2.4, color: '#ffd54f', opacity: 0.85 },
      data: capitals.map((c) => ({ coords: [[c.lng, c.lat, BASE_HEIGHT], [c.lng, c.lat, BEAM_TOP]] }))
    })
  }
  // 都城常显名
  series.push({
    type: 'scatter3D',
    coordinateSystem: 'geo3D',
    silent: true,
    symbolSize: 0.1,
    data: capitals.map((c) => ({ name: c.name, value: [c.lng, c.lat, BEAM_TOP + 3] })),
    label: {
      show: true,
      formatter: (p) => p.name,
      position: 'top',
      textStyle: { color: '#ffe08a', fontSize: 13, fontWeight: 700, textBorderWidth: 0 }
    },
    itemStyle: { opacity: 0 }
  })
  // 政权名大字
  const labeled = territoryFactions.filter((f) => f.label !== false && (!selectedFaction.value || f.key === selectedFaction.value))
  if (labeled.length) {
    series.push({
      type: 'scatter3D',
      coordinateSystem: 'geo3D',
      silent: true,
      symbolSize: 0.1,
      data: labeled.map((f) => ({ name: f.name, value: [f.labelAt[0], f.labelAt[1], TERRITORY_BASE + 16] })),
      label: {
        show: true,
        formatter: (p) => p.name,
        position: 'inside',
        textStyle: { color: 'rgba(255,255,255,0.85)', fontSize: 20, fontWeight: 700, textShadowBlur: 6, textShadowColor: 'rgba(0,0,0,0.5)' }
      },
      itemStyle: { opacity: 0 }
    })
  }
  // 长城金色光带
  const wall = walls[dynasty.value.key]
  if (wall) {
    series.push({
      type: 'lines3D',
      coordinateSystem: 'geo3D',
      silent: true,
      lineStyle: { width: 2.2, color: '#ffd27d', opacity: 0.95 },
      data: [{ coords: wall.map((p) => [p[0], p[1], WALL_Z]) }]
    })
  }

  const option = {
    backgroundColor: '#070d1a',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(10,17,32,0.92)',
      borderColor: 'rgba(120,160,210,0.35)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (p) => {
        if (p.seriesType === 'scatter3D' && p.data && p.data.city) {
          const c = p.data.city
          return `<strong>${c.name}</strong>（${cityTypeLabel(c)}）<br/>今址：${c.modern}<br/><span style="opacity:.8">${c.note}</span>`
        }
        return p.name ? `<strong>${p.name}</strong>` : ''
      }
    },
    geo3D: {
      map: 'dynasty-era',
      roam: true,
      silent: false,
      shading: 'lambert',
      environment: '#060b18',
      regionHeight: BASE_HEIGHT,
      regions: buildRegions(),
      itemStyle: { color: '#15233a', borderWidth: 0, opacity: 0.98 },
      label: { show: false },
      emphasis: { label: { show: true, textStyle: { color: '#fff', fontSize: 13 } }, itemStyle: { color: '#2d4a6e' } },
      light: {
        main: { intensity: 1.35, shadow: true, shadowQuality: 'high', alpha: 42, beta: -30 },
        ambient: { intensity: 0.62 }
      },
      // 关闭时域超采样（temporalSuperSampling）：它依赖前一帧重投影，在视角旋转/动画时
      // 会与 SSAO 共同引发频闪；SSAO 降到 low 以消除采样噪点，保留 bloom 做都城高光
      postEffect: {
        enable: true,
        bloom: { enable: true, bloomIntensity: 0.14 },
        SSAO: { enable: true, quality: 'low', radius: 1.5, intensity: 0.9 },
        FXAA: { enable: true }
      }
    },
    series
  }
  if (resetCamera) {
    option.geo3D.viewControl = baseViewControl()
  } else {
    option.geo3D.viewControl = { autoRotate: autoRotate.value, animation: true, animationDurationUpdate: 750 }
  }
  return option
}

function renderChart(resetCamera) {
  if (!chart.value) return
  chart.value.setOption(buildOption({ resetCamera }), resetCamera ? { notMerge: true } : { notMerge: false })
}

function applyEra() {
  if (!chart.value || !geoJson) return
  echarts.registerMap('dynasty-era', buildEraGeoJson(dynasty.value))
  renderChart(true)
  switching.value = true
  setTimeout(() => { switching.value = false }, 550)
  nextTick(() => {
    if (activeEraEl.value && stripRef.value && typeof activeEraEl.value.scrollIntoView === 'function') {
      activeEraEl.value.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  })
}

function setEra(i) {
  if (i === eraIndex.value || i < 0 || i >= dynasties.length) return
  eraIndex.value = i
}

function stepEra(delta) {
  setEra(eraIndex.value + delta)
}

watch(eraIndex, () => {
  selectedCity.value = null
  selectedProvince.value = ''
  selectedFaction.value = ''
  applyEra()
})

function selectCity(c) {
  selectedCity.value = c
  selectedProvince.value = ''
  if (!chart.value) return
  const idx = dynasty.value.cities.findIndex((x) => x.name === c.name)
  chart.value.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx })
  chart.value.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
  // 清除省份高亮（仅颜色变化，merge 更新不闪屏）
  renderChart(false)
}

function toggleFaction(key) {
  selectedFaction.value = selectedFaction.value === key ? '' : key
  selectedCity.value = null
  // 只改色块透明度/描边，merge 更新即可，避免 notMerge 全量重建导致闪屏
  renderChart(false)
}

function toggleRotate() {
  autoRotate.value = !autoRotate.value
  if (!chart.value) return
  chart.value.setOption({ geo3D: { viewControl: { autoRotate: autoRotate.value } } })
}

function toggleLabels() {
  showLabels.value = !showLabels.value
  if (!chart.value) return
  chart.value.setOption({ series: [{ label: { show: showLabels.value } }] })
}

function resetView() {
  if (!chart.value) return
  chart.value.setOption({ geo3D: { viewControl: baseViewControl() } })
}

function toggleTour() {
  touring.value = !touring.value
  if (touring.value) {
    if (!autoRotate.value) toggleRotate()
    tourTimer = setInterval(() => {
      const next = (eraIndex.value + 1) % dynasties.length
      setEra(next)
    }, 6500)
  } else {
    clearInterval(tourTimer)
    tourTimer = null
  }
}

// echarts-gl 的组件型 geo3D 不派发区域点击事件（LayerGL._dispatchDataEvent 要求
// seriesIndex >= 0），因此沿用原生点击 + LayerGL.pickObject 手动拾取：
//   命中省份网格（dataIndex < 省份数）→ 选中省份并凸起
//   命中疆域色块 → 按政权筛选侧栏城邑并高亮该色块
//   命中城邑标记（scatter3D，seriesIndex 0）→ 选中城邑
function handleMapClick(offsetX, offsetY) {
  if (!chart.value || !geoJson) return
  let picked = null
  const painter = chart.value.getZr().painter
  if (painter && typeof painter.eachOtherLayer === 'function') {
    painter.eachOtherLayer((layer) => {
      if (!picked && layer && typeof layer.pickObject === 'function') {
        try {
          picked = layer.pickObject(offsetX, offsetY)
        } catch (err) {
          // 拾取失败忽略
        }
      }
    })
  }
  const mesh = picked && picked.target
  if (!mesh || mesh.dataIndex < 0) return
  if (mesh.seriesIndex == null) {
    const name = regionNameByIndex[mesh.dataIndex]
    if (mesh.dataIndex >= provinceCount) {
      const fac = territoryFactions[mesh.dataIndex - provinceCount]
      if (fac) toggleFaction(fac.key)
    } else if (name && geoJson.features.some((f) => f.properties && f.properties.name === name)) {
      selectedProvince.value = selectedProvince.value === name ? '' : name
      selectedCity.value = null
      // 只改省份颜色（不改高度），merge 更新即可，避免 notMerge 重建导致闪屏
      renderChart(false)
    }
  } else if (mesh.seriesIndex === 0) {
    const c = dynasty.value.cities[mesh.dataIndex]
    if (c) selectCity(c)
  }
}

async function loadMap() {
  loading.value = true
  error.value = ''
  if (abortController) abortController.abort()
  abortController = new AbortController()
  try {
    const res = await fetch(GEO_URL, { signal: abortController.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    geoJson = await res.json()
    if (!chart.value) {
      chart.value = echarts.init(chartRef.value, null, { renderer: 'canvas' })
      canvasClickHandler = (e) => {
        if (!(e.target instanceof HTMLCanvasElement)) return
        handleMapClick(e.offsetX, e.offsetY)
      }
      chartRef.value.addEventListener('click', canvasClickHandler)
    }
    applyEra()
  } catch (err) {
    if (err.name === 'AbortError') return
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

function onWindowResize() {
  chart.value && chart.value.resize()
}

function onKeydown(e) {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
  if (e.key === 'ArrowLeft') stepEra(-1)
  else if (e.key === 'ArrowRight') stepEra(1)
}

onMounted(() => {
  loadMap()
  resizeObserver = new ResizeObserver(() => chart.value && chart.value.resize())
  if (chartRef.value) resizeObserver.observe(chartRef.value)
  window.addEventListener('resize', onWindowResize)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (abortController) abortController.abort()
  if (tourTimer) clearInterval(tourTimer)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('keydown', onKeydown)
  if (resizeObserver) resizeObserver.disconnect()
  if (chart.value) {
    if (canvasClickHandler && chartRef.value) {
      chartRef.value.removeEventListener('click', canvasClickHandler)
    }
    chart.value.dispose()
    chart.value = null
  }
})
</script>
