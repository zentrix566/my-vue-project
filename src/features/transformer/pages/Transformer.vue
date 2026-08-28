<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 变形金刚 · 变形玩具
 * 一台方头方脑的机甲：机器人形态能踏步走路、跳跃、待机呼吸；
 * 按「变形」后每个零件按各自的节拍滑移翻折，1.5 秒拼成一辆跑车，
 * 能踩油门飙车、按喇叭，再按一下变回机器人。
 *
 * 实现要点：
 * - 全部零件（躯干/头/双臂/双腿/靴子/骨盆/四轮）各带「机器人 / 跑车」两组关键帧
 *   （中心 x/y + 宽高），变形时对关键帧逐件插值，错峰延迟制造「逐件咔咔翻折」的机械感；
 * - 零件先画跑车底色，再以 robotA / carA 两个透明度分别叠机器人细节（面甲、胸窗、拳头）
 *   与跑车细节（车窗、车门缝、头灯尾灯），两个透明度窗口错开、不会同时半透明；
 * - 绘制顺序在变形中点（T=0.5）从「机器人序」切换到「跑车序」，
 *   此时零件都在半空翻飞，换序不易察觉；
 * - 走路用「踏步摇摆」（双腿交替起落 + 躯干起伏）表现玩具感；
 *   跑车行驶时车轮按里程自转、车身微颤、车尾冒废气，跳跃落地与行驶都会扬灰。
 */

const W = 1000
const H = 560
const GROUND = 500 // 路面顶部，机甲落地线
const DUR = 1.5 // 变形全程秒数

// ---------- 涂装 ----------

const PAINTS = [
  { name: '大黄蜂', body: '#f6c437', dark: '#2a2e35', accent: '#1c1f24', glass: '#b5e3ff', metal: '#c7cdd4', light: '#ffdf7e' },
  { name: '擎天柱', body: '#c63d2f', dark: '#274a7a', accent: '#e9edf2', glass: '#a8d8ff', metal: '#b7bec7', light: '#ffe18a' },
  { name: '警车', body: '#eef1f4', dark: '#23272e', accent: '#2e6fdb', glass: '#b5e3ff', metal: '#a8b0ba', light: '#ffe18a' },
  { name: '横炮', body: '#cdd4db', dark: '#8e1f24', accent: '#2a2e35', glass: '#b5e3ff', metal: '#c7cdd4', light: '#ffe18a' }
]

const paintIdx = ref(0)
const paintName = computed(() => PAINTS[paintIdx.value].name)

// ---------- 小工具 ----------

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
// easeInOutCubic：起步缓、收尾缓，机械翻折的关键手感
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

function rr(c, x, y, w, h, r) {
  c.beginPath()
  if (c.roundRect) c.roundRect(x, y, w, h, r)
  else c.rect(x, y, w, h)
}

// ---------- 零件定义 ----------
// rb/cr：机器人/跑车形态的关键帧（中心坐标 + 宽高），d：变形延迟（0 最先动）

const PARTS = [
  {
    id: 'wheelBackL', d: 0.16,
    rb: { x: -64, y: 380, w: 40, h: 40 },
    cr: { x: -105, y: 476, w: 48, h: 48 },
    draw(c, p, s) { drawWheel(c, p, s) }
  },
  {
    id: 'wheelBackR', d: 0.16,
    rb: { x: 64, y: 380, w: 40, h: 40 },
    cr: { x: 105, y: 476, w: 48, h: 48 },
    draw(c, p, s) { drawWheel(c, p, s) }
  },
  {
    id: 'wheelLegL', d: 0.16,
    rb: { x: -40, y: 470, w: 40, h: 40 },
    cr: { x: -105, y: 476, w: 48, h: 48 },
    draw(c, p, s) { drawWheel(c, p, s) }
  },
  {
    id: 'wheelLegR', d: 0.16,
    rb: { x: 40, y: 470, w: 40, h: 40 },
    cr: { x: 105, y: 476, w: 48, h: 48 },
    draw(c, p, s) { drawWheel(c, p, s) }
  },
  {
    id: 'legL', d: 0.03,
    rb: { x: -24, y: 465, w: 40, h: 50 },
    cr: { x: -60, y: 476, w: 120, h: 26 },
    draw(c, p, s) { drawLeg(c, p, s) }
  },
  {
    id: 'legR', d: 0.03,
    rb: { x: 24, y: 465, w: 40, h: 50 },
    cr: { x: 60, y: 476, w: 120, h: 26 },
    draw(c, p, s) { drawLeg(c, p, s) }
  },
  {
    id: 'bootL', d: 0.03,
    rb: { x: -26, y: 493, w: 52, h: 14 },
    cr: { x: -100, y: 489, w: 70, h: 10 },
    draw(c, p, s) { drawBoot(c, p, s) }
  },
  {
    id: 'bootR', d: 0.03,
    rb: { x: 26, y: 493, w: 52, h: 14 },
    cr: { x: 100, y: 489, w: 70, h: 10 },
    draw(c, p, s) { drawBoot(c, p, s) }
  },
  {
    id: 'armL', d: 0.12, // 后保险杠
    rb: { x: -84, y: 359, w: 34, h: 98 },
    cr: { x: -150, y: 462, w: 90, h: 40 },
    draw(c, p, s) { drawArm(c, p, s, false) }
  },
  {
    id: 'armR', d: 0.12, // 前保险杠
    rb: { x: 84, y: 359, w: 34, h: 98 },
    cr: { x: 152, y: 464, w: 92, h: 38 },
    draw(c, p, s) { drawArm(c, p, s, true) }
  },
  {
    id: 'torso', d: 0,
    rb: { x: 0, y: 363, w: 132, h: 97 },
    cr: { x: 0, y: 438, w: 340, h: 62 },
    draw(c, p, s) { drawTorso(c, p, s) }
  },
  {
    id: 'pelvis', d: 0.08,
    rb: { x: 0, y: 429, w: 92, h: 32 },
    cr: { x: -8, y: 392, w: 150, h: 46 },
    draw(c, p, s) { drawPelvis(c, p, s) }
  },
  {
    id: 'head', d: 0.24, // 头最后落下，砸成尾翼
    rb: { x: 0, y: 295, w: 56, h: 46 },
    cr: { x: -140, y: 403, w: 44, h: 7 },
    draw(c, p, s) { drawHead(c, p, s) }
  }
]

