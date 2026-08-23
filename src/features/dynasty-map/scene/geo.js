// 经纬度 → 场景坐标的等距投影，以及 GeoJSON 环 → THREE.Shape 的转换。
// 中国范围（约 lng 73—135、lat 18—54）投影到约 ±51 × ±37 的 XZ 平面，
// 以北纬 35° 的余弦校准东西方向的拉伸，使轮廓不至于被压扁或拉宽。

import * as THREE from 'three'

const LNG_CENTER = 104
const LAT_CENTER = 36.5
const LNG_SQUEEZE = Math.cos((35 * Math.PI) / 180)
const SCALE = 2

// 经纬度 → 场景坐标（y 为高度轴，由各图层自行叠加）
export function project(lng, lat) {
  return {
    x: (lng - LNG_CENTER) * LNG_SQUEEZE * SCALE,
    z: -(lat - LAT_CENTER) * SCALE
  }
}

// GeoJSON Polygon 的环数组（ring[0] 外环，其余为洞）→ THREE.Shape
export function ringsToShape(polygon) {
  const [outer, ...holes] = polygon
  const shape = new THREE.Shape(outer.map(([lng, lat]) => {
    const p = project(lng, lat)
    return new THREE.Vector2(p.x, -p.z)
  }))
  for (const hole of holes) {
    shape.holes.push(new THREE.Path(hole.map(([lng, lat]) => {
      const p = project(lng, lat)
      return new THREE.Vector2(p.x, -p.z)
    })))
  }
  return shape
}

// 折线（[lng,lat][]）→ XZ 平面上的点列（供 Line2 / 曲线使用）
export function polylineToXZ(points) {
  return points.map(([lng, lat]) => {
    const p = project(lng, lat)
    return new THREE.Vector3(p.x, 0, p.z)
  })
}

// 简易多边形面积（投影后，用于疆域块的细微高度差），鞋带公式
export function polygonAreaXZ(ring) {
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = project(ring[j][0], ring[j][1])
    const b = project(ring[i][0], ring[i][1])
    area += a.x * b.z - b.x * a.z
  }
  return Math.abs(area / 2)
}
