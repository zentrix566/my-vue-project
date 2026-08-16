/**
 * 火柴人格斗 · 房间与敌人数值配置
 * 平衡性参数集中在这里，改数值不用动游戏逻辑
 */

export const ENEMY_TYPES = {
  thug: {
    label: '打手',
    hp: 46,
    speed: 132,
    color: '#9aa3ad',
    dark: '#6d757e',
    scale: 1,
    lineWidth: 4.5,
    melee: { range: 58, windup: 0.36, damage: 9, knockback: 230, cooldown: 1.05 }
  },
  stick: {
    label: '持棍打手',
    hp: 62,
    speed: 148,
    color: '#b39b74',
    dark: '#7d6c4f',
    scale: 1,
    lineWidth: 4.5,
    weapon: 'club',
    melee: { range: 86, windup: 0.5, damage: 13, knockback: 340, cooldown: 1.4 }
  },
  gunner: {
    label: '枪手',
    hp: 40,
    speed: 118,
    color: '#8493ab',
    dark: '#59657a',
    scale: 1,
    lineWidth: 4.5,
    weapon: 'gun',
    ranged: { keep: 320, fireCycle: 2.1, aimTime: 0.6, bulletSpeed: 540, damage: 9 },
    melee: { range: 46, windup: 0.3, damage: 6, knockback: 180, cooldown: 1.2 }
  },
  boss: {
    label: '铁拳王',
    hp: 340,
    speed: 150,
    color: '#d4452f',
    dark: '#8f2b1d',
    scale: 1.45,
    lineWidth: 6.5,
    melee: { range: 88, windup: 0.52, damage: 18, knockback: 470, cooldown: 1.5 },
    charge: { windup: 0.45, speed: 465, damage: 22, dur: 1.05 },
    bombCycle: 7.5,
    enrageAt: 0.4
  }
}

export const ROOMS = [
  {
    name: '一层 · 大厅',
    sub: '两个看门的打手，热热身',
    enemies: [
      { type: 'thug', x: 620 },
      { type: 'thug', x: 790 }
    ],
    crates: [],
    platforms: [],
    lamps: [300, 660]
  },
  {
    name: '二层 · 走廊',
    sub: '增援赶到，小心被夹击',
    enemies: [
      { type: 'thug', x: 560 },
      { type: 'thug', x: 760 },
      { type: 'thug', x: 880 }
    ],
    crates: [{ x: 880, item: 'dynamite' }],
    platforms: [],
    lamps: [240, 480, 720]
  },
  {
    name: '三层 · 酒吧',
    sub: '有人手里有枪，跳上台子躲子弹',
    enemies: [
      { type: 'thug', x: 520 },
      { type: 'stick', x: 700 },
      { type: 'gunner', x: 850 }
    ],
    crates: [{ x: 64, item: 'medkit' }],
    platforms: [{ x: 520, y: 322, w: 240 }],
    lamps: [400, 760]
  },
  {
    name: '四层 · 仓库',
    sub: '持棍打手与枪手混编，善用炸药',
    enemies: [
      { type: 'stick', x: 500 },
      { type: 'stick', x: 820 },
      { type: 'gunner', x: 640 },
      { type: 'gunner', x: 900 }
    ],
    crates: [
      { x: 64, item: 'dynamite' },
      { x: 896, item: 'medkit' }
    ],
    platforms: [
      { x: 250, y: 322, w: 190 },
      { x: 560, y: 288, w: 190 }
    ],
    lamps: [300, 620, 860]
  },
  {
    name: '五层 · 办公室',
    sub: '全伙倾巢而出，最后一道防线',
    enemies: [
      { type: 'thug', x: 480 },
      { type: 'thug', x: 640 },
      { type: 'stick', x: 780 },
      { type: 'gunner', x: 560 },
      { type: 'gunner', x: 880 }
    ],
    crates: [
      { x: 64, item: 'dynamite' },
      { x: 896, item: 'medkit' }
    ],
    platforms: [{ x: 420, y: 322, w: 220 }],
    lamps: [280, 540, 800]
  },
  {
    name: '六层 · 顶楼',
    sub: '头目「铁拳王」在此恭候多时',
    enemies: [
      { type: 'boss', x: 700 },
      { type: 'thug', x: 480 },
      { type: 'thug', x: 860 }
    ],
    crates: [
      { x: 64, item: 'medkit' },
      { x: 896, item: 'dynamite' }
    ],
    platforms: [],
    lamps: [330, 660]
  }
]
