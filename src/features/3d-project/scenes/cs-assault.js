// CS 经典 cs_assault 地图简化版：院子 + APC + 天桥门廊 + 两层公寓（楼梯/走廊/卧室/客厅/厨房/储物/阳台）+ 工厂（机房+外置楼梯+二层观察台）+ 2 名人质。
// 玩家从院子出生，过天桥进公寓，上二楼或工厂楼层，靠近任意人质按 F 救援。
import * as THREE from 'three'
import { box } from '../framework.js'

// 简写：放置方块 + 注册碰撞（默认开启）。opts.collision=false 关闭。
function place(group, ctx, w, h, d, mat, x, y, z, opts = {}) {
  const mesh = box(w, h, d, mat, opts)
  mesh.position.set(x, y, z)
  group.add(mesh)
  if (opts.collision !== false) ctx.registerColliderFromMesh(mesh)
  return mesh
}

// 简写：放置方块但 *不* 注册碰撞（用于装饰、家具、栏杆、灯具、地板、过梁装饰）。
function deco(group, w, h, d, mat, x, y, z, opts = {}) {
  const mesh = box(w, h, d, mat, { castShadow: opts.castShadow ?? true, receiveShadow: opts.receiveShadow ?? true })
  mesh.position.set(x, y, z)
  group.add(mesh)
  return mesh
}

function createMaterials() {
  const std = (color, roughness = 0.9, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return {
    // 地面
    ground: std(0x6b6b66, 0.95),
    woodFloor: std(0x8a6a44, 0.85),
    woodFloor2: std(0x9c7e58, 0.85),
    // 墙
    outerWall: std(0xdac9ad, 0.92),
    innerWall: std(0xe6dcc4, 0.92),
    innerWallDark: std(0xbfb094, 0.92),
    // 屋顶
    roof: std(0x8a3a2a, 0.85),
    roofTile: std(0xa64a2a, 0.8),
    // 木
    wood: std(0x8a6f4d, 0.8),
    woodDark: std(0x6b4a2f, 0.8),
    woodLight: std(0xc6a878, 0.8),
    // 金属
    metal: std(0x6c6c6c, 0.5, 0.5),
    metalDark: std(0x404040, 0.5, 0.6),
    // 玻璃窗
    glass: new THREE.MeshStandardMaterial({
      color: 0x9ec8e0,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55
    }),
    // 门
    door: std(0x6b4a2f, 0.7),
    doorFrame: std(0x4a3a2a, 0.7),
    // 人质
    hostageSkin: std(0xe8d4b8, 0.9),
    hostageCloth: std(0xf2f0e8, 0.9),
    hostageVest: std(0xb8a888, 0.9),
    // 装甲车
    truckBody: std(0x3a4a3a, 0.6, 0.3),
    truckMetal: std(0x4a4a4a, 0.5, 0.5),
    tire: std(0x1a1a1a, 0.9),
    apcAccent: std(0x556b2f, 0.5, 0.3),
    // 家具
    couch: std(0x4a5c7a, 0.95),
    couchCushion: std(0x5e7aa0, 0.95),
    tableTop: std(0xa17850, 0.7),
    cabinet: std(0xc5c5c5, 0.7),
    kitchenCounter: std(0xb8b8b0, 0.7),
    kitchenAccent: std(0x2a2a2a, 0.4, 0.3),
    appliance: std(0xdcdcdc, 0.5, 0.3),
    bed: std(0xd8c8b0, 0.9),
    bedSheet: std(0xeae0d0, 0.9),
    pillow: std(0xf2ede0, 0.95),
    tv: std(0x141414, 0.4),
    book: std(0x6b3a2f, 0.7),
    // 工厂
    server: std(0x1a2530, 0.5, 0.2),
    serverLight: std(0x44ee66, 0.4, 0.2),
    // 路灯 / 信号
    pole: std(0x222222, 0.6, 0.3),
    signal: std(0xc8b878, 0.8, 0.3),
    // 沙袋
    sandbag: std(0xb89c6c, 0.95),
    // 涂鸦 / 广告
    ad: std(0x3a4a8a, 0.7),
    adRed: std(0xa33c3c, 0.7),
    // 栏杆
    rail: std(0xa89882, 0.6, 0.4)
  }
}

// 生成一名坐下的人质（带椅子）。返回 Group，可被 visible=false 隐藏。
function createHostage(skinMat, clothMat, vestMat) {
  const g = new THREE.Group()
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), skinMat)
  head.position.set(0, 1.1, 0)
  g.add(head)
  const body = box(0.5, 0.55, 0.28, vestMat, { castShadow: true, receiveShadow: true })
  body.position.set(0, 0.72, 0)
  g.add(body)
  const armL = box(0.16, 0.5, 0.16, clothMat, { castShadow: true, receiveShadow: true })
  armL.position.set(-0.35, 0.72, 0)
  g.add(armL)
  const armR = box(0.16, 0.5, 0.16, clothMat, { castShadow: true, receiveShadow: true })
  armR.position.set(0.35, 0.72, 0)
  g.add(armR)
  // 被绑的双手（前方）
  const hands = box(0.36, 0.1, 0.18, vestMat, { castShadow: true, receiveShadow: true })
  hands.position.set(0, 0.6, 0.18)
  g.add(hands)
  const legs = box(0.5, 0.4, 0.55, clothMat, { castShadow: true, receiveShadow: true })
  legs.position.set(0, 0.4, 0.35)
  g.add(legs)
  const footL = box(0.18, 0.18, 0.4, clothMat, { castShadow: true, receiveShadow: true })
  footL.position.set(-0.12, 0.14, 0.55)
  g.add(footL)
  const footR = box(0.18, 0.18, 0.4, clothMat, { castShadow: true, receiveShadow: true })
  footR.position.set(0.12, 0.14, 0.55)
  g.add(footR)
  // 椅子（简单 box 组合）
  const chairSeat = box(0.55, 0.06, 0.55, new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.8 }), { castShadow: true, receiveShadow: true })
  chairSeat.position.set(0, 0.55, 0.2)
  g.add(chairSeat)
  const chairBack = box(0.55, 0.55, 0.06, new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 0.8 }), { castShadow: true, receiveShadow: true })
  chairBack.position.set(0, 0.83, -0.05)
  g.add(chairBack)
  return g
}

