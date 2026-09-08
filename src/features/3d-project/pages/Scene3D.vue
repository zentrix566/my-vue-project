<template>
  <section class="page page--wide scene3d-page">
    <header class="scene3d-header">
      <RouterLink class="back" to="/">← 返回主页</RouterLink>
      <p class="eyebrow">THREE.JS · INTERACTIVE 3D</p>
      <h1>3D 项目</h1>
      <p class="subtitle">可交互 3D 场景合集，支持切换场景与视角，拖拽旋转、滚轮缩放、右键平移。</p>
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
      <div class="toolbar-group">
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
      <div class="viewport-hint">拖拽旋转 · 滚轮缩放 · 右键平移</div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { createViewer } from '../framework.js'
import scenes from '../scenes/index.js'

const viewportRef = ref(null)
const activeScene = ref(scenes[0].id)
const activeView = ref(scenes[0].views[0].key)
let viewer = null

const currentScene = computed(() => scenes.find((s) => s.id === activeScene.value))
const currentViews = computed(() => currentScene.value?.views || [])

// 载入指定场景：清空旧几何体、构建新场景、复位到第一个视角
function applyScene(key) {
  const sc = scenes.find((s) => s.id === key)
  if (!sc || !viewer) return
  viewer.clearContent()
  sc.build(viewer.contentGroup)
  const first = sc.views[0]
  activeView.value = first.key
  viewer.setView(first)
}

function switchScene(key) {
  if (key === activeScene.value) return
  activeScene.value = key
  applyScene(key)
}

function setView(view) {
  activeView.value = view.key
  viewer?.setView(view)
}

onMounted(() => {
  viewer = createViewer(viewportRef.value)
  applyScene(activeScene.value)
})

onBeforeUnmount(() => {
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
</style>
