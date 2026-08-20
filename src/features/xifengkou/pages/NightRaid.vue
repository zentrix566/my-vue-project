<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 喜峰口 · 大刀夜袭
 * 1933 年 3 月 11 日夜，长城抗战中的喜峰口战役：二十九军赵登禹旅夜袭
 * 白台子、三家子一带日军宿营地，大刀队近战短兵、斩获甚众。
 *
 * 玩法：俯视敌营，玩家扮演大刀队员。哨兵提灯巡逻（视野锥内会被发现），
 * 巡逻队游走，帐篷里的日军警报后惊醒。潜行在灯光之外，背后挥刀暗杀；
 * 一旦被哨兵发现即鸣枪惊动全营。120 秒夜袭窗口内尽可能多歼敌，
 * 然后从地图底部撤离点撤出，按歼敌数评级。
 *
 * 配乐：全部由 Web Audio 实时合成，无任何音频文件。
 * 《大刀进行曲》（麦新 1937 年词曲，副题"献给二十九军大刀队"，已入公有
 * 领域）主旋律片段 + 进行曲鼓点，另有挥刀、砍中、枪声、号角等音效。
 *
 * 画面全部 Canvas 程序绘制，剪影风格，不渲染血腥细节。
 */

const W = 960
const H = 600
const TOTAL_ENEMIES = 20 // 4 哨兵 + 6 巡逻 + 10 睡兵
const NIGHT_WINDOW = 120 // 夜袭窗口（秒）

// ============ 界面状态 ============
const state = ref('menu') // menu | playing | ended
const menu = ref({ bgmOn: true })
const hud = ref({ hp: 100, timeLeft: NIGHT_WINDOW, kills: 0, alarm: false, evacuating: 0 })
const result = ref(null)
const historyOpen = ref(false)

// ============ 音频合成 ============
let audioCtx = null
let noiseBuf = null
let bgmGain = null
let bgmTimer = null
let bgmStep = 0
let bgmNextT = 0

// 音高表（C 大调转写，播放即为原调听感）
const NOTES = {
  G3: 196.0, A3: 220.0, C4: 261.63, D4: 293.66, E4: 329.63,
  G4: 392.0, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5
}

// 《大刀进行曲》主旋律主题（2/4 拍，每步 0.25s 八分音符）：
// 大刀向鬼子们的头上砍去！全国武装的弟兄们——
// 低音 G3 = "大"（附点），C5 高音区为词句主体，未精确复刻全曲，取辨识度最高的两句循环。
const MELODY = [
  // 小节1 大(附点) 刀
  'G3', null, null, 'C5',
  // 小节2 向 鬼 子 们
  'C5', 'D5', 'C5', 'C5',
  // 小节3 的 头 上 砍
  'C5', 'G3', 'A3', 'G3',
  // 小节4 去！
  'C5', null, null, null,
  // 小节5 全 国 武 装
  'C5', 'C5', 'C5', 'D5',
  // 小节6 的 弟 兄 们
  'C5', 'C5', 'G3', 'A3',
  // 小节7 们——（低音收束）
  'G3', null, null, null
]

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    bgmGain = audioCtx.createGain()
    bgmGain.gain.value = 0
    bgmGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function playNoise({ dur = 0.15, type = 'lowpass', from = 800, to = from, vol = 0.3, attack = 0.005, dest = null }) {
  if (!audioCtx) return
  const t = audioCtx.currentTime
  const src = audioCtx.createBufferSource()
  src.buffer = noiseBuf
  const filter = audioCtx.createBiquadFilter()
  filter.type = type
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur)
  const gain = audioCtx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(gain).connect(dest || audioCtx.destination)
  src.start(t)
  src.stop(t + dur + 0.05)
}

