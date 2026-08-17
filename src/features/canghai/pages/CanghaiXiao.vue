<template>
  <div class="canghai-page">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <h1 class="title">🌊 沧海一声笑</h1>
    <p class="subtitle">
      五弦古琴，和一曲《沧海一声笑》。音符落至玉轴时按 <kbd>D</kbd> <kbd>F</kbd> <kbd>G</kbd> <kbd>J</kbd> <kbd>K</kbd> 拨弦
      （触屏可直接点弦），看你能奏出何等境界。
    </p>

    <div class="game" ref="gameRef">
      <!-- 水墨场景 -->
      <svg class="scene" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a0e22" />
            <stop offset="55%" stop-color="#1a2544" />
            <stop offset="80%" stop-color="#3a4a6a" />
            <stop offset="100%" stop-color="#5a6a82" />
          </linearGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(255,245,210,0.9)" />
            <stop offset="45%" stop-color="rgba(255,240,190,0.35)" />
            <stop offset="100%" stop-color="rgba(255,240,190,0)" />
          </radialGradient>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1b2c44" />
            <stop offset="100%" stop-color="#070d18" />
          </linearGradient>
        </defs>

        <rect width="1000" height="560" fill="url(#sky)" />

        <!-- 明月 -->
        <circle cx="780" cy="130" r="120" fill="url(#moonGlow)" />
        <circle cx="780" cy="130" r="52" fill="#f6efd6" />
        <circle cx="762" cy="118" r="9" fill="#e6dec0" opacity="0.5" />
        <circle cx="795" cy="142" r="6" fill="#e6dec0" opacity="0.4" />

        <!-- 远山 -->
        <path d="M0,360 L120,300 L210,340 L320,280 L430,330 L520,290 L640,340 L760,300 L880,335 L1000,300 L1000,560 L0,560 Z"
              fill="#141d33" opacity="0.7" />
        <path d="M0,400 L90,360 L200,395 L310,350 L420,390 L540,355 L660,400 L780,360 L900,395 L1000,370 L1000,560 L0,560 Z"
              fill="#0c1426" opacity="0.85" />

        <!-- 海面 -->
        <rect x="0" y="405" width="1000" height="155" fill="url(#sea)" />

        <!-- 波浪（三层，CSS 横向平移） -->
        <g class="wave-layer wave-1">
          <path :d="wavePath" transform="translate(0,405)" fill="#1a3150" opacity="0.7" />
          <path :d="wavePath" transform="translate(1200,405)" fill="#1a3150" opacity="0.7" />
        </g>
        <g class="wave-layer wave-2">
          <path :d="wavePath" transform="translate(0,425)" fill="#0f2238" opacity="0.8" />
          <path :d="wavePath" transform="translate(1200,425)" fill="#0f2238" opacity="0.8" />
        </g>
        <g class="wave-layer wave-3">
          <path :d="wavePath" transform="translate(0,448)" fill="#081424" />
          <path :d="wavePath" transform="translate(1200,448)" fill="#081424" />
        </g>

        <!-- 飘雾 -->
        <ellipse class="mist mist-1" cx="200" cy="395" rx="220" ry="26" fill="rgba(220,230,245,0.12)" />
        <ellipse class="mist mist-2" cx="700" cy="405" rx="280" ry="22" fill="rgba(220,230,245,0.10)" />

        <!-- 礁石与剑客（右下剪影） -->
        <g transform="translate(800,0)">
          <path d="M-20,470 Q40,430 120,455 L260,470 L260,560 L-20,560 Z" fill="#070b14" />
          <path d="M150,470 Q160,460 150,448 L130,400 L150,380 L170,400 L150,448 Q140,460 150,470 Z" fill="#070b14" />
          <!-- 剑客 -->
          <g transform="translate(150,470)">
            <!-- 斗笠 -->
            <path d="M-26,-130 Q0,-150 26,-130 L34,-124 L-34,-124 Z" fill="#050810" />
            <ellipse cx="0" cy="-124" rx="36" ry="6" fill="#050810" />
            <!-- 头 -->
            <circle cx="0" cy="-112" r="9" fill="#0a0f1c" />
            <!-- 身体 / 披风 -->
            <path d="M-13,-104 Q-22,-60 -30,-10 L-18,-6 Q-6,-50 0,-72 Q6,-50 18,-6 L30,-10 Q22,-60 13,-104 Z" fill="#070b14" />
            <!-- 手臂与长剑 -->
            <path d="M8,-100 L26,-96 L30,-90 L12,-96 Z" fill="#070b14" />
            <line x1="28" y1="-94" x2="60" y2="-180" stroke="#1a2a44" stroke-width="3.5" stroke-linecap="round" />
            <line x1="28" y1="-94" x2="60" y2="-180" stroke="#dfe9fb" stroke-width="1" stroke-linecap="round" opacity="0.7" />
            <!-- 剑穗 -->
            <path d="M60,-180 q6,-6 0,-14 q-6,-8 0,-14" stroke="#c9302c" stroke-width="1.5" fill="none" />
            <!-- 腿 -->
            <path d="M-8,-12 L-14,28 L-4,30 L2,-10 Z" fill="#050810" />
            <path d="M8,-12 L16,28 L6,30 L0,-10 Z" fill="#050810" />
          </g>
        </g>

        <!-- 海面月光倒影 -->
        <rect x="700" y="408" width="160" height="150" fill="url(#moonGlow)" opacity="0.18" />
      </svg>

      <!-- 歌词书法 -->
      <div class="lyric-layer">
        <transition name="lyric" mode="out-in">
          <div class="lyric" :key="currentLyric">{{ currentLyric }}</div>
        </transition>
      </div>

      <!-- 静音 -->
      <button class="mute-btn" @click="toggleMute">{{ muted ? '🔇' : '🔊' }}</button>

      <!-- 游戏轨道 -->
      <div class="playfield" ref="fieldRef">
        <div class="lane" v-for="(name, i) in LANE_NAMES" :key="i"
             :class="{ flash: flashLane === i }"
             @pointerdown.prevent="onLanePress(i)">
          <div class="string"></div>
          <div class="lane-hit"></div>
          <div class="lane-label">{{ name }}<small>{{ LANE_KEYS[i].toUpperCase() }}</small></div>
        </div>
        <div class="judge-line">
          <span class="judge-jade" v-for="(name, i) in LANE_NAMES" :key="i" :class="{ glow: flashLane === i }"></span>
        </div>
        <div class="note" v-for="n in renderNotes" :key="n.id"
             :ref="el => setNoteRef(n.id, el)"
             :style="{ left: ((n.lane + 0.5) / 5 * 100) + '%' }">
          <span>{{ LANE_NAMES[n.lane] }}</span>
        </div>
      </div>

      <!-- HUD -->
      <div class="hud">
        <div class="hud-item"><span>分数</span><strong>{{ score }}</strong></div>
        <div class="hud-item combo" :class="{ hot: combo >= 10, fire: combo >= 25 }">
          <span>连击</span><strong>{{ combo }}</strong>
        </div>
        <div class="hud-item"><span>完美</span><strong class="perfect-c">{{ perfect }}</strong></div>
      </div>
      <div class="progress"><div class="progress-fill" ref="progressRef"></div></div>

      <!-- 开始遮罩 -->
      <div class="overlay" v-if="state === 'idle'">
        <div class="overlay-card">
          <h2>沧海一声笑</h2>
          <p class="verse">滔滔两岸潮 · 浮沉随浪记今朝</p>
          <p class="keys">
            拨弦键位
            <kbd>D</kbd><kbd>F</kbd><kbd>G</kbd><kbd>J</kbd><kbd>K</kbd>
            <span class="or">（宫 商 角 徵 羽）</span>
          </p>
          <button class="start-btn" @click="start">开始奏曲</button>
          <p class="hint">音乐由浏览器实时合成，不含任何音频文件；建议佩戴耳机。</p>
        </div>
      </div>

      <!-- 结算 -->
      <div class="overlay" v-if="state === 'finished'">
        <div class="overlay-card result">
          <h2>曲终</h2>
          <div class="rank" :class="rank.toLowerCase()">{{ rank }}</div>
          <div class="result-grid">
            <div><span>得分</span><strong>{{ score }}</strong></div>
            <div><span>最高连击</span><strong>{{ maxCombo }}</strong></div>
            <div><span>完美</span><strong class="perfect-c">{{ perfect }}</strong></div>
            <div><span>良好</span><strong class="good-c">{{ good }}</strong></div>
            <div><span>失手</span><strong class="miss-c">{{ missCount }}</strong></div>
            <div><span>准确率</span><strong>{{ accuracy }}%</strong></div>
          </div>
          <p class="rank-comment">{{ rankComment }}</p>
          <button class="start-btn" @click="start">再奏一曲</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { CanghaiAudio } from '../audio.js'
