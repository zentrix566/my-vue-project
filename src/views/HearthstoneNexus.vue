<script setup>
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'

// 魔网机制（已与需求确认）：
// - 每次触发射出一发伤害，大小 = 法强 d
// - 每发随机选一个还活着的敌方怪，打它；超出该怪当前血量的部分溢出到英雄脸上
// - 怪被打死后不再被选中；场上没有怪时，整发直接打脸
// - 总共触发 T 次
// 想要的结论：给定法强、触发次数、各怪血量，脸上能吃到多少伤害（期望 / 运气最好 / 运气最差 / 分布）

const spellPower = ref(5) // 法强 d，也就是单发伤害
const triggers = ref(5) // 触发次数 T
const minionInputs = ref([1, 8]) // 场上每个怪的血量
const trials = 40000 // 蒙特卡洛模拟次数

// 清洗输入：只保留正整数血量的怪
const minions = computed(() =>
  minionInputs.value
    .map((h) => Math.floor(Number(h)))
    .filter((h) => Number.isFinite(h) && h > 0)
)

const d = computed(() => Math.max(0, Math.floor(Number(spellPower.value)) || 0))
const T = computed(() => Math.max(0, Math.floor(Number(triggers.value)) || 0))
const totalDamage = computed(() => d.value * T.value)

function addMinion() {
  minionInputs.value.push(1)
}

function removeMinion(i) {
  minionInputs.value.splice(i, 1)
}

// 理论最大脸伤（运气 / 操作最好）：
// 总伤害固定 = T*d，脸伤 = 总伤害 - 被怪吸收的血。要最大化脸伤就要让吸收最少、溢出最多。
// 一个怪若被击杀，恰好吸收它的满血 hp，击杀那发溢出 (ceil(hp/d)*d - hp)；用 ceil(hp/d) 发击杀。
// 选哪些怪去击杀是 0/1 背包：容量 = 触发次数，重量 = 击杀所需发数，价值 = 溢出。
// 若发数足够杀光全部怪，剩余发数全打脸，脸伤 = T*d - 所有怪满血之和。
function exactMaxFace(dd, tt, hps) {
  if (dd <= 0 || tt <= 0) return 0
  const sumHp = hps.reduce((a, b) => a + b, 0)
  const cost = hps.map((h) => Math.ceil(h / dd)) // 击杀所需发数
  const overflow = hps.map((h, i) => cost[i] * dd - h) // 击杀该怪产生的溢出
  const totalCost = cost.reduce((a, b) => a + b, 0)

  const cap = Math.min(tt, totalCost)
  const dp = new Array(cap + 1).fill(0)
  for (let i = 0; i < hps.length; i++) {
    for (let w = cap; w >= cost[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - cost[i]] + overflow[i])
    }
  }
  let best = dp[cap] // 杀部分怪能拿到的最大溢出
  if (tt >= totalCost) {
    // 能杀光：剩余发数全打脸
    best = Math.max(best, tt * dd - sumHp)
  }
  return best
}

// 理论最小脸伤（运气 / 操作最差）：
// 尽量把伤害“干净”地灌进怪里不产生溢出。每个怪能干净吸收 floor(hp/d) 发（每发吃满 d 不溢出）。
// 干净发数够用（T 不超过），脸伤为 0；超出后被迫击杀残血怪产生溢出，挑残血最高的先杀（溢出最小）。
function exactMinFace(dd, tt, hps) {
  if (dd <= 0 || tt <= 0) return 0
  const cleanCap = hps.reduce((a, h) => a + Math.floor(h / dd), 0)
  if (tt <= cleanCap) return 0

  let extra = tt - cleanCap
  const remainders = hps
    .map((h) => h % dd)
    .filter((r) => r > 0)
    .sort((a, b) => b - a) // 残血从高到低，先杀残血高的以减小溢出
  const kills = Math.min(extra, remainders.length)

  let face = 0
  for (let i = 0; i < kills; i++) face += dd - remainders[i]
  extra -= kills
  if (extra > 0) face += extra * dd // 怪全清空，剩余发数整发打脸
  return face
}