function playTone({ freq, dur = 0.15, type = 'square', vol = 0.2, slideTo = null, when = 0, dest = null }) {
  if (!audioCtx) return
  const t = audioCtx.currentTime + when
  const osc = audioCtx.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  const gain = audioCtx.createGain()
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(gain).connect(dest || audioCtx.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

const sfx = {
  swoosh() { playNoise({ dur: 0.12, type: 'bandpass', from: 700, to: 2600, vol: 0.28 }) },
  kill() {
    playTone({ freq: 170, dur: 0.12, type: 'sine', vol: 0.5, slideTo: 55 })
    playNoise({ dur: 0.06, from: 500, vol: 0.2 })
  },
  gun() {
    playNoise({ dur: 0.2, from: 1400, to: 300, vol: 0.34 })
    playTone({ freq: 210, dur: 0.06, type: 'square', vol: 0.12 })
  },
  hit() {
    playTone({ freq: 110, dur: 0.1, type: 'sine', vol: 0.5, slideTo: 60 })
    playNoise({ dur: 0.12, type: 'bandpass', from: 2600, to: 800, vol: 0.22 })
  },
  alarm() {
    // 号角三连，惊动全营
    ;['C5', 'G4', 'C5'].forEach((n, i) =>
      playTone({ freq: NOTES[n], dur: 0.18, type: 'sawtooth', vol: 0.3, when: i * 0.2 }))
  },
  retreat() {
    ;['C5', 'E5', 'G5', 'C6'].forEach((n, i) =>
      playTone({ freq: NOTES[n], dur: 0.14, type: 'square', vol: 0.22, when: i * 0.1 }))
  },
  fail() {
    ;['G4', 'E4', 'C4'].forEach((n, i) =>
      playTone({ freq: NOTES[n], dur: 0.2, type: 'square', vol: 0.2, when: i * 0.18 }))
  }
}

// BGM：前奏号角 + 主题循环 + 进行曲鼓点（调度式，提前 0.15s 排队）
// 所有 BGM 音频都经 bgmGain 输出，开关可整体静音
function startBgm() {
  if (bgmTimer) return
  bgmStep = 0
  bgmNextT = audioCtx.currentTime + 0.1
  // 前奏号角：G3 → C5
  playTone({ freq: NOTES.G3, dur: 0.6, type: 'sawtooth', vol: 0.2, dest: bgmGain })
  playTone({ freq: NOTES.C5, dur: 0.8, type: 'sawtooth', vol: 0.2, when: 0.55, dest: bgmGain })
  bgmTimer = setInterval(scheduleBgm, 60)
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
  if (bgmGain) bgmGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05)
}

function setBgmVolume(on) {
  menu.value.bgmOn = on
  if (bgmGain) bgmGain.gain.setTargetAtTime(on ? 0.22 : 0, audioCtx.currentTime, 0.05)
}

function scheduleBgm() {
  if (!audioCtx || !bgmGain) return
  const stepDur = 0.25 // 八分音符
  while (bgmNextT < audioCtx.currentTime + 0.2) {
    const t = bgmNextT
    // 进行曲鼓点：每小节（4 步）重拍低鼓，后半拍小军鼓
    if (bgmStep % 4 === 0) {
      playTone({ freq: 90, dur: 0.14, type: 'sine', vol: 0.5, slideTo: 45, when: Math.max(0, t - audioCtx.currentTime), dest: bgmGain })
    } else if (bgmStep % 4 === 2) {
      playNoise({ dur: 0.1, type: 'highpass', from: 1800, vol: 0.16, dest: bgmGain })
    } else if (bgmStep % 2 === 1) {
      playNoise({ dur: 0.04, type: 'highpass', from: 4000, vol: 0.06, dest: bgmGain })
    }
    // 旋律
    const note = MELODY[bgmStep % MELODY.length]
    if (note) {
      const when = Math.max(0, t - audioCtx.currentTime)
      const isLow = note === 'G3' || note === 'A3'
      playTone({
        freq: NOTES[note],
        dur: isLow ? 0.42 : 0.3,
        type: isLow ? 'sawtooth' : 'square',
        vol: isLow ? 0.16 : 0.1,
        when,
        dest: bgmGain
      })
    }
    bgmNextT += stepDur
    bgmStep++
  }
}

function toggleBgm() {
  // 勾选/取消勾选本身是用户手势，此时创建 AudioContext 合法
  ensureAudio()
  setBgmVolume(!menu.value.bgmOn)
}

// ============ 游戏实体与状态 ============
const canvasRef = ref(null)
let ctx = null
let rafId = 0
let lastT = 0

const player = { x: 480, y: 540, dir: -Math.PI / 2, speed: 190, hp: 100, maxHp: 100, attackCd: 0, attackT: 0, attackDir: 0, evacuateT: 0 }
const keys = {}
const mouse = { x: 480, y: 300, active: false }
let enemies = []
let bullets = []
let effects = [] // 刀光/粒子/飘字
let camps = []
let fires = []
let alarmFlag = false
let timeAcc = 0
let stars = []
let grassTufts = []

function makeEnemy(type, x, y, extra = {}) {
  const e = {
    id: Math.random().toString(36).slice(2),
    type,
    state: 'idle',
    x, y,
    dir: 0,
    hp: 1,
    alertT: 0,
    wakeDelay: 0,
    shootCd: 0,
    meleeCd: 0,
    deadT: 0,
    path: [],
    pathIdx: 0,
    speed: 0,
    wanderT: 0,
    ...extra
  }
  return e
}

function buildCamp() {
  // 营地布局：北侧哨塔、五顶帐篷、三堆篝火、两组环形巡逻
  camps = [
    { x: 260, y: 220 }, { x: 530, y: 180 }, { x: 760, y: 240 },
    { x: 330, y: 400 }, { x: 640, y: 420 }
  ]
  fires = [
    { x: 480, y: 300, r: 120, phase: Math.random() * 10 },
    { x: 200, y: 320, r: 100, phase: Math.random() * 10 },
    { x: 780, y: 330, r: 100, phase: Math.random() * 10 }
  ]
  enemies = []

  // 4 个提灯哨兵，沿营地边缘巡逻
  const sentryDefs = [
    { x: 140, y: 100, x2: 180, y2: 130 },
    { x: 880, y: 170, x2: 850, y2: 220 },
    { x: 110, y: 520, x2: 150, y2: 470 },
    { x: 830, y: 510, x2: 800, y2: 460 }
  ]
  for (const s of sentryDefs) {
    const e = makeEnemy('sentry', s.x, s.y, { path: [[s.x, s.y], [s.x2, s.y2]], speed: 46 })
    e.dir = Math.atan2(s.y2 - s.y, s.x2 - s.x)
    enemies.push(e)
  }

  // 6 个巡逻兵：两组沿外环对向绕行
  const loopA = [[210, 140], [750, 140], [750, 460], [210, 460]]
  const loopB = [[760, 470], [200, 470], [200, 130], [760, 130]]
  const gDefs = [
    { path: loopA, off: 0 }, { path: loopA, off: 2 }, { path: loopA, off: 3 },
    { path: loopB, off: 1 }, { path: loopB, off: 2 }, { path: loopB, off: 3 }
  ]
  for (const g of gDefs) {
    const pt = g.path[g.off % g.path.length]
    const e = makeEnemy('guard', pt[0], pt[1], { path: g.path, pathIdx: g.off % g.path.length, speed: 55 })
    e.state = 'patrol'
    enemies.push(e)
  }

  // 10 个睡兵，散布帐篷内外
  let n = 0
  for (const c of camps) {
    for (let i = 0; i < 2; i++) {
      const e = makeEnemy('sleeper', c.x + (i ? 26 : -26) + (Math.random() * 14 - 7), c.y + 8 + (Math.random() * 10 - 5), { wakeDelay: 0.5 + Math.random() * 3.2 })
      e.state = 'sleep'
      n++
    }
  }

  // 星星与草丛（静态装饰）
  stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.55, r: Math.random() * 1.2 + 0.4, tw: Math.random() * 6 }))
  grassTufts = Array.from({ length: 130 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    color: Math.random() < 0.5 ? '#22301d' : '#1d2a19'
  }))
}

