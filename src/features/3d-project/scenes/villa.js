// 别墅场景：现代加州豪宅外景（参考洛杉矶山坡豪宅气质：平顶大宅、玻璃幕墙、
// 后院大泳池、车道与棕榈树）。坐标约定：x 为左右，z 为前后（正面朝 +z），y 为高度。
import * as THREE from 'three'
import { box } from '../framework.js'

function createMaterials() {
  const std = (color, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })

  return {
    grass: std(0x79b455, 1),
    driveway: std(0x8a8782, 0.85),
    stone: std(0xcfc9bf, 0.8),
    wall: std(0xf4f1ea, 0.92),
    wallAccent: std(0x8a8178, 0.85),
    roof: std(0xe8e4dc, 0.9),
    glass: new THREE.MeshStandardMaterial({
      color: 0xa9d6ee,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7
    }),
    frame: std(0x5a5752, 0.6),
    door: std(0x6b4a2f, 0.7),
    garage: std(0xb9b4ad, 0.6),
    wood: std(0x7a5a3a, 0.8),
    trunk: std(0x7a5a3a, 0.9),
    palmLeaf: std(0x3f7a3a, 0.95),
    leaf: std(0x4c8a3f, 0.95),
    poolFloor: std(0x8fd6f2, 0.4),
    pool: new THREE.MeshStandardMaterial({
      color: 0x2f9fe0,
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85
    })
  }
}

// 一棵普通树：树干 + 球形树冠
function addTree(group, mats, x, z, scale = 1) {
  const tree = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 2, 10), mats.trunk)
  trunk.position.y = 1
  trunk.castShadow = true
  tree.add(trunk)
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), mats.leaf)
  crown.position.y = 2.8
  crown.castShadow = true
  tree.add(crown)
  tree.position.set(x, 0, z)
  tree.scale.setScalar(scale)
  group.add(tree)
}

// 一棵棕榈树：细高树干 + 顶部放射状下垂叶片
function addPalm(group, mats, x, z, h = 6) {
  const palm = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, h, 8), mats.trunk)
  trunk.position.y = h / 2
  trunk.castShadow = true
  palm.add(trunk)
  const crown = new THREE.Group()
  crown.position.y = h
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.7), mats.palmLeaf)
    const holder = new THREE.Group()
    holder.rotation.y = (i / 7) * Math.PI * 2
    leaf.position.set(1.3, -0.5, 0)
    leaf.rotation.z = -0.35
    holder.add(leaf)
    crown.add(holder)
  }
  palm.add(crown)
  palm.position.set(x, 0, z)
  group.add(palm)
}

// 一条竖向窗框（玻璃幕墙的隔断）
function addMullion(group, mats, x, y, z, h) {
  const bar = box(0.06, h, 0.1, mats.frame, { castShadow: false })
  bar.position.set(x, y, z)
  group.add(bar)
}

