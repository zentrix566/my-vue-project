// 城市 3D 光柱层：InstancedMesh 圆柱（顶细底宽的微锥形），
// 高度与亮度按等级（都城最高最亮、发红光），additive 材质配 bloom 形成光束感。
// 柱顶一枚光点 sprite 加强「悬浮光束」观感。

import * as THREE from 'three'
import { project } from '../geo.js'
import { CITY_TIERS } from '../palette.js'

// 共享单位几何：高 1、底半径 1、顶半径 0.55，实例矩阵做实际缩放
function makeColumnGeometry() {
  return new THREE.CylinderGeometry(0.55, 1, 1, 18, 1, false).translate(0, 0.5, 0)
}

function makeTipTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.6)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function buildCities(cities, { onHover }) {
  const group = new THREE.Group()
  group.name = 'cities'

  const columnGeo = makeColumnGeometry()
  const columnMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const mesh = new THREE.InstancedMesh(columnGeo, columnMat, cities.length)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false

  const tipMat = new THREE.PointsMaterial({
    size: 1.6,
    map: makeTipTexture(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  })
  const tipGeo = new THREE.BufferGeometry()
  tipGeo.setAttribute('position', new THREE.Float32BufferAttribute(cities.length * 3, 3))
  const tips = new THREE.Points(tipGeo, tipMat)
  tips.frustumCulled = false

  const items = cities.map((c, i) => {
    const tier = CITY_TIERS[c.type] || CITY_TIERS.town
    const p = project(c.lng, c.lat)
    return {
      city: c,
      tier,
      index: i,
      base: new THREE.Vector3(p.x, 0, p.z),
      // 目标矩阵：半径 / 高度按等级；当前矩阵由动画因子驱动
      radius: tier.radius,
      height: tier.height,
      grow: 1 // 当前生长因子（切换朝代时从 0 动画到 1）
    }
  })

  const tmpM = new THREE.Matrix4()
  const tmpQ = new THREE.Quaternion()
  const tmpS = new THREE.Vector3()
  const tmpC = new THREE.Color()

  function writeInstance(item, scale = 1) {
    const h = item.height * item.grow * scale
    const r = item.radius * (1 + (scale - 1) * 0.6)
    tmpM.compose(
      item.base,
      tmpQ.identity(),
      tmpS.set(r, Math.max(h, 0.001), r)
    )
    mesh.setMatrixAt(item.index, tmpM)
    const pos = tipGeo.attributes.position
    pos.setXYZ(item.index, item.base.x, h + 0.35, item.base.z)
  }

  function applyColors() {
    for (const item of items) {
      tmpC.set(item.tier.color)
      tmpC.multiplyScalar(item.tier.glow)
      mesh.setColorAt(item.index, tmpC)
    }
    mesh.instanceColor.needsUpdate = true
    // 柱顶光点颜色直接沿用等级色（vertex colors）
    const colors = new Float32Array(items.length * 3)
    items.forEach((item, i) => {
      tmpC.set(item.tier.color).multiplyScalar(0.85 * item.tier.glow + 0.15)
      colors[i * 3] = tmpC.r
      colors[i * 3 + 1] = tmpC.g
      colors[i * 3 + 2] = tmpC.b
    })
    tipGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    tipMat.vertexColors = true
  }

  items.forEach((item) => writeInstance(item))
  applyColors()
  mesh.instanceMatrix.needsUpdate = true
  tipGeo.attributes.position.needsUpdate = true

  group.add(mesh)
  group.add(tips)

  let hoverIndex = -1
  function refreshHover(prev) {
    if (prev >= 0 && items[prev]) writeInstance(items[prev])
    if (hoverIndex >= 0 && items[hoverIndex]) writeInstance(items[hoverIndex], 1.12)
    mesh.instanceMatrix.needsUpdate = true
    tipGeo.attributes.position.needsUpdate = true
  }

  return {
    group,
    mesh,
    items,

    // 每帧驱动生长动画
    update(dt) {
      let dirty = false
      for (const item of items) {
        if (item.grow < 1) {
          item.grow = Math.min(1, item.grow + dt * 1.6)
          writeInstance(item)
          dirty = true
        }
      }
      if (dirty) {
        mesh.instanceMatrix.needsUpdate = true
        tipGeo.attributes.position.needsUpdate = true
      }
    },

    growFromZero() {
      for (const item of items) {
        item.grow = 0
        writeInstance(item)
      }
      mesh.instanceMatrix.needsUpdate = true
      tipGeo.attributes.position.needsUpdate = true
    },

    setHover(index) {
      if (index === hoverIndex) return
      const prev = hoverIndex
      hoverIndex = index
      refreshHover(prev)
      if (onHover) onHover(index >= 0 ? items[index].city : null)
    },

    // 选中城市：光柱脉冲加亮
    pulse(name) {
      const item = items.find((x) => x.city.name === name)
      if (!item) return
      writeInstance(item, 1.25)
      mesh.instanceMatrix.needsUpdate = true
      tipGeo.attributes.position.needsUpdate = true
      setTimeout(() => {
        if (hoverIndex !== item.index) writeInstance(item)
        mesh.instanceMatrix.needsUpdate = true
        tipGeo.attributes.position.needsUpdate = true
      }, 900)
    },

    // 每根光柱顶端世界坐标（供标签锚定）
    topPositions() {
      return items.map((item) => new THREE.Vector3(
        item.base.x,
        item.height * item.grow + 0.9,
        item.base.z
      ))
    },

    dispose() {
      columnGeo.dispose()
      columnMat.dispose()
      tipGeo.dispose()
      tipMat.map.dispose()
      tipMat.dispose()
      mesh.dispose()
    }
  }
}
