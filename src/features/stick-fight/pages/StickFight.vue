<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { ENEMY_TYPES, ROOMS } from '../data/stickFightRooms.js'

/**
 * 火柴人格斗 · 龙潭虎穴
 * - 六个房间连续突入，清空敌人后右侧出口开启
 * - 拳（三段连击）/ 踢（击退放倒）/ 空中飞踢 / 翻滚闪避（无敌帧）
 * - 炸药包：抛物线投掷、反弹、范围爆炸，可炸开木箱
 * - 红色血液粒子会洒在地面上形成持久血迹（可在下方面板调节）
 */

const VW = 960
const VH = 540
const GROUND_Y = 468
const GRAVITY = 2100
const WALL_L = 36
const DOOR_W = 74
const BOOM_R = 150

// 火柴人骨骼尺寸（局部坐标：脚底为原点，+x 朝向正面）
const TORSO = 34
const HEAD_R = 9.5
const THIGH = 24
const SHIN = 24
const UPPER = 17
const FORE = 16
const HIP_H = 45

// 玩家数值
const P = {
  hp: 100,
  speed: 265,
  jumpV: -690,
  rollSpeed: 470,
  rollTime: 0.34,
  rollIframes: 0.3,
  rollCd: 0.55,
  maxDynamite: 5
}

const PLAYER_ATTACKS = {
  punch: { name: 'punch', dur: 0.3, hitAt: 0.1, range: 58, dmg: [8, 8, 13], knock: 160, launch: 0, lunge: 95 },
  kick: { name: 'kick', dur: 0.46, hitAt: 0.2, range: 76, dmg: [15], knock: 400, launch: -170, lunge: 70 },
  flykick: { name: 'flykick', dur: 1.6, hitAt: 0.03, range: 66, dmg: [17], knock: 440, launch: -240, lunge: 0, air: true }
}

const lerp = (a, b, t) => a + (b - a) * t
const easeOut = (t) => 1 - (1 - t) * (1 - t)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

const phase = ref('ready') // ready | playing | paused | dead | win
const soundOn = ref(true)
const bloodMode = ref('normal') // off | normal | gory
const finalStats = ref({ ko: 0, maxCombo: 0, time: 0, room: '' })
const canvasRef = ref(null)

let ctx = null
let dpr = 1
let game = null
let rafId = 0
let lastTime = 0
let audioCtx = null
let master = null

// 持久血迹层：独立的离屏画布，粒子落地时烙上去，随房间重置
const stains = document.createElement('canvas')
stains.width = VW
stains.height = VH
const sctx = stains.getContext('2d')

// ============ 音效（Web Audio 实时合成） ============

function ensureAudio() {
  if (!soundOn.value) return null
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      master = audioCtx.createGain()
      master.gain.value = 0.5
      master.connect(audioCtx.destination)
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch (err) {
    // 音频初始化失败（无音频设备/沙箱环境）时静默降级，绝不能影响游戏逻辑
    audioCtx = null
    return null
  }
}

function tone(type, f0, f1, dur, vol) {
  const ac = ensureAudio()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(Math.max(1, f0), t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noiseSfx(dur, vol, fType, f0, f1) {
  const ac = ensureAudio()
  if (!ac) return
  const t = ac.currentTime
  const len = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  const flt = ac.createBiquadFilter()
  flt.type = fType
  flt.frequency.setValueAtTime(f0, t)
  if (f1) flt.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(flt).connect(g).connect(master)
  src.start(t)
}

const sfxWhoosh = (p = 1) => noiseSfx(0.12, 0.12, 'bandpass', 350 * p, 900 * p)
const sfxHit = (heavy) => {
  tone('sine', heavy ? 150 : 190, 50, 0.13, 0.5)
  noiseSfx(0.07, 0.25, 'lowpass', 900)
}
const sfxHurt = () => tone('sawtooth', 280, 110, 0.2, 0.22)
const sfxShot = () => {
  noiseSfx(0.09, 0.4, 'highpass', 1200)
  tone('square', 800, 160, 0.06, 0.2)
}
const sfxExplosion = () => {
  noiseSfx(0.7, 0.8, 'lowpass', 2600, 120)
  tone('sine', 130, 28, 0.55, 0.6)
}
const sfxPickup = () => {
  tone('triangle', 620, 930, 0.1, 0.22)
  setTimeout(() => tone('triangle', 930, 1240, 0.12, 0.2), 90)
}
const sfxKO = () => {
  tone('square', 240, 60, 0.32, 0.28)
  noiseSfx(0.2, 0.3, 'lowpass', 700, 200)
}
const sfxJump = () => tone('sine', 300, 460, 0.12, 0.14)
const sfxRoll = () => noiseSfx(0.2, 0.1, 'bandpass', 280, 420)
const sfxThrow = () => noiseSfx(0.16, 0.12, 'bandpass', 500, 1100)
const sfxBreak = () => {
  noiseSfx(0.16, 0.3, 'lowpass', 620, 240)
  tone('triangle', 190, 90, 0.12, 0.25)
}
const sfxRoar = () => tone('sawtooth', 90, 55, 0.4, 0.3)
const sfxDoor = () => {
  tone('triangle', 110, 70, 0.25, 0.25)
  noiseSfx(0.2, 0.1, 'lowpass', 400, 150)
}
const sfxDoorOpen = () => {
  tone('triangle', 220, 330, 0.2, 0.25)
  setTimeout(() => tone('triangle', 330, 440, 0.25, 0.25), 140)
}

// ============ 输入 ============

const keys = {}
const pressed = new Map() // 按键 → 按下时刻，200ms 内视为有效缓冲（连招手感）
const GAME_CODES = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
  'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyL',
  'ShiftLeft', 'ShiftRight', 'KeyP', 'KeyM', 'Enter'
])

function onKeyDown(e) {
  if (GAME_CODES.has(e.code)) e.preventDefault()
  if (e.repeat) {
    keys[e.code] = true
    return
  }
  pressed.set(e.code, performance.now())
  keys[e.code] = true
  if (e.code === 'KeyM') {
    soundOn.value = !soundOn.value
    return
  }
  if (e.code === 'KeyP') {
    togglePause()
    return
  }
  if (phase.value === 'ready' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyJ')) {
    startGame()
    return
  }
  if ((phase.value === 'dead' || phase.value === 'win') && e.code === 'Enter') {
    startGame()
  }
}

function onKeyUp(e) {
  keys[e.code] = false
}

function consumePress(code) {
  const t = pressed.get(code)
  if (t === undefined) return false
  pressed.delete(code)
  return performance.now() - t <= 200
}

function onBlur() {
  for (const k of Object.keys(keys)) keys[k] = false
}

function onVisibility() {
  if (document.hidden && phase.value === 'playing') phase.value = 'paused'
}

// ============ 实体构造 ============

function makePlayer() {
  return {
    kind: 'player',
    cfg: null,
    color: '#f2f5f9',
    dark: '#a9b2bd',
    scale: 1,
    lineWidth: 5,
    x: -40,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    hp: P.hp,
    maxHp: P.hp,
    dynamite: 2,
    state: 'enter',
    action: null,
    comboStep: 0,
    comboWindow: 0,
    airAttacked: false,
    rollSpin: 0,
    rollCd: 0,
    invuln: 0,
    hurtT: 0,
    downT: 0,
    getupT: 0,
    dead: false,
    deadT: 0,
    runPhase: 0,
    seed: Math.random()
  }
}

function makeEnemy(type, spawnX, idx) {
  const cfg = ENEMY_TYPES[type]
  return {
    kind: type,
    cfg,
    color: cfg.color,
    dark: cfg.dark,
    scale: cfg.scale,
    lineWidth: cfg.lineWidth,
    speed: cfg.speed,
    melee: cfg.melee,
    ranged: cfg.ranged,
    hp: cfg.hp,
    maxHp: cfg.hp,
    // 从右侧门鱼贯而入，逐个错开
    x: VW + 40 + idx * 60,
    y: GROUND_Y,
    vx: 0,
    vy: 0,
    facing: -1,
    onGround: true,
    state: 'enter',
    spawnX,
    action: null,
    cd: 0.5 + Math.random() * 0.8,
    fireT: cfg.ranged ? cfg.ranged.fireCycle * (0.5 + Math.random() * 0.5) : 0,
    bombT: type === 'boss' ? cfg.bombCycle * 0.55 : 0,
    hurtT: 0,
    downT: 0,
    getupT: 0,
    dead: false,
    deadT: 0,
    remove: false,
    showAim: false,
    enraged: false,
    chargeCfg: null,
    runPhase: Math.random() * 6,
    seed: Math.random(),
    stateT: 0
  }
}

function makeCrate(cfg) {
  return { x: cfg.x, y: GROUND_Y, w: 24, h: 32, hp: 26, item: cfg.item, broken: false, shakeT: 0 }
}

function makeBomb(x, y, vx, vy) {
  return { x, y, vx, vy, fuse: 1.5, spin: Math.random() * 6, remove: false }
}

function newGame() {
  return {
    roomIndex: 0,
    time: 0,
    hitstop: 0,
    shake: 0,
    fade: null,
    banner: { text: '', sub: '', t: 0 },
    combo: 0,
    comboTimer: 0,
    comboPop: 0,
    maxCombo: 0,
    ko: 0,
    doorOpen: false,
    player: makePlayer(),
    enemies: [],
    bullets: [],
    bombs: [],
    crates: [],
    pickups: [],
    particles: [],
    effects: []
  }
}

function loadRoom(i) {
  const g = game
  const r = ROOMS[i]
  g.roomIndex = i
  g.enemies = r.enemies.map((e, idx) => makeEnemy(e.type, e.x, idx))
  g.crates = r.crates.map(makeCrate)
  g.bullets = []
  g.bombs = []
  g.pickups = []
  g.particles = []
  g.effects = []
  g.doorOpen = false
  sctx.clearRect(0, 0, VW, VH)
  const p = g.player
  p.x = -40
  p.y = GROUND_Y
  p.vx = 0
  p.vy = 0
  p.state = 'enter'
  p.action = null
  p.downT = 0
  p.hurtT = 0
  p.getupT = 0
  g.banner = { text: r.name, sub: r.sub, t: 2.4 }
  sfxDoor()
}

