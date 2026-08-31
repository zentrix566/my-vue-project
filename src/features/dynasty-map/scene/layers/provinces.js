// 省份暗色底座：现代中国 34 省统一暗石板色薄板，悬停微亮。
// 一次构建、跨朝代复用；每省单独成 mesh 以支持拾取与悬停。

import * as THREE from 'three'
import { ringsToShape } from '../geo.js'
import { addTerrainVertexColors } from '../terrain.js'

const PROVINCE_HEIGHT = 0.42

export function buildProvinces(geoJson) {
  const group = new THREE.Group()
  group.name = 'provinces'

  const baseMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 1,
    metalness: 0,
    vertexColors: true
  })
  const hoverMat = baseMat.clone()
  hoverMat.emissive = new THREE.Color('#dce9bd')
  hoverMat.emissiveIntensity = 0.22

  const meshes = []
  for (const feature of geoJson.features) {
    const name = feature.properties && feature.properties.name
    if (!name || !feature.geometry) continue
    const polys = feature.geometry.type === 'MultiPolygon'
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates]
    const shapes = []
    for (const poly of polys) {
      try {
        shapes.push(ringsToShape(poly))
      } catch {
        // 个别环数据异常时跳过该环，不影响整省
      }
    }
    if (!shapes.length) continue
    const geom = new THREE.ExtrudeGeometry(shapes, {
      depth: PROVINCE_HEIGHT,
      bevelEnabled: false,
      curveSegments: 1
    })
    geom.rotateX(-Math.PI / 2)
    addTerrainVertexColors(geom)
    const mesh = new THREE.Mesh(geom, baseMat)
    mesh.userData = { kind: 'province', name, baseMat, hoverMat }
    group.add(mesh)
    meshes.push(mesh)
  }

  // 现代省界由每省外缘细线表现，低对比度，避免与历史国界争夺注意力。
  const lines = new THREE.Group()
  for (const mesh of meshes) {
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 22),
      new THREE.LineBasicMaterial({ color: '#dde3cf', transparent: true, opacity: 0.27 })
    )
    edge.position.y = PROVINCE_HEIGHT + 0.02
    lines.add(edge)
  }
  group.add(lines)

  return {
    group,
    meshes,
    setHover(name) {
      for (const m of meshes) {
        m.material = m.userData.name === name ? m.userData.hoverMat : m.userData.baseMat
      }
    },
    dispose() {
      for (const m of meshes) m.geometry.dispose()
      baseMat.dispose()
      hoverMat.dispose()
      for (const edge of lines.children) {
        edge.geometry.dispose()
        edge.material.dispose()
      }
    }
  }
}
