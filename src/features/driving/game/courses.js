// 四种练习模式的会话逻辑：变道 / 转弯 / 掉头 / 综合路考
// 每个会话持有世界、车辆、HUD 反应式状态与扣分明细，页面每帧调用 update(dt)

import { reactive } from 'vue'
import { createCar, carCorners, angleDiff, normAngle, kmh, clamp } from './engine.js'
import {
  makeRoad,
  makeWorld,
  roadAt,
  laneInfo,
  laneCenterLat,
  inIntersection,
  inGap,
  LANE_W
} from './world.js'

export const MODES = [
  {
    id: 'lane',
    emoji: '🛣️',
    name: '变道练习',
    desc: '三车道直路上连续变道，练打灯时机与缓打缓回的方向手感。',
    tip: '提前 1 秒以上开转向灯，小角度缓入，回正后灯自动回位'
  },
  {
    id: 'turn',
    emoji: '🚦',
    name: '转弯练习',
    desc: '网格路口连续左转右转，练导向车道选择与弯中速度控制。',
    tip: '左转提前进最左道、转大弯进内侧车道；右转转小弯进最右车道'
  },
  {
    id: 'uturn',
    emoji: '🔄',
    name: '掉头练习',
    desc: '在指定缺口掉头，统计揉了几把方向，练转弯半径预判。',
    tip: '先减速、开左灯，一把过不了就前进倒车再来一把，很正常'
  },
  {
    id: 'course',
    emoji: '🏁',
    name: '综合路考',
    desc: '变道、左右转、掉头串成一条路线，到终点出成绩单。',
    tip: '科目三式评分：压线、逆行、忘打灯都会扣分，冲出场地直接结束'
  }
]

// 与 makeWorld 配套：把缺口挂到对应路上，方便"前方最近缺口"查询
function buildWorld(roads, gapDefs) {
  const gaps = gapDefs.map(({ road, x, w }) => ({ road, x, w }))
  for (const g of gaps) {
    if (!g.road.gaps) g.road.gaps = []
    g.road.gaps.push(g)
  }
  return makeWorld(roads, gaps)
}

function gridWorld() {
  // 3×3 网格路网，单向三车道，路口间距 280m，路长略出头防冲出
  const pos = [-280, 0, 280]
  const roads = [
    ...pos.map((cy) => makeRoad('h', 0, cy, 1160, 3)),
    ...pos.map((cx) => makeRoad('v', cx, 0, 1160, 3))
  ]
  const byPos = (axis, p) =>
    roads.find((r) => r.axis === axis && (axis === 'h' ? r.cy === p : r.cx === p))
  const gapDefs = []
  // 每条路在路口之间与路端各放一个掉头缺口，错过路口后也有补救点
  for (const axis of ['h', 'v']) {
    for (const p of pos) {
      for (const x of [-430, -140, 140, 430]) {
        gapDefs.push({ road: byPos(axis, p), x, w: 14 })
      }
    }
  }
  return buildWorld(roads, gapDefs)
}

const DIR_TEXT = { left: '左', right: '右' }

// 把任意朝向量化到最近的正方向（东西南北），返回单位向量
function cardinal(heading) {
  const dx = Math.cos(heading)
  const dy = Math.sin(heading)
  return Math.abs(dx) >= Math.abs(dy)
    ? { x: Math.sign(dx), y: 0 }
    : { x: 0, y: Math.sign(dy) }
}

class BaseSession {
  constructor(modeId, world, car) {
    this.modeId = modeId
    this.world = world
    this.car = car
    this.hud = reactive({
      taskText: '准备出发',
      taskHint: '',
      progressText: '',
      score: 100,
      speed: 0,
      gear: 'N',
      signal: null,
      signalAge: 0
    })
    this.penalties = []
    this.stats = { maxLatAccel: 0, maxSteerRate: 0, uturnReversals: [] }
    this.finished = false
    this.result = null
    this.endReason = ''
    this.onEvent = null
    this.time = 0
    this.signal = null
    this.signalAt = 0
    this.signalHeading0 = 0
    this.signalSteered = 0 // 打灯期间方向盘最大摆幅，模拟回位棘轮
    this.signalForgetWarned = false
    // 构造期先按出生位置初始化一次，planTask 依赖它找前方路口/缺口
    this.currentRoad = roadAt(world, car.x, car.y)
    this.currentLane = this.currentRoad
      ? laneInfo(this.currentRoad, car.x, car.y)
      : null
    this.offRoadTime = 0
    this.curbTimer = 0
    this.curbCooldown = 0
    this.midTimer = 0
    this.midCooldown = 0
    this.wrongWayTimer = 0
    this.wrongWayCooldown = 0
  }