import { LANE_NAMES, LANE_KEYS, PHRASES, buildNoteList, TOTAL_BEATS } from '../data/melody.js'

const BPM = 72
const BEAT = 60 / BPM
const APPROACH = 1.8      // 音符从顶部落到判定线的时间（秒）
const PERFECT = 0.09
const GOOD = 0.17
const MISS_AFTER = 0.16   // 超过判定线多少秒算漏

const audio = new CanghaiAudio()
const allNotes = buildNoteList()

const state = ref('idle') // idle | playing | finished
const score = ref(0)
const combo = ref(0)
const maxCombo = ref(0)
const perfect = ref(0)
const good = ref(0)
const missCount = ref(0)
const renderNotes = ref([])
const currentLyric = ref('')
const flashLane = ref(-1)
const muted = ref(false)
const rank = ref('')
const accuracy = ref('0.0')
const rankComment = ref('')

const fieldRef = ref(null)
const progressRef = ref(null)
const noteEls = new Map()

let rafId = 0
let t0 = 0
let songStartTime = 0
let endTime = 0
let spawnCursor = 0
let lastPhrase = -1
let flashTimer = 0
let notesState = []

// 波浪路径（周期 50，宽 1200，双份拼接用于无缝横移）
const wavePath = (() => {
  let d = 'M0,30'
  for (let x = 50; x <= 1200; x += 50) d += ` T${x},30`
  d += ' L1200,90 L0,90 Z'
  return d
})()

