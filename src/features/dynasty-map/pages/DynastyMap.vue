<template>
  <section class="section page-section dynasty-map-page">
    <div class="container dynasty-map-container">
      <header class="dynasty-map-header">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <p class="eyebrow">Dynasty Map</p>
        <h1>历代地图 · 疆域城邑</h1>
        <p>以今日中国省界为底，标注历代都城、州郡与边关的今址；点击省份使其立体凸起，点击城邑查看说明。</p>
      </header>

      <div class="dynasty-map-toolbar">
        <label class="dynasty-map-field">
          <span>朝代</span>
          <select v-model="dynastyKey" :disabled="loading || !!error" @change="onDynastyChange">
            <option v-for="d in dynasties" :key="d.key" :value="d.key">
              {{ d.name }}（{{ d.year }}）
            </option>
          </select>
        </label>

        <div class="dynasty-map-actions">
          <button type="button" class="button" :disabled="!ready" @click="resetView">复位视角</button>
          <label class="dynasty-map-toggle">
            <input type="checkbox" v-model="autoRotate" @change="onToggleRotate">
            <span>自动旋转</span>
          </label>
          <label class="dynasty-map-toggle">
            <input type="checkbox" v-model="showLabels" @change="onToggleLabels">
            <span>显示全部城名</span>
          </label>
        </div>
      </div>

      <div class="dynasty-map-body">
        <div class="dynasty-map-stage" :style="{ '--accent': dynasty.color }">
          <div ref="chartRef" class="dynasty-map-chart"></div>

          <div v-if="loading" class="dynasty-map-overlay">
            <span class="dynasty-map-spinner"></span>
            <p>正在载入中国地图底图…</p>
          </div>
          <div v-else-if="error" class="dynasty-map-overlay dynasty-map-error">
            <strong>地图加载失败</strong>
            <p>{{ error }}</p>
            <button type="button" class="button" @click="loadMap">重试</button>
          </div>

          <div v-if="!loading && !error" class="dynasty-map-legend">
            <template v-if="dynasty.legend">
              <span v-for="(label, key) in dynasty.legend" :key="key" class="legend-item">
                <i class="dot" :style="{ background: factionColor[key] }"></i>{{ label }}
              </span>
            </template>
            <template v-else>
              <span class="legend-item"><i class="dot" :style="{ background: typeMeta.capital.color }"></i>都城</span>
              <span class="legend-item"><i class="dot" :style="{ background: typeMeta.city.color }"></i>州郡重镇</span>
              <span class="legend-item"><i class="dot" :style="{ background: typeMeta.town.color }"></i>城邑</span>
              <span class="legend-item"><i class="dot" :style="{ background: typeMeta.pass.color }"></i>边关要塞</span>
            </template>
          </div>
        </div>

        <aside class="dynasty-map-side">
          <div class="dynasty-map-card" v-if="selectedCity">
            <div class="card-type" :style="{ color: cityColor(selectedCity) }">
              {{ cityTypeLabel(selectedCity) }}
            </div>
            <h3>{{ selectedCity.name }}</h3>
            <p class="card-modern">今址：{{ selectedCity.modern }}</p>
            <p class="card-note">{{ selectedCity.note }}</p>
          </div>
          <div class="dynasty-map-card" v-else-if="selectedProvince">
            <h3>{{ selectedProvince }}</h3>
            <p class="card-note">
              本朝在今{{ selectedProvince }}境内可考的城邑共 <strong>{{ provinceCities.length }}</strong> 处。
            </p>
            <ul v-if="provinceCities.length" class="card-city-list">
              <li v-for="c in provinceCities" :key="c.name">
                <a href="#" @click.prevent="selectCity(c)">
                  <i class="dot" :style="{ background: cityColor(c) }"></i>{{ c.name }}
                  <span class="modern">{{ c.modern }}</span>
                </a>
              </li>
            </ul>
          </div>
          <div class="dynasty-map-card dynasty-map-hint" v-else>
            <h3>{{ dynasty.name }}</h3>
            <p class="card-note">{{ dynasty.year }}</p>
            <p class="card-note">点击地图上的省份可使其立体凸起；点击城邑标记查看古名今址与说明。左侧列表可快速定位城邑。</p>
          </div>

          <div class="dynasty-map-list-wrap">
            <h4>本朝城邑（{{ dynasty.cities.length }}）</h4>
            <ul class="dynasty-map-list">
              <li v-for="c in dynasty.cities" :key="c.name" :class="{ active: selectedCity && selectedCity.name === c.name }">
                <a href="#" @click.prevent="selectCity(c)">
                  <i class="dot" :style="{ background: cityColor(c) }"></i>
                  <span class="city-name">{{ c.name }}</span>
                  <span class="city-modern">{{ c.modern }}</span>
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <p class="form-hint dynasty-map-foot">
        底图为现代中国省级行政区划（数据来自阿里云 DataV），城邑坐标取对应今址经纬度，仅作地理方位参考，非精确历史疆域。
      </p>
    </div>
  </section>