  emit(kind, payload) {
    this.onEvent?.(kind, payload)
  }

  penalize(text, pts) {
    this.hud.score = Math.max(0, this.hud.score - pts)
    this.penalties.push({ t: this.time, text, pts })
    this.emit('penalty', { text, pts })
  }

  praise(text) {
    this.emit('praise', { text })
  }

  toggleSignal(side) {
    if (this.signal === side) {
      this.signal = null
    } else {
      this.signal = side
      this.signalAt = this.time
      this.signalHeading0 = this.car.heading
      this.signalSteered = 0
      this.signalForgetWarned = false
    }
    this.hud.signal = this.signal
  }

  // 信号灯开着时：摆过方向盘且已回正 → 自动回位；长期没动方向 → 提醒忘关
  updateSignal(dt) {
    this.hud.signalAge = this.signal ? this.time - this.signalAt : 0
    if (!this.signal) return
    this.signalSteered = Math.max(this.signalSteered, Math.abs(this.car.wheelDeg))
    if (this.signalSteered > 120 && Math.abs(this.car.wheelDeg) < 30) {
      this.signal = null
      this.hud.signal = null
      this.emit('signal-off')
    } else if (
      !this.signalForgetWarned &&
      this.time - this.signalAt > 14 &&
      angleDiff(this.car.heading, this.signalHeading0) < 0.26
    ) {
      this.signalForgetWarned = true
      this.penalize('转向灯长时间未关闭', 5)
    }
  }

  updateCommon(dt) {
    const { car, world } = this
    this.hud.speed = kmh(car.speed)
    this.hud.gear = car.speed < -0.1 ? 'R' : Math.abs(car.speed) < 0.1 ? 'N' : 'D'
    this.stats.maxLatAccel = Math.max(this.stats.maxLatAccel, car.latAccel)

    const road = roadAt(world, car.x, car.y)
    this.currentRoad = road
    this.currentLane = road ? laneInfo(road, car.x, car.y) : null

    let offRoad = !road
    let cornerCross = false
    if (road) {
      const ci = this.currentLane
      const centerInIx = inIntersection(world, car.x, car.y)
      const centerInGap = inGap(world, car.x, car.y)
      for (const p of carCorners(car)) {
        const r2 = roadAt(world, p.x, p.y)
        if (!r2) {
          offRoad = true
          continue
        }
        if (r2 !== road || centerInIx || centerInGap) continue
        if (inGap(world, p.x, p.y)) continue
        const pc = laneInfo(r2, p.x, p.y)
        if (pc.side !== ci.side) cornerCross = true
      }
    }

    // 压路缘 / 冲出路面（去抖 + 冷却，避免一路蹭线刷屏）
    this.curbCooldown = Math.max(0, this.curbCooldown - dt)
    if (offRoad) {
      this.curbTimer += dt
      this.offRoadTime += dt
    } else {
      this.curbTimer = 0
      this.offRoadTime = 0
    }
    if (this.curbTimer > 0.35 && this.curbCooldown === 0) {
      this.penalize('车轮压路缘 / 出路面', 15)
      this.curbCooldown = 4
    }
    if (this.offRoadTime > 3) {
      this.finish('冲出场地')
      return
    }

    // 压中央双黄线
    this.midCooldown = Math.max(0, this.midCooldown - dt)
    if (cornerCross) {
      this.midTimer += dt
    } else {
      this.midTimer = 0
    }
    if (this.midTimer > 0.3 && this.midCooldown === 0) {
      this.penalize('压实线（跨对向双黄线）', 10)
      this.midCooldown = 4
    }

    // 逆行：所在车道行驶方向与车头相反
    this.wrongWayCooldown = Math.max(0, this.wrongWayCooldown - dt)
    if (road && Math.abs(car.speed) > 1 && !inIntersection(world, car.x, car.y)) {
      const dot = Math.cos(normAngle(car.heading - this.currentLane.dir))
      if (dot < -0.35) {
        this.wrongWayTimer += dt
      } else {
        this.wrongWayTimer = 0
      }
      if (this.wrongWayTimer > 1.5 && this.wrongWayCooldown === 0) {
        this.penalize('逆行', 15)
        this.wrongWayCooldown = 8
        this.wrongWayTimer = 0
      }
    }
  }

