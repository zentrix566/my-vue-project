<template>
  <main class="marathon-page">
    <div class="race-shell">
      <RouterLink class="back back-link" to="/">← 返回主页</RouterLink>

      <nav class="discipline-switch" aria-label="比赛类型">
        <button :class="{ active: discipline === 'road' }" @click="discipline = 'road'"><span>01</span> 公路赛</button>
        <button :class="{ active: discipline === 'trail' }" @click="discipline = 'trail'"><span>02</span> 越野赛</button>
      </nav>

      <header class="hero" :class="{ 'trail-hero': discipline === 'trail' }">
        <div class="hero-copy">
          <p class="eyebrow">MY RACE ARCHIVE · 2024—2026</p>
          <h1>我的{{ discipline === 'road' ? '马拉松' : '越野跑' }}<br><span>比赛成绩</span></h1>
          <p class="hero-lead">{{ discipline === 'road' ? '十场比赛，不只记录终点时间，也记录每一次把极限推远的过程。' : '六次翻山越岭，用距离、爬升和等强配速记录山野里的每一步。' }}</p>
        </div>
        <div class="bib" aria-label="参赛数据摘要">
          <span class="bib-label">RACES</span>
          <strong>{{ discipline === 'road' ? 10 : 6 }}</strong>
          <div class="bib-rule"></div>
          <small>{{ discipline === 'road' ? '6 全马 · 3 半马 · 1 场 10K' : '319.07 公里 · 累计爬升 14,352 米' }}</small>
          <i v-for="n in 8" :key="n" :style="{ left: `${8 + (n - 1) * 12}%` }"></i>
        </div>
      </header>

      <template v-if="discipline === 'road'">
      <section class="pb-grid" aria-label="个人最佳成绩">
        <article v-for="pb in personalBests" :key="pb.category" class="pb-card" :class="`pb-${pb.tone}`">
          <div><span>PB · {{ pb.category }}</span><strong>{{ pb.race.net }}</strong></div>
          <p>{{ shortName(pb.race.name) }}<br><small>{{ formatDate(pb.race.date) }} · {{ formatPace(pb.pace) }}/km</small></p>
        </article>
        <article class="progress-card">
          <span>全马进步</span>
          <strong>−{{ formatDuration(fullImprovement) }}</strong>
          <p>从天津到石家庄<br><small>完赛时间缩短 {{ improvementPercent }}%</small></p>
        </article>
      </section>

      <section class="panel trend-panel">
        <div class="section-head">
          <div><p class="kicker">PERFORMANCE CURVE</p><h2>成绩趋势</h2><p>同组别才有可比性，切换距离查看净成绩变化。</p></div>
          <div class="filters" role="group" aria-label="选择比赛组别">
            <button v-for="item in categories" :key="item" :class="{ active: activeCategory === item }" @click="activeCategory = item">{{ item }}</button>
          </div>
        </div>
        <div class="trend-summary"><strong>{{ categorySummary }}</strong><span>{{ filteredRaces.length }} 场完赛</span></div>
        <div class="trend-chart">
          <svg :viewBox="`0 0 ${trend.W} ${trend.H}`" role="img" :aria-label="`${activeCategory}净成绩趋势图`">
            <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5c35" stop-opacity=".28"/><stop offset="1" stop-color="#ff5c35" stop-opacity="0"/></linearGradient></defs>
            <line v-for="tick in trend.ticks" :key="tick.value" class="grid-line" :x1="trend.L" :x2="trend.W-trend.R" :y1="tick.y" :y2="tick.y" />
            <text v-for="tick in trend.ticks" :key="`label-${tick.value}`" class="axis-label" :x="trend.L-12" :y="tick.y+4" text-anchor="end">{{ compactTime(tick.value) }}</text>
            <path class="area" :d="trend.area"/><path class="line" :d="trend.path"/>
            <g v-for="point in trend.points" :key="point.race.date" class="trend-point" @click="selectRace(point.race)">
              <circle class="point-hit" :cx="point.x" :cy="point.y" r="20"/><circle :class="['point', { selected: selectedRace.date === point.race.date }]" :cx="point.x" :cy="point.y" r="6"/>
              <text class="point-time" :x="point.x" :y="point.y-15" text-anchor="middle">{{ point.race.net }}</text>
              <text class="axis-label" :x="point.x" :y="trend.H-12" text-anchor="middle">{{ shortDate(point.race.date) }}</text>
            </g>
          </svg>
        </div>
      </section>

      <section class="panel comparison-panel">
        <div class="section-head">
          <div><p class="kicker">CHECKPOINT MATRIX</p><h2>{{ activeCategory }}检查点对比</h2><p>同一检查点横向比较各场比赛；绿色为最快，红色为最慢。</p></div>
          <span class="comparison-order">← 最新比赛优先</span>
        </div>
        <div class="comparison-scroll">
          <table class="comparison-table">
            <thead><tr>
              <th>检查点</th>
              <th v-for="race in comparisonRaces" :key="race.date"><strong>{{ shortName(race.name) }}</strong><span>{{ formatDate(race.date) }}</span></th>
            </tr></thead>
            <tbody><tr v-for="row in checkpointRows" :key="row.distance">
              <th>{{ distanceLabel(row.distance) }}</th>
              <td v-for="cell in row.cells" :key="cell.race.date" :class="{ best: cell.state === 'best', worst: cell.state === 'worst' }">
                <template v-if="cell.time"><strong>{{ cell.time }}</strong><small>该段 {{ formatPace(cell.pace) }}/km</small></template><span v-else>—</span>
              </td>
            </tr></tbody>
          </table>
        </div>
      </section>

      <section class="detail-grid">
        <article class="panel split-panel">
          <div class="section-head compact">
            <div><p class="kicker">SPLIT ANALYSIS</p><h2>分段配速</h2></div>
            <select v-model="selectedDate" aria-label="选择一场比赛">
              <option v-for="race in roadRaceLog" :key="race.date" :value="race.date">{{ formatDate(race.date) }} · {{ shortName(race.name) }}</option>
            </select>
          </div>
          <div class="race-title"><span :class="['category-tag', tagClass(selectedRace.category)]">{{ selectedRace.category }}</span><div><h3>{{ selectedRace.name }}</h3><p>净成绩 {{ selectedRace.net }} · 平均 {{ formatPace(selectedAveragePace) }}/km</p></div></div>
          <div class="split-chart">
            <svg :viewBox="`0 0 ${splitChart.W} ${splitChart.H}`" role="img" :aria-label="`${selectedRace.name}分段配速图`">
              <line v-for="tick in splitChart.ticks" :key="tick.value" class="grid-line" :x1="splitChart.L" :x2="splitChart.W-splitChart.R" :y1="tick.y" :y2="tick.y" />
              <text v-for="tick in splitChart.ticks" :key="`pace-${tick.value}`" class="axis-label" :x="splitChart.L-10" :y="tick.y+4" text-anchor="end">{{ formatPace(tick.value) }}</text>
              <path class="split-line" :d="splitChart.path" />
              <g v-for="point in splitChart.points" :key="point.distance">
                <circle class="split-dot" :cx="point.x" :cy="point.y" r="5"><title>{{ distanceLabel(point.distance) }}：{{ formatPace(point.pace) }}/km</title></circle>
                <text class="axis-label" :x="point.x" :y="splitChart.H-10" text-anchor="middle">{{ distanceLabel(point.distance) }}</text>
              </g>
            </svg>
          </div>
          <div v-if="halfComparison" class="half-compare">
            <div><span>前半程</span><strong>{{ formatDuration(halfComparison.first) }}</strong></div>
            <div><span>后半程</span><strong>{{ formatDuration(halfComparison.second) }}</strong></div>
            <p :class="halfComparison.delta > 0 ? 'slower' : 'faster'">{{ halfComparison.delta > 0 ? '后半程慢' : '后半程快' }} {{ formatDuration(Math.abs(halfComparison.delta)) }}</p>
          </div>
        </article>

        <aside class="panel checkpoint-panel">
          <div class="section-head compact"><div><p class="kicker">CHECKPOINTS</p><h2>检查点</h2></div><span class="gun-gap">枪净差 {{ formatDuration(gunGap) }}</span></div>
          <div class="checkpoint-list">
            <div v-for="(split, index) in selectedSplits" :key="split.distance" class="checkpoint-row">
              <span class="km">{{ distanceLabel(split.distance) }}</span>
              <div class="checkpoint-track"><i :style="{ width: `${split.progress}%` }"></i></div>
              <strong>{{ split.time }}</strong>
              <small>{{ index ? formatPace(split.pace) : formatPace(split.elapsed / split.distance) }}/km</small>
            </div>
          </div>
        </aside>
      </section>

      <section class="race-list-section">
        <div class="section-head"><div><p class="kicker">RACE LOG</p><h2>全部比赛</h2><p>点击任意一场，查看它的分段表现。</p></div></div>
        <div class="race-list">
          <button v-for="(race, index) in roadRaceLog" :key="race.date" class="race-row" :class="{ selected: race.date === selectedRace.date }" @click="selectRace(race)">
            <span class="race-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="race-date">{{ formatDate(race.date) }}</span>
            <span class="race-name"><b>{{ race.name }}</b><small>{{ race.category }} · {{ formatPace(toSeconds(race.net) / categoryDistance[race.category]) }}/km</small></span>
            <span class="race-result"><small>净成绩</small><strong>{{ race.net }}</strong></span>
            <span class="race-arrow">↗</span>
          </button>
        </div>
      </section>
      </template>

      <template v-else>
        <section class="trail-stat-grid" aria-label="越野赛统计摘要">
          <article><span>最长距离</span><strong>101.25<small> km</small></strong><p>大连100 · 2026</p></article>
          <article><span>单场最高爬升</span><strong>5,116<small> m</small></strong><p>大连100 · 爬升比 50.53</p></article>
          <article><span>最快等强配速</span><strong>7′43″</strong><p>柴古唐斯25公里组</p></article>
          <article class="trail-progress"><span>崇礼50K进步</span><strong>−{{ formatDuration(chongliImprovement) }}</strong><p>2024 → 2026 · 提升 {{ chongliPercent }}%</p></article>
        </section>

        <section class="panel trend-panel trail-trend-panel">
          <div class="section-head">
            <div><p class="kicker">TRAIL PACE</p><h2>越野配速趋势</h2><p>橙线为平均配速，绿线为扣除坡度影响后的等强配速；不同赛道仅作表现参考。</p></div>
            <div class="trail-legend"><span class="actual">平均配速</span><span class="effort">等强配速</span></div>
          </div>
          <div class="trend-chart trail-chart">
            <svg :viewBox="`0 0 ${trailTrend.W} ${trailTrend.H}`" role="img" aria-label="越野赛平均配速与等强配速趋势图">
              <line v-for="tick in trailTrend.ticks" :key="tick.value" class="grid-line" :x1="trailTrend.L" :x2="trailTrend.W-trailTrend.R" :y1="tick.y" :y2="tick.y" />
              <text v-for="tick in trailTrend.ticks" :key="`trail-${tick.value}`" class="axis-label" :x="trailTrend.L-10" :y="tick.y+4" text-anchor="end">{{ formatPace(tick.value) }}</text>
              <path class="trail-actual-line" :d="trailTrend.actualPath"/><path class="trail-effort-line" :d="trailTrend.effortPath"/>
              <g v-for="point in trailTrend.points" :key="point.race.date" @click="selectedTrailDate = point.race.date">
                <circle class="trail-actual-dot" :cx="point.x" :cy="point.actualY" r="5"><title>平均 {{ point.race.pace }}/km</title></circle>
                <circle class="trail-effort-dot" :cx="point.x" :cy="point.effortY" r="5"><title>等强 {{ point.race.effortPace }}/km</title></circle>
                <text class="axis-label" :x="point.x" :y="trailTrend.H-10" text-anchor="middle">{{ shortDate(point.race.date) }}</text>
              </g>
            </svg>
          </div>
        </section>

        <section class="trail-detail-grid">
          <article class="panel trail-profile-card">
            <div class="section-head compact">
              <div><p class="kicker">ELEVATION LOAD</p><h2>距离与爬升</h2></div>
              <select v-model="selectedTrailDate" aria-label="选择一场越野赛">
                <option v-for="race in trailRaceLog" :key="race.date" :value="race.date">{{ formatDate(race.date) }} · {{ race.name }}</option>
              </select>
            </div>
            <div class="mountain-visual" aria-hidden="true">
              <svg viewBox="0 0 720 220"><path class="mountain-back" d="M0 200 L90 142 L150 168 L260 55 L330 125 L415 83 L525 160 L600 105 L720 200 Z"/><path class="mountain-front" d="M0 210 L125 165 L205 190 L315 105 L390 174 L485 130 L565 185 L650 148 L720 205 Z"/></svg>
              <div class="elevation-number"><span>累计爬升</span><strong>{{ selectedTrail.elevation.toLocaleString() }} m</strong></div>
            </div>
            <div class="trail-measures">
              <div><span>实际距离</span><strong>{{ selectedTrail.distance.toFixed(2) }} km</strong></div>
              <div><span>爬升比</span><strong>{{ selectedTrail.climbRatio.toFixed(2) }}</strong><small> m/km</small></div>
              <div><span>平均配速</span><strong>{{ selectedTrail.pace }}</strong><small> /km</small></div>
              <div><span>等强配速</span><strong>{{ selectedTrail.effortPace }}</strong><small> /km</small></div>
            </div>
          </article>
          <aside class="panel trail-finish-card">
            <p class="kicker">FINISH</p><span class="trail-category">{{ selectedTrail.category }}</span>
            <h2>{{ selectedTrail.name }}</h2><p>{{ formatDate(selectedTrail.date) }}</p>
            <div class="finish-time"><span>完赛时间</span><strong>{{ selectedTrail.finish }}</strong></div>
            <div v-if="selectedTrail.overallRank" class="rank-grid"><div><span>总排名</span><strong>{{ selectedTrail.overallRank }}</strong></div><div><span>性别排名</span><strong>{{ selectedTrail.genderRank }}</strong></div></div>
            <p v-else class="rank-empty">本场暂无排名数据</p>
          </aside>
        </section>

        <section class="race-list-section">
          <div class="section-head"><div><p class="kicker">TRAIL LOG</p><h2>全部越野比赛</h2><p>六条赛道，各自保留距离与爬升语境。</p></div></div>
          <div class="race-list trail-race-list">
            <button v-for="(race, index) in trailRaceLog" :key="race.date" class="race-row trail-race-row" :class="{ selected: race.date === selectedTrailDate }" @click="selectTrail(race)">
              <span class="race-number">{{ String(index + 1).padStart(2, '0') }}</span><span class="race-date">{{ formatDate(race.date) }}</span>
              <span class="race-name"><b>{{ race.name }}</b><small>{{ race.distance.toFixed(2) }} km · ↑ {{ race.elevation.toLocaleString() }} m · 等强 {{ race.effortPace }}/km</small></span>
              <span class="race-result"><small>完赛时间</small><strong>{{ race.finish }}</strong></span><span class="race-arrow">↗</span>
            </button>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { categoryDistance, raceResults } from '../data/raceResults.js'
