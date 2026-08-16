// 车辆物理：简化的自行车模型（运动学），世界单位一律为米、弧度
// 设计目标是"找手感"：方向盘打多少回多少、松手自动回正、高速大角度推头

export const CAR_SPEC = {
  length: 4.6,
  width: 1.86,
  wheelBase: 2.75, // 轴距
  maxWheelDeg: 540, // 方向盘单边打满（约一圈半）
  maxSteerDeg: 34, // 前轮单边最大转角
  wheelRate: 340, // 按住方向时打轮速度 deg/s
  wheelReturnRate: 280, // 松手回正速度 deg/s
  engineAccel: 3.6, // 油门加速度 m/s²
  brakeDecel: 6.8, // 刹车减速度 m/s²
  reverseAccel: 2.0,
  dragDecel: 0.7, // 滑行阻力
  maxSpeed: 25, // m/s ≈ 90km/h
  reverseMax: 4.5,
  gripLatAccel: 8.0 // 轮胎横向抓地上限 m/s²，超出即推头衰减
}

export const RAD = Math.PI / 180

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

// 把角度归一到 (-π, π]
export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a <= -Math.PI) a += Math.PI * 2
  return a
}

export function angleDiff(a, b) {
  return Math.abs(normAngle(a - b))
}

export function createCar(x, y, headingDeg) {
  return {
    x,
    y,
    heading: headingDeg * RAD,
    speed: 0, // m/s，负值为倒车
    wheelDeg: 0, // 方向盘当前角度，左负右正
    steer: 0, // 前轮等效转角（弧度）
    slipping: false, // 是否超出抓地上限（推头）
    latAccel: 0 // 当前横向加速度 m/s²，用于平顺度评估
  }
}

// input: { steer: -1|0|1, throttle: 0|1, brake: 0|1 }
export function updateCar(car, input, dt) {
  const s = CAR_SPEC

  if (input.steer < 0) {
    car.wheelDeg = Math.max(-s.maxWheelDeg, car.wheelDeg - s.wheelRate * dt)
  } else if (input.steer > 0) {
    car.wheelDeg = Math.min(s.maxWheelDeg, car.wheelDeg + s.wheelRate * dt)
  } else {
    const back = s.wheelReturnRate * dt
    car.wheelDeg = car.wheelDeg > 0
      ? Math.max(0, car.wheelDeg - back)
      : Math.min(0, car.wheelDeg + back)
  }

  car.steer = (car.wheelDeg / s.maxWheelDeg) * s.maxSteerDeg * RAD

  if (input.throttle > 0) {
    // 倒车中踩油门先减速回正再前进
    const a = car.speed < 0 ? s.brakeDecel : s.engineAccel
    car.speed = Math.min(s.maxSpeed, car.speed + a * dt)
  }
  if (input.brake > 0) {
    if (car.speed > 0.05) {
      car.speed = Math.max(0, car.speed - s.brakeDecel * dt)
    } else {
      // 停稳后继续按即为倒车（掉头揉把需要它）
      car.speed = Math.max(-s.reverseMax, car.speed - s.reverseAccel * dt)
    }
  }
  const drag = s.dragDecel * dt
  car.speed = car.speed > 0
    ? Math.max(0, car.speed - drag)
    : Math.min(0, car.speed + drag)

  // 横向加速度 v²/R 超出抓地上限时按上限衰减前轮角，模拟推头
  let steerEff = car.steer
  car.slipping = false
  car.latAccel = 0
  const v = Math.abs(car.speed)
  if (v > 0.5 && Math.abs(steerEff) > 1e-4) {
    const r = s.wheelBase / Math.tan(Math.abs(steerEff))
    let lat = (v * v) / r
    if (lat > s.gripLatAccel) {
      const rGrip = (v * v) / s.gripLatAccel
      steerEff = Math.sign(steerEff) * Math.atan(s.wheelBase / rGrip)
      lat = s.gripLatAccel
      car.slipping = true
    }
    car.latAccel = lat
  }

  car.heading = normAngle(car.heading + (car.speed / s.wheelBase) * Math.tan(steerEff) * dt)
  car.x += Math.cos(car.heading) * car.speed * dt
  car.y += Math.sin(car.heading) * car.speed * dt
}

// 车身四角的世界坐标，用于压线 / 出路面判定
export function carCorners(car) {
  const hl = CAR_SPEC.length / 2
  const hw = CAR_SPEC.width / 2
  const cos = Math.cos(car.heading)
  const sin = Math.sin(car.heading)
  return [
    [hl, -hw],
    [hl, hw],
    [-hl, hw],
    [-hl, -hw]
  ].map(([fx, fy]) => ({
    x: car.x + fx * cos - fy * sin,
    y: car.y + fx * sin + fy * cos
  }))
}

export function kmh(speed) {
  return speed * 3.6
}
