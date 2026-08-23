<template>
  <section class="page dynasty-map-page">
    <header class="dm-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <p class="eyebrow">Dynasty Map · 3D</p>
      <h1>历代疆域 · 3D 地图</h1>
      <p class="dm-sub">暗色数字博物馆沙盘：挂墙地图式俯视，暗石板省份底座之上，历代疆域以莫兰迪色立体拔起并按郡/州划块，都城与重镇化作辉光光柱；城名标签带碰撞检测与缩放分层，可拖拽旋转、滚轮缩放，点击城邑与疆域查看详情。</p>
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
        <p class="dm-info-sec">图例 · 光柱越高越重</p>
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
        <button type="button" class="dm-tool" :class="{ on: autoRotate }" title="自动旋转视角"
          @click="toggleRotate">⟳<span>旋转</span></button>
        <button type="button" class="dm-tool" :class="{ on: showLabels }" :title="showLabels ? '隐藏城邑名称' : '显示城邑名称'"
          @click="toggleLabels">🏷<span>城名</span></button>
        <button type="button" class="dm-tool" title="复位视角" @click="resetView">⌂<span>复位</span></button>
      </div>

      <!-- 右侧：城邑列表 -->
      <aside class="dm-side" :class="{ collapsed: sideCollapsed }" v-if="ready">
        <button type="button" class="dm-side-toggle" :title="sideCollapsed ? '展开城邑列表' : '收起城邑列表'"
          @click="sideCollapsed = !sideCollapsed">{{ sideCollapsed ? '‹' : '›' }}</button>
        <div class="dm-card" v-if="selectedCity">
          <div class="dm-card-type" :style="{ background: cityColor(selectedCity) }">{{ cityTypeLabel(selectedCity) }}</div>
          <h3>{{ selectedCity.name }}</h3>
          <p class="dm-card-modern">今址：{{ selectedCity.modern }}</p>
          <p class="dm-card-note">{{ selectedCity.note }}</p>
        </div>
        <div class="dm-card" v-else-if="selectedProvince">
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
        <div class="dm-card" v-else>
          <h3>探索指南</h3>
          <p class="dm-card-note">疆域内部按{{ dynasty.division || '郡' }}划块，同色系深浅区分；悬停显示{{ dynasty.division || '郡' }}名，点击区划选中郡治。点击辉光光柱查看城邑古名今址；点击疆域边缘按政权筛选；缩放地图逐层显示关隘、城邑与{{ dynasty.division || '郡' }}名；底部时间条切换朝代，或用 ← → 键翻页。</p>
        </div>
        <div class="dm-list" v-show="!sideCollapsed">
          <h4>本图城邑（{{ visibleCities.length }}）</h4>
          <div v-for="g in cityGroups" :key="g.key" class="dm-group">
            <div class="dm-group-head" v-if="g.key !== '__all__'">
              <i class="dot" :style="{ background: factionColor[g.key] || '#94a3b8' }"></i>{{ g.label }}<em>{{ g.cities.length }}</em>
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
      <nav class="dm-timeline" v-if="ready" aria-label="朝代时间条">
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { dynasties } from '../data/dynasties.js'
import { territories, walls } from '../data/territories.js'
import { DynastyScene } from '../scene/DynastyScene.js'
import { CITY_TIERS, morandi } from '../scene/palette.js'
import '../dynasty-map.css'

const GEO_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

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

const autoRotate = ref(false)
const showLabels = ref(true)
const touring = ref(false)
const sideCollapsed = ref(true)
const selectedProvince = ref('')
const selectedCity = ref(null)
const selectedFaction = ref('')
const hoveredDivision = ref('')

const tiers = CITY_TIERS
const factions = computed(() => territories[dynasty.value.key] || [])
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
    if (sideCollapsed.value) sideCollapsed.value = false
    scene.pulseCity(c.name)
  } else {
    scene.clearPulse()
  }
})

watch(selectedProvince, (name) => {
  if (name && sideCollapsed.value) sideCollapsed.value = false
})

// 侧栏默认收起不挡地图；展开时地图向左让位、收起回正
watch(sideCollapsed, (collapsed) => {
  scene?.setSidebarOpen(!collapsed)
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

function toggleRotate() {
  autoRotate.value = !autoRotate.value
  scene?.setAutoRotate(autoRotate.value)
}

function toggleLabels() {
  showLabels.value = !showLabels.value
  scene?.setLabels(showLabels.value)
}

function resetView() {
  scene?.resetView()
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

async function loadMap() {
  loading.value = true
  error.value = ''
  if (abortController) abortController.abort()
  abortController = new AbortController()
  try {
    const res = await fetch(GEO_URL, { signal: abortController.signal })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    geoJson = await res.json()
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