function setNoteRef(id, el) {
  if (el) noteEls.set(id, el)
  else noteEls.delete(id)
}

async function start() {
  await audio.ensure()
  cancelAnimationFrame(rafId)
  clearTimeout(flashTimer)

  score.value = 0
  combo.value = 0
  maxCombo.value = 0
  perfect.value = 0
  good.value = 0
  missCount.value = 0
  currentLyric.value = PHRASES[0].lyric
  renderNotes.value = []
  noteEls.clear()
  flashLane.value = -1
  rank.value = ''
  accuracy.value = '0.0'

  const ctx = audio.ctx
  t0 = ctx.currentTime + 0.15
  songStartTime = t0 + APPROACH // 此时第一个音符正好敲响
  notesState = allNotes.map(n => ({
    ...n,
    hitTime: songStartTime + n.startBeat * BEAT,
    status: 'pending',
    judgedAt: 0
  }))
  endTime = songStartTime + TOTAL_BEATS * BEAT + 1.4

  audio.startDrone(t0)
  for (const n of notesState) {
    audio.pluck(n.pitch, n.hitTime, { dur: 2.1, gain: 0.42 })
  }

  state.value = 'playing'
  spawnCursor = 0
  lastPhrase = -1
  rafId = requestAnimationFrame(loop)
}