function startGame() {
  pressed.clear()
  game = newGame()
  loadRoom(0)
  phase.value = 'playing'
}

function togglePause() {
  if (phase.value === 'playing') phase.value = 'paused'
  else if (phase.value === 'paused') phase.value = 'playing'
}

function finishStats() {
  finalStats.value = {
    ko: game.ko,
    maxCombo: game.maxCombo,
    time: Math.round(game.time),
    room: ROOMS[game.roomIndex].name
  }
}

// ============ 粒子与血迹 ============

function puffAt(x, y, n) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      type: 'puff',
      x: x + (Math.random() - 0.5) * 12,
      y: y - Math.random() * 10,
      vx: (Math.random() - 0.5) * 70,
      vy: -30 - Math.random() * 50,
      g: -60,
      size: 3 + Math.random() * 4,
      life: 0.5,
      maxLife: 0.5,
      color: null
    })
  }
}

const dustAt = (x, y, n) => puffAt(x, y, n)

function sparkBurst(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    game.particles.push({
      type: 'spark',
      x,
      y,
      vx: Math.cos(a) * (80 + Math.random() * 260),
      vy: Math.sin(a) * (80 + Math.random() * 260) - 60,
      g: 900,
      size: 1.5 + Math.random() * 1.5,
      life: 0.35,
      maxLife: 0.35,
      color: '#ffc247'
    })
  }
}

function splinterBurst(x, y) {
  for (let i = 0; i < 14; i++) {
    game.particles.push({
      type: 'splinter',
      x,
      y,
      vx: (Math.random() - 0.5) * 320,
      vy: -Math.random() * 380 - 60,
      g: 1500,
      size: 2 + Math.random() * 3,
      life: 1,
      maxLife: 1,
      spin: Math.random() * 6,
      color: '#7a5f3c'
    })
  }
}

function bloodBurst(x, y, count, dir) {
  if (bloodMode.value === 'off') {
    puffAt(x, y, Math.max(2, count >> 2))
    return
  }
  const n = Math.round(count * (bloodMode.value === 'gory' ? 2 : 1))
  for (let i = 0; i < n; i++) {
    game.particles.push({
      type: 'blood',
      x,
      y,
      vx: dir * (30 + Math.random() * 190) + (Math.random() - 0.5) * 220,
      vy: -Math.random() * 300 - 20,
      g: 1900,
      size: 1.5 + Math.random() * 2.6,
      life: 1.4,
      maxLife: 1.4,
      color: Math.random() < 0.5 ? '#c81e1e' : '#e23131'
    })
  }
}

function stampBlood(x, size) {
  sctx.fillStyle = 'rgba(110, 12, 12, 0.5)'
  sctx.beginPath()
  sctx.ellipse(x, GROUND_Y + 3 + Math.random() * 5, size * 1.8, size * 0.55, 0, 0, Math.PI * 2)
  sctx.fill()
}

function scorchStain(x) {
  const grad = sctx.createRadialGradient(x, GROUND_Y + 4, 4, x, GROUND_Y + 4, 66)
  grad.addColorStop(0, 'rgba(20, 14, 10, 0.55)')
  grad.addColorStop(1, 'rgba(20, 14, 10, 0)')
  sctx.fillStyle = grad
  sctx.beginPath()
  sctx.ellipse(x, GROUND_Y + 4, 66, 14, 0, 0, Math.PI * 2)
  sctx.fill()
}

function updateParticles(dt) {
  for (const q of game.particles) {
    q.life -= dt
    if (q.life <= 0) {
      q.remove = true
      continue
    }
    q.vy += (q.g ?? 1800) * dt
    q.x += q.vx * dt
    q.y += q.vy * dt
    if (q.type === 'splinter') q.spin += dt * 9
    if (q.type === 'blood' && q.y >= GROUND_Y + 2) {
      q.remove = true
      stampBlood(q.x, q.size)
    } else if ((q.type === 'splinter' || q.type === 'spark') && q.y > GROUND_Y) {
      q.remove = true
    }
  }
  game.particles = game.particles.filter((q) => !q.remove)
}

function updateEffects(dt) {
  for (const fx of game.effects) {
    fx.t += dt
    if (fx.type === 'pool') {
      // 尸体血泊逐渐渗开，直接烙进血迹层
      const r = 8 + Math.min(1, fx.t / fx.life) * 18
      sctx.fillStyle = 'rgba(120, 10, 10, 0.16)'
      sctx.beginPath()
      sctx.ellipse(fx.x, GROUND_Y + 3, r, r * 0.3, 0, 0, Math.PI * 2)
      sctx.fill()
    }
    if (fx.t >= (fx.life ?? 1)) fx.remove = true
  }
  game.effects = game.effects.filter((fx) => !fx.remove)
}

function muzzleFlash(x, y) {
  game.effects.push({ type: 'muzzle', x, y, t: 0, life: 0.12 })
}

// ============ 战斗结算 ============

// 攻击判定：攻击者面前 range 范围的矩形，与目标身体纵向重叠即命中
function inAttackRange(attacker, range, target) {
  const s = target.scale || 1
  const tw = target.w || 14 * s
  const th = target.h || 100 * s
  const x0 = attacker.x + Math.min(0, attacker.facing * 6)
  const x1 = attacker.x + attacker.facing * (range + 12)
  const lx = Math.min(x0, x1)
  const rx = Math.max(x0, x1)
  const aTop = attacker.y - 78
  const aBot = attacker.y - 28
  const ty0 = target.y - th
  const ty1 = target.y
  return rx >= target.x - tw && lx <= target.x + tw && aBot >= ty0 && aTop <= ty1
}

function damageEnemy(e, dmg, knock, launch, hitPoint, source) {
  if (e.dead) return
  if (e.kind === 'boss' && source === 'explosion') dmg *= 0.55
  e.hp -= dmg
  bloodBurst(hitPoint.x, hitPoint.y, 6 + dmg * 0.9, Math.sign(knock) || 1)
  game.hitstop = Math.max(game.hitstop, dmg >= 13 ? 0.11 : 0.06)
  game.shake = Math.min(18, game.shake + (dmg >= 13 ? 7 : 3.5))
  e.vx = knock
  if (launch) {
    e.vy = launch
    e.onGround = false
  }
  if (source === 'player') {
    game.combo++
    game.comboTimer = 2.5
    game.comboPop = 1
    game.maxCombo = Math.max(game.maxCombo, game.combo)
  }
  sfxHit(dmg >= 13)
  if (e.hp <= 0) {
    killEnemy(e, Math.sign(knock) || 1)
    return
  }
  e.action = null
  e.showAim = false
  if (launch || dmg >= 13) {
    e.downT = 0.85
  } else {
    e.hurtT = 0.22
  }
}

function killEnemy(e, dir) {
  e.dead = true
  e.deadT = 0
  e.vx = dir * (200 + Math.random() * 140)
  e.vy = -280
  e.onGround = false
  game.ko++
  bloodBurst(e.x, e.y - 55 * (e.scale || 1), 26, dir)
  game.effects.push({ type: 'pool', x: e.x, y: GROUND_Y, t: 0, life: 1.6 })
  sfxKO()
  checkRoomClear()
}

function checkRoomClear() {
  if (game.enemies.every((e) => e.dead)) {
    game.doorOpen = true
    game.banner = { text: '房间已清空', sub: '右侧出口已开启，走进去 →', t: 2.4 }
    sfxDoorOpen()
  }
}

function damagePlayer(dmg, knock, launch, hitPoint) {
  const p = game.player
  if (p.dead || p.invuln > 0) return
  p.hp = Math.max(0, p.hp - dmg)
  bloodBurst(hitPoint.x, hitPoint.y, 8 + dmg, Math.sign(knock) || 1)
  game.hitstop = Math.max(game.hitstop, 0.09)
  game.shake = Math.min(18, game.shake + 6)
  p.invuln = 0.75
  p.action = null
  p.vx = knock
  if (launch) {
    p.vy = launch
    p.onGround = false
  }
  game.combo = 0
  game.comboTimer = 0
  sfxHurt()
  if (p.hp <= 0) {
    p.dead = true
    p.deadT = 0
    p.vx = knock * 1.2
    p.vy = -300
    p.onGround = false
    bloodBurst(p.x, p.y - 55, 30, Math.sign(knock) || 1)
  }
}

function resolvePlayerAttack(def, step) {
  const p = game.player
  const dmg = def.dmg[Math.min(step, def.dmg.length - 1)]
  for (const e of game.enemies) {
    if (e.dead) continue
    if (inAttackRange(p, def.range, e)) {
      damageEnemy(
        e,
        dmg,
        p.facing * def.knock,
        def.launch,
        { x: e.x - p.facing * 10 * (e.scale || 1), y: e.y - 58 * (e.scale || 1) },
        'player'
      )
    }
  }
  for (const c of game.crates) {
    if (c.broken) continue
    if (inAttackRange(p, def.range, c)) damageCrate(c, dmg)
  }
}

function damageCrate(c, dmg) {
  if (c.broken) return
  c.hp -= dmg
  c.shakeT = 0.18
  if (c.hp <= 0) {
    c.broken = true
    splinterBurst(c.x, c.y - c.h / 2)
    sfxBreak()
    if (c.item) {
      game.pickups.push({ type: c.item, x: c.x, y: c.y - 34, vy: -170, t: 0, grounded: false, remove: false })
    }
  }
}