const byId = Object.fromEntries(PARTS.map((p) => [p.id, p]))

// 机器人形态从后往前画（车轮藏在躯干/腿后），跑车形态先画底盘再画车身，
// 变形到一半（T=0.5）时零件都在半空翻飞，此时换序不易察觉
const ROBOT_ORDER = ['wheelBackL', 'wheelBackR', 'wheelLegL', 'wheelLegR', 'armL', 'armR', 'legL', 'legR', 'bootL', 'bootR', 'pelvis', 'torso', 'head']
const CAR_ORDER = ['wheelBackL', 'wheelBackR', 'legL', 'legR', 'bootL', 'bootR', 'armL', 'armR', 'torso', 'pelvis', 'wheelLegL', 'wheelLegR', 'head']

// ---------- 零件绘制 ----------

function drawWheel(c, p, s) {
  const r = p.w / 2
  c.save()
  c.translate(p.x, p.y)
  c.fillStyle = '#22262b'
  c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill()
  c.fillStyle = s.P.metal
  c.beginPath(); c.arc(0, 0, r * 0.58, 0, Math.PI * 2); c.fill()
  // 五根辐条，随行驶里程自转
  c.strokeStyle = '#39404a'
  c.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    const a = s.spin + (i * Math.PI * 2) / 5
    c.beginPath()
    c.moveTo(Math.cos(a) * r * 0.14, Math.sin(a) * r * 0.14)
    c.lineTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52)
    c.stroke()
  }
  c.fillStyle = s.P.accent
  c.beginPath(); c.arc(0, 0, r * 0.16, 0, Math.PI * 2); c.fill()
  c.restore()
}

function drawLeg(c, p, s) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.dark // 跑车底盘作底
  rr(c, x, y, p.w, p.h, 10); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    c.fillStyle = s.P.body
    rr(c, x, y, p.w, p.h, 10); c.fill()
    // 膝盖横槽
    c.fillStyle = s.P.dark
    rr(c, x + 3, y + p.h * 0.34, p.w - 6, 5, 2); c.fill()
    // 胫部竖条
    c.fillStyle = s.P.accent
    rr(c, p.x - 4, y + p.h * 0.46, 8, p.h * 0.42, 3); c.fill()
    c.globalAlpha = 1
  }
  if (s.carA > 0) {
    c.globalAlpha = s.carA
    c.fillStyle = 'rgba(0,0,0,0.3)'
    rr(c, x + p.w * 0.1, y + p.h * 0.25, p.w * 0.8, 5, 2); c.fill()
    c.globalAlpha = 1
  }
}

function drawBoot(c, p, s) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.dark
  rr(c, x, y, p.w, p.h, 6); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    c.fillStyle = s.P.metal // 靴头在朝向前方的一侧
    rr(c, x + p.w * 0.45, y + 2, p.w * 0.52, p.h - 4, 5); c.fill()
    c.globalAlpha = 1
  }
}

