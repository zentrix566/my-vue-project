// Web Audio 古琴音色与背景音乐调度
// 用三角波 + 低通滤波 + 指数衰减模拟古琴拨弦，叠加低八度正弦增加厚度，
// 再用延迟反馈做简易混响。背景持续低音（羽音 A）营造江湖空灵感。

import { NOTE_FREQS } from './data/melody.js'

export class CanghaiAudio {
  constructor() {
    this.ctx = null
    this.master = null
    this.delay = null
    this.delayGain = null
    this.droneNodes = null
    this.muted = false
  }

  // 必须在用户首次交互后调用（浏览器自动播放策略）
  async ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    this.ctx = new Ctx()

    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 0.9
    this.master.connect(this.ctx.destination)

    // 简易延迟混响
    this.delay = this.ctx.createDelay(1.0)
    this.delay.delayTime.value = 0.23
    this.delayGain = this.ctx.createGain()
    this.delayGain.gain.value = 0.28
    const feedback = this.ctx.createGain()
    feedback.gain.value = 0.32
    this.delay.connect(feedback)
    feedback.connect(this.delay)
    this.delay.connect(this.delayGain)
    this.delayGain.connect(this.master)
  }

  setMuted(m) {
    this.muted = m
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05)
    }
  }

  // 拨弦音。bright 为命中时附加的明亮度，gain 为峰值音量。
  pluck(pitch, when = 0, { bright = 0, dur = 1.9, gain = 0.6 } = {}) {
    if (!this.ctx) return
    const t = when || this.ctx.currentTime
    const freq = NOTE_FREQS[pitch]
    if (!freq) return

    const peak = gain + bright * 0.35
    const out = this.ctx.createGain()
    out.gain.setValueAtTime(0.0001, t)
    out.gain.exponentialRampToValueAtTime(peak, t + 0.006)
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    out.connect(this.master)
    out.connect(this.delay)

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2600 + bright * 2200, t)
    filter.frequency.exponentialRampToValueAtTime(650, t + dur * 0.6)
    filter.Q.value = 0.6
    filter.connect(out)

    // 主音：三角波
    const osc = this.ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq
    osc.connect(filter)

    // 低八度正弦，增加琴体厚度
    const sub = this.ctx.createOscillator()
    sub.type = 'sine'
    sub.frequency.value = freq / 2
    const subGain = this.ctx.createGain()
    subGain.gain.value = 0.3
    sub.connect(subGain).connect(filter)

    // 命中时叠加五度泛音，增加清亮感
    if (bright > 0) {
      const harm = this.ctx.createOscillator()
      harm.type = 'sine'
      harm.frequency.value = freq * 1.5
      const harmGain = this.ctx.createGain()
      harmGain.gain.setValueAtTime(0.0001, t)
      harmGain.gain.exponentialRampToValueAtTime(0.16 + bright * 0.12, t + 0.008)
      harmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
      harm.connect(harmGain).connect(out)
      harm.start(t)
      harm.stop(t + 0.6)
    }

    // 轻微颤音
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 5.2
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 2.2
    lfo.connect(lfoGain).connect(osc.frequency)

    osc.start(t)
    sub.start(t)
    lfo.start(t + 0.08)
    osc.stop(t + dur + 0.1)
    sub.stop(t + dur + 0.1)
    lfo.stop(t + dur)
  }

  // 空弹（未命中音符时按弦）：闷响
  thunk(pitch, when = 0) {
    if (!this.ctx) return
    const t = when || this.ctx.currentTime
    const freq = NOTE_FREQS[pitch] || 220
    const osc = this.ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.12)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.12, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    const filt = this.ctx.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 500
    osc.connect(filt).connect(g).connect(this.master)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  // 启动背景持续低音（羽音 A2 + E3 五度叠置），带缓慢呼吸
  startDrone(when = 0) {
    if (!this.ctx) return
    this.stopDrone()
    const t = when || this.ctx.currentTime
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.12, t + 3)
    g.connect(this.master)

    const make = (freq, lfoRate, lfoDepth) => {
      const o = this.ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = freq
      const lfo = this.ctx.createOscillator()
      lfo.frequency.value = lfoRate
      const lfoGain = this.ctx.createGain()
      lfoGain.gain.value = lfoDepth
      lfo.connect(lfoGain).connect(o.frequency)
      o.connect(g)
      o.start(t)
      lfo.start(t)
      return { o, lfo }
    }

    const a = make(110, 0.07, 1.4)   // A2
    const e = make(164.81, 0.09, 1.0) // E3
    this.droneNodes = { a, e, g }
  }

  stopDrone() {
    if (!this.ctx || !this.droneNodes) return
    const { a, e, g } = this.droneNodes
    const t = this.ctx.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setValueAtTime(g.gain.value, t)
    g.gain.linearRampToValueAtTime(0.0001, t + 0.8)
    setTimeout(() => {
      try { a.o.stop(); a.lfo.stop(); e.o.stop(); e.lfo.stop() } catch (_) {}
    }, 900)
    this.droneNodes = null
  }
}
