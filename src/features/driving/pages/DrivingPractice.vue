<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { MODES, createSession } from '../game/courses.js'
import { updateCar, CAR_SPEC } from '../game/engine.js'
import { drawWorld } from '../game/world.js'

/**
 * 模拟驾驶 · 练车找手感
 * 俯视 2D 视角 + 简化自行车模型：练转向灯时机、变道、转弯、掉头的手感。
 * 物理与判定在 game/ 目录，本文件负责界面、输入与游戏循环。
 */

const sessionRef = ref(null)
const canvasEl = ref(null)
const wheelEl = ref(null)
const paused = ref(false)
const result = ref(null)
const soundOn = ref(true)
const toasts = reactive([])
const best = ref({})

const hud = computed(() => sessionRef.value?.hud || {})
const mode = computed(() => MODES.find((m) => m.id === sessionRef.value?.modeId))

let rafId = 0
let lastTime = 0
let camX = 0
let camY = 0
let camInit = false
let toastId = 0
let audioCtx = null
let engineOsc = null
let engineGain = null
let lastBlinkPhase = 0

const keys = new Set()
const touch = { steer: 0, throttle: 0, brake: 0 }
const input = { steer: 0, throttle: 0, brake: 0 }

// —— 音效：全部实时合成，默认开，可一键静音 ——

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  if (!engineOsc) {
    engineOsc = audioCtx.createOscillator()
    engineGain = audioCtx.createGain()
    engineOsc.type = 'sawtooth'
    engineOsc.frequency.value = 55
    engineGain.gain.value = 0
    engineOsc.connect(engineGain).connect(audioCtx.destination)
    engineOsc.start()
  }
  return audioCtx
}

function beep(freq, dur, type = 'square', vol = 0.06) {
  if (!soundOn.value || !audioCtx) return
  const now = audioCtx.currentTime
  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol, now)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(gain).connect(audioCtx.destination)
  osc.start(now)
  osc.stop(now + dur)
}

function playDing() {
  beep(660, 0.12, 'triangle', 0.07)
  setTimeout(() => beep(880, 0.18, 'triangle', 0.07), 110)
}

function updateEngineSound(car) {
  if (!engineOsc) return
  const active = soundOn.value && !paused.value
  const v = Math.abs(car.speed)
  engineOsc.frequency.value = 52 + v * 6.5
  engineGain.gain.value = active ? (input.throttle ? 0.035 : 0.022) : 0
}

// —— 会话与事件 ——

function handleEvent(kind, payload) {
  if (kind === 'penalty') {
    toast(`-${payload.pts} ${payload.text}`, 'bad')
    beep(300, 0.15, 'square', 0.05)
  } else if (kind === 'praise') {
    toast(payload.text, 'good')
    beep(760, 0.1, 'triangle', 0.05)
  } else if (kind === 'finished') {
    result.value = payload
    const id = sessionRef.value?.modeId
    if (id) {
      const prev = best.value[id]
      payload.isBest = prev === undefined || payload.score > prev
      if (payload.isBest) {
        best.value = { ...best.value, [id]: payload.score }
        localStorage.setItem('driving-best-v1', JSON.stringify(best.value))
      }
    }
    playDing()
  }
}

function toast(text, kind) {
  const id = ++toastId
  toasts.push({ id, text, kind })
  if (toasts.length > 4) toasts.shift()
  setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, 2400)
}

function startMode(id) {
  ensureAudio()
  const s = createSession(id)
  if (!s) return
  s.onEvent = handleEvent
  sessionRef.value = s
  result.value = null
  paused.value = false
  camInit = false
  toasts.splice(0)
  nextTick(resizeCanvas)
}

function restart() {
  if (sessionRef.value) startMode(sessionRef.value.modeId)
}

function exitToMenu() {
  sessionRef.value = null
  result.value = null
  paused.value = false
}

function togglePause() {
  if (sessionRef.value && !result.value) paused.value = !paused.value
}

