// Web Audio 实时合成音效：走子、吃子、下水、跳河、鼠吃象与胜负，无音频文件；静音偏好存 localStorage
const MUTE_KEY = 'jungle-chess:muted'
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

// 短促音：走子落格的木质「嗒」
export function playStep() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(340, t)
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.07)
  gain.gain.setValueAtTime(0.18, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.1)
}

// 噪声脉冲工具
function noiseBurst(ac, t, dur, filterType, from, to, peak) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = filterType
  filter.frequency.setValueAtTime(from, t)
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + dur)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(peak, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
}

// 吃子：低音闷响 + 撕咬噪声
export function playCapture() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(150, t)
  osc.frequency.exponentialRampToValueAtTime(70, t + 0.12)
  gain.gain.setValueAtTime(0.22, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.15)
  noiseBurst(ac, t + 0.02, 0.1, 'bandpass', 1800, 600, 0.16)
}

// 下水/上岸：低通噪声扫频的水花「哗」
export function playSplash() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  noiseBurst(ac, ac.currentTime, 0.22, 'lowpass', 1400, 320, 0.2)
}

// 狮虎跳河：带通噪声上下扫频的「嗖——」
export function playJump() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.28), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / data.length)
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 1.2
  filter.frequency.setValueAtTime(420, t)
  filter.frequency.exponentialRampToValueAtTime(950, t + 0.13)
  filter.frequency.exponentialRampToValueAtTime(380, t + 0.27)
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.24, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
}

// 琶音工具
function arpeggio(ac, t, notes, peak = 0.18, dur = 0.16, gap = 0.09) {
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const start = t + i * gap
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + dur + 0.1)
  })
}

// 鼠吃大象：全场最高光的俏皮三连音
export function playUpset() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  arpeggio(ac, ac.currentTime, [523, 659, 784], 0.2, 0.22, 0.1)
  noiseBurst(ac, ac.currentTime + 0.02, 0.1, 'bandpass', 1800, 600, 0.14)
}

// 胜利小号角
export function playWin() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  arpeggio(ac, ac.currentTime, [523, 659, 784, 1047], 0.2, 0.3, 0.12)
}

// 失败下行音
export function playLose() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  arpeggio(ac, ac.currentTime, [392, 311, 262], 0.16, 0.24, 0.14)
}
