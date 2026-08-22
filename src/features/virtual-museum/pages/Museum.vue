<template>
  <main class="museum">
    <div class="museum-shell" :key="hallKey" :style="{ '--era': hallEra.color }">
      <header class="museum-head">
        <div class="head-row">
          <RouterLink to="/" class="back">← 返回主页</RouterLink>
          <span class="stamp-meter">🏛 护照盖章 <strong>{{ stampedCount }}</strong> / {{ hallList.length }}</span>
        </div>
        <h1 class="museum-title">🏺 虚拟博物馆 · 文物编年</h1>
        <p class="museum-sub">把文物放回它当年的场景：一座展厅一个朝代，展柜旁边就是同期大事与人物。键盘 ← / → 切换展厅。</p>
      </header>

      <nav class="hall-nav" aria-label="展厅导航">
        <button v-for="hall in hallList" :key="hall.key" :class="['hall-chip', { active: hall.key === hallKey }]" @click="goHall(hall.key)">
          <span v-if="progress.stamps[hall.key]" class="chip-stamp">🏛</span>{{ hall.name }}
        </button>
      </nav>

      <section class="hall">
        <header class="hall-hero">
          <p class="hall-eyebrow">{{ hallIndex + 1 }} / {{ hallList.length }} 号展厅 · {{ rangeText(hallEra) }}</p>
          <h2 class="hall-name">{{ hallEra.name }}</h2>
          <p class="hall-scene">{{ hallData.scene }}</p>
          <p class="hall-greeting">{{ hallData.greeting }}</p>
          <button class="stamp-btn" :class="{ done: isStamped }" @click="stampHall">{{ isStamped ? '🏛 本厅已盖章' : '🏛️ 为本展厅盖章' }}</button>
        </header>

        <div class="hall-body">
          <div class="hall-main">
            <section v-for="group in sceneGroups" :key="group.scene" class="scene">
              <h3 class="scene-name"><span class="scene-dot"></span>{{ group.scene }}<span class="scene-count">{{ group.items.length }} 件</span></h3>
              <div class="cases">
                <button v-for="a in group.items" :key="a.id" class="case" :class="{ seen: progress.seen[a.id] }" @click="openArtifact(a)">
                  <span class="case-emoji">{{ a.emoji }}</span>
                  <strong class="case-name">{{ a.name }}</strong>
                  <span class="case-year">{{ a.yearLabel }}</span>
                  <span class="case-role">{{ a.role }}</span>
                </button>
              </div>
            </section>
          </div>

          <aside class="hall-side">
            <section v-if="hallEvents.length" class="side-block">
              <h3>📜 同期大事</h3>
              <p class="side-hint">与这些展品同处一个时代的节点</p>
              <ul class="event-list">
                <li v-for="ev in hallEvents" :key="ev.name">
                  <RouterLink :to="timelineLink" class="event-item" :title="ev.note">
                    <span class="event-year">{{ formatYear(ev.year) }}</span>
                    <span class="event-name">{{ ev.name }}</span>
                  </RouterLink>
                </li>
              </ul>
            </section>
            <section class="side-block">
              <h3>👥 同期人物</h3>
              <div class="people">
                <span v-for="p in hallFigures" :key="p.name" class="person-chip" :title="chipTitle(p)">
                  <strong>{{ p.name }}</strong><em>{{ p.role }}</em>
                </span>
              </div>
              <RouterLink :to="timelineLink" class="side-more">→ 去时间轴看{{ hallEra.name }}全景</RouterLink>
            </section>
          </aside>
        </div>

        <nav class="hall-pager">
          <button :disabled="!prevHall" @click="goHall(prevHall?.key)">← {{ prevHall ? prevHall.name : '已是第一厅' }}</button>
          <button :disabled="!nextHall" @click="goHall(nextHall?.key)">{{ nextHall ? nextHall.name : '已是最后一厅' }} →</button>
        </nav>
      </section>
    </div>

    <div v-if="selected" class="modal-overlay museum-overlay" @click.self="selected = null">
      <div class="modal artifact-modal" :style="{ '--era': hallEra.color }">
        <button class="modal-close" @click="selected = null" aria-label="关闭">×</button>
        <header class="am-head">
          <span class="am-emoji">{{ selected.emoji }}</span>
          <div>
            <p class="am-era">{{ hallEra.name }} · {{ selected.yearLabel }}</p>
            <h2 class="am-name">{{ selected.name }}</h2>
            <p class="am-role">{{ selected.role }}</p>
          </div>
        </header>
        <section class="am-block am-context">
          <h4>🎬 原境 · 它当年的场景</h4>
          <p>{{ selected.context }}</p>
        </section>
        <section class="am-block">
          <h4>⛏️ 出土与流传</h4>
          <p>{{ selected.story }}</p>
        </section>
        <p class="am-museum">🏛️ 今藏：{{ selected.museum }}<template v-if="selected.tags && selected.tags.length">　·　{{ selected.tags.join(' · ') }}</template></p>
        <section v-if="relatedPeople.length" class="am-people">
          <h4>🔗 关联人物<span>（摘自历史时间轴）</span></h4>
          <div class="am-people-grid">
            <div v-for="p in relatedPeople" :key="p.name" class="am-person">
              <strong>{{ p.name }}</strong>
              <span v-if="p.life">{{ p.life }}</span>
              <p>{{ p.summary }}</p>
            </div>
          </div>
        </section>
        <footer class="am-actions">
          <RouterLink :to="timelineLink" class="am-link">📜 去时间轴看{{ hallEra.name }}</RouterLink>
          <button class="am-back" @click="selected = null">返回展厅</button>
        </footer>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