function resetGame() {
  player.x = 480
  player.y = 540
  player.dir = -Math.PI / 2
  player.hp = 100
  player.attackCd = 0
  player.attackT = 0
  player.evacuateT = 0
  bullets = []
  effects = []
  alarmFlag = false
  timeAcc = 0
  hud.value.hp = 100
  hud.value.timeLeft = NIGHT_WINDOW
  hud.value.kills = 0
  hud.value.alarm = false
  hud.value.evacuating = 0
  buildCamp()
}

// ============ 输入 ============
function onKeyDown(e) {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault()
  keys[e.code] = true
  if (e.code === 'Space' && state.value === 'playing') tryAttack()
}

function onKeyUp(e) {
  keys[e.code] = false
}

function canvasPos(evt) {
  const rect = canvasRef.value.getBoundingClientRect()
  return { x: (evt.clientX - rect.left) * W / rect.width, y: (evt.clientY - rect.top) * H / rect.height }
}

function onMouseDown(evt) {
  if (state.value !== 'playing') return
  const p = canvasPos(evt)
  mouse.x = p.x
  mouse.y = p.y
  mouse.active = true
  tryAttack()
}

function onMouseMove(evt) {
  if (state.value !== 'playing') return
  const p = canvasPos(evt)
  mouse.x = p.x
  mouse.y = p.y
}

function tryAttack() {
  if (player.attackCd > 0) return
  player.attackCd = 0.38
  player.attackT = 0.22
  const dxm = mouse.x - player.x
  const dym = mouse.y - player.y
  if (mouse.active && (dxm * dxm + dym * dym) > 40 * 40) {
    player.attackDir = Math.atan2(dym, dxm)
    player.dir = player.attackDir
  } else {
    player.attackDir = player.dir
  }
  sfx.swoosh()
  effects.push({ kind: 'slash', x: player.x, y: player.y, dir: player.attackDir, life: 0.22, max: 0.22 })
  // 判定范围：半径 62、扇角 ±72°
  for (const e of enemies) {
    if (e.deadT > 0) continue
    const dx = e.x - player.x
    const dy = e.y - player.y
    const d = Math.hypot(dx, dy)
    const reach = e.state === 'sleep' ? 34 : 62
    if (d > reach) continue
    let ang = Math.atan2(dy, dx)
    let diff = Math.abs(ang - player.attackDir)
    while (diff > Math.PI) diff -= Math.PI * 2
    if (Math.abs(diff) > 1.25) continue
    // 砍中
    e.deadT = 0.35
    if (e.type === 'sentry' && e.state === 'patrol' && Math.abs(diff) < 0.5 && Math.random() < 0.3) {
      triggerAlarm()
    }
    hud.value.kills++
    sfx.kill()
    effects.push({ kind: 'float', x: e.x, y: e.y - 26, text: '杀！', life: 0.9, max: 0.9, color: '#ffd76a' })
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2
      effects.push({ kind: 'spark', x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 - 30, life: 0.45, max: 0.45, color: Math.random() < 0.5 ? '#ffb35c' : '#e8e2c8' })
    }
  }
}

function triggerAlarm() {
  if (alarmFlag) return
  alarmFlag = true
  hud.value.alarm = true
  sfx.alarm()
  // 哨兵与巡逻兵转向玩家方向；睡兵逐个惊醒
  for (const e of enemies) {
    if (e.deadT > 0) continue
    if (e.type === 'sleeper' && e.state === 'sleep') {
      e.wakeDelay = 0.4 + Math.random() * 2.8
    } else if (e.type === 'guard' && e.state === 'patrol') {
      e.state = 'chase'
    }
  }
  // 红晕效果
  effects.push({ kind: 'redflash', life: 0.5, max: 0.5 })
  setTimeout(() => { hud.value.alarm = false }, 2200)
}

// ============ 游戏主循环 ============
function loop(t) {
  rafId = requestAnimationFrame(loop)
  const dt = Math.min((t - lastT) / 1000, 0.05)
  lastT = t
  if (state.value !== 'playing') return
  update(dt)
  draw()
}