</template>

<script setup>
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import { dynasties } from '../data/dynasties.js'
import '../dynasty-map.css'

const GEO_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'
const BASE_HEIGHT = 1 // 未选中时近乎贴地，整体呈现「平视图」的平面感
const RAISE_HEIGHT = 16 // 点击省份后向上凸出（挤出）的高度，越大越明显
const MARKER_Z = 9 // 城邑标记悬浮高度，需略高于凸起的省份

const typeMeta = {
  capital: { label: '都城', color: '#f4b740', size: 18 },
  city: { label: '州郡重镇', color: '#3b82f6', size: 11 },
  pass: { label: '边关要塞', color: '#ef4444', size: 11 },
  town: { label: '城邑', color: '#94a3b8', size: 7 }
}
const factionColor = { wei: '#60a5fa', shu: '#4ade80', wu: '#f87171' }
const factionLabel = { wei: '魏', shu: '蜀', wu: '吴' }

const chartRef = ref(null)
const chart = shallowRef(null)
let geoJson = null
let resizeObserver = null
let abortController = null

const loading = ref(true)
const error = ref('')
const ready = computed(() => !loading.value && !error.value && !!chart.value)

const dynastyKey = ref(dynasties[0].key)
const dynasty = computed(() => dynasties.find((d) => d.key === dynastyKey.value) || dynasties[0])

const autoRotate = ref(false)
const showLabels = ref(true)
const selectedProvince = ref('')
const selectedCity = ref(null)

const cityColor = (c) => (c.faction ? factionColor[c.faction] : typeMeta[c.type].color)
const cityTypeLabel = (c) => (c.faction ? factionLabel[c.faction] + ' · ' + typeMeta[c.type].label : typeMeta[c.type].label)

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

// polygon 形如 [外环, 内环(洞), ...]；在外环内且不在任一洞内才算在内
function pointInPolygon(x, y, polygon) {
  if (!polygon || !polygon.length || !pointInRing(x, y, polygon[0])) return false
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(x, y, polygon[i])) return false
  }
  return true
}

function buildRegions(provinceName) {
  if (!geoJson) return []
  return geoJson.features
    .map((f) => f.properties && f.properties.name)
    .filter(Boolean)
    .map((name) => ({
      name,
      regionHeight: name === provinceName ? RAISE_HEIGHT : BASE_HEIGHT,
      itemStyle: name === provinceName
        ? { color: dynasty.value.color, borderColor: '#ffffff', borderWidth: 1.4 }
        : { opacity: 0.96 }
    }))
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
    alpha: 72,
    beta: 0,
    distance: 90,
    center: [0, 0, 0],
    autoRotate: autoRotate.value,
    autoRotateAfterStill: false,
    panMouseButton: 'left',
    rotateMouseButton: 'right',
    animation: true,
    animationDurationUpdate: 600
  }
}