// 跨 feature 只读依赖：朝代骨架/朝代色/同期事件与人物来自 chineseHistory，人物生卒摘要来自 personDetails
import { eras } from '../../history-timeline/data/chineseHistory.json'
import personDetails from '../../history-timeline/data/personDetails.json'
import { halls, artifacts } from '../data/artifacts.json'

const PROGRESS_KEY = 'virtual-museum:progress'
const route = useRoute()
const router = useRouter()

function eraOf(key) { return eras.find((e) => e.key === key) }
const hallKeys = Object.keys(halls)
const hallList = hallKeys.map((key) => ({ key, name: eraOf(key)?.name || key }))

const hallKey = ref(hallKeys.includes(route.query.hall) ? route.query.hall : hallKeys[0])
watch(() => route.query.hall, (val) => { if (hallKeys.includes(val)) hallKey.value = val })

const hallEra = computed(() => eraOf(hallKey.value))
const hallData = computed(() => halls[hallKey.value] || { scene: '', greeting: '' })
const hallIndex = computed(() => hallKeys.indexOf(hallKey.value))
const prevHall = computed(() => hallList[hallIndex.value - 1] || null)
const nextHall = computed(() => hallList[hallIndex.value + 1] || null)
const hallArtifacts = computed(() => artifacts.filter((a) => a.eraKey === hallKey.value).sort((a, b) => a.year - b.year))
const sceneGroups = computed(() => {
  const order = []
  const map = new Map()
  for (const a of hallArtifacts.value) {
    if (!map.has(a.scene)) { map.set(a.scene, []); order.push(a.scene) }
    map.get(a.scene).push(a)
  }
  return order.map((scene) => ({ scene, items: map.get(scene) }))
})
const hallEvents = computed(() => [...(hallEra.value.events || [])].sort((a, b) => a.year - b.year))
// 同期人物：优先取该朝人物卡（有生平摘要者靠前），不足再补皇帝
const hallFigures = computed(() => {
  const seen = new Set()
  const figures = []
  for (const g of hallEra.value.groups || []) {
    for (const f of g.figures || []) {
      if (seen.has(f.name)) continue
      seen.add(f.name)
      figures.push({ name: f.name, role: f.role, summary: personDetails[f.name]?.summary || '' })
    }
  }
  figures.sort((a, b) => (b.summary ? 1 : 0) - (a.summary ? 1 : 0))
  let picked = figures.slice(0, 12)
  if (picked.length < 6) {
    for (const g of hallEra.value.groups || []) {
      if (picked.length >= 10) break
      if (!g.ruler || seen.has(g.ruler)) continue
      seen.add(g.ruler)
      picked = [...picked, { name: g.ruler, role: g.rulerTitle || '', summary: personDetails[g.ruler]?.summary || '' }]
    }
  }
  return picked
})
const timelineLink = computed(() => ({ path: '/history', hash: `#era-${hallKey.value}` }))

