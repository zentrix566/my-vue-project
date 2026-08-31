import * as THREE from 'three'

// 为任意经纬度投影后的平面几何写入稳定的地貌顶点色。
// 不依赖在线瓦片：东南湿润、西北干旱、青藏高地偏岩色，并叠加细小山脊纹理。
export function addTerrainVertexColors(geometry, { muted = false } = {}) {
  const pos = geometry.getAttribute('position')
  const colors = []
  const green = new THREE.Color('#668462')
  const lush = new THREE.Color('#4f7559')
  const dry = new THREE.Color('#b19a6a')
  const plateau = new THREE.Color('#9a8a72')
  const rock = new THREE.Color('#c6bba0')
  const contextTint = new THREE.Color('#738077')

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const east = THREE.MathUtils.smoothstep(x, -24, 28)
    const south = THREE.MathUtils.smoothstep(z, -12, 26)
    const tibet = THREE.MathUtils.smoothstep(-x, 18, 48) * THREE.MathUtils.smoothstep(z, 0, 24)
    const c = dry.clone().lerp(green, east * 0.78 + south * 0.26)
    c.lerp(lush, east * south * 0.34)
    c.lerp(plateau, tibet * 0.75)
    const ridge = Math.sin(x * 1.71 + z * 0.73) * Math.sin(z * 1.19 - x * 0.39)
    const fine = Math.sin(x * 4.13 + z * 2.37) * 0.5 + 0.5
    if (tibet > 0.45 && ridge > 0.38) c.lerp(rock, tibet * (ridge - 0.38) * 0.9)
    c.offsetHSL(0, muted ? -0.08 : 0, ridge * 0.045 + fine * 0.018 - (muted ? 0.055 : 0.012))
    if (muted) c.lerp(contextTint, 0.24)
    colors.push(c.r, c.g, c.b)
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
}