function explode(x, y) {
  const g = game
  sfxExplosion()
  g.shake = 16
  g.effects.push({ type: 'boom', x, y: y - 20, t: 0, life: 0.5 })
  scorchStain(x)
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 60 + Math.random() * 320
    g.particles.push({
      type: 'smoke',
      x,
      y: y - 10,
      vx: Math.cos(a) * sp * 0.5,
      vy: Math.sin(a) * sp * 0.4 - 60,
      g: -120,
      size: 8 + Math.random() * 14,
      life: 0.9 + Math.random() * 0.6,
      maxLife: 1.4,
      color: null
    })
  }
  sparkBurst(x, y, 18)
  const targets = [...g.enemies.filter((e) => !e.dead), g.player]
  for (const t of targets) {
    const d = Math.hypot(t.x - x, t.y - 50 * (t.scale || 1) - y)
    if (d > BOOM_R + 30 * (t.scale || 1)) continue
    const fall = Math.max(0.25, 1 - d / (BOOM_R + 40))
    const dir = Math.sign(t.x - x) || 1
    if (t === g.player) {
      if (!t.dead) damagePlayer(Math.round(34 * fall), dir * 560 * fall, -360 * fall, { x: t.x, y: t.y - 55 })
    } else {
      damageEnemy(
        t,
        Math.round(88 * fall),
        dir * 560 * fall,
        -380 * fall,
        { x: t.x, y: t.y - 60 * (t.scale || 1) },
        'explosion'
      )
    }
  }
  for (const c of g.crates) {
    if (!c.broken && Math.hypot(c.x - x, c.y - 15 - y) < BOOM_R + 26) damageCrate(c, 99)
  }
  // 连锁引爆
  for (const b of g.bombs) {
    if (!b.remove && b.fuse > 0.08 && Math.hypot(b.x - x, b.y - y) < BOOM_R) b.fuse = 0.08
  }
}

// ============ 物理 ============

function integrateFighter(f, dt) {
  const prevY = f.y
  const flykick = f.action && f.action.type === 'attack' && f.action.name === 'flykick'
  f.vy += GRAVITY * (flykick ? 0.78 : 1) * dt
  f.x += f.vx * dt
  f.y += f.vy * dt
  f.onGround = false
  if (f.vy >= 0) {
    for (const pl of ROOMS[game.roomIndex].platforms) {
      if (f.x >= pl.x - 6 && f.x <= pl.x + pl.w + 6 && prevY <= pl.y + 1 && f.y >= pl.y) {
        f.y = pl.y
        f.vy = 0
        f.onGround = true
      }
    }
  }
  if (f.y >= GROUND_Y) {
    f.y = GROUND_Y
    f.vy = 0
    f.onGround = true
  }
  if (f.x < WALL_L + 10) {
    f.x = WALL_L + 10
    wallImpact(f)
  }
  if (f.x > VW - WALL_L - 10) {
    f.x = VW - WALL_L - 10
    wallImpact(f)
  }
  if (f.onGround) f.airAttacked = false
}

// 被重击撞墙的敌人额外受创——成龙式的借环境杀敌
function wallImpact(f) {
  const sp = Math.abs(f.vx)
  if (sp > 330 && f !== game.player && (f.downT > 0 || f.dead)) {
    const dir = f.x < VW / 2 ? 1 : -1
    damageEnemy(f, 6, dir * 160, 0, { x: f.x, y: f.y - 55 }, 'wall')
    dustAt(f.x, f.y, 10)
    game.shake = Math.min(18, game.shake + 5)
  }
  f.vx = 0
}

function separateEnemies(dt) {
  const list = game.enemies.filter((e) => !e.dead && e.state !== 'enter')
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const d = b.x - a.x
      const min = 26 * ((a.scale + b.scale) / 2) + 8
      if (Math.abs(d) < min && Math.abs(a.y - b.y) < 40) {
        const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1) * Math.min(1, dt * 10)
        a.x -= push
        b.x += push
      }
    }
  }
}

function playerEnemySoft(dt) {
  const p = game.player
  if (p.dead) return
  for (const e of game.enemies) {
    if (e.dead || e.state === 'enter') continue
    const dx = p.x - e.x
    const min = 22 * (e.scale || 1)
    if (Math.abs(dx) < min && Math.abs(p.y - e.y) < 60) {
      const push = (min - Math.abs(dx)) * Math.sign(dx || 1) * Math.min(1, dt * 8)
      p.x += push * 0.7
      e.x -= push * 0.3
    }
  }
}

// ============ 更新逻辑 ============

function updatePlayer(dt) {
  const p = game.player
  p.invuln = Math.max(0, p.invuln - dt)
  p.rollCd = Math.max(0, p.rollCd - dt)
  if (p.comboWindow > 0) {
    p.comboWindow -= dt
    if (p.comboWindow <= 0) p.comboStep = 0
  }

  if (p.dead) {
    p.deadT += dt
    p.vx *= Math.pow(0.02, dt)
    integrateFighter(p, dt)
    if (p.deadT > 1.5 && phase.value === 'playing') {
      finishStats()
      phase.value = 'dead'
    }
    return
  }

  // 行动进行中：攻击 / 投掷 / 翻滚
  if (p.action) {
    const a = p.action
    a.t += dt
    if (a.type === 'roll') {
      p.vx = p.facing * P.rollSpeed
      p.rollSpin += dt * 16 * p.facing
      if (a.t >= P.rollTime) {
        p.action = null
        p.rollSpin = 0
      }
    } else if (a.type === 'attack') {
      const d = a.def
      if (d.air) {
        p.vx = p.facing * 350
        if (p.onGround && a.t > 0.1) {
          p.action = null
          puffAt(p.x, p.y, 6)
        }
      } else {
        const lungeT =
          a.t < d.hitAt ? a.t / d.hitAt : Math.max(0, 1 - (a.t - d.hitAt) / (d.dur - d.hitAt))
        p.vx = p.facing * d.lunge * lungeT * (p.onGround ? 1 : 0.6)
      }
      if (!a.hitDone && a.t >= d.hitAt) {
        a.hitDone = true
        resolvePlayerAttack(d, a.step)
      }
      if (a.t >= d.dur) {
        if (a.name === 'punch') {
          p.comboWindow = 0.6
          p.comboStep = (a.step + 1) % 3
        }
        p.action = null
      }
    } else if (a.type === 'throw') {
      p.vx *= Math.pow(0.001, dt)
      if (!a.hitDone && a.t >= 0.16) {
        a.hitDone = true
        p.dynamite--
        game.bombs.push(makeBomb(p.x + p.facing * 14, p.y - 58, p.facing * 380 + p.vx * 0.4, -430))
        sfxThrow()
      }
      if (a.t >= 0.42) p.action = null
    }
    integrateFighter(p, dt)
    return
  }

  if (p.downT > 0) {
    p.downT -= dt
    p.vx *= Math.pow(0.01, dt)
    integrateFighter(p, dt)
    if (p.downT <= 0) {
      p.getupT = 0.4
      p.invuln = Math.max(p.invuln, 0.5)
    }
    return
  }
  if (p.getupT > 0) {
    p.getupT -= dt
    p.vx = 0
    integrateFighter(p, dt)
    return
  }
  if (p.hurtT > 0) {
    p.hurtT -= dt
    p.vx *= Math.pow(0.05, dt)
    integrateFighter(p, dt)
    return
  }

  // 入场：自动从左侧门走进来
  if (p.state === 'enter') {
    p.facing = 1
    p.vx = 175
    p.runPhase += dt * 8
    if (p.x >= 64) {
      p.state = 'idle'
      p.vx = 0
    }
    integrateFighter(p, dt)
    return
  }
  // 转场黑屏期间锁操作
  if (game.fade) {
    p.vx = 0
    integrateFighter(p, dt)
    return
  }

  // ---- 自由操作 ----
  let mx = 0
  if (keys.ArrowLeft || keys.KeyA) mx -= 1
  if (keys.ArrowRight || keys.KeyD) mx += 1
  if (mx !== 0) p.facing = mx
  p.vx = mx * P.speed

  if (consumePress('Space') || consumePress('ArrowUp') || consumePress('KeyW')) {
    if (p.onGround) {
      p.vy = P.jumpV
      p.onGround = false
      puffAt(p.x, p.y, 5)
      sfxJump()
    }
  }
  const pressJ = consumePress('KeyJ')
  const pressK = consumePress('KeyK')
  if (pressJ || pressK) {
    if (!p.onGround) {
      if (!p.airAttacked) {
        p.airAttacked = true
        p.action = { type: 'attack', name: 'flykick', t: 0, def: PLAYER_ATTACKS.flykick, step: 0, hitDone: false }
        sfxWhoosh(1.4)
      }
    } else {
      const name = pressK ? 'kick' : 'punch'
      p.action = {
        type: 'attack',
        name,
        t: 0,
        def: PLAYER_ATTACKS[name],
        step: name === 'punch' ? p.comboStep : 0,
        hitDone: false
      }
      sfxWhoosh(name === 'kick' ? 0.8 : 1.1)
    }
  }
  if (consumePress('KeyL') && p.dynamite > 0 && p.onGround) {
    p.action = { type: 'throw', t: 0, hitDone: false }
  }
  if ((consumePress('ShiftLeft') || consumePress('ShiftRight')) && p.onGround && p.rollCd <= 0) {
    p.rollCd = P.rollCd
    p.action = { type: 'roll', t: 0 }
    p.invuln = Math.max(p.invuln, P.rollIframes)
    sfxRoll()
  }

  if (Math.abs(p.vx) > 20 && p.onGround) p.runPhase += dt * Math.abs(p.vx) * 0.045
  integrateFighter(p, dt)
}