const selected = ref(null)
const relatedPeople = computed(() => ((selected.value && selected.value.relateTo) || [])
  .map((name) => ({ name, ...personDetails[name] }))
  .filter((p) => p.life || p.summary))
function openArtifact(a) {
  selected.value = a
  progress.value = { ...progress.value, seen: { ...progress.value.seen, [a.id]: true } }
  saveProgress()
}

function readProgress() {
  try { return JSON.parse(window.localStorage.getItem(PROGRESS_KEY)) || { stamps: {}, seen: {} } }
  catch { return { stamps: {}, seen: {} } }
}
const progress = ref(readProgress())
function saveProgress() { window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress.value)) }
const isStamped = computed(() => !!progress.value.stamps[hallKey.value])
const stampedCount = computed(() => hallKeys.filter((k) => progress.value.stamps[k]).length)
function stampHall() {
  progress.value = { ...progress.value, stamps: { ...progress.value.stamps, [hallKey.value]: true } }
  saveProgress()
}

function goHall(key) {
  if (!key || key === hallKey.value) return
  router.replace({ query: { ...route.query, hall: key } })
}
watch(hallKey, () => { window.scrollTo({ top: 0, behavior: 'smooth' }) })
function onKey(e) {
  if (e.key === 'Escape' && selected.value) { selected.value = null; return }
  if (selected.value) return
  if (e.key === 'ArrowRight' && nextHall.value) goHall(nextHall.value.key)
  if (e.key === 'ArrowLeft' && prevHall.value) goHall(prevHall.value.key)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

function formatYear(year) { return year < 0 ? `前${Math.abs(year)}年` : `${year}年` }
function rangeText(era) { return `${formatYear(era.start)}—${formatYear(era.end)}` }
function chipTitle(p) {
  const s = (p.summary || '').replace(/…/g, '')
  return s ? `${p.name}：${s.slice(0, 80)}${s.length > 80 ? '…' : ''}` : `${p.name}（${p.role || '人物'}）`
}
</script>

<style scoped>
/* 深色沉浸展厅：整页暖黑底，每厅以朝代色做天光与射灯（朝代色继承自历史时间轴的 era.color） */
.museum{min-height:calc(100vh - 60px);background:#100c0b;color:#efe7da}
.museum-shell{min-height:calc(100vh - 140px);padding:26px 20px 64px;background:radial-gradient(1000px 460px at 50% -120px,color-mix(in srgb,var(--era) 34%,transparent),transparent 72%),linear-gradient(180deg,#181210,#110d0b);transition:background .5s ease}
.museum-head{max-width:1180px;margin:0 auto 14px}
.head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.head-row .back{margin-bottom:0;color:#b7a892}
.stamp-meter{padding:4px 12px;border:1px solid color-mix(in srgb,var(--era) 55%,#4a4038);border-radius:999px;color:#e9dfcf;font-size:12.5px}
.stamp-meter strong{color:var(--era);font-size:14px}
.museum-title{margin:14px 0 6px;font-size:30px;letter-spacing:.02em}
.museum-sub{margin:0;color:#a3968a;font-size:13.5px;line-height:1.7}
/* 编年导航：横排胶囊，吸顶 */
.hall-nav{position:sticky;top:64px;z-index:12;display:flex;gap:8px;overflow-x:auto;padding:10px 2px;margin:0 -2px 8px;background:rgba(17,13,11,.92);backdrop-filter:blur(6px);scrollbar-width:none}
.hall-nav::-webkit-scrollbar{display:none}
.hall-chip{flex:0 0 auto;padding:6px 14px;border:1px solid rgba(233,223,207,.18);border-radius:999px;background:rgba(255,255,255,.04);color:#d8cdbd;font:inherit;font-size:13px;cursor:pointer;transition:all .15s ease}
.hall-chip:hover{border-color:color-mix(in srgb,var(--era) 70%,#fff);color:#fff}
.hall-chip.active{border-color:var(--era);background:color-mix(in srgb,var(--era) 26%,#241c16);color:#fff;font-weight:700;box-shadow:0 0 14px color-mix(in srgb,var(--era) 30%,transparent)}
.chip-stamp{margin-right:5px;font-size:12px}
/* 展厅 */
.hall{max-width:1180px;margin:0 auto}
.hall-hero{padding:34px 18px 26px;text-align:center}
.hall-eyebrow{margin:0;color:#a3968a;font-size:12px;font-weight:800;letter-spacing:.22em}
.hall-name{margin:10px 0 6px;font-size:44px;letter-spacing:.12em;text-shadow:0 0 28px color-mix(in srgb,var(--era) 45%,transparent)}
.hall-scene{margin:0 0 14px;color:var(--era);font-size:15px;font-weight:700;letter-spacing:.08em}
.hall-greeting{max-width:760px;margin:0 auto;color:#cfc4b4;font-size:15.5px;line-height:2}
.stamp-btn{margin-top:18px;padding:8px 22px;border:1px dashed color-mix(in srgb,var(--era) 60%,#6b5f52);border-radius:999px;background:transparent;color:#e9dfcf;font:inherit;font-size:13.5px;cursor:pointer;transition:all .15s ease}
.stamp-btn:hover{background:color-mix(in srgb,var(--era) 18%,transparent)}
.stamp-btn.done{border-style:solid;border-color:color-mix(in srgb,var(--era) 70%,#fff);color:var(--era);font-weight:700}
.hall-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;align-items:start}
/* 场景分区与展柜 */
.scene{margin-bottom:26px}
.scene-name{display:flex;align-items:center;gap:9px;margin:0 0 12px;color:#efe7da;font-size:15px;font-weight:800;letter-spacing:.1em}
.scene-dot{width:9px;height:9px;border-radius:50%;background:var(--era);box-shadow:0 0 10px var(--era)}
.scene-count{margin-left:auto;color:#8d8175;font-size:12px;font-weight:600;letter-spacing:0}
.cases{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px}
.case{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;padding:20px 12px 16px;border:1px solid rgba(233,223,207,.13);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.015));box-shadow:inset 0 1px 0 rgba(255,255,255,.06);color:inherit;cursor:pointer;transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
.case:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--era) 65%,#fff);box-shadow:0 14px 30px rgba(0,0,0,.5),0 0 26px color-mix(in srgb,var(--era) 28%,transparent)}
/* 展品默认半暗，hover/已看时被射灯照亮 */
.case-emoji{font-size:46px;line-height:1;filter:brightness(.62) saturate(.8);transition:filter .18s ease,text-shadow .18s ease}
.case:hover .case-emoji,.case.seen .case-emoji{filter:none;text-shadow:0 0 22px color-mix(in srgb,var(--era) 70%,#fff)}
.case-name{max-width:100%;font-size:14.5px;text-align:center;line-height:1.4}
.case-year{color:var(--era);font-size:11px;font-weight:700}
.case-role{color:#9b8f81;font-size:11.5px;text-align:center;line-height:1.5}
.case.seen::after{content:'✓ 已细看';position:absolute;top:8px;right:8px;padding:1px 7px;border-radius:999px;background:color-mix(in srgb,var(--era) 30%,#241c16);color:#efe7da;font-size:10px;font-weight:700}
/* 侧栏：同期大事与人物 */
.hall-side{position:sticky;top:130px;display:flex;flex-direction:column;gap:14px}
.side-block{padding:16px 16px 14px;border:1px solid rgba(233,223,207,.12);border-radius:14px;background:rgba(255,255,255,.035)}
.side-block h3{margin:0 0 4px;font-size:14.5px;letter-spacing:.06em}
.side-hint{margin:0 0 10px;color:#8d8175;font-size:11.5px}
.event-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;max-height:280px;overflow-y:auto;scrollbar-width:thin}
.event-item{display:flex;gap:8px;align-items:baseline;padding:5px 8px;border-radius:8px;color:inherit;text-decoration:none;transition:background .15s ease}
.event-item:hover{background:color-mix(in srgb,var(--era) 16%,transparent);text-decoration:none}
.event-year{flex:0 0 auto;color:var(--era);font-size:11px;font-weight:800}
.event-name{font-size:12.5px;line-height:1.5}
.people{display:flex;flex-wrap:wrap;gap:7px}
.person-chip{display:inline-flex;flex-direction:column;gap:1px;padding:5px 10px;border:1px solid rgba(233,223,207,.14);border-radius:10px;background:rgba(255,255,255,.04);cursor:help}
.person-chip strong{font-size:12.5px}
.person-chip em{color:#9b8f81;font-size:10.5px;font-style:normal}
.side-more{display:inline-block;margin-top:12px;color:var(--era);font-size:12.5px;font-weight:700;text-decoration:none}
.side-more:hover{text-decoration:underline}
/* 上一厅/下一厅 */
.hall-pager{display:flex;justify-content:space-between;gap:12px;margin-top:8px}
.hall-pager button{min-height:40px;padding:8px 20px;border:1px solid rgba(233,223,207,.16);border-radius:10px;background:rgba(255,255,255,.04);color:#e9dfcf;font:inherit;font-weight:700;cursor:pointer;transition:all .15s ease}
.hall-pager button:hover:not(:disabled){border-color:var(--era);background:color-mix(in srgb,var(--era) 16%,transparent)}
.hall-pager button:disabled{opacity:.35;cursor:default}
/* 文物详情弹窗：全局 .modal-overlay/.modal 骨架 + 深色定制 */
.museum-overlay{z-index:60;overflow-y:auto;padding:32px 16px;align-items:flex-start}
.artifact-modal{position:relative;width:min(92vw,640px);max-height:none;margin:auto;background:#1e1813;border:1px solid rgba(233,223,207,.16);color:#efe7da}
.modal-close{position:absolute;top:10px;right:12px;border:0;background:transparent;color:#a3968a;font-size:26px;cursor:pointer}
.modal-close:hover{color:#fff}
.am-head{display:flex;gap:18px;align-items:center}
.am-emoji{flex:0 0 auto;display:grid;place-items:center;width:92px;height:92px;border:1px solid color-mix(in srgb,var(--era) 45%,#4a4038);border-radius:16px;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--era) 30%,#241c16),#1a1512);font-size:52px;text-shadow:0 0 24px color-mix(in srgb,var(--era) 60%,#fff)}
.am-era{margin:0;color:var(--era);font-size:12.5px;font-weight:800}
.am-name{margin:4px 0 2px;font-size:26px}
.am-role{margin:0;color:#a3968a;font-size:13px}
.am-block h4{margin:0 0 8px;font-size:13px;letter-spacing:.08em}
.am-block p{margin:0;color:#d8cdbd;font-size:14px;line-height:1.95}
.am-context{padding:14px 16px;border-left:3px solid var(--era);border-radius:10px;background:color-mix(in srgb,var(--era) 12%,#241c17)}
.am-museum{margin:0;color:#a3968a;font-size:12.5px}
.am-people h4{margin:0 0 10px;font-size:13px;letter-spacing:.08em}
.am-people h4 span{color:#8d8175;font-weight:600;letter-spacing:0}
.am-people-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.am-person{padding:10px 12px;border:1px solid rgba(233,223,207,.13);border-radius:10px;background:rgba(255,255,255,.035)}
.am-person strong{margin-right:8px;font-size:14px}
.am-person span{color:var(--era);font-size:11.5px;font-weight:700}
.am-person p{margin:6px 0 0;color:#b3a795;font-size:12px;line-height:1.7}
.am-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.am-link{padding:8px 16px;border-radius:9px;background:color-mix(in srgb,var(--era) 30%,#241c16);color:#fff;font-size:13px;font-weight:700;text-decoration:none}
.am-link:hover{text-decoration:none;background:color-mix(in srgb,var(--era) 45%,#241c16)}
.am-back{padding:8px 16px;border:1px solid rgba(233,223,207,.2);border-radius:9px;background:transparent;color:#e9dfcf;font:inherit;font-size:13px;cursor:pointer}
.am-back:hover{border-color:var(--era)}
@media(max-width:960px){
  .hall-body{grid-template-columns:1fr}
  .hall-side{position:static}
  .hall-nav{top:0}
}
@media(max-width:760px){
  .hall-name{font-size:34px}
  .hall-greeting{font-size:14.5px}
  .cases{grid-template-columns:repeat(2,1fr)}
  .am-head{flex-direction:column;text-align:center}
}
</style>
