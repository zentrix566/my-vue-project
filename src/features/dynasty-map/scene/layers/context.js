// 中国周边地理背景：Natural Earth 1:110m 国界的离线子集。
// 只承担空间参照，不表达任何历史时期的政治归属，颜色与标签均主动降级。

import * as THREE from 'three'
import { ringsToShape, project } from '../geo.js'
import { addTerrainVertexColors } from '../terrain.js'

const HEIGHT = 0.16

const SHORT_NAMES = {
  PRK: '朝鲜', KOR: '韩国', MNG: '蒙古', RUS: '俄罗斯', JPN: '日本',
  LAO: '老挝', KHM: '柬埔寨', MMR: '缅甸', VNM: '越南',
  IDN: '印度尼西亚', MYS: '马来西亚', PHL: '菲律宾', BRN: '文莱'
}

export function buildContext(featureCollection) {
  const group = new THREE.Group()
  group.name = 'east-asia-context'
  const meshes = []
  const edges = []
  const labels = []

  const material = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    metalness: 0,
    vertexColors: true
  })

  for (const feature of featureCollection.features || []) {
    if (!feature.geometry) continue
    const polygons = feature.geometry.type === 'MultiPolygon'
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates]
    const shapes = []
    for (const polygon of polygons) {
      try {
        shapes.push(ringsToShape(polygon))
      } catch {
        // Natural Earth 的个别极小岛环异常时跳过，不影响大陆背景。
      }
    }
    if (!shapes.length) continue

    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: HEIGHT,
      bevelEnabled: false,
      curveSegments: 1
    })
    geometry.rotateX(-Math.PI / 2)
    addTerrainVertexColors(geometry, { muted: true })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = -0.12
    group.add(mesh)
    meshes.push(mesh)

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 22),
      new THREE.LineBasicMaterial({ color: '#d8ded4', transparent: true, opacity: 0.24 })
    )
    outline.position.y = HEIGHT - 0.09
    group.add(outline)
    edges.push(outline)

    const labelAt = feature.properties?.labelAt
    if (labelAt && Number.isFinite(labelAt[0]) && Number.isFinite(labelAt[1])) {
      const p = project(labelAt[0], labelAt[1])
      labels.push({
        name: SHORT_NAMES[feature.properties.key] || feature.properties.name,
        anchor: new THREE.Vector3(p.x, HEIGHT + 0.12, p.z)
      })
    }
  }

  return {
    group,
    labels,
    dispose() {
      for (const mesh of meshes) mesh.geometry.dispose()
      for (const edge of edges) {
        edge.geometry.dispose()
        edge.material.dispose()
      }
      material.dispose()
    }
  }
}