function updateEnemy(e, dt) {
  const p = game.player
  e.stateT += dt
  e.showAim = false

  if (e.dead) {
    e.deadT += dt
    e.vx *= Math.pow(0.02, dt)
    integrateFighter(e, dt)
    if (e.deadT > 2.4) e.remove = true
    return
  }

  if (e.kind === 'boss' && !e.enraged && e.hp < e.maxHp * ENEMY_TYPES.boss.enrageAt) {
    e.enraged = true
    game.effects.push({ type: 'text', x: e.x, y: e.y - 150, txt: '狂暴！', t: 0, life: 1.2, color: '#ff5a3c' })
    sfxRoar()
  }

  if (e.downT > 0) {
    e.downT -= dt
    e.vx *= Math.pow(0.01, dt)
    integrateFighter(e, dt)
    if (e.downT <= 0) e.getupT = 0.4
    return
  }
  if (e.getupT > 0) {
    e.getupT -= dt
    e.vx = 0
    integrateFighter(e, dt)
    return
  }
  if (e.hurtT > 0) {
    e.hurtT -= dt
    e.vx *= Math.pow(0.05, dt)
    integrateFighter(e, dt)
    return
  }

  const dx = p.x - e.x
  const adx = Math.abs(dx)
  const dir = Math.sign(dx) || 1
  if (!p.dead && e.state !== 'enter') e.facing = dir
  e.cd = Math.max(0, e.cd - dt)

  // 行动进行中：出招 / 冲锋 / 投掷
  if (e.action) {
    const a = e.action
    a.t += dt
    if (a.type === 'strike') {
      const m = e.melee
      e.vx *= Math.pow(0.001, dt)
      if (!a.hitDone && a.t >= m.windup) {
        a.hitDone = true
        sfxWhoosh(0.7)
        if (!p.dead && inAttackRange(e, m.range, p)) {
          damagePlayer(m.damage, dir * m.knockback, 0, { x: p.x - dir * 10, y: p.y - 55 })
        }
      }
      if (a.t >= m.windup + 0.45) {
        e.action = null
        e.cd = m.cooldown
      }
    } else if (a.type === 'charge') {
      const c = e.chargeCfg
      e.vx = e.facing * c.speed
      e.runPhase += dt * 22
      if (
        !a.hitDone &&
        !p.dead &&
        Math.abs(p.x - e.x) < 60 * e.scale &&
        Math.abs(p.y - e.y) < 80
      ) {
        a.hitDone = true
        damagePlayer(c.damage, e.facing * 520, -320, { x: p.x - e.facing * 12, y: p.y - 55 })
        game.shake = Math.min(20, game.shake + 8)
      }
      integrateFighter(e, dt)
      if (a.t >= c.dur || e.x <= WALL_L + 16 || e.x >= VW - WALL_L - 16) {
        e.action = null
        e.cd = 1.1
        if (e.x <= WALL_L + 17 || e.x >= VW - WALL_L - 17) {
          game.shake = Math.min(20, game.shake + 6)
          dustAt(e.x, e.y, 8)
        }
      }
      return
    } else if (a.type === 'throw') {
      e.vx *= Math.pow(0.001, dt)
      if (!a.hitDone && a.t >= 0.24) {
        a.hitDone = true
        game.bombs.push(makeBomb(e.x + e.facing * 16, e.y - 64, clamp(dx * 1.15, -520, 520), -460))
        sfxThrow()
      }
      if (a.t >= 0.5) {
        e.action = null
        e.cd = 1.2
      }
    }
    integrateFighter(e, dt)
    return
  }

  // 从右侧门走进房间
  if (e.state === 'enter') {
    e.facing = -1
    e.vx = -e.speed * 0.8
    e.runPhase += dt * 9
    if (e.x <= e.spawnX) {
      e.state = 'chase'
      e.vx = 0
    }
    integrateFighter(e, dt)
    return
  }
  if (p.dead || game.fade) {
    e.vx = 0
    integrateFighter(e, dt)
    return
  }

  // ---- AI ----
  const enraged = e.kind === 'boss' && e.enraged
  const spdMul = enraged ? 1.25 : 1

  if (e.kind === 'boss') {
    e.bombT -= dt
    if (e.bombT <= 0 && adx > 180) {
      e.bombT = ENEMY_TYPES.boss.bombCycle * (enraged ? 0.7 : 1)
      e.action = { type: 'throw', t: 0, hitDone: false }
      integrateFighter(e, dt)
      return
    }
    if (adx > 250 && e.cd <= 0) {
      e.chargeCfg = ENEMY_TYPES.boss.charge
      e.action = { type: 'charge', t: 0, hitDone: false }
      game.effects.push({ type: 'text', x: e.x, y: e.y - 130 * e.scale, txt: '冲锋！', t: 0, life: 0.7, color: '#ffd23f' })
      sfxRoar()
      integrateFighter(e, dt)
      return
    }
    if (adx <= e.melee.range * 0.9 && e.cd <= 0) {
      e.action = { type: 'strike', t: 0, hitDone: false }
      integrateFighter(e, dt)
      return
    }
    e.vx = dir * e.speed * spdMul
    e.runPhase += dt * 8
    integrateFighter(e, dt)
    return
  }

  if (e.kind === 'gunner') {
    const R = e.ranged
    if (adx < R.keep - 80) {
      e.vx = -dir * e.speed // 背身拉开距离
      e.runPhase += dt * 7
    } else if (adx > R.keep + 90) {
      e.vx = dir * e.speed
      e.runPhase += dt * 7
    } else {
      e.vx = 0
    }
    if (adx < 70 && e.cd <= 0) {
      e.action = { type: 'strike', t: 0, hitDone: false } // 被贴脸就抽一巴掌
    } else {
      e.fireT -= dt
      if (e.fireT < R.aimTime) e.showAim = true
      if (e.fireT <= 0 && adx < 640) {
        e.fireT = R.fireCycle * (0.85 + Math.random() * 0.3)
        e.showAim = false
        const mx = e.x + e.facing * 30
        const my = e.y - 50
        const ang = Math.atan2(p.y - 52 - my, p.x - mx)
        game.bullets.push({
          x: mx,
          y: my,
          vx: Math.cos(ang) * R.bulletSpeed,
          vy: Math.sin(ang) * R.bulletSpeed,
          life: 2,
          remove: false
        })
        muzzleFlash(mx, my)
        sfxShot()
      }
    }
    integrateFighter(e, dt)
    return
  }

  // 近战杂兵
  if (adx > e.melee.range * 0.85) {
    e.vx = dir * e.speed * spdMul
    e.runPhase += dt * 8
    // 玩家跳上平台就追跳
    if (e.onGround && p.y < e.y - 70 && adx < 120) {
      e.vy = -800
      e.onGround = false
    }
  } else if (e.cd <= 0) {
    e.action = { type: 'strike', t: 0, hitDone: false }
    e.vx = 0
  } else {
    e.vx = 0
  }
  integrateFighter(e, dt)
}

function updateBullets(dt) {
  const p = game.player
  for (const b of game.bullets) {
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.life -= dt
    if (b.life <= 0 || b.x < WALL_L || b.x > VW - WALL_L || b.y < 40 || b.y > GROUND_Y) {
      b.remove = true
      sparkBurst(b.x, b.y, 4)
      continue
    }
    for (const c of game.crates) {
      if (!c.broken && Math.abs(b.x - c.x) < c.w && b.y > c.y - c.h - 4 && b.y < c.y) {
        b.remove = true
        damageCrate(c, 20)
        sparkBurst(b.x, b.y, 5)
        break
      }
    }
    if (b.remove) continue
    if (!p.dead && p.invuln <= 0 && Math.abs(b.x - p.x) < 13 && b.y > p.y - 92 && b.y < p.y + 2) {
      b.remove = true
      damagePlayer(9, Math.sign(b.vx) * 140, 0, { x: b.x, y: b.y })
    }
  }
  game.bullets = game.bullets.filter((b) => !b.remove)
}

function updateBombs(dt) {
  for (const b of game.bombs) {
    b.vy += GRAVITY * 0.92 * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.spin += dt * 9
    if (b.y >= GROUND_Y - 5) {
      b.y = GROUND_Y - 5
      if (Math.abs(b.vy) > 60) {
        b.vy = -b.vy * 0.42
        b.vx *= 0.6
      } else {
        b.vy = 0
        b.vx *= Math.pow(0.001, dt)
      }
    }
    if (b.x < WALL_L + 8) {
      b.x = WALL_L + 8
      b.vx = Math.abs(b.vx) * 0.5
    }
    if (b.x > VW - WALL_L - 8) {
      b.x = VW - WALL_L - 8
      b.vx = -Math.abs(b.vx) * 0.5
    }
    for (const pl of ROOMS[game.roomIndex].platforms) {
      if (b.x > pl.x && b.x < pl.x + pl.w && b.y > pl.y - 5 && b.y < pl.y + 12 && b.vy > 0) {
        b.y = pl.y - 5
        b.vy = -b.vy * 0.42
        b.vx *= 0.7
      }
    }
    b.fuse -= dt
    if (b.fuse <= 0) {
      b.remove = true
      explode(b.x, b.y - 6)
    } else if (Math.random() < 0.5) {
      game.particles.push({
        type: 'spark',
        x: b.x + Math.random() * 4 - 2,
        y: b.y - 13,
        vx: (Math.random() - 0.5) * 60,
        vy: -40 - Math.random() * 60,
        g: 300,
        size: 1.5,
        life: 0.3,
        maxLife: 0.3,
        color: '#ffc247'
      })
    }
  }
  game.bombs = game.bombs.filter((b) => !b.remove)
}

function updatePickups(dt) {
  const p = game.player
  for (const k of game.pickups) {
    k.t += dt
    if (!k.grounded) {
      k.vy += GRAVITY * 0.8 * dt
      k.y += k.vy * dt
      if (k.y >= GROUND_Y - 12) {
        k.y = GROUND_Y - 12
        k.grounded = true
      }
    }
    if (!p.dead && Math.abs(p.x - k.x) < 26 && Math.abs(p.y - 40 - k.y) < 60) {
      k.remove = true
      if (k.type === 'dynamite') {
        p.dynamite = Math.min(P.maxDynamite, p.dynamite + 1)
        game.effects.push({ type: 'text', x: k.x, y: k.y - 20, txt: '+1 炸药', t: 0, life: 0.9, color: '#ff9a4d' })
      } else {
        p.hp = Math.min(p.maxHp, p.hp + 30)
        game.effects.push({ type: 'text', x: k.x, y: k.y - 20, txt: '+30 生命', t: 0, life: 0.9, color: '#6fe08c' })
      }
      sfxPickup()
    }
  }
  game.pickups = game.pickups.filter((k) => !k.remove)
}

