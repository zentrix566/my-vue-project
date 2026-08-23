// 长城层：暖褐色微光棱线，沿墙体数据铺成连绵短棱柱。
// 用细长盒子段比线段更有厚度感，additive 材质让 bloom 拾取出微光。

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { polylineToXZ } from '../geo.js'

const SEG_LEN = 0.72
const SEG_HEIGHT = 0.5
const SEG_WIDTH = 0.22

export function buildWall(points) {
  const group = new THREE.Group()
  group.name = 'wall'

  const pts = polylineToXZ(points)
  const geoms = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]
    const b = pts[i + 1]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len < 0.01) continue
    const n = Math.max(1, Math.round(len / SEG_LEN))
    for (let k = 0; k < n; k++) {
      const t0 = k / n
      const t1 = (k + 1) / n
      const cx = a.x + dx * (t0 + t1) / 2
      const cz = a.z + dz * (t0 + t1) / 2
      const segLen = len / n
      const geom = new THREE.BoxGeometry(segLen * 0.82, SEG_HEIGHT, SEG_WIDTH)
      // 盒子长边沿 X，绕 Y 转到与段方向平行（对称盒允许 ±180° 误差）
      geom.rotateY(Math.atan2(dx, dz) + Math.PI / 2)
      geom.translate(cx, SEG_HEIGHT / 2 + 0.4, cz)
      geoms.push(geom)
    }
  }
  if (!geoms.length) {
    return { group, dispose() {} }
  }

  const merged = mergeGeometries(geoms, false)
  for (const g of geoms) g.dispose()
  const mat = new THREE.MeshBasicMaterial({
    color: '#8a6a3f',
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  group.add(new THREE.Mesh(merged, mat))

  return {
    group,
    dispose() {
      merged.dispose()
      mat.dispose()
    }
  }
}
