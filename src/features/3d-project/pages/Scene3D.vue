<template>
  <section class="page page--wide scene3d-page">
    <header class="scene3d-header">
      <RouterLink class="back" to="/">← 返回主页</RouterLink>
      <p class="eyebrow">THREE.JS · INTERACTIVE 3D</p>
      <h1>3D 项目</h1>
      <p class="subtitle">{{ subtitleText }}</p>
    </header>

    <div class="scene3d-toolbar">
      <div class="toolbar-group">
        <span class="group-label">场景</span>
        <button
          v-for="sc in scenes"
          :key="sc.id"
          type="button"
          :class="{ active: activeScene === sc.id }"
          @click="switchScene(sc.id)"
        >
          {{ sc.label }}
        </button>
      </div>
      <div class="toolbar-group" v-if="!isFps && currentViews.length">
        <span class="group-label">视角</span>
        <button
          v-for="view in currentViews"
          :key="view.key"
          type="button"
          :class="{ active: activeView === view.key }"
          @click="setView(view)"
        >
          {{ view.label }}
        </button>
      </div>
    </div>

    <div ref="viewportRef" class="scene3d-viewport">
      <!-- Orbit 模式提示 -->
      <div v-if="!isFps" class="viewport-hint">拖拽旋转 · 滚轮缩放 · 右键平移</div>

      <!-- FPS 模式 UI -->
      <template v-if="isFps">
        <!-- 准星 -->
        <div v-if="isLocked" class="crosshair" aria-hidden="true">
          <span class="crosshair-h"></span>
          <span class="crosshair-v"></span>
          <span class="crosshair-dot"></span>
        </div>
        <!-- 未锁定覆盖层 -->
        <div v-if="!isLocked" class="fps-overlay" @click="enterFps">
          <div class="fps-card" @click.stop>
            <h2>点击进入 FPS</h2>
            <p>WASD 移动 · 鼠标视角 · Shift 加速 · F 交互 · ESC 释放</p>
            <button type="button" @click="enterFps">进入</button>
          </div>
        </div>
        <!-- 底部 HUD -->
        <div v-if="isLocked" class="fps-hud">WASD 移动 · 鼠标视角 · Shift 跑 · F 交互 · R 重生 · ESC 释放</div>
        <!-- 重生按钮 -->
        <button v-if="isFps" type="button" class="fps-respawn" @click="respawn">↻ 重生</button>
        <!-- 交互提示 -->
        <div v-if="isLocked && interactivePrompt" class="fps-prompt">{{ interactivePrompt }}</div>
        <!-- 回合消息 -->
        <div v-if="roundMessage" class="fps-message">{{ roundMessage }}</div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { createViewer } from '../framework.js'
import scenes from '../scenes/index.js'

const viewportRef = ref(null)
const activeScene = ref(scenes[0].id)
const activeView = ref(scenes[0].views?.[0]?.key || '')
const isFps = ref(scenes[0].controlsType === 'fps')
const isLocked = ref(false)
const interactivePrompt = ref('')
const roundMessage = ref('')
let viewer = null
let currentSpawn = null
let onFpsKey = null

const currentScene = computed(() => scenes.find((s) => s.id === activeScene.value))
const currentViews = computed(() => currentScene.value?.views || [])

const subtitleText = computed(() => {
  if (isFps.value) return '可交互 3D 场景合集，FPS 模式可第一人称行走、互动救援（按 F）。'
  return '可交互 3D 场景合集，支持切换场景与视角，拖拽旋转、滚轮缩放、右键平移。'
})

function bindViewerCallbacks() {
  if (!viewer) return
  viewer.setOnLockChange((locked) => {
    isLocked.value = locked
  })
  viewer.setOnInteractiveChange((it) => {
    interactivePrompt.value = it?.prompt || ''
  })
  viewer.setOnMessage((text) => {
    roundMessage.value = text
  })
}

