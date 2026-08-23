// 郡/州区划层：以城邑为种子把疆域做 Voronoi 分割，切出的单元铺在疆域
// 顶面上——同色系明度微差着色（「同色系渐变区分州郡」）+ 内部界线 +
// 悬停高亮与郡名。郡名优先取城邑 jun 字段，其次从 note 的「X郡治」提取，
// 都没有则用城名。

import * as THREE from 'three'
import { project } from '../geo.js'
import { morandi } from '../palette.js'
import { voronoiInPolygon, pointInPolygonXZ, cellStats } from '../voronoi.js'

// 从 note 提取「三川郡治」「凉州刺史部治所」式的区划名
export function divisionNameOf(city) {
  if (city.jun) return city.jun
  const m = city.note && city.note.match(/([\u4e00-\u9fa5]{1,6}(?:郡|州|路|府|国|部))(?=治)/)
  return m ? m[1] : city.name
}

// 按名字做 -0.05 ~ +0.05 的确定性明度抖动，形成同色系渐变
function lightnessJitter(name, index) {
  let h = index
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0
  return (((Math.abs(h) % 1000) / 1000) - 0.5) * 0.1
}

const MIN_CELL_AREA = 0.4 // 过小的碎块丢弃

export function buildDivisions(factions, cities, heights) {
  const group = new THREE.Group()
  group.name = 'divisions'
  const cells = [] // {name, city, faction, mesh, line, baseMat, lineMat, centroid:{x,z}}

  for (const fac of factions) {
    const height = heights[fac.key] || 2.1
    const colors = morandi(fac.color)
    // 该政权的城邑：多政权朝代按 faction 标注，单政权朝代城邑无 faction 字段
    const facCities = factions.length === 1
      ? cities.filter((c) => !c.faction)
      : cities.filter((c) => c.faction === fac.key)

    for (const ring of fac.rings) {
      const ringXZ = ring.map(([lng, lat]) => project(lng, lat))
      const seeds = []
      const seedCities = []
      for (const c of facCities) {
        const p = project(c.lng, c.lat)
        if (pointInPolygonXZ(p.x, p.z, ringXZ)) {
          seeds.push(p)
          seedCities.push(c)
        }
      }
      if (seeds.length < 2) continue // 城邑不足两座不分割（如台湾、海南副岛）

      const units = voronoiInPolygon(seeds, ringXZ)
      units.forEach((cell, i) => {
        if (cell.length < 3) return
        const stats = cellStats(cell)
        if (stats.area < MIN_CELL_AREA) return
        const city = seedCities[i]
        const name = divisionNameOf(city)

        // 单元板块：政权色的明度微差变体，铺在疆域顶面
        const shape = new THREE.Shape(cell.map((p) => new THREE.Vector2(p.x, -p.z)))
        const geom = new THREE.ShapeGeometry(shape)
        geom.rotateX(-Math.PI / 2)
        const tint = new THREE.Color(colors.top).offsetHSL(0, 0, lightnessJitter(name, i))
        const baseMat = new THREE.MeshStandardMaterial({
          color: tint,
          roughness: 0.66,
          metalness: 0.04,
          emissive: new THREE.Color(colors.side),
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.97
        })
        const mesh = new THREE.Mesh(geom, baseMat)
        mesh.position.y = height + 0.03
        mesh.userData = { kind: 'division', city, name, faction: fac.key }
        group.add(mesh)

        // 内部界线：比外缘发光描边细、暗，形成层级
        const lineGeo = new THREE.BufferGeometry().setFromPoints(
          cell.map((p) => new THREE.Vector3(p.x, 0, p.z))
        )
        const lineMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(colors.bright),
          transparent: true,
          opacity: 0.5
        })
        const line = new THREE.LineLoop(lineGeo, lineMat)
        line.position.y = height + 0.07
        group.add(line)

        cells.push({
          name, city, faction: fac.key, mesh, line, baseMat, lineMat,
          centroid: { x: stats.cx, z: stats.cz },
          height
        })
      })
    }
  }

  let hoverIndex = -1

  return {
    group,
    cells,
    meshes: cells.map((c) => c.mesh),

    // 供标签层：各单元名 + 质心锚点
    labelSpecs() {
      return cells.map((c) => ({
        name: c.name,
        anchor: new THREE.Vector3(c.centroid.x, c.height + 0.55, c.centroid.z)
      }))
    },

    setHover(index) {
      if (index === hoverIndex) return null
      if (hoverIndex >= 0 && cells[hoverIndex]) {
        cells[hoverIndex].baseMat.emissiveIntensity = 0.3
        cells[hoverIndex].lineMat.opacity = 0.5
      }
      hoverIndex = index
      if (index >= 0 && cells[index]) {
        cells[index].baseMat.emissiveIntensity = 0.75
        cells[index].lineMat.opacity = 0.95
      }
      return index >= 0 ? cells[index] : null
    },

    // 政权选中态联动：未选中政权的区划压暗
    setFaction(key) {
      for (const c of cells) {
        const on = !key || c.faction === key
        c.baseMat.opacity = key ? (on ? 0.97 : 0.3) : 0.97
        c.lineMat.opacity = key ? (on ? 0.5 : 0.12) : 0.5
      }
    },

    dispose() {
      for (const c of cells) {
        c.mesh.geometry.dispose()
        c.baseMat.dispose()
        c.line.geometry.dispose()
        c.lineMat.dispose()
      }
    }
  }
}