  update(dt) {
    if (this.finished) return
    this.time += dt
    this.updateSignal(dt)
    this.updateCommon(dt)
    if (!this.finished) this.tick(dt)
  }

  finish(reason) {
    if (this.finished) return
    this.finished = true
    this.endReason = reason
    this.result = this.buildResult()
    this.emit('finished', this.result)
  }

  buildResult() {
    const score = this.hud.score
    const grade = score >= 95 ? 'S' : score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D'
    const comments = []
    const rs = this.stats.uturnReversals
    if (rs.length) {
      const worst = Math.max(...rs)
      comments.push(
        worst === 0
          ? '掉头全是一把过，转弯半径的心里有数了 👍'
          : `掉头最多揉了 ${worst} 把方向，起步前多留一点余量就能一把过`
      )
    }
    comments.push(
      this.stats.maxLatAccel > 4.5
        ? '横向摆动偏大：方向打得急了，试着缓打缓回'
        : '方向控制平顺，打多少回多少的手感有了'
    )
    if (this.penalties.some((p) => p.text.includes('转向灯'))) {
      comments.push('转向灯时机可以再提前一点，灯先动、方向后动')
    }
    if (this.penalties.length === 0) {
      comments.push('全程零失误，这手感可以直接约考试了 🎉')
    }
    return {
      grade,
      score,
      reason: this.endReason,
      duration: this.time,
      penalties: this.penalties,
      comments,
      stats: this.stats
    }
  }

  // —— 各模式共用的路线规划 ——

  // 沿当前行驶方向找下一个路口（路口中心 + 距离），找不到返回 null
  nextIntersectionAhead() {
    const { car } = this
    const road = this.currentRoad
    if (!road) return null
    const d = cardinal(car.heading)
    if (road.axis === 'h' && d.y !== 0) return null
    if (road.axis === 'v' && d.x !== 0) return null
    const cross = road.axis === 'h' ? this.world.vRoads : this.world.hRoads
    let best = null
    for (const r of cross) {
      const c = road.axis === 'h' ? r.cx : r.cy
      const along = road.axis === 'h' ? car.x : car.y
      const forward = (c - along) * (road.axis === 'h' ? d.x : d.y)
      if (forward > 30 && (!best || forward < best.dist)) {
        best = {
          dist: forward,
          x: road.axis === 'h' ? c : road.cx,
          y: road.axis === 'h' ? road.cy : c
        }
      }
    }
    return best
  }

  // 当前路上前方最近的掉头缺口
  nextGapAhead() {
    const { car } = this
    const road = this.currentRoad
    if (!road || !road.gaps?.length) return null
    const d = cardinal(car.heading)
    if (road.axis === 'h' && d.y !== 0) return null
    if (road.axis === 'v' && d.x !== 0) return null
    const along = road.axis === 'h' ? car.x : car.y
    const sign = road.axis === 'h' ? d.x : d.y
    let best = null
    for (const g of road.gaps) {
      const forward = (g.x - along) * sign
      if (forward > 10 && (!best || forward < best.dist)) {
        best = { gap: g, dist: forward }
      }
    }
    return best
  }

  drawExtras(ctx) {}
  tick(dt) {}
}

// —— 任务评价器：返回 true 表示该任务完成 ——

