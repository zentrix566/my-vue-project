// 教室场景：黑板、讲台、课桌椅、窗户、门（无天花板，方便俯瞰内部）。
// 坐标约定：x 为教室前后（长 12，黑板在 x=-6 端），z 为左右（宽 9），y 为高度（0~3.5）。
import * as THREE from 'three'
import { box, makeTextTexture } from '../framework.js'

const ROOM = { length: 12, width: 9, height: 3.5, wall: 0.2 }

function createMaterials() {
  const std = (color, roughness = 0.9) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })

  return {
    floor: std(0xddceb2, 0.92),
    wall: std(0xf6f1e7, 0.95),
    boardFrame: std(0x8a6f4d, 0.6),
    podium: std(0xb98a5a, 0.75),
    deskTop: std(0xc99a62, 0.7),
    deskFrame: std(0x9c8a70, 0.7),
    chair: std(0x8d7a5e, 0.8),
    windowGlass: new THREE.MeshStandardMaterial({
      color: 0xbcd9ec,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85
    }),
    windowFrame: std(0xffffff, 0.6),
    door: std(0x7a5a3a, 0.7),
    chalk: std(0xffffff, 0.5)
  }
}

// 在 (x, z) 处摆一套课桌 + 椅子，学生面向 -x（黑板方向）
function addDeskAndChair(root, mats, x, z) {
  const desk = new THREE.Group()
  // 桌面：沿 z 宽（左右），沿 x 深（前后）
  const top = box(0.5, 0.04, 0.62, mats.deskTop)
  top.position.y = 0.72
  desk.add(top)
  const bin = box(0.4, 0.12, 0.52, mats.deskFrame)
  bin.position.y = 0.6
  desk.add(bin)
  ;[
    [0.21, 0.26],
    [0.21, -0.26],
    [-0.21, 0.26],
    [-0.21, -0.26]
  ].forEach(([lx, lz]) => {
    const leg = box(0.04, 0.72, 0.04, mats.deskFrame)
    leg.position.set(lx, 0.36, lz)
    desk.add(leg)
  })
  desk.position.set(x, 0, z)
  root.add(desk)

  const chair = new THREE.Group()
  const seat = box(0.36, 0.04, 0.36, mats.chair)
  seat.position.y = 0.44
  chair.add(seat)
  // 靠背在学生背后（+x 侧），沿 z 宽、沿 x 薄
  const backrest = box(0.04, 0.42, 0.36, mats.chair)
  backrest.position.set(0.2, 0.72, 0)
  chair.add(backrest)
  ;[
    [0.15, 0.15],
    [0.15, -0.15],
    [-0.15, 0.15],
    [-0.15, -0.15]
  ].forEach(([lx, lz]) => {
    const leg = box(0.03, 0.44, 0.03, mats.chair)
    leg.position.set(lx, 0.22, lz)
    chair.add(leg)
  })
  chair.position.set(x + 0.45, 0, z)
  root.add(chair)
}