function step(dt) {
  const g = game
  if (g.fade) {
    g.fade.t += dt
    if (!g.fade.midDone && g.fade.t >= g.fade.dur / 2) {
      g.fade.midDone = true
      g.fade.onMid()
    }
    if (g.fade.t >= g.fade.dur) g.fade = null
    updateParticles(dt)
    updateEffects(dt)
    g.shake = Math.max(0, g.shake - dt * 40)
    return
  }
  if (g.hitstop > 0) {
    g.hitstop -= dt
    updateParticles(dt * 0.35)
    g.shake = Math.max(0, g.shake - dt * 26)
    return
  }
  g.time += dt
  if (g.comboTimer > 0) {
    g.comboTimer -= dt
    if (g.comboTimer <= 0) g.combo = 0
  }
  g.comboPop = Math.max(0, g.comboPop - dt * 3)
  if (g.banner.t > 0) g.banner.t -= dt
  g.shake = Math.max(0, g.shake - dt * 34)

  updatePlayer(dt)
  for (const e of g.enemies) updateEnemy(e, dt)
  g.enemies = g.enemies.filter((e) => !e.remove)
  separateEnemies(dt)
  playerEnemySoft(dt)
  updateBullets(dt)
  updateBombs(dt)
  updatePickups(dt)
  updateParticles(dt)
  updateEffects(dt)

  // 清场后走进右侧出口 → 下一房间 / 通关
  if (g.doorOpen && !g.fade && !g.player.dead) {
    if (g.player.x > VW - WALL_L - 52) {
      if (g.roomIndex >= ROOMS.length - 1) {
        g.fade = {
          t: 0,
          dur: 0.9,
          midDone: false,
          onMid: () => {
            finishStats()
            phase.value = 'win'
          }
        }
      } else {
        const next = g.roomIndex + 1
        g.fade = { t: 0, dur: 1.0, midDone: false, onMid: () => loadRoom(next) }
      }
    }
  }
}

// ============ 姿态与渲染 ============

// 两骨 IK：返回中间关节 (jx/jy) 与夹紧后的末端 (ex/ey)
function ik(ax, ay, bx, by, l1, l2, dir) {
  let dx = bx - ax
  let dy = by - ay
  let d = Math.hypot(dx, dy)
  const maxD = l1 + l2 - 0.5
  if (d > maxD) {
    dx *= maxD / d
    dy *= maxD / d
    d = maxD
    bx = ax + dx
    by = ay + dy
  }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))
  const ux = dx / d
  const uy = dy / d
  return { jx: ax + ux * a - uy * h * dir, jy: ay + uy * a + ux * h * dir, ex: bx, ey: by }
}

// 依据fighter当前状态计算姿态（局部坐标）
function poseOf(f, time) {
  const isPlayer = f === game.player
  const seed = f.seed || 0
  const base = {
    hipX: 0,
    hipY: -HIP_H,
    lean: isPlayer ? 0.06 : 0.02,
    footF: { x: 10, y: 0 },
    footB: { x: -9, y: 0 },
    handF: isPlayer ? { x: 13, y: -52 } : { x: 6, y: -24 },
    handB: isPlayer ? { x: 2, y: -46 } : { x: -6, y: -24 },
    rot: 0,
    lying: false,
    neck: null,
    head: null
  }

  // 倒地 / 死亡：手摆一个仰面朝天的姿势
  if (f.dead || f.downT > 0) {
    return {
      ...base,
      lying: true,
      rot: ((seed % 1) - 0.5) * 0.12,
      hipX: 2,
      hipY: -11,
      neck: { x: -24, y: -14 },
      head: { x: -35, y: -11 },
      footF: { x: 33, y: -3 },
      footB: { x: 27, y: -1 },
      handF: { x: -13, y: -2 },
      handB: { x: -27, y: -8 }
    }
  }
  if (f.getupT > 0) {
    const u = 1 - f.getupT / 0.4
    const h = -14 - u * (HIP_H - 14)
    return {
      ...base,
      hipY: h,
      lean: 0.34 - u * 0.28,
      footF: { x: 13, y: 0 },
      footB: { x: -13, y: 0 },
      handF: { x: 12, y: h + 8 },
      handB: { x: -6, y: h + 10 }
    }
  }
  if (f.action && f.action.type === 'roll') {
    return { ...base, lying: false, rot: f.rollSpin, hipY: -28, neck: { x: 8, y: -32 }, head: { x: 16, y: -33 }, footF: { x: 2, y: -20 }, footB: { x: -2, y: -18 }, handF: { x: 10, y: -24 }, handB: { x: 4, y: -22 } }
  }
  if (f.hurtT > 0) {
    return {
      ...base,
      lean: -0.35,
      hipY: -43,
      handF: { x: 7, y: -58 },
      handB: { x: -7, y: -54 },
      footF: { x: 14, y: 0 },
      footB: { x: -13, y: 0 }
    }
  }

  const a = f.action
  if (a && a.type === 'attack') {
    const u = a.t / a.def.dur
    if (a.name === 'flykick') {
      return {
        ...base,
        lean: -0.5,
        hipY: -43,
        footF: { x: 37, y: -50 },
        footB: { x: 27, y: -43 },
        handF: { x: -10, y: -46 },
        handB: { x: -15, y: -42 }
      }
    }
    if (a.name === 'kick') {
      let fx
      let fy
      let ln
      if (u < 0.42) {
        const w = u / 0.42
        fx = lerp(11, 15, w)
        fy = lerp(0, -46, easeOut(w))
        ln = lerp(0.06, -0.08, w)
      } else if (u < 0.66) {
        const w = easeOut((u - 0.42) / 0.24)
        fx = lerp(15, 48, w)
        fy = lerp(-46, -56, w)
        ln = lerp(-0.08, -0.16, w)
      } else {
        const w = (u - 0.66) / 0.34
        fx = lerp(48, 11, w)
        fy = lerp(-56, 0, w)
        ln = lerp(-0.16, 0.06, w)
      }
      return {
        ...base,
        lean: ln,
        hipY: -44,
        footF: { x: fx, y: fy },
        footB: { x: -9, y: 0 },
        handF: { x: -6, y: -50 },
        handB: { x: 11, y: -45 }
      }
    }
    // 三段拳
    const stepIdx = a.step || 0
    let hx
    if (u < 0.3) hx = lerp(13, -7, u / 0.3)
    else if (u < 0.55) hx = lerp(-7, stepIdx === 2 ? 37 : 33, easeOut((u - 0.3) / 0.25))
    else hx = lerp(stepIdx === 2 ? 37 : 33, 13, (u - 0.55) / 0.45)
    return {
      ...base,
      lean: 0.14 + u * 0.08,
      hipX: stepIdx === 2 ? 5 : 2,
      handF: { x: hx, y: stepIdx === 2 ? -47 : -51 },
      footF: { x: 12, y: 0 },
      footB: { x: -11, y: 0 }
    }
  }
  if (a && a.type === 'throw') {
    const u = a.t / 0.42
    let hx
    let hy
    if (u < 0.38) {
      const w = u / 0.38
      hx = lerp(13, -6, w)
      hy = lerp(-52, -66, w)
    } else if (u < 0.62) {
      const w = easeOut((u - 0.38) / 0.24)
      hx = lerp(-6, 26, w)
      hy = lerp(-66, -54, w)
    } else {
      const w = (u - 0.62) / 0.38
      hx = lerp(26, 13, w)
      hy = lerp(-54, -52, w)
    }
    return { ...base, lean: 0.12, handF: { x: hx, y: hy } }
  }
  if (a && a.type === 'strike') {
    const m = f.melee
    if (a.t < m.windup) {
      const k = easeOut(a.t / m.windup)
      return {
        ...base,
        lean: -0.12,
        handF: { x: lerp(6, -9, k), y: lerp(-50, -62, k) },
        handB: { x: -4, y: -44 },
        footF: { x: 12, y: 0 },
        footB: { x: -12, y: 0 }
      }
    }
    const k2 = Math.min(1, (a.t - m.windup) / 0.13)
    return {
      ...base,
      lean: 0.2,
      handF: { x: lerp(-9, 33, easeOut(k2)), y: lerp(-62, -50, k2) },
      handB: { x: -4, y: -44 },
      footF: { x: 15, y: 0 },
      footB: { x: -13, y: 0 }
    }
  }
  if (a && a.type === 'charge') {
    const ph = f.runPhase
    return {
      ...base,
      lean: 0.52,
      hipY: -42,
      footF: { x: Math.cos(ph) * 20, y: -Math.max(0, Math.sin(ph)) * 15 },
      footB: { x: Math.cos(ph + Math.PI) * 20, y: -Math.max(0, Math.sin(ph + Math.PI)) * 15 },
      handF: { x: Math.cos(ph + Math.PI) * 16 + 10, y: -52 },
      handB: { x: Math.cos(ph) * 16 - 8, y: -50 }
    }
  }
  // 枪手举枪瞄准
  if (f.showAim) {
    return { ...base, lean: 0.12, handF: { x: 27, y: -51 }, handB: { x: 19, y: -48 } }
  }
  // 空中
  if (!f.onGround) {
    if (f.vy < 0) {
      return {
        ...base,
        lean: 0.12,
        footF: { x: 12, y: -30 },
        footB: { x: -4, y: -24 },
        handF: { x: 8, y: -60 },
        handB: { x: -10, y: -56 }
      }
    }
    return {
      ...base,
      lean: 0.02,
      footF: { x: 13, y: -16 },
      footB: { x: -7, y: -10 },
      handF: { x: 16, y: -54 },
      handB: { x: -15, y: -52 }
    }
  }
  // 跑动
  if (Math.abs(f.vx) > 25) {
    const ph = f.runPhase
    const back = f !== game.player && Math.sign(f.vx) !== f.facing
    return {
      ...base,
      lean: back ? 0.1 : 0.24,
      hipY: -HIP_H + Math.sin(ph * 2) * 1.5,
      footF: { x: Math.cos(ph) * 18, y: -Math.max(0, Math.sin(ph)) * 13 },
      footB: { x: Math.cos(ph + Math.PI) * 18, y: -Math.max(0, Math.sin(ph + Math.PI)) * 13 },
      handF: { x: Math.cos(ph + Math.PI) * 14 + 6, y: -49 },
      handB: { x: Math.cos(ph) * 14 - 6, y: -49 }
    }
  }
  // 站立呼吸
  const bob = Math.sin(time * 2.2 + seed * 7) * 1.3
  return {
    ...base,
    hipY: -HIP_H + bob,
    handF: { x: base.handF.x, y: base.handF.y + bob * 0.6 },
    handB: { x: base.handB.x, y: base.handB.y + bob * 0.6 }
  }
}

