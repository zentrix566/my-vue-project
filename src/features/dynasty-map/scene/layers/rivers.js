// 水系层：主要河流以蓝色 Line2 细线铺在疆域顶面之上，
// 深度测试关闭保证任何政权色块之上都可见（相当于地图册上印刷的水系网）。

import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import { polylineToXZ } from '../geo.js'

const BASE_WIDTH = 1.7
const LINE_HEIGHT = 3.6

export function buildRivers(rivers) {
  const group = new THREE.Group()
  group.name = 'rivers'
  const lines = []

  for (const river of rivers) {
    const pts = polylineToXZ(river.points)
    if (pts.length < 2) continue
    const geom = new LineGeometry()
    geom.setPositions(pts.flatMap((v) => [v.x, LINE_HEIGHT, v.z]))
    const mat = new LineMaterial({
      color: 0x3f7fc0,
      linewidth: BASE_WIDTH * (river.width || 1),
      transparent: true,
      opacity: 0.8,
      depthTest: false
    })
    const line = new Line2(geom, mat)
    line.computeLineDistances()
    line.renderOrder = 5
    group.add(line)
    lines.push(line)
  }

  return {
    group,
    lines,

    setResolution(w, h) {
      for (const line of lines) line.material.resolution.set(w, h)
    },

    dispose() {
      for (const line of lines) {
        line.geometry.dispose()
        line.material.dispose()
      }
    }
  }
}