function evalLane(session, task, dt) {
  const { car } = session
  const road = session.currentRoad
  if (!road) return false
  const ci = session.currentLane
  task.maxLat = Math.max(task.maxLat || 0, car.latAccel)

  // 车道序号变化即视为跨线，记录当时转向灯是否合规
  if (ci.laneIndex !== task.lastLane) {
    if (task.lastLane !== undefined && !task.crossSignalOk) {
      task.crossSignalOk =
        session.signal === task.signalSide && session.hud.signalAge >= 1.0
    }
    task.lastLane = ci.laneIndex
  }

  session.hud.taskText = `${task.signalSide === 'left' ? '⬅' : '➡'} 请变道至${DIR_TEXT[task.signalSide]}侧车道`
  session.hud.taskHint = '提前开转向灯，缓打方向缓回正'

  if (ci.laneIndex === task.target) {
    const centerLat = laneCenterLat(ci.side, task.target)
    if (Math.abs(ci.lat - centerLat) < 0.9) {
      task.stable = (task.stable || 0) + dt
    } else {
      task.stable = 0
    }
    if (task.stable > 0.8) {
      if (!task.crossSignalOk) session.penalize('变道未提前开启转向灯', 10)
      if (task.maxLat > 4.5) session.penalize('变道过猛，方向打得太急', 5)
      return true
    }
  } else {
    task.stable = 0
  }
  return false
}

function evalTurn(session, task, dt) {
  const { car, world } = session
  const target = task.intersection
  if (!target) return false
  const dist = Math.hypot(target.x - car.x, target.y - car.y)

  if (task.phase === 'approach') {
    session.hud.taskText = `${task.dir === 'left' ? '↰' : '↱'} 前方路口${DIR_TEXT[task.dir]}转`
    session.hud.taskHint = `距路口 ${Math.max(0, Math.round(dist))} 米 · 应提前进入${task.dir === 'left' ? '最左' : '最右'}车道`
    if (!task.laneChecked && dist < 25) {
      task.laneChecked = true
      const want = task.dir === 'left' ? 0 : session.world.roads[0].lanesPerDir - 1
      const ci = session.currentLane
      if (ci && ci.laneIndex !== want) {
        session.penalize('未按导向车道转弯', 10)
      }
    }
    if (inIntersection(world, car.x, car.y)) {
      task.phase = 'crossing'
      task.entryHeading = car.heading
      const wantSignal = task.dir
      if (!(session.signal === wantSignal && session.hud.signalAge >= 1.0)) {
        session.penalize(`转弯未提前打${DIR_TEXT[task.dir]}转向灯`, 10)
      }
    }
    return false
  }

  if (task.phase === 'crossing') {
    session.hud.taskHint = '弯中控制车速，回正后转向灯自动回位'
    if (Math.abs(car.speed) > 8.5 && !task.speedPenalized) {
      task.speedPenalized = true
      session.penalize('转弯车速过快（超过 30km/h）', 10)
    }
    task.stuck = (task.stuck || 0) + dt
    if (!inIntersection(world, car.x, car.y)) {
      task.phase = 'exiting'
      task.exitHeading = car.heading
    } else if (task.stuck > 20) {
      session.penalize('在路口内长时间滞留', 10)
      task.stuck = 0
    }
    return false
  }

  if (task.phase === 'exiting') {
    const expected = normAngle(task.entryHeading + (task.dir === 'left' ? -Math.PI / 2 : Math.PI / 2))
    if (dist > 30) {
      const ok = angleDiff(car.heading, expected) < 0.5
      const straight = angleDiff(car.heading, task.entryHeading) < 0.35
      if (!ok) {
        session.penalize(straight ? '未按指令转弯（错过路口）' : '转弯方向错误', 25)
      } else {
        const ci = session.currentLane
        const want = task.dir === 'left' ? 0 : session.world.roads[0].lanesPerDir - 1
        if (ci && ci.laneIndex !== want) {
          session.penalize(`转弯后未驶入${task.dir === 'left' ? '内侧' : '外侧'}车道`, 10)
        }
      }
      return true
    }
    return false
  }
  return false
}

