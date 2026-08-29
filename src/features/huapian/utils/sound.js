// Web Audio 实时合成音效：蓄力爬升、拍击、翻面、掀角、犯规、胜负全靠振荡器与噪声现场合成，
// 无音频文件；静音偏好存 localStorage
const MUTE_KEY = 'huapian:muted'
let ctx = null

function ensureCtx() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function isMuted() {
  return localStorage.getItem(MUTE_KEY) === '1'
}

export function toggleMuted() {
  const muted = !isMuted()
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  return muted
}

const noopHandle = { setPower() {}, stop() {} }

// 蓄力：三角波音高随力道一路爬升，松手即停
export function startCharge() {
  if (isMuted()) return noopHandle
  const ac = ensureCtx()
  if (!ac) return noopHandle
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(140, ac.currentTime)
  gain.gain.setValueAtTime(0.0001, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.055, ac.currentTime + 0.05)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start()
  let stopped = false
  return {
    setPower(p) {
      if (!stopped) osc.frequency.setTargetAtTime(140 + p * 3.4, ac.currentTime, 0.02)
    },
    stop() {
      if (stopped) return
      stopped = true
      const t = ac.currentTime
      gain.gain.cancelScheduledValues(t)
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0002), t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
      osc.stop(t + 0.1)
    },
  }
}

// 拍击：低频闷响打底 + 带通噪声「啪」
export function playSlapHit() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const thump = ac.createOscillator()
  const thumpGain = ac.createGain()
  thump.type = 'sine'
  thump.frequency.setValueAtTime(110, t)
  thump.frequency.exponentialRampToValueAtTime(55, t + 0.12)
  thumpGain.gain.setValueAtTime(0.35, t)
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
  thump.connect(thumpGain)
  thumpGain.connect(ac.destination)
  thump.start(t)
  thump.stop(t + 0.16)

  const dur = 0.09
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 900
  filter.Q.value = 0.8
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.6, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
}

function tone(freq, start, dur, { type = 'triangle', vol = 0.16 } = {}) {
  const ac = ctx
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(vol, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

function noiseWhoosh(dur = 0.28, freq = 700) {
  const ac = ctx
  const t = ac.currentTime
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI)
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(freq * 2, t)
  filter.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.28, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
}

// 出手结果提示音：翻面上行三连音、掀角两声闷响、乱流呼啸、犯规蜂鸣
export function playResult(result) {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  if (result === 'flip' || result === 'scatter-flip') {
    const notes = result === 'flip' ? [523, 659, 784] : [440, 622, 880]
    notes.forEach((f, i) => tone(f, t + i * 0.06, 0.18))
  } else if (result === 'near') {
    tone(180, t, 0.09, { type: 'sine', vol: 0.22 })
    tone(150, t + 0.11, 0.11, { type: 'sine', vol: 0.22 })
  } else if (result === 'miss') {
    tone(220, t, 0.07, { type: 'sine', vol: 0.08 })
  } else if (result === 'scatter') {
    noiseWhoosh()
  } else if (result === 'foul') {
    tone(160, t, 0.16, { type: 'square', vol: 0.1 })
    tone(140, t + 0.18, 0.2, { type: 'square', vol: 0.1 })
  }
}

export function playWin() {
  if (isMuted()) return
  if (!ensureCtx()) return
  const t = ctx.currentTime
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, 0.24, { vol: 0.18 }))
}

export function playLose() {
  if (isMuted()) return
  if (!ensureCtx()) return
  const t = ctx.currentTime
  ;[392, 330, 262].forEach((f, i) => tone(f, t + i * 0.14, 0.26, { type: 'sine', vol: 0.16 }))
}
