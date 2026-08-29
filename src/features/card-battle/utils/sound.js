// Web Audio 实时合成音效：翻牌沙声与结算提示音，无音频文件；静音偏好存 localStorage
const MUTE_KEY = 'card-battle:muted'
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

// 翻牌：高通滤波的噪声脉冲，模拟纸牌弹出的「啪」
export function playFlip() {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const dur = 0.07
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2
  }
  const src = ac.createBufferSource()
  src.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = 1500
  const gain = ac.createGain()
  gain.gain.setValueAtTime(0.5, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(ac.destination)
  src.start(t)
}

// 结算：吃子落定上行双音，以下克上换成更高的三连音
export function playResolve(upset = false) {
  if (isMuted()) return
  const ac = ensureCtx()
  if (!ac) return
  const t = ac.currentTime
  const notes = upset ? [523, 784, 1047] : [392, 523]
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    const start = t + i * 0.07
    osc.type = 'triangle'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(upset ? 0.22 : 0.16, start + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, start + (upset ? 0.22 : 0.15))
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.start(start)
    osc.stop(start + 0.25)
  })
}