function evalUturn(session, task, dt) {
  const { car, world } = session
  const g = task.gap
  if (!g) return false
  const road = g.road
  const along = road.axis === 'h' ? car.x : car.y
  const forwardSign = task.forwardSign

  if (task.phase === 'approach') {
    const dist = (g.x - along) * forwardSign
    session.hud.taskText = '🔄 前方缺口掉头'
    session.hud.taskHint = `距掉头区 ${Math.max(0, Math.round(dist))} 米 · 开左转向灯并减速`
    // 只在任务刚开始时记录出发侧，之后每帧对比才能发现跨线
    if (task.side === undefined && session.currentLane) {
      task.side = session.currentLane.side
    }
    if (dist < -20) {
      session.penalize('错过掉头区', 20)
      return true
    }
    // 车中心跨越中线：记录位置、车速、转向灯
    const nowSide = laneInfo(road, car.x, car.y).side
    if (task.side !== undefined && nowSide !== task.side) {
      task.phase = 'rotating'
      task.entryHeading = car.heading
      if (Math.abs(along - g.x) > g.w / 2 + 5) {
        session.penalize('掉头位置不当（不在缺口内）', 15)
      }
      if (Math.abs(car.speed) > 3.5) {
        session.penalize('掉头车速过快', 10)
      }
      if (!(session.signal === 'left' && session.hud.signalAge >= 1.0)) {
        session.penalize('掉头未提前打左转向灯', 10)
      }
    }
    return false
  }

  if (task.phase === 'rotating') {
    session.hud.taskHint = '一把过不了就前进倒车再揉一把，别硬拧'
    // 统计倒车段数 = 揉了几把方向
    const reversing = car.speed < -0.2
    if (reversing && !task.inReverse) {
      task.inReverse = true
      task.reverseSegs = (task.reverseSegs || 0) + 1
    } else if (!reversing) {
      task.inReverse = false
    }
    const targetHeading = normAngle(task.entryHeading + Math.PI)
    const ci = session.currentLane
    if (
      angleDiff(car.heading, targetHeading) < 0.35 &&
      ci &&
      ci.side === -task.side &&
      roadAt(world, car.x, car.y) === road
    ) {
      task.stable = (task.stable || 0) + dt
      if (task.stable > 0.8) {
        session.stats.uturnReversals.push(Math.max(0, (task.reverseSegs || 0) - 1))
        if (!task.reverseSegs || task.reverseSegs <= 1) {
          session.praise('掉头一把过，方向很准 👍')
        }
        return true
      }
    } else {
      task.stable = 0
      // 掉头失败保护：已经开过去了却还没转过来
      if ((along - g.x) * forwardSign > 45) {
        session.penalize('掉头失败，车辆越过了掉头区', 20)
        return true
      }
    }
    return false
  }
  return false
}

function evalFinish(session, task) {
  const { car } = session
  const passed =
    (car.x - task.line.x) * task.lineDir.x + (car.y - task.line.y) * task.lineDir.y > 0
  session.hud.taskText = '🏁 直行通过前方终点线'
  session.hud.taskHint = '保持车道，稳住方向冲线'
  if (passed) {
    session.finish('到达终点')
    return true
  }
  return false
}

// —— 各模式会话 ——

class LaneSession extends BaseSession {
  constructor() {
    const road = makeRoad('h', 1200, 0, 2400, 3)
    const world = buildWorld([road], [])
    const car = createCar(30, laneCenterLat(1, 1), 0)
    super('lane', world, car)
    this.total = 6
    this.done = 0
    this.planTask()
  }

  planTask() {
    const ci = this.currentLane || laneInfo(this.world.roads[0], this.car.x, this.car.y)
    let target = ci.laneIndex + (Math.random() < 0.5 ? -1 : 1)
    target = clamp(target, 0, 2)
    if (target === ci.laneIndex) target = ci.laneIndex === 0 ? 1 : ci.laneIndex - 1
    this.task = {
      type: 'lane',
      target,
      signalSide: target < ci.laneIndex ? 'left' : 'right',
      lastLane: ci.laneIndex,
      stable: 0,
      maxLat: 0
    }
    this.hud.progressText = `第 ${this.done + 1}/${this.total} 次变道`
  }

  tick(dt) {
    if (this.car.x > 2350) {
      this.finish('路线结束')
      return
    }
    if (evalLane(this, this.task, dt)) {
      this.done++
      this.praise(`变道完成 ${this.done}/${this.total}`)
      if (this.done >= this.total) {
        this.finish('全部变道完成')
      } else {
        this.planTask()
      }
    }
  }

