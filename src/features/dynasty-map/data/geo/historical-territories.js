// 将历史疆域统一暴露为 GeoJSON FeatureCollection。
// 坐标仍以 [经度, 纬度] 保存，渲染层不再需要理解各朝代的原始数组结构。
import { territories as sourceTerritories } from '../territories.js'

function toFeature(faction) {
  return {
    type: 'Feature',
    properties: {
      dynasty: faction.dynasty,
      key: faction.key,
      name: faction.name,
      color: faction.color,
      labelAt: faction.labelAt,
      label: faction.label
    },
    geometry: {
      type: 'MultiPolygon',
      coordinates: faction.rings.map((ring) => [[...ring, ring[0]]])
    }
  }
}

export const historicalTerritories = Object.fromEntries(
  Object.entries(sourceTerritories).map(([dynastyKey, factions]) => [
    dynastyKey,
    {
      type: 'FeatureCollection',
      features: factions.map((faction) => toFeature({ ...faction, dynasty: dynastyKey }))
    }
  ])
)

export function factionsFromGeoJson(dynastyKey) {
  const compact = dynastyKey === 'chunqiu' || dynastyKey === 'zhanguo'
  return (historicalTerritories[dynastyKey]?.features || []).map((feature) => {
    const rings = feature.geometry.coordinates.map((polygon) => polygon[0].slice(0, -1))
    if (!compact) {
      return { ...feature.properties, rings }
    }

    // 春秋战国资料是大势示意图，不是县级 GIS 边界；缩进每块区域并留出墨线间隙，
    // 避免相邻诸侯国在画面上互相盖住，同时保留各国的大致方位。
    const points = rings.flat()
    const center = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0])
      .map((value) => value / Math.max(points.length, 1))
    const ringsWithGap = rings.map((ring) => ring.map(([lng, lat]) => [
      center[0] + (lng - center[0]) * 0.66,
      center[1] + (lat - center[1]) * 0.66
    ]))
    return { ...feature.properties, rings: ringsWithGap }
  })
}