import { trailResults } from '../data/trailResults.js'

const discipline = ref('road')
const categories = ['全马', '半马', '10公里']
const activeCategory = ref('全马')
const selectedDate = ref('2026-03-29')
const selectedTrailDate = ref('2026-07-10')
const roadRaceLog = [...raceResults].sort((a, b) => b.date.localeCompare(a.date))
const trailRaceLog = [...trailResults].sort((a, b) => b.date.localeCompare(a.date))
const toSeconds = (value) => value.split(':').map(Number).reduce((total, part) => total * 60 + part, 0)
const paceToSeconds = (value) => { const match = value.match(/(\d+)分(\d+)/); return Number(match[1]) * 60 + Number(match[2]) }
const formatDuration = (seconds) => { const h = Math.floor(seconds / 3600); const m = Math.floor(seconds % 3600 / 60); const s = Math.round(seconds % 60); return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}` }
const formatPace = (seconds) => `${Math.floor(seconds / 60)}′${String(Math.round(seconds % 60)).padStart(2, '0')}″`
const formatDate = (date) => { const [y, m, d] = date.split('-'); return `${y}.${Number(m)}.${Number(d)}` }
const shortDate = (date) => { const [y, m] = date.split('-'); return `${y.slice(2)}/${Number(m)}` }
const shortName = (name) => name.replace(/天津银行·|君乐宝·?|海尔·?|唐山安居集团|202[4-6]|【.*?】|北京银行/g, '').replace(/^中国田径协会/, '').trim()
const distanceLabel = (distance) => distance === 21.0975 ? '半程' : distance === 42.195 ? '全程' : `${distance}K`
const tagClass = (category) => ({ '全马': 'full', '半马': 'half', '10公里': 'ten' }[category])

const selectedRace = computed(() => raceResults.find((race) => race.date === selectedDate.value) || raceResults[0])
const filteredRaces = computed(() => raceResults.filter((race) => race.category === activeCategory.value))
const comparisonRaces = computed(() => [...filteredRaces.value].sort((a, b) => b.date.localeCompare(a.date)))
const checkpointRows = computed(() => {
  const distances = [...new Set(comparisonRaces.value.flatMap((race) => Object.keys(race.splits).map(Number)))].sort((a, b) => a - b)
  return distances.map((distance) => {
    const cells = comparisonRaces.value.map((race) => {
      const entries = Object.entries(race.splits).map(([key, time]) => ({ distance: Number(key), time, elapsed: toSeconds(time) })).sort((a, b) => a.distance - b.distance)
      const index = entries.findIndex((entry) => entry.distance === distance)
      if (index < 0) return { race, time: null, pace: null, elapsed: null, state: null }
      const current = entries[index], prior = entries[index - 1] || { distance: 0, elapsed: 0 }
      return { race, time: current.time, elapsed: current.elapsed, pace: (current.elapsed - prior.elapsed) / (current.distance - prior.distance), state: null }
    })
    const available = cells.filter((cell) => cell.elapsed != null)
    if (available.length > 1) {
      const fastest = Math.min(...available.map((cell) => cell.elapsed)), slowest = Math.max(...available.map((cell) => cell.elapsed))
      cells.forEach((cell) => { if (cell.elapsed === fastest) cell.state = 'best'; else if (cell.elapsed === slowest) cell.state = 'worst' })
    }
    return { distance, cells }
  })
})
const personalBests = computed(() => categories.map((category, index) => {
  const race = raceResults.filter((item) => item.category === category).sort((a, b) => toSeconds(a.net) - toSeconds(b.net))[0]
  return { category, race, pace: toSeconds(race.net) / categoryDistance[category], tone: ['orange', 'blue', 'lime'][index] }
}))
const fullRaces = raceResults.filter((race) => race.category === '全马')
const fullImprovement = toSeconds(fullRaces[0].net) - Math.min(...fullRaces.map((race) => toSeconds(race.net)))
const improvementPercent = Math.round(fullImprovement / toSeconds(fullRaces[0].net) * 100)
const selectedAveragePace = computed(() => toSeconds(selectedRace.value.net) / categoryDistance[selectedRace.value.category])
const gunGap = computed(() => toSeconds(selectedRace.value.gun) - toSeconds(selectedRace.value.net))
const selectedTrail = computed(() => trailResults.find((race) => race.date === selectedTrailDate.value) || trailResults[0])
const chongliRaces = trailResults.filter((race) => race.name.includes('崇礼168'))
const chongliImprovement = toSeconds(chongliRaces[0].finish) - toSeconds(chongliRaces[1].finish)
const chongliPercent = Math.round(chongliImprovement / toSeconds(chongliRaces[0].finish) * 100)
const categorySummary = computed(() => {
  const races = filteredRaces.value
  if (races.length < 2) return `个人最佳 ${races[0].net}`
  const first = toSeconds(races[0].net), best = Math.min(...races.map((race) => toSeconds(race.net)))
  return `从首场到最佳，提升 ${formatDuration(first - best)}`
})

const selectedSplits = computed(() => {
  const entries = Object.entries(selectedRace.value.splits).map(([distance, time]) => ({ distance: Number(distance), time, elapsed: toSeconds(time) })).sort((a, b) => a.distance - b.distance)
  return entries.map((item, index) => { const prior = entries[index - 1] || { distance: 0, elapsed: 0 }; return { ...item, pace: (item.elapsed - prior.elapsed) / (item.distance - prior.distance), progress: item.distance / categoryDistance[selectedRace.value.category] * 100 } })
})
const halfComparison = computed(() => {
  if (selectedRace.value.category !== '全马') return null
  const half = toSeconds(selectedRace.value.splits[21.0975]), total = toSeconds(selectedRace.value.net)
  return { first: half, second: total - half, delta: total - half * 2 }
})

const trend = computed(() => {
  const W = 1000, H = 300, L = 72, R = 34, T = 44, B = 48, races = filteredRaces.value
  const values = races.map((race) => toSeconds(race.net)), rawMin = Math.min(...values), rawMax = Math.max(...values), padding = Math.max(90, (rawMax - rawMin) * .2), min = rawMin - padding, max = rawMax + padding
  const x = (i) => races.length === 1 ? (W + L - R) / 2 : L + i / (races.length - 1) * (W - L - R)
  const y = (value) => T + (max - value) / (max - min) * (H - T - B)
  const points = races.map((race, index) => ({ race, x: x(index), y: y(toSeconds(race.net)) }))
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ')
  const area = points.length > 1 ? `${path} L${points.at(-1).x} ${H-B} L${points[0].x} ${H-B} Z` : ''
  const ticks = Array.from({ length: 4 }, (_, index) => { const value = min + (max - min) * index / 3; return { value, y: y(value) } })
  return { W, H, L, R, points, path, area, ticks }
})
const compactTime = (seconds) => { const h = Math.floor(seconds / 3600), m = Math.round(seconds % 3600 / 60); return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}m` }

