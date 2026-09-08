// 通用 3D 框架：渲染器、场景、相机、灯光、渲染循环；支持 orbit 和 fps 两种控制模式。
// FPS 模式：PointerLockControls + WASD/Shift + AABB 碰撞 + 交互检测 + 屏幕消息。
// 各场景只负责往 contentGroup 里塞几何体，并通过 build ctx 注册 collider 与 interactive。
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

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

// 通用灯光：环境光 + 太阳方向光（投阴影）。
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

// 玩家与单个 AABB 碰撞盒做轴向对齐的推出（仅 xz 平面）
function resolvePlayerAabb(p, c, radius) {
  if (p.y < c.minY - 0.05 || p.y > c.maxY + 0.05) return
  if (
    p.x >= c.minX - radius &&
    p.x <= c.maxX + radius &&
    p.z >= c.minZ - radius &&
    p.z <= c.maxZ + radius
  ) {
    const overlapL = p.x - (c.minX - radius)
    const overlapR = c.maxX + radius - p.x
    const overlapF = p.z - (c.minZ - radius)
    const overlapB = c.maxZ + radius - p.z
    const m = Math.min(overlapL, overlapR, overlapF, overlapB)
    if (m === overlapL) p.x = c.minX - radius
    else if (m === overlapR) p.x = c.maxX + radius
    else if (m === overlapF) p.z = c.minZ - radius
    else p.z = c.maxZ + radius
  }
}

// 找到玩家脚下最高 collider 顶面，作为"贴地"高度
function getGroundY(colliders, p, radius) {
  let maxTop = 0
  for (const c of colliders) {
    if (p.x + radius < c.minX || p.x - radius > c.maxX) continue
    if (p.z + radius < c.minZ || p.z - radius > c.maxZ) continue
    if (maxTop < c.maxY) maxTop = c.maxY
  }
  return maxTop
}

// 从一个 mesh 推导出 AABB（不依赖 box() helper，通用）
function meshToAabb(mesh) {
  mesh.geometry.computeBoundingBox()
  const bb = mesh.geometry.boundingBox.clone()
  bb.applyMatrix4(mesh.matrixWorld)
  return { minX: bb.min.x, maxX: bb.max.x, minY: bb.min.y, maxY: bb.max.y, minZ: bb.min.z, maxZ: bb.max.z }
}