function strokeLimb(color, root, ikr) {
  ctx.strokeStyle = color
  ctx.beginPath()
  ctx.moveTo(root.x, root.y)
  ctx.lineTo(ikr.jx, ikr.jy)
  ctx.lineTo(ikr.ex, ikr.ey)
  ctx.stroke()
}

function clubAngle(f) {
  const a = f.action
  if (a && a.type === 'strike') {
    const m = f.melee
    if (a.t < m.windup) return lerp(0.85, -1.9, easeOut(a.t / m.windup))
    return lerp(-1.9, 0.1, Math.min(1, (a.t - m.windup) / 0.13))
  }
  return 0.85
}

function drawFighter(f, time) {
  const c = ctx
  const s = f.scale || 1
  const pose = poseOf(f, time)
  let alpha = 1
  if (f.dead) alpha = Math.max(0, 1 - Math.max(0, f.deadT - 1.3))
  if (f === game.player && f.invuln > 0 && !f.dead) alpha = 0.55 + Math.sin(time * 30) * 0.3

  c.save()
  c.translate(f.x, f.y)
  c.scale(f.facing * s, s)
  if (pose.rot) c.rotate(pose.rot)
  c.globalAlpha = alpha
  const main = f.hurtT > 0.12 ? '#ffffff' : f.color
  const dark = f.dark || f.color
  c.lineWidth = f.lineWidth || 4.5
  c.lineCap = 'round'
  c.lineJoin = 'round'

  let neck
  let head
  if (pose.lying || (pose.neck && pose.head)) {
    neck = pose.neck
    head = pose.head
  } else {
    neck = { x: pose.hipX + Math.sin(pose.lean) * TORSO, y: pose.hipY - Math.cos(pose.lean) * TORSO }
    head = { x: neck.x + Math.sin(pose.lean) * 15, y: neck.y - Math.cos(pose.lean) * 15 }
  }
  const hip = { x: pose.hipX, y: pose.hipY }
  const shoulder = { x: neck.x, y: neck.y + 3 }
  const legF = ik(hip.x, hip.y, pose.footF.x, pose.footF.y, THIGH, SHIN, -1)
  const legB = ik(hip.x, hip.y, pose.footB.x, pose.footB.y, THIGH, SHIN, -1)
  const armF = ik(shoulder.x, shoulder.y, pose.handF.x, pose.handF.y, UPPER, FORE, -1)
  const armB = ik(shoulder.x, shoulder.y, pose.handB.x, pose.handB.y, UPPER, FORE, -1)

  // 远侧肢体 → 躯干 → 近侧肢体 → 头
  strokeLimb(dark, hip, legB)
  strokeLimb(dark, shoulder, armB)
  c.strokeStyle = main
  c.beginPath()
  c.moveTo(neck.x, neck.y)
  c.lineTo(hip.x, hip.y)
  c.stroke()
  strokeLimb(main, hip, legF)
  strokeLimb(main, shoulder, armF)
  c.fillStyle = main
  c.beginPath()
  c.arc(head.x, head.y, HEAD_R, 0, Math.PI * 2)
  c.fill()

  // 玩家红头带 + 飘带
  if (f === game.player && !pose.lying) {
    c.strokeStyle = '#d4452f'
    c.lineWidth = 3.2
    c.beginPath()
    c.moveTo(head.x - HEAD_R + 1, head.y - 3)
    c.lineTo(head.x + HEAD_R - 1, head.y - 3)
    c.stroke()
    c.beginPath()
    c.moveTo(head.x - HEAD_R, head.y - 3)
    for (let i = 1; i <= 3; i++) {
      c.lineTo(head.x - HEAD_R - i * 8, head.y - 4 + Math.sin(time * 9 + i * 1.4) * (2 + i))
    }
    c.stroke()
  }
  // Boss 怒眉
  if (f.kind === 'boss') {
    c.strokeStyle = '#5c130b'
    c.lineWidth = 2.4
    c.beginPath()
    c.moveTo(head.x + 1, head.y - 4)
    c.lineTo(head.x + 7, head.y - 1.5)
    c.moveTo(head.x + 1, head.y + 1.5)
    c.lineTo(head.x + 7, head.y - 1)
    c.stroke()
  }
  // 武器
  const wpn = f.cfg && f.cfg.weapon
  if (wpn === 'club' && !pose.lying) {
    const ang = clubAngle(f)
    c.strokeStyle = '#8a6a42'
    c.lineWidth = 4
    c.beginPath()
    c.moveTo(armF.jx, armF.jy)
    c.lineTo(armF.jx + Math.cos(ang) * 38, armF.jy + Math.sin(ang) * 38)
    c.stroke()
  } else if (wpn === 'gun' && !pose.lying) {
    const gAng = Math.atan2(pose.handF.y - shoulder.y, pose.handF.x - shoulder.x)
    c.save()
    c.translate(armF.ex, armF.ey)
    c.rotate(gAng)
    c.fillStyle = '#23262c'
    c.fillRect(-3, -3, 20, 6)
    c.fillRect(4, 3, 4, 5)
    c.restore()
  }
  c.restore()

  // ---- 世界坐标下的附加标记 ----
  // 出招预警「!」
  if (f.action && f.action.type === 'strike' && !f.action.hitDone && f !== game.player) {
    const bob = Math.sin(time * 18) * 3
    c.fillStyle = '#ffd23f'
    c.font = `bold ${Math.round(20 * s)}px system-ui, sans-serif`
    c.textAlign = 'center'
    c.fillText('!', f.x, f.y - 118 * s + bob)
  }
  // 枪手瞄准线
  if (f.showAim) {
    const p = game.player
    c.strokeStyle = `rgba(255, 70, 50, ${0.35 + Math.sin(time * 24) * 0.25})`
    c.lineWidth = 1.5
    c.setLineDash([6, 6])
    c.beginPath()
    c.moveTo(f.x + f.facing * 30, f.y - 50)
    c.lineTo(p.x, p.y - 52)
    c.stroke()
    c.setLineDash([])
  }
  // Boss 冲锋轨迹预警
  if (f.action && f.action.type === 'charge' && !f.action.hitDone) {
    c.strokeStyle = 'rgba(255, 80, 60, 0.5)'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(f.x + f.facing * 30, f.y - 55 * s)
    c.lineTo(f.x + f.facing * 200, f.y - 55 * s)
    c.stroke()
  }
}

function drawLamp(x, time) {
  const c = ctx
  const flick = 0.9 + Math.sin(time * 17 + x) * 0.03 + Math.sin(time * 5.3 + x * 2) * 0.05
  c.strokeStyle = 'rgba(0,0,0,0.5)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(x, 0)
  c.lineTo(x, 52)
  c.stroke()
  const cone = c.createLinearGradient(0, 60, 0, GROUND_Y)
  cone.addColorStop(0, `rgba(255, 220, 150, ${0.1 * flick})`)
  cone.addColorStop(1, 'rgba(255, 220, 150, 0)')
  c.fillStyle = cone
  c.beginPath()
  c.moveTo(x - 12, 60)
  c.lineTo(x + 12, 60)
  c.lineTo(x + 95, GROUND_Y)
  c.lineTo(x - 95, GROUND_Y)
  c.closePath()
  c.fill()
  c.fillStyle = '#d8c9a0'
  c.beginPath()
  c.moveTo(x - 14, 52)
  c.lineTo(x + 14, 52)
  c.lineTo(x + 9, 64)
  c.lineTo(x - 9, 64)
  c.closePath()
  c.fill()
  c.fillStyle = `rgba(255, 235, 170, ${flick})`
  c.beginPath()
  c.arc(x, 62, 4, 0, Math.PI * 2)
  c.fill()
}

function drawDoor(x, isExit, time) {
  const c = ctx
  const w = DOOR_W
  const h = 148
  const y = GROUND_Y - h
  c.fillStyle = '#241d16'
  c.fillRect(x - 6, y - 8, w + 12, h + 8)
  if (isExit && game.doorOpen) {
    const gl = c.createLinearGradient(x, y, x, GROUND_Y)
    gl.addColorStop(0, 'rgba(255, 214, 130, 0.9)')
    gl.addColorStop(1, 'rgba(255, 170, 80, 0.65)')
    c.fillStyle = gl
    c.fillRect(x, y, w, h)
    const sp = c.createLinearGradient(0, GROUND_Y - 4, 0, GROUND_Y + 40)
    sp.addColorStop(0, 'rgba(255, 200, 110, 0.3)')
    sp.addColorStop(1, 'rgba(255, 200, 110, 0)')
    c.fillStyle = sp
    c.fillRect(x - 90, GROUND_Y - 4, w + 90, 44)
    const bob = Math.sin(time * 5) * 5
    c.fillStyle = '#ffd76a'
    c.font = 'bold 26px system-ui, sans-serif'
    c.textAlign = 'center'
    c.fillText('→', x + w / 2, y - 22 + bob)
    c.font = 'bold 13px system-ui, sans-serif'
    c.fillText('出口', x + w / 2, y - 44 + bob)
  } else {
    c.fillStyle = '#4d4136'
    c.fillRect(x, y, w, h)
    c.strokeStyle = 'rgba(0,0,0,0.35)'
    c.lineWidth = 2
    c.strokeRect(x + 8, y + 10, w - 16, h - 24)
    c.fillStyle = '#8a7a5f'
    c.beginPath()
    c.arc(x + w - 14, y + h / 2, 3.5, 0, Math.PI * 2)
    c.fill()
  }
}

