<script setup>
// 右侧群聊栏：实时滚动的聊天记录 + 底部"我"的插话输入框
import { ref, watch, nextTick } from 'vue'
import { sim } from '../game/engine.js'
import { personaOf } from '../game/personas.js'
import { ROOM } from '../game/constants.js'

const emit = defineEmits(['send'])

const listRef = ref(null)
const draft = ref('')

// 模板里取消息对应人设的信息
function of(m) {
  return personaOf(m.who)
}

// 新消息进来后自动滚到底
watch(
  () => sim.messages.length,
  async () => {
    await nextTick()
    const el = listRef.value?.$el ?? listRef.value
    if (el) el.scrollTop = el.scrollHeight
  }
)

function send() {
  const text = draft.value.trim()
  if (!text) return
  emit('send', text)
  draft.value = ''
}
</script>

<template>
  <aside class="feed" :style="{ height: ROOM.height + 'px' }">
    <div class="feed-header">
      <span>💬 公司大群（{{ sim.employees.length + 1 }}）</span>
      <span class="mode-hint" :class="sim.mode === 'ai' ? 'ai' : 'script'">
        {{ sim.mode === 'ai' ? 'AI 接龙' : '剧本' }}
      </span>
    </div>

    <div ref="listRef" class="feed-list">
      <template v-for="m in sim.messages" :key="m.id">
        <div v-if="m.kind === 'sys'" class="row-sys">{{ m.text }}</div>
        <div v-else class="row" :class="{ mine: m.kind === 'user' }">
          <span
            class="avatar"
            :style="{ background: m.kind === 'user' ? '#495057' : of(m)?.color || '#888' }"
          >
            {{ m.kind === 'user' ? '🧑‍💻' : of(m)?.emoji || '💬' }}
          </span>
          <div class="body">
            <div class="meta">
              <span
                class="name"
                :style="{ color: m.kind === 'user' ? '#ffd43b' : of(m)?.color || '#adb5bd' }"
              >
                {{ m.kind === 'user' ? '我' : of(m)?.name || '群友' }}
              </span>
              <span class="time">{{ m.time }}</span>
            </div>
            <div class="text">{{ m.text }}</div>
          </div>
        </div>
      </template>
      <div v-if="!sim.messages.length" class="empty">群聊即将开始…</div>
    </div>

    <div class="input-row">
      <input
        v-model="draft"
        class="input"
        type="text"
        maxlength="60"
        placeholder="以「我」的身份插一句话…"
        @keydown.enter="send"
      />
      <button class="send-btn" :disabled="!draft.trim()" @click="send">发送</button>
    </div>
  </aside>
</template>

<style scoped>
.feed {
  position: relative;
  width: 300px;
  flex: none;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  overflow: hidden;
}

.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 700;
  color: #f8f9fa;
  background: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.mode-hint {
  font-size: 11px;
  font-weight: 400;
  padding: 2px 8px;
  border-radius: 999px;
}

.mode-hint.ai {
  color: #69db7c;
  background: rgba(105, 219, 124, 0.12);
}

.mode-hint.script {
  color: #74c0fc;
  background: rgba(116, 192, 252, 0.12);
}

.feed-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
}

.row {
  display: flex;
  gap: 8px;
  padding: 6px 2px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.06);
  animation: msg-in 0.25s ease;
}

.row.mine {
  background: rgba(255, 212, 59, 0.06);
  border-radius: 8px;
}

.avatar {
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-top: 2px;
}

.body {
  flex: 1;
  min-width: 0;
}

.meta {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.name {
  font-size: 12.5px;
  font-weight: 700;
}

.time {
  font-size: 10.5px;
  color: #868e96;
  font-variant-numeric: tabular-nums;
}

.text {
  font-size: 13px;
  line-height: 1.45;
  color: #dee2e6;
  word-break: break-word;
}

.row.mine .text {
  color: #ffe8a3;
}

.row-sys {
  text-align: center;
  font-size: 11.5px;
  color: #868e96;
  padding: 5px 0;
  animation: msg-in 0.25s ease;
}

.empty {
  color: #868e96;
  font-size: 12px;
  padding: 12px;
  text-align: center;
}

.input-row {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.35);
}

.input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #f1f3f5;
  font-size: 13px;
  padding: 7px 10px;
  outline: none;
}

.input:focus {
  border-color: #ffd43b66;
}

.input::placeholder {
  color: #868e96;
}

.send-btn {
  flex: none;
  border: none;
  border-radius: 8px;
  background: #ffd43b;
  color: #212529;
  font-size: 13px;
  font-weight: 700;
  padding: 0 14px;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateX(14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