function toggleSignal(side) {
  sessionRef.value?.toggleSignal(side)
}

// —— 输入 ——

const KEY_ACTIONS = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
}

function onKeyDown(e) {
  if (!sessionRef.value) return
  const action = KEY_ACTIONS[e.code]
  if (action) {
    keys.add(action)
    e.preventDefault()
    return
  }
  if (e.code === 'KeyQ') {
    toggleSignal('left')
  } else if (e.code === 'KeyE') {
    toggleSignal('right')
  } else if (e.code === 'KeyR') {
    restart()
  } else if (e.code === 'Escape') {
    togglePause()
  }
}

function onKeyUp(e) {
  const action = KEY_ACTIONS[e.code]
  if (action) keys.delete(action)
}

function gatherInput() {
  const steerKey = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0)
  input.steer = steerKey || touch.steer
  input.throttle = keys.has('up') || touch.throttle ? 1 : 0
  input.brake = keys.has('down') || touch.brake ? 1 : 0
}

// —— 渲染 ——

function resizeCanvas() {
  const canvas = canvasEl.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(canvas.clientWidth * dpr)
  canvas.height = Math.round(canvas.clientHeight * dpr)
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCar(ctx, car, blinkOn, signal) {
  ctx.save()
  ctx.translate(car.x, car.y)
  ctx.rotate(car.heading)
  const L = CAR_SPEC.length
  const W = CAR_SPEC.width

  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  roundRectPath(ctx, -L / 2 + 0.22, -W / 2 + 0.28, L, W, 0.55)
  ctx.fill()

  ctx.fillStyle = '#23272e'
  const tw = 0.62
  const tl = 1.05
  const steer = car.steer
  for (const [fx, fy, rot] of [
    [L / 2 - 0.85, -W / 2 + 0.08, steer],
    [L / 2 - 0.85, W / 2 - 0.08 - tw, steer],
    [-L / 2 + 0.35, -W / 2 + 0.08, 0],
    [-L / 2 + 0.35, W / 2 - 0.08 - tw, 0]
  ]) {
    ctx.save()
    ctx.translate(fx, fy + tw / 2)
    ctx.rotate(rot)
    ctx.fillRect(-tl / 2, -tw / 2, tl, tw)
    ctx.restore()
  }

  ctx.fillStyle = '#d94f43'
  roundRectPath(ctx, -L / 2, -W / 2, L, W, 0.6)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.16)'
  roundRectPath(ctx, -L / 2, -W / 2, L, W * 0.32, 0.6)
  ctx.fill()

  ctx.fillStyle = '#2c3540'
  roundRectPath(ctx, -0.5, -W / 2 + 0.24, 1.5, W - 0.48, 0.3)
  ctx.fill()
  roundRectPath(ctx, -1.75, -W / 2 + 0.3, 0.8, W - 0.6, 0.25)
  ctx.fill()

  if (signal && blinkOn) {
    ctx.fillStyle = '#ffb020'
    const s = 0.34
    const yOff = signal === 'left' ? -W / 2 : W / 2 - s
    ctx.fillRect(L / 2 - s - 0.1, yOff, s, s)
    ctx.fillRect(-L / 2 + 0.1, yOff, s, s)
  }
  ctx.restore()
}

function render(now) {
  const canvas = canvasEl.value
  const s = sessionRef.value
  if (!canvas || !s) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.round(w * dpr)) resizeCanvas()

  const car = s.car
  const pxPerM = Math.max(7.5, Math.min(15, w / 46))
  const lookahead = 6 + Math.abs(car.speed) * 0.55
  const tx = car.x + Math.cos(car.heading) * lookahead
  const ty = car.y + Math.sin(car.heading) * lookahead
  if (!camInit) {
    camX = tx
    camY = ty
    camInit = true
  } else {
    const k = 0.06
    camX += (tx - camX) * k
    camY += (ty - camY) * k
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.save()
  ctx.translate(w / 2, h * 0.6)
  ctx.scale(pxPerM, pxPerM)
  ctx.translate(-camX, -camY)

  const view = {
    x0: camX - (w / 2) / pxPerM,
    y0: camY - (h * 0.6) / pxPerM,
    w: w / pxPerM,
    h: h / pxPerM
  }
  drawWorld(ctx, s.world, view)
  s.drawExtras(ctx)
  const blinkPhase = Math.floor(now / 450) % 2
  drawCar(ctx, car, blinkPhase === 1, s.signal)
  if (blinkPhase !== lastBlinkPhase) {
    lastBlinkPhase = blinkPhase
    if (s.signal) beep(1500, 0.03, 'square', 0.035)
  }
  ctx.restore()
}

