// 场景主类：Three.js 渲染循环、OrbitControls、灯光、Bloom 后处理、
// Raycaster 拾取、朝代切换生长动画。Vue 页面只与这个类对话。

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { buildProvinces } from './layers/provinces.js'
import { buildTerritories } from './layers/territories.js'
import { buildDivisions } from './layers/divisions.js'
import { buildCities } from './layers/cities.js'
import { buildWall } from './layers/walls.js'
import { LabelManager } from './labels/LabelManager.js'
import { project } from './geo.js'
import { CITY_TIERS, morandi } from './palette.js'

// 2D 历史地图：正交相机正俯视，拖拽只负责平移，滚轮负责缩放。
const DEFAULT_CAM_POS = new THREE.Vector3(0, 160, 0)
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0)

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export class DynastyScene {
  constructor(container, { onPickCity, onPickFaction, onPickProvince, onHoverCity, onHoverDivision, onError } = {}) {
    this.container = container
    this.onPickCity = onPickCity
    this.onPickFaction = onPickFaction
    this.onPickProvince = onPickProvince
    this.onHoverCity = onHoverCity
    this.onHoverDivision = onHoverDivision
    this.onError = onError

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-80, 80, 60, -60, 0.1, 800)
    this.camera.position.copy(DEFAULT_CAM_POS)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(DEFAULT_TARGET)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = true
    this.controls.screenSpacePanning = false
    this.controls.panSpeed = 1.15
    this.controls.rotateSpeed = 0.55
    this.controls.enableRotate = false
    this.controls.mouseButtons.LEFT = THREE.MOUSE.PAN
    this.controls.touches.ONE = THREE.TOUCH.PAN
    this.controls.minZoom = 0.7
    this.controls.maxZoom = 5.5
    this.controls.autoRotate = false
    this.controls.addEventListener('start', () => this.cancelCameraTween())

    this.scene.add(new THREE.AmbientLight(0xbfd0e8, 1.15))
    const dir = new THREE.DirectionalLight(0xdfe8ff, 1.5)
    dir.position.set(40, 80, 30)
    this.scene.add(dir)
    const dir2 = new THREE.DirectionalLight(0x7a8fc0, 0.5)
    dir2.position.set(-50, 30, -40)
    this.scene.add(dir2)

    this.pedestal = this.createPedestal()
    this.scene.add(this.pedestal)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0, 0, 1)
    this.bloom.enabled = false
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    // 标签容器叠在 canvas 之上，不拦截鼠标
    this.labelRoot = document.createElement('div')
    this.labelRoot.className = 'dm-label-root'
    container.appendChild(this.labelRoot)
    this.labels = new LabelManager(this.labelRoot)

    // 悬停郡/州区划时的单例浮标（挂在标签层，非碰撞体系）
    this.divLabel = document.createElement('div')
    this.divLabel.className = 'dm-label dm-label--division'
    this.labelRoot.appendChild(this.divLabel)
    this.hoverDivision = null

    this.provinces = null
    this.territories = null
    this.divisions = null
    this.cities = null
    this.wall = null
    this.grow = 0 // 疆域组生长因子 0→1
    this.cameraTween = null
    this.raycaster = new THREE.Raycaster()
    this.pointerNdc = new THREE.Vector2()
    this.tmpVec = new THREE.Vector3()
    this.downXY = { x: 0, y: 0 }
    this.lastHoverAt = 0

    this.renderer.domElement.addEventListener('pointerdown', this.handleDown)
    this.renderer.domElement.addEventListener('pointerup', this.handleUp)
    this.renderer.domElement.addEventListener('pointermove', this.handleMove)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()

    this.clock = new THREE.Clock()
    this.raf = 0
    this.running = true
    this.lastTickAt = 0
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
    // rAF 看门狗：页面隐藏/被遮挡时 requestAnimationFrame 会被暂停，
    // 用低频 interval 兜底驱动 tick，保证后台切换朝代等操作仍能推进
    this.watchdog = setInterval(() => {
      if (!this.running) return
      if (performance.now() - this.lastTickAt > 900) {
        try {
          this.tick()
        } catch {
          // 看门狗异常忽略，下一轮 rAF 会再试
        }
      }
    }, 450)
  }

  createPedestal() {
    // 博物馆展台式暗色圆盘，边缘径向淡出
    // 大范围海洋底：拖到非国家区域时显示地图底色，不让透明 WebGL 画布露出纸张舞台。
    const geom = new THREE.CircleGeometry(500, 96)
    geom.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ color: '#b9c9d8', depthWrite: false })
    const mesh = new THREE.Mesh(geom, mat)
    mesh.position.y = -0.3
    return mesh
  }

  setGeoJson(geoJson) {
    if (this.provinces) {
      this.scene.remove(this.provinces.group)
      this.provinces.dispose()
    }
    this.provinces = buildProvinces(geoJson)
    this.scene.add(this.provinces.group)
  }

  // era: { cities, factions, wall }；factions 来自 territories[key]
  setEra(era) {
    if (this.divisions) {
      this.divisions.dispose()
      this.divisions = null
    }
    if (this.territories) {
      this.scene.remove(this.territories.group)
      this.territories.dispose()
    }
    if (this.cities) {
      this.scene.remove(this.cities.group)
      this.cities.dispose()
    }
    if (this.wall) {
      this.scene.remove(this.wall.group)
      this.wall.dispose()
    }

    this.territories = buildTerritories(era.factions)
    this.scene.add(this.territories.group)

    // 郡/州区划层挂在疆域组下：随切换朝代的生长动画同步抬升
    this.divisions = buildDivisions(era.factions, era.cities, this.territories.heights)
    this.territories.group.add(this.divisions.group)
    this.setDivisionHover(null)

    this.cities = buildCities(era.cities, {})
    this.scene.add(this.cities.group)

    this.wall = era.wall ? buildWall(era.wall) : null
    if (this.wall) this.scene.add(this.wall.group)

    // 疆域与光柱从零生长
    this.grow = 0
    this.territories.group.scale.y = 0.001
    this.cities.growFromZero()
    this.territories.setResolution(this.labelRoot.clientWidth, this.labelRoot.clientHeight)

    // 政权名标签锚在各自疆域顶面之上
    const factionSpecs = era.factions
      .filter((f) => f.label !== false && f.labelAt)
      .map((f) => {
        const p = project(f.labelAt[0], f.labelAt[1])
        const h = (this.territories.heights[f.key] || 2.1) + 1.6
        return { name: f.name, color: morandi(f.color).bright, anchor: new THREE.Vector3(p.x, h, p.z) }
      })
    const citySpecs = era.cities.map((c, i) => ({
      name: c.name,
      type: c.type,
      rank: (CITY_TIERS[c.type] || CITY_TIERS.town).rank,
      cityIndex: i
    }))
    this.labels.setEra(citySpecs, factionSpecs, this.divisions.labelSpecs())

    const view = this.defaultView()
    this.tweenCamera(view.pos, view.tgt, 850)
  }

  // 默认视角
  defaultView() {
    return { pos: DEFAULT_CAM_POS.clone(), tgt: DEFAULT_TARGET.clone() }
  }

  setFaction(key) {
    if (this.territories) this.territories.setFaction(key)
    if (this.divisions) this.divisions.setFaction(key)
  }

  setLayers(layers = {}) {
    if (this.provinces) this.provinces.group.visible = layers.provinces !== false
    if (this.territories) this.territories.group.visible = layers.territories !== false
    if (this.cities) this.cities.group.visible = layers.cities !== false
    if (this.wall) this.wall.group.visible = layers.walls !== false
    if (this.labels) this.labels.setShow(layers.cities !== false)
  }

  setLabels(v) {
    this.labels.setShow(v)
  }

  setAutoRotate(v) {
    // 2D 地图没有旋转视角，保留接口避免旧按钮/状态破坏页面。
    this.controls.autoRotate = false
  }

  resetView() {
    const view = this.defaultView()
    this.tweenCamera(view.pos, view.tgt, 700)
  }

  pulseCity(name) {
    if (this.cities) this.cities.pulse(name)
    this.labels.forceShow(name)
  }

  clearPulse() {
    this.labels.forceShow('')
  }

  tweenCamera(pos, target, dur) {
    this.cameraTween = {
      fromPos: this.camera.position.clone(),
      toPos: pos.clone(),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t0: performance.now(),
      dur
    }
  }

  cancelCameraTween() {
    this.cameraTween = null
  }

  handleDown = (e) => {
    this.downXY = { x: e.clientX, y: e.clientY }
  }

  handleUp = (e) => {
    if (Math.hypot(e.clientX - this.downXY.x, e.clientY - this.downXY.y) > 6) return
    const hit = this.raycast(e)
    if (!hit) return
    const ud = hit.object.userData
    if (hit.object === this.cities?.mesh && hit.instanceId >= 0) {
      const item = this.cities.items[hit.instanceId]
      if (item && this.onPickCity) this.onPickCity(item.city)
    } else if (ud.kind === 'division') {
      // 点击区划 = 选中其郡治城邑
      if (this.onPickCity) this.onPickCity(ud.city)
    } else if (ud.kind === 'territory') {
      if (this.onPickFaction) this.onPickFaction(ud.faction)
    } else if (ud.kind === 'province') {
      if (this.onPickProvince) this.onPickProvince(ud.name)
    }
  }

  handleMove = (e) => {
    const now = performance.now()
    if (now - this.lastHoverAt < 60) return
    this.lastHoverAt = now
    const hit = this.raycast(e)
    let cityIdx = -1
    let provinceName = ''
    let divisionIdx = -1
    if (hit) {
      if (hit.object === this.cities?.mesh && hit.instanceId >= 0) {
        cityIdx = hit.instanceId
      } else if (hit.object.userData.kind === 'division') {
        divisionIdx = this.divisions.meshes.indexOf(hit.object)
      } else if (hit.object.userData.kind === 'province') {
        provinceName = hit.object.userData.name
      }
    }
    this.cities?.setHover(cityIdx)
    this.provinces?.setHover(provinceName)
    this.setDivisionHover(divisionIdx >= 0 ? this.divisions.setHover(divisionIdx) : this.divisions?.setHover(-1))
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
  }

  // 悬停郡/州区划：高亮由 divisions 层自管，这里驱动浮标与回调
  setDivisionHover(cell) {
    if (cell === this.hoverDivision) return
    this.hoverDivision = cell
    if (cell) {
      this.divLabel.textContent = cell.name
      this.divLabel.classList.add('on')
    } else {
      this.divLabel.classList.remove('on')
    }
    if (this.onHoverDivision) {
      this.onHoverDivision(cell ? { name: cell.name, city: cell.city } : null)
    }
  }

  raycast(e) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(this.pointerNdc, this.camera)
    const targets = []
    if (this.cities) targets.push(this.cities.mesh)
    if (this.divisions) targets.push(...this.divisions.meshes)
    if (this.territories) targets.push(...this.territories.meshes)
    if (this.provinces) targets.push(...this.provinces.meshes)
    const hits = this.raycaster.intersectObjects(targets, false)
    return hits[0] || null
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (w < 50 || h < 50) return // 容器隐藏/切换瞬间不按 0 尺寸重建
    const viewHeight = 120
    const viewWidth = viewHeight * w / h
    this.camera.left = -viewWidth / 2
    this.camera.right = viewWidth / 2
    this.camera.top = viewHeight / 2
    this.camera.bottom = -viewHeight / 2
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.composer.setSize(w, h)
    this.bloom.setSize(w, h)
    this.labels.resize()
    this.territories?.setResolution(w, h)
  }

  loop() {
    if (!this.running) return
    this.raf = requestAnimationFrame(this.loop)
    try {
      this.tick()
    } catch (err) {
      // 循环异常只上报一次并停帧，避免每帧抛错刷屏
      this.running = false
      if (this.onError) this.onError('渲染循环异常：' + (err && err.message ? err.message : String(err)))
    }
  }

  tick() {
    this.lastTickAt = performance.now()
    const dt = Math.min(this.clock.getDelta(), 0.1)
    const now = performance.now()

    // 疆域生长动画
    if (this.grow < 1) {
      this.grow = Math.min(1, this.grow + dt / 0.75)
      this.territories.group.scale.y = Math.max(easeOutCubic(this.grow), 0.001)
    }
    this.cities?.update(dt)

    // 相机 tween
    if (this.cameraTween) {
      const tw = this.cameraTween
      const t = Math.min(1, (now - tw.t0) / tw.dur)
      const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      this.camera.position.lerpVectors(tw.fromPos, tw.toPos, k)
      this.controls.target.lerpVectors(tw.fromTarget, tw.toTarget, k)
      if (t >= 1) this.cameraTween = null
    }

    this.controls.update()

    // 2D 平移边界：允许查看地图四周，但不能把整张中国地图拖出视口。
    // 目标点和相机同步移动，避免 OrbitControls 的内部距离被破坏。
    if (this.camera.isOrthographicCamera) {
      // 正俯视 2D 地图只能沿 X/Z 平面移动，始终锁定高度。
      // 这也会恢复旧版错误平移遗留的相机状态。
      this.controls.target.y = 0
      this.camera.position.y = DEFAULT_CAM_POS.y
      // 中国主体约覆盖 X=-51..51、Z=-35..37；高倍缩放时收紧边界，
      // 防止用户把整张底图拖出视口后只看到舞台背景。
      const zoom = this.camera.zoom || 1
      const panX = clamp(50 - 28 / zoom, 22, 50)
      const panZ = clamp(34 - 20 / zoom, 14, 34)
      const nextX = clamp(this.controls.target.x, -panX, panX)
      const nextZ = clamp(this.controls.target.z, -panZ, panZ)
      const dx = nextX - this.controls.target.x
      const dz = nextZ - this.controls.target.z
      if (dx || dz) {
        this.controls.target.x = nextX
        this.controls.target.z = nextZ
        this.camera.position.x += dx
        this.camera.position.z += dz
      }
    }

    if (this.cities && this.labels.labels.length) {
      this.labels.update(this.camera, this.cities.topPositions(), this.controls.getDistance())
    }

    // 悬停郡/州区划浮标跟随单元质心（疆域组有 y 缩放动画，锚点要乘上）
    if (this.hoverDivision) {
      const cell = this.hoverDivision
      const gs = this.territories ? this.territories.group.scale.y : 1
      this.tmpVec.set(cell.centroid.x, (cell.height + 1.1) * gs, cell.centroid.z)
      this.tmpVec.project(this.camera)
      if (this.tmpVec.z < 1) {
        const x = (this.tmpVec.x * 0.5 + 0.5) * this.labelRoot.clientWidth
        const y = (-this.tmpVec.y * 0.5 + 0.5) * this.labelRoot.clientHeight
        this.divLabel.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
      }
    }

    this.composer.render()
  }

  dispose() {
    this.running = false
    cancelAnimationFrame(this.raf)
    clearInterval(this.watchdog)
    this.ro.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this.handleDown)
    this.renderer.domElement.removeEventListener('pointerup', this.handleUp)
    this.renderer.domElement.removeEventListener('pointermove', this.handleMove)
    this.controls.dispose()
    this.labels.dispose()
    this.provinces?.dispose()
    this.divisions?.dispose()
    this.territories?.dispose()
    this.cities?.dispose()
    this.wall?.dispose()
    this.pedestal.geometry.dispose()
    this.pedestal.material.dispose()
    this.composer.dispose?.()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.divLabel.remove()
    this.labelRoot.remove()
  }
}
