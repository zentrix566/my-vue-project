// 标签管理器：真 DOM 毛玻璃标签 + 屏幕空间贪心碰撞检测 + 缩放分层。
//
// 解决两大痛点：
// 1. 碰撞检测——每次相机变化把候选标签投影到屏幕，按优先级（政权名 > 都城 >
//    重镇 > 关隘 > 城邑）贪心占矩形位，被更高优先级压住的自动隐藏；
// 2. 缩放分层——远景只显示都城与重镇，中景淡入关隘，近景淡入城邑，
//    透明度过渡交给 CSS transition，平滑不跳变。

import * as THREE from 'three'
import { ZOOM_TIERS } from '../palette.js'

const FONT_BODY = '600 12.5px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const FONT_CAPITAL = '700 13.5px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const FONT_FACTION = '900 32px "STKaiti", "KaiTi", "Noto Serif SC", serif'
const FONT_DIVISION = '500 11px "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif'
const FONT_CONTEXT = '600 12px "Noto Serif SC", "Songti SC", serif'

export class LabelManager {
  constructor(container) {
    this.container = container
    this.labels = []
    this.show = true
    this.forcedName = ''
    this.width = container.clientWidth || 1
    this.height = container.clientHeight || 1
    this.measureCtx = document.createElement('canvas').getContext('2d')
    this.tmpVec = new THREE.Vector3()
  }

  createEl(cls) {
    const el = document.createElement('div')
    el.className = cls
    return el
  }

  // 重建标签池。
  // citySpecs: { name, rank, cityIndex, type }[]（锚点每帧取城市柱顶坐标）
  // factionSpecs: { name, color, anchor: Vector3 }[]（世界坐标静态锚点）
  // divisionSpecs: { name, anchor: Vector3 }[]（郡/州名，最近缩放档显示）
  setEra(citySpecs, factionSpecs, divisionSpecs = [], contextSpecs = []) {
    this.clear()
    for (const f of factionSpecs) {
      this.labels.push({
        kind: 'faction',
        name: f.name,
        color: f.color,
        // 都城永远最优先；政权名让位于都城、排在重镇之前
        rank: 0.6,
        cityIndex: -1,
        anchor: f.anchor,
        el: this.createEl('dm-label dm-label--faction')
      })
    }
    for (const c of citySpecs) {
      this.labels.push({
        kind: 'city',
        name: c.name,
        rank: c.rank,
        cityIndex: c.cityIndex,
        anchor: null,
        el: this.createEl('dm-label dm-label--' + c.type)
      })
    }
    for (const d of divisionSpecs) {
      this.labels.push({
        kind: 'division',
        name: d.name,
        rank: 4,
        cityIndex: -1,
        anchor: d.anchor,
        el: this.createEl('dm-label dm-label--division')
      })
    }
    for (const c of contextSpecs) {
      this.labels.push({
        kind: 'context',
        name: c.name,
        rank: 5,
        cityIndex: -1,
        anchor: c.anchor,
        el: this.createEl('dm-label dm-label--context')
      })
    }
    for (const lb of this.labels) {
      lb.el.textContent = lb.name
      this.measureCtx.font = lb.kind === 'faction'
        ? FONT_FACTION
        : (lb.kind === 'division'
            ? FONT_DIVISION
            : (lb.kind === 'context' ? FONT_CONTEXT : (lb.rank === 0 ? FONT_CAPITAL : FONT_BODY)))
      const w = this.measureCtx.measureText(lb.name).width
      // 城邑胶囊有左右 padding 与边框；政权名/郡名为裸字加 letter-spacing
      lb.boxW = lb.kind === 'faction'
        ? w + lb.name.length * 4 + 20
        : (lb.kind === 'division' ? w + lb.name.length * 3 + 8 : (lb.kind === 'context' ? w + 16 : w + 24))
      lb.boxH = lb.kind === 'faction' ? 36 : (lb.kind === 'division' ? 16 : (lb.kind === 'context' ? 18 : 24))
      if (lb.kind === 'faction') lb.el.style.setProperty('--label-color', lb.color)
      this.container.appendChild(lb.el)
    }
  }

  // 每帧调用：camera 为透视相机，topPositions 为城市柱顶世界坐标数组，
  // distance 为相机到观察目标的距离（用于缩放分层）
  update(camera, topPositions, distance) {
    // 容器尺寸异常（隐藏、切换路由瞬间）时跳过，避免按 1px 视口把标签全判到屏幕外
    if (this.width < 50 || this.height < 50) return
    const w = this.width
    const h = this.height
    const passOn = distance < ZOOM_TIERS.passMax
    const townOn = distance < ZOOM_TIERS.townMax
    const divisionOn = distance < (ZOOM_TIERS.divisionMax || 46)
    const v = this.tmpVec

    const candidates = []
    for (const lb of this.labels) {
      if (lb.kind === 'faction' || lb.kind === 'division' || lb.kind === 'context') {
        v.copy(lb.anchor)
      } else {
        const p = topPositions[lb.cityIndex]
        if (!p) continue
        v.copy(p)
      }
      v.project(camera)
      if (v.z > 1) {
        lb.el.classList.remove('on')
        continue
      }
      const x = (v.x * 0.5 + 0.5) * w
      const y = (-v.y * 0.5 + 0.5) * h
      if (x < -60 || x > w + 60 || y < -24 || y > h + 24) {
        lb.el.classList.remove('on')
        continue
      }
      const tierBlocked = lb.rank === 2
        ? !passOn
        : lb.rank === 3
          ? !townOn
          : lb.rank === 4
            ? !divisionOn
            : false
      candidates.push({ lb, x, y, tierBlocked })
    }

    // 优先级排序：rank 升序（政权名 -1 最优先），同级按屏幕 y 稳定排序
    candidates.sort((a, b) => a.lb.rank - b.lb.rank || a.y - b.y)

    const placed = []
    const forced = this.show ? this.forcedName : ''
    for (const cand of candidates) {
      const { lb, x, y, tierBlocked } = cand
      const forcedShow = !!forced && lb.name === forced
      let visible = (this.show && !tierBlocked) || forcedShow
      // 政权名称是地图主信息，即使彼此靠近也全部保留；只让城市/区划标签参与碰撞隐藏。
      // 否则春秋战国、三国、宋辽金等并立地图会只剩一个国家名。
      const isFaction = lb.kind === 'faction'
      if (visible && !forcedShow && !isFaction) {
        // 标签矩形：水平以 x 为中心，垂直从 y 往上 boxH
        const hw = lb.boxW / 2
        const top = y - lb.boxH
        for (const r of placed) {
          if (Math.abs(x - r.x) < hw + r.hw && top < r.y && y > r.top) {
            visible = false
            break
          }
        }
        if (visible) placed.push({ x, y, hw, top })
      }
      if (visible) {
        lb.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
        lb.el.classList.add('on')
        if (isFaction && !placed.some((r) => r.x === x && r.y === y)) {
          placed.push({ x, y, hw: lb.boxW / 2, top: y - lb.boxH })
        }
      } else {
        lb.el.classList.remove('on')
      }
    }
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w >= 50 && h >= 50) {
      this.width = w
      this.height = h
    }
  }

  setShow(v) {
    this.show = v
    if (!v) for (const lb of this.labels) lb.el.classList.remove('on')
  }

  forceShow(name) {
    this.forcedName = name || ''
  }

  clear() {
    for (const lb of this.labels) lb.el.remove()
    this.labels = []
  }

  dispose() {
    this.clear()
  }
}