function update(dt) {
  // —— 夜袭倒计时 ——
  timeAcc += dt
  if (timeAcc >= 1) {
    timeAcc -= 1
    hud.value.timeLeft--
    if (hud.value.timeLeft <= 0) {
      finishGame('timeout')
      return
    }
  }

  // —— 玩家移动 ——
  let vx = 0
  let vy = 0
  if (keys.KeyW || keys.ArrowUp) vy -= 1
  if (keys.KeyS || keys.ArrowDown) vy += 1
  if (keys.KeyA || keys.ArrowLeft) vx -= 1
  if (keys.KeyD || keys.ArrowRight) vx += 1
  const moving = vx !== 0 || vy !== 0
  if (moving) {
    const len = Math.hypot(vx, vy)
    player.x += vx / len * player.speed * dt
    player.y += vy / len * player.speed * dt
    player.dir = Math.atan2(vy, vx)
  } else if (mouse.active) {
    // 鼠标点击移动：朝目标点走
    const dx = mouse.x - player.x
    const dy = mouse.y - player.y
    const d = Math.hypot(dx, dy)
    if (d > 8) {
      player.x += dx / d * player.speed * dt
      player.y += dy / d * player.speed * dt
      player.dir = Math.atan2(dy, dx)
    }
  }
  player.x = Math.max(16, Math.min(W - 16, player.x))
  player.y = Math.max(16, Math.min(H - 16, player.y))
  if (player.attackCd > 0) player.attackCd -= dt
  if (player.attackT > 0) player.attackT -= dt

  // —— 撤离点 ——
  const ex = 480
  const ey = H - 8
  if (Math.hypot(player.x - ex, player.y - ey) < 42) {
    player.evacuateT += dt
    hud.value.evacuating = player.evacuateT
    if (player.evacuateT >= 2.4) {
      finishGame('retreat')
      return
    }
  } else {
    player.evacuateT = 0
    hud.value.evacuating = 0
  }

  // —— 敌人 ——
  const alive = enemies.filter((e) => e.deadT <= 0)
  for (const e of enemies) {
    if (e.deadT > 0) {
      e.deadT -= dt
      continue
    }
    if (e.type === 'sleeper' && e.state === 'sleep') {
      // 睡兵：警报后倒计时惊醒
      if (alarmFlag) {
        e.wakeDelay -= dt
        if (e.wakeDelay <= 0) {
          e.state = 'chase'
          sfx.gun() // 惊醒动静
          effects.push({ kind: 'float', x: e.x, y: e.y - 24, text: '有敌袭！', life: 1.1, max: 1.1, color: '#ff7a6a' })
        } else if (Math.random() < dt * 2) {
          effects.push({ kind: 'zzz', x: e.x + (Math.random() * 16 - 8), y: e.y - 14, life: 0.7, max: 0.7 })
        }
      } else if (Math.random() < dt * 0.8) {
        effects.push({ kind: 'zzz', x: e.x + (Math.random() * 16 - 8), y: e.y - 14, life: 0.7, max: 0.7 })
      }
      continue
    }
    if (e.type === 'sentry' && e.state === 'patrol') {
      // 沿巡逻线往返
      const a = e.path[e.pathIdx]
      const b = e.path[1 - e.pathIdx]
      const dx = b[0] - e.x
      const dy = b[1] - e.y
      const d = Math.hypot(dx, dy)
      if (d < 4) {
        e.pathIdx = 1 - e.pathIdx
      } else {
        e.x += dx / d * e.speed * dt
        e.y += dy / d * e.speed * dt
        e.dir = Math.atan2(dy, dx)
      }
      // 视野锥检测玩家
      const pdx = player.x - e.x
      const pdy = player.y - e.y
      const pd = Math.hypot(pdx, pdy)
      if (pd < 150) {
        let diff = Math.abs(Math.atan2(pdy, pdx) - e.dir)
        while (diff > Math.PI) diff -= Math.PI * 2
        if (Math.abs(diff) < 0.73) {
          e.alertT += dt * (pd < 60 ? 1.5 : 0.7)
        }
      }
      e.alertT = Math.max(0, e.alertT - dt * 0.4)
      if (e.alertT >= 0.9) {
        e.alertT = 0
        e.state = 'alert'
        triggerAlarm()
      }
    } else if (e.type === 'sentry' && e.state === 'alert') {
      // 发现玩家：逼近 + 开枪
      e.dir = Math.atan2(player.y - e.y, player.x - e.x)
      const d = Math.hypot(player.x - e.x, player.y - e.y)
      if (d > 60) {
        e.x += Math.cos(e.dir) * 92 * dt
        e.y += Math.sin(e.dir) * 92 * dt
      }
      e.shootCd -= dt
      if (e.shootCd <= 0 && d < 420) {
        e.shootCd = 1.5
        fireBullet(e)
      }
    } else if (e.type === 'guard' && e.state === 'patrol') {
      // 沿环形路径巡逻
      const pt = e.path[e.pathIdx]
      const dx = pt[0] - e.x
      const dy = pt[1] - e.y
      const d = Math.hypot(dx, dy)
      if (d < 5) {
        e.pathIdx = (e.pathIdx + 1) % e.path.length
      } else {
        e.x += dx / d * e.speed * dt
        e.y += dy / d * e.speed * dt
        e.dir = Math.atan2(dy, dx)
      }
      // 近距离感知（无灯光也能察觉）
      const pd = Math.hypot(player.x - e.x, player.y - e.y)
      if (pd < 95) {
        e.state = 'chase'
      }
    } else if (e.state === 'chase') {
      // 追击玩家
      e.dir = Math.atan2(player.y - e.y, player.x - e.x)
      const d = Math.hypot(player.x - e.x, player.y - e.y)
      const sp = e.type === 'guard' ? 82 : 72
      if (d > 42) {
        e.x += Math.cos(e.dir) * sp * dt
        e.y += Math.sin(e.dir) * sp * dt
      }
      e.meleeCd -= dt
      if (e.meleeCd <= 0 && d < 46) {
        e.meleeCd = 1.1
        hurtPlayer(18, e)
      }
      // 拉开距离后偶尔开枪
      e.shootCd -= dt
      if (e.type !== 'sentry' && e.shootCd <= 0 && d > 130 && d < 460 && Math.random() < 0.5) {
        e.shootCd = 2.2
        fireBullet(e)
      }
    }
    // 敌人间轻微分离
    for (const o of alive) {
      if (o === e) continue
      const dx = e.x - o.x
      const dy = e.y - o.y
      const d = Math.hypot(dx, dy)
      if (d > 0 && d < 24) {
        e.x += dx / d * 1.2
        e.y += dy / d * 1.2
      }
    }
  }

  // —— 子弹 ——
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.life -= dt
    if (Math.hypot(b.x - player.x, b.y - player.y) < 13) {
      bullets.splice(i, 1)
      hurtPlayer(22, null)
      continue
    }
    if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) bullets.splice(i, 1)
  }

  // —— 特效 ——
  for (let i = effects.length - 1; i >= 0; i--) {
    const f = effects[i]
    f.life -= dt
    if (f.kind === 'spark') {
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vy += 90 * dt
    }
    if (f.life <= 0) effects.splice(i, 1)
  }

  // 全歼胜利
  if (hud.value.kills >= TOTAL_ENEMIES) {
    finishGame('annihilate')
  }
}

function fireBullet(e) {
  const a = Math.atan2(player.y - e.y, player.x - e.x)
  bullets.push({ x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, life: 2.2 })
  sfx.gun()
  effects.push({ kind: 'muzzle', x: e.x + Math.cos(a) * 14, y: e.y + Math.sin(a) * 14, dir: a, life: 0.1, max: 0.1 })
}

function hurtPlayer(dmg, from) {
  player.hp -= dmg
  hud.value.hp = Math.max(0, player.hp)
  player.evacuateT = 0
  sfx.hit()
  effects.push({ kind: 'redflash', life: 0.35, max: 0.35 })
  effects.push({ kind: 'float', x: player.x, y: player.y - 30, text: `-${dmg}`, life: 0.7, max: 0.7, color: '#ff6a5a' })
  if (from) {
    const dx = player.x - from.x
    const dy = player.y - from.y
    const d = Math.hypot(dx, dy) || 1
    player.x += dx / d * 12
    player.y += dy / d * 12
  }
  if (player.hp <= 0) finishGame('killed')
}