function frame(now) {
  rafId = requestAnimationFrame(frame)
  const dt = Math.min((now - lastTime) / 1000, 0.05)
  lastTime = now
  const s = sessionRef.value
  if (!s) return
  if (!paused.value && !s.finished) {
    gatherInput()
    updateCar(s.car, input, dt)
    s.update(dt)
  } else {
    input.steer = 0
    input.throttle = 0
    input.brake = 0
  }
  render(now)
  if (wheelEl.value) {
    wheelEl.value.style.transform = `rotate(${s.car.wheelDeg}deg)`
  }
  updateEngineSound(s.car)
}

function onTouchVisibility() {
  if (document.hidden && sessionRef.value && !result.value) paused.value = true
}

function onRuntimeError(e) {
  const msg = e.message || String(e)
  if (!toasts.some((t) => t.text === msg)) {
    toast(`⚠ ${msg}`, 'bad')
  }
}

onMounted(() => {
  try {
    best.value = JSON.parse(localStorage.getItem('driving-best-v1')) || {}
  } catch {
    best.value = {}
  }
  // 开发调试：把每帧循环里的运行时错误浮出来，否则 rAF 会静默吞掉
  window.addEventListener('error', onRuntimeError)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('resize', resizeCanvas)
  document.addEventListener('visibilitychange', onTouchVisibility)
  lastTime = performance.now()
  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('error', onRuntimeError)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('visibilitychange', onTouchVisibility)
  audioCtx?.close()
})

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}分${String(s).padStart(2, '0')}秒`
}

const gradeClass = computed(() => {
  const g = result.value?.grade
  return g ? `grade-${g.toLowerCase()}` : ''
})
</script>

<template>
  <main class="driving">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>模拟驾驶 · 练车找手感</h1>
      <p class="subtitle">
        俯视小车 + 真实转向灯逻辑：打多少回多少、灯先动方向后动，给练车的和久没摸车的人找找手感。
      </p>
    </header>

    <section v-if="!sessionRef" class="modes">
      <button v-for="m in MODES" :key="m.id" class="mode-card" @click="startMode(m.id)">
        <div class="emoji">{{ m.emoji }}</div>
        <h2>{{ m.name }}</h2>
        <p class="desc">{{ m.desc }}</p>
        <p class="tip">{{ m.tip }}</p>
        <span v-if="best[m.id] !== undefined" class="best">最佳 {{ best[m.id] }} 分</span>
      </button>

      <div class="help-card">
        <h2>🎮 操作方式</h2>
        <ul>
          <li><b>W / ↑</b> 油门 · <b>S / ↓</b> 刹车（停稳后按住为倒车）</li>
          <li><b>A / ←</b> <b>D / →</b> 打方向（松手自动回正）</li>
          <li><b>Q</b> 左转向灯 · <b>E</b> 右转向灯（转完弯自动回位）</li>
          <li><b>R</b> 重新开始 · <b>Esc</b> 暂停</li>
          <li>手机：直接点屏幕下方的虚拟按键</li>
        </ul>
        <p class="hint">
          下方方向盘指示器实时显示你的打轮角度——转弯时盯着它练"打多少、回多少"。
        </p>
      </div>
    </section>

    <section v-else class="stage-wrap">
      <div class="stage">
        <canvas ref="canvasEl"></canvas>

        <div class="hud-top">
          <div class="task">
            <strong>{{ hud.taskText }}</strong>
            <span>{{ hud.taskHint }}</span>
            <em v-if="hud.progressText">{{ hud.progressText }}</em>
          </div>
          <div class="score">{{ hud.score }}<i>分</i></div>
        </div>

        <div class="toasts">
          <p v-for="t in toasts" :key="t.id" :class="t.kind">{{ t.text }}</p>
        </div>

        <div class="dash">
          <div class="signal-box">
            <span class="sig" :class="{ on: hud.signal === 'left' }">◀</span>
            <span class="sig" :class="{ on: hud.signal === 'right' }">▶</span>
          </div>
          <div class="wheel-box">
            <svg ref="wheelEl" viewBox="0 0 100 100" class="wheel">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#2b2f36" stroke-width="11" />
              <path
                d="M50 52 L16 40 M50 52 L84 40 M50 52 L50 88"
                stroke="#2b2f36"
                stroke-width="9"
                stroke-linecap="round"
              />
              <circle cx="50" cy="50" r="11" fill="#2b2f36" />
              <circle cx="50" cy="22" r="4" fill="#d94f43" />
            </svg>
          </div>
          <div class="speed-box">
            <strong>{{ Math.round(hud.speed || 0) }}</strong>
            <span>km/h</span>
            <em>{{ hud.gear || 'N' }}</em>
          </div>
        </div>

        <div class="toolbar">
          <button @click="togglePause">⏸ 暂停</button>
          <button @click="restart">↻ 重开</button>
          <button class="exit" @click="exitToMenu">菜单</button>
          <button class="sound" @click="soundOn = !soundOn">
            {{ soundOn ? '🔊' : '🔇' }}
          </button>
        </div>

        <div class="touch">
          <div class="t-left">
            <button
              class="big"
              @pointerdown.prevent="touch.steer = -1"
              @pointerup.prevent="touch.steer = 0"
              @pointerleave="touch.steer = 0"
              @pointercancel="touch.steer = 0"
            >
              ◀
            </button>
            <button
              class="big"
              @pointerdown.prevent="touch.steer = 1"
              @pointerup.prevent="touch.steer = 0"
              @pointerleave="touch.steer = 0"
              @pointercancel="touch.steer = 0"
            >
              ▶
            </button>
          </div>
          <div class="t-mid">
            <button
              class="lamp"
              @pointerdown.prevent="toggleSignal('left')"
            >
              ◀ 灯
            </button>
            <button
              class="lamp"
              @pointerdown.prevent="toggleSignal('right')"
            >
              灯 ▶
            </button>
          </div>
          <div class="t-right">
            <button
              class="big brake"
              @pointerdown.prevent="touch.brake = 1"
              @pointerup.prevent="touch.brake = 0"
              @pointerleave="touch.brake = 0"
              @pointercancel="touch.brake = 0"
            >
              刹
            </button>
            <button
              class="big gas"
              @pointerdown.prevent="touch.throttle = 1"
              @pointerup.prevent="touch.throttle = 0"
              @pointerleave="touch.throttle = 0"
              @pointercancel="touch.throttle = 0"
            >
              油
            </button>
          </div>
        </div>

        <div v-if="paused && !result" class="overlay">
          <div class="panel">
            <h2>⏸ 已暂停</h2>
            <p>当前：{{ mode?.name }} · {{ hud.score }} 分</p>
            <div class="row">
              <button class="primary" @click="togglePause">继续（Esc）</button>
              <button @click="restart">重开（R）</button>
              <button @click="exitToMenu">返回菜单</button>
            </div>
          </div>
        </div>

        <div v-if="result" class="overlay result">
          <div class="panel">
            <div class="grade" :class="gradeClass">{{ result.grade }}</div>
            <h2>{{ result.reason }}</h2>
            <p class="score-line">
              得分 <b>{{ result.score }}</b>
              <span v-if="result.isBest" class="new-best">🎉 新纪录</span>
              <span v-else-if="best[sessionRef.modeId] !== undefined">
                历史最佳 {{ best[sessionRef.modeId] }}
              </span>
              <span class="dur">用时 {{ formatDuration(result.duration) }}</span>
            </p>
            <div class="comments">
              <p v-for="(c, i) in result.comments" :key="i">💡 {{ c }}</p>
            </div>
            <div class="penalty-list" v-if="result.penalties.length">
              <h3>扣分明细</h3>
              <p v-for="(p, i) in result.penalties" :key="i">
                <span>{{ formatDuration(p.t) }}</span>
                <em>-{{ p.pts }}</em>
                {{ p.text }}
              </p>
            </div>
            <p v-else class="clean">全程零扣分，教科书式操作 👏</p>
            <div class="row">
              <button class="primary" @click="restart">再来一次</button>
              <button @click="exitToMenu">换个模式</button>
            </div>
          </div>
        </div>
      </div>

      <p class="stage-hint">
        {{ mode?.name }}：{{ mode?.tip }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.driving {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.back {
  font-size: 14px;
}

.top h1 {
  margin: 14px 0 6px;
  font-size: 30px;
}

.subtitle {
  margin: 0 0 28px;
  color: var(--color-muted);
}

.modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
}

.mode-card {
  position: relative;
  text-align: left;
  padding: 22px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  font: inherit;
  color: var(--color-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.mode-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

.mode-card .emoji {
  font-size: 34px;
}

.mode-card h2 {
  font-size: 18px;
  margin: 10px 0 8px;
}

.mode-card .desc {
  font-size: 14px;
  margin: 0 0 8px;
  color: var(--color-text);
}

.mode-card .tip {
  font-size: 13px;
  margin: 0;
  color: var(--color-muted);
}

.mode-card .best {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 12px;
  color: var(--color-primary);
  background: rgba(47, 111, 237, 0.08);
  padding: 3px 8px;
  border-radius: 10px;
}

.help-card {
  grid-column: 1 / -1;
  padding: 20px 24px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.help-card h2 {
  font-size: 17px;
  margin: 0 0 10px;
}

.help-card ul {
  margin: 0;
  padding-left: 20px;
  font-size: 14px;
  color: var(--color-text);
}

.help-card li {
  margin: 4px 0;
}

.help-card .hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--color-primary);
}

.stage-wrap {
  margin-top: 4px;
}

.stage {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  background: #8aa06e;
  box-shadow: var(--shadow-card);
  user-select: none;
}

.stage canvas {
  display: block;
  width: 100%;
  height: min(62vh, 560px);
  min-height: 380px;
}

.stage-hint {
  margin: 12px 2px 0;
  font-size: 13px;
  color: var(--color-muted);
}

.hud-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(20, 24, 30, 0.55), transparent);
  pointer-events: none;
}

.task {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #fff;
  max-width: 70%;
}

.task strong {
  font-size: 17px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.task span {
  font-size: 13px;
  opacity: 0.92;
}

.task em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.75;
}

.score {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.score i {
  font-style: normal;
  font-size: 13px;
  font-weight: 400;
  margin-left: 3px;
  opacity: 0.8;
}

.toasts {
  position: absolute;
  left: 50%;
  top: 72px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.toasts p {
  margin: 0;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 14px;
  color: #fff;
  animation: toast-in 0.2s ease;
}

.toasts p.bad {
  background: rgba(196, 58, 42, 0.9);
}

.toasts p.good {
  background: rgba(46, 138, 84, 0.9);
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.dash {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 18px;
  pointer-events: none;
}

.signal-box {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(20, 24, 30, 0.6);
}

.sig {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.3);
}

.sig.on {
  color: #ffb020;
  animation: blink 0.9s step-end infinite;
}

.wheel-box {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  background: rgba(20, 24, 30, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.wheel {
  width: 58px;
  height: 58px;
  transition: none;
}

.speed-box {
  min-width: 74px;
  text-align: center;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(20, 24, 30, 0.6);
  color: #fff;
}

.speed-box strong {
  font-size: 24px;
  display: block;
  line-height: 1.1;
}

.speed-box span {
  font-size: 11px;
  opacity: 0.75;
}

.speed-box em {
  font-style: normal;
  font-size: 12px;
  opacity: 0.9;
}

@keyframes blink {
  50% {
    opacity: 0.25;
  }
}

.toolbar {
  position: absolute;
  top: 64px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toolbar button {
  padding: 6px 12px;
  font-size: 13px;
  border: none;
  border-radius: 8px;
  background: rgba(20, 24, 30, 0.65);
  color: #fff;
  cursor: pointer;
}

.toolbar button:hover {
  background: rgba(40, 48, 60, 0.85);
}

.touch {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: none;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 14px 14px;
  pointer-events: none;
}

.touch > div {
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.touch button {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: none;
  font-size: 20px;
  color: #fff;
  background: rgba(20, 24, 30, 0.55);
  touch-action: none;
}

.touch button.lamp {
  width: auto;
  height: 40px;
  border-radius: 14px;
  font-size: 13px;
  padding: 0 10px;
  align-self: flex-end;
}

.touch button.gas {
  background: rgba(46, 138, 84, 0.75);
}

.touch button.brake {
  background: rgba(196, 58, 42, 0.75);
}

.touch .t-mid {
  align-self: flex-end;
  margin-bottom: 62px;
}

@media (pointer: coarse) {
  .touch {
    display: flex;
  }

  .dash {
    bottom: 84px;
  }
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 18, 24, 0.62);
  backdrop-filter: blur(2px);
  padding: 20px;
}

.overlay .panel {
  width: min(440px, 92%);
  max-height: 88%;
  overflow: auto;
  background: #fff;
  border-radius: 14px;
  padding: 24px 26px;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
  text-align: center;
}

.overlay h2 {
  margin: 8px 0 6px;
  font-size: 20px;
}

.overlay .panel > p {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0 0 12px;
}

.grade {
  width: 74px;
  height: 74px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 800;
  color: #fff;
}

.grade-s {
  background: linear-gradient(135deg, #f6b73c, #d97706);
}

.grade-a {
  background: linear-gradient(135deg, #34d399, #059669);
}

.grade-b {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
}

.grade-c {
  background: linear-gradient(135deg, #fbbf24, #b45309);
}

.grade-d {
  background: linear-gradient(135deg, #f87171, #b91c1c);
}

.score-line {
  font-size: 15px;
}

.score-line b {
  font-size: 22px;
  color: var(--color-text);
}

.new-best {
  color: #d97706;
  font-size: 13px;
  margin-left: 8px;
}

.dur {
  display: block;
  font-size: 13px;
  color: var(--color-muted);
  margin-top: 2px;
}

.comments {
  text-align: left;
  background: #f6f8fa;
  border-radius: 10px;
  padding: 10px 14px;
  margin: 10px 0;
}

.comments p {
  margin: 4px 0;
  font-size: 13px;
}

.penalty-list {
  text-align: left;
  max-height: 150px;
  overflow: auto;
  border-top: 1px dashed var(--color-border);
  padding-top: 8px;
}

.penalty-list h3 {
  font-size: 13px;
  margin: 0 0 6px;
  color: var(--color-muted);
}

.penalty-list p {
  margin: 3px 0;
  font-size: 13px;
}

.penalty-list span {
  color: var(--color-muted);
  font-size: 12px;
  margin-right: 8px;
}

.penalty-list em {
  font-style: normal;
  color: #c43a2a;
  font-weight: 700;
  margin-right: 8px;
}

.clean {
  color: #059669;
  font-size: 14px;
}

.overlay .row {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 14px;
  flex-wrap: wrap;
}

.overlay .row button {
  padding: 9px 18px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.overlay .row button:hover {
  box-shadow: var(--shadow-card);
}

.overlay .row .primary {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
</style>