// 蒙特卡洛：按“随机选怪、溢出到脸”的真实规则跑大量样本，得到期望、分布、清场概率
function monteCarlo(dd, tt, hps, runs) {
  if (dd <= 0 || tt <= 0) {
    return { mean: 0, clearProb: hps.length === 0 ? 1 : 0, dist: [[0, 1]], min: 0, max: 0 }
  }
  const counts = new Map()
  let sum = 0
  let clears = 0

  for (let t = 0; t < runs; t++) {
    const arr = hps.slice()
    let alive = arr.length
    let face = 0
    for (let i = 0; i < tt; i++) {
      if (alive === 0) {
        face += dd
        continue
      }
      let pick = Math.floor(Math.random() * alive)
      let idx = -1
      for (let j = 0; j < arr.length; j++) {
        if (arr[j] > 0) {
          if (pick === 0) {
            idx = j
            break
          }
          pick--
        }
      }
      if (dd >= arr[idx]) {
        face += dd - arr[idx]
        arr[idx] = 0
        alive--
      } else {
        arr[idx] -= dd
      }
    }
    if (alive === 0) clears++
    sum += face
    counts.set(face, (counts.get(face) || 0) + 1)
  }

  const dist = [...counts.entries()].sort((a, b) => a[0] - b[0])
  return {
    mean: sum / runs,
    clearProb: clears / runs,
    dist,
    min: dist[0][0],
    max: dist[dist.length - 1][0]
  }
}

// 触发计算：法强/触发次数/怪血量任一改变都重新算
const result = computed(() => {
  const dd = d.value
  const tt = T.value
  const hps = minions.value
  const maxFace = exactMaxFace(dd, tt, hps)
  const minFace = exactMinFace(dd, tt, hps)
  const mc = monteCarlo(dd, tt, hps, trials)
  return { maxFace, minFace, mc }
})

const expected = computed(() => result.value.mc.mean)
const clearPercent = computed(() => Math.round(result.value.mc.clearProb * 1000) / 10)

// 分布直方图：把每个脸伤值的概率算成条形宽度
const histogram = computed(() => {
  const dist = result.value.mc.dist
  const maxCount = dist.reduce((m, [, c]) => Math.max(m, c), 1)
  return dist.map(([face, count]) => ({
    face,
    prob: count / trials,
    width: (count / maxCount) * 100
  }))
})

// 给一句随场景变化的结论
const conclusion = computed(() => {
  const hps = minions.value
  if (hps.length === 0) {
    return `场上没有怪，每一发都直接打脸：脸伤恒为 ${totalDamage.value} 点（= 法强 × 触发次数）。`
  }
  const sumHp = hps.reduce((a, b) => a + b, 0)
  if (totalDamage.value <= 0) {
    return '请填入大于 0 的法强与触发次数。'
  }
  if (result.value.minFace === 0) {
    return `怪的总血量（${sumHp}）能吃下大部分伤害，运气差时脸伤可能为 0；运气好时最多 ${result.value.maxFace} 点。要稳定打脸，先想办法少留 / 清掉敌方怪。`
  }
  return `无论怎么随机，脸至少吃 ${result.value.minFace} 点、最多 ${result.value.maxFace} 点；平均约 ${expected.value.toFixed(1)} 点。怪越少、单怪血量越低（尤其低于法强），溢出到脸的伤害越多。`
})
</script>