function drawArm(c, p, s, front) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.dark
  rr(c, x, y, p.w, p.h, 12); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    // 肩甲
    c.fillStyle = s.P.body
    rr(c, x, y, p.w, p.h * 0.3, 10); c.fill()
    // 肘线
    c.strokeStyle = 'rgba(0,0,0,0.4)'
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(x + 4, y + p.h * 0.54)
    c.lineTo(x + p.w - 4, y + p.h * 0.54)
    c.stroke()
    // 拳头
    c.fillStyle = s.P.metal
    rr(c, x + 2, y + p.h * 0.8, p.w - 4, p.h * 0.18, 5); c.fill()
    c.globalAlpha = 1
  }
  if (s.carA > 0) {
    c.globalAlpha = s.carA
    if (front) {
      // 前保险杠：大灯 + 进气口
      c.fillStyle = s.P.light
      rr(c, x + p.w * 0.7, y + p.h * 0.18, p.w * 0.24, p.h * 0.3, 5); c.fill()
      c.fillStyle = 'rgba(255,255,255,0.75)'
      rr(c, x + p.w * 0.72, y + p.h * 0.22, p.w * 0.1, p.h * 0.14, 3); c.fill()
      c.fillStyle = 'rgba(0,0,0,0.35)'
      rr(c, x + p.w * 0.66, y + p.h * 0.62, p.w * 0.3, p.h * 0.22, 4); c.fill()
    } else {
      // 后保险杠：尾灯 + 排气管
      c.fillStyle = '#d64545'
      rr(c, x, y + p.h * 0.18, p.w * 0.22, p.h * 0.28, 4); c.fill()
      c.fillStyle = s.P.metal
      c.fillRect(x + p.w * 0.55, y + p.h * 0.66, 16, 7)
      c.fillRect(x + p.w * 0.75, y + p.h * 0.66, 16, 7)
    }
    c.globalAlpha = 1
  }
}

function drawTorso(c, p, s) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.body
  rr(c, x, y, p.w, p.h, 14); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    // 胸口双窗（与跑车的座舱玻璃一脉相承）
    c.fillStyle = s.P.dark
    rr(c, x + p.w * 0.15, y + p.h * 0.13, p.w * 0.32, p.h * 0.36, 7); c.fill()
    rr(c, x + p.w * 0.53, y + p.h * 0.13, p.w * 0.32, p.h * 0.36, 7); c.fill()
    c.fillStyle = s.P.glass
    rr(c, x + p.w * 0.17, y + p.h * 0.15, p.w * 0.28, p.h * 0.32, 5); c.fill()
    rr(c, x + p.w * 0.55, y + p.h * 0.15, p.w * 0.28, p.h * 0.32, 5); c.fill()
    // 能量核心
    c.fillStyle = s.P.accent
    c.beginPath(); c.arc(p.x, y + p.h * 0.64, p.w * 0.06, 0, Math.PI * 2); c.fill()
    // 腰带
    c.fillStyle = s.P.dark
    rr(c, x + 3, y + p.h * 0.8, p.w - 6, p.h * 0.17, 6); c.fill()
    c.globalAlpha = 1
  }
  if (s.carA > 0) {
    c.globalAlpha = s.carA
    // 侧面饰条
    c.fillStyle = s.P.accent
    rr(c, x + p.w * 0.06, y + p.h * 0.52, p.w * 0.88, p.h * 0.16, 5); c.fill()
    // 车门缝与把手
    c.strokeStyle = 'rgba(0,0,0,0.32)'
    c.lineWidth = 2
    for (const fx of [0.3, 0.62]) {
      c.beginPath()
      c.moveTo(x + p.w * fx, y + 8)
      c.lineTo(x + p.w * fx, y + p.h - 8)
      c.stroke()
    }
    c.fillStyle = s.P.metal
    rr(c, x + p.w * 0.34, y + p.h * 0.3, 16, 5, 2); c.fill()
    // 引擎盖散热孔
    c.fillStyle = 'rgba(0,0,0,0.26)'
    for (let i = 0; i < 3; i++) {
      rr(c, x + p.w * 0.74 + i * 13, y + 9, 7, 13, 2); c.fill()
    }
    c.globalAlpha = 1
  }
}

function drawPelvis(c, p, s) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.dark
  rr(c, x, y, p.w, p.h, 10); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    c.fillStyle = s.P.accent // 腰扣
    rr(c, p.x - 9, y + p.h * 0.3, 18, p.h * 0.4, 4); c.fill()
    c.globalAlpha = 1
  }
  if (s.carA > 0) {
    c.globalAlpha = s.carA
    c.fillStyle = s.P.glass
    // 前风挡（朝车头方向斜切）
    c.beginPath()
    c.moveTo(x + p.w * 0.6, y + p.h * 0.12)
    c.lineTo(x + p.w * 0.74, y + p.h * 0.12)
    c.lineTo(x + p.w * 0.9, y + p.h * 0.88)
    c.lineTo(x + p.w * 0.6, y + p.h * 0.88)
    c.closePath(); c.fill()
    // 两扇侧窗
    rr(c, x + p.w * 0.3, y + p.h * 0.14, p.w * 0.24, p.h * 0.72, 5); c.fill()
    rr(c, x + p.w * 0.06, y + p.h * 0.14, p.w * 0.17, p.h * 0.72, 5); c.fill()
    // B 柱
    c.fillStyle = s.P.dark
    c.fillRect(x + p.w * 0.56, y + 2, 5, p.h - 4)
    c.fillRect(x + p.w * 0.27, y + 2, 5, p.h - 4)
    c.globalAlpha = 1
  }
}

