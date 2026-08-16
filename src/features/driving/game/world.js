// 道路世界：轴对齐路段 + 掉头缺口 + 网格路口，含几何查询与俯视绘制
// 屏幕坐标 y 向下，heading 0 = 向东（+x）

export const LANE_W = 3.5 // 标准车道宽（米）

export function makeRoad(axis, cx, cy, len, lanesPerDir) {
  const half = LANE_W * lanesPerDir // 单侧可行驶宽
  const road = { axis, cx, cy, len, lanesPerDir, half }
  if (axis === 'h') {
    road.x0 = cx - len / 2
    road.x1 = cx + len / 2
    road.top = cy - half
    road.bottom = cy + half
  } else {
    road.y0 = cy - len / 2
    road.y1 = cy + len / 2
    road.left = cx - half
    road.right = cx + half
  }
  return road
}

// gaps: 掉头缺口，只放在水平路上，{ x, w } 表示在 road.cy 处 x±w/2 无中央线
export function makeWorld(roads, gaps = []) {
  const world = { roads, gaps }
  world.hRoads = roads.filter((r) => r.axis === 'h')
  world.vRoads = roads.filter((r) => r.axis === 'v')
  return world
}

// 点是否在某条路的可行驶区域内
export function roadAt(world, x, y) {
  for (const r of world.roads) {
    if (r.axis === 'h') {
      if (x >= r.x0 && x <= r.x1 && y >= r.top && y <= r.bottom) return r
    } else if (x >= r.left && x <= r.right && y >= r.y0 && y <= r.y1) {
      return r
    }
  }
  return null
}

// 点所在车道信息：side（+1/-1 相对路中心）、laneIndex（0 = 最内侧靠中线）、行驶方向
export function laneInfo(road, x, y) {
  const lat = road.axis === 'h' ? y - road.cy : x - road.cx
  const side = lat >= 0 ? 1 : -1
  const laneIndex = Math.min(road.lanesPerDir - 1, Math.floor(Math.abs(lat) / LANE_W))
  // 靠右行驶：h 路下侧（lat>0）向东，v 路右侧（lat>0）向北（屏幕 y 向下）
  const dir =
    road.axis === 'h'
      ? side > 0 ? 0 : Math.PI
      : side > 0 ? -Math.PI / 2 : Math.PI / 2
  return { lat, side, laneIndex, dir }
}

export function laneCenterLat(side, laneIndex) {
  return side * (laneIndex + 0.5) * LANE_W
}

// 点是否同时位于一条水平路与一条垂直路内（即路口区内，不判车道线）
export function inIntersection(world, x, y) {
  let onH = false
  let onV = false
  for (const r of world.hRoads) {
    if (x >= r.x0 && x <= r.x1 && y >= r.top && y <= r.bottom) {
      onH = true
      break
    }
  }
  if (!onH) return false
  for (const r of world.vRoads) {
    if (x >= r.left && x <= r.right && y >= r.y0 && y <= r.y1) return true
  }
  return false
}

// 点是否在掉头缺口内（该处中央实线断开，允许跨越）
export function inGap(world, x, y) {
  for (const g of world.gaps) {
    if (g.road.axis === 'h') {
      if (Math.abs(y - g.road.cy) < g.road.half && Math.abs(x - g.x) < g.w / 2) {
        return true
      }
    } else if (Math.abs(x - g.road.cx) < g.road.half && Math.abs(y - g.x) < g.w / 2) {
      return true
    }
  }
  return false
}

// 从 [a,b] 中挖掉 cuts 区间后剩下的区段（画车道线时跳过路口与缺口用）
function subtractSpans(span, cuts) {
  let spans = [span]
  for (const c of cuts) {
    const next = []
    for (const s of spans) {
      if (c[1] <= s[0] || c[0] >= s[1]) {
        next.push(s)
        continue
      }
      if (c[0] > s[0]) next.push([s[0], c[0]])
      if (c[1] < s[1]) next.push([c[1], s[1]])
    }
    spans = next
  }
  return spans
}

function roadCrossCuts(world, road) {
  // 与这条路交叉的所有路在路轴上的覆盖区间
  const cross = road.axis === 'h' ? world.vRoads : world.hRoads
  return cross.map((r) =>
    road.axis === 'h' ? [r.left, r.right] : [r.top, r.bottom]
  )
}

const COLOR = {
  ground: '#8aa06e',
  shoulder: '#b9b3a6',
  asphalt: '#565d68',
  laneWhite: 'rgba(255,255,255,0.85)',
  yellow: '#e8c14d'
}