function finishGame(kind) {
  if (state.value !== 'playing') return
  stopBgm()
  const kills = hud.value.kills
  const hp = hud.value.hp
  let rank = ''
  let title = ''
  if (kills >= 18) rank = '特等功 · 白台子大捷'
  else if (kills >= 14) rank = '甲等功 · 夜袭劲旅'
  else if (kills >= 9) rank = '乙等功 · 大刀威风'
  else if (kills >= 5) rank = '丙等功 · 有斩获'
  else if (kills >= 1) rank = '丁等功 · 初试锋芒'
  else rank = '失利 · 空手而归'
  const honors = []
  if (kills >= TOTAL_ENEMIES) honors.push('尽歼来敌')
  if (!alarmFlag && kills > 0) honors.push('悄无声息 · 全程潜行')
  if (hp >= 70) honors.push('全身而退')
  if (kind === 'retreat') title = '夜袭得手 · 凯旋归来'
  else if (kind === 'annihilate') title = '尽歼敌营 · 刀锋所指'
  else if (kind === 'timeout') title = '天色将明 · 撤出敌营'
  else title = '夜袭失利 · 大刀队殉国'
  result.value = {
    kind,
    title,
    rank,
    kills,
    alarms: alarmFlag ? 1 : 0,
    hp: Math.max(0, Math.round(player.hp)),
    honors
  }
  if (kind === 'retreat' || kind === 'annihilate') sfx.retreat()
  else sfx.fail()
  state.value = 'ended'
}

// ============ 绘制 ============
function draw() {
  ctx.clearRect(0, 0, W, H)
  drawSky()
  drawProps()
  drawExit()
  drawEnemies()
  drawPlayer()
  drawEffects()
  drawHudGlow()
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H * 0.5)
  g.addColorStop(0, '#0a0e22')
  g.addColorStop(1, '#182440')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H * 0.5)
  // 星星
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(performance.now() / 1000 * 2 + s.tw)
    ctx.globalAlpha = tw * 0.8
    ctx.fillStyle = '#cfe0ff'
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // 月亮
  const mx = 830
  const my = 78
  const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 60)
  mg.addColorStop(0, 'rgba(255,250,225,0.95)')
  mg.addColorStop(0.3, 'rgba(255,248,214,0.35)')
  mg.addColorStop(1, 'rgba(255,248,214,0)')
  ctx.fillStyle = mg
  ctx.beginPath()
  ctx.arc(mx, my, 60, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f3eccb'
  ctx.beginPath()
  ctx.arc(mx, my, 20, 0, Math.PI * 2)
  ctx.fill()
  // 远山
  ctx.fillStyle = '#131c33'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.5)
  ctx.lineTo(0, H * 0.4)
  ctx.lineTo(120, H * 0.32)
  ctx.lineTo(280, H * 0.42)
  ctx.lineTo(430, H * 0.3)
  ctx.lineTo(600, H * 0.4)
  ctx.lineTo(760, H * 0.31)
  ctx.lineTo(920, H * 0.42)
  ctx.lineTo(W, H * 0.36)
  ctx.lineTo(W, H * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0f172e'
  ctx.beginPath()
  ctx.moveTo(0, H * 0.5)
  ctx.lineTo(0, H * 0.45)
  ctx.lineTo(150, H * 0.38)
  ctx.lineTo(330, H * 0.47)
  ctx.lineTo(520, H * 0.36)
  ctx.lineTo(700, H * 0.46)
  ctx.lineTo(860, H * 0.37)
  ctx.lineTo(W, H * 0.44)
  ctx.lineTo(W, H * 0.5)
  ctx.closePath()
  ctx.fill()
  // 地面
  const gg = ctx.createLinearGradient(0, H * 0.5, 0, H)
  gg.addColorStop(0, '#1b2417')
  gg.addColorStop(1, '#141c12')
  ctx.fillStyle = gg
  ctx.fillRect(0, H * 0.5, W, H * 0.5)
  for (const t of grassTufts) {
    if (t.y < H * 0.5) continue
    ctx.fillStyle = t.color
    ctx.fillRect(t.x, t.y, 2, 3)
  }
}

