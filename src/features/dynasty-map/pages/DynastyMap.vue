<template>
  <section class="page dynasty-map-page">
    <header class="dm-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <p class="eyebrow">HISTORICAL ATLAS · 中国历史地图</p>
      <h1>历代疆域图</h1>
      <p class="dm-sub">以历史地图册的方式浏览中国历代疆域：彩色区域表示主要政权，深色线条表示国界与边界，重点城市按都城、州郡重镇和关隘分级标注。</p>
    </header>

    <div class="dm-stage" :class="{ 'is-switching': switching }" :style="{ '--accent': dynasty.color }">
      <div class="dm-stars" aria-hidden="true"></div>
      <div ref="hostRef" class="dm-canvas-host"></div>
      <div class="dm-vignette" aria-hidden="true"></div>

      <!-- 左上：朝代信息 -->
      <div class="dm-info" v-if="ready">
        <div class="dm-info-head">
          <span class="dm-info-dot"></span>
          <span class="dm-info-name">{{ dynasty.name }}</span>
          <span class="dm-info-year">{{ dynasty.year }}</span>
        </div>
        <p class="dm-info-intro">{{ dynasty.intro }}</p>
        <p class="dm-info-capital">🏛 都城：{{ dynasty.capital }}</p>
        <div v-if="selectedFactionInfo" class="dm-selected-faction">
          <strong>{{ selectedFactionInfo.name }}</strong>
          <span>{{ selectedFactionInfo.note }}</span>
        </div>
        <p class="dm-info-division" v-if="hoveredDivision">🗺 {{ hoveredDivision }}</p>
        <template v-if="dynasty.legend">
          <p class="dm-info-sec">政权 · 点击筛选</p>
          <div class="dm-legend">
            <button v-for="(label, key) in dynasty.legend" :key="key" type="button"
              class="dm-chip" :class="{ active: selectedFaction === key }"
              :style="{ '--c': factionColor[key] }" @click="toggleFaction(key)">
              <i class="dot"></i>{{ label }}
            </button>
          </div>
        </template>
        <p class="dm-info-sec">图例 · 城市与边界</p>
        <div class="dm-legend dm-type-legend">
          <span class="dm-legend-item"><i class="dot" :style="{ background: tiers.capital.color, boxShadow: '0 0 8px ' + tiers.capital.color }"></i>都城</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: tiers.city.color }"></i>州郡重镇</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: tiers.pass.color }"></i>边关要塞</span>
          <span class="dm-legend-item"><i class="dot" :style="{ background: tiers.town.color }"></i>城邑</span>
        </div>
      </div>

      <!-- 右上：工具 -->
      <div class="dm-toolbar" v-if="ready">
        <button type="button" class="dm-tool" :class="{ on: touring }" :title="touring ? '停止巡游' : '自动巡游历代'"
          @click="toggleTour">{{ touring ? '⏸' : '▶' }}<span>巡游</span></button>
        <button type="button" class="dm-tool" :class="{ on: showLabels }" :title="showLabels ? '隐藏城邑名称' : '显示城邑名称'"
          @click="toggleLabels">🏷<span>城市</span></button>
        <button type="button" class="dm-tool" :class="{ on: layers.territories }" title="显示/隐藏政权边界"
          @click="toggleLayer('territories')">▧<span>国界</span></button>
        <button type="button" class="dm-tool" :class="{ on: layers.provinces }" title="显示/隐藏现代省界"
          @click="toggleLayer('provinces')">⌘<span>省界</span></button>
        <button type="button" class="dm-tool" :class="{ on: layers.walls }" title="显示/隐藏长城"
          @click="toggleLayer('walls')">〰<span>长城</span></button>
        <button type="button" class="dm-tool" title="复位视角" @click="resetView">⌂<span>复位</span></button>
      </div>

      <!-- 底部：朝代选择 -->
      <nav class="dm-timeline" v-if="ready" aria-label="朝代时间条">
        <button type="button" class="dm-nav" :disabled="eraIndex === 0" @click="stepEra(-1)">‹</button>
        <label class="dm-era-select-label" for="dynasty-era-select">选择朝代</label>
        <select id="dynasty-era-select" class="dm-era-select" :value="eraIndex"
          @change="setEra(Number($event.target.value))">
          <option v-for="(d, i) in dynasties" :key="d.key" :value="i">
            {{ d.name }} · {{ shortYear(d.startYear) }}
          </option>
        </select>
        <span class="dm-era-current">{{ dynasty.name }}<small>{{ dynasty.year }}</small></span>
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
      底图支持现代省界、历史国界、城市和长城分层显示；历代疆域为参照历史地图集整理的示意轮廓，城邑坐标取今址经纬度，仅作地理大势参考，非精确历史边界。
    </p>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { dynasties } from '../data/dynasties.js'
