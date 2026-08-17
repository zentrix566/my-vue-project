<script setup>
import { ref, computed } from 'vue'
import { figures, fields } from '../data/figures'
import { useObservations } from '../composables/useObservations'
import FigureCard from '../components/FigureCard.vue'

const keyword = ref('')
const activeField = ref('all')

const obs = useObservations()

// 统计：已被观察（有记录）的人物数量
const watchedCount = computed(
  () => figures.filter((f) => obs.getRecord(f.id).notes.length > 0).length
)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return figures.filter((f) => {
    if (activeField.value !== 'all' && f.field !== activeField.value) return false
    if (!kw) return true
    const hay = [f.name, f.stageName, f.group, f.bio]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(kw)
  })
})

const fieldCounts = computed(() => {
  const map = { all: figures.length }
  fields.forEach((f) => {
    map[f.key] = figures.filter((x) => x.field === f.key).length
  })
  return map
})
</script>

<template>
  <div class="cf">
    <section>
      <div class="intro">
      <h2>追踪面板</h2>
      <p>
        共收录 <b>{{ figures.length }}</b> 位人物，分布于
        <b>{{ fields.length }}</b> 个领域；其中 <b>{{ watchedCount }}</b> 位已添加观察记录。
        点击人物卡片可查看出生日期、主要事迹，并记录你对该人物的观察。
      </p>
    </div>

    <div class="toolbar">
      <input
        v-model="keyword"
        class="search"
        type="search"
        placeholder="搜索姓名 / 团体 / 简介…"
      />
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeField === 'all' }"
          @click="activeField = 'all'"
        >
          全部 <span class="cnt">{{ fieldCounts.all }}</span>
        </button>
        <button
          v-for="f in fields"
          :key="f.key"
          class="tab"
          :class="{ active: activeField === f.key }"
          @click="activeField = f.key"
        >
          {{ f.label }} <span class="cnt">{{ fieldCounts[f.key] }}</span>
        </button>
      </div>
    </div>

    <p v-if="!filtered.length" class="empty">没有匹配的人物，换个关键词或领域试试。</p>

    <div v-else class="grid">
      <FigureCard v-for="f in filtered" :key="f.id" :figure="f" />
    </div>
    </section>
  </div>
</template>

<style scoped>
.intro h2 {
  margin: 0 0 6px;
  font-size: 20px;
}
.intro p {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 14px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}
.search {
  flex: 1;
  min-width: 220px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 14px;
  background: var(--surface);
  outline: none;
}
.search:focus {
  border-color: var(--primary);
}
.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tab {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 13px;
  transition: all 0.15s ease;
}
.tab:hover {
  border-color: var(--primary);
}
.tab.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.cnt {
  opacity: 0.7;
  font-size: 12px;
}
.empty {
  color: var(--muted);
  text-align: center;
  padding: 40px 0;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
</style>
