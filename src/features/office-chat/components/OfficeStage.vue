<script setup>
// 办公室舞台：墙面 + 地毯 + 装饰 + 功能区 + 员工小人；
// 左上角挂当前话题，右上角显示聊天模式
import { computed } from 'vue'
import Employee from './Employee.vue'
import { ROOM, DECOR, MEETING_TABLE, ZONES } from '../game/constants.js'
import { sim } from '../game/engine.js'

defineEmits(['poke'])

const MODE_BADGE = {
  ai: { text: '🤖 AI 接龙', cls: 'badge-ai' },
  script: { text: '📜 剧本模式', cls: 'badge-script' },
  boot: { text: '⏳ 开机中', cls: 'badge-script' }
}

const badge = computed(() => MODE_BADGE[sim.mode] || MODE_BADGE.boot)
</script>

<template>
  <div class="stage-wrap" :style="{ width: ROOM.width + 'px', height: ROOM.height + 'px' }">
    <!-- 显式宽高：子元素全为绝对定位，不撑开 .stage，缺高度会被 overflow:hidden 整体裁掉 -->
    <div class="stage" :style="{ width: ROOM.width + 'px', height: ROOM.height + 'px' }">
      <!-- 墙面 + 踢脚线 + 地毯 -->
      <div class="wall" :style="{ height: ROOM.wallHeight + 'px' }"></div>
      <div class="baseboard" :style="{ top: ROOM.wallHeight + 'px' }"></div>
      <div class="floor" :style="{ top: ROOM.wallHeight + 'px' }"></div>

      <!-- 功能区垫子 -->
      <div
        v-for="z in ZONES"
        :key="z.label"
        class="zone"
        :style="{ left: z.x + 'px', top: z.y + 'px', width: z.w + 'px', height: z.h + 'px' }"
      >
        <span class="zone-label">{{ z.label }}</span>
      </div>

      <!-- 会议室圆桌 -->
      <div
        class="meeting"
        :style="{
          left: MEETING_TABLE.x + 'px',
          top: MEETING_TABLE.y + 'px',
          width: MEETING_TABLE.rx * 2 + 'px',
          height: MEETING_TABLE.ry * 2 + 'px'
        }"
      >
        <span class="zone-label">会议室</span>
      </div>

      <!-- 装饰层 -->
      <div
        v-for="(d, i) in DECOR"
        :key="i"
        class="decor"
        :class="d.layer === 'wall' ? 'wall-decor' : 'floor-decor'"
        :style="{ transform: `translate(${d.x}px, ${d.y}px)`, fontSize: d.size + 'px' }"
      >
        {{ d.emoji }}
      </div>

      <!-- 员工 -->
      <Employee
        v-for="emp in sim.employees"
        :key="emp.key"
        :emp="emp"
        @poke="$emit('poke', $event)"
      />

      <!-- 左上：当前话题；右上：模式徽章 -->
      <div v-if="sim.topicTitle" class="topic-chip">📢 {{ sim.topicTitle }}</div>
      <div class="mode-badge" :class="badge.cls">{{ badge.text }}</div>
    </div>
  </div>
</template>

<style scoped>
.stage-wrap {
  position: relative;
  margin: 0 auto;
  max-width: 100%;
  border: 10px solid #3b4a54;
  border-radius: 10px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.stage {
  position: relative;
  overflow: hidden;
  background: #455a64;
}

/* 墙面：竖条纹墙板 */
.wall {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  background:
    repeating-linear-gradient(
      90deg,
      #546e7a 0px,
      #546e7a 30px,
      #4c657040 30px,
      #4c6570 60px
    ),
    linear-gradient(#607d8b, #50656f);
  box-shadow: inset 0 -12px 20px rgba(0, 0, 0, 0.25);
}

.baseboard {
  position: absolute;
  left: 0;
  width: 100%;
  height: 8px;
  background: #31434c;
  z-index: 2;
}

/* 地板：办公室地毯 */
.floor {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: #78909c;
  background-image:
    repeating-linear-gradient(
      0deg,
      rgba(255, 255, 255, 0.05) 0px,
      rgba(255, 255, 255, 0.05) 2px,
      transparent 2px,
      transparent 40px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(0, 0, 0, 0.07) 0px,
      rgba(0, 0, 0, 0.07) 2px,
      transparent 2px,
      transparent 40px
    );
}

.zone {
  position: absolute;
  border: 2px dashed rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  z-index: 1;
}

.zone-label {
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  pointer-events: none;
}

/* 会议室圆桌 */
.meeting {
  position: absolute;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse at 35% 30%, #c8a27a, #a5825f 65%, #8a6b4a);
  border: 6px solid #7d5f42;
  border-radius: 50%;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
  z-index: 1;
}

.meeting .zone-label {
  top: 50%;
  margin-top: -8px;
  color: rgba(255, 255, 255, 0.5);
}

.decor {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: -0.5em;
  margin-top: -0.5em;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
}

.wall-decor {
  z-index: 3;
}

.floor-decor {
  z-index: 4;
}

.topic-chip {
  position: absolute;
  top: 8px;
  left: 10px;
  z-index: 40;
  max-width: 300px;
  padding: 4px 12px;
  font-size: 13px;
  color: #ffd43b;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 212, 59, 0.4);
  border-radius: 999px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mode-badge {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 40;
  padding: 4px 12px;
  font-size: 13px;
  border-radius: 999px;
}

.badge-ai {
  color: #69db7c;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(105, 219, 124, 0.4);
}

.badge-script {
  color: #74c0fc;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(116, 192, 252, 0.4);
}
</style>