  drawExtras(ctx) {
    // 目标车道高亮带
    const task = this.task
    if (!task) return
    const road = this.world.roads[0]
    const side = this.currentLane ? this.currentLane.side : 1
    const y0 = laneCenterLat(side, task.target) - LANE_W / 2
    const x0 = Math.max(road.x0 + 2, this.car.x - 10)
    ctx.fillStyle = 'rgba(80, 220, 130, 0.18)'
    ctx.fillRect(x0, y0, 120, LANE_W)
    ctx.strokeStyle = 'rgba(80, 220, 130, 0.55)'
    ctx.lineWidth = 0.25
    ctx.strokeRect(x0, y0, 120, LANE_W)
  }
}

// 车身与所在道路是否已平行（错过后车身常是斜的，等回正再规划下一个任务）
function isAligned(session) {
  const road = session.currentRoad
  if (!road) return true
  const d = cardinal(session.car.heading)
  return road.axis === 'h' ? Math.abs(d.x) >= Math.abs(d.y) : Math.abs(d.y) >= Math.abs(d.x)
}

class TurnSession extends BaseSession {
  constructor() {
    super('turn', gridWorld(), createCar(-330, laneCenterLat(1, 1), 0))
    this.total = 6
    this.done = 0
    this.planTask()
  }

  planTask() {
    if (!isAligned(this)) {
      this.task = { type: 'wait' }
      this.hud.taskText = '🧭 顺道路方向行驶'
      this.hud.taskHint = '把车身回正，继续完成任务'
      return
    }
    const dir = Math.random() < 0.5 ? 'left' : 'right'
    const ix = this.nextIntersectionAhead()
    if (ix) {
      this.task = { type: 'turn', dir, intersection: ix, phase: 'approach' }
    } else {
      // 前方没有路口了（错过太远或开到路端）：安排缺口掉头补救
      const gap = this.nextGapAhead()
      if (gap) {
        const d = cardinal(this.car.heading)
        this.task = {
          type: 'uturn',
          gap: gap.gap,
          forwardSign: d.x || d.y || 1,
          phase: 'approach'
        }
      } else {
        this.finish('冲出场地')
      }
    }
    this.hud.progressText = `第 ${Math.min(this.done + 1, this.total)}/${this.total} 个弯`
  }

  tick(dt) {
    const task = this.task
    if (task.type === 'wait') {
      if (isAligned(this)) this.planTask()
      return
    }
    let done = false
    if (task.type === 'turn') {
      // 目标路口被甩在身后且远离 → 视为错过
      const t = task.intersection
      const behind =
        (t.x - this.car.x) * cardinal(this.car.heading).x +
        (t.y - this.car.y) * cardinal(this.car.heading).y
      if (task.phase !== 'exiting' && behind < -55) {
        this.penalize('未按指令转弯（错过路口）', 25)
        done = true
      } else {
        done = evalTurn(this, task, dt)
      }
    } else if (task.type === 'uturn') {
      done = evalUturn(this, task, dt)
    }
    if (done) {
      if (task.type === 'turn') {
        this.done++
        this.praise(`转弯完成 ${this.done}/${this.total}`)
        if (this.done >= this.total) {
          this.finish('全部转弯完成')
          return
        }
      }
      this.planTask()
    }
  }