function buildOption({ resetCamera = false } = {}) {
  const option = {
    backgroundColor: '#0b1220',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(15,23,42,0.94)',
      borderColor: '#334155',
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
      map: 'china',
      roam: true,
      silent: false,
      shading: 'lambert',
      environment: '#0b1220',
      regionHeight: BASE_HEIGHT,
      regions: buildRegions(selectedProvince.value),
      itemStyle: {
        color: '#4a6b8a',
        borderColor: '#1b2a3a',
        borderWidth: 1,
        opacity: 0.98
      },
      label: { show: false },
      emphasis: {
        label: { show: true, textStyle: { color: '#fff', fontSize: 13 } },
        itemStyle: { color: '#6b8fb5' }
      },
      light: {
        main: { intensity: 1.5, shadow: true, alpha: 45, beta: -30 },
        ambient: { intensity: 0.6 }
      },
      postEffect: { enable: false }
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: buildSeriesData(),
        symbol: 'circle',
        symbolSize: (v, p) => p.data.symbolSize,
        itemStyle: { opacity: 0.95, borderColor: '#fff', borderWidth: 0.6 },
        label: {
          show: showLabels.value,
          formatter: (p) => p.data.city.name,
          position: 'top',
          textStyle: {
            color: '#f8fafc',
            fontSize: 11,
            backgroundColor: 'rgba(15,23,42,0.78)',
            padding: [2, 5],
            borderRadius: 3
          }
        },
        emphasis: {
          label: { show: true },
          itemStyle: { borderColor: '#fff', borderWidth: 1.4 }
        }
      }
    ]
  }
  // resetCamera 时显式给默认视角；否则不传 viewControl，保留用户当前旋转/缩放
  if (resetCamera) {
    option.geo3D.viewControl = baseViewControl()
  } else {
    option.geo3D.viewControl = { autoRotate: autoRotate.value, animation: true }
  }
  return option
}

function renderChart(resetCamera) {
  if (!chart.value) return
  chart.value.setOption(buildOption({ resetCamera }), resetCamera ? { notMerge: true } : { notMerge: false })
}

function selectCity(c) {
  selectedCity.value = c
  selectedProvince.value = ''
  if (!chart.value) return
  const idx = dynasty.value.cities.findIndex((x) => x.name === c.name)
  chart.value.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: idx })
  chart.value.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: idx })
  // 切城邑时复位省份凸起，让视角中的点不被遮挡
  renderChart(false)
}

function onDynastyChange() {
  selectedCity.value = null
  selectedProvince.value = ''
  renderChart(true)
}

function onToggleRotate() {
  if (!chart.value) return
  chart.value.setOption({ geo3D: { viewControl: { autoRotate: autoRotate.value } } })
}

function onToggleLabels() {
  if (!chart.value) return
  chart.value.setOption({ series: [{ label: { show: showLabels.value } }] })
}

function resetView() {
  if (!chart.value) return
  chart.value.setOption({ geo3D: { viewControl: baseViewControl() } })
}

// 省份名按 GeoJSON feature 顺序索引，供原生点击命中后取名字
let regionNameByIndex = []
let canvasClickHandler = null

// echarts-gl 的组件型 geo3D 不会把区域点击派发到 chart.on('click')
// （LayerGL._dispatchDataEvent 要求 seriesIndex >= 0，组件没有 seriesIndex），
// 直接注入 eventData 又会触发 echarts tooltip 的崩溃（dataModel 缺失）。
// 因此改为在 GL 画布上挂原生 click，手动用 LayerGL.pickObject 命中拾取：
//   命中区域网格（seriesIndex 为 undefined）→ 选中省份并凸起
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
    // 组件型 geo3D 的区域网格：按 dataIndex 反查省份名
    const name = regionNameByIndex[mesh.dataIndex]
    if (name && geoJson.features.some((f) => f.properties && f.properties.name === name)) {
      selectedProvince.value = name
      selectedCity.value = null
      renderChart(false)
    }
  } else if (mesh.seriesIndex === 0) {
    // scatter3D 城邑标记
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
    regionNameByIndex = (geoJson.features || []).map((f) => f.properties && f.properties.name)
    echarts.registerMap('china', geoJson)
    if (!chart.value) {
      chart.value = echarts.init(chartRef.value, null, { renderer: 'canvas' })
      // 用容器事件委托捕获 GL 画布点击（GL 画布在首次渲染后才出现，
      // 且用 offsetX/offsetY 手动命中拾取省份/城邑，绕开 echarts-gl 区域点击不派发的问题）
      canvasClickHandler = (e) => {
        if (!(e.target instanceof HTMLCanvasElement)) return
        handleMapClick(e.offsetX, e.offsetY)
      }
      chartRef.value.addEventListener('click', canvasClickHandler)
    }
    selectedProvince.value = ''
    selectedCity.value = null
    renderChart(true)
  } catch (err) {
    if (err.name === 'AbortError') return
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadMap()
  resizeObserver = new ResizeObserver(() => chart.value && chart.value.resize())
  if (chartRef.value) resizeObserver.observe(chartRef.value)
  window.addEventListener('resize', onWindowResize)
})

function onWindowResize() {
  chart.value && chart.value.resize()
}

onUnmounted(() => {
  if (abortController) abortController.abort()
  window.removeEventListener('resize', onWindowResize)
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