function loop() {
  rafId = requestAnimationFrame(loop)
  if (!audio.ctx) return
  const now = audio.ctx.currentTime
  const songTime = now - songStartTime
  const field = fieldRef.value
  const judgeY = field ? field.clientHeight * 0.82 : 400

  // 音符进入视野则加入渲染
  while (spawnCursor < notesState.length) {
    const n = notesState[spawnCursor]
    if (n.hitTime - now <= APPROACH) {
      if (n.status === 'pending') renderNotes.value.push(n)
      spawnCursor++
    } else break
  }

  // 逐帧更新位置 / 判定漏弹
  const remove = []
  for (let i = 0; i < renderNotes.value.length; i++) {
    const n = renderNotes.value[i]
    const el = noteEls.get(n.id)
    if (!el) continue
    const remaining = n.hitTime - now

    if (n.status === 'pending') {
      if (remaining <= -MISS_AFTER) {
        n.status = 'miss'
        n.judgedAt = now
        missCount.value++
        combo.value = 0
      } else {
        const y = (1 - remaining / APPROACH) * judgeY
        el.style.transform = `translate(-50%, ${y}px)`
        el.style.opacity = '1'
      }
    }

    if (n.status === 'hit') {
      const p = Math.min(1, (now - n.judgedAt) / 0.34)
      el.style.transform = `translate(-50%, ${judgeY}px) scale(${1 + p * 0.9})`
      el.style.opacity = String(1 - p)
      if (p >= 1) remove.push(i)
    } else if (n.status === 'miss') {
      const p = Math.min(1, (now - n.judgedAt) / 0.4)
      el.style.transform = `translate(-50%, ${judgeY + p * 46}px) scale(${1 - p * 0.3})`
      el.style.opacity = String(0.55 * (1 - p))
      if (p >= 1) remove.push(i)
    }
  }
  for (let i = remove.length - 1; i >= 0; i--) {
    const n = renderNotes.value[remove[i]]
    noteEls.delete(n.id)
    renderNotes.value.splice(remove[i], 1)
  }

  // 切换歌词
  const phraseIdx = Math.max(0, Math.min(PHRASES.length - 1, Math.floor(songTime / (4 * BEAT))))
  if (phraseIdx !== lastPhrase) {
    lastPhrase = phraseIdx
    currentLyric.value = PHRASES[phraseIdx].lyric
  }

  if (progressRef.value) {
    const p = Math.max(0, Math.min(1, songTime / (TOTAL_BEATS * BEAT)))
    progressRef.value.style.width = (p * 100) + '%'
  }

  if (now >= endTime) finish()
}

function onLanePress(lane) {
  if (state.value !== 'playing') return
  const now = audio.ctx.currentTime
  let best = null
  let bestAbs = Infinity
  for (const n of notesState) {
    if (n.lane !== lane || n.status !== 'pending') continue
    const abs = Math.abs(n.hitTime - now)
    if (abs <= GOOD && abs < bestAbs) {
      best = n
      bestAbs = abs
    }
  }

  if (best) {
    const isPerfect = bestAbs <= PERFECT
    if (isPerfect) perfect.value++
    else good.value++
    best.status = 'hit'
    best.judgedAt = now

    combo.value++
    maxCombo.value = Math.max(maxCombo.value, combo.value)
    const base = isPerfect ? 300 : 100
    score.value += base + Math.min(combo.value, 50) * 4

    audio.pluck(best.pitch, 0, { bright: 1, gain: 0.72, dur: 1.7 })
    flashLane.value = lane
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      if (flashLane.value === lane) flashLane.value = -1
    }, 140)
  } else {
    // 空弹：闷响，不扣分
    audio.thunk(['1', '2', '3', '5', '6'][lane], 0)
  }
}