import { walls } from '../data/territories.js'
import { factionsFromGeoJson } from '../data/geo/historical-territories.js'
import chinaProvinces from '../data/geo/china-provinces.json'
import { DynastyScene } from '../scene/DynastyScene.js'
import { CITY_TIERS, morandi } from '../scene/palette.js'
import '../dynasty-map.css'

const hostRef = ref(null)
const stripRef = ref(null)
const activeEraEl = ref(null)
let scene = null
let geoJson = null
let abortController = null
let tourTimer = null

const loading = ref(true)
const error = ref('')
const ready = computed(() => !loading.value && !error.value)

const route = useRoute()
const initialIndex = Math.max(0, dynasties.findIndex((d) => d.key === route.query.era))
const eraIndex = ref(initialIndex)
const dynasty = computed(() => dynasties[eraIndex.value])
const switching = ref(false)

const showLabels = ref(true)
const touring = ref(false)
const selectedProvince = ref('')
const selectedCity = ref(null)
const selectedFaction = ref('')
const hoveredDivision = ref('')
const layers = ref({ provinces: true, territories: true, cities: true, walls: true })

const tiers = CITY_TIERS
const factions = computed(() => factionsFromGeoJson(dynasty.value.key))
const selectedFactionInfo = computed(() => {
  const faction = factions.value.find((f) => f.key === selectedFaction.value)
  return faction ? { name: faction.name, note: faction.note || `${faction.name}：点击地图区域可取消筛选。` } : null
})
const factionColor = computed(() =>
  Object.fromEntries(factions.value.map((f) => [f.key, morandi(f.color).top]))
)

const shortYear = (y) => (y < 0 ? '前' + -y : String(y))
const cityColor = (c) => (CITY_TIERS[c.type] || CITY_TIERS.town).color
const cityTypeLabel = (c) => {
  const t = (CITY_TIERS[c.type] || CITY_TIERS.town).label
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

function applyEra() {
  if (!scene || !geoJson) return
  scene.setEra({
    cities: dynasty.value.cities,
    factions: factions.value,
    wall: walls[dynasty.value.key]
  })
  scene.setLayers(layers.value)
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

watch(selectedCity, (c) => {
  if (!scene) return
  if (c) {
    scene.pulseCity(c.name)
  } else {
    scene.clearPulse()
  }
})

function selectCity(c) {
  selectedCity.value = c
  selectedProvince.value = ''
}

function toggleFaction(key) {
  selectedFaction.value = selectedFaction.value === key ? '' : key
  selectedCity.value = null
  scene?.setFaction(selectedFaction.value || '')
}

function toggleLabels() {
  showLabels.value = !showLabels.value
  scene?.setLabels(showLabels.value)
}

function toggleLayer(key) {
  layers.value[key] = !layers.value[key]
  scene?.setLayers(layers.value)
}

function resetView() {
  scene?.resetView()
}

function toggleTour() {
  touring.value = !touring.value
  if (touring.value) {
    tourTimer = setInterval(() => {
      const next = (eraIndex.value + 1) % dynasties.length
      setEra(next)
    }, 6500)
  } else {
    clearInterval(tourTimer)
    tourTimer = null
  }
}

async function loadMap() {
  loading.value = true
  error.value = ''
  if (abortController) abortController.abort()
  abortController = new AbortController()
  try {
    // 省界随前端一起打包，运行时不再依赖在线 GeoJSON 服务。
    geoJson = chinaProvinces
    if (!scene) {
      scene = new DynastyScene(hostRef.value, {
        onPickCity: (c) => {
          selectedCity.value = c
          selectedProvince.value = ''
        },
        onPickFaction: (key) => toggleFaction(key),
        onPickProvince: (name) => {
          selectedProvince.value = selectedProvince.value === name ? '' : name
          selectedCity.value = null
        },
        onHoverDivision: (d) => {
          hoveredDivision.value = d ? `${d.name} · 治 ${d.city.name}` : ''
        },
        onError: (msg) => {
          error.value = msg
        }
      })
    }
    scene.setGeoJson(geoJson)
    scene.setLayers(layers.value)
    applyEra()
  } catch (err) {
    if (err.name === 'AbortError') return
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

function onKeydown(e) {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return
  if (e.key === 'ArrowLeft') stepEra(-1)
  else if (e.key === 'ArrowRight') stepEra(1)
}

onMounted(() => {
  loadMap()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  if (abortController) abortController.abort()
  if (tourTimer) clearInterval(tourTimer)
  window.removeEventListener('keydown', onKeydown)
  if (scene) {
    scene.dispose()
    scene = null
  }
})
</script>