<template>
  <main class="nexus">
    <header class="top">
      <RouterLink to="/" class="back">← 返回主页</RouterLink>
      <h1>炉石魔网 · 脸伤计算器</h1>
      <p class="subtitle">
        每次触发射出一发=法强的伤害，随机砸一个怪，超出怪血量的部分溢出到脸上。算出脸上能吃多少伤害。
      </p>
    </header>

    <section class="panel">
      <div class="fields">
        <label class="field">
          <span>法强（单发伤害）</span>
          <input v-model.number="spellPower" type="number" min="0" />
        </label>
        <label class="field">
          <span>触发次数</span>
          <input v-model.number="triggers" type="number" min="0" />
        </label>
        <div class="field total">
          <span>总伤害</span>
          <strong>{{ totalDamage }}</strong>
        </div>
      </div>

      <div class="minions">
        <div class="minions-head">
          <span>场上敌方怪的血量</span>
          <button class="ghost" @click="addMinion">＋ 加一个怪</button>
        </div>
        <div class="minion-list" v-if="minionInputs.length">
          <div class="minion-item" v-for="(m, i) in minionInputs" :key="i">
            <input v-model.number="minionInputs[i]" type="number" min="1" />
            <button class="del" @click="removeMinion(i)" title="移除">✕</button>
          </div>
        </div>
        <p class="empty-hint" v-else>当前没有怪，所有伤害直接打脸。</p>
      </div>
    </section>

    <section class="stats">
      <div class="stat">
        <span class="stat-label">期望脸伤</span>
        <strong class="stat-num primary">{{ expected.toFixed(1) }}</strong>
        <span class="stat-sub">{{ trials.toLocaleString() }} 次模拟平均</span>
      </div>
      <div class="stat">
        <span class="stat-label">运气最好（理论最大）</span>
        <strong class="stat-num good">{{ result.maxFace }}</strong>
        <span class="stat-sub">每发都打出最大溢出</span>
      </div>
      <div class="stat">
        <span class="stat-label">运气最差（理论最小）</span>
        <strong class="stat-num bad">{{ result.minFace }}</strong>
        <span class="stat-sub">伤害尽量被怪吃掉</span>
      </div>
      <div class="stat">
        <span class="stat-label">清场概率</span>
        <strong class="stat-num">{{ clearPercent }}%</strong>
        <span class="stat-sub">怪被全部打死的概率</span>
      </div>
    </section>

    <section class="chart" v-if="histogram.length">
      <h2>脸伤概率分布</h2>
      <div class="bars">
        <div class="bar-row" v-for="h in histogram" :key="h.face">
          <span class="bar-face">{{ h.face }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: h.width + '%' }"></div>
          </div>
          <span class="bar-prob">{{ (h.prob * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </section>

    <section class="note">
      <p>{{ conclusion }}</p>
      <ul>
        <li>总伤害固定 = 法强 × 触发次数，脸伤 = 总伤害 − 被怪吃掉的血。</li>
        <li>单怪血量 ≤ 法强时，一发就能打死并把多的溢出到脸；血量越低溢出越多。</li>
        <li>目标随机不可控，所以能控的是“留多少怪、单怪多少血”——怪越少、越脆，期望脸伤越高。</li>
      </ul>
    </section>

    <footer class="foot">© 2026 zentrix566</footer>
  </main>
</template>

<style scoped>
.nexus {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 24px 64px;
}

.back {
  font-size: 14px;
}

.top h1 {
  margin: 14px 0 8px;
  font-size: 30px;
}

.subtitle {
  margin: 0 0 8px;
  color: var(--color-muted);
  line-height: 1.6;
}

.panel {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 22px;
  margin-top: 20px;
}

.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--color-muted);
}

.field input {
  width: 130px;
  padding: 8px 10px;
  font-size: 16px;
  border: 1px solid #dcd6c8;
  border-radius: 8px;
  background: #fffdf8;
}

.field.total {
  margin-left: auto;
  text-align: right;
}

.field.total strong {
  font-size: 24px;
  color: var(--color-text);
}

.minions {
  margin-top: 22px;
  border-top: 1px dashed #e2dccd;
  padding-top: 18px;
}

.minions-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--color-muted);
}

.minion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.minion-item {
  position: relative;
  display: flex;
  align-items: center;
}

.minion-item input {
  width: 78px;
  padding: 8px 26px 8px 10px;
  font-size: 15px;
  border: 1px solid #dcd6c8;
  border-radius: 8px;
  background: #fffdf8;
}

.del {
  position: absolute;
  right: 6px;
  border: none;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 12px;
}

.del:hover {
  color: var(--color-danger);
}

.ghost {
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: transparent;
  padding: 5px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 13px;
}

.ghost:hover {
  background: rgba(47, 111, 237, 0.08);
}

.empty-hint {
  margin: 12px 0 0;
  color: var(--color-muted);
  font-size: 13px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.stat {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--color-muted);
}

.stat-num {
  font-size: 30px;
  line-height: 1.1;
}

.stat-num.primary {
  color: var(--color-primary);
}

.stat-num.good {
  color: #1f9d57;
}

.stat-num.bad {
  color: var(--color-danger);
}

.stat-sub {
  font-size: 12px;
  color: var(--color-muted);
}

.chart {
  background: var(--color-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 20px 22px;
  margin-top: 20px;
}

.chart h2 {
  margin: 0 0 14px;
  font-size: 16px;
}

.bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-row {
  display: grid;
  grid-template-columns: 44px 1fr 56px;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.bar-face {
  text-align: right;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.bar-track {
  background: #efe9da;
  border-radius: 6px;
  overflow: hidden;
  height: 16px;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #2f6fed, #6aa0ff);
  border-radius: 6px;
  transition: width 0.25s ease;
}

.bar-prob {
  color: var(--color-muted);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.note {
  margin-top: 20px;
  padding: 16px 18px;
  background: rgba(47, 111, 237, 0.06);
  border-radius: var(--radius);
  font-size: 14px;
  line-height: 1.65;
}

.note p {
  margin: 0 0 10px;
}

.note ul {
  margin: 0;
  padding-left: 20px;
  color: var(--color-muted);
}

.foot {
  margin-top: 40px;
  text-align: center;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
