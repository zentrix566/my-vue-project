<template>
  <main class="china-page">
    <header class="china-header">
      <div class="header-row">
        <RouterLink to="/" class="back">← 返回主页</RouterLink>
        <label class="history-picker">历史
          <select v-model="scope" @change="switchScope"><option value="中国">中国历史</option><option v-for="item in worldRegions" :key="item" :value="item">{{ item }}</option></select>
        </label>
      </div>
      <h1 class="china-title">历史 · 中国</h1>
      <div class="toolbar">
        <label class="toolbar-jump">快速跳转 <select v-model="activeEraKey" @change="jumpToEra(activeEraKey)"><option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }} · {{ rangeText(era) }}</option></select></label>
        <input v-model.trim="query" type="search" placeholder="搜索人物、事件或典故" />
      </div>
    </header>
    <section class="timeline" :class="{ searching: !!query.trim() }" aria-label="中国历史时间轴"><div class="timeline-axis"></div>
      <template v-for="item in visibleItems" :key="item.id">
        <article v-if="item.type === 'event'" :id="item.anchor || item.id" :class="['timeline-item', 'event', { match: itemMatches(item) }]">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <button class="person-card event-card" :style="{ '--era': item.era.color }" @click="selected = item">
            <span class="person-region">{{ item.era.name }} · {{ formatYear(item.year) }}</span>
            <strong>{{ item.name }}</strong>
            <span class="person-role">历史事件</span>
            <span v-if="item.note" class="person-note">{{ item.note }}</span>
          </button>
        </article>
        <article v-else :id="item.anchor || item.id" :class="['timeline-item', 'group', item.side, { match: itemMatches(item) }]">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <div class="group-block">
            <button v-if="item.ruler" class="person-card ruler-card" :style="{ '--era': item.era.color }" :id="item.ruler.id" @click="selected = item.ruler">
              <span class="person-region">{{ item.era.name }} · {{ item.group.label }}</span>
              <strong><span class="crown">👑</span>{{ item.ruler.name }}</strong>
              <span v-if="item.ruler.alias" class="ruler-alias">{{ item.ruler.alias }}</span>
              <span v-if="item.ruler.isLast" class="last-emperor-badge">末帝</span>
              <span v-if="reignText(item.ruler)" class="person-role">在位 {{ reignText(item.ruler) }}<template v-if="reignYears(item.ruler) !== null">（{{ reignYears(item.ruler) > 0 ? reignYears(item.ruler) + '年' : '不足一年' }}）</template></span>
              <span v-if="item.ruler.life" class="person-life">生卒 {{ item.ruler.life }}<template v-if="item.ruler.age"> · 享年{{ item.ruler.age }}岁</template></span>
              <span v-if="reactionFor(item.ruler.name)" class="reaction-badge" :class="reactionFor(item.ruler.name)" role="button" tabindex="0" @click.stop="toggleReaction(item.ruler.name, reactionFor(item.ruler.name))">{{ reactionFor(item.ruler.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
            </button>
            <div v-if="item.allusions.length" class="allusion-block">
              <p class="allusion-title">📖 典故</p>
              <button v-for="allusion in item.allusions" :key="allusion.id" class="allusion-card" :style="{ '--era': item.era.color }" @click="selected = allusion">
                <strong>{{ allusion.name }}</strong>
                <span class="allusion-note">{{ allusion.note }}</span>
              </button>
            </div>
            <div v-if="item.figures.length" class="figure-cards">
              <button v-for="person in item.figures" :key="person.id" class="person-card minister-card" :style="{ '--era': item.era.color }" :id="person.id" @click="selected = person">
                <span class="person-region">{{ item.era.name }} · {{ item.group.ruler || item.group.label }}</span>
                <strong>{{ person.name }}</strong>
                <span class="person-role">{{ person.role }}</span>
                <span v-if="person.life" class="person-life">生卒 {{ person.life }}<template v-if="person.age"> · 享年{{ person.age }}岁</template></span>
                <span v-if="person.custom" class="custom-tag">自添</span>
                <span v-if="reactionFor(person.name)" class="reaction-badge" :class="reactionFor(person.name)" role="button" tabindex="0" @click.stop="toggleReaction(person.name, reactionFor(person.name))">{{ reactionFor(person.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
              </button>
            </div>
          </div>
        </article>
      </template>
    </section>
    <div class="jump-fab">
      <select class="fab-era" v-model="activeEraKey" @change="jumpToEra(activeEraKey)" aria-label="选择朝代跳转">
        <option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }}</option>
      </select>
      <select class="fab-ruler" v-model="fabRulerId" @change="jumpToRuler(fabRulerId)" :disabled="!fabRulers.length" aria-label="选择皇帝跳转（二级）">
        <option value="">选择皇帝…</option>
        <template v-for="r in fabRulers" :key="r.options ? 'g-' + r.regime : r.id">
          <optgroup v-if="r.options" :label="r.regime">
            <option v-for="opt in r.options" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </optgroup>
          <option v-else :value="r.id">{{ r.label }}</option>
        </template>
      </select>
      <input class="fab-search" v-model.trim="query" placeholder="搜索人物、事件、典故…" aria-label="搜索人物、事件或典故" />
      <button class="fab-top" @click="scrollTop" aria-label="回到顶部选择朝代">Top ↑</button>
    </div>
    <div v-if="selected" class="detail-backdrop" @click="selected = null"></div>
    <aside v-if="selected" class="detail" :style="{ '--era': selected.era.color }"><button class="close" @click="selected = null">×</button><p class="detail-region">{{ selected.era.name }} · {{ formatYear(selected.year) }}</p><h2>{{ selected.isRuler ? '👑 ' : '' }}{{ selected.name }}</h2><p v-if="selected.alias" class="detail-alias">{{ selected.alias }}</p><p v-if="selected.isLast" class="last-emperor-badge">末帝</p><p class="detail-role"><template v-if="selected.isRuler">在位 {{ reignText(selected) }}<template v-if="reignYears(selected) !== null">（{{ reignYears(selected) > 0 ? reignYears(selected) + '年' : '不足一年' }}）</template></template><template v-else>{{ selected.role }}</template></p><dl v-if="selected.life" class="detail-meta"><div><dt>生卒</dt><dd>{{ selected.life }}<template v-if="selected.age">（享年{{ selected.age }}岁）</template></dd></div></dl><p class="detail-note">{{ selected.note || '未填写简评。' }}</p><div v-if="selected.isRuler || selected.type === 'figure'" class="reaction-actions"><button :class="{ active: reactionFor(selected.name) === 'like' }" @click="toggleReaction(selected.name, 'like')">喜欢</button><button :class="{ active: reactionFor(selected.name) === 'dislike' }" @click="toggleReaction(selected.name, 'dislike')">讨厌</button></div><button v-if="selected.custom" class="delete-button" @click="removePerson(selected.id)">删除此自添人物</button></aside>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { eras } from '../data/chineseHistory.json'
import personDetails from '../data/personDetails.json'
import { items as worldItems } from '../data/worldHistory.json'

const ERA_KEY = 'history-timeline:last-era'
const REACTION_KEY = 'history-timeline:person-reactions'
const CUSTOM_KEY = 'history-timeline:custom-people'
const router = useRouter()
const route = useRoute()
const scope = ref('中国')
const activeEraKey = ref(window.localStorage.getItem(ERA_KEY) || eras[0]?.key)
const query = ref('')
const fabRulerId = ref('')
const selected = ref(null)
const worldRegions = [...new Set(worldItems.map((item) => item.region))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
function readJson(key, fallback) { try { return JSON.parse(window.localStorage.getItem(key) || '') ?? fallback } catch { return fallback } }
const reactions = ref(readJson(REACTION_KEY, {}))
const customPeople = ref(readJson(CUSTOM_KEY, []).filter((item) => item?.id && item?.name && item?.eraKey))
const timelineEras = computed(() => eras.map((era) => {
  const groups = era.groups.map((group) => ({ ...group, figures: [...group.figures] }))
  customPeople.value.filter((person) => person.eraKey === era.key).forEach((person) => groups.at(-1)?.figures.push({ ...person, custom: true }))
  return { ...era, groups }
}))
function description(name, fallback = '') {
  const summary = personDetails[name]?.summary || ''
  return summary.includes('…') ? fallback : (summary || fallback)
}
// 时间轴上按政权整块排列的朝代（南北朝南北两条线较清晰，保留分块）；
// 东晋十六国、五代十国政权繁多，分块会让时间线来回跳，故改为纯年份排序
const PARALLEL = new Set(['nanbeichao'])
// 右下角皇帝跳转下拉里按政权分组的朝代（即便时间轴按年份排，下拉仍把同朝皇帝聚在一起方便选择）
const REGIME_DROPDOWN = new Set(['shiliuguo', 'nanbeichao', 'wudai'])
const allItems = computed(() => {
  const regimeRank = {}
  for (const era of timelineEras.value) {
    if (!PARALLEL.has(era.key)) continue
    const rank = {}
    for (const g of era.groups) {
      const r = regimeOf(g.label)
      if (rank[r] === undefined || g.start < rank[r]) rank[r] = g.start
    }
    regimeRank[era.key] = rank
  }
  return timelineEras.value.flatMap((era, eraIndex) => {
  const groupItems = era.groups.map((group, gi) => {
    const side = (eraIndex + gi) % 2 ? 'right' : 'left'
    const ruler = group.ruler
      ? {
          id: `${era.key}-${gi}-r`,
          type: 'ruler',
          name: group.ruler,
          role: group.rulerTitle,
          alias: rulerAlias(group),
          note: description(group.ruler, group.blurb),
          life: personDetails[group.ruler]?.life,
          age: lifeAge(personDetails[group.ruler]?.life),
          reignStart: group.start,
          reignEnd: group.end,
          year: group.start,
          era,
          group,
          isRuler: true,
          isLast: group.last === true
        }
      : null
    const figures = group.figures.map((figure, fi) => ({
      id: `${era.key}-${gi}-f-${fi}`,
      type: 'figure',
      name: figure.name,
      role: figure.role,
      note: description(figure.name, figure.note),
      life: personDetails[figure.name]?.life || figure.life,
      age: lifeAge(personDetails[figure.name]?.life || figure.life),
      year: figure.year ?? group.start,
      era,
      group,
      custom: figure.custom
    }))
    const allusions = (group.allusions || []).map((allusion, ai) => ({
      id: `${era.key}-${gi}-a-${ai}`,
      type: 'allusion',
      name: allusion.name,
      role: '典故',
      note: allusion.note,
      year: allusion.year ?? group.start,
      era,
      group
    }))
    return {
      id: `${era.key}-${gi}`,
      type: 'group',
      year: group.start,
      era,
      eraIndex,
      group,
      side,
      ruler,
      figures,
      allusions,
      anchor: gi === 0 ? `era-${era.key}` : null
    }
  })
  const eventItems = (era.events || []).map((event, ei) => ({ id: `${era.key}-e-${ei}`, type: 'event', name: event.name, role: '历史事件', note: event.note, year: event.year, era, eraIndex }))
  return [...groupItems, ...eventItems]
}).sort((a, b) => {
  const pa = PARALLEL.has(a.era.key)
  const pb = PARALLEL.has(b.era.key)
  // 同一多政权朝代内：先按政权块顺序，再组内按即位年。
  // 历史事件项没有 group，不参与政权分块排序，交给下方通用分支按年份/类型处理。
  if (pa && pb && a.eraIndex === b.eraIndex && a.group && b.group) {
    const ra = regimeOf(a.group.label)
    const rb = regimeOf(b.group.label)
    const da = regimeRank[a.era.key][ra] ?? a.year
    const db = regimeRank[b.era.key][rb] ?? b.year
    if (da !== db) return da - db
    if (ra !== rb) return ra.localeCompare(rb, 'zh-CN')
    if (a.year !== b.year) return a.year - b.year
    const ea = a.group?.end ?? a.year
    const eb = b.group?.end ?? b.year
    if (ea !== eb) return ea - eb
    return labelOrder(a.group.label) - labelOrder(b.group.label)
  }
  if (a.year !== b.year) return a.year - b.year
  if (a.eraIndex !== b.eraIndex) return a.eraIndex - b.eraIndex
  if (a.type !== b.type) return a.type === 'event' ? -1 : 1
  const ea = a.group ? (a.group.end ?? a.year) : a.year
  const eb = b.group ? (b.group.end ?? b.year) : b.year
  if (ea !== eb) return ea - eb
  const la = a.group ? labelOrder(a.group.label) : 0
  const lb = b.group ? labelOrder(b.group.label) : 0
  return la - lb
})
})
// 搜索：保留完整时间轴，仅高亮命中项并跳转到首个命中；不再隐藏其余条目
const visibleItems = computed(() => allItems.value)
function itemMatches(item) {
  const text = query.value.trim().toLowerCase()
  if (!text) return false
  if (item.type === 'event') {
    return [item.name, item.role, item.note, item.era.name].filter(Boolean).join(' ').toLowerCase().includes(text)
  }
  const hay = [
    item.era.name,
    item.group?.label,
    item.ruler?.name,
    item.ruler?.role,
    item.ruler?.note,
    ...item.figures.flatMap((f) => [f.name, f.role, f.note]),
    ...(item.allusions || []).flatMap((a) => [a.name, a.role, a.note])
  ].filter(Boolean).join(' ').toLowerCase()
  return hay.includes(text)
}
function formatYear(year) { return year < 0 ? `前${Math.abs(year)}年` : `${year}年` }
// 从“生卒”文本中解析出享年（周岁，粗略按年差计算）。兼容：前/公元、约、又作、同日多版本（用 / 分隔）、年份缺失（？）。
const LIFE_SEP = /[—–－~～-]/
function parseLifeYear(raw) {
  if (!raw) return null
  const text = String(raw).split('/')[0].trim()
  if (!text || text.includes('？')) return null
  let s = text
  if (s.includes('约')) s = s.replace(/约/g, '')
  let bce = false
  if (s.includes('公元前')) { bce = true; s = s.replace('公元前', '') }
  else if (s.includes('前')) { bce = true; s = s.replace('前', '') }
  else if (s.includes('公元')) { s = s.replace('公元', '') }
  const m = s.match(/(\d+)年/)
  if (!m) return null
  let year = parseInt(m[1], 10)
  if (bce) year = -year
  return year
}
function lifeAge(life) {
  if (!life) return null
  const parts = String(life).split(LIFE_SEP)
  if (parts.length < 2) return null
  const birth = parseLifeYear(parts[0])
  const death = parseLifeYear(parts[1])
  if (birth == null || death == null) return null
  const age = (birth < 0) !== (death < 0) ? Math.abs(birth) + Math.abs(death) - 1 : death - birth
  return age > 0 ? age : null
}
function reignText(ruler) {
  if (!ruler) return ''
  const s = ruler.reignStart, e = ruler.reignEnd
  if (s == null && e == null) return ''
  const start = s != null ? formatYear(s) : ''
  const end = e != null ? formatYear(e) : ''
  if (start && end) return `${start}—${end}`
  if (start) return `${start}起`
  return `${end}止`
}
function reignYears(ruler) {
  if (!ruler || ruler.reignStart == null || ruler.reignEnd == null) return null
  const s = ruler.reignStart, e = ruler.reignEnd
  let years
  if ((s < 0) !== (e < 0)) years = Math.abs(s) + e - 1
  else if (s < 0) years = Math.abs(s) - Math.abs(e)
  else years = e - s
  return years > 0 ? years : 0
}
function rulerAlias(group) {
  const name = group.ruler
  const title = group.rulerTitle
  if (!title || title === name) return ''
  if (title.includes('·')) return title.split('·').pop().trim()
  return title
}
// 帝王下拉显示用：优先年号（明/清最常用），无年号时用庙号/谥号-本名；名字太长时只用主名
function rulerOptionLabel(ruler, title, reign) {
  if (!ruler) return ''
  const alias = (() => {
    if (!title || title === ruler) return ''
    if (title.includes('·')) return title.split('·').pop().trim()
    return title
  })()
  const isTitle = (n) => /[帝祖宗王公侯皇汗伯主]$/.test(n)
  // 取本名：ruler 与 title 中不是庙号/谥号的那一个
  const personalOf = () => {
    if (!alias) return ruler
    const rulerIsTitle = isTitle(ruler)
    const aliasIsTitle = isTitle(alias)
    if (rulerIsTitle && !aliasIsTitle) return alias
    if (!rulerIsTitle && aliasIsTitle) return ruler
    return ruler
  }
  let titleName, personalName
  if (reign) {
    // 有年号（如 崇祯）：年号(+帝) 作为主名，本名作为副名，与清代「康熙帝-玄烨」风格一致
    titleName = reign.endsWith('帝') ? reign : reign + '帝'
    personalName = personalOf()
  } else {
    if (!alias) return ruler
    const rulerIsTitle = isTitle(ruler)
    const aliasIsTitle = isTitle(alias)
    if (rulerIsTitle && !aliasIsTitle) { titleName = ruler; personalName = alias }
    else if (!rulerIsTitle && aliasIsTitle) { titleName = alias; personalName = ruler }
    else return `${ruler}（${alias}）` // 两边都是庙号/都是本名 → 括号展示
  }
  // 长名缩写：本名 > 4 字时只用主名（年号/庙号）
  if (personalName.length > 4) return titleName
  return `${titleName}-${personalName}`
}
function labelOrder(label) {
  const m = String(label || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}
// 从 group label 提取政权前缀（如 "后梁1"→"后梁"、"北魏1"→"北魏"、"武周"→"武周"）
function regimeOf(label) {
  return String(label || '').replace(/\d+$/, '')
}
function rangeText(era) { return `${formatYear(era.start)}—${era.key === 'dangdai' ? '今' : formatYear(era.end)}` }
function switchScope() { if (scope.value !== '中国') router.push({ path: '/world-history', query: { region: scope.value } }) }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
const fabRulers = computed(() => {
  const era = timelineEras.value.find((e) => e.key === activeEraKey.value)
  if (!era) return []
  const entries = era.groups
    .map((g, gi) => ({ g, gi }))
    .filter(({ g }) => g.ruler)
    .sort((x, y) => (x.g.start - y.g.start) || (labelOrder(x.g.label) - labelOrder(y.g.label)) || (x.gi - y.gi))
    .map(({ g, gi }) => ({ id: `${era.key}-${gi}-r`, label: rulerOptionLabel(g.ruler, g.rulerTitle, g.reign), regime: regimeOf(g.label), start: g.start }))
  // 多政权朝代按政权分组，下拉里用 <optgroup> 把同朝皇帝聚在一起；其余朝代保持扁平列表
  if (!REGIME_DROPDOWN.has(era.key)) {
    return entries.map(({ id, label }) => ({ id, label }))
  }
  const groups = []
  const byRegime = new Map()
  for (const entry of entries) {
    if (!byRegime.has(entry.regime)) { const arr = []; byRegime.set(entry.regime, arr); groups.push({ regime: entry.regime, options: arr }) }
    byRegime.get(entry.regime).push({ id: entry.id, label: entry.label })
  }
  // 政权排序：若 era 定义了 regimeOrder（如五代十国先列五代后列十国），按该顺序；
  // 否则按各自最早皇帝即位年排序，与时间轴顺序一致
  if (Array.isArray(era.regimeOrder)) {
    const orderIndex = new Map(era.regimeOrder.map((r, i) => [r, i]))
    return groups.sort((a, b) => {
      const ai = orderIndex.has(a.regime) ? orderIndex.get(a.regime) : 999
      const bi = orderIndex.has(b.regime) ? orderIndex.get(b.regime) : 999
      return (ai - bi) || a.regime.localeCompare(b.regime, 'zh-CN')
    })
  }
  const regimeStart = {}
  for (const g of era.groups) {
    const r = regimeOf(g.label)
    if (regimeStart[r] === undefined || g.start < regimeStart[r]) regimeStart[r] = g.start
  }
  return groups.sort((a, b) => (regimeStart[a.regime] - regimeStart[b.regime]) || a.regime.localeCompare(b.regime, 'zh-CN'))
})
function jumpToEra(key) {
  query.value = ''
  fabRulerId.value = ''
  window.localStorage.setItem(ERA_KEY, key)
  nextTick(() => { document.getElementById(`era-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
}
function jumpToRuler(id) {
  if (!id) return
  query.value = ''
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('flash')
    setTimeout(() => el.classList.remove('flash'), 1500)
  })
}
// 深链：从其它页面带 #era-<key> 进入时自动定位到对应朝代（如虚拟博物馆的「去时间轴看这个朝代」）
onMounted(() => {
  const m = route.hash.match(/^#era-([a-z0-9-]+)$/i)
  if (!m || !eras.some((e) => e.key === m[1])) return
  activeEraKey.value = m[1]
  setTimeout(() => jumpToEra(m[1]), 80)
})
function reactionFor(name) { return reactions.value[name] || '' }
function toggleReaction(name, value) { const next = { ...reactions.value }; if (next[name] === value) delete next[name]; else next[name] = value; reactions.value = next; window.localStorage.setItem(REACTION_KEY, JSON.stringify(next)) }
function removePerson(id) { customPeople.value = customPeople.value.filter((item) => item.id !== id); window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPeople.value)); selected.value = null }
watch(activeEraKey, (key) => window.localStorage.setItem(ERA_KEY, key))
// 搜索时跳转到首个命中项（保留完整时间轴，便于上下浏览上下文），输入过程中防抖避免频繁滚动
let searchTimer
watch(query, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const text = query.value.trim().toLowerCase()
    if (!text) return
    const first = allItems.value.find(itemMatches)
    if (!first) return
    nextTick(() => {
      const el = document.getElementById(first.id) || (first.anchor && document.getElementById(first.anchor))
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('flash')
      setTimeout(() => el.classList.remove('flash'), 1500)
    })
  }, 250)
})
</script>

<style scoped>
/* 保持中国与国外时间轴使用相同的卡片式中轴视觉语言。 */
.china-page{max-width:1220px;margin:0 auto;padding:28px 20px 56px}
/* 顶部：返回/历史选择一行，标题，工具栏一行 */
.china-header{margin-bottom:8px}
.header-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.header-row .back{margin-bottom:0}
.back:hover{text-decoration:underline}
.history-picker{display:inline-flex;gap:7px;align-items:center;color:var(--color-muted);font-size:13px;font-weight:700;white-space:nowrap}
.history-picker select{border:1px solid var(--color-border);border-radius:7px;padding:5px 8px;color:var(--color-text);background:var(--color-card);font:inherit}
.china-title{margin:14px 0 12px;font-size:30px;letter-spacing:.02em}
.toolbar{display:flex;flex-wrap:nowrap;align-items:center;gap:10px}
.toolbar-jump{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--color-muted);white-space:nowrap;flex:0 0 auto}
.toolbar-jump select{min-width:180px;max-width:46vw;border:1px solid var(--color-border);border-radius:7px;padding:6px 8px;color:var(--color-text);background:var(--color-card);font:inherit}
.toolbar input{flex:1 1 auto;min-width:0;box-sizing:border-box;border:1px solid var(--color-border);border-radius:7px;padding:7px 10px;background:var(--color-card);color:var(--color-text);font:inherit}
.delete-button{min-height:38px;margin-top:16px;border:0;border-radius:9px;padding:8px 16px;color:#fff;background:#9f3a36;font:inherit;font-weight:700;cursor:pointer}
.timeline{position:relative;margin:24px auto 0;padding:12px 0}
.timeline-axis{position:absolute;top:0;bottom:0;left:50%;width:3px;transform:translateX(-50%);background:linear-gradient(#40679c,#a88647)}
.timeline-item{position:relative;width:50%;box-sizing:border-box;padding-bottom:22px}
.timeline-item.left{margin-right:50%;padding-left:24px;padding-right:84px}
.timeline-item.right{margin-left:50%;padding-left:84px;padding-right:24px}
.group-block{display:flex;flex-direction:column;gap:10px;max-width:430px}
.timeline-item.left .group-block{margin-left:auto;align-items:flex-end}
.timeline-item.right .group-block{margin-right:auto;align-items:flex-start}
.year{position:absolute;top:17px;display:flex;width:120px;flex-direction:column;align-items:center;gap:4px;color:#655b48;font-size:12px;font-weight:800;white-space:nowrap}
.left .year{right:-60px}
.right .year{left:-60px}
.year span{z-index:1;padding:2px 5px;border-radius:4px;background:var(--color-bg)}
.year i{width:13px;height:13px;border:3px solid #fbf8f0;border-radius:50%;background:#40679c;box-shadow:0 0 0 2px #40679c}
.person-card{position:relative;width:min(100%,430px);padding:13px 16px;border:1px solid color-mix(in srgb,var(--era) 55%,#fff);border-radius:12px;background:var(--color-card);color:var(--color-text);box-shadow:0 4px 12px rgba(35,48,76,.08);cursor:pointer;text-align:left}
.person-card strong,.person-card span{display:block}
.person-card strong{font-size:17px}
.person-region{color:var(--era);font-size:11px;font-weight:800}
.person-role{margin-top:2px;color:var(--color-muted);font-size:12px}
.person-life{margin-top:6px;color:#655b48;font-size:12px}
.person-note{margin-top:6px;color:var(--color-muted);font-size:12px;line-height:1.5}
.custom-tag{position:absolute;top:10px;left:10px;padding:2px 5px;border-radius:5px;background:#e2eefc;color:#245785;font-size:10px}
.person-card .reaction-badge{position:absolute;top:9px;right:10px;display:inline-block;padding:2px 7px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;user-select:none}
.reaction-badge.like{background:#fde3e1;color:#c0392b}
.reaction-badge.dislike{background:#e8eaed;color:#5b6470}
/* 皇帝卡：明显区别于大臣，突出居中 */
.ruler-card{border:2px solid var(--era);background:linear-gradient(180deg,color-mix(in srgb,var(--era) 14%,#fff),var(--color-card));box-shadow:0 6px 16px color-mix(in srgb,var(--era) 22%,transparent)}
.ruler-card strong{font-size:20px}
.ruler-card .crown{margin-right:4px}
.ruler-alias{margin-top:2px;color:var(--era);font-size:13px;font-weight:700}
/* 末帝徽章：标记该朝最后一位皇帝 */
.last-emperor-badge{display:inline-block;margin-top:4px;padding:1px 8px;border-radius:999px;background:#2c3e68;color:#fff;font-size:11px;font-weight:800;letter-spacing:.06em;width:fit-content}
.detail .last-emperor-badge{display:inline-block;margin:0 0 8px;padding:2px 10px;font-size:12px}
/* 大臣：并排 2–3 列，缩小卡片 */
.figure-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;width:100%;max-width:430px}
.minister-card{padding:10px 12px}
.minister-card strong{font-size:15px}
/* 典故栏：紧贴皇帝卡下方，区别于事件轨道与大臣卡 */
.allusion-block{display:flex;flex-direction:column;gap:8px;width:100%}
.allusion-title{margin:0;color:var(--era);font-size:12px;font-weight:800;letter-spacing:.08em}
.allusion-card{width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid color-mix(in srgb,var(--era) 35%,#fff);border-left:3px solid var(--era);border-radius:10px;background:color-mix(in srgb,var(--era) 7%,#fff);color:var(--color-text);box-shadow:0 2px 8px rgba(35,48,76,.06);cursor:pointer;text-align:left}
.allusion-card strong{display:block;font-size:15px;color:var(--era)}
.allusion-note{display:block;margin-top:4px;color:var(--color-muted);font-size:12.5px;line-height:1.6}
.allusion-card:hover{border-color:var(--era);background:color-mix(in srgb,var(--era) 12%,#fff)}
/* 历史事件：固定在中轴年份处 */
.timeline-item.event{width:100%;margin:0;padding:0 50% 22px;min-height:84px;text-align:center}
.timeline-item.event .person-card{width:220px;transform:translateX(-50%);border-style:dashed;background:#fff9e8;text-align:center}
.timeline-item.event .year{top:-7px;left:50%;transform:translateX(-50%)}
.timeline-item.event .year i{display:none}
.empty{position:relative;text-align:center;color:var(--color-muted)}
.jump-fab{position:fixed;right:18px;bottom:18px;z-index:15;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;padding:8px 10px;width:min(560px,calc(100vw - 24px));border:1px solid var(--color-border);border-radius:22px;background:var(--color-card);box-shadow:0 8px 24px rgba(19,25,38,.18)}
.jump-fab select{border:1px solid var(--color-border);border-radius:7px;padding:5px 8px;background:var(--color-bg);color:var(--color-text);font:inherit;max-width:120px}
.jump-fab .fab-ruler{max-width:130px}
.jump-fab button{min-height:34px;border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:700;color:#fff;background:var(--color-primary);cursor:pointer}
.jump-fab .fab-search{border:1px solid var(--color-border);border-radius:7px;padding:6px 10px;background:var(--color-bg);color:var(--color-text);font:inherit;flex:1 1 160px;min-width:140px;width:auto}
.jump-fab .fab-search::placeholder{color:var(--color-muted)}
.jump-fab .fab-top{background:#2c3e68}
.jump-fab .fab-era{border:1px solid var(--color-border);border-radius:7px;padding:6px 8px;background:var(--color-bg);color:var(--color-text);font:inherit;max-width:120px}
@keyframes flashHighlight{0%{box-shadow:0 0 0 4px var(--era)}100%{box-shadow:0 4px 12px rgba(35,48,76,.08)}}
.person-card.flash{animation:flashHighlight 1.5s ease-out}
/* 搜索时：命中项高亮描边，非命中项轻微变淡但保留可见，便于上下浏览上下文 */
.timeline.searching .timeline-item:not(.match){opacity:.38}
.timeline-item.match .person-card{border-color:var(--era);box-shadow:0 0 0 3px color-mix(in srgb,var(--era) 55%,transparent),0 6px 16px rgba(35,48,76,.18)}
.timeline-item.match.event .year span{background:var(--era);color:#fff;padding:2px 6px;border-radius:4px}
.detail-backdrop{position:fixed;inset:0;z-index:20;background:rgba(19,25,38,.3)}
.detail{position:fixed;top:90px;right:20px;z-index:21;width:min(360px,calc(100vw - 32px));padding:24px;border:1px solid var(--color-border);border-radius:14px;background:var(--color-card);box-shadow:0 18px 48px rgba(0,0,0,.2)}
.close{position:absolute;top:8px;right:10px;border:0;background:transparent;color:var(--color-muted);font-size:24px;cursor:pointer}
.detail-region{margin:0;color:var(--era);font-size:13px;font-weight:800}
.detail h2{margin:6px 0;font-size:26px}
.detail-alias{margin:0 0 12px;color:var(--era);font-size:15px;font-weight:700}
.detail-role{margin:0 0 12px;color:var(--color-muted)}
.detail-meta{margin:0 0 12px;padding:10px;border-radius:8px;background:var(--color-bg)}
.detail-meta div{display:flex;gap:12px}
.detail-meta dt{color:var(--color-muted)}
.detail-meta dd{margin:0;font-weight:700}
.detail-note{line-height:1.7}
.reaction-actions{display:flex;gap:8px;margin-top:16px}
.reaction-actions button{min-height:38px;border:1px solid var(--color-border);border-radius:8px;padding:6px 12px;background:var(--color-bg);cursor:pointer}
.reaction-actions button.active{border-color:var(--era);background:color-mix(in srgb,var(--era) 15%,#fff)}
@media(max-width:760px){
  .china-page{padding-bottom:150px}
  .toolbar{flex-wrap:wrap}
  .toolbar input{flex:1 1 100%}
  .timeline-axis{left:22px}
  .timeline-item,.timeline-item.left,.timeline-item.right{width:100%;margin:0;padding:0 0 18px 52px;text-align:left}
  .group-block{margin:0!important;max-width:100%;align-items:stretch!important}
  .left .person-card,.figure-cards,.person-card{width:100%}
  .year,.left .year,.right .year,.timeline-item.event .year{left:0;right:auto;width:auto;transform:none;flex-direction:row}
  .figure-cards{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
  .detail{top:auto;right:16px;bottom:16px;left:16px;width:auto}
  /* 窄屏浮动栏：两侧贴边、两行排列（两个下拉一行，搜索+Top 一行），避免遮挡正文 */
  .jump-fab{left:12px;right:12px;bottom:12px;width:auto;gap:6px;padding:7px 8px;border-radius:16px}
  .jump-fab select{max-width:none;flex:1 1 calc(50% - 6px);min-width:0}
  .jump-fab .fab-ruler{max-width:none}
  .jump-fab .fab-search{flex:1 1 auto;min-width:0}
  .jump-fab .fab-top{flex:0 0 auto}
}
</style>
