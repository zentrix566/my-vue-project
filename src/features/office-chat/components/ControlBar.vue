<script setup>
// 控制条：播放/暂停、速度、聊天模式（AI/剧本）、点播话题、重置
import { ref } from 'vue'
import { SPEEDS } from '../game/constants.js'
import { TOPICS } from '../game/topics.js'

const props = defineProps({
  sim: { type: Object, required: true }
})

const emit = defineEmits(['toggle', 'speed', 'mode', 'retry-ai', 'topic', 'reset'])

const topicPick = ref('')

function onTopic(e) {
  const title = e.target.value
  topicPick.value = title
  if (title) emit('topic', title)
}
</script>

<template>
  <div class="bar">
    <button class="btn" @click="emit('toggle')">
      {{ sim.running ? '⏸ 暂停' : '▶ 继续' }}
    </button>

    <div class="seg">
      <button
        v-for="s in SPEEDS"
        :key="s.value"
        class="seg-btn"
        :class="{ active: sim.speed === s.value }"
        @click="emit('speed', s.value)"
      >
        {{ s.label }}
      </button>
    </div>

    <div class="seg">
      <button
        class="seg-btn"
        :class="{ active: sim.mode === 'ai' }"
        :disabled="!sim.aiReady"
        :title="sim.aiReady ? '大模型逐句接龙（需本地 dev 接口）' : '大模型接口不可用（生产环境无代理）'"
        @click="emit('mode', 'ai')"
      >
        🤖 AI 接龙
      </button>
      <button
        class="seg-btn"
        :class="{ active: sim.mode === 'script' }"
        @click="emit('mode', 'script')"
      >
        📜 剧本模式
      </button>
      <button
        v-if="!sim.aiReady"
        class="seg-btn"
        title="再试一次连接大模型"
        @click="emit('retry-ai')"
      >
        🔄 重试 AI
      </button>
    </div>

    <select class="topic-select" :value="topicPick" @change="onTopic">
      <option value="">🎬 点播一个话题…</option>
      <option v-for="t in TOPICS" :key="t.id" :value="t.title">{{ t.title }}</option>
    </select>

    <button class="btn" @click="emit('reset')">🧹 重置</button>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 12px;
}

.btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: #e9ecef;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.seg {
  display: flex;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.seg-btn {
  border: none;
  background: transparent;
  color: #adb5bd;
  font-size: 13px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.seg-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.seg-btn.active {
  background: #ffd43b;
  color: #212529;
  font-weight: 700;
}

.seg-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.topic-select {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: #e9ecef;
  font-size: 13px;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
}

.topic-select option {
  color: #212529;
}
</style>