function drawHead(c, p, s) {
  const x = p.x - p.w / 2
  const y = p.y - p.h / 2
  c.fillStyle = s.P.accent // 跑车尾翼条作底
  rr(c, x, y, p.w, p.h, Math.min(4, p.h / 2)); c.fill()
  if (s.robotA > 0) {
    c.globalAlpha = s.robotA
    // 头盔 + 脸
    c.fillStyle = s.P.body
    rr(c, x, y, p.w, p.h, 8); c.fill()
    c.fillStyle = s.P.dark
    rr(c, x + p.w * 0.16, y + p.h * 0.42, p.w * 0.68, p.h * 0.58, 6); c.fill()
    // 天线耳
    c.fillRect(x - 6, y + p.h * 0.2, 6, 12)
    c.fillRect(x + p.w, y + p.h * 0.2, 6, 12)
    // 发光目镜
    c.save()
    c.shadowColor = s.P.glass
    c.shadowBlur = 8
    c.fillStyle = s.P.glass
    rr(c, x + p.w * 0.22, y + p.h * 0.5, p.w * 0.56, p.h * 0.16, 4); c.fill()
    c.restore()
    // 嘴格栅
    c.fillStyle = 'rgba(0,0,0,0.5)'
    for (let i = 0; i < 3; i++) c.fillRect(x + p.w * (0.3 + i * 0.15), y + p.h * 0.74, 3, p.h * 0.14)
    c.globalAlpha = 1
  }
  if (s.carA > 0) {
    c.globalAlpha = s.carA
    c.fillStyle = s.P.dark // 尾翼支柱
    c.fillRect(p.x - 3, y + p.h, 6, 4)
    c.globalAlpha = 1
  }
}

// ---------- 运行状态 ----------

let canvas = null
let ctx = null
let rafId = 0
let now = 0

let px = 500 // 机甲中心 x
let vx = 0
let facing = 1 // 1 朝右，-1 朝左
let T = 0 // 变形进度 0=机器人 1=跑车
let tTarget = 0
let phase = 0 // 踏步相位
let walkAmt = 0 // 走路幅度 0..1（平滑起落）
let jumpY = 0 // 跳跃离地高度（向上为正）
let jumpVy = 0
let airborne = false
let jumpQueued = false // 轻点触发的单次起跳（与按住 W 的连跳分开）
let spin = 0 // 车轮自转角
let dustAcc = 0

const modeLabel = ref('机器人形态')
const keys = { left: false, right: false, jump: false }

let particles = [] // {type:'dust'|'spark'|'text', x,y,vx,vy,age,life,color,size,text}

// ---------- 粒子 ----------

function addDust(x, y, n, spread, up) {
  for (let i = 0; i < n; i++) {
    particles.push({
      type: 'dust',
      x: x + (Math.random() - 0.5) * spread,
      y: y - Math.random() * 6,
      vx: (Math.random() - 0.5) * 60 - vx * 0.25,
      vy: -Math.random() * 50 - (up || 0),
      age: 0,
      life: 0.45 + Math.random() * 0.3,
      size: 2 + Math.random() * 3
    })
  }
}

function addSpark(x, y) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2
    const v = 120 + Math.random() * 220
    particles.push({
      type: 'spark',
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 120,
      age: 0,
      life: 0.4 + Math.random() * 0.35,
      color: Math.random() < 0.5 ? PAINTS[paintIdx.value].light : '#ffffff',
      size: 2 + Math.random() * 2.5
    })
  }
}

function addText(x, y, text, color) {
  particles.push({ type: 'text', x, y, vx: 0, vy: -46, age: 0, life: 1.1, text, color, size: 26 })
}

// ---------- 音效（Web Audio 实时合成，无音频文件） ----------
// 浏览器自动播放策略：AudioContext 必须在真实用户手势里解锁，
// 所以所有 keydown/pointerdown/按钮都会先调 ensureAudio；被手势直接触发的
// 音效（变形/喇叭/涂装）当场可响，rAF 里触发的（脚步/引擎）靠键盘手势早已解锁

const SOUND_KEY = 'transformer:sound'
const soundOn = ref(localStorage.getItem(SOUND_KEY) !== 'off')

let audioCtx = null
let engine = null // 引擎循环音 { osc1, osc2, gain }

function ensureAudio() {
  if (!soundOn.value) return null
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (!AC) return null
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx.state === 'closed' ? null : audioCtx
  } catch {
    return null
  }
}

let noiseBuf = null
function getNoise(ctx) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

// 伺服电机「吱——」：锯齿波频率快扫 + 带通出金属感，变形时错峰排四声
function playServo(delay = 0) {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  const f0 = 150 + Math.random() * 70
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.linearRampToValueAtTime(f0 * 2.3, t + 0.13)
  osc.frequency.linearRampToValueAtTime(f0 * 1.5, t + 0.26)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1000
  bp.Q.value = 2
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.04)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
  osc.connect(bp)
  bp.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.32)
}

// 「咔哒」合体到位：低频砰 + 高频噪声脆响
function playChunk(delay = 0) {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime + delay
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, t)
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.15)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.28, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.2)
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2500
  const ng = ctx.createGain()
  ng.gain.setValueAtTime(0.12, t)
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
  src.connect(hp)
  hp.connect(ng)
  ng.connect(ctx.destination)
  src.start(t)
  src.stop(t + 0.08)
}

