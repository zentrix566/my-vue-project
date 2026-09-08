// 通用 3D 框架：渲染器、场景、相机、轨道控制器、灯光与渲染循环。
// 各场景只负责往 contentGroup 里塞几何体，框架负责渲染与销毁。
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 生成一块长方体，默认开启阴影
export function box(w, h, d, material, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  mesh.castShadow = opts.castShadow ?? true
  mesh.receiveShadow = opts.receiveShadow ?? true
  return mesh
}

// 用 canvas 画一段文字作为贴图
export function makeTextTexture({ text, sub, width = 1024, height = 384, bg = '#24402f', fg = '#eef3ea', font = 72, subFont = 40 }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const family = '"PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.font = `bold ${font}px ${family}`
  const mainY = sub ? height / 2 - subFont * 0.8 : height / 2
  ctx.fillText(text, width / 2, mainY)
  if (sub) {
    ctx.font = `${subFont}px ${family}`
    ctx.fillText(sub, width / 2, height / 2 + subFont * 1.1)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

// 通用灯光：环境光 + 太阳方向光（投阴影）。场景专属灯由各场景自行加到 contentGroup。
function buildLights(scene) {
  const group = new THREE.Group()
  group.name = 'lights'

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  group.add(ambient)

  const sun = new THREE.DirectionalLight(0xfff1dc, 2.0)
  sun.position.set(10, 14, 10)
  sun.target.position.set(0, 0, 0)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -22
  sun.shadow.camera.right = 22
  sun.shadow.camera.top = 22
  sun.shadow.camera.bottom = -22
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 60
  sun.shadow.bias = -0.0004
  group.add(sun)
  group.add(sun.target)

  scene.add(group)
}

export function createViewer(container, { background = 0xd7e0ea } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setClearColor(background)
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(background, 30, 90)

  const camera = new THREE.PerspectiveCamera(
    55,
    container.clientWidth / container.clientHeight,
    0.1,
    300
  )

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.1
  controls.maxDistance = 80
  controls.maxPolarAngle = Math.PI * 0.55
  controls.update()

  buildLights(scene)

  // 场景几何体都挂到 contentGroup，切换场景时整体清空重建
  const contentGroup = new THREE.Group()
  contentGroup.name = 'content'
  scene.add(contentGroup)

  let raf = 0
  const animate = () => {
    raf = requestAnimationFrame(animate)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  const onResize = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  function disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => {
        if (m.map) m.map.dispose()
        m.dispose()
      })
    }
  }

  return {
    renderer,
    scene,
    camera,
    controls,
    contentGroup,
    setView(view) {
      camera.position.set(view.position[0], view.position[1], view.position[2])
      controls.target.set(view.target[0], view.target[1], view.target[2])
      controls.update()
    },
    clearContent() {
      contentGroup.traverse(disposeObject)
      // 从后往前移除，避免遍历过程中改动集合
      for (let i = contentGroup.children.length - 1; i >= 0; i--) {
        contentGroup.remove(contentGroup.children[i])
      }
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      scene.traverse(disposeObject)
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }
}