function onKeyDown(e) {
  if (e.repeat) return
  const idx = LANE_KEYS.indexOf(e.key.toLowerCase())
  if (idx >= 0) {
    e.preventDefault()
    onLanePress(idx)
  } else if (e.key === ' ' && state.value !== 'playing') {
    e.preventDefault()
    start()
  }
}

function finish() {
  cancelAnimationFrame(rafId)
  state.value = 'finished'
  audio.stopDrone()
  const total = allNotes.length
  const weighted = perfect.value + good.value * 0.5
  const acc = total ? (weighted / total * 100) : 0
  accuracy.value = acc.toFixed(1)
  const r = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : acc >= 50 ? 'C' : 'D'
  rank.value = r
  rankComment.value = {
    S: '滔滔两岸潮，豪情满襟怀。',
    A: '仗剑行江湖，一曲动四方。',
    B: '风骨初成，尚欠几分火候。',
    C: '弦歌未绝，勤练可入佳境。',
    D: '琴声散乱，来日方长再试。'
  }[r]
}

function toggleMute() {
  muted.value = !muted.value
  audio.setMuted(muted.value)
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  cancelAnimationFrame(rafId)
  clearTimeout(flashTimer)
  audio.stopDrone()
})
</script>

<style scoped>
.canghai-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 20px 60px;
}

.back { color: var(--color-muted); font-size: 14px; }
.title {
  margin: 8px 0 4px;
  font-family: 'STKaiti', 'KaiTi', '楷体', 'Songti SC', serif;
  font-size: 34px;
  letter-spacing: 4px;
}
.subtitle { color: var(--color-muted); margin-top: 0; font-size: 14px; }
.subtitle kbd {
  display: inline-block;
  padding: 1px 7px;
  font-size: 12px;
  font-family: monospace;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-bottom-width: 2px;
  border-radius: 5px;
  margin: 0 1px;
}

/* 游戏容器 ------------------------------------------------- */
.game {
  position: relative;
  margin-top: 18px;
  width: 100%;
  height: min(62vh, 560px);
  min-height: 380px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  border: 1px solid var(--color-border);
  background: #0a0e22;
  user-select: none;
}

.scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

/* 波浪横移 */
.wave-layer {
  animation: waveDrift 14s linear infinite;
}
.wave-1 { animation-duration: 18s; opacity: 0.9; }
.wave-2 { animation-duration: 13s; animation-direction: reverse; }
.wave-3 { animation-duration: 9s; }
@keyframes waveDrift {
  from { transform: translateX(0); }
  to { transform: translateX(-1200px); }
}

/* 飘雾 */
.mist { animation: mistDrift 26s ease-in-out infinite alternate; }
.mist-2 { animation-duration: 34s; animation-direction: reverse; }
@keyframes mistDrift {
  from { transform: translateX(-40px); opacity: 0.06; }
  to { transform: translateX(40px); opacity: 0.16; }
}

/* 歌词 */
.lyric-layer {
  position: absolute;
  top: 8%;
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
  z-index: 3;
}
.lyric {
  display: inline-block;
  font-family: 'STKaiti', 'KaiTi', '楷体', 'Songti SC', serif;
  font-size: clamp(22px, 4.6vw, 40px);
  letter-spacing: 8px;
  color: rgba(245, 239, 214, 0.92);
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 240, 190, 0.25);
  padding: 0 16px;
}
.lyric-enter-active, .lyric-leave-active { transition: opacity 0.5s ease, transform 0.5s ease; }
.lyric-enter-from { opacity: 0; transform: translateY(10px); }
.lyric-leave-to { opacity: 0; transform: translateY(-10px); }

/* 静音按钮 */
.mute-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 6;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(10, 14, 34, 0.5);
  color: #f5efd6;
  font-size: 17px;
  cursor: pointer;
  backdrop-filter: blur(4px);
}
.mute-btn:hover { background: rgba(20, 28, 56, 0.7); }

/* 轨道 ----------------------------------------------------- */
.playfield {
  position: absolute;
  inset: 0;
  z-index: 2;
}