function drawRoom(time) {
  const r = ROOMS[game.roomIndex]
  const c = ctx
  const grad = c.createLinearGradient(0, 0, 0, GROUND_Y)
  grad.addColorStop(0, '#2a2f38')
  grad.addColorStop(1, '#20242b')
  c.fillStyle = grad
  c.fillRect(0, 0, VW, GROUND_Y)
  c.strokeStyle = 'rgba(255,255,255,0.045)'
  c.lineWidth = 2
  for (let x = 60; x < VW; x += 96) {
    c.beginPath()
    c.moveTo(x, 40)
    c.lineTo(x, GROUND_Y)
    c.stroke()
  }
  c.fillStyle = 'rgba(0,0,0,0.18)'
  c.fillRect(0, GROUND_Y - 46, VW, 46)
  c.fillStyle = 'rgba(255,255,255,0.05)'
  c.fillRect(0, GROUND_Y - 48, VW, 3)
  const fg = c.createLinearGradient(0, GROUND_Y, 0, VH)
  fg.addColorStop(0, '#4a3b2d')
  fg.addColorStop(1, '#2e251c')
  c.fillStyle = fg
  c.fillRect(0, GROUND_Y, VW, VH - GROUND_Y)
  c.strokeStyle = 'rgba(0,0,0,0.25)'
  for (let x = 30; x < VW; x += 72) {
    c.beginPath()
    c.moveTo(x + ((x / 72) % 2 ? 18 : 0), GROUND_Y + 6)
    c.lineTo(x - 14, VH)
    c.stroke()
  }
  c.fillStyle = 'rgba(255,255,255,0.08)'
  c.fillRect(0, GROUND_Y, VW, 2)

  for (const lx of r.lamps) drawLamp(lx, time)

  for (const pl of r.platforms) {
    c.strokeStyle = 'rgba(0,0,0,0.4)'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(pl.x + 18, 60)
    c.lineTo(pl.x + 18, pl.y)
    c.moveTo(pl.x + pl.w - 18, 60)
    c.lineTo(pl.x + pl.w - 18, pl.y)
    c.stroke()
    const pg = c.createLinearGradient(0, pl.y, 0, pl.y + 12)
    pg.addColorStop(0, '#6a5744')
    pg.addColorStop(1, '#3c3128')
    c.fillStyle = pg
    c.fillRect(pl.x, pl.y, pl.w, 12)
    c.fillStyle = 'rgba(255,255,255,0.12)'
    c.fillRect(pl.x, pl.y, pl.w, 2)
  }

  c.fillStyle = '#171a20'
  c.fillRect(0, 0, WALL_L, GROUND_Y + 30)
  c.fillRect(VW - WALL_L, 0, WALL_L, GROUND_Y + 30)
  drawDoor(72, false, time)
  drawDoor(VW - WALL_L - 6, true, time)

  if (game.roomIndex === ROOMS.length - 1) {
    c.fillStyle = 'rgba(190, 40, 30, 0.05)'
    c.fillRect(0, 0, VW, VH)
  }
}

function drawCrates() {
  const c = ctx
  for (const cr of game.crates) {
    if (cr.broken) continue
    if (cr.shakeT > 0) cr.shakeT -= 1 / 60
    const sx = cr.shakeT > 0 ? Math.sin(cr.shakeT * 60) * 2 : 0
    const x = cr.x - cr.w + sx
    const y = cr.y - cr.h
    c.fillStyle = '#7c5f3c'
    c.fillRect(x, y, cr.w * 2, cr.h)
    c.strokeStyle = '#54401f'
    c.lineWidth = 2
    c.strokeRect(x + 1, y + 1, cr.w * 2 - 2, cr.h - 2)
    c.beginPath()
    c.moveTo(x + 3, y + 3)
    c.lineTo(x + cr.w * 2 - 3, y + cr.h - 3)
    c.moveTo(x + cr.w * 2 - 3, y + 3)
    c.lineTo(x + 3, y + cr.h - 3)
    c.stroke()
  }
}

function drawPickups() {
  const c = ctx
  for (const k of game.pickups) {
    const y = k.grounded ? k.y + Math.sin(k.t * 3 + k.x) * 3 : k.y
    c.save()
    c.translate(k.x, y)
    c.fillStyle = 'rgba(255,255,255,0.1)'
    c.beginPath()
    c.arc(0, 0, 16, 0, Math.PI * 2)
    c.fill()
    if (k.type === 'dynamite') {
      c.fillStyle = '#c23327'
      c.fillRect(-9, -6, 18, 12)
      c.fillStyle = '#2b2b2b'
      c.fillRect(-2, -6, 4, 12)
      c.strokeStyle = '#e8c07a'
      c.lineWidth = 2
      c.beginPath()
      c.moveTo(0, -6)
      c.quadraticCurveTo(4, -12, 8, -13)
      c.stroke()
    } else {
      c.fillStyle = '#f4f6f8'
      c.fillRect(-10, -8, 20, 16)
      c.fillStyle = '#3fae6a'
      c.fillRect(-2.5, -6, 5, 12)
      c.fillRect(-7, -2.5, 14, 5)
    }
    c.restore()
  }
}

function drawBombs() {
  const c = ctx
  for (const b of game.bombs) {
    c.save()
    c.translate(b.x, b.y)
    c.rotate(Math.sin(b.spin) * 0.5)
    const blink = b.fuse < 0.6 && Math.sin(b.fuse * 40) > 0
    c.fillStyle = blink ? '#ff6a55' : '#c23327'
    c.fillRect(-11, -7, 22, 14)
    c.fillStyle = '#2b2b2b'
    c.fillRect(-3, -7, 6, 14)
    c.strokeStyle = '#e8c07a'
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(0, -7)
    c.quadraticCurveTo(5, -14, 10, -15)
    c.stroke()
    c.fillStyle = Math.random() < 0.5 ? '#ffc247' : '#fff3b0'
    c.beginPath()
    c.arc(10, -15, 2.5 + Math.random() * 1.5, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }
}

function drawBullets() {
  const c = ctx
  c.strokeStyle = '#ffd23f'
  c.lineWidth = 2.5
  for (const b of game.bullets) {
    c.beginPath()
    c.moveTo(b.x - b.vx * 0.028, b.y - b.vy * 0.028)
    c.lineTo(b.x, b.y)
    c.stroke()
  }
}

function drawParticles() {
  const c = ctx
  for (const q of game.particles) {
    const a = Math.max(0, q.life / (q.maxLife || 1))
    if (q.type === 'smoke') {
      c.fillStyle = `rgba(70, 66, 60, ${a * 0.5})`
      c.beginPath()
      c.arc(q.x, q.y, q.size * (1.6 - a * 0.6), 0, Math.PI * 2)
      c.fill()
    } else if (q.type === 'spark') {
      c.globalAlpha = a
      c.fillStyle = q.color || '#ffc247'
      c.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size)
      c.globalAlpha = 1
    } else if (q.type === 'puff') {
      c.fillStyle = `rgba(160, 155, 145, ${a * 0.4})`
      c.beginPath()
      c.arc(q.x, q.y, q.size * (1.5 - a * 0.5), 0, Math.PI * 2)
      c.fill()
    } else if (q.type === 'splinter') {
      c.save()
      c.translate(q.x, q.y)
      c.rotate(q.spin)
      c.fillStyle = `rgba(122, 95, 60, ${a})`
      c.fillRect(-q.size, -q.size / 2, q.size * 2, q.size)
      c.restore()
    } else {
      c.fillStyle = q.color || '#c81e1e'
      c.beginPath()
      c.arc(q.x, q.y, q.size, 0, Math.PI * 2)
      c.fill()
    }
  }
}

function drawEffects() {
  const c = ctx
  for (const fx of game.effects) {
    if (fx.type === 'boom') {
      const u = fx.t / fx.life
      c.strokeStyle = `rgba(255, 190, 90, ${1 - u})`
      c.lineWidth = 8 * (1 - u) + 2
      c.beginPath()
      c.arc(fx.x, fx.y, 20 + u * 120, 0, Math.PI * 2)
      c.stroke()
      if (u < 0.3) {
        c.fillStyle = `rgba(255, 240, 200, ${0.9 - u * 3})`
        c.beginPath()
        c.arc(fx.x, fx.y, 30 + u * 90, 0, Math.PI * 2)
        c.fill()
      }
    } else if (fx.type === 'text') {
      const u = fx.t / fx.life
      c.globalAlpha = 1 - u
      c.fillStyle = fx.color || '#fff'
      c.font = 'bold 15px system-ui, sans-serif'
      c.textAlign = 'center'
      c.fillText(fx.txt, fx.x, fx.y - u * 36)
      c.globalAlpha = 1
    } else if (fx.type === 'muzzle') {
      const u = fx.t / fx.life
      c.fillStyle = `rgba(255, 220, 120, ${1 - u})`
      c.beginPath()
      c.arc(fx.x, fx.y, 6 + u * 8, 0, Math.PI * 2)
      c.fill()
    }
  }
}

function drawBanner() {
  const b = game.banner
  if (!b || b.t <= 0) return
  const c = ctx
  const a = Math.min(1, (2.4 - b.t) / 0.25, b.t / 0.5)
  c.globalAlpha = Math.max(0, a)
  c.textAlign = 'center'
  c.fillStyle = '#f0e6d2'
  c.font = 'bold 34px system-ui, sans-serif'
  c.fillText(b.text, VW / 2, 130)
  c.fillStyle = 'rgba(232, 236, 242, 0.6)'
  c.font = '15px system-ui, sans-serif'
  c.fillText(b.sub, VW / 2, 158)
  c.globalAlpha = 1
}

