<template>
  <main class="china-page">
    <header class="china-header">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <label class="history-picker">历史 <select v-model="scope" @change="switchScope"><option value="中国">中国历史</option><option v-for="item in worldRegions" :key="item" :value="item">{{ item }}</option></select></label>
      <div class="title-row"><div><p class="eyebrow">资料来源：你的历史目录与「历史.md」</p><h1>历史 · 中国</h1><p class="intro">皇帝卡居中突出，大臣以 2–3 列并排展示；点击卡片查看详情。</p></div><button class="add-button" @click="formOpen = !formOpen">{{ formOpen ? '收起添加' : '添加人物' }}</button></div>
      <form v-if="formOpen" class="add-form" @submit.prevent="addPerson"><label>姓名<input v-model.trim="draft.name" required /></label><label>归属时期<select v-model="draft.eraKey"><option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }}</option></select></label><label>年份<input v-model.number="draft.year" type="number" required /></label><label>身份<input v-model.trim="draft.role" placeholder="如：大臣" /></label><label class="note-field">简评<textarea v-model.trim="draft.note" rows="2" /></label><button class="submit-button" type="submit">保存到本机</button><p v-if="formMessage" class="form-message">{{ formMessage }}</p></form>
      <div class="toolbar"><label>快速跳转 <select v-model="activeEraKey" @change="jumpToEra(activeEraKey)"><option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }} · {{ rangeText(era) }}</option></select></label><span>自动记住上次浏览时期</span><input v-model.trim="query" type="search" placeholder="搜索皇帝、人物或事件" /></div>
    </header>
    <section class="timeline" aria-label="中国历史时间轴"><div class="timeline-axis"></div>
      <template v-for="item in visibleItems" :key="item.id">
        <article v-if="item.type === 'event'" :id="item.anchor || undefined" class="timeline-item event">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <button class="person-card event-card" :style="{ '--era': item.era.color }" @click="selected = item">
            <span class="person-region">{{ item.era.name }} · 历史事件</span>
            <strong>{{ item.name }}</strong>
            <span class="person-role">历史事件</span>
            <span v-if="item.note" class="person-note">{{ item.note }}</span>
          </button>
        </article>
        <article v-else :id="item.anchor || undefined" class="timeline-item group" :class="item.side">
          <div class="year"><span>{{ formatYear(item.year) }}</span><i></i></div>
          <div class="group-block">
            <button v-if="item.ruler" class="person-card ruler-card" :style="{ '--era': item.era.color }" :id="item.ruler.id" @click="selected = item.ruler">
              <span class="person-region">{{ item.era.name }} · {{ item.group.label }}</span>
              <strong><span class="crown">👑</span>{{ item.ruler.name }}</strong>
              <span v-if="item.ruler.alias" class="ruler-alias">{{ item.ruler.alias }}</span>
              <span v-if="reignText(item.ruler)" class="person-role">在位 {{ reignText(item.ruler) }}</span>
              <span v-if="reactionFor(item.ruler.name)" class="reaction-badge" :class="reactionFor(item.ruler.name)" role="button" tabindex="0" @click.stop="toggleReaction(item.ruler.name, reactionFor(item.ruler.name))">{{ reactionFor(item.ruler.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
            </button>
            <div v-if="item.figures.length" class="figure-cards">
              <button v-for="person in item.figures" :key="person.id" class="person-card minister-card" :style="{ '--era': item.era.color }" :id="person.id" @click="selected = person">
                <span class="person-region">{{ item.era.name }} · {{ item.group.ruler || item.group.label }}</span>
                <strong>{{ person.name }}</strong>
                <span class="person-role">{{ person.role }}</span>
                <span v-if="person.life" class="person-life">生卒 {{ person.life }}</span>
                <span v-if="person.custom" class="custom-tag">自添</span>
                <span v-if="reactionFor(person.name)" class="reaction-badge" :class="reactionFor(person.name)" role="button" tabindex="0" @click.stop="toggleReaction(person.name, reactionFor(person.name))">{{ reactionFor(person.name) === 'like' ? '♥ 喜欢' : '✕ 讨厌' }}</span>
              </button>
            </div>
          </div>
        </article>
      </template>
      <p v-if="!visibleItems.length" class="empty">没有找到匹配内容。</p>
    </section>
    <div class="jump-fab">
      <select class="fab-era" v-model="activeEraKey" @change="jumpToEra(activeEraKey)" aria-label="选择朝代跳转">
        <option v-for="era in eras" :key="era.key" :value="era.key">{{ era.name }}</option>
      </select>
      <select class="fab-ruler" v-model="fabRulerId" @change="jumpToRuler(fabRulerId)" :disabled="!fabRulers.length" aria-label="选择皇帝跳转（二级）">
        <option value="">选择皇帝…</option>
        <option v-for="r in fabRulers" :key="r.id" :value="r.id">{{ r.name }}</option>
      </select>
      <input class="fab-search" list="personJumpList" v-model="personQuery" @change="jumpToPerson(personQuery)" placeholder="搜索历史人物…" aria-label="搜索并跳转历史人物" />
      <datalist id="personJumpList"><option v-for="p in personIndex" :key="p.id" :value="p.name"></option></datalist>
      <button class="fab-top" @click="scrollTop" aria-label="回到顶部选择朝代">Top ↑</button>
    </div>
    <div v-if="selected" class="detail-backdrop" @click="selected = null"></div>
    <aside v-if="selected" class="detail" :style="{ '--era': selected.era.color }"><button class="close" @click="selected = null">×</button><p class="detail-region">{{ selected.era.name }} · {{ formatYear(selected.year) }}</p><h2>{{ selected.isRuler ? '👑 ' : '' }}{{ selected.name }}</h2><p v-if="selected.alias" class="detail-alias">{{ selected.alias }}</p><p class="detail-role">{{ selected.isRuler ? reignText(selected) : selected.role }}</p><dl v-if="selected.life" class="detail-meta"><div><dt>生卒</dt><dd>{{ selected.life }}</dd></div></dl><p class="detail-note">{{ selected.note || '未填写简评。' }}</p><div v-if="selected.type !== 'event'" class="reaction-actions"><button :class="{ active: reactionFor(selected.name) === 'like' }" @click="toggleReaction(selected.name, 'like')">喜欢</button><button :class="{ active: reactionFor(selected.name) === 'dislike' }" @click="toggleReaction(selected.name, 'dislike')">讨厌</button></div><button v-if="selected.custom" class="delete-button" @click="removePerson(selected.id)">删除此自添人物</button></aside>
  </main>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { eras } from '../data/chineseHistory.json'
import personDetails from '../data/personDetails.json'
import { items as worldItems } from '../data/worldHistory.json'

const ERA_KEY = 'history-timeline:last-era'
const REACTION_KEY = 'history-timeline:person-reactions'
const CUSTOM_KEY = 'history-timeline:custom-people'
const router = useRouter()
const scope = ref('中国')
const activeEraKey = ref(window.localStorage.getItem(ERA_KEY) || eras[0]?.key)
const query = ref('')
const personQuery = ref('')
const fabRulerId = ref('')
const selected = ref(null)
const formOpen = ref(false)
const formMessage = ref('')
const draft = ref({ name: '', eraKey: 'dangdai', year: 2026, role: '', note: '' })
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
const allItems = computed(() => timelineEras.value.flatMap((era, eraIndex) => {
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
          reignStart: group.start,
          reignEnd: group.end,
          year: group.start,
          era,
          group,
          isRuler: true
        }
      : null
    const figures = group.figures.map((figure, fi) => ({
      id: `${era.key}-${gi}-f-${fi}`,
      type: 'figure',
      name: figure.name,
      role: figure.role,
      note: description(figure.name, figure.note),
      life: personDetails[figure.name]?.life || figure.life,
      year: figure.year ?? group.start,
      era,
      group,
      custom: figure.custom
    }))
    return {
      id: `${era.key}-${gi}`,
      type: 'group',
      year: group.start,
      era,
      group,
      side,
      ruler,
      figures,
      anchor: gi === 0 ? `era-${era.key}` : null
    }
  })
  const eventItems = (era.events || []).map((event, ei) => ({ id: `${era.key}-e-${ei}`, type: 'event', name: event.name, role: '历史事件', note: event.note, year: event.year, era }))
  return [...groupItems, ...eventItems]
}).sort((a, b) => a.year - b.year || (a.type === 'event' ? -1 : 1)))
const visibleItems = computed(() => {
  const text = query.value.toLowerCase()
  if (!text) return allItems.value
  return allItems.value.filter((item) => {
    if (item.type === 'event') {
      return [item.name, item.role, item.note, item.era.name].filter(Boolean).join(' ').toLowerCase().includes(text)
    }
    const hay = [
      item.era.name,
      item.group?.label,
      item.ruler?.name,
      item.ruler?.role,
      item.ruler?.note,
      ...item.figures.flatMap((f) => [f.name, f.role, f.note])
    ].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(text)
  })
})
function formatYear(year) { return year < 0 ? `前${Math.abs(year)}年` : `${year}年` }
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
function rulerAlias(group) {
  const name = group.ruler
  const title = group.rulerTitle
  if (!title || title === name) return ''
  if (title.includes('·')) return title.split('·').pop().trim()
  return title
}
function rangeText(era) { return `${formatYear(era.start)}—${era.key === 'dangdai' ? '今' : formatYear(era.end)}` }
function switchScope() { if (scope.value !== '中国') router.push({ path: '/world-history', query: { region: scope.value } }) }
function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }
const personMap = computed(() => {
  const map = new Map()
  for (const item of allItems.value) {
    if (item.type === 'event') continue
    if (item.ruler) map.set(item.ruler.id, item.ruler)
    for (const f of item.figures) map.set(f.id, f)
  }
  return map
})
const personIndex = computed(() => [...personMap.value.values()].map((p) => ({ id: p.id, name: p.name })))
const fabRulers = computed(() => {
  const era = timelineEras.value.find((e) => e.key === activeEraKey.value)
  if (!era) return []
  const list = []
  era.groups.forEach((g, gi) => { if (g.ruler) list.push({ id: `${era.key}-${gi}-r`, name: g.ruler }) })
  return list
})
function jumpToEra(key) {
  query.value = ''
  personQuery.value = ''
  fabRulerId.value = ''
  window.localStorage.setItem(ERA_KEY, key)
  nextTick(() => { document.getElementById(`era-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
}
function jumpToRuler(id) {
  if (!id) return
  query.value = ''
  personQuery.value = ''
  nextTick(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('flash')
    setTimeout(() => el.classList.remove('flash'), 1500)
  })
}
function jumpToPerson(name) {
  const entry = personIndex.value.find((p) => p.name === name)
  if (!entry) { personQuery.value = ''; return }
  query.value = ''
  nextTick(() => {
    const el = document.getElementById(entry.id)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1500) }
  })
  personQuery.value = ''
}
function reactionFor(name) { return reactions.value[name] || '' }
function toggleReaction(name, value) { const next = { ...reactions.value }; if (next[name] === value) delete next[name]; else next[name] = value; reactions.value = next; window.localStorage.setItem(REACTION_KEY, JSON.stringify(next)) }
function addPerson() { if (!draft.value.name || !Number.isFinite(Number(draft.value.year))) { formMessage.value = '请填写姓名和年份。'; return }; customPeople.value = [...customPeople.value, { ...draft.value, id: `custom-${Date.now()}`, year: Number(draft.value.year) }]; window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPeople.value)); formMessage.value = `已保存「${draft.value.name}」。`; draft.value = { name: '', eraKey: draft.value.eraKey, year: draft.value.year, role: '', note: '' } }
function removePerson(id) { customPeople.value = customPeople.value.filter((item) => item.id !== id); window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(customPeople.value)); selected.value = null }
watch(activeEraKey, (key) => window.localStorage.setItem(ERA_KEY, key))
</script>

<style scoped>
/* 保持中国与国外时间轴使用相同的卡片式中轴视觉语言。 */
.china-page{max-width:1220px;margin:0 auto;padding:28px 20px 56px}
.back{color:var(--color-primary);font-size:14px}
.history-picker{display:inline-flex;gap:7px;align-items:center;margin-left:14px;color:var(--color-primary);font-size:13px;font-weight:700}
.history-picker select,.toolbar select{border:1px solid var(--color-border);border-radius:7px;padding:5px 8px;color:var(--color-text);background:var(--color-card);font:inherit}
.title-row{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-top:12px}
.eyebrow{margin:0 0 4px;color:var(--color-muted);font-size:12px}
h1{margin:0;font-size:32px;letter-spacing:.04em}
.intro{margin:8px 0 0;color:var(--color-muted)}
.add-button,.submit-button,.delete-button{min-height:42px;border:0;border-radius:9px;padding:9px 16px;color:#fff;background:var(--color-primary);font:inherit;font-weight:700;cursor:pointer}
.add-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:20px;padding:16px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-card)}
.add-form label{display:grid;gap:5px;color:var(--color-muted);font-size:12px;font-weight:700}
.add-form input,.add-form select,.add-form textarea,.toolbar input{width:100%;box-sizing:border-box;border:1px solid var(--color-border);border-radius:7px;padding:8px;background:var(--color-bg);color:var(--color-text);font:inherit}
.note-field{grid-column:span 2}
.form-message{align-self:center;margin:0;color:#247348}
.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:18px;color:var(--color-muted);font-size:13px}
.toolbar label{display:inline-flex;align-items:center;gap:7px;font-weight:700}
.toolbar input{width:min(280px,100%)}
.timeline{position:relative;margin:28px auto 0;padding:12px 0}
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
/* 大臣：并排 2–3 列，缩小卡片 */
.figure-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;width:100%;max-width:430px}
.minister-card{padding:10px 12px}
.minister-card strong{font-size:15px}
/* 历史事件：固定在中轴年份处 */
.timeline-item.event{width:100%;margin:0;padding:0 50% 22px;min-height:84px;text-align:center}
.timeline-item.event .person-card{width:220px;transform:translateX(-50%);border-style:dashed;background:#fff9e8;text-align:center}
.timeline-item.event .year{top:-7px;left:50%;transform:translateX(-50%)}
.timeline-item.event .year i{display:none}
.empty{position:relative;text-align:center;color:var(--color-muted)}
.jump-fab{position:fixed;right:18px;bottom:18px;z-index:15;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;align-items:center;padding:8px 10px;max-width:min(580px,calc(100vw - 24px));border:1px solid var(--color-border);border-radius:22px;background:var(--color-card);box-shadow:0 8px 24px rgba(19,25,38,.18)}
.jump-fab select{border:1px solid var(--color-border);border-radius:7px;padding:5px 8px;background:var(--color-bg);color:var(--color-text);font:inherit;max-width:120px}
.jump-fab .fab-ruler{max-width:130px}
.jump-fab button{min-height:34px;border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:700;color:#fff;background:var(--color-primary);cursor:pointer}
.jump-fab .fab-search{border:1px solid var(--color-border);border-radius:7px;padding:6px 10px;background:var(--color-bg);color:var(--color-text);font:inherit;width:148px}
.jump-fab .fab-search::placeholder{color:var(--color-muted)}
.jump-fab .fab-top{background:#2c3e68}
.jump-fab .fab-era{border:1px solid var(--color-border);border-radius:7px;padding:6px 8px;background:var(--color-bg);color:var(--color-text);font:inherit;max-width:120px}
.jump-fab .fab-search{width:160px}
@keyframes flashHighlight{0%{box-shadow:0 0 0 4px var(--era)}100%{box-shadow:0 4px 12px rgba(35,48,76,.08)}}
.person-card.flash{animation:flashHighlight 1.5s ease-out}
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
.delete-button{margin-top:16px;background:#9f3a36}
@media(max-width:760px){
  .title-row{align-items:start;flex-direction:column}
  .add-form{grid-template-columns:1fr}
  .note-field{grid-column:auto}
  .toolbar{flex-direction:column;align-items:flex-start}
  .timeline-axis{left:22px}
  .timeline-item,.timeline-item.left,.timeline-item.right{width:100%;margin:0;padding:0 0 18px 52px;text-align:left}
  .group-block{margin:0!important;max-width:100%;align-items:stretch!important}
  .left .person-card,.figure-cards,.person-card{width:100%}
  .year,.left .year,.right .year,.timeline-item.event .year{left:0;right:auto;width:auto;transform:none;flex-direction:row}
  .figure-cards{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}
  .detail{top:auto;right:16px;bottom:16px;left:16px;width:auto}
}
</style>