.lane {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20%;
  cursor: pointer;
}
.lane:nth-child(1) { left: 0; }
.lane:nth-child(2) { left: 20%; }
.lane:nth-child(3) { left: 40%; }
.lane:nth-child(4) { left: 60%; }
.lane:nth-child(5) { left: 80%; }

.string {
  position: absolute;
  top: 0;
  bottom: 14%;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 245, 210, 0.28));
  transform: translateX(-50%);
}
.lane.flash .string {
  background: linear-gradient(180deg, rgba(255, 245, 210, 0.2), rgba(255, 220, 130, 0.9));
  box-shadow: 0 0 14px rgba(255, 220, 130, 0.7);
  animation: stringVibrate 0.14s ease;
}
@keyframes stringVibrate {
  0%, 100% { transform: translateX(-50%); }
  25% { transform: translateX(calc(-50% + 2px)); }
  75% { transform: translateX(calc(-50% - 2px)); }
}

.lane-hit {
  position: absolute;
  left: 10%;
  right: 10%;
  bottom: 14%;
  height: 60%;
  border-radius: 6px;
  background: linear-gradient(180deg, transparent, rgba(255, 245, 210, 0.05));
  transition: background 0.12s ease;
}
.lane.flash .lane-hit {
  background: linear-gradient(180deg, transparent, rgba(255, 220, 130, 0.18));
}

.lane-label {
  position: absolute;
  bottom: 4%;
  left: 0;
  right: 0;
  text-align: center;
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 20px;
  color: rgba(245, 239, 214, 0.55);
  pointer-events: none;
}
.lane-label small {
  display: block;
  font-family: monospace;
  font-size: 11px;
  color: rgba(245, 239, 214, 0.4);
  margin-top: 2px;
}