export function createViewer(container, { background = 0xd7e0ea, controlsType = 'orbit' } = {}) {
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
    controlsType === 'fps' ? 75 : 55,
    container.clientWidth / container.clientHeight,
    0.1,
    300
  )

  buildLights(scene)

  const contentGroup = new THREE.Group()
  contentGroup.name = 'content'
  scene.add(contentGroup)

  // FPS 状态
  const colliders = []
  const interactives = []
  let currentInteractive = null
  let onInteractiveChange = () => {}
  let onLockChange = () => {}
  let onMessage = () => {}
  let messageTimer = 0
  const playerRadius = 0.4
  const playerHeight = 1.7

  let controls
  let disposeControls
  let raf = 0

  if (controlsType === 'fps') {
    controls = new PointerLockControls(camera, renderer.domElement)
    controls.addEventListener('lock', () => onLockChange(true))
    controls.addEventListener('unlock', () => onLockChange(false))

    const keys = { w: false, a: false, s: false, d: false, shift: false }
    const onKeyDown = (e) => {
      const k = e.code
      if (k === 'KeyW' || k === 'ArrowUp') keys.w = true
      else if (k === 'KeyA' || k === 'ArrowLeft') keys.a = true
      else if (k === 'KeyS' || k === 'ArrowDown') keys.s = true
      else if (k === 'KeyD' || k === 'ArrowRight') keys.d = true
      else if (k === 'ShiftLeft' || k === 'ShiftRight') keys.shift = true
      else if (k === 'KeyF') {
        if (controls.isLocked && currentInteractive && !currentInteractive.used) {
          currentInteractive.used = true
          currentInteractive.onUse?.()
          currentInteractive = null
          onInteractiveChange(null)
        }
      }
    }
    const onKeyUp = (e) => {
      const k = e.code
      if (k === 'KeyW' || k === 'ArrowUp') keys.w = false
      else if (k === 'KeyA' || k === 'ArrowLeft') keys.a = false
      else if (k === 'KeyS' || k === 'ArrowDown') keys.s = false
      else if (k === 'KeyD' || k === 'ArrowRight') keys.d = false
      else if (k === 'ShiftLeft' || k === 'ShiftRight') keys.shift = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const velocity = new THREE.Vector3()
    const direction = new THREE.Vector3()
    const moveSpeed = 5
    const runMul = 1.8
    const damping = 8

    function fpsUpdate(dt) {
      if (!controls.isLocked) return
      velocity.x -= velocity.x * damping * dt
      velocity.z -= velocity.z * damping * dt
      direction.z = Number(keys.w) - Number(keys.s)
      direction.x = Number(keys.d) - Number(keys.a)
      if (direction.lengthSq() > 0) direction.normalize()
      const speed = moveSpeed * (keys.shift ? runMul : 1)
      if (keys.w || keys.s) velocity.z -= direction.z * speed * damping * dt
      if (keys.a || keys.d) velocity.x += direction.x * speed * damping * dt
      controls.moveRight(velocity.x * dt)
      controls.moveForward(-velocity.z * dt)
      // 玩家高度：跟随脚下最高 collider 顶面 + 1.7m（实现自动上楼梯/上观察台）
      const groundY = getGroundY(colliders, camera.position, playerRadius)
      camera.position.y = groundY + playerHeight
      for (const c of colliders) resolvePlayerAabb(camera.position, c, playerRadius)
      checkInteractives()
    }

    function checkInteractives() {
      const p = camera.position
      let nearest = null
      let nearestDist = Infinity
      for (const it of interactives) {
        if (it.used) continue
        const dx = p.x - it.position.x
        const dz = p.z - it.position.z
        if (Math.abs(p.y - it.position.y) > 1.5) continue
        const d = Math.sqrt(dx * dx + dz * dz)
        if (d < it.radius && d < nearestDist) {
          nearest = it
          nearestDist = d
        }
      }
      if (nearest !== currentInteractive) {
        currentInteractive = nearest
        onInteractiveChange(currentInteractive)
      }
    }

    function setMessage(text, duration = 2500) {
      onMessage(text)
      if (messageTimer) clearTimeout(messageTimer)
      if (text && duration > 0) {
        messageTimer = setTimeout(() => onMessage(''), duration)
      }
    }
    controls._fpsSetMessage = setMessage

    let lastTime = performance.now()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      fpsUpdate(dt)
      renderer.render(scene, camera)
    }
    animate()

    disposeControls = () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      if (messageTimer) clearTimeout(messageTimer)
      if (controls.isLocked) controls.unlock()
      controls.dispose()
    }
  } else {
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 1.1
    controls.maxDistance = 80
    controls.maxPolarAngle = Math.PI * 0.55
    controls.update()

    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    disposeControls = () => controls.dispose()
  }

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
    controlsType,
    setView(view) {
      camera.position.set(view.position[0], view.position[1], view.position[2])
      controls.target.set(view.target[0], view.target[1], view.target[2])
      controls.update?.()
    },
    setCameraPose(position, look) {
      camera.position.set(position[0], position[1], position[2])
      camera.lookAt(look[0], look[1], look[2])
      controls.update?.()
    },
    clearContent() {
      contentGroup.traverse(disposeObject)
      for (let i = contentGroup.children.length - 1; i >= 0; i--) {
        contentGroup.remove(contentGroup.children[i])
      }
      colliders.length = 0
      interactives.length = 0
      currentInteractive = null
      onInteractiveChange(null)
    },
    registerCollider(aabb) {
      colliders.push(aabb)
    },
    registerColliderFromMesh(mesh) {
      mesh.updateMatrixWorld(true)
      colliders.push(meshToAabb(mesh))
    },
    registerInteractive(item) {
      let pos
      if (item.position.isVector3) pos = item.position
      else pos = new THREE.Vector3(item.position.x, item.position.y, item.position.z)
      interactives.push({
        position: pos,
        radius: item.radius ?? 1.5,
        prompt: item.prompt ?? '按 F 交互',
        onUse: () => item.onUse?.(controls),
        used: false
      })
    },
    getBuildCtx() {
      return {
        registerCollider: (aabb) => colliders.push(aabb),
        registerColliderFromMesh: (mesh) => {
          mesh.updateMatrixWorld(true)
          colliders.push(meshToAabb(mesh))
        },
        registerInteractive: (item) => {
          let pos
          if (item.position.isVector3) pos = item.position
          else pos = new THREE.Vector3(item.position.x, item.position.y, item.position.z)
          interactives.push({
            position: pos,
            radius: item.radius ?? 1.5,
            prompt: item.prompt ?? '按 F 交互',
            onUse: () => item.onUse?.(controls),
            used: false
          })
        },
        setMessage: (text, duration = 2500) => {
          onMessage(text)
          if (messageTimer) clearTimeout(messageTimer)
          if (text && duration > 0) messageTimer = setTimeout(() => onMessage(''), duration)
        }
      }
    },
    setOnLockChange(fn) {
      onLockChange = fn
    },
    setOnInteractiveChange(fn) {
      onInteractiveChange = fn
    },
    setOnMessage(fn) {
      onMessage = fn
    },
    lock() {
      controls.lock?.()
    },
    isLocked() {
      return !!controls.isLocked
    },
    dispose() {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      disposeControls()
      scene.traverse(disposeObject)
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }
}