// 脚步小砰
function playStep() {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(85, t)
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.08)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.1, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.12)
}

// 起跳「嗖」：带通噪声中心频率上扫
function playJump() {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime
  const src = ctx.createBufferSource()
  src.buffer = getNoise(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 1.5
  bp.frequency.setValueAtTime(500, t)
  bp.frequency.exponentialRampToValueAtTime(2200, t + 0.16)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.09, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  src.connect(bp)
  bp.connect(g)
  g.connect(ctx.destination)
  src.start(t)
  src.stop(t + 0.2)
}

// 落地闷响
function playLand() {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(95, t)
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.12)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.22, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.17)
}

// 喇叭「叭叭」：双音方波短鸣两声
function playHonk() {
  const ctx = ensureAudio()
  if (!ctx) return
  const beep = (t, dur) => {
    for (const f of [392, 494]) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = f
      const lp = ctx.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 1800
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.linearRampToValueAtTime(0.06, t + 0.015)
      g.gain.setValueAtTime(0.06, t + dur - 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      osc.connect(lp)
      lp.connect(g)
      g.connect(ctx.destination)
      osc.start(t)
      osc.stop(t + dur + 0.02)
    }
  }
  const t = ctx.currentTime
  beep(t, 0.14)
  beep(t + 0.2, 0.2)
}

// 换涂装提示音：两声小上行
function playBlip() {
  const ctx = ensureAudio()
  if (!ctx) return
  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(660, t)
  osc.frequency.setValueAtTime(880, t + 0.06)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.08, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + 0.16)
}

// 引擎循环音：锯齿低鸣 + 半频副音，音量随「汽车形态占比」淡入、音高随车速爬升
function updateEngine() {
  const ctx = audioCtx
  if (!ctx || ctx.state !== 'running') return
  if (!engine) {
    const osc1 = ctx.createOscillator()
    osc1.type = 'sawtooth'
    osc1.frequency.value = 55
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.value = 27
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 320
    const g = ctx.createGain()
    g.gain.value = 0
    osc1.connect(lp)
    osc2.connect(lp)
    lp.connect(g)
    g.connect(ctx.destination)
    osc1.start()
    osc2.start()
    engine = { osc1, osc2, g }
  }
  const carN = clamp((T - 0.5) * 2, 0, 1)
  const target = carN * (soundOn.value ? 0.05 : 0)
  engine.g.gain.setTargetAtTime(target, ctx.currentTime, 0.15)
  const rev = 52 + (Math.abs(vx) / 430) * 78 + Math.sin(now * 31) * 2.5
  engine.osc1.frequency.setTargetAtTime(rev, ctx.currentTime, 0.08)
  engine.osc2.frequency.setTargetAtTime(rev / 2, ctx.currentTime, 0.08)
}

function disposeAudio() {
  if (engine) {
    try { engine.osc1.stop(); engine.osc2.stop() } catch {}
    engine = null
  }
  if (audioCtx) {
    try { audioCtx.close() } catch {}
    audioCtx = null
  }
}

function toggleSound() {
  soundOn.value = !soundOn.value
  localStorage.setItem(SOUND_KEY, soundOn.value ? 'on' : 'off')
  if (soundOn.value) {
    ensureAudio()
    playBlip()
  }
}

// ---------- 变形 ----------

function transform() {
  tTarget = tTarget === 1 ? 0 : 1
  modeLabel.value = '变形中…'
  addSpark(px, 420)
  // 四声伺服对应四批零件错峰翻折，最后合体咔哒与头部落地同步
  playServo(0)
  playServo(0.32)
  playServo(0.62)
  playServo(0.95)
  playChunk(1.28)
}

// ---------- 更新 ----------

function approach(cur, target, maxDelta) {
  if (cur < target) return Math.min(target, cur + maxDelta)
  return Math.max(target, cur - maxDelta)
}