/* 判定线 */
.judge-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 82%;
  height: 2px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, rgba(255, 240, 190, 0.5), transparent);
  display: flex;
  justify-content: space-around;
  pointer-events: none;
}
.judge-jade {
  width: 36px;
  height: 14px;
  border-radius: 50%;
  transform: translateY(-6px);
  background: radial-gradient(circle, rgba(255, 245, 210, 0.5), rgba(255, 245, 210, 0.05));
  border: 1px solid rgba(255, 245, 210, 0.25);
}
.judge-jade.glow {
  background: radial-gradient(circle, #fff3c4, rgba(255, 210, 120, 0.4));
  box-shadow: 0 0 18px rgba(255, 220, 130, 0.9);
}

/* 音符 */
.note {
  position: absolute;
  top: 0;
  width: 40px;
  height: 40px;
  transform: translate(-50%, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  will-change: transform, opacity;
}
.note span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 17px;
  color: #2a1a08;
  background: radial-gradient(circle at 35% 30%, #fff3c4, #f2c14e 60%, #b8862a);
  box-shadow:
    0 0 12px rgba(255, 210, 120, 0.7),
    inset 0 -3px 6px rgba(120, 70, 10, 0.4);
  border: 1px solid rgba(255, 245, 210, 0.6);
}

/* HUD ------------------------------------------------------ */
.hud {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
  display: flex;
  gap: 10px;
}
.hud-item {
  background: rgba(10, 14, 34, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 6px 14px;
  backdrop-filter: blur(4px);
  text-align: center;
}
.hud-item span { display: block; font-size: 11px; color: rgba(245, 239, 214, 0.6); }
.hud-item strong {
  display: block;
  font-size: 22px;
  color: #f5efd6;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.hud-item.combo strong { color: #ffd166; }
.hud-item.combo.hot strong { text-shadow: 0 0 14px rgba(255, 180, 80, 0.8); }
.hud-item.combo.fire strong { color: #ff8a5b; animation: comboFire 0.3s ease infinite alternate; }
@keyframes comboFire {
  from { text-shadow: 0 0 12px rgba(255, 140, 60, 0.7); transform: scale(1); }
  to { text-shadow: 0 0 22px rgba(255, 90, 40, 0.9); transform: scale(1.08); }
}
.perfect-c { color: #ffd166 !important; }

.progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  z-index: 5;
}
.progress-fill {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, #f2c14e, #ffd166);
  box-shadow: 0 0 10px rgba(255, 210, 120, 0.7);
  transition: width 0.1s linear;
}

/* 遮罩 ----------------------------------------------------- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(120% 90% at 50% 30%, rgba(10, 14, 34, 0.55), rgba(5, 8, 16, 0.88));
  backdrop-filter: blur(2px);
  padding: 20px;
}
.overlay-card {
  text-align: center;
  color: #f5efd6;
  max-width: 420px;
}
.overlay-card h2 {
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 40px;
  letter-spacing: 8px;
  margin: 0 0 8px;
  text-shadow: 0 2px 20px rgba(255, 220, 130, 0.4);
}
.verse {
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 17px;
  color: rgba(245, 239, 214, 0.75);
  letter-spacing: 3px;
  margin: 0 0 22px;
}
.keys { margin: 0 0 22px; font-size: 14px; color: rgba(245, 239, 214, 0.8); }
.keys kbd {
  display: inline-block;
  padding: 3px 9px;
  margin: 0 2px;
  font-family: monospace;
  font-size: 14px;
  color: #2a1a08;
  background: linear-gradient(180deg, #fff3c4, #f2c14e);
  border-radius: 6px;
  box-shadow: 0 2px 0 #a87820;
}
.keys .or { color: rgba(245, 239, 214, 0.55); margin-left: 8px; font-size: 12px; }

.start-btn {
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 20px;
  letter-spacing: 6px;
  padding: 12px 38px;
  border: none;
  border-radius: 30px;
  color: #2a1a08;
  background: linear-gradient(180deg, #ffe9a8, #f2c14e);
  box-shadow: 0 6px 20px rgba(255, 200, 80, 0.4), inset 0 -3px 0 rgba(150, 100, 20, 0.3);
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.start-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(255, 200, 80, 0.55); }
.start-btn:active { transform: translateY(0); }

.hint { margin-top: 16px; font-size: 12px; color: rgba(245, 239, 214, 0.45); }

/* 结算 */
.rank {
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 84px;
  font-weight: 700;
  line-height: 1;
  margin: 4px 0 14px;
}
.rank.s { color: #ffd166; text-shadow: 0 0 30px rgba(255, 209, 102, 0.8); }
.rank.a { color: #9be7c0; text-shadow: 0 0 26px rgba(155, 231, 192, 0.6); }
.rank.b { color: #74c0fc; text-shadow: 0 0 24px rgba(116, 192, 252, 0.5); }
.rank.c { color: #c4c9d4; text-shadow: 0 0 20px rgba(196, 201, 212, 0.4); }
.rank.d { color: #ff8a8a; text-shadow: 0 0 20px rgba(255, 138, 138, 0.4); }

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}
.result-grid div {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
}
.result-grid span { display: block; font-size: 11px; color: rgba(245, 239, 214, 0.55); }
.result-grid strong { display: block; font-size: 20px; color: #f5efd6; font-variant-numeric: tabular-nums; }
.result-grid .good-c { color: #9be7c0; }
.result-grid .miss-c { color: #ff8a8a; }

.rank-comment {
  font-family: 'STKaiti', 'KaiTi', serif;
  font-size: 17px;
  letter-spacing: 3px;
  color: rgba(245, 239, 214, 0.8);
  margin: 6px 0 18px;
}

@media (max-width: 600px) {
  .game { height: 70vh; }
  .hud-item strong { font-size: 18px; }
  .note { width: 34px; height: 34px; }
  .note span { width: 30px; height: 30px; font-size: 14px; }
  .judge-jade { width: 28px; }
}
</style>