export default {
  id: 'cs-assault',
  label: '人质救援',
  controlsType: 'fps',
  spawn: { position: [0, 1.7, 15], look: [0, 1.7, -2] },
  views: [],
  build(group, ctx) {
    const m = createMaterials()
    // 玩家出生位置：院子后部中央
    // 院子 z 范围 [3,17], x [-13,13]

    // ========== 院子 ==========
    // 院子水泥地
    place(group, ctx, 26, 0.2, 14, m.ground, 0, 0.1, 10, { castShadow: false })
    // 院子围墙（背面 z=17）
    place(group, ctx, 26, 5, 0.3, m.outerWall, 0, 2.5, 16.85)
    // 左右围墙（院子）
    place(group, ctx, 0.3, 5, 14, m.outerWall, -12.85, 2.5, 10)
    place(group, ctx, 0.3, 5, 14, m.outerWall, 12.85, 2.5, 10)

    // 背面广告牌 + 涂鸦
    const adBoard = box(6, 1.6, 0.1, m.ad, { castShadow: false, receiveShadow: true })
    adBoard.position.set(-7, 3.8, 16.7)
    group.add(adBoard)
    const adBoard2 = box(6, 1.6, 0.1, m.adRed, { castShadow: false, receiveShadow: true })
    adBoard2.position.set(7, 3.8, 16.7)
    group.add(adBoard2)

    // 信号塔（院子左前）
    const towerLeg1 = box(0.18, 12, 0.18, m.pole, { castShadow: true, receiveShadow: true })
    towerLeg1.position.set(-11, 6, 4.5)
    group.add(towerLeg1)
    const towerLeg2 = box(0.18, 12, 0.18, m.pole, { castShadow: true, receiveShadow: true })
    towerLeg2.position.set(-10.3, 6, 5)
    group.add(towerLeg2)
    const towerLeg3 = box(0.18, 12, 0.18, m.pole, { castShadow: true, receiveShadow: true })
    towerLeg3.position.set(-10.4, 6, 4)
    group.add(towerLeg3)
    // 信号塔天线
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), m.metalDark)
    ant.position.set(-10.5, 12.5, 4.5)
    group.add(ant)
    const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), m.signal)
    antTip.position.set(-10.5, 13.8, 4.5)
    group.add(antTip)
    // 信号塔底部小房
    place(group, ctx, 1.6, 1.4, 1.6, m.metalDark, -10.5, 0.7, 4.5, { collision: true })

    // 路灯 1（信号塔侧）
    const lamp1Pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8), m.pole)
    lamp1Pole.position.set(-6.5, 2.25, 13.5)
    group.add(lamp1Pole)
    const lamp1Head = box(0.35, 0.18, 0.35, m.metalDark, { castShadow: true, receiveShadow: true })
    lamp1Head.position.set(-6.5, 4.45, 13.5)
    group.add(lamp1Head)
    const lamp1Glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({
      color: 0xfff2c8,
      emissive: 0xfff2c8,
      emissiveIntensity: 2.0
    }))
    lamp1Glow.position.set(-6.5, 4.38, 13.5)
    group.add(lamp1Glow)

    // 路灯 2（右后）
    const lamp2Pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8), m.pole)
    lamp2Pole.position.set(7, 2.25, 12.5)
    group.add(lamp2Pole)
    const lamp2Head = box(0.35, 0.18, 0.35, m.metalDark, { castShadow: true, receiveShadow: true })
    lamp2Head.position.set(7, 4.45, 12.5)
    group.add(lamp2Head)
    const lamp2Glow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), new THREE.MeshStandardMaterial({
      color: 0xfff2c8,
      emissive: 0xfff2c8,
      emissiveIntensity: 2.0
    }))
    lamp2Glow.position.set(7, 4.38, 12.5)
    group.add(lamp2Glow)

    // 沙袋掩体（院子入口前）
    ;[[0, 6], [-2, 6], [2, 6], [-4, 14], [4, 14]].forEach(([sx, sz]) => {
      const sandbag = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.85, 12), m.sandbag)
      sandbag.position.set(sx, 0.42, sz)
      sandbag.rotation.x = Math.PI / 2
      sandbag.rotation.z = Math.PI / 7
      group.add(sandbag)
      ctx.registerColliderFromMesh(sandbag)
    })

    // 报纸箱（院子左侧）
    const newsBox = box(1.4, 0.5, 0.6, m.metalDark)
    newsBox.position.set(-7, 0.25, 11.5)
    group.add(newsBox)
    ctx.registerColliderFromMesh(newsBox)
    const newsGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), m.glass)
    newsGlass.position.set(-6.3, 0.5, 11.5)
    newsGlass.rotation.y = Math.PI / 2
    group.add(newsGlass)
    // 报纸箱里塞一团纸
    const paperRoll = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.4), m.book)
    paperRoll.position.set(-6.6, 0.55, 11.5)
    group.add(paperRoll)

    // ========== 天桥门廊 (z 1..4, x -2..2) ==========
    const skyFloor = box(5, 0.15, 3.2, m.woodFloor2)
    skyFloor.position.set(0, 0.08, 2.5)
    group.add(skyFloor)
    const skyRoof = box(5.2, 0.1, 3.5, m.roof)
    skyRoof.position.set(0, 3.2, 2.5)
    group.add(skyRoof)
    // 天桥支柱（前+后）
    ;[-1.5, 1.5].forEach((tx) => {
      ;[0.9, 4.1].forEach((tz) => {
        const pillar = box(0.18, 3.2, 0.18, m.wood, { castShadow: true, receiveShadow: true })
        pillar.position.set(tx, 1.6, tz)
        group.add(pillar)
      })
    })
    // 天桥侧墙（防止掉下去）
    place(group, ctx, 0.12, 1.0, 3.5, m.outerWall, -2.55, 0.6, 2.5, { collision: true })
    place(group, ctx, 0.12, 1.0, 3.5, m.outerWall, 2.55, 0.6, 2.5, { collision: true })
    // 天桥两端开口
    // 入口端 z=4 连接到院子
    const enterSign = box(0.6, 0.4, 0.05, m.apcAccent, { castShadow: false, receiveShadow: true })
    enterSign.position.set(0, 2.9, 4.15)
    group.add(enterSign)

    // ========== 公寓主楼 (x -10..10, z -9..1, 一二层 4/4) ==========
    // 一层地板
    deco(group, 20, 0.2, 10.1, m.woodFloor, 0, 0.1, -4)
    // 二层楼板
    deco(group, 20, 0.3, 10.1, m.woodFloor2, 0, 4.15, -4)
    // 屋顶（带红色瓦片感）
    deco(group, 20.4, 0.3, 10.4, m.roof, 0, 8.15, -4)
    // 屋顶瓦片条
    for (let i = -4; i <= 4; i++) {
      deco(group, 20, 0.08, 0.9, m.roofTile, 0, 8.4, -4 + i, { castShadow: false })
    }

    // 外墙 - 后 z=-9
    place(group, ctx, 20, 8, 0.3, m.outerWall, 0, 4, -9.15)
    // 外墙 - 左 x=-10
    place(group, ctx, 0.3, 8, 10, m.outerWall, -10.15, 4, -4)
    // 外墙 - 右 x=10
    place(group, ctx, 0.3, 8, 10, m.outerWall, 10.15, 4, -4)
    // 外墙 - 前 z=1（分段留门洞）

    // 一层前墙：左右两段 + 门上过梁
    place(group, ctx, 9.0, 4, 0.3, m.outerWall, -5.5, 2, 0.85) // 左段 x [-10,-1]
    place(group, ctx, 9.0, 4, 0.3, m.outerWall, 5.5, 2, 0.85) // 右段 x [1, 10]
    // 正门上过梁
    place(group, ctx, 2.0, 1.6, 0.3, m.outerWall, 0, 3.2, 0.85)
    // 正门门框
    deco(group, 0.12, 2.4, 0.08, m.doorFrame, -1.04, 1.2, 0.96)
    deco(group, 0.12, 2.4, 0.08, m.doorFrame, 1.04, 1.2, 0.96)
    // 双扇门（关闭）
    deco(group, 0.06, 2.3, 1.0, m.door, -0.54, 1.25, 0.96)
    deco(group, 0.06, 2.3, 1.0, m.door, 0.54, 1.25, 0.96)
    // 门把手
    const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m.metal)
    h1.position.set(-0.4, 1.1, 1.04)
    group.add(h1)
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), m.metal)
    h2.position.set(0.4, 1.1, 1.04)
    group.add(h2)

    // 二层前墙：左右两段 + 阳台门过梁
    place(group, ctx, 7.5, 4, 0.3, m.outerWall, -6.25, 6, 0.85) // 左段 x [-10, -2.5]
    place(group, ctx, 7.5, 4, 0.3, m.outerWall, 6.25, 6, 0.85) // 右段 x [2.5, 10]
    // 阳台门过梁
    place(group, ctx, 5.0, 1.3, 0.3, m.outerWall, 0, 7.35, 0.85)
    // 阳台门（双扇玻璃）
    deco(group, 0.06, 2.4, 1.2, m.doorFrame, -1.25, 5.8, 0.96)
    deco(group, 0.06, 2.4, 1.2, m.glass, -0.55, 5.8, 0.96)
    deco(group, 0.06, 2.4, 1.2, m.glass, 0.55, 5.8, 0.96)
    deco(group, 0.06, 2.4, 1.2, m.doorFrame, 1.25, 5.8, 0.96)

    // 一层窗
    ;[-8.5, 8.5].forEach((wx) => {
      deco(group, 1.4, 1.4, 0.08, m.glass, wx, 2.0, 0.96)
    })
    deco(group, 1.4, 1.4, 0.08, m.glass, -2.5, 2.0, 0.96) // 左
    deco(group, 1.4, 1.4, 0.08, m.glass, 2.5, 2.0, 0.96) // 右

    // 二层窗（不含阳台区域）
    ;[-8, 8].forEach((wx) => {
      deco(group, 1.3, 1.4, 0.08, m.glass, wx, 5.8, 0.96)
    })
    deco(group, 1.3, 1.4, 0.08, m.glass, -3.5, 5.8, 0.96)
    deco(group, 1.3, 1.4, 0.08, m.glass, 3.5, 5.8, 0.96)

    // 侧墙窗（一层 + 二层）
    for (let yLevel = 0; yLevel < 2; yLevel++) {
      const yc = yLevel === 0 ? 2.0 : 6.0
      ;[-9, -6, -3, 3, 6, 9].forEach((sx) => {
        deco(group, 0.08, 1.4, 1.2, m.glass, -10.1, yc, sx)
        deco(group, 0.08, 1.4, 1.2, m.glass, 10.1, yc, sx)
      })
    }

    // ========== 一层内部墙体 ==========
    // 中央客厅-储隔墙（x=-3 分中央客厅和左侧储物间）
    place(group, ctx, 0.2, 3.8, 6, m.innerWall, -3, 2, -3)
    // 中央客厅-厨房隔墙（x=4 分中央客厅和右侧厨房）
    place(group, ctx, 0.2, 3.8, 6, m.innerWall, 4, 2, -3)
    // 前墙前厅分割墙（z=-2）
    place(group, ctx, 6, 3.8, 0.2, m.innerWall, 0, 2, -2)

    // ========== 二层内部墙 ==========
    // 走廊后墙 z=-5.5
    place(group, ctx, 4, 3.7, 0.2, m.innerWallDark, 0, 6.15, -5.6)
    // 左卧室门右侧墙 x=-3（走廊门洞 z=-3..-1，墙外侧 z=-6..-3）
    place(group, ctx, 0.2, 3.7, 2.4, m.innerWallDark, -3, 6.15, -4.6)
    // 右卧室门左侧墙 x=3
    place(group, ctx, 0.2, 3.7, 2.4, m.innerWallDark, 3, 6.15, -4.6)
    // 左卧室后墙 z=-8.4
    place(group, ctx, 6.6, 3.7, 0.2, m.innerWallDark, -6.7, 6.15, -8.4)
    // 左卧室外墙 x=-9.7
    // (主楼左墙 x=-10 已有，内部略缩 0.5)
    place(group, ctx, 0.2, 3.7, 1.6, m.innerWallDark, -6.7, 6.15, -7.1)
    // 右卧室镜子左墙
    place(group, ctx, 0.2, 3.7, 1.6, m.innerWallDark, 6.7, 6.15, -7.1)
    // 右卧室后墙
    place(group, ctx, 6.6, 3.7, 0.2, m.innerWallDark, 6.7, 6.15, -8.4)
    // 走廊前墙 z=-1（截到前墙）
    place(group, ctx, 6, 3.7, 0.2, m.innerWallDark, 0, 6.15, -1.1)
    // 卧室内小隔断（卫生间）
    place(group, ctx, 0.2, 3.7, 2.4, m.innerWallDark, -1, 6.15, -7.2)
    place(group, ctx, 2.2, 3.7, 0.2, m.innerWallDark, 0, 6.15, -6.2)

    // ========== 楼梯 (一楼 z=-2.4..2.4, x=-6, 通到 y=4.0 二层楼板) ==========
    const stairW = 1.4
    const stairD = 0.45
    const stairH = 0.4
    const stairX = -6
    const stairZ0 = -2.4
    for (let i = 0; i < 10; i++) {
      const step = box(stairW, stairH, stairD, m.wood, { castShadow: true, receiveShadow: true })
      step.position.set(stairX, 0.2 + (i + 0.5) * stairH, stairZ0 + (i + 0.5) * stairD)
      group.add(step)
      ctx.registerColliderFromMesh(step)
    }
    // 二层楼梯顶部平台
    const stairLanding = box(1.6, 0.1, 0.6, m.woodFloor)
    stairLanding.position.set(stairX, 4.25, stairZ0 + 10 * stairD + 0.3)
    group.add(stairLanding)
    // 楼梯外侧扶手
    place(group, ctx, 0.06, 1.0, 5.4, m.metal, stairX - stairW / 2 - 0.05, 2.5, stairZ0 + 2.7)
    place(group, ctx, 0.06, 1.0, 5.4, m.metal, stairX + stairW / 2 + 0.05, 2.5, stairZ0 + 2.7)

    // ========== 一层家具 ==========
    // 客厅：3 人位沙发
    const couchSeat = box(2.4, 0.4, 0.85, m.couch)
    couchSeat.position.set(0, 0.4, -3.5)
    group.add(couchSeat)
    const couchBack = box(2.4, 0.6, 0.18, m.couch)
    couchBack.position.set(0, 0.85, -3.85)
    group.add(couchBack)
    ;[-1.0, 1.0].forEach((mx) => {
      const arm = box(0.25, 0.6, 0.85, m.couchCushion)
      arm.position.set(mx, 0.7, -3.5)
      group.add(arm)
      ctx.registerColliderFromMesh(arm)
    })
    ctx.registerColliderFromMesh(couchSeat)
    ctx.registerColliderFromMesh(couchBack)

    // 茶几
    place(group, ctx, 1.4, 0.08, 0.7, m.tableTop, 0, 0.55, -2.5)
    // 茶几腿
    ;[[-0.6, -0.25], [0.6, -0.25], [-0.6, 0.25], [0.6, 0.25]].forEach(([lx, lz]) => {
      const leg = box(0.06, 0.5, 0.06, m.woodDark)
      leg.position.set(0 + lx, 0.27, -2.5 + lz)
      group.add(leg)
    })

    // 地毯
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.0), new THREE.MeshStandardMaterial({ color: 0x8a6f4d, roughness: 1 }))
    carpet.rotation.x = -Math.PI / 2
    carpet.position.set(0, 0.21, -2.8)
    carpet.receiveShadow = true
    group.add(carpet)

    // 电视柜（沿右墙 x=4）
    deco(group, 1.6, 0.7, 0.5, m.wood, 4, 0.4, -8)
    const tv = box(1.1, 0.65, 0.05, m.tv)
    tv.position.set(4, 1.3, -8)
    group.add(tv)

    // 厨房：橱柜 + 中岛 + 餐桌 4椅
    // 后墙橱柜 x=2..9, z=-8
    place(group, ctx, 7.0, 1.0, 0.6, m.kitchenCounter, 5.5, 0.55, -8.5)
    deco(group, 0.6, 1.0, 0.05, m.kitchenAccent, 2.5, 0.55, -8.18) // 灶台
    deco(group, 0.6, 1.4, 0.05, m.cabinet, 3.8, 0.7, -8.18) // 吊柜
    // 冰箱
    place(group, ctx, 0.8, 2.0, 0.8, m.appliance, 9, 1.05, -8.5)
    // 餐桌
    place(group, ctx, 1.6, 0.06, 0.9, m.tableTop, 6, 0.78, -6.5)
    ;[[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]].forEach(([lx, lz]) => {
      const dleg = box(0.06, 0.72, 0.06, m.woodDark)
      dleg.position.set(6 + lx, 0.39, -6.5 + lz)
      group.add(dleg)
    })
    // 4 把餐椅
    ;[[-1.0, -6.5], [1.0, -6.5], [-1.0, -5.5], [1.0, -5.5]].forEach(([cx, cz]) => {
      const chair = new THREE.Group()
      const seat = box(0.4, 0.06, 0.4, m.woodDark)
      seat.position.set(0, 0.45, 0)
      chair.add(seat)
      const back = box(0.4, 0.5, 0.05, m.woodDark)
      back.position.set(0, 0.73, -0.18)
      chair.add(back)
      chair.position.set(cx, 0, cz)
      chair.rotation.y = cz < -6.5 + 0.1 ? 0 : Math.PI
      chair.position.set(cx, 0, cz)
      chair.lookAt(6, 0.45, -6.5)
      group.add(chair)
    })

    // 储物间（左前 x=-8..-3, z=-1..-6.5）
    // 木箱堆
    place(group, ctx, 1.2, 1.0, 1.2, m.wood, -8, 0.7, -5)
    place(group, ctx, 1.2, 1.0, 1.2, m.wood, -8, 1.7, -5)
    place(group, ctx, 1.0, 0.8, 1.0, m.woodLight, -6.5, 0.6, -5)
    place(group, ctx, 0.8, 0.8, 0.8, m.woodDark, -6.5, 1.2, -4)

    // 铁桶
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16), m.metal)
    barrel1.position.set(2, 0.7, -5)
    group.add(barrel1)
    ctx.registerColliderFromMesh(barrel1)
    const barrel2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.0, 16), m.metal)
    barrel2.position.set(2.5, 0.7, -5)
    group.add(barrel2)
    ctx.registerColliderFromMesh(barrel2)

    // 储物间铁架
    const shelfVert1 = box(0.05, 1.8, 0.05, m.metalDark, -7.5, 0.9, -1.4)
    group.add(shelfVert1)
    const shelfVert2 = box(0.05, 1.8, 0.05, m.metalDark, -7.5, 0.9, -1.0)
    group.add(shelfVert2)
    ctx.registerColliderFromMesh(shelfVert1)
    ctx.registerColliderFromMesh(shelfVert2)
    ;[0.6, 1.3].forEach((sy) => {
      const sh = box(0.04, 0.04, 0.8, m.metalDark, -7.5, sy, -1.2)
      group.add(sh)
    })

    // ========== 二层家具 ==========
    // 左卧室：大床 + 床头柜 + 衣柜
    place(group, ctx, 2.6, 0.45, 1.8, m.bedSheet, -6.7, 4.7, -7.5)
    deco(group, 2.7, 0.4, 1.9, m.bed, -6.7, 4.5, -7.5)
    deco(group, 2.6, 0.6, 0.18, m.bed, -6.7, 4.85, -8.3) // 床头板
    const pillowL = box(0.6, 0.18, 0.4, m.pillow, { castShadow: true, receiveShadow: true })
    pillowL.position.set(-7.4, 4.85, -8.05)
    group.add(pillowL)
    const pillowR = box(0.6, 0.18, 0.4, m.pillow, { castShadow: true, receiveShadow: true })
    pillowR.position.set(-6.0, 4.85, -8.05)
    group.add(pillowR)

    // 床头柜
    deco(group, 0.6, 0.55, 0.4, m.wood, -8.3, 4.7, -8)
    // 床头柜灯
    const bedsideLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.32, 12), new THREE.MeshStandardMaterial({ color: 0xfaf2c0, emissive: 0xfaf2c0, emissiveIntensity: 1.2 }))
    bedsideLamp.position.set(-8.3, 5.1, -8)
    group.add(bedsideLamp)

    // 左衣柜（沿外墙）
    place(group, ctx, 0.7, 2.6, 1.8, m.woodDark, -9.6, 5.4, -8.3)

    // 右卧室: 衣柜 + 单人床
    place(group, ctx, 2.0, 0.45, 1.3, m.bedSheet, 7, 4.7, -7.8)
    deco(group, 2.1, 0.4, 1.4, m.bed, 7, 4.5, -7.8)
    deco(group, 2.0, 0.5, 0.15, m.bed, 7, 4.8, -8.4)
    const pillowS = box(0.6, 0.16, 0.4, m.pillow, { castShadow: true, receiveShadow: true })
    pillowS.position.set(7, 4.82, -8.15)
    group.add(pillowS)

    // 右衣柜（沿外墙）
    place(group, ctx, 0.7, 2.6, 1.4, m.woodDark, 9.6, 5.4, -8.2)
    // 右卧书桌
    deco(group, 1.2, 0.05, 0.5, m.wood, 7, 4.95, -5.0)
    ;[[-0.55, -0.2], [0.55, -0.2], [-0.55, 0.2], [0.55, 0.2]].forEach(([lx, lz]) => {
      const leg = box(0.04, 0.9, 0.04, m.woodDark)
      leg.position.set(7 + lx, 4.45, -5.0 + lz)
      group.add(leg)
    })
    const desktopBook = box(0.18, 0.05, 0.25, m.book, { castShadow: true, receiveShadow: true })
    desktopBook.position.set(7, 5.0, -5.05)
    group.add(desktopBook)
    const desktopLamp2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.28, 12), new THREE.MeshStandardMaterial({ color: 0xfaf2c0, emissive: 0xfaf2c0, emissiveIntensity: 1.2 }))
    desktopLamp2.position.set(7.3, 5.06, -5.05)
    group.add(desktopLamp2)

    // 卫生间（中央 x=-1, z=-7）：马桶（简化）
    const toilet = box(0.45, 0.5, 0.6, m.appliance, -2.0, 5.0, -7.5)
    group.add(toilet)
    // 洗手台
    place(group, ctx, 0.6, 0.85, 0.45, m.appliance, -2, 4.5, -6.4)
    // 镜子
    deco(group, 0.5, 0.6, 0.04, m.glass, -2, 5.6, -6.0)
    // 浴缸
    place(group, ctx, 0.7, 0.55, 1.6, m.appliance, -0.6, 4.95, -7.6)

    // ========== 阳台 (x -3..3, z 1..4) ==========
    const balcony = box(6, 0.2, 3, m.woodFloor2)
    balcony.position.set(0, 4.2, 2.5)
    group.add(balcony)
    ctx.registerColliderFromMesh(balcony)
    // 栏杆横杆（top + mid）
    deco(group, 6, 0.06, 0.1, m.rail, 0, 5.0, 3.95)
    deco(group, 6, 0.04, 0.06, m.rail, 0, 4.55, 3.95)
    // 立柱
    for (let x = -2.7; x <= 2.7; x += 1.35) {
      deco(group, 0.08, 1.0, 0.08, m.rail, x, 4.55, 3.95)
    }
    // 阳台桌椅（一张小方桌 + 椅子）
    deco(group, 0.6, 0.05, 0.6, m.wood, 1.5, 4.55, 2.0)
    ;[[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([lx, lz]) => {
      const tleg = box(0.05, 0.3, 0.05, m.woodDark)
      tleg.position.set(1.5 + lx, 4.3, 2.0 + lz)
      group.add(tleg)
    })
    // 花盆
    ;[[-1.5, 2.5], [-2.2, 2.7], [2.4, 2.3]].forEach(([px, pz]) => {
      const pot = box(0.4, 0.3, 0.4, new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.9 }))
      pot.position.set(px, 4.35, pz)
      group.add(pot)
      const plant = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.9 }))
      plant.position.set(px, 4.65, pz)
      group.add(plant)
      ctx.registerColliderFromMesh(pot)
    })

    // ========== 工厂 (x -17..-10, z -9..1) ==========
    // 工厂外墙
    place(group, ctx, 7, 4, 0.3, m.outerWall, -13.5, 2, -9.15) // 后
    place(group, ctx, 7, 4, 0.3, m.outerWall, -13.5, 2, 0.85) // 前（分段留门）
    // 工厂左墙
    place(group, ctx, 0.3, 4, 10.0, m.outerWall, -16.85, 2, -4)
    // 工厂右墙（与公寓相接 -10.15 已存在）
    // 工厂前墙门洞：左右两段 + 过梁
    place(group, ctx, 3.0, 4, 0.3, m.outerWall, -15.0, 2, 0.85) // 左段
    place(group, ctx, 2.0, 4, 0.3, m.outerWall, -12.0, 2, 0.85) // 右段
    place(group, ctx, 2.0, 1.4, 0.3, m.outerWall, -13.5, 3.4, 0.85) // 过梁
    // 工厂前门
    deco(group, 1.8, 2.6, 0.05, m.door, -13.5, 1.4, 0.94)
    deco(group, 0.05, 2.7, 0.05, m.doorFrame, -12.6, 1.45, 0.95)
    deco(group, 0.05, 2.7, 0.05, m.doorFrame, -14.4, 1.45, 0.95)

    // 工厂地板
    deco(group, 7.0, 0.2, 10.1, m.woodFloor, -13.5, 0.1, -4)
    // 工厂窗户
    ;[-15.5, -11.5].forEach((wx) => {
      deco(group, 0.08, 1.2, 1.0, m.glass, wx, 2.5, -4)
    })
    deco(group, 1.2, 1.2, 0.08, m.glass, -13.5, 2.5, -9.05)
    deco(group, 1.2, 1.2, 0.08, m.glass, -13.5, 2.5, -9.0 + 2 * (Math.sin(1) > 0 ? -1 : 1))

    // 工厂内部 - 服务器机柜排（一层）
    for (let i = 0; i < 5; i++) {
      const rack = box(0.7, 1.8, 1.2, m.server, { castShadow: true, receiveShadow: true })
      rack.position.set(-15.3, 1.0, -8.5 + i * 1.6)
      group.add(rack)
      ctx.registerColliderFromMesh(rack)
      // 指示灯
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), m.serverLight)
      led.position.set(-14.95, 1.6, -8.5 + i * 1.6)
      group.add(led)
    }

    // 工厂内 - 工具桌 + 椅子
    place(group, ctx, 1.6, 0.05, 0.8, m.tableTop, -12.5, 0.85, -7.5)
    ;[[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]].forEach(([lx, lz]) => {
      const leg = box(0.05, 0.8, 0.05, m.woodDark)
      leg.position.set(-12.5 + lx, 0.4, -7.5 + lz)
      group.add(leg)
    })
    // 工具（桌上的扳手：简单长方体）
    deco(group, 0.4, 0.04, 0.08, m.metal, -12.5, 0.9, -7.7)

    // 工厂油桶
    place(group, ctx, 0.55, 0.9, 0.55, new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.7 }), -16.0, 0.65, -6)
    place(group, ctx, 0.55, 0.9, 0.55, new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.7 }), -16.0, 1.55, -6)

    // 工厂外置楼梯 (x=-15.5, 10 级到 y=4.0)
    const extStairW = 1.0
    const extStairD = 0.45
    const extStairH = 0.4
    for (let i = 0; i < 10; i++) {
      const estep = box(extStairW, extStairH, extStairD, m.wood, { castShadow: true, receiveShadow: true })
      estep.position.set(-15.5, 0.2 + (i + 0.5) * extStairH, 2.0 + (i + 0.5) * extStairD)
      group.add(estep)
      ctx.registerColliderFromMesh(estep)
    }
    // 楼梯平台（二层 y=4, x=-15.5, z=6.7）
    const extLanding = box(1.2, 0.15, 1.0, m.woodFloor2, { castShadow: true, receiveShadow: true })
    extLanding.position.set(-15.5, 4.0, 6.85)
    group.add(extLanding)
    ctx.registerColliderFromMesh(extLanding)
    // 楼梯扶手
    place(group, ctx, 0.06, 1.0, 5.0, m.metal, -16.0, 1.8, 4.6)
    place(group, ctx, 0.06, 1.0, 5.0, m.metal, -15.0, 1.8, 4.6)
    // 平台栏杆三面
    deco(group, 1.2, 0.9, 0.08, m.rail, -15.5, 4.6, 7.4)
    deco(group, 0.08, 0.9, 1.0, m.rail, -16.1, 4.6, 6.85)
    deco(group, 0.08, 0.9, 1.0, m.rail, -14.9, 4.6, 6.85)

    // 工厂二层观察台延伸到工厂内部 x=-13..-10, z=4..7
    const platform = box(4.0, 0.2, 3.0, m.woodFloor2, { castShadow: true, receiveShadow: true })
    platform.position.set(-13, 4.1, 5.0)
    group.add(platform)
    ctx.registerColliderFromMesh(platform)
    // 观察台下支柱（4 根）
    place(group, ctx, 0.18, 4.0, 0.18, m.metal, -15, 2.0, 4.0)
    place(group, ctx, 0.18, 4.0, 0.18, m.metal, -15, 2.0, 6.0)
    place(group, ctx, 0.18, 4.0, 0.18, m.metal, -11, 2.0, 4.0)
    place(group, ctx, 0.18, 4.0, 0.18, m.metal, -11, 2.0, 6.0)
    // 观察台栏杆
    deco(group, 4, 0.05, 0.08, m.rail, -13, 4.8, 6.55)
    deco(group, 0.08, 0.05, 3, m.rail, -11, 4.8, 5)
    deco(group, 0.08, 0.05, 3, m.rail, -15, 4.8, 5)
    deco(group, 4, 0.05, 0.08, m.rail, -13, 4.8, 3.45)

    // 工厂内楼梯 + 横桥：5 级陡梯上到 y=4.0，然后水平延伸到二层观察台
    const insStairW = 1.0
    const insStairD = 0.5
    const insStairH = 0.8
    for (let i = 0; i < 5; i++) {
      const istep = box(insStairW, insStairH, insStairD, m.wood, { castShadow: true, receiveShadow: true })
      istep.position.set(-11.3, 0.6 + i * insStairH, -1.5 + i * insStairD + insStairD / 2)
      group.add(istep)
      ctx.registerColliderFromMesh(istep)
    }
    // 横桥（从楼梯顶延伸到观察台起点 z=3.5）
    const istepBridge = box(1.0, 0.15, 3.0, m.woodFloor2, { castShadow: true, receiveShadow: true })
    istepBridge.position.set(-11.3, 4.075, 1.8)
    group.add(istepBridge)
    ctx.registerColliderFromMesh(istepBridge)
    // 横桥栏杆
    deco(group, 1.0, 0.06, 0.06, m.rail, -11.3, 4.7, 3.3)
    deco(group, 0.06, 0.6, 3.0, m.rail, -11.85, 4.4, 1.8)
    deco(group, 0.06, 0.6, 3.0, m.rail, -10.75, 4.4, 1.8)

    // ========== APC 装甲车 (院子右侧) ==========
    const apcBody = box(2.5, 1.5, 4.5, m.truckBody)
    apcBody.position.set(8, 1.0, 9)
    group.add(apcBody)
    ctx.registerColliderFromMesh(apcBody)
    // APC 车头灯
    deco(group, 0.5, 0.4, 0.05, new THREE.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xfff0c8, emissiveIntensity: 1.8 }), 8, 1.3, 6.78)
    // 4 个轮子
    ;[
      [-1.15, 0.5, 1.3],
      [1.15, 0.5, 1.3],
      [-1.15, 0.5, -1.3],
      [1.15, 0.5, -1.3]
    ].forEach(([dx, dy, dz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 18), m.tire)
      wheel.position.set(8 + dx, dy, 9 + dz)
      wheel.rotation.z = Math.PI / 2
      group.add(wheel)
      ctx.registerColliderFromMesh(wheel)
    })
    // 炮塔
    place(group, ctx, 1.6, 0.5, 1.8, m.truckBody, 8, 2.0, 8.8)
    // 炮塔小窗
    deco(group, 0.3, 0.06, 0.3, m.glass, 8, 2.3, 9.6)
    // 炮管
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.5, 12), m.truckMetal)
    gun.position.set(8, 2.05, 10.2)
    gun.rotation.x = Math.PI / 2
    group.add(gun)

    // ========== 人质 #1（二层走廊后部中央）==========
    const hostage1 = createHostage(m.hostageSkin, m.hostageCloth, m.hostageVest)
    hostage1.position.set(0, 0, -4.3)
    hostage1.rotation.y = 0
    group.add(hostage1)
    ctx.registerInteractive({
      position: new THREE.Vector3(0, 5.8, -4.3),
      radius: 1.8,
      prompt: '按 F 救援人质',
      onUse: () => {
        hostage1.visible = false
        ctx.setMessage('人质已救出！回合成功', 3500)
      }
    })

    // ========== 人质 #2（工厂二层观察台）==========
    const hostage2 = createHostage(m.hostageSkin, m.hostageCloth, m.hostageVest)
    hostage2.position.set(-13, 0, 5.5)
    hostage2.rotation.y = Math.PI / 2
    group.add(hostage2)
    ctx.registerInteractive({
      position: new THREE.Vector3(-13, 5.8, 5.5),
      radius: 1.8,
      prompt: '按 F 救援人质',
      onUse: () => {
        hostage2.visible = false
        ctx.setMessage('人质已救出！回合成功', 3500)
      }
    })
  }
}
