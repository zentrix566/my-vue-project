// 省份暗色底座：现代中国 34 省统一暗石板色薄板，悬停微亮。
// 一次构建、跨朝代复用；每省单独成 mesh 以支持拾取与悬停。

import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ringsToShape } from '../geo.js'

const PROVINCE_HEIGHT = 0.42

export function buildProvinces(geoJson) {
  const group = new THREE.Group()
  group.name = 'provinces'

  const baseMat = new THREE.MeshStandardMaterial({
    color: '#1d2841',
    roughness: 0.85,
    metalness: 0.1,
    emissive: '#0a1020',
    emissiveIntensity: 0.5
  })
  const hoverMat = baseMat.clone()
  hoverMat.color = new THREE.Color('#2b3a5f')
  hoverMat.emissive = new THREE.Color('#1a2745')
  hoverMat.emissiveIntensity = 1

  const meshes = []
  const borderGeoms = []
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
    const mesh = new THREE.Mesh(geom, baseMat)
    mesh.userData = { kind: 'province', name, baseMat, hoverMat }
    group.add(mesh)
    meshes.push(mesh)
    borderGeoms.push(geom)
  }

  // 省界细描边：所有省几何合并后取一次棱边，省 draw call
  const merged = mergeGeometries(borderGeoms, false)
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(merged, 18),
    new THREE.LineBasicMaterial({ color: '#3a4a72', transparent: true, opacity: 0.55 })
  )
  lines.position.y = PROVINCE_HEIGHT + 0.02
  lines.renderOrder = 1
  group.add(lines)
  merged.dispose()

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
      lines.geometry.dispose()
      lines.material.dispose()
    }
  }
}
