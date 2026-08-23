// 历代疆域层：每政权一块莫兰迪色拉伸体 + 顶部发光描边，
// 切换朝代时整组从 0 弹性生长；支持单政权选中态（亮 / 其余压暗）。

import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { ringsToShape, polylineToXZ, polygonAreaXZ } from '../geo.js'
import { morandi } from '../palette.js'

const BASE_HEIGHT = 2.1
const MAX_BOOST = 0.8 // 大政权比小政权最多高这么多，形成细微高度差

export function buildTerritories(factions) {
  const group = new THREE.Group()
  group.name = 'territories'

  const maxArea = Math.max(
    ...factions.flatMap((f) => f.rings.map((r) => polygonAreaXZ(r))),
    1
  )

  const meshes = []
  for (const fac of factions) {
    const colors = morandi(fac.color)
    const height = BASE_HEIGHT + MAX_BOOST * Math.min(
      1,
      Math.max(...fac.rings.map((r) => polygonAreaXZ(r))) / maxArea
    )
    const shapes = fac.rings.map((ring) => ringsToShape([ring]))
    const geom = new THREE.ExtrudeGeometry(shapes, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 1
    })
    geom.rotateX(-Math.PI / 2)

    const mat = new THREE.MeshStandardMaterial({
      color: colors.top,
      roughness: 0.62,
      metalness: 0.05,
      emissive: new THREE.Color(colors.side),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.94
    })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.userData = { kind: 'territory', faction: fac.key, colors, height }
    group.add(mesh)
    meshes.push(mesh)

    // 顶部边界发光描边（每环一条闭合 Line2）
    for (const ring of fac.rings) {
      const pts = polylineToXZ([...ring, ring[0]])
      const lg = new LineGeometry()
      lg.setPositions(pts.flatMap((v) => [v.x, height + 0.12, v.z]))
      const lm = new LineMaterial({
        color: new THREE.Color(colors.bright).getHex(),
        linewidth: 2.2,
        transparent: true,
        opacity: 0.9
      })
      const loop = new Line2(lg, lm)
      loop.computeLineDistances()
      loop.userData = { kind: 'territory-line', faction: fac.key }
      group.add(loop)
      mesh.userData.lineLoops = (mesh.userData.lineLoops || []).concat(loop)
    }
  }

  return {
    group,
    meshes,
    heights: Object.fromEntries(meshes.map((m) => [m.userData.faction, m.userData.height])),

    // 单政权选中：选中块提亮增透，其余压暗；空 key 恢复
    setFaction(key) {
      for (const m of meshes) {
        const on = !key || m.userData.faction === key
        m.material.opacity = key ? (on ? 1 : 0.28) : 0.94
        m.material.emissiveIntensity = key ? (on ? 0.85 : 0.15) : 0.35
        for (const loop of m.userData.lineLoops || []) {
          loop.material.opacity = key ? (on ? 1 : 0.15) : 0.9
        }
      }
    },

    // 供 LineMaterial 更新分辨率（Line2 必需）
    setResolution(w, h) {
      for (const m of meshes) {
        for (const loop of m.userData.lineLoops || []) {
          loop.material.resolution.set(w, h)
        }
      }
    },

    dispose() {
      for (const m of meshes) {
        m.geometry.dispose()
        m.material.dispose()
        for (const loop of m.userData.lineLoops || []) {
          loop.geometry.dispose()
          loop.material.dispose()
        }
      }
    }
  }
}