export default {
  id: 'classroom',
  label: '教室',
  views: [
    { key: 'overview', label: '全景', position: [7.5, 6.5, 9.5], target: [0, 0.5, 0] },
    { key: 'podium', label: '讲台视角', position: [-5.2, 1.7, 0], target: [2.5, 0.9, 0] },
    { key: 'student', label: '学生视角', position: [1.2, 1.15, 0.2], target: [-6, 1.5, 0] }
  ],
  build(group) {
    const mats = createMaterials()

    // 地板
    const floor = box(ROOM.length, 0.2, ROOM.width, mats.floor, { castShadow: false })
    floor.position.set(0, -0.1, 0)
    group.add(floor)

    // 四面墙：垂直于 x 的墙沿 z 展开，垂直于 z 的墙沿 x 展开
    // 注意：教室不设天花板，方便从上方俯瞰内部；后墙留门洞（见下方门部分）。
    const front = box(ROOM.wall, ROOM.height, ROOM.width, mats.wall) // 前墙（黑板墙，x=-6）
    front.position.set(-ROOM.length / 2, ROOM.height / 2, 0)
    group.add(front)
    // 后墙（x=+6）分三段，留出门洞：门宽 1.2、高 2.2，中心 z=2.6
    const backLeft = box(ROOM.wall, ROOM.height, 6.5, mats.wall)
    backLeft.position.set(ROOM.length / 2, ROOM.height / 2, -1.25)
    group.add(backLeft)
    const backRight = box(ROOM.wall, ROOM.height, 1.3, mats.wall)
    backRight.position.set(ROOM.length / 2, ROOM.height / 2, 3.85)
    group.add(backRight)
    const backTop = box(ROOM.wall, ROOM.height - 2.2, 1.2, mats.wall)
    backTop.position.set(ROOM.length / 2, 2.2 + (ROOM.height - 2.2) / 2, 2.6)
    group.add(backTop)
    const left = box(ROOM.length, ROOM.height, ROOM.wall, mats.wall) // 左墙（z=-4.5）
    left.position.set(0, ROOM.height / 2, -ROOM.width / 2)
    group.add(left)
    const right = box(ROOM.length, ROOM.height, ROOM.wall, mats.wall) // 右墙（z=+4.5）
    right.position.set(0, ROOM.height / 2, ROOM.width / 2)
    group.add(right)

    // 黑板：挂前墙，面朝 +x，沿 z 宽、沿 x 薄
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 2.1, 5.6),
      new THREE.MeshStandardMaterial({
        map: makeTextTexture({ text: '欢迎来到 3D 教室', sub: 'Three.js · 可交互场景' }),
        roughness: 0.8
      })
    )
    board.position.set(-ROOM.length / 2 + 0.08, 1.65, 0)
    board.castShadow = true
    group.add(board)
    // 黑板下沿粉笔槽
    const tray = box(0.1, 0.06, 5.8, mats.boardFrame)
    tray.position.set(-ROOM.length / 2 + 0.1, 0.55, 0)
    group.add(tray)

    // 讲台：长边沿 z（平行黑板）
    const stage = box(1.4, 0.18, 2.4, mats.podium)
    stage.position.set(-4.6, 0.09, 0)
    group.add(stage)
    // 讲桌：桌面 + 桌身
    const desk = box(1.1, 0.06, 0.6, mats.deskTop)
    desk.position.set(-4.6, 0.18 + 0.42, 0)
    group.add(desk)
    const deskBody = box(0.9, 0.42, 0.5, mats.deskFrame)
    deskBody.position.set(-4.6, 0.18 + 0.21, 0)
    group.add(deskBody)
    // 粉笔盒 + 粉笔
    const chalkBox = box(0.2, 0.1, 0.3, mats.deskFrame)
    chalkBox.position.set(-4.2, 0.18 + 0.06 + 0.05, 0.15)
    group.add(chalkBox)
    const chalkColors = [0xf4f4f4, 0xffd54f, 0x64b5f6, 0xff8a80]
    chalkColors.forEach((color, i) => {
      const chalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.08, 12),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      )
      chalk.position.set(-4.2 + (i - 1.5) * 0.05, 0.18 + 0.1 + 0.04, 0.15)
      chalk.castShadow = true
      group.add(chalk)
    })

    // 窗户：左右墙各 3 扇，玻璃略向室内突出便于可见
    ;[-1, 1].forEach((side) => {
      const wallZ = side * (ROOM.width / 2)
      const glassZ = side * (ROOM.width / 2 - 0.12)
      ;[-2.6, 0, 2.6].forEach((wx) => {
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.05), mats.windowGlass)
        glass.position.set(wx, 1.8, glassZ)
        glass.castShadow = false
        group.add(glass)
        const hbar = box(1.7, 0.05, 0.06, mats.windowFrame, { castShadow: false })
        hbar.position.set(wx, 1.8, glassZ)
        group.add(hbar)
        const vbar = box(0.05, 1.5, 0.06, mats.windowFrame, { castShadow: false })
        vbar.position.set(wx, 1.8, glassZ)
        group.add(vbar)
        // 外墙内壁开窗的白色衬底，避免玻璃后直接透出墙外天空色
        void wallZ
      })
    })

    // 门：装在后墙门洞内，门框 + 门扇（门扇略凸出墙外，从外面也能看到）
    const jambL = box(0.1, 2.2, 0.08, mats.boardFrame)
    jambL.position.set(ROOM.length / 2, 1.1, 2.0)
    group.add(jambL)
    const jambR = box(0.1, 2.2, 0.08, mats.boardFrame)
    jambR.position.set(ROOM.length / 2, 1.1, 3.2)
    group.add(jambR)
    const jambTop = box(0.1, 0.08, 1.28, mats.boardFrame)
    jambTop.position.set(ROOM.length / 2, 2.24, 2.6)
    group.add(jambTop)
    const door = box(0.06, 2.15, 1.14, mats.door)
    door.position.set(ROOM.length / 2 + 0.08, 1.075, 2.6)
    group.add(door)
    const handle = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8c28a, roughness: 0.3, metalness: 0.6 })
    )
    handle.position.set(ROOM.length / 2 + 0.13, 1.05, 3.02)
    group.add(handle)

    // 课桌椅：4 行 × 3 列
    const rowStart = -2.4
    const rowGap = 1.35
    const colStart = -1.6
    const colGap = 1.6
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        addDeskAndChair(group, mats, rowStart + r * rowGap, colStart + c * colGap)
      }
    }
  }
}
