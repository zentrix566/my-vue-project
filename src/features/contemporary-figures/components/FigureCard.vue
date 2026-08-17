<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { fieldLabel } from '../data/figures'
import { ageFrom, daysToNextBirthday } from '../utils/date'
import { useObservations, statusLabel } from '../composables/useObservations'

const props = defineProps({
  figure: { type: Object, required: true }
})

const age = computed(() => ageFrom(props.figure.birthDate))
const toBirthday = computed(() => daysToNextBirthday(props.figure.birthDate))
const record = useObservations().getRecord(props.figure.id)
</script>

<template>
  <RouterLink :to="`/contemporary-figures/${figure.id}`" class="card">
    <div class="card-top">
      <span class="field-tag">{{ fieldLabel(figure.field) }}</span>
      <span class="status-pill" :class="`s-${record.status}`">
        {{ statusLabel(record.status) }}
      </span>
    </div>

    <h3 class="name">
      {{ figure.stageName || figure.name }}
      <span v-if="figure.stageName && figure.stageName !== figure.name" class="real-name">
        （{{ figure.name }}）
      </span>
    </h3>
    <p v-if="figure.group" class="group">{{ figure.group }}</p>

    <div class="meta">
      <span v-if="figure.birthDate">🎂 {{ figure.birthDate }}</span>
      <span v-if="age !== null">· {{ age }} 岁</span>
      <span v-if="toBirthday !== null && toBirthday <= 30" class="soon">
        · {{ toBirthday === 0 ? '今天生日' : toBirthday + ' 天后生日' }}
      </span>
    </div>

    <p class="bio">{{ figure.bio }}</p>

    <div class="card-foot">
      <span>📌 主要事迹 {{ figure.events.length }} 条</span>
      <span v-if="record.notes.length" class="note-count">
        👁 观察 {{ record.notes.length }} 条
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  display: block;
  text-decoration: none;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(31, 37, 51, 0.1);
}
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.field-tag {
  font-size: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  padding: 2px 10px;
  border-radius: 999px;
}
.status-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}
.s-watching {
  background: var(--primary);
}
.s-following {
  background: var(--positive);
}
.s-paused {
  background: var(--muted);
}
.name {
  margin: 4px 0;
  font-size: 17px;
}
.real-name {
  font-size: 13px;
  color: var(--muted);
  font-weight: 400;
}
.group {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--accent);
}
.meta {
  font-size: 13px;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.soon {
  color: var(--accent);
  font-weight: 600;
}
.bio {
  margin: 10px 0;
  font-size: 13px;
  color: #444;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-foot {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  border-top: 1px dashed var(--line);
  padding-top: 10px;
}
.note-count {
  color: var(--primary);
}
</style>