export default {
  id: 'villa',
  label: '别墅',
  views: [
    { key: 'overview', label: '全景', position: [19, 12, 20], target: [0, 2.5, -2] },
    { key: 'front', label: '正面', position: [0, 2.8, 19], target: [0, 2.8, -2] },
    { key: 'top', label: '俯视', position: [0, 26, 2], target: [0, 0, -2] }
  ],
  build(group) {
    const mats = createMaterials()

    // 草地
    const grass = box(46, 0.3, 36, mats.grass, { castShadow: false })
    grass.position.set(0, -0.15, 0)
    group.add(grass)

    // 车道：从正门延伸到草地前缘
    const driveway = box(6, 0.05, 11, mats.driveway)
    driveway.position.set(0, 0.03, 9.5)
    group.add(driveway)

    // 地基平台
    const foundation = box(22, 0.5, 16, mats.stone)
    foundation.position.set(0, 0.25, -2)
    group.add(foundation)

    // 一层主体（挑高大厅）
    const body = box(20, 4.5, 13, mats.wall)
    body.position.set(0, 0.5 + 2.25, -2)
    group.add(body)

    // 一层平顶 + 女儿墙
    const roof1 = box(20.8, 0.5, 13.8, mats.roof)
    roof1.position.set(0, 0.5 + 4.5 + 0.25, -2)
    group.add(roof1)

    // 二层（左侧挑高体块）
    const upper = box(10, 2.8, 9, mats.wall)
    upper.position.set(-5, 0.5 + 4.5 + 1.4, -2)
    group.add(upper)
    const roof2 = box(10.8, 0.4, 9.8, mats.roof)
    roof2.position.set(-5, 0.5 + 4.5 + 2.8 + 0.2, -2)
    group.add(roof2)
    // 二层窗户
    ;[-7.5, -2.5].forEach((wx) => {
      const wglass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.08), mats.glass)
      wglass.position.set(wx, 0.5 + 4.5 + 1.4, -2 + 4.54)
      group.add(wglass)
      const wframe = box(1.8, 1.6, 0.1, mats.frame, { castShadow: false })
      wframe.position.set(wx, 0.5 + 4.5 + 1.4, -2 + 4.54)
      group.add(wframe)
    })

    // 一层正面玻璃幕墙（大厅落地窗）
    const frontZ = -2 + 6.5 // = 4.5
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(15, 3.1, 0.1), mats.glass)
    curtain.position.set(0, 0.5 + 1.75, frontZ + 0.05)
    group.add(curtain)
    ;[-6, -4, -2, 0, 2, 4, 6].forEach((mx) => addMullion(group, mats, mx, 0.5 + 1.75, frontZ + 0.12, 3.1))

    // 正门（一层正面偏左）
    const door = box(0.1, 2.6, 1.7, mats.door)
    door.position.set(-5.5, 0.5 + 1.3, frontZ + 0.08)
    group.add(door)
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c28a, roughness: 0.3, metalness: 0.6 })
    )
    handle.position.set(-5.5 + 0.6, 0.5 + 1.3, frontZ + 0.18)
    group.add(handle)
    // 门前两级台阶
    const step1 = box(2.2, 0.15, 0.5, mats.stone)
    step1.position.set(-5.5, 0.5 - 0.075, frontZ + 0.55)
    group.add(step1)
    const step2 = box(2.2, 0.15, 0.5, mats.stone)
    step2.position.set(-5.5, 0.5 - 0.075 - 0.15, frontZ + 1.0)
    group.add(step2)

    // 车库（右侧，卷帘门朝前）
    const garage = box(7, 3.2, 8, mats.wallAccent)
    garage.position.set(11, 0.5 + 1.6, -2)
    group.add(garage)
    const garageRoof = box(7.6, 0.4, 8.6, mats.roof)
    garageRoof.position.set(11, 0.5 + 3.2 + 0.2, -2)
    group.add(garageRoof)
    const garageDoor = box(4.6, 2.6, 0.08, mats.garage)
    garageDoor.position.set(11, 0.5 + 1.3, -2 + 4.04)
    group.add(garageDoor)

    // 一层侧面窗户
    ;[-1, 1].forEach((side) => {
      ;[-1.5, 1.5].forEach((wz) => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.2), mats.glass)
        glass.position.set(side * 10.04, 0.5 + 1.8, wz)
        group.add(glass)
      })
    })

    // 后院泳池（z 负侧）
    const poolEdge = box(13, 0.12, 7, mats.stone)
    poolEdge.position.set(0, 0.06, -11)
    group.add(poolEdge)
    const poolFloor = box(12, 0.12, 6, mats.poolFloor, { castShadow: false })
    poolFloor.position.set(0, 0.1, -11)
    group.add(poolFloor)
    const pool = box(12, 0.3, 6, mats.pool)
    pool.position.set(0, 0.28, -11)
    group.add(pool)

    // 棕榈树（豪宅标配）
    addPalm(group, mats, 14, -13, 6)
    addPalm(group, mats, -14, -15, 7)
    addPalm(group, mats, 17, 3, 5.5)
    addPalm(group, mats, -16, 6, 6)
    addPalm(group, mats, 8, 14, 5)

    // 普通树
    addTree(group, mats, -19, 14, 1.1)
    addTree(group, mats, 19, -15, 1.2)
    addTree(group, mats, -19, -15, 1)
    addTree(group, mats, 19, 14, 1.1)

    // 灌木
    ;[
      [3.5, 5.8],
      [-3.5, 5.8],
      [8, 5.4],
      [-8, 5.4],
      [6, -10.5],
      [-6, -10.5],
      [13, -6],
      [-13, -6]
    ].forEach(([bx, bz]) => {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mats.leaf)
      bush.position.set(bx, 0.55, bz)
      bush.castShadow = true
      group.add(bush)
    })
  }
}