const trailTrend = computed(() => {
  const W = 1000, H = 310, L = 70, R = 28, T = 32, B = 48
  const values = trailResults.flatMap((race) => [paceToSeconds(race.pace), paceToSeconds(race.effortPace)])
  const min = Math.floor((Math.min(...values) - 20) / 30) * 30, max = Math.ceil((Math.max(...values) + 20) / 30) * 30
  const x = (index) => L + index / (trailResults.length - 1) * (W - L - R)
  const y = (value) => T + (value - min) / (max - min) * (H - T - B)
  const points = trailResults.map((race, index) => ({ race, x: x(index), actualY: y(paceToSeconds(race.pace)), effortY: y(paceToSeconds(race.effortPace)) }))
  const pathFor = (key) => points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point[key]}`).join(' ')
  const ticks = Array.from({ length: 5 }, (_, index) => { const value = min + (max - min) * index / 4; return { value, y: y(value) } })
  return { W, H, L, R, points, ticks, actualPath: pathFor('actualY'), effortPath: pathFor('effortY') }
})

const splitChart = computed(() => {
  const W = 720, H = 260, L = 58, R = 22, T = 32, B = 42, data = selectedSplits.value
  const paces = data.map((item) => item.pace), min = Math.floor((Math.min(...paces) - 15) / 30) * 30, max = Math.ceil((Math.max(...paces) + 15) / 30) * 30
  const x = (distance) => L + distance / categoryDistance[selectedRace.value.category] * (W - L - R)
  const y = (pace) => T + (pace - min) / (max - min || 1) * (H - T - B)
  const points = data.map((item) => ({ ...item, x: x(item.distance), y: y(item.pace) }))
  const ticks = Array.from({ length: 4 }, (_, index) => { const value = min + (max - min) * index / 3; return { value, y: y(value) } })
  return { W, H, L, R, points, ticks, path: points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ') }
})

function selectRace(race) { selectedDate.value = race.date; document.querySelector('.detail-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
function selectTrail(race) { selectedTrailDate.value = race.date; document.querySelector('.trail-detail-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
watch(activeCategory, (category) => { selectedDate.value = filteredRaces.value.at(-1).date })
</script>

<style scoped>
.marathon-page { --ink: #12221c; --paper: #f4f1e9; --orange: #ff5c35; --lime: #c9f04b; min-height: 100vh; padding: 30px 20px 72px; color: var(--ink); background: var(--paper); }
.race-shell { width: min(1180px, 100%); margin: auto; }.back-link { display: inline-block; margin-bottom: 22px; color: #44544d; }
.discipline-switch { display: inline-flex; gap: 5px; margin: 0 0 18px 24px; padding: 5px; border-radius: 14px; background: #dedbd2; }.discipline-switch button { border: 0; padding: 10px 18px; border-radius: 10px; color: #59665f; background: transparent; font-weight: 900; cursor: pointer; }.discipline-switch button span { margin-right: 6px; opacity: .55; font-size: .7rem; }.discipline-switch button.active { color: #fff; background: var(--ink); box-shadow: 0 5px 14px rgba(18,34,28,.18); }
.hero { display: grid; grid-template-columns: 1.25fr .75fr; gap: 48px; align-items: end; padding: 50px; border-radius: 28px; color: #fff; background: var(--ink); overflow: hidden; position: relative; }
.hero.trail-hero { background: #172818; }.hero.trail-hero::after { border-color: rgba(201,240,75,.16); }.hero.trail-hero .hero-copy span { color: var(--lime); }.hero.trail-hero .bib-rule { background: repeating-linear-gradient(90deg,#74a83b 0 32px,transparent 32px 39px); }
.hero::after { content: ''; position: absolute; width: 420px; height: 420px; right: -120px; top: -210px; border: 80px solid rgba(201,240,75,.1); border-radius: 50%; }
.eyebrow,.kicker { margin: 0 0 10px; font-size: .72rem; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }.eyebrow { color: var(--lime); }
.hero h1 { margin: 0; font-size: clamp(3.1rem, 7vw, 6.3rem); line-height: .88; letter-spacing: -.07em; }.hero h1 span { color: var(--orange); }.hero-lead { max-width: 530px; margin: 28px 0 0; color: #b9c4be; }
.bib { min-height: 250px; padding: 28px; border-radius: 18px; color: var(--ink); background: #fff; transform: rotate(2deg); position: relative; z-index: 1; box-shadow: 0 20px 50px rgba(0,0,0,.25); }.bib-label { font-weight: 900; letter-spacing: .2em; }.bib strong { display: block; font-size: 7rem; line-height: 1; letter-spacing: -.08em; }.bib-rule { height: 8px; margin: 8px 0 14px; background: repeating-linear-gradient(90deg,var(--orange) 0 32px,transparent 32px 39px); }.bib small { font-weight: 800; }.bib i { position: absolute; bottom: -9px; width: 18px; height: 18px; border-radius: 50%; background: var(--ink); }
.pb-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin: 16px 0 40px; }.pb-card,.progress-card { min-height: 180px; padding: 22px; border-radius: 18px; display: flex; flex-direction: column; justify-content: space-between; }.pb-card span,.progress-card span { font-size: .75rem; font-weight: 900; letter-spacing: .12em; }.pb-card strong,.progress-card strong { display: block; margin-top: 5px; font-size: clamp(1.8rem,3vw,2.8rem); letter-spacing: -.05em; }.pb-card p,.progress-card p { margin: 0; font-weight: 800; }.pb-card small,.progress-card small { font-weight: 600; opacity: .7; }.pb-orange { color: #fff; background: var(--orange); }.pb-blue { color: #fff; background: #2758d6; }.pb-lime { background: var(--lime); }.progress-card { color: #fff; background: var(--ink); }
.panel { background: #fff; border: 1px solid #dedbd2; border-radius: 22px; box-shadow: 0 12px 36px rgba(18,34,28,.06); }.trend-panel { padding: 30px; margin-bottom: 18px; }.section-head { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }.section-head h2 { margin: 0 0 6px; font-size: clamp(1.55rem,3vw,2.3rem); letter-spacing: -.04em; }.section-head p { margin: 0; color: #657169; }.kicker { color: var(--orange) !important; }.filters { display: flex; padding: 4px; background: #eeece5; border-radius: 12px; }.filters button { border: 0; padding: 9px 16px; border-radius: 9px; color: #657169; background: transparent; font-weight: 800; cursor: pointer; }.filters button.active { color: #fff; background: var(--ink); }.trend-summary { display: flex; gap: 12px; align-items: baseline; margin: 30px 0 0 72px; }.trend-summary strong { font-size: 1.15rem; }.trend-summary span { color: #7b857f; font-size: .82rem; }.trend-chart svg,.split-chart svg { display: block; width: 100%; overflow: visible; }.grid-line { stroke: #e8e6df; stroke-dasharray: 4 5; }.axis-label { fill: #7b857f; font-size: 11px; }.area { fill: url(#areaFill); }.line,.split-line { fill: none; stroke: var(--orange); stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; }.point-hit { fill: transparent; cursor: pointer; }.point { fill: #fff; stroke: var(--orange); stroke-width: 4; transition: r .15s; }.point.selected { fill: var(--lime); stroke: var(--ink); r: 8px; }.point-time { fill: var(--ink); font-size: 12px; font-weight: 900; }
.comparison-panel { padding: 30px; margin-bottom: 18px; }.comparison-order { padding: 7px 10px; border-radius: 8px; color: #69756e; background: #f0eee7; font-size: .75rem; font-weight: 800; white-space: nowrap; }.comparison-scroll { margin-top: 22px; overflow-x: auto; }.comparison-table { width: 100%; min-width: 760px; border-collapse: collapse; table-layout: fixed; }.comparison-table th,.comparison-table td { padding: 13px 12px; border-bottom: 1px solid #e1dfd8; text-align: center; }.comparison-table thead th { color: #516059; font-size: .78rem; vertical-align: bottom; }.comparison-table thead th:first-child,.comparison-table tbody th { width: 84px; text-align: left; }.comparison-table thead th strong { display: block; max-width: 140px; margin: auto; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.comparison-table thead th span { display: block; margin-top: 3px; color: #7d8881; font-size: .7rem; }.comparison-table tbody th { font-size: .84rem; }.comparison-table td { height: 68px; font-variant-numeric: tabular-nums; }.comparison-table td strong { display: block; font-size: .9rem; }.comparison-table td small { display: block; margin-top: 2px; color: #79847d; font-size: .66rem; }.comparison-table td > span { color: #a3aaa6; }.comparison-table td.best { color: #087d72; background: rgba(13,148,136,.14); }.comparison-table td.best small { color: #087d72; }.comparison-table td.worst { color: #e23d24; background: rgba(226,61,36,.13); }.comparison-table td.worst small { color: #c84a37; }
.detail-grid { display: grid; grid-template-columns: minmax(0,1.7fr) minmax(300px,.8fr); gap: 18px; scroll-margin-top: 84px; }.split-panel,.checkpoint-panel { padding: 28px; }.section-head.compact { align-items: center; }.section-head select { max-width: 330px; padding: 10px 34px 10px 12px; border: 1px solid #d8d5cc; border-radius: 10px; background: #f7f5ef; color: var(--ink); }.race-title { display: flex; gap: 14px; align-items: center; padding: 20px 0 10px; }.race-title h3 { margin: 0 0 4px; font-size: 1.05rem; }.race-title p { margin: 0; color: #657169; font-size: .85rem; }.category-tag { flex: 0 0 auto; padding: 7px 10px; border-radius: 8px; color: #fff; font-size: .78rem; font-weight: 900; }.category-tag.full { background: var(--orange); }.category-tag.half { background: #2758d6; }.category-tag.ten { color: var(--ink); background: var(--lime); }.split-dot { fill: #fff; stroke: var(--orange); stroke-width: 4; }.half-compare { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; padding: 16px; border-radius: 14px; background: #f4f2eb; }.half-compare div { display: flex; flex-direction: column; }.half-compare span { color: #6e7972; font-size: .75rem; }.half-compare strong { font-size: 1.15rem; }.half-compare p { margin: 0; padding: 7px 10px; border-radius: 8px; font-size: .78rem; font-weight: 900; }.slower { color: #b23a20; background: #ffe2da; }.faster { color: #24621b; background: #e6f7c3; }
.gun-gap { padding: 6px 9px; border-radius: 8px; color: #657169; background: #f0eee7; font-size: .75rem; font-weight: 800; }.checkpoint-list { display: grid; gap: 4px; margin-top: 20px; }.checkpoint-row { display: grid; grid-template-columns: 42px 1fr 68px; gap: 8px 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #eeece6; }.checkpoint-row .km { font-size: .78rem; font-weight: 900; }.checkpoint-track { height: 5px; border-radius: 99px; background: #eceae4; overflow: hidden; }.checkpoint-track i { display: block; height: 100%; border-radius: inherit; background: var(--orange); }.checkpoint-row strong { font-size: .86rem; font-variant-numeric: tabular-nums; }.checkpoint-row small { grid-column: 2/4; color: #7b857f; font-size: .7rem; }
.race-list-section { margin-top: 48px; }.race-list { margin-top: 20px; border-top: 2px solid var(--ink); }.race-row { width: 100%; display: grid; grid-template-columns: 54px 105px 1fr 115px 28px; gap: 16px; align-items: center; padding: 18px 8px; text-align: left; color: var(--ink); border: 0; border-bottom: 1px solid #d8d5cc; background: transparent; cursor: pointer; transition: background .15s,padding .15s; }.race-row:hover,.race-row.selected { padding-left: 16px; background: #fff; }.race-number { color: var(--orange); font-size: .75rem; font-weight: 900; }.race-date { font-size: .82rem; font-weight: 800; }.race-name { display: flex; flex-direction: column; }.race-name b { font-size: .95rem; }.race-name small,.race-result small { color: #748078; font-size: .72rem; }.race-result { display: flex; flex-direction: column; align-items: flex-end; }.race-result strong { font-size: 1.1rem; font-variant-numeric: tabular-nums; }.race-arrow { font-size: 1.25rem; }
.trail-stat-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin: 16px 0 40px; }.trail-stat-grid article { min-height: 160px; padding: 22px; border: 1px solid #dcd9cf; border-radius: 18px; background: #fff; display: flex; flex-direction: column; justify-content: space-between; }.trail-stat-grid span { color: #68756d; font-size: .76rem; font-weight: 900; letter-spacing: .08em; }.trail-stat-grid strong { font-size: clamp(1.9rem,3vw,2.7rem); letter-spacing: -.05em; }.trail-stat-grid strong small { font-size: .9rem; }.trail-stat-grid p { margin: 0; color: #667269; font-size: .78rem; }.trail-stat-grid .trail-progress { color: #fff; border-color: #172818; background: #172818; }.trail-progress span,.trail-progress p { color: #c4d0c5; }.trail-progress strong { color: var(--lime); }
.trail-legend { display: flex; gap: 18px; color: #5f6d65; font-size: .78rem; font-weight: 800; }.trail-legend span::before { content: ''; display: inline-block; width: 22px; height: 4px; margin-right: 7px; border-radius: 9px; vertical-align: middle; }.trail-legend .actual::before { background: var(--orange); }.trail-legend .effort::before { background: #75a934; }.trail-actual-line,.trail-effort-line { fill: none; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; }.trail-actual-line { stroke: var(--orange); }.trail-effort-line { stroke: #75a934; }.trail-actual-dot { fill: #fff; stroke: var(--orange); stroke-width: 4; cursor: pointer; }.trail-effort-dot { fill: #fff; stroke: #75a934; stroke-width: 4; cursor: pointer; }
.trail-detail-grid { display: grid; grid-template-columns: 1.55fr .75fr; gap: 18px; scroll-margin-top: 84px; }.trail-profile-card,.trail-finish-card { padding: 28px; }.mountain-visual { height: 220px; margin-top: 18px; border-radius: 16px; background: linear-gradient(#e5efdc,#f5f2e9); overflow: hidden; position: relative; }.mountain-visual svg { width: 100%; height: 100%; }.mountain-back { fill: #91ac74; opacity: .72; }.mountain-front { fill: #48683f; }.elevation-number { position: absolute; left: 20px; top: 20px; display: flex; flex-direction: column; color: #173019; }.elevation-number span { font-size: .75rem; font-weight: 900; }.elevation-number strong { font-size: 2rem; }.trail-measures { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-top: 12px; }.trail-measures div { padding: 14px; border-radius: 12px; background: #f4f2eb; }.trail-measures span { display: block; color: #69746d; font-size: .72rem; }.trail-measures strong { font-size: 1.05rem; }.trail-measures small { color: #69746d; }.trail-finish-card { color: #fff; background: #172818; }.trail-category { display: inline-block; padding: 6px 9px; border-radius: 8px; color: #172818; background: var(--lime); font-size: .75rem; font-weight: 900; }.trail-finish-card h2 { margin: 18px 0 5px; font-size: 1.35rem; }.trail-finish-card > p:not(.kicker):not(.rank-empty) { color: #aebcaf; }.finish-time { margin: 32px 0 24px; padding-top: 20px; border-top: 1px solid #3a4b3d; }.finish-time span { display: block; color: #aebcaf; font-size: .75rem; }.finish-time strong { font-size: 2.35rem; letter-spacing: -.04em; }.rank-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.rank-grid div { padding: 12px; border-radius: 10px; color: #172818; background: var(--lime); }.rank-grid span { display: block; font-size: .7rem; }.rank-grid strong { font-size: 1.4rem; }.rank-empty { color: #8d9d90; font-size: .78rem; }.trail-race-row .race-number { color: #628d35; }
@media (max-width: 850px) { .hero { grid-template-columns: 1fr; padding: 34px; }.bib { min-height: 190px; }.bib strong { font-size: 5rem; }.pb-grid,.trail-stat-grid { grid-template-columns: repeat(2,1fr); }.detail-grid,.trail-detail-grid { grid-template-columns: 1fr; }.trail-measures { grid-template-columns: repeat(2,1fr); }.section-head { flex-direction: column; }.trend-summary { margin-left: 0; }.trend-chart { overflow-x: auto; }.trend-chart svg { min-width: 720px; }.race-row { grid-template-columns: 38px 1fr 100px 20px; }.race-date { display: none; } }
@media (max-width: 560px) { .marathon-page { padding: 20px 12px 50px; }.discipline-switch { width: 100%; margin: 0 0 14px; }.discipline-switch button { flex: 1; }.hero { padding: 28px 22px; border-radius: 20px; }.hero h1 { font-size: 3.5rem; }.pb-grid,.trail-stat-grid { grid-template-columns: 1fr; }.pb-card,.progress-card,.trail-stat-grid article { min-height: 145px; }.trend-panel,.comparison-panel,.split-panel,.checkpoint-panel,.trail-profile-card,.trail-finish-card { padding: 20px 16px; }.filters { width: 100%; }.filters button { flex: 1; padding-inline: 8px; }.section-head select { width: 100%; max-width: none; }.half-compare { grid-template-columns: 1fr 1fr; }.half-compare p { grid-column: 1/-1; text-align: center; }.trail-measures { grid-template-columns: 1fr 1fr; }.race-row { gap: 9px; }.race-name b { font-size: .82rem; }.race-number { display: none; }.race-row { grid-template-columns: 1fr 90px 18px; }.race-result strong { font-size: .95rem; } }
</style>