function drawProps() {
  // 栅栏（营地边界示意）
  ctx.strokeStyle = 'rgba(90,80,60,0.5)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 14])
  ctx.strokeRect(24, 36, W - 48, H - 72)
  ctx.setLineDash([])
  // 北侧哨塔
  ctx.fillStyle = '#2c2a20'
  ctx.fillRect(120, 36, 26, 66)
  ctx.fillRect(112, 92, 42, 8)
  ctx.fillStyle = '#1d1c14'
  ctx.fillRect(116, 36, 5, 62)
  ctx.fillRect(145, 36, 5, 62)
  // 弹药箱
  ctx.fillStyle = '#4a3a22'
  ctx.fillRect(300, 470, 20, 14)
  ctx.fillRect(324, 474, 16, 12)
  ctx.fillRect(690, 120, 18, 13)
  ctx.fillStyle = '#3a2c1a'
  ctx.fillRect(300, 470, 20, 3)
  // 帐篷
  for (const c of camps) {
    const { x, y } = c
    ctx.fillStyle = '#39422f'
    ctx.beginPath()
    ctx.moveTo(x - 42, y + 12)
    ctx.lineTo(x, y - 40)
    ctx.lineTo(x + 42, y + 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#2c3323'
    ctx.beginPath()
    ctx.moveTo(x - 42, y + 12)
    ctx.lineTo(x, y - 40)
    ctx.lineTo(x + 42, y + 12)
    ctx.lineTo(x + 42, y + 18)
    ctx.lineTo(x - 42, y + 18)
    ctx.closePath()
    ctx.fill()
    // 开口
    ctx.fillStyle = '#101408'
    ctx.beginPath()
    ctx.moveTo(x - 12, y + 12)
    ctx.lineTo(x, y - 22)
    ctx.lineTo(x + 12, y + 12)
    ctx.closePath()
    ctx.fill()
  }
}

function drawExit() {
  // 撤离点：底部中央绿火把
  const x = 480
  const y = H - 14
  ctx.fillStyle = '#2e3a2a'
  ctx.fillRect(x - 18, y - 22, 36, 22)
  ctx.fillStyle = '#4a5c40'
  ctx.fillRect(x - 3, y - 34, 6, 14)
  const ph = performance.now() / 200
  const flame = 7 + Math.sin(ph * 3) * 2.5
  ctx.fillStyle = '#7dff9a'
  ctx.beginPath()
  ctx.arc(x, y - 36, flame, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(125,255,154,0.16)'
  ctx.beginPath()
  ctx.arc(x, y - 36, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(180,255,200,0.9)'
  ctx.font = 'bold 13px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('撤 离 点', x, y - 46)
}

// 光照：篝火与哨兵提灯叠加，决定玩家潜行透明度
function lightAt(x, y) {
  let l = 0.24 // 月光
  for (const f of fires) {
    const d = Math.hypot(f.x - x, f.y - y)
    if (d < f.r) l += (1 - d / f.r) * 0.9
  }
  for (const e of enemies) {
    if (e.deadT > 0 || e.type === 'sleeper' || e.type !== 'sentry') continue
    const d = Math.hypot(e.x - x, e.y - y)
    if (d < 80) l += (1 - d / 80) * 0.55
  }
  return Math.min(1, l)
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.deadT > 0) {
      // 倒地动画
      const k = e.deadT / 0.35
      ctx.globalAlpha = Math.max(0.15, 1 - k) * 0.9
      ctx.save()
      ctx.translate(e.x, e.y)
      ctx.rotate(k * 1.2)
      ctx.fillStyle = '#6b5f3c'
      ctx.fillRect(-10, -3, 20, 6)
      ctx.fillStyle = '#3d3522'
      ctx.beginPath()
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.globalAlpha = 1
      continue
    }
    if (e.type === 'sleeper' && e.state === 'sleep') {
      // 躺姿
      ctx.fillStyle = '#5d4f30'
      ctx.beginPath()
      ctx.ellipse(e.x, e.y, 12, 6, e.dir, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#453a24'
      ctx.beginPath()
      ctx.arc(e.x - 9, e.y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    // 站立
    ctx.save()
    ctx.translate(e.x, e.y)
    const step = Math.sin(e.wanderT) * 2
    e.wanderT += 0.1
    // 身体
    ctx.fillStyle = e.type === 'sentry' ? '#77683c' : '#7a6a3e'
    ctx.fillRect(-5, -14, 10, 16)
    // 头 + 军帽
    ctx.fillStyle = '#4a3e26'
    ctx.beginPath()
    ctx.arc(0, -18, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#5a4c30'
    ctx.fillRect(-6, -23, 12, 4)
    // 腿
    ctx.strokeStyle = '#5c5234'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(-2, 2)
    ctx.lineTo(-4 + step, 10)
    ctx.moveTo(2, 2)
    ctx.lineTo(4 - step, 10)
    ctx.stroke()
    // 枪（长条）
    ctx.strokeStyle = '#3a3420'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(6, -10)
    ctx.lineTo(14, -4)
    ctx.stroke()
    ctx.restore()
    // 提灯哨兵：灯光 + 视野锥
    if (e.type === 'sentry') {
      const g = ctx.createRadialGradient(e.x, e.y - 10, 2, e.x, e.y - 10, 70)
      g.addColorStop(0, 'rgba(255,214,120,0.5)')
      g.addColorStop(1, 'rgba(255,214,120,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(e.x, e.y - 10, 70, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffd983'
      ctx.beginPath()
      ctx.arc(e.x + Math.cos(e.dir) * 8, e.y - 12 + Math.sin(e.dir) * 8, 3, 0, Math.PI * 2)
      ctx.fill()
      if (e.state === 'patrol') {
        // 视野锥
        const seen = lightAt(player.x, player.y) > 0.12 && distToSentry(e) < 150
        ctx.fillStyle = seen ? 'rgba(255,120,90,0.10)' : 'rgba(255,225,140,0.06)'
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.arc(e.x, e.y, 150, e.dir - 0.73, e.dir + 0.73)
        ctx.closePath()
        ctx.fill()
      }
      if (e.state === 'alert' || e.alertT > 0.25) {
        const txt = e.state === 'alert' ? '！' : '？'
        const col = e.state === 'alert' ? '#ff5a4a' : '#ffd76a'
        ctx.fillStyle = col
        ctx.font = 'bold 16px sans-serif'
        ctx.textAlign = 'center'
        ctx.globalAlpha = Math.min(1, e.alertT * 2 + 0.6)
        ctx.fillText(txt, e.x, e.y - 30)
        ctx.globalAlpha = 1
      }
    }
  }
}

function distToSentry(e) {
  return Math.hypot(player.x - e.x, player.y - e.y)
}

function drawPlayer() {
  const p = player
  const light = lightAt(p.x, p.y)
  ctx.save()
  ctx.globalAlpha = 0.35 + 0.65 * light
  ctx.translate(p.x, p.y)
  // 大刀（挥砍时旋转）
  const swing = p.attackT > 0 ? (1 - p.attackT / 0.22) : 0
  ctx.save()
  ctx.rotate(p.dir + swing * 1.9 - 0.5)
  ctx.strokeStyle = '#d8d8e0'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(10, -2)
  ctx.lineTo(36, -2)
  ctx.stroke()
  ctx.fillStyle = '#c8c8d4'
  ctx.beginPath()
  ctx.moveTo(36, -2)
  ctx.lineTo(31, -8)
  ctx.lineTo(24, -2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  // 身体：蓝灰军装 + 红袖章
  ctx.fillStyle = '#3c4b63'
  ctx.fillRect(-6, -15, 12, 17)
  ctx.fillStyle = '#b8453a'
  ctx.fillRect(2, -12, 4, 5)
  // 头 + 军帽
  ctx.fillStyle = '#8a7a5c'
  ctx.beginPath()
  ctx.arc(0, -19, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2c3a52'
  ctx.fillRect(-7, -25, 14, 5)
  // 腿
  ctx.strokeStyle = '#2c3850'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-2, 2)
  ctx.lineTo(-4, 11)
  ctx.moveTo(2, 2)
  ctx.lineTo(4, 11)
  ctx.stroke()
  ctx.restore()
  // 血条
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.fillRect(p.x - 20, p.y + 16, 40, 5)
  ctx.fillStyle = '#e0554a'
  ctx.fillRect(p.x - 20, p.y + 16, 40 * (p.hp / p.maxHp), 5)
  ctx.globalAlpha = 1
}

function drawEffects() {
  for (const f of effects) {
    const k = f.life / f.max
    if (f.kind === 'slash') {
      // 刀光弧
      ctx.save()
      ctx.globalAlpha = k * 0.85
      ctx.translate(f.x, f.y)
      ctx.rotate(f.dir)
      const arc = ctx.createRadialGradient(0, 0, 10, 0, 0, 62)
      arc.addColorStop(0, 'rgba(255,255,255,0)')
      arc.addColorStop(0.8, 'rgba(255,255,255,0.5)')
      arc.addColorStop(1, 'rgba(255,255,255,0.95)')
      ctx.fillStyle = arc
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 62, -1.15, 1.15)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (f.kind === 'spark') {
      ctx.globalAlpha = k
      ctx.fillStyle = f.color
      ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3)
      ctx.globalAlpha = 1
    } else if (f.kind === 'float') {
      ctx.globalAlpha = Math.min(1, k * 1.4)
      ctx.fillStyle = f.color
      ctx.font = `bold ${14 + (1 - k) * 6}px "Microsoft YaHei", sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(f.text, f.x, f.y - (1 - k) * 26)
      ctx.globalAlpha = 1
    } else if (f.kind === 'muzzle') {
      ctx.save()
      ctx.globalAlpha = k
      ctx.strokeStyle = '#ffe9a8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(f.x, f.y)
      ctx.lineTo(f.x + Math.cos(f.dir) * 16, f.y + Math.sin(f.dir) * 16)
      ctx.stroke()
      ctx.restore()
    } else if (f.kind === 'redflash') {
      ctx.globalAlpha = k * 0.35
      ctx.fillStyle = '#d42f1e'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    } else if (f.kind === 'zzz') {
      ctx.globalAlpha = k * 0.7
      ctx.fillStyle = '#aeb8d0'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Z', f.x, f.y)
      ctx.globalAlpha = 1
    }
  }
  // 子弹曳光
  for (const b of bullets) {
    ctx.save()
    ctx.strokeStyle = 'rgba(255,214,120,0.95)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(b.x, b.y)
    ctx.lineTo(b.x - b.vx * 0.03, b.y - b.vy * 0.03)
    ctx.stroke()
    ctx.restore()
  }
}

function drawHudGlow() {
  // 警报时边缘红晕常亮
  if (alarmFlag) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75)
    g.addColorStop(0, 'rgba(200,40,30,0)')
    g.addColorStop(1, 'rgba(200,40,30,0.16)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
}

// ============ 开始 / 结算 ============
// 游戏循环在 onMounted 启动后常驻（菜单阶段空转），开始游戏只需重置状态
function startGame() {
  ensureAudio()
  setBgmVolume(menu.value.bgmOn)
  startBgm()
  resetGame()
  state.value = 'playing'
  lastT = performance.now()
}

function restart() {
  result.value = null
  startGame()
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  resetGame()
  draw() // 菜单背景静帧
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  lastT = performance.now()
  rafId = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  stopBgm()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

const rankHint = computed(() => {
  if (!result.value) return ''
  return {
    retreat: '撤离点撤出，夜袭成功',
    annihilate: '全歼敌营守军',
    timeout: '夜袭窗口结束',
    killed: '大刀队员阵亡'
  }[result.value.kind] || ''
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>🔪 喜峰口 · 大刀夜袭</h1>
      <span class="hint">1933 年 3 月 11 日夜 · 二十九军大刀队夜袭白台子日军营地</span>
    </header>

    <div class="game-shell">
      <canvas
        ref="canvasRef"
        :width="W"
        :height="H"
        class="stage"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
      ></canvas>

      <!-- 潜行提示 -->
      <div class="hud" v-if="state === 'playing'">
        <div class="hud-left">
          <div class="bar hp">
            <div class="fill" :style="{ width: (hud.hp / 100 * 100) + '%' }"></div>
            <span class="txt">体力 {{ hud.hp }}</span>
          </div>
          <div class="bar time" :class="{ danger: hud.timeLeft <= 20 }">
            <span class="txt">{{ hud.timeLeft }}s</span>
          </div>
        </div>
        <div class="hud-mid" v-if="hud.alarm">⚠ 营地惊动！日军正在醒来</div>
        <div class="hud-right">
          <div class="kills">斩敌 {{ hud.kills }} / {{ TOTAL_ENEMIES }}</div>
          <div class="evac" v-if="hud.evacuating > 0">撤离中 {{ Math.floor(hud.evacuating / 2.4 * 100) }}%</div>
        </div>
      </div>

      <!-- 菜单面板 -->
      <div class="overlay menu" v-if="state === 'menu'">
        <h2>喜峰口 · 大刀夜袭</h2>
        <p class="desc">
          民国二十二年三月十一日深夜，喜峰口外。<br />
          你是二十九军大刀队的一员，奉命摸进白台子日军宿营——<br />
          避开哨兵灯光，背后一刀毙敌；一旦暴露，全营枪声四起。
        </p>
        <div class="controls">
          <span><b>WASD / 方向键</b> 移动</span>
          <span><b>空格 / 左键</b> 挥刀</span>
          <span><b>点击地面</b> 移向目标</span>
        </div>
        <p class="goal">夜袭窗口 {{ NIGHT_WINDOW }} 秒 · 歼敌后从底部绿火把处撤离</p>
        <div class="btns">
          <button class="primary" @click="startGame">开始夜袭</button>
          <button class="ghost" @click="historyOpen = !historyOpen">战史背景</button>
        </div>
        <label class="bgm-toggle">
          <input type="checkbox" :checked="menu.bgmOn" @change="toggleBgm" />
          配乐《大刀进行曲》（合成演奏）
        </label>
      </div>

      <!-- 结算面板 -->
      <div class="overlay end" v-if="state === 'ended' && result">
        <h2 :class="result.kind === 'retreat' || result.kind === 'annihilate' ? 'win' : 'lose'">{{ result.title }}</h2>
        <p class="rank">{{ result.rank }}</p>
        <p class="hint2">{{ rankHint }}</p>
        <div class="stats">
          <div><b>{{ result.kills }}</b><span>斩敌数</span></div>
          <div><b>{{ result.alarms }}</b><span>营地惊动</span></div>
          <div><b>{{ result.hp }}</b><span>剩余体力</span></div>
        </div>
        <p class="honors" v-if="result.honors.length">🏅 {{ result.honors.join(' · ') }}</p>
        <div class="btns">
          <button class="primary" @click="restart">再战一次</button>
          <button class="ghost" @click="historyOpen = !historyOpen">战史背景</button>
        </div>
      </div>
    </div>

    <details class="history" :open="historyOpen" @toggle="historyOpen = $event.target.open">
      <summary>📖 战史背景：喜峰口战役</summary>
      <p>
        1933 年 3 月，日军侵占热河后直逼长城。国民革命军第二十九军（军长宋哲元）扼守喜峰口，
        3 月 9 日起与日军服部旅团等部连日血战，赵登禹率部肉搏夺回阵地。
      </p>
      <p>
        3 月 11 日深夜至 12 日凌晨，赵登禹率 109 旅、佟泽光率 113 旅分两路夜袭敌后，
        直捣白台子、三家子一带日军宿营地。大刀队近战短兵、斩获甚众，缴获大炮、机枪与辎重无数。
        日军《朝日新闻》哀叹"明治大帝造兵以来之皇军名誉，尽丧于喜峰口外"。
      </p>
      <p>
        此役二十九军大刀队威震华夏。1937 年 7 月，作曲家麦新作《大刀进行曲》，
        副题"献给二十九军大刀队"，传唱全国、鼓舞抗战。
        本页配乐为该曲主旋律的程序合成片段，无音频文件；画面为剪影风格，不渲染血腥细节。
      </p>
    </details>
  </div>
</template>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px 48px;
}

.topbar {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.topbar h1 {
  font-size: 22px;
  margin: 0;
}

.hint {
  color: var(--color-muted);
  font-size: 13px;
}

.back:hover {
  text-decoration: underline;
}

.game-shell {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: #0a0e22;
}

.stage {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.hud-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 6px;
  padding: 5px 10px;
  color: #f2f2ea;
  font-size: 13px;
}

.bar.hp .fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #c23a2e, #e0554a);
  border-radius: 6px;
  opacity: 0.85;
}

.bar.hp {
  position: relative;
  min-width: 150px;
  overflow: hidden;
}

.bar.hp .txt,
.bar.time .txt {
  position: relative;
  z-index: 1;
}

.bar.time {
  background: rgba(0, 0, 0, 0.5);
}

.bar.time.danger {
  color: #ff6a5a;
  animation: blink 0.7s infinite;
}

@keyframes blink {
  50% { opacity: 0.4; }
}

.hud-mid {
  align-self: center;
  background: rgba(180, 40, 28, 0.85);
  color: #ffe8e0;
  font-size: 14px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 8px;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  50% { transform: scale(1.04); }
}

.hud-right {
  text-align: right;
  color: #f2f2ea;
  font-size: 14px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

.kills {
  font-weight: bold;
  font-size: 16px;
}

.evac {
  color: #9dffb0;
  margin-top: 6px;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(8, 12, 24, 0.82);
  color: #f2f2ea;
  text-align: center;
  padding: 24px;
}

.overlay h2 {
  font-size: 30px;
  margin: 0;
  letter-spacing: 2px;
  color: #ffd76a;
}

.overlay h2.lose {
  color: #ff8a7a;
}

.desc {
  max-width: 520px;
  line-height: 1.8;
  color: #cfd6e4;
  margin: 0;
}

.controls {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 13px;
  color: #aab4c8;
}

.controls b {
  color: #f2f2ea;
}

.goal {
  color: #9dffb0;
  font-size: 13px;
  margin: 0;
}

.btns {
  display: flex;
  gap: 12px;
  margin-top: 4px;
}

.primary {
  background: linear-gradient(180deg, #d8493a, #b23a2c);
  color: #fff;
  border: none;
  font-size: 17px;
  font-weight: bold;
  padding: 12px 34px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(210, 60, 44, 0.35);
}

.primary:hover {
  filter: brightness(1.1);
}

.ghost {
  background: transparent;
  color: #cfd6e4;
  border: 1px solid #46506a;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
}

.ghost:hover {
  border-color: #7d8aa8;
  color: #fff;
}

.bgm-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #aab4c8;
  cursor: pointer;
}

.rank {
  font-size: 22px;
  font-weight: bold;
  color: #ffd76a;
  margin: 0;
}

.hint2 {
  color: #9fb0cc;
  font-size: 13px;
  margin: 0;
}

.stats {
  display: flex;
  gap: 26px;
  margin-top: 4px;
}

.stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats b {
  font-size: 26px;
  color: #fff;
}

.stats span {
  font-size: 12px;
  color: #9fb0cc;
}

.honors {
  color: #ffd76a;
  font-size: 14px;
  margin: 0;
}

.history {
  margin-top: 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 12px 18px;
  color: var(--color-muted);
  font-size: 14px;
  line-height: 1.8;
}

.history summary {
  cursor: pointer;
  font-weight: bold;
  color: var(--color-text);
}

.history p {
  margin: 8px 0;
}
</style>