// 俯视绘制整个世界（草地、路面、车道线、斑马线、缺口标志）
export function drawWorld(ctx, world, view) {
  const { w, h } = view
  ctx.fillStyle = COLOR.ground
  ctx.fillRect(view.x0, view.y0, w, h)

  for (const r of world.roads) {
    const outer = r.half + 1.1 // 路肩（压上即算出路）
    ctx.fillStyle = COLOR.shoulder
    if (r.axis === 'h') {
      ctx.fillRect(r.x0, r.cy - outer, r.len, outer * 2)
    } else {
      ctx.fillRect(r.cx - outer, r.y0, outer * 2, r.len)
    }
    ctx.fillStyle = COLOR.asphalt
    if (r.axis === 'h') {
      ctx.fillRect(r.x0, r.top, r.len, r.half * 2)
    } else {
      ctx.fillRect(r.left, r.y0, r.half * 2, r.len)
    }
  }

  for (const r of world.roads) {
    drawMarkings(ctx, world, r)
  }
  for (const g of world.gaps) {
    drawGapSign(ctx, g)
  }
}

function drawMarkings(ctx, world, r) {
  const cuts = roadCrossCuts(world, r)
  const gapCuts = world.gaps
    .filter((g) => g.road === r)
    .map((g) => [g.x - g.w / 2, g.x + g.w / 2])

  const line = (pos, spans, color, width, dash) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.setLineDash(dash || [])
    ctx.beginPath()
    for (const [a, b] of spans) {
      if (r.axis === 'h') {
        ctx.moveTo(a, pos)
        ctx.lineTo(b, pos)
      } else {
        ctx.moveTo(pos, a)
        ctx.lineTo(pos, b)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  const axisSpans = subtractSpans(
    r.axis === 'h' ? [r.x0 + 0.5, r.x1 - 0.5] : [r.y0 + 0.5, r.y1 - 0.5],
    cuts
  )

  // 中央双黄线（缺口处断开）
  const midCuts = [...cuts, ...gapCuts]
  const full = r.axis === 'h' ? [r.x0 + 0.5, r.x1 - 0.5] : [r.y0 + 0.5, r.y1 - 0.5]
  for (const off of [-0.18, 0.18]) {
    const pos = (r.axis === 'h' ? r.cy : r.cx) + off
    line(pos, subtractSpans(full, midCuts), COLOR.yellow, 0.14)
  }

  // 同向车道间白色虚线
  for (let k = 1; k < r.lanesPerDir; k++) {
    for (const side of [-1, 1]) {
      const pos = (r.axis === 'h' ? r.cy : r.cx) + side * k * LANE_W
      line(pos, axisSpans, COLOR.laneWhite, 0.12, [3, 4])
    }
  }

  // 两侧路缘白实线
  for (const side of [-1, 1]) {
    const pos = (r.axis === 'h' ? r.cy : r.cx) + side * r.half
    line(pos, axisSpans, COLOR.laneWhite, 0.16)
  }

  // 路口斑马线：只画水平路上的竖向条纹，垂直路入口由对称绘制补齐
  for (const c of roadCrossCuts(world, r)) {
    drawCrosswalk(ctx, r, c)
  }
}

function drawCrosswalk(ctx, r, c) {
  if (r.axis !== 'h') return
  const depth = 2.4
  const stripeW = 0.45
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const side of [-1, 1]) {
    const yBase = r.cy + side * (r.half + 0.4)
    const y0 = side > 0 ? yBase : yBase - depth
    for (let x = c[0] + 0.6; x < c[1] - 0.4; x += stripeW + 0.5) {
      ctx.fillRect(x, y0, stripeW, depth)
    }
  }
}

function drawGapSign(ctx, g) {
  // 缺口处的掉头提示箭头（蓝色圆底白色 U 形箭头）
  const cx = g.road.axis === 'h' ? g.x : g.road.cx
  const cy = g.road.axis === 'h' ? g.road.cy : g.x
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#2b6cb8'
  ctx.beginPath()
  ctx.arc(0, 0, 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 0.42
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0.12, 0.15, 0.72, Math.PI, Math.PI * 2.35)
  ctx.stroke()
  const tipX = 0.12 + 0.72 * Math.cos(Math.PI * 2.35)
  const tipY = 0.15 + 0.72 * Math.sin(Math.PI * 2.35)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(tipX + 0.5, tipY + 0.12)
  ctx.lineTo(tipX - 0.15, tipY + 0.42)
  ctx.lineTo(tipX - 0.15, tipY - 0.18)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
