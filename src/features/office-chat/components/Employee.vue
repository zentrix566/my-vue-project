<script setup>
// 员工：工位上的 emoji 小人 + 头顶聊天气泡 + 名牌，点击可"戳一戳"
defineProps({
  emp: { type: Object, required: true }
})

defineEmits(['poke'])
</script>

<template>
  <div
    class="emp"
    :class="{ speaking: emp.speaking }"
    :style="{ transform: `translate(${emp.x}px, ${emp.y}px)`, fontSize: emp.size + 'px' }"
    :title="`${emp.name} · ${emp.role}`"
    @click.stop="$emit('poke', emp.key)"
  >
    <transition name="bubble">
      <div v-if="emp.bubble" class="bubble">{{ emp.bubble }}</div>
    </transition>

    <span class="glyph">{{ emp.emoji }}</span>
    <span class="tag" :style="{ background: emp.color }">{{ emp.name }}</span>
  </div>
</template>

<style scoped>
.emp {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  will-change: transform;
  z-index: 10;
  user-select: none;
  cursor: pointer;
}

.glyph {
  display: inline-block;
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3));
}

/* 待机：极轻微的呼吸浮动（聊天为主，不乱动） */
.glyph {
  animation: idle-bob 3.2s ease-in-out infinite;
}

.emp.speaking .glyph {
  animation: talk-bounce 0.45s ease-in-out;
}

.tag {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 3px;
  font-size: 11px;
  color: #fff;
  padding: 1px 6px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.bubble {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  padding: 5px 10px;
  background: #fff;
  border: 2px solid v-bind('emp.color');
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.35;
  width: max-content;
  max-width: 200px;
  white-space: normal;
  text-align: left;
  color: #222;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 30;
}

.bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: v-bind('emp.color');
}

.bubble-enter-active,
.bubble-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(5px);
}

@keyframes idle-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}

@keyframes talk-bounce {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.22) rotate(-6deg);
  }
  70% {
    transform: scale(1.12) rotate(4deg);
  }
  100% {
    transform: scale(1);
  }
}
</style>
