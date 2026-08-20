<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { findFigure, fieldLabel } from '../data/figures'
import { ageFrom, daysToNextBirthday, formatDateTime } from '../utils/date'
import {
  useObservations,
  STATUS_OPTIONS,
  MOOD_OPTIONS,
  statusLabel,
  moodLabel
} from '../composables/useObservations'
import '../style.css'

const props = defineProps({
  id: { type: String, required: true }
})

const figure = computed(() => findFigure(props.id))
const age = computed(() => (figure.value ? ageFrom(figure.value.birthDate) : null))
const toBirthday = computed(() =>
  figure.value ? daysToNextBirthday(figure.value.birthDate) : null
)

const obs = useObservations()
const record = computed(() => obs.getRecord(props.id))

// 观察笔记输入
const draft = ref('')
const draftMood = ref('neutral')

function submitNote() {
  if (!draft.value.trim()) return
  obs.addNote(props.id, draft.value, draftMood.value)
  draft.value = ''
  draftMood.value = 'neutral'
}

function setStatus(key) {
  obs.setStatus(props.id, key)
}
</script>

<template>
  <div class="cf">
    <section v-if="figure" class="detail">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <RouterLink to="/contemporary-figures" class="back">← 返回追踪面板</RouterLink>

    <div class="head">
      <div>
        <span class="field-tag">{{ fieldLabel(figure.field) }}</span>
        <h1>
          {{ figure.stageName || figure.name }}
          <span v-if="figure.stageName && figure.stageName !== figure.name" class="real">
            （{{ figure.name }}）
          </span>
        </h1>
        <p v-if="figure.group" class="group">{{ figure.group }}</p>
      </div>
      <div class="status-box">
        <span class="status-label">追踪状态</span>
        <div class="status-btns">
          <button
            v-for="s in STATUS_OPTIONS"
            :key="s.key"
            class="status-btn"
            :class="[`s-${s.key}`, { on: record.status === s.key }]"
            @click="setStatus(s.key)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 基本信息 -->
    <div class="info-grid">
      <div class="info-item">
        <span class="k">出生日期</span>
        <span class="v">{{ figure.birthDate || '—' }}</span>
      </div>
      <div class="info-item">
        <span class="k">当前年龄</span>
        <span class="v">{{ age === null ? '—' : age + ' 岁' }}</span>
      </div>
      <div class="info-item">
        <span class="k">距下次生日</span>
        <span class="v">
          {{
            toBirthday === null
              ? '—'
              : toBirthday === 0
              ? '今天生日 🎉'
              : toBirthday + ' 天'
          }}
        </span>
      </div>
      <div v-if="figure.birthPlace" class="info-item">
        <span class="k">出生地</span>
        <span class="v">{{ figure.birthPlace }}</span>
      </div>
      <div v-if="figure.education" class="info-item">
        <span class="k">学历 / 背景</span>
        <span class="v">{{ figure.education }}</span>
      </div>
    </div>

    <p class="bio">{{ figure.bio }}</p>

    <!-- 主要事迹时间轴 -->
    <h2 class="section-title">📌 主要事迹</h2>
    <ul class="timeline">
      <li v-for="(e, i) in figure.events" :key="i">
        <span class="dot"></span>
        <span class="ev-date">{{ e.date }}</span>
        <span class="ev-text">{{ e.text }}</span>
      </li>
    </ul>

    <!-- 观察面板 -->
    <h2 class="section-title">👁 观察记录（本地保存）</h2>
    <div class="observe">
      <div class="note-input">
        <textarea
          v-model="draft"
          rows="3"
          placeholder="记录你对该人物的新观察，例如近期动态、言论、作品、争议点…"
        ></textarea>
        <div class="input-foot">
          <div class="mood-pick">
            <button
              v-for="m in MOOD_OPTIONS"
              :key="m.key"
              class="mood-btn"
              :class="[`m-${m.key}`, { on: draftMood === m.key }]"
              @click="draftMood = m.key"
            >
              {{ m.label }}
            </button>
          </div>
          <button class="add-btn" @click="submitNote">添加观察</button>
        </div>
      </div>

      <p v-if="!record.notes.length" class="no-note">
        还没有观察记录。把上面写下来，长期追踪这个人的变化。
      </p>

      <ul v-else class="note-list">
        <li v-for="n in record.notes" :key="n.id" class="note">
          <div class="note-head">
            <span class="note-mood" :class="`m-${n.mood}`">{{ moodLabel(n.mood) }}</span>
            <span class="note-date">{{ formatDateTime(n.date) }}</span>
            <button class="del" @click="obs.removeNote(props.id, n.id)">删除</button>
          </div>
          <p class="note-text">{{ n.content }}</p>
        </li>
      </ul>
    </div>
    </section>

    <section v-else class="notfound">
      <p>未找到该人物。</p>
      <RouterLink to="/contemporary-figures">← 返回追踪面板</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
}
.field-tag {
  font-size: 12px;
  background: var(--primary-soft);
  color: var(--primary);
  padding: 3px 10px;
  border-radius: 999px;
}
.head h1 {
  margin: 8px 0 4px;
  font-size: 26px;
}
.real {
  font-size: 16px;
  color: var(--muted);
  font-weight: 400;
}
.group {
  margin: 0;
  color: var(--accent);
  font-size: 14px;
}
.status-box {
  text-align: right;
}
.status-label {
  display: block;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
.status-btns {
  display: flex;
  gap: 6px;
}
.status-btn {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--text);
}
.status-btn.s-watching.on {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.status-btn.s-following.on {
  background: var(--positive);
  color: #fff;
  border-color: var(--positive);
}
.status-btn.s-paused.on {
  background: var(--muted);
  color: #fff;
  border-color: var(--muted);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
}
.info-item {
  display: flex;
  flex-direction: column;
}
.info-item .k {
  font-size: 12px;
  color: var(--muted);
}
.info-item .v {
  font-size: 15px;
  font-weight: 600;
}
.bio {
  margin: 16px 0;
  font-size: 15px;
  color: #333;
}

.section-title {
  font-size: 18px;
  margin: 26px 0 12px;
  border-left: 4px solid var(--primary);
  padding-left: 10px;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 8px;
}
.timeline li {
  position: relative;
  padding: 0 0 16px 22px;
  border-left: 2px solid var(--line);
}
.timeline li:last-child {
  border-left-color: transparent;
  padding-bottom: 0;
}
.timeline .dot {
  position: absolute;
  left: -7px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid var(--bg);
}
.ev-date {
  font-weight: 700;
  font-size: 14px;
  margin-right: 8px;
}
.ev-text {
  font-size: 14px;
  color: #333;
}

.observe {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px;
  box-shadow: var(--shadow);
}
.note-input textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
}
.note-input textarea:focus {
  border-color: var(--primary);
}
.input-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  flex-wrap: wrap;
  gap: 10px;
}
.mood-pick {
  display: flex;
  gap: 6px;
}
.mood-btn {
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 13px;
  color: var(--text);
}
.mood-btn.m-positive.on {
  background: var(--positive);
  color: #fff;
  border-color: var(--positive);
}
.mood-btn.m-concern.on {
  background: var(--concern);
  color: #fff;
  border-color: var(--concern);
}
.mood-btn.m-neutral.on {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.add-btn {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 9px 18px;
  font-size: 14px;
}
.add-btn:hover {
  opacity: 0.9;
}
.no-note {
  color: var(--muted);
  font-size: 14px;
  margin: 16px 0 0;
}
.note-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
}
.note {
  border-top: 1px dashed var(--line);
  padding: 12px 0;
}
.note-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}
.note-mood {
  padding: 2px 8px;
  border-radius: 999px;
  color: #fff;
}
.note-mood.m-positive {
  background: var(--positive);
}
.note-mood.m-concern {
  background: var(--concern);
}
.note-mood.m-neutral {
  background: var(--muted);
}
.note-date {
  color: var(--muted);
}
.del {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--concern);
  font-size: 12px;
}
.note-text {
  margin: 6px 0 0;
  font-size: 14px;
  white-space: pre-wrap;
}
.notfound {
  text-align: center;
  padding: 60px 0;
  color: var(--muted);
}
</style>