function update(dt) {
  const P = PAINTS[paintIdx.value]

  // 变形补间
  if (T !== tTarget) {
    const step = dt / DUR
    T = tTarget > T ? Math.min(tTarget, T + step) : Math.max(tTarget, T - step)
    if (T === tTarget) {
      modeLabel.value = tTarget === 1 ? '汽车形态' : '机器人形态'
      addText(px, 240, tTarget === 1 ? '变形完成！' : '变回来咯！', P.accent)
    }
  }

  const robotMode = T < 0.5
  let ax = 0
  if (keys.left) ax -= 1
  if (keys.right) ax += 1

  // 起跳（机器人形态才会触发），但物理过程始终演算——
  // 变形途中滞空也能安全落地，不会把跳跃高度冻在半空
  if ((keys.jump || jumpQueued) && robotMode && !airborne) {
    jumpQueued = false
    airborne = true
    jumpVy = 640
    addDust(px, GROUND, 8, 60, 40)
    playJump()
  }
  if (airborne) {
    jumpY += jumpVy * dt
    jumpVy -= 1900 * dt
    if (jumpY <= 0) {
      jumpY = 0
      airborne = false
      addDust(px, GROUND, 10, 70, 30)
      playLand()
    }
  }

  if (robotMode) {
    vx = ax * 175
    if (ax) facing = ax
    const moving = ax !== 0 && !airborne
    walkAmt = approach(walkAmt, moving ? 1 : 0, dt * 6)
    if (moving) {
      // 摆动相位过零 = 一只脚踏地，配一声脚步
      const prevSwing = Math.sin(phase)
      phase += dt * 10
      if (prevSwing * Math.sin(phase) <= 0) playStep()
      dustAcc += dt * 6
      if (dustAcc > 1) {
        dustAcc = 0
        addDust(px - facing * 20, GROUND, 1, 26, 0)
      }
    }
  } else {
    vx = approach(vx, ax * 430, 950 * dt)
    if (Math.abs(vx) > 30) facing = vx > 0 ? 1 : -1
    // 车尾废气
    if (Math.abs(vx) > 60 && Math.random() < 0.5) {
      particles.push({
        type: 'dust',
        x: px - facing * 190,
        y: 470 + Math.random() * 10,
        vx: -facing * 40 - vx * 0.1,
        vy: -24 - Math.random() * 20,
        age: 0,
        life: 0.6,
        size: 3 + Math.random() * 3
      })
    }
    dustAcc += dt * Math.min(10, Math.abs(vx) / 45)
    if (dustAcc > 1) {
      dustAcc = 0
      addDust(px - facing * 100, GROUND + 2, 1, 40, 0)
    }
  }

  px = clamp(px + vx * dt, 130, 870)
  spin += (vx * dt) / 24
  updateEngine()

  // 粒子演化
  for (const q of particles) {
    q.age += dt
    q.x += q.vx * dt
    q.y += q.vy * dt
    if (q.type === 'spark') q.vy += 900 * dt
    if (q.type === 'dust') {
      q.vx *= 1 - 2.2 * dt
      q.vy -= 26 * dt
    }
  }
  particles = particles.filter((q) => q.age < q.life)
  if (particles.length > 400) particles = particles.slice(-400)
}

// ---------- 场景背景 ----------

const BUILDINGS = [
  { x: 30, w: 120, h: 150 },
  { x: 200, w: 92, h: 215 },
  { x: 420, w: 70, h: 120 },
  { x: 620, w: 110, h: 175 },
  { x: 800, w: 140, h: 130 }
]
const clouds = [
  { x: 265, y: 66, s: 0.9 },
  { x: 620, y: 52, s: 0.72 },
  { x: 900, y: 130, s: 0.8 }
]