function applyScene(key) {
  const sc = scenes.find((s) => s.id === key)
  if (!sc) return
  // 销毁旧 viewer（不同 controlsType 需重建）
  if (viewer) {
    viewer.dispose()
    viewer = null
  }
  const controlsType = sc.controlsType || 'orbit'
  viewer = createViewer(viewportRef.value, { controlsType })
  bindViewerCallbacks()
  // 构建场景
  const ctx = viewer.getBuildCtx()
  sc.build(viewer.contentGroup, ctx)
  isFps.value = controlsType === 'fps'
  isLocked.value = false
  interactivePrompt.value = ''
  roundMessage.value = ''
  if (sc.spawn) {
    currentSpawn = sc.spawn
    viewer.setCameraPose(sc.spawn.position, sc.spawn.look)
    activeView.value = ''
  } else if (sc.views?.[0]) {
    currentSpawn = null
    activeView.value = sc.views[0].key
    viewer.setView(sc.views[0])
  } else {
    currentSpawn = null
    activeView.value = ''
  }
  // FPS 模式绑定 R 键重生
  if (controlsType === 'fps') {
    onFpsKey = (e) => {
      if (e.code === 'KeyR' && viewer?.isLocked()) {
        respawn()
      }
    }
    window.addEventListener('keydown', onFpsKey)
  } else {
    onFpsKey = null
  }
}

function switchScene(key) {
  if (key === activeScene.value) return
  activeScene.value = key
  applyScene(key)
}

function setView(view) {
  if (!viewer || isFps.value) return
  activeView.value = view.key
  viewer.setView(view)
}

function enterFps() {
  viewer?.lock()
}

function respawn() {
  if (!currentSpawn || !viewer) return
  viewer.setCameraPose(currentSpawn.position, currentSpawn.look)
}

onMounted(() => {
  applyScene(activeScene.value)
})

onBeforeUnmount(() => {
  if (onFpsKey) window.removeEventListener('keydown', onFpsKey)
  viewer?.dispose()
  viewer = null
})
</script>

<style scoped>
.scene3d-page {
  display: grid;
  gap: 16px;
}

.scene3d-header h1 {
  font-size: clamp(1.6rem, 3.2vw, 2.2rem);
  margin: 6px 0 10px;
}

.scene3d-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 24px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.group-label {
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.toolbar-group button {
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-weight: 700;
  min-height: 36px;
  padding: 6px 16px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.toolbar-group button:hover {
  border-color: rgba(47, 111, 237, 0.45);
  color: var(--primary);
}

.toolbar-group button.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.scene3d-viewport {
  position: relative;
  height: clamp(480px, 74vh, 820px);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  background: #d7e0ea;
  cursor: grab;
}

.scene3d-viewport:active {
  cursor: grabbing;
}

.viewport-hint {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 1;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.6);
  color: #fff;
  font-size: 0.82rem;
  pointer-events: none;
}

/* ===== FPS UI ===== */
.crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
}
.crosshair-h,
.crosshair-v {
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
}
.crosshair-h {
  left: 0;
  top: 50%;
  width: 100%;
  height: 2px;
  transform: translateY(-50%);
}
.crosshair-v {
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  transform: translateX(-50%);
}
.crosshair-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 3px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
}

.fps-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: grid;
  place-items: center;
  cursor: pointer;
  z-index: 3;
}

.fps-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 28px 36px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  max-width: 90%;
}

.fps-card h2 {
  margin: 0 0 8px;
  font-size: 1.3rem;
}

.fps-card p {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 0.92rem;
}

.fps-card button {
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  padding: 8px 28px;
  border-radius: var(--radius-pill);
  font-weight: 700;
  cursor: pointer;
  font-size: 0.95rem;
}

.fps-hud {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  font-size: 0.82rem;
  pointer-events: none;
  z-index: 2;
  white-space: nowrap;
}

.fps-prompt {
  position: absolute;
  left: 50%;
  top: 62%;
  transform: translate(-50%, -50%);
  padding: 10px 24px;
  border-radius: var(--radius-pill);
  background: rgba(47, 111, 237, 0.9);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  pointer-events: none;
  z-index: 2;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
}

.fps-message {
  position: absolute;
  left: 50%;
  top: 35%;
  transform: translate(-50%, -50%);
  padding: 16px 32px;
  border-radius: var(--radius);
  background: rgba(34, 197, 94, 0.92);
  color: #fff;
  font-size: 1.4rem;
  font-weight: 700;
  pointer-events: none;
  z-index: 3;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  animation: fps-msg-in 0.3s ease;
}

@keyframes fps-msg-in {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

.fps-respawn {
  position: absolute;
  right: 14px;
  top: 14px;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: var(--radius-pill);
  background: rgba(15, 23, 42, 0.55);
  color: #fff;
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.fps-respawn:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(255, 255, 255, 0.7);
}
</style>
