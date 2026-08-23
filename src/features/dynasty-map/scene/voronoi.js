// 近似 Voronoi 分割：以各城邑为种子，把疆域多边形按「离哪个城最近」切成
// 郡/州区划单元。实现对每个种子用垂直平分面半平面依次裁剪多边形
// （Sutherland-Hodgman），种子数在几十个以内，开销可以忽略。

// 用「离 a 更近」的半平面裁剪多边形：保留满足 (p-m)·(b-a) < 0 的部分
function clipHalfPlane(poly, ax, az, bx, bz) {
  const mx = (ax + bx) / 2
  const mz = (az + bz) / 2
  const dx = bx - ax
  const dz = bz - az
  const side = (p) => (p.x - mx) * dx + (p.z - mz) * dz
  const out = []
  const n = poly.length
  if (!n) return out
  let prev = poly[n - 1]
  let prevIn = side(prev) < 0
  for (const cur of poly) {
    const curIn = side(cur) < 0
    if (curIn !== prevIn) {
      const s0 = side(prev)
      const t = s0 / (s0 - side(cur))
      out.push({ x: prev.x + (cur.x - prev.x) * t, z: prev.z + (cur.z - prev.z) * t })
    }
    if (curIn) out.push(cur)
    prev = cur
    prevIn = curIn
  }
  return out
}

// seeds: [{x,z}]，polygon: [{x,z}]（疆域环）；返回与 seeds 等长的单元数组（可能为空）
export function voronoiInPolygon(seeds, polygon) {
  return seeds.map((s, i) => {
    let cell = polygon
    for (let j = 0; j < seeds.length; j++) {
      if (i === j) continue
      cell = clipHalfPlane(cell, s.x, s.z, seeds[j].x, seeds[j].z)
      if (cell.length < 3) break
    }
    return cell
  })
}

// 点是否在 {x,z} 多边形内（射线法）
export function pointInPolygonXZ(x, z, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z
    const xj = poly[j].x, zj = poly[j].z
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

// 单元面积与质心（鞋带公式）
export function cellStats(poly) {
  let area = 0
  let cx = 0
  let cz = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const cross = poly[j].x * poly[i].z - poly[i].x * poly[j].z
    area += cross
    cx += (poly[j].x + poly[i].x) * cross
    cz += (poly[j].z + poly[i].z) * cross
  }
  area /= 2
  if (Math.abs(area) < 1e-6) {
    return { area: 0, cx: poly[0].x, cz: poly[0].z }
  }
  return { area: Math.abs(area), cx: cx / (6 * area), cz: cz / (6 * area) }
}