function drawBackground(c) {
  // 天空
  const g = c.createLinearGradient(0, 0, 0, GROUND)
  g.addColorStop(0, '#d9ecfa')
  g.addColorStop(1, '#f2f8fd')
  c.fillStyle = g
  c.fillRect(0, 0, W, GROUND)
  // 太阳
  c.fillStyle = 'rgba(255,220,130,0.35)'
  c.beginPath(); c.arc(96, 88, 46, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffd97a'
  c.beginPath(); c.arc(96, 88, 28, 0, Math.PI * 2); c.fill()
  // 云
  c.fillStyle = 'rgba(255,255,255,0.92)'
  for (const cl of clouds) {
    const { x, y, s } = cl
    c.beginPath()
    c.arc(x, y, 22 * s, 0, Math.PI * 2)
    c.arc(x + 24 * s, y - 10 * s, 17 * s, 0, Math.PI * 2)
    c.arc(x + 48 * s, y, 20 * s, 0, Math.PI * 2)
    c.fill()
  }
  // 远景楼群
  for (const b of BUILDINGS) {
    c.fillStyle = '#d7e3ee'
    c.fillRect(b.x, GROUND - b.h, b.w, b.h)
    c.fillStyle = '#c3d3e2'
    for (let wy = GROUND - b.h + 16; wy < GROUND - 24; wy += 30) {
      for (let wx = b.x + 12; wx < b.x + b.w - 16; wx += 26) {
        c.fillRect(wx, wy, 13, 17)
      }
    }
  }
  // 路面
  c.fillStyle = '#57606d'
  c.fillRect(0, GROUND, W, H - GROUND)
  c.fillStyle = '#6d7683'
  c.fillRect(0, GROUND, W, 5)
  c.fillStyle = 'rgba(0,0,0,0.18)'
  c.fillRect(0, H - 8, W, 8)
  // 车道虚线
  c.fillStyle = 'rgba(238,242,246,0.8)'
  for (let x = -20; x < W + 40; x += 86) c.fillRect(x, GROUND + 34, 46, 6)
}

// ---------- 姿态插值与动作叠加 ----------

// 走路踏步 / 跳跃团身 / 待机呼吸 / 跑车怠速颤动，按零件分别叠加
function applyMotion(id, p, s) {
  let dy = 0
  const rN = 1 - T
  if (rN > 0) {
    const w = walkAmt * rN
    const sw = Math.sin(phase)
    if (id === 'legL') dy = sw * 6 * w
    if (id === 'legR') dy = -sw * 6 * w
    if (id === 'bootL') dy = sw * 7 * w
    if (id === 'bootR') dy = -sw * 7 * w
    if (id === 'armL') dy = -sw * 4.5 * w
    if (id === 'armR') dy = sw * 4.5 * w
    if (id === 'torso' || id === 'pelvis' || id === 'head') {
      dy = -Math.abs(sw) * 3.5 * w + Math.sin(now * 2.1) * 1.4 * (1 - w)
    }
    if (airborne) {
      if (id === 'legL' || id === 'legR') dy -= 10
      if (id === 'bootL' || id === 'bootR') dy -= 16
      if (id === 'armL' || id === 'armR') dy -= 8
      if (id === 'torso' || id === 'pelvis' || id === 'head') dy -= 4
    }
    dy *= rN
    dy -= jumpY * rN
  }
  if (T > 0) {
    // 跑车怠速/行驶时的引擎颤动
    const vib = Math.sin(now * 26) * 1.2 * T * (Math.abs(vx) > 20 ? 1 : 0.25)
    dy += vib
  }
  p.y += dy
}

// ---------- 渲染 ----------

function render() {
  const P = PAINTS[paintIdx.value]
  drawBackground(ctx)

  ctx.save()
  ctx.translate(px, 0)
  ctx.scale(facing, 1)

  // 投影
  const eT = ease(clamp(T, 0, 1))
  ctx.fillStyle = 'rgba(30,40,55,0.18)'
  ctx.beginPath()
  ctx.ellipse(0, GROUND + 9, lerp(155, 360, eT), 11, 0, 0, Math.PI * 2)
  ctx.fill()

  const s = {
    P,
    robotA: 1 - clamp(T / 0.3, 0, 1),
    carA: clamp((T - 0.7) / 0.3, 0, 1),
    spin,
    T
  }
  const order = T < 0.5 ? ROBOT_ORDER : CAR_ORDER
  for (const id of order) {
    const part = byId[id]
    const k = ease(clamp((T - part.d) / (1 - part.d), 0, 1))
    const p = {
      x: lerp(part.rb.x, part.cr.x, k),
      y: lerp(part.rb.y, part.cr.y, k),
      w: lerp(part.rb.w, part.cr.w, k),
      h: lerp(part.rb.h, part.cr.h, k)
    }
    applyMotion(id, p, s)
    part.draw(ctx, p, s)
  }
  ctx.restore()

  // 粒子（画在绝对坐标上，不随机甲镜像）
  for (const q of particles) {
    const a = 1 - q.age / q.life
    if (q.type === 'dust') {
      ctx.globalAlpha = a * 0.5
      ctx.fillStyle = '#b9aa93'
      ctx.beginPath()
      ctx.arc(q.x, q.y, q.size * (1 + q.age * 2.4), 0, Math.PI * 2)
      ctx.fill()
    } else if (q.type === 'spark') {
      ctx.globalAlpha = a
      ctx.fillStyle = q.color
      ctx.beginPath()
      ctx.arc(q.x, q.y, q.size * a, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = Math.min(1, a * 1.6)
      ctx.font = `700 ${q.size}px "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = q.color
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 4
      ctx.strokeText(q.text, q.x, q.y)
      ctx.fillText(q.text, q.x, q.y)
    }
  }
  ctx.globalAlpha = 1
}

// ---------- 主循环 ----------

let last = 0
function frame(ts) {
  rafId = requestAnimationFrame(frame)
  lastFrameAt = performance.now()
  const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016)
  last = ts
  now = ts / 1000
  update(dt)
  render()
}

// rAF 看门狗：部分嵌入环境会把页面判成「遮挡态」导致 rAF 永不回调，
// 前台标签超过 900ms 没画帧就手动驱动一次；真实后台标签由 document.hidden 挡住，不空转
let lastFrameAt = 0
let watchdogId = 0

// ---------- 交互 ----------

function onKeyDown(e) {
  ensureAudio()
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = true
  else if (e.key === ' ' || e.key === 't' || e.key === 'T') {
    if (!e.repeat) {
      e.preventDefault()
      transform()
    } else if (e.key === ' ') e.preventDefault()
  } else if ((e.key === 'h' || e.key === 'H') && !e.repeat && T > 0.85) {
    playHonk()
    addText(px + facing * 150, 380, '叭叭！', PAINTS[paintIdx.value].accent)
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key)) e.preventDefault()
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false
  else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false
  else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.jump = false
}

function onBlur() {
  keys.left = keys.right = keys.jump = false
}

// 拖拽机甲挪位置；轻点一下：机器人原地跳、汽车按喇叭
let dragging = false
let downX = 0
let downY = 0
let movedFar = false

function canvasX(e) {
  const rect = canvas.getBoundingClientRect()
  return ((e.clientX - rect.left) / rect.width) * W
}

function canvasY(e) {
  const rect = canvas.getBoundingClientRect()
  return ((e.clientY - rect.top) / rect.height) * H
}

function onPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  ensureAudio()
  canvas.setPointerCapture(e.pointerId)
  downX = canvasX(e)
  downY = canvasY(e)
  movedFar = false
  if (Math.abs(downX - px) < 260 && downY > 120 && downY < GROUND + 20) dragging = true
}

function onPointerMove(e) {
  if (!dragging) return
  const mx = canvasX(e)
  if (Math.abs(mx - downX) > 8 || Math.abs(canvasY(e) - downY) > 8) movedFar = true
  px = clamp(mx, 130, 870)
  vx = 0
}

function onPointerUp() {
  if (dragging && !movedFar) {
    if (T > 0.5) {
      playHonk()
      addText(px + facing * 150, 380, '叭叭！', PAINTS[paintIdx.value].accent)
    } else if (!airborne) jumpQueued = true
  }
  dragging = false
}

function cyclePaint() {
  paintIdx.value = (paintIdx.value + 1) % PAINTS.length
  addSpark(px, 400)
  playBlip()
}

function resetPosition() {
  px = 500
  vx = 0
}

// ---------- 生命周期 ----------

onMounted(() => {
  canvas = document.getElementById('transformer-canvas')
  ctx = canvas.getContext('2d')
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  rafId = requestAnimationFrame(frame)
  watchdogId = setInterval(() => {
    if (!document.hidden && performance.now() - lastFrameAt > 900) {
      lastFrameAt = performance.now()
      update(0.016)
      render()
    }
  }, 250)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  clearInterval(watchdogId)
  disposeAudio()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
})
</script>

<template>
  <main class="transformer">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>变形金刚 · 变形玩具</h1>
      <p class="subtitle">
        一台会变形的机甲：🔁 按下变形键，看零件咔咔翻折拼成一辆跑车；🤖 机器人能跑能跳，🚗 跑车能踩油门飙一圈。
      </p>
    </header>

    <section class="panel">
      <span class="badge" :class="{ car: modeLabel === '汽车形态' }">{{ modeLabel }}</span>

      <div class="buttons">
        <button class="primary" @click="transform">🔁 变形！<sup>T</sup></button>
        <button @click="cyclePaint">🎨 涂装 · {{ paintName }}</button>
        <button @click="resetPosition">🧭 回到场地中央</button>
        <button @click="toggleSound">{{ soundOn ? '🔊 音效开' : '🔇 静音' }}</button>
      </div>

      <span class="status">拖动机甲可挪位置，轻点一下会跳 / 按喇叭</span>
    </section>

    <section class="stage">
      <canvas
        id="transformer-canvas"
        width="1000"
        height="560"
        @pointerdown.prevent="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @contextmenu.prevent
      ></canvas>
    </section>

    <p class="hint">
      玩法：<code>←</code>/<code>→</code> 或 <code>A</code>/<code>D</code> 移动（机器人踏步走、跑车踩油门），
      机器人按 <code>W</code>/<code>↑</code> 起跳；空格或 <code>T</code> 变形；
      跑车形态按 <code>H</code> 按喇叭。🎨 换涂装试试大黄蜂、擎天柱、警车和横炮配色。
      音效全部由 Web Audio 实时合成（变形伺服声、合体咔哒、脚步、引擎随车速变调、叭叭喇叭），面板按钮可静音。
    </p>
  </main>
</template>

<style scoped>
.transformer {
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.top h1 {
  margin: 14px 0 6px;
  font-size: 30px;
}

.subtitle {
  margin: 0 0 28px;
  color: var(--color-muted);
}

.panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 16px 22px;
  margin-bottom: 18px;
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
}

.badge {
  padding: 7px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--surface-soft, #eef2f7);
  border-radius: var(--radius-pill, 999px);
  white-space: nowrap;
}

.badge.car {
  color: #b26a00;
  background: #fff3d6;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.buttons button {
  padding: 9px 18px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill, 999px);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s;
}

.buttons button:hover {
  border-color: var(--color-primary);
}

.buttons button.primary {
  color: #fff;
  background: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}

.buttons button.primary:hover {
  filter: brightness(1.08);
}

.buttons sup {
  font-size: 10px;
  opacity: 0.75;
}

.status {
  font-size: 13px;
  color: var(--color-muted);
}

.stage {
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: #dceafa;
}

.stage canvas {
  display: block;
  width: 100%;
  height: auto;
  touch-action: none;
  cursor: grab;
}

.stage canvas:active {
  cursor: grabbing;
}

.hint {
  margin: 16px 4px 0;
  font-size: 14px;
  line-height: 1.9;
  color: var(--color-muted);
}

.hint code {
  padding: 1px 6px;
  font-size: 12px;
  background: var(--surface-soft, #eef2f7);
  border-radius: 5px;
}

@media (max-width: 720px) {
  .transformer {
    padding: 24px 12px 48px;
  }

  .top h1 {
    font-size: 24px;
  }
}
</style>