  drawExtras(ctx) {
    const task = this.task
    if (!task || task.type !== 'turn' || !task.intersection) return
    const { x, y } = task.intersection
    const d = cardinal(this.car.heading)
    // 路口前的地面导向箭头：短直线 + 弯头
    const sx = x - d.x * 26
    const sy = y - d.y * 26
    const turnSign = task.dir === 'left' ? -1 : 1
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(sx - d.x * 12, sy - d.y * 12)
    ctx.lineTo(sx, sy)
    const perp = { x: -d.y * turnSign, y: d.x * turnSign }
    const ex = sx + perp.x * 12
    const ey = sy + perp.y * 12
    ctx.quadraticCurveTo(sx + d.x * 7 + perp.x * 2, sy + d.y * 7 + perp.y * 2, ex, ey)
    ctx.stroke()
    const head = 2.6
    const hx = ex + perp.x * head
    const hy = ey + perp.y * head
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(ex - perp.y * 1.1 + d.x * 1.6, ey + perp.x * 1.1 + d.y * 1.6)
    ctx.lineTo(ex + perp.y * 1.1 + d.x * 1.6, ey - perp.x * 1.1 + d.y * 1.6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

class UturnSession extends BaseSession {
  constructor() {
    // 单向三车道：掉头半径不够时有余量，不容易扫到路缘
    const road = makeRoad('h', 1100, 0, 2200, 3)
    // 车从路中间出发，两侧都有缺口，来回掉头都能找到目标
    const world = buildWorld(
      [road],
      Array.from({ length: 14 }, (_, i) => 60 + i * 160).map((x) => ({ road, x, w: 14 }))
    )
    super('uturn', world, createCar(1100, laneCenterLat(1, 0), 0))
    this.total = 3
    this.done = 0
    this.planTask()
  }

  planTask() {
    const ahead = this.nextGapAhead()
    if (!ahead) {
      this.finish('冲出场地')
      return
    }
    this.task = {
      type: 'uturn',
      gap: ahead.gap,
      forwardSign: cardinal(this.car.heading).x || 1,
      phase: 'approach'
    }
    this.hud.progressText = `第 ${this.done + 1}/${this.total} 次掉头`
  }

  tick(dt) {
    if (this.car.x < 20 || this.car.x > 2180) {
      this.finish('路线结束')
      return
    }
    if (evalUturn(this, this.task, dt)) {
      this.done++
      this.praise(`掉头完成 ${this.done}/${this.total}`)
      if (this.done >= this.total) {
        this.finish('全部掉头完成')
      } else {
        this.planTask()
      }
    }
  }

  drawExtras(ctx) {
    const task = this.task
    if (!task || task.phase !== 'approach') return
    const g = task.gap
    const pulse = 3 + Math.sin(this.time * 4) * 0.6
    ctx.strokeStyle = 'rgba(120, 200, 255, 0.8)'
    ctx.lineWidth = 0.35
    ctx.beginPath()
    ctx.arc(g.x, g.road.cy, pulse, 0, Math.PI * 2)
    ctx.stroke()
  }
}

class CourseSession extends BaseSession {
  constructor() {
    super('course', gridWorld(), createCar(-430, laneCenterLat(1, 1), 0))
    this.script = [
      { type: 'lane', target: 0 },
      { type: 'turn', dir: 'right' },
      { type: 'lane', target: 0 },
      { type: 'turn', dir: 'left' },
      { type: 'uturn' },
      { type: 'turn', dir: 'right' },
      { type: 'finish' }
    ]
    this.index = 0
    this.task = null
    this.planTask()
  }

  planTask() {
    const step = this.script[this.index]
    if (!step) {
      this.finish('路线完成')
      return
    }
    if (!isAligned(this)) {
      this.task = { type: 'wait' }
      this.hud.taskText = '🧭 顺道路方向行驶'
      this.hud.taskHint = '把车身回正，继续完成任务'
      return
    }
    this.hud.progressText = `第 ${this.index + 1}/${this.script.length} 项`
    // 构造函数里 updateCommon 还没跑过，直接按几何取当前车道
    const road = this.currentRoad || roadAt(this.world, this.car.x, this.car.y)
    const ci = road ? laneInfo(road, this.car.x, this.car.y) : null
    if (step.type === 'lane') {
      let target = step.target
      if (ci && target === ci.laneIndex) {
        target = target === 0 ? 1 : 0
      }
      this.task = {
        type: 'lane',
        target,
        signalSide: ci && target < ci.laneIndex ? 'left' : 'right',
        lastLane: ci?.laneIndex,
        stable: 0,
        maxLat: 0
      }
    } else if (step.type === 'turn') {
      const ix = this.nextIntersectionAhead()
      if (ix) {
        this.task = { type: 'turn', dir: step.dir, intersection: ix, phase: 'approach' }
      } else {
        // 没有路口就先掉头补救，这一步顺延
        const gap = this.nextGapAhead()
        if (gap) {
          this.task = {
            type: 'uturn',
            gap: gap.gap,
            forwardSign: cardinal(this.car.heading).x || cardinal(this.car.heading).y || 1,
            side: ci?.side,
            phase: 'approach'
          }
        } else {
          this.finish('冲出场地')
        }
      }
    } else if (step.type === 'uturn') {
      const gap = this.nextGapAhead()
      if (gap) {
        this.task = {
          type: 'uturn',
          gap: gap.gap,
          forwardSign:
            cardinal(this.car.heading).x || cardinal(this.car.heading).y || 1,
          side: ci?.side,
          phase: 'approach'
        }
      } else {
        this.finish('冲出场地')
      }
    } else if (step.type === 'finish') {
      const d = cardinal(this.car.heading)
      let line
      if (road) {
        const alongNow = road.axis === 'h' ? this.car.x : this.car.y
        const sign = (road.axis === 'h' ? d.x : d.y) || 1
        const limit = road.axis === 'h' ? [road.x0, road.x1] : [road.y0, road.y1]
        const raw = alongNow + sign * 150
        const clamped = sign > 0 ? Math.min(raw, limit[1] - 8) : Math.max(raw, limit[0] + 8)
        line = road.axis === 'h' ? { x: clamped, y: road.cy } : { x: road.cx, y: clamped }
      } else {
        line = { x: this.car.x + d.x * 150, y: this.car.y + d.y * 150 }
      }
      this.task = { type: 'finish', line, lineDir: d, road }
    }
  }

  tick(dt) {
    const task = this.task
    if (!task) return
    if (task.type === 'wait') {
      if (isAligned(this)) this.planTask()
      return
    }
    let done = false
    if (task.type === 'lane') {
      done = evalLane(this, task, dt)
    } else if (task.type === 'turn') {
      const t = task.intersection
      const behind =
        (t.x - this.car.x) * cardinal(this.car.heading).x +
        (t.y - this.car.y) * cardinal(this.car.heading).y
      if (task.phase !== 'exiting' && behind < -55) {
        this.penalize('未按指令转弯（错过路口）', 25)
        done = true
      } else {
        done = evalTurn(this, task, dt)
      }
    } else if (task.type === 'uturn') {
      done = evalUturn(this, task, dt)
    } else if (task.type === 'finish') {
      done = evalFinish(this, task)
    }
    if (done) {
      this.index++
      this.planTask()
    }
  }

  drawExtras(ctx) {
    const task = this.task
    if (!task) return
    if (task.type === 'finish' && task.line && task.road) {
      drawFinishLine(ctx, task)
    }
    if (task.type === 'lane') {
      const road = this.currentRoad
      if (!road) return
      const ci = this.currentLane
      const side = ci?.side ?? 1
      const pos = laneCenterLat(side, task.target)
      const isH = road.axis === 'h'
      const a0 = Math.max((isH ? road.x0 : road.y0) + 2, (isH ? this.car.x : this.car.y) - 10)
      ctx.fillStyle = 'rgba(80, 220, 130, 0.18)'
      if (isH) {
        ctx.fillRect(a0, pos - LANE_W / 2, 120, LANE_W)
      } else {
        ctx.fillRect(pos - LANE_W / 2, a0, LANE_W, 120)
      }
    }
    if (task.type === 'uturn' && task.phase === 'approach') {
      const g = task.gap
      const pulse = 3 + Math.sin(this.time * 4) * 0.6
      ctx.strokeStyle = 'rgba(120, 200, 255, 0.8)'
      ctx.lineWidth = 0.35
      ctx.beginPath()
      ctx.arc(g.x, g.road.cy, pulse, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

function drawFinishLine(ctx, task) {
  const { line, road } = task
  ctx.save()
  ctx.translate(line.x, line.y)
  // 基础画法是"沿 y 方向铺满路宽、x 方向两格厚"的横带，垂直路需转 90°
  if (road.axis === 'v') {
    ctx.rotate(Math.PI / 2)
  }
  const half = road.half
  const cell = 1.1
  for (let y = -half; y < half; y += cell) {
    for (let k = 0; k < 2; k++) {
      const dark = (Math.floor((y + half) / cell) + k) % 2 === 0
      ctx.fillStyle = dark ? '#2b2f36' : '#f1f3f5'
      ctx.fillRect(-1.1 + k * cell, y, cell, cell)
    }
  }
  ctx.restore()
}

export const SESSION_FACTORIES = {
  lane: LaneSession,
  turn: TurnSession,
  uturn: UturnSession,
  course: CourseSession
}

export function createSession(modeId) {
  const Factory = SESSION_FACTORIES[modeId]
  return Factory ? new Factory() : null
}
