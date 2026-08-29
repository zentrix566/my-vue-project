// Web Audio 实时合成音效（无音频文件），静音偏好记忆在 localStorage
const KEY = 'game-show:muted'
let ctx = null

export function isMuted() {
  return localStorage.getItem(KEY) === '1'
}

export function toggleMuted() {
  const next = !isMuted()
  localStorage.setItem(KEY, next ? '1' : '0')
  return next
}

function audio() {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone({ f = 440, t = 0, d = 0.15, type = 'sine', g = 0.12, slideTo = 0 }) {
  const c = audio()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  const t0 = c.currentTime + t
  osc.type = type
  osc.frequency.setValueAtTime(f, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + d)
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(g, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + d + 0.05)
}

export function playCaseFlip() {
  if (isMuted()) return
  tone({ f: 620, d: 0.07, type: 'triangle', g: 0.07 })
  tone({ f: 980, t: 0.05, d: 0.09, type: 'triangle', g: 0.05 })
}

export function playRing() {
  if (isMuted()) return
  ;[0, 0.4].forEach(t => {
    tone({ f: 440, t, d: 0.25, type: 'sine', g: 0.1 })
    tone({ f: 480, t, d: 0.25, type: 'sine', g: 0.08 })
  })
}

export function playDealHammer() {
  if (isMuted()) return
  tone({ f: 200, d: 0.25, type: 'square', g: 0.1, slideTo: 70 })
  tone({ f: 523, t: 0.1, d: 0.2, type: 'triangle', g: 0.08 })
}

export function playBundle() {
  if (isMuted()) return
  tone({ f: 1250, d: 0.045, type: 'square', g: 0.045 })
}

export function playDrop() {
  if (isMuted()) return
  tone({ f: 900, d: 0.5, type: 'sawtooth', g: 0.07, slideTo: 110 })
  tone({ f: 85, t: 0.42, d: 0.22, type: 'sine', g: 0.14 })
}

export function playWin() {
  if (isMuted()) return
  ;[523, 659, 784, 1047].forEach((f, i) => tone({ f, t: i * 0.12, d: 0.24, type: 'triangle', g: 0.1 }))
}

export function playLose() {
  if (isMuted()) return
  ;[330, 262, 196].forEach((f, i) => tone({ f, t: i * 0.16, d: 0.3, type: 'sine', g: 0.09 }))
}
