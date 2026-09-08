// 别墅场景：现代加州豪宅剖面图（切开正面露出内部装修与家具）。
// 坐标约定：x 左右，z 前后（正面朝 +z，剖面切口在 +z），y 高度。
import * as THREE from 'three'
import { box } from '../framework.js'

function createMaterials() {
  const std = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return {
    // 外部
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
    garage: std(0xb9b4ad, 0.6),
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
    }),
    // 内部装修
    floorWood: std(0x8b6b4a, 0.85),
    carpet: std(0xc9b896, 0.95),
    sofa: std(0x6f6f6d, 0.9),
    cushion: std(0x9a9a98, 0.9),
    tableTop: std(0xa07852, 0.8),
    island: std(0xeeeae2, 0.7),
    stove: std(0x2a2a2a, 0.5),
    fridge: std(0xc8c8c8, 0.4, 0.3),
    bed: std(0x8a6f4d, 0.8),
    mattress: std(0xf2f0ec, 0.9),
    wardrobe: std(0x6b4a2f, 0.8),
    tvScreen: std(0x121212, 0.3),
    stair: std(0x9a7a52, 0.8),
    handrail: std(0x4a3a2a, 0.7)
  }
}

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
  palm.position.set(x, 0, z)
  group.add(palm)
}

export default {
  id: 'villa',
  label: '别墅',
  views: [
    { key: 'overview', label: '全景', position: [22, 14, 22], target: [0, 3, -3] },
    { key: 'front', label: '剖面', position: [0, 4, 22], target: [0, 3, -2] },
    { key: 'top', label: '俯视', position: [0, 28, 2], target: [0, 2, -2] }
  ],
  build(group) {
    const mats = createMaterials()

    // ===== 外部地形 =====
    const grass = box(46, 0.3, 36, mats.grass, { castShadow: false })
    grass.position.set(0, -0.15, 0)
    group.add(grass)

    const driveway = box(6, 0.05, 11, mats.driveway)
    driveway.position.set(0, 0.03, 9.5)
    group.add(driveway)

    const foundation = box(22, 0.5, 16, mats.stone)
    foundation.position.set(0, 0.25, -2)
    group.add(foundation)

    // ===== 一层空壳（剖面切口在 +z 侧，开放）=====
    // 地板（深木色）
    const floor1 = box(20, 0.2, 13, mats.floorWood)
    floor1.position.set(0, 0.6, -2)
    group.add(floor1)
    // 后墙（z=-8.5，厚 0.3）
    const backWall = box(20, 4.5, 0.3, mats.wall)
    backWall.position.set(0, 2.75, -8.35)
    group.add(backWall)
    // 左墙（x=-10）
    const leftWall = box(0.3, 4.5, 13, mats.wall)
    leftWall.position.set(-9.85, 2.75, -2)
    group.add(leftWall)
    // 右墙（x=+10）
    const rightWall = box(0.3, 4.5, 13, mats.wall)
    rightWall.position.set(9.85, 2.75, -2)
    group.add(rightWall)
    // 顶板/二层楼板（y 5.0~5.3，跨整个 20×13；一层挑空大厅的天花兼二层地板）
    const slab1 = box(20, 0.3, 13, mats.floorWood)
    slab1.position.set(0, 5.15, -2)
    group.add(slab1)
    // 内部隔墙（x=0，分客厅/餐厨，不到顶以与挑空视觉连通）
    const innerWall = box(0.15, 4.0, 13, mats.wall)
    innerWall.position.set(0, 2.7, -2)
    group.add(innerWall)

    // ===== 二层空壳（x -10~0, z -6.5~2.5；切掉 +z 和 +x 开放）=====
    const backWall2 = box(10, 2.8, 0.3, mats.wall)
    backWall2.position.set(-5, 6.4, -6.35)
    group.add(backWall2)
    const leftWall2 = box(0.3, 2.8, 9, mats.wall)
    leftWall2.position.set(-9.85, 6.4, -2)
    group.add(leftWall2)
    const slab2 = box(10, 0.3, 9, mats.floorWood)
    slab2.position.set(-5, 7.65, -2)
    group.add(slab2)
    // 二层屋顶
    const roof2 = box(10.8, 0.4, 9.8, mats.roof)
    roof2.position.set(-5, 8.0, -2)
    group.add(roof2)
    // 一层檐口（y 5.2~5.6 跨整个，呼应原 roof1）
    const cornice = box(20.8, 0.4, 13.8, mats.wallAccent)
    cornice.position.set(0, 5.4, -2)
    group.add(cornice)

    // ===== 一层侧面窗户（左/右墙各两扇）=====
    ;[-1, 1].forEach((side) => {
      ;[-1.5, 1.5].forEach((wz) => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 2.2), mats.glass)
        glass.position.set(side * 10.04, 2.3, wz)
        group.add(glass)
      })
    })

    // ===== 楼梯（餐厨区靠左墙，10 级台阶从一层上到二层楼板）=====
    const stairW = 1.0
    const stairD = 0.4
    const stairH = 0.43
    const stairX = -9.0
    const stairZ0 = -2.0
    for (let i = 0; i < 10; i++) {
      const step = box(stairW, stairH, stairD, mats.stair)
      step.position.set(stairX, 0.7 + stairH / 2 + i * stairH, stairZ0 + stairD / 2 + i * stairD)
      step.castShadow = true
      step.receiveShadow = true
      group.add(step)
    }
    // 楼梯顶部小平台（接二层楼板）
    const stairLanding = box(stairW + 0.1, 0.05, 0.6, mats.stair)
    stairLanding.position.set(stairX, 5.18, -2 - 0.4 * 2)
    group.add(stairLanding)

    // ===== 一层·客厅（x 0~10）=====
    // 沙发（直排 3 人位，靠后墙）
    const sofaBody = box(2.6, 0.45, 0.95, mats.sofa)
    sofaBody.position.set(4, 0.925, -7.4)
    group.add(sofaBody)
    const sofaBack = box(2.6, 0.6, 0.2, mats.cushion)
    sofaBack.position.set(4, 1.4, -7.9)
    group.add(sofaBack)
    ;[-1.35, 1.35].forEach((lx) => {
      const arm = box(0.15, 0.55, 0.95, mats.cushion)
      arm.position.set(4 + lx, 0.975, -7.4)
      group.add(arm)
    })
    // 茶几（桌板 + 四腿）
    const teaTop = box(1.3, 0.06, 0.7, mats.tableTop)
    teaTop.position.set(4, 0.735, -6.0)
    group.add(teaTop)
    ;[
      [-0.55, -0.25],
      [0.55, -0.25],
      [-0.55, 0.25],
      [0.55, 0.25]
    ].forEach(([lx, lz]) => {
      const leg = box(0.05, 0.66, 0.05, mats.tableTop)
      leg.position.set(4 + lx, 0.37, -6.0 + lz)
      group.add(leg)
    })
    // 地毯
    const carpet = box(2.6, 0.02, 1.8, mats.carpet)
    carpet.position.set(4, 0.71, -6.2)
    group.add(carpet)
    // 电视柜（沿右墙）
    const tvCabinet = box(1.6, 0.5, 0.45, mats.tableTop)
    tvCabinet.position.set(9.0, 0.95, -3.5)
    group.add(tvCabinet)
    // 电视屏幕（薄板挂在右墙上，朝 -x）
    const tv = box(0.03, 0.9, 1.5, mats.tvScreen)
    tv.position.set(9.62, 1.8, -3.5)
    group.add(tv)

    // ===== 一层·餐厨（x -10~0）=====
    // 厨房橱柜（沿后墙一排）
    const cabinetRow = box(6.5, 0.9, 0.6, mats.island)
    cabinetRow.position.set(-3.75, 1.15, -8.0)
    group.add(cabinetRow)
    // 灶台（黑色面板嵌在橱柜上）
    const cooktop = box(1.4, 0.04, 0.5, mats.stove)
    cooktop.position.set(-3, 1.6, -8.0)
    group.add(cooktop)
    // 冰箱（高柜，靠左墙）
    const fridge = box(0.8, 2.0, 0.7, mats.fridge)
    fridge.position.set(-9.4, 1.7, -8.0)
    group.add(fridge)
    // 厨房中岛（岛台）
    const island = box(3.0, 0.9, 1.0, mats.island)
    island.position.set(-4, 1.15, -5.5)
    group.add(island)
    // 餐桌（桌板 + 四腿）
    const diningTop = box(1.8, 0.06, 1.0, mats.tableTop)
    diningTop.position.set(-4, 0.73, -2.5)
    group.add(diningTop)
    ;[
      [-0.8, -0.4],
      [0.8, -0.4],
      [-0.8, 0.4],
      [0.8, 0.4]
    ].forEach(([lx, lz]) => {
      const leg = box(0.06, 0.66, 0.06, mats.tableTop)
      leg.position.set(-4 + lx, 0.37, -2.5 + lz)
      group.add(leg)
    })
    // 餐椅 4 把
    ;[
      [-1.1, 0],
      [1.1, 0],
      [0, -0.8],
      [0, 0.8]
    ].forEach(([lx, lz]) => {
      const chair = box(0.4, 0.45, 0.4, mats.sofa)
      chair.position.set(-4 + lx, 0.925, -2.5 + lz)
      group.add(chair)
    })

    // ===== 二层·主卧 =====
    const bedFrame = box(2.0, 0.2, 1.8, mats.bed)
    bedFrame.position.set(-5, 5.6, -4)
    group.add(bedFrame)
    const mattress = box(1.9, 0.18, 1.7, mats.mattress)
    mattress.position.set(-5, 5.79, -4)
    group.add(mattress)
    // 床头板（高，靠后墙）
    const headboard = box(2.0, 0.8, 0.1, mats.bed)
    headboard.position.set(-5, 6.4, -4.85)
    group.add(headboard)
    // 床头柜 ×2
    ;[-1.2, 1.2].forEach((lx) => {
      const ns = box(0.45, 0.4, 0.45, mats.bed)
      ns.position.set(-5 + lx, 5.7, -4.5)
      group.add(ns)
    })
    // 衣柜（靠左墙）
    const wardrobe = box(0.55, 2.2, 2.2, mats.wardrobe)
    wardrobe.position.set(-9.6, 6.7, -2.0)
    group.add(wardrobe)

    // ===== 车库（保留在右侧，独立体块不进剖面）=====
    const garage = box(7, 3.2, 8, mats.wallAccent)
    garage.position.set(11, 2.1, -2)
    group.add(garage)
    const garageRoof = box(7.6, 0.4, 8.6, mats.roof)
    garageRoof.position.set(11, 3.7, -2)
    group.add(garageRoof)
    const garageDoor = box(4.6, 2.6, 0.08, mats.garage)
    garageDoor.position.set(11, 1.8, 1.96)
    group.add(garageDoor)

    // ===== 后院泳池 =====
    const poolEdge = box(13, 0.12, 7, mats.stone)
    poolEdge.position.set(0, 0.06, -11)
    group.add(poolEdge)
    const poolFloor = box(12, 0.12, 6, mats.poolFloor, { castShadow: false })
    poolFloor.position.set(0, 0.1, -11)
    group.add(poolFloor)
    const pool = box(12, 0.3, 6, mats.pool)
    pool.position.set(0, 0.28, -11)
    group.add(pool)

    // ===== 棕榈树 / 普通树 / 灌木 =====
    addPalm(group, mats, 14, -13, 6)
    addPalm(group, mats, -14, -15, 7)
    addPalm(group, mats, 17, 3, 5.5)
    addPalm(group, mats, -16, 6, 6)
    addPalm(group, mats, 8, 14, 5)
    addTree(group, mats, -19, 14, 1.1)
    addTree(group, mats, 19, -15, 1.2)
    addTree(group, mats, -19, -15, 1)
    addTree(group, mats, 19, 14, 1.1)
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