function drawHUD() {
  const c = ctx
  const g = game
  const p = g.player
  const r = ROOMS[g.roomIndex]

  c.fillStyle = 'rgba(10, 12, 14, 0.6)'
  c.fillRect(16, 14, 232, 50)
  c.fillStyle = '#f2c14e'
  c.font = 'bold 13px system-ui, sans-serif'
  c.textAlign = 'left'
  c.fillText('火柴侠', 26, 30)
  c.fillStyle = 'rgba(255,255,255,0.15)'
  c.fillRect(26, 36, 204, 10)
  c.fillStyle = p.hp > 35 ? '#5ec269' : '#d4452f'
  c.fillRect(26, 36, 204 * clamp(p.hp / 100, 0, 1), 10)
  for (let i = 0; i < p.dynamite; i++) {
    const x = 28 + i * 20
    c.fillStyle = '#c23327'
    c.fillRect(x, 52, 13, 8)
    c.fillStyle = '#2b2b2b'
    c.fillRect(x + 4.5, 52, 4, 8)
  }

  c.fillStyle = 'rgba(10, 12, 14, 0.6)'
  c.fillRect(VW - 250, 14, 234, 40)
  c.textAlign = 'right'
  c.fillStyle = '#e8ecf2'
  c.font = 'bold 13px system-ui, sans-serif'
  c.fillText(`${r.name}（${g.roomIndex + 1}/${ROOMS.length}）`, VW - 26, 31)
  const alive = g.enemies.filter((e) => !e.dead).length
  c.fillStyle = alive > 0 ? '#ff8a75' : '#7ddb8a'
  c.font = '12px system-ui, sans-serif'
  c.fillText(alive > 0 ? `剩余敌人 ${alive}` : '房间已清空', VW - 26, 48)

  const boss = g.enemies.find((e) => e.kind === 'boss' && !e.dead)
  if (boss) {
    c.textAlign = 'center'
    c.fillStyle = 'rgba(10, 12, 14, 0.6)'
    c.fillRect(VW / 2 - 190, 12, 380, 30)
    c.fillStyle = '#ff9f8a'
    c.font = 'bold 12px system-ui, sans-serif'
    c.fillText(`头目 · ${boss.cfg.label}`, VW / 2, 26)
    c.fillStyle = 'rgba(255,255,255,0.15)'
    c.fillRect(VW / 2 - 170, 30, 340, 7)
    c.fillStyle = '#d4452f'
    c.fillRect(VW / 2 - 170, 30, 340 * clamp(boss.hp / boss.maxHp, 0, 1), 7)
  }

  if (g.combo >= 2 && g.comboTimer > 0) {
    c.save()
    c.translate(VW - 70, 170)
    const pop = 1 + g.comboPop * 0.5
    c.scale(pop, pop)
    c.textAlign = 'center'
    c.globalAlpha = Math.min(1, g.comboTimer)
    c.font = 'italic bold 30px system-ui, sans-serif'
    c.strokeStyle = 'rgba(0,0,0,0.6)'
    c.lineWidth = 4
    c.strokeText(`${g.combo} 连击`, 0, 0)
    c.fillStyle = '#ffd23f'
    c.fillText(`${g.combo} 连击`, 0, 0)
    c.restore()
  }

  if (g.roomIndex === 0 && !g.doorOpen) {
    c.textAlign = 'center'
    c.fillStyle = 'rgba(232, 236, 242, 0.55)'
    c.font = '13px system-ui, sans-serif'
    c.fillText('A/D 移动 · W 跳跃 · J 拳 · K 腿 · Shift 翻滚闪避 · L 扔炸药', VW / 2, VH - 14)
  }
}

function render(time) {
  const c = ctx
  c.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (game.shake > 0.3) {
    c.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake)
  }
  drawRoom(time)
  c.drawImage(stains, 0, 0, VW, VH)
  drawCrates()
  drawPickups()
  for (const e of game.enemies) if (e.dead) drawFighter(e, time)
  drawBombs()
  drawBullets()
  for (const e of game.enemies) if (!e.dead) drawFighter(e, time)
  drawFighter(game.player, time)
  drawParticles()
  drawEffects()
  // 暗角
  const vg = c.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VW * 0.72)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.42)')
  c.fillStyle = vg
  c.fillRect(0, 0, VW, VH)
  drawBanner()
  drawHUD()
  if (game.fade) {
    const f = game.fade
    const a = f.t < f.dur / 2 ? f.t / (f.dur / 2) : Math.max(0, (f.dur - f.t) / (f.dur / 2))
    c.fillStyle = `rgba(8, 8, 10, ${a})`
    c.fillRect(-20, -20, VW + 40, VH + 40)
  }
}

// ============ 主循环与生命周期 ============

function frame(now) {
  rafId = requestAnimationFrame(frame)
  const dt = Math.min(0.033, (now - lastTime) / 1000 || 0)
  lastTime = now
  if (phase.value === 'playing') step(dt)
  render(now / 1000)
}

onMounted(() => {
  const cv = canvasRef.value
  ctx = cv.getContext('2d')
  dpr = Math.min(2, window.devicePixelRatio || 1)
  cv.width = VW * dpr
  cv.height = VH * dpr
  // 先挂监听与渲染循环，再初始化房间，任何一步异常都不至于让游戏完全无响应
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)
  document.addEventListener('visibilitychange', onVisibility)
  rafId = requestAnimationFrame(frame)
  game = newGame()
  loadRoom(0)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onBlur)
  document.removeEventListener('visibilitychange', onVisibility)
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
})
</script>

<template>
  <main class="stickfight">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>火柴人格斗 · 龙潭虎穴</h1>
      <p class="subtitle">只身杀入六层贼窝：拳脚连击、翻滚闪避、炸药开路，把每一层清干净。</p>
    </header>

    <div class="stage">
      <canvas ref="canvasRef" class="cv"></canvas>

      <div v-if="phase === 'ready'" class="overlay">
        <h2>火柴人格斗 · 龙潭虎穴</h2>
        <p class="story">
          黑帮掳走了人质，藏在六层小楼里。你只带了两包炸药和一双拳头——
          像成龙电影那样，灵活走位，逐屋清场，救出人质。
        </p>
        <div class="keys-guide">
          <span><kbd>A</kbd>/<kbd>D</kbd> 移动</span>
          <span><kbd>W</kbd> 跳跃</span>
          <span><kbd>J</kbd> 拳（三段连击）</span>
          <span><kbd>K</kbd> 腿（击退）</span>
          <span><kbd>Shift</kbd> 翻滚闪避</span>
          <span><kbd>L</kbd> 扔炸药包</span>
          <span><kbd>P</kbd> 暂停</span>
          <span><kbd>M</kbd> 静音</span>
        </div>
        <p class="tip">空中按 <kbd>J</kbd>/<kbd>K</kbd> 使出飞踢；打碎木箱捡炸药和医药包；被打中会中断连击。</p>
        <button class="big-btn" @click="startGame">开始突入</button>
      </div>

      <div v-else-if="phase === 'paused'" class="overlay dim">
        <h2>已暂停</h2>
        <p class="tip">按 <kbd>P</kbd> 或点击按钮继续</p>
        <button class="big-btn" @click="togglePause">继续战斗</button>
      </div>

      <div v-else-if="phase === 'dead'" class="overlay dim">
        <h2 class="bad">你倒下了……</h2>
        <p class="tip">
          击倒 {{ finalStats.ko }} 人 · 最高 {{ finalStats.maxCombo }} 连击 · 止步于「{{ finalStats.room }}」
        </p>
        <button class="big-btn" @click="startGame">再闯一次</button>
      </div>

      <div v-else-if="phase === 'win'" class="overlay dim">
        <h2 class="good">大楼清空，人质获救！</h2>
        <p class="tip">
          总击倒 {{ finalStats.ko }} 人 · 最高 {{ finalStats.maxCombo }} 连击 · 用时 {{ finalStats.time }} 秒
        </p>
        <button class="big-btn" @click="startGame">再玩一次</button>
      </div>
    </div>

    <section class="panel">
      <div class="controls">
        <h3>操作</h3>
        <ul>
          <li><kbd>A</kbd>/<kbd>D</kbd> 或 <kbd>←</kbd>/<kbd>→</kbd> 移动</li>
          <li><kbd>W</kbd>/<kbd>空格</kbd> 跳跃（可跳上平台）</li>
          <li><kbd>J</kbd> 拳击 · 连按打出三段连击</li>
          <li><kbd>K</kbd> 踢腿 · 击退并放倒敌人</li>
          <li>空中 <kbd>J</kbd>/<kbd>K</kbd> 飞踢</li>
          <li><kbd>Shift</kbd> 翻滚 · 闪避子弹与爆炸</li>
          <li><kbd>L</kbd> 投掷炸药包 · 木箱里能捡到补给</li>
        </ul>
      </div>
      <div class="settings">
        <h3>设置</h3>
        <label class="row"><input type="checkbox" v-model="soundOn" /> 音效（M 切换）</label>
        <label class="row">
          血腥程度
          <select v-model="bloodMode">
            <option value="off">关闭</option>
            <option value="normal">正常</option>
            <option value="gory">夸张</option>
          </select>
        </label>
        <button class="restart" @click="startGame">重新开始</button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.stickfight {
  max-width: 1020px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.top {
  margin-bottom: 18px;
}

.back {
  color: var(--color-primary);
  text-decoration: none;
  font-size: 14px;
}

.top h1 {
  margin: 10px 0 6px;
  font-size: 26px;
}

.subtitle {
  color: var(--color-muted);
  margin: 0;
}

.stage {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: #14161a;
}

.cv {
  display: block;
  width: 100%;
  height: auto;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  background: rgba(10, 11, 14, 0.82);
  color: #e8ecf2;
  padding: 24px;
}

.overlay.dim {
  background: rgba(10, 11, 14, 0.68);
}

.overlay h2 {
  margin: 0;
  font-size: 30px;
  letter-spacing: 2px;
}

.overlay .bad {
  color: #ff7a5c;
}

.overlay .good {
  color: #7ddb8a;
}

.story {
  max-width: 560px;
  margin: 0;
  color: rgba(232, 236, 242, 0.75);
  line-height: 1.7;
}

.keys-guide {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px 18px;
  max-width: 620px;
  color: rgba(232, 236, 242, 0.85);
  font-size: 14px;
}

.tip {
  margin: 0;
  color: rgba(232, 236, 242, 0.55);
  font-size: 13px;
}

.big-btn {
  margin-top: 6px;
  padding: 12px 42px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  background: #d4452f;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.12s ease, background 0.12s ease;
}

.big-btn:hover {
  transform: translateY(-2px);
  background: #e0543d;
}

kbd {
  display: inline-block;
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-bottom-width: 2px;
  background: rgba(255, 255, 255, 0.08);
  font-family: inherit;
  font-size: 12px;
  text-align: center;
}

.panel {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 18px;
}

.controls,
.settings {
  flex: 1 1 300px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 18px 20px;
}

.controls h3,
.settings h3 {
  margin: 0 0 10px;
  font-size: 15px;
}

.controls ul {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--color-muted);
  font-size: 14px;
  display: grid;
  gap: 8px;
}

.controls kbd {
  border-color: var(--color-border);
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--color-muted);
}

.row select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: #fff;
}

.restart {
  margin-top: 4px;
  padding: 8px 18px;
  font-size: 14px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  color: var(--color-text);
  border-radius: 8px;
  cursor: pointer;
}

.restart:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
