/** 将 TopoJSON 的增量编码弧线转成适合 SVG 的等经纬投影路径。 */
export function topologyToCountries(topology, width = 1000, height = 500) {
  const { arcs, transform } = topology
  const arcCache = new Map()
  const scale = transform?.scale || [1, 1]
  const translate = transform?.translate || [0, 0]

  function project(longitude, latitude) {
    return {
      longitude,
      x: ((longitude + 180) / 360) * width,
      y: ((90 - latitude) / 180) * height
    }
  }

  function decodeArc(index) {
    const reversed = index < 0
    const sourceIndex = reversed ? ~index : index
    if (!arcCache.has(sourceIndex)) {
      let x = 0
      let y = 0
      const points = arcs[sourceIndex].map(([deltaX, deltaY]) => {
        x += deltaX
        y += deltaY
        return project(x * scale[0] + translate[0], y * scale[1] + translate[1])
      })
      arcCache.set(sourceIndex, points)
    }
    const points = arcCache.get(sourceIndex)
    return reversed ? [...points].reverse() : points
  }

  function ringToPath(ring) {
    const points = ring.reduce((joined, index) => {
      const arc = decodeArc(index)
      return joined.concat(joined.length ? arc.slice(1) : arc)
    }, [])
    if (!points.length) return ''

    // 经度从 +180° 跳到 -180° 时不能在平面 SVG 上直连，否则会生成横跨整张图的伪边界。
    const crossesDateLine = points.some((point, index) =>
      index > 0 && Math.abs(point.longitude - points[index - 1].longitude) > 180
    ) || Math.abs(points[0].longitude - points.at(-1).longitude) > 180
    const commands = points.map((point, index) => {
      const previous = points[index - 1]
      const startsNewPart = index === 0 || Math.abs(point.longitude - previous.longitude) > 180
      return `${startsNewPart ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`
    })
    return `${commands.join('')}${crossesDateLine ? '' : 'Z'}`
  }

  function geometryToPath(geometry) {
    if (geometry.type === 'Polygon') return geometry.arcs.map(ringToPath).join('')
    if (geometry.type === 'MultiPolygon') {
      return geometry.arcs.flatMap((polygon) => polygon.map(ringToPath)).join('')
    }
    return ''
  }

  return topology.objects.countries.geometries
    .map((geometry) => ({
      id: String(geometry.id),
      name: geometry.properties.name,
      path: geometryToPath(geometry)
    }))
    .filter((country) => country.path && country.name !== 'Antarctica')
}
