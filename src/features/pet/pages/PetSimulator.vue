<template>
  <div class="pet-page">
    <RouterLink class="back" to="/">← 返回首页</RouterLink>
    <h1 class="title">🐾 宠物模拟器 · 云养毛孩子</h1>
    <p class="subtitle">
      选一只喜欢的毛孩子，喂饭、陪玩、洗澡、哄睡。状态会随时间下降，太久不照顾它会难过，记得常回来看看。
      进度自动保存在浏览器本地。
    </p>

    <!-- 宠物选择 -->
    <div class="pet-picker">
      <button
        v-for="p in PETS"
        :key="p.id"
        class="pet-chip"
        :class="{ active: p.id === petId }"
        :style="p.id === petId ? { borderColor: p.color, background: p.soft } : {}"
        @click="switchPet(p.id)"
      >
        <span class="chip-emoji">{{ p.emoji }}</span>
        <span class="chip-name">{{ p.name }}</span>
        <span class="chip-species">{{ p.species }}</span>
      </button>
    </div>

    <div class="game-layout">
      <!-- 舞台 -->
      <div class="stage-card" :style="{ '--pet-color': pet.color, '--pet-soft': pet.soft }">
        <div class="stage-top">
          <input class="pet-name-input" v-model="petName" maxlength="8" @change="saveAll" />
          <div class="level-badge">Lv.{{ level }}</div>
        </div>

        <div class="exp-row">
          <div class="exp-track"><div class="exp-fill" :style="{ width: expPct + '%' }"></div></div>
          <span class="exp-text">经验 {{ Math.floor(exp) }} / {{ expNeed }}</span>
        </div>

        <div class="stage">
          <div class="speech" v-if="speech">{{ speech }}</div>
          <div class="zzz" v-if="sleeping">💤</div>
          <div
            class="pet"
            :class="[actionAnim, { sleeping }]"
            @click="pat"
            :title="sleeping ? '它在睡觉，点按钮叫醒' : '点我摸摸'"
          >
            <span class="pet-emoji">{{ pet.emoji }}</span>
            <span class="float" v-for="f in floats" :key="f.id" :class="f.cls">{{ f.text }}</span>
          </div>
          <div class="stage-floor"></div>
        </div>

        <div class="stage-foot">
          <span class="mood-tag" :style="{ color: moodColor }">{{ moodIcon }} {{ moodText }}</span>
          <span class="age-tag">📅 陪伴 {{ ageDays }} 天</span>
        </div>
      </div>

      <!-- 状态与操作 -->
      <div class="side-card">
        <div class="coins-line">
          <span class="coins">💰 {{ coins }}</span>
          <button class="tiny-btn" @click="resetPet">重置这只</button>
        </div>

        <div class="stat-list">
          <div class="stat" v-for="k in STAT_KEYS" :key="k">
            <span class="stat-label">{{ STAT_EMOJI[k] }} {{ STAT_LABEL[k] }}</span>
            <div class="bar">
              <div class="bar-fill" :class="barClass(k)" :style="{ width: stats[k] + '%' }"></div>
            </div>
            <span class="stat-val">{{ Math.round(stats[k]) }}</span>
          </div>
        </div>

        <div class="action-grid">
          <button class="act" @click="feedOpen = !feedOpen">
            <span class="act-emoji">🍖</span><span>喂食</span>
          </button>
          <button class="act" @click="openGame" :disabled="sleeping || stats.energy < 20">
            <span class="act-emoji">🎾</span><span>玩耍</span>
          </button>
          <button class="act" @click="pat" :disabled="sleeping || pettingCd > 0">
            <span class="act-emoji">🤚</span><span>抚摸{{ pettingCd > 0 ? `(${pettingCd})` : '' }}</span>
          </button>
          <button class="act" @click="wash" :disabled="sleeping">
            <span class="act-emoji">🫧</span><span>洗澡</span>
          </button>
          <button class="act" @click="toggleSleep">
            <span class="act-emoji">{{ sleeping ? '☀️' : '🌙' }}</span>
            <span>{{ sleeping ? '叫醒' : '睡觉' }}</span>
          </button>
          <button class="act heal" @click="heal" :disabled="coins < healCost || (!sick && stats.mood > 40)">
            <span class="act-emoji">💊</span><span>看医 {{ healCost }}💰</span>
          </button>
        </div>

        <!-- 食物菜单 -->
        <div class="food-menu" v-if="feedOpen">
          <button
            v-for="f in FOODS"
            :key="f.id"
            class="food-item"
            :disabled="sleeping || coins < f.cost || stats.hunger >= 100"
            @click="feed(f)"
          >
            <span class="food-emoji">{{ f.emoji }}</span>
            <span class="food-name">
              {{ f.name }}
              <small v-if="f.favorite">（{{ pet.favoriteFood }}）</small>
            </span>
            <span class="food-info">饱腹+{{ f.hunger }}</span>
            <span class="food-cost">{{ f.cost }}💰</span>
          </button>
        </div>

        <p class="hint">
          {{ sleeping ? '💤 正在睡觉，精力会慢慢恢复，但肚子也会饿。' : actionHint }}
        </p>
      </div>
    </div>

    <!-- 逗宠小游戏弹窗 -->
    <div class="modal-overlay" v-if="gameOpen" @click.self="endGame">
      <div class="game-card">
        <div class="game-head">
          <h2>🎯 逗{{ pet.name }}玩</h2>
          <span class="game-score">得分 {{ game.score }} / 10</span>
        </div>
        <p class="game-tip">在目标消失前点中它！手速越快金币越多，每次消耗 15 精力。</p>
        <div class="play-area" ref="playArea">
          <button
            v-if="game.target"
            class="target"
            :style="{ left: game.target.x + '%', top: game.target.y + '%' }"
            @click="hitTarget"
          >
            🎾
          </button>
          <div class="game-time" v-if="game.target">
            <div class="time-fill" :style="{ width: game.timePct + '%' }"></div>
          </div>
          <div class="game-start" v-if="!game.started">
            <button class="primary" @click="startGame">开始</button>
          </div>
        </div>
        <div class="game-actions">
          <button class="ghost" @click="endGame">结束</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { PETS, getPet, FOODS } from '../data/pets.js'

const SAVE_KEY = 'zentrix-pet-sim-v1'
const TICK_MS = 2000
const OFFLINE_CAP_MS = 4 * 60 * 60 * 1000

const STAT_KEYS = ['hunger', 'mood', 'energy', 'clean']
const STAT_LABEL = { hunger: '饱腹', mood: '心情', energy: '精力', clean: '清洁' }
const STAT_EMOJI = { hunger: '🍖', mood: '💖', energy: '⚡', clean: '🫧' }

const petId = ref('hajimi')
const petName = ref('哈基米')
const stats = reactive({ hunger: 80, mood: 80, energy: 80, clean: 80 })
const coins = ref(50)
const level = ref(1)
const exp = ref(0)
const sleeping = ref(false)
const createdAt = ref(Date.now())
const speech = ref('')
const actionAnim = ref('idle')
const floats = ref([])
const pettingCd = ref(0)
const feedOpen = ref(false)
const gameOpen = ref(false)
const loaded = ref(false)

const slots = {}
let lastSavedAt = Date.now()
let animTimer = null
let speechTimer = null
let floatSeq = 0

const pet = computed(() => getPet(petId.value))
const expNeed = computed(() => 100 + (level.value - 1) * 50)
const expPct = computed(() => Math.min(100, (exp.value / expNeed.value) * 100))
const overall = computed(() => (stats.hunger + stats.mood + stats.energy + stats.clean) / 4)
const sick = computed(() => overall.value < 25)
const healCost = computed(() => 60)
const ageDays = computed(() => Math.max(1, Math.ceil((Date.now() - createdAt.value) / 86400000)))

const moodIcon = computed(() => {
  if (sleeping.value) return '💤'
  if (sick.value) return '🤒'
  if (overall.value >= 75) return '🥰'
  if (overall.value >= 45) return '😐'
  return '😢'
})
const moodText = computed(() => {
  if (sleeping.value) return '睡得正香'
  if (sick.value) return '生病了，想看医生'
  if (overall.value >= 75) return '非常开心'
  if (overall.value >= 45) return '还凑合'
  return '不太开心'
})
const moodColor = computed(() => {
  if (sleeping.value) return '#6366f1'
  if (sick.value) return '#b91c1c'
  if (overall.value >= 75) return '#16a34a'
  if (overall.value >= 45) return '#b45309'
  return '#b91c1c'
})
const actionHint = computed(() => {
  if (sick.value) return '它状态很差，带它去看医生吧。'
  if (stats.hunger < 30) return '肚子饿扁了，快喂点吃的。'
  if (stats.clean < 30) return '身上脏兮兮的，该洗澡啦。'
  if (stats.energy < 25) return '没什么精神，让它睡一觉。'
  if (stats.mood < 30) return '有点无聊，陪它玩一会儿吧。'
  return '状态不错，点点它或摸摸它都能增进感情。'
})

const game = reactive({
  started: false,
  score: 0,
  roundsLeft: 10,
  target: null,
  timePct: 100,
  hitCd: false
})
const playArea = ref(null)
let gameTimer = null
let gameCountdown = null

function freshSlot(id) {
  return {
    petName: getPet(id).name,
    stats: { hunger: 80, mood: 80, energy: 80, clean: 80 },
    coins: 50,
    level: 1,
    exp: 0,
    sleeping: false,
    createdAt: Date.now(),
    lastSaved: Date.now()
  }
}

function clamp(v) {
  return Math.max(0, Math.min(100, v))
}

function say(text, ms = 2400) {
  speech.value = text
  clearTimeout(speechTimer)
  speechTimer = setTimeout(() => { speech.value = '' }, ms)
}

function floatText(text, cls = '') {
  const id = ++floatSeq
  floats.value.push({ id, text, cls })
  setTimeout(() => {
    floats.value = floats.value.filter((f) => f.id !== id)
  }, 1100)
}

function playAnim(name, ms = 900) {
  actionAnim.value = name
  clearTimeout(animTimer)
  animTimer = setTimeout(() => { actionAnim.value = 'idle' }, ms)
}

function addExp(n) {
  exp.value += n
  while (exp.value >= expNeed.value) {
    exp.value -= expNeed.value
    level.value += 1
    coins.value += 30
    say(`🎉 升级了！Lv.${level.value}，奖励 30 金币`, 3000)
    floatText('LEVEL UP!', 'levelup')
  }
}

function applyStat(key, delta) {
  stats[key] = clamp(stats[key] + delta)
}

function feed(food) {
  if (sleeping.value || coins.value < food.cost || stats.hunger >= 100) return
  coins.value -= food.cost
  applyStat('hunger', food.hunger)
  applyStat('mood', food.mood)
  addExp(8)
  playAnim('eat')
  say(`${pet.value.sound} 好吃！${food.favorite ? '这是我的最爱！' : ''}`)
  floatText(`+${food.hunger} 🍖`)
  feedOpen.value = false
  saveAll()
}

function pat() {
  if (sleeping.value || pettingCd.value > 0) return
  applyStat('mood', 6)
  addExp(3)
  pettingCd.value = 3
  playAnim('happy', 800)
  floatText('+6 💖')
  const lines = ['呼噜呼噜～', '好舒服呀', pet.value.sound, '再摸摸～']
  say(lines[Math.floor(Math.random() * lines.length)])
  saveAll()
}

function wash() {
  if (sleeping.value) return
  if (stats.clean >= 95) {
    say('我已经很干净啦！')
    return
  }
  applyStat('clean', 50)
  applyStat('energy', -5)
  addExp(6)
  playAnim('clean')
  say('泡泡～好干净！')
  floatText('+50 🫧')
  saveAll()
}

function toggleSleep() {
  sleeping.value = !sleeping.value
  if (sleeping.value) {
    actionAnim.value = 'idle'
    say('晚安……💤')
  } else {
    say('早上好！')
    playAnim('happy', 800)
  }
  saveAll()
}

function heal() {
  if (coins.value < healCost.value) return
  if (!sick.value && stats.mood > 40) return
  coins.value -= healCost.value
  stats.hunger = clamp(stats.hunger + 40)
  stats.mood = 80
  stats.energy = clamp(stats.energy + 40)
  stats.clean = clamp(stats.clean + 40)
  addExp(15)
  playAnim('happy', 1200)
  say('一针下去，满血复活！')
  floatText('+HP', 'heal')
  saveAll()
}

function tick() {
  // 抚摸冷却
  if (pettingCd.value > 0) pettingCd.value -= 1

  if (sleeping.value) {
    applyStat('energy', 4)
    applyStat('hunger', -2)
    applyStat('mood', -0.5)
    applyStat('clean', -0.5)
    if (stats.energy >= 100) {
      sleeping.value = false
      say('睡饱啦！')
      playAnim('happy', 800)
    }
  } else {
    applyStat('hunger', -1.5)
    applyStat('mood', -1)
    applyStat('energy', -1)
    applyStat('clean', -1)
  }

  // 状态过差拖累心情
  if (!sleeping.value) {
    if (stats.hunger < 15) applyStat('mood', -1)
    if (stats.clean < 15) applyStat('mood', -0.5)
  }

  if (sick.value && actionAnim.value === 'idle' && !sleeping.value) {
    actionAnim.value = 'sick'
  } else if (!sick.value && actionAnim.value === 'sick') {
    actionAnim.value = 'idle'
  }
}

// ===== 逗宠小游戏 =====
function openGame() {
  if (sleeping.value || stats.energy < 20) return
  stats.energy = clamp(stats.energy - 15)
  gameOpen.value = true
  game.started = false
  game.score = 0
  game.roundsLeft = 10
  game.target = null
  game.timePct = 100
}

function startGame() {
  game.started = true
  game.score = 0
  game.roundsLeft = 10
  spawnTarget()
}

function spawnTarget() {
  if (game.roundsLeft <= 0) {
    endGame()
    return
  }
  game.roundsLeft -= 1
  game.target = {
    x: 10 + Math.random() * 75,
    y: 12 + Math.random() * 70
  }
  game.timePct = 100
  clearInterval(gameCountdown)
  const startedAt = Date.now()
  const window = 1800
  gameCountdown = setInterval(() => {
    const left = 1 - (Date.now() - startedAt) / window
    game.timePct = Math.max(0, left * 100)
    if (left <= 0) {
      clearInterval(gameCountdown)
      missTarget()
    }
  }, 50)
}

function hitTarget() {
  if (!game.target || game.hitCd) return
  game.hitCd = true
  clearInterval(gameCountdown)
  game.score += 1
  game.target = null
  setTimeout(() => {
    game.hitCd = false
    spawnTarget()
  }, 180)
}

function missTarget() {
  game.target = null
  setTimeout(spawnTarget, 150)
}

function endGame() {
  clearInterval(gameCountdown)
  gameOpen.value = false
  game.started = false
  game.target = null
  const gained = game.score * 3
  const moodGain = game.score * 3
  coins.value += gained
  applyStat('mood', moodGain)
  addExp(game.score * 2)
  playAnim('happy', 1000)
  if (game.score >= 8) say(`太厉害啦！命中 ${game.score} 次，赚了 ${gained} 金币！`)
  else if (game.score >= 4) say(`玩得真开心～赚了 ${gained} 金币。`)
  else say(`有点没玩够……下次再来。`)
  floatText(`+${gained} 💰`)
  saveAll()
}

// ===== 存档 =====
function snapshotCurrent() {
  slots[petId.value] = {
    petName: petName.value,
    stats: { ...stats },
    coins: coins.value,
    level: level.value,
    exp: exp.value,
    sleeping: sleeping.value,
    createdAt: createdAt.value,
    lastSaved: Date.now()
  }
}

function loadSlot(id) {
  const s = slots[id] || freshSlot(id)
  slots[id] = s
  petId.value = id
  petName.value = s.petName
  Object.assign(stats, s.stats)
  coins.value = s.coins
  level.value = s.level
  exp.value = s.exp
  sleeping.value = s.sleeping
  createdAt.value = s.createdAt
  lastSavedAt = s.lastSaved || Date.now()
}

function saveAll() {
  if (!loaded.value) return
  snapshotCurrent()
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      currentPetId: petId.value,
      slots
    }))
    lastSavedAt = Date.now()
  } catch (e) { /* 忽略存储异常 */ }
}

function applyOffline() {
  const now = Date.now()
  let elapsed = (now - lastSavedAt) / 1000
  if (!elapsed || elapsed < 5) return
  elapsed = Math.min(elapsed, OFFLINE_CAP_MS / 1000)
  if (sleeping.value) {
    applyStat('energy', elapsed * 2)
    applyStat('hunger', -elapsed * 1)
    applyStat('mood', -elapsed * 0.5)
    applyStat('clean', -elapsed * 0.5)
  } else {
    applyStat('hunger', -elapsed * 0.75)
    applyStat('mood', -elapsed * 0.5)
    applyStat('energy', -elapsed * 0.5)
    applyStat('clean', -elapsed * 0.5)
  }
  const minutes = Math.round(elapsed / 60)
  if (minutes >= 1) {
    say(`欢迎回来！你离开了 ${minutes} 分钟，我好想你～${pet.value.sound}`, 3600)
  }
}

function switchPet(id) {
  if (id === petId.value) return
  snapshotCurrent()
  saveAll()
  loadSlot(id)
  actionAnim.value = 'happy'
  setTimeout(() => { actionAnim.value = 'idle' }, 800)
  say(`${pet.value.name} 来啦！${pet.value.sound}`)
  saveAll()
}

function resetPet() {
  if (!confirm(`确定要重置「${pet.value.name}」的所有进度吗？此操作不可恢复。`)) return
  slots[petId.value] = freshSlot(petId.value)
  loadSlot(petId.value)
  saveAll()
  say('一切重新开始啦～')
}

function barClass(k) {
  const v = stats[k]
  if (v >= 60) return 'good'
  if (v >= 30) return 'warn'
  return 'bad'
}

let tickTimer = null
let saveTimer = null

onMounted(() => {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.slots) Object.assign(slots, data.slots)
      const id = data.currentPetId || PETS[0].id
      loadSlot(id)
      applyOffline()
    } else {
      loadSlot(PETS[0].id)
      say(`你好，我是${pet.value.name}！${pet.value.sound}`)
    }
  } catch (e) {
    loadSlot(PETS[0].id)
  }
  loaded.value = true
  tickTimer = setInterval(tick, TICK_MS)
  saveTimer = setInterval(saveAll, 5000)
  window.addEventListener('beforeunload', saveAll)
})

onUnmounted(() => {
  clearInterval(tickTimer)
  clearInterval(saveTimer)
  clearInterval(gameCountdown)
  clearTimeout(animTimer)
  clearTimeout(speechTimer)
  window.removeEventListener('beforeunload', saveAll)
  saveAll()
})

watch(petName, () => { /* 输入时不立即保存，由 @change 触发 */ })
</script>

<style scoped>
.pet-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 28px 20px 60px;
}

.back {
  color: var(--primary, #2563eb);
  text-decoration: none;
  font-weight: 650;
}

.title {
  font-size: clamp(1.6rem, 3.5vw, 2.2rem);
  margin: 10px 0 6px;
}

.subtitle {
  color: var(--muted, #607086);
  margin-bottom: 22px;
}

/* 宠物选择 */
.pet-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}

.pet-chip {
  align-items: center;
  background: var(--surface, #fff);
  border: 2px solid var(--line, #d9e1ea);
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  gap: 8px;
  padding: 8px 14px;
  transition: transform 0.15s, border-color 0.15s;
}

.pet-chip:hover { transform: translateY(-2px); }
.pet-chip.active { border-width: 2px; }

.chip-emoji { font-size: 26px; }
.chip-name { font-weight: 750; }
.chip-species { color: var(--muted, #607086); font-size: 0.82rem; }

/* 布局 */
.game-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
}

@media (max-width: 760px) {
  .game-layout { grid-template-columns: 1fr; }
}

.stage-card,
.side-card {
  background: var(--surface, #fff);
  border: 1px solid var(--line, #d9e1ea);
  border-radius: 16px;
  box-shadow: var(--shadow, 0 18px 50px rgba(28,39,60,.1));
  padding: 20px;
}

.stage-card {
  background:
    radial-gradient(circle at 50% 30%, var(--pet-soft, #fef3c7), transparent 70%),
    var(--surface, #fff);
}

.stage-top {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.pet-name-input {
  background: transparent;
  border: 0;
  border-bottom: 2px dashed transparent;
  font-size: 1.25rem;
  font-weight: 800;
  outline: none;
  padding: 4px 0;
  width: 160px;
}
.pet-name-input:focus { border-bottom-color: var(--pet-color, #f59e0b); }

.level-badge {
  background: var(--pet-color, #f59e0b);
  border-radius: 999px;
  color: #fff;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 4px 12px;
}

.exp-row {
  align-items: center;
  display: flex;
  gap: 10px;
  margin: 10px 0 6px;
}
.exp-track {
  background: var(--surface-soft, #eef4f6);
  border-radius: 999px;
  flex: 1;
  height: 8px;
  overflow: hidden;
}
.exp-fill {
  background: linear-gradient(90deg, var(--pet-color, #f59e0b), #fbbf24);
  height: 100%;
  transition: width 0.4s;
}
.exp-text { color: var(--muted, #607086); font-size: 0.78rem; white-space: nowrap; }

/* 舞台 */
.stage {
  align-items: center;
  display: flex;
  flex-direction: column;
  height: 300px;
  justify-content: flex-end;
  position: relative;
}

.speech {
  background: #fff;
  border: 2px solid var(--pet-color, #f59e0b);
  border-radius: 14px;
  color: var(--text, #18212f);
  font-weight: 650;
  max-width: 80%;
  padding: 8px 14px;
  position: absolute;
  text-align: center;
  top: 10px;
  z-index: 5;
}
.speech::after {
  border: 8px solid transparent;
  border-top-color: var(--pet-color, #f59e0b);
  bottom: -16px;
  content: '';
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
}

.zzz {
  font-size: 28px;
  position: absolute;
  right: 28%;
  top: 40px;
  animation: float-z 2s ease-in-out infinite;
}
@keyframes float-z {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50% { transform: translateY(-12px); opacity: 1; }
}

.pet {
  cursor: pointer;
  font-size: 120px;
  line-height: 1;
  position: relative;
  transform-origin: bottom center;
  user-select: none;
}
.pet-emoji { display: inline-block; }

.pet.idle .pet-emoji { animation: breathe 3s ease-in-out infinite; }
.pet.happy .pet-emoji { animation: bounce 0.5s ease; }
.pet.eat .pet-emoji { animation: wiggle 0.4s ease-in-out 2; }
.pet.clean .pet-emoji { animation: shake 0.5s ease; }
.pet.sick .pet-emoji { animation: tremble 1.2s ease-in-out infinite; filter: grayscale(0.4); }
.pet.sleeping .pet-emoji { filter: brightness(0.85); }

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
@keyframes bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-30px) scale(1.05, 0.95); }
  60% { transform: translateY(0) scale(0.95, 1.05); }
}
@keyframes wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-12deg); }
  75% { transform: rotate(12deg); }
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-8px) rotate(-6deg); }
  75% { transform: translateX(8px) rotate(6deg); }
}
@keyframes tremble {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

.float {
  animation: float-up 1.1s ease-out forwards;
  color: var(--pet-color, #f59e0b);
  font-size: 1rem;
  font-weight: 800;
  left: 50%;
  pointer-events: none;
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}
.float.levelup { color: #db2777; font-size: 1.1rem; }
.float.heal { color: #16a34a; }
@keyframes float-up {
  0% { opacity: 0; transform: translate(-50%, 0); }
  20% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50px); }
}

.stage-floor {
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.12), transparent 70%);
  border-radius: 50%;
  height: 24px;
  margin-top: -6px;
  width: 180px;
}

.stage-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
}
.mood-tag { font-weight: 750; }
.age-tag { color: var(--muted, #607086); font-size: 0.85rem; }

/* 侧边 */
.coins-line {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}
.coins { font-size: 1.3rem; font-weight: 800; }
.tiny-btn {
  background: transparent;
  border: 1px solid var(--line, #d9e1ea);
  border-radius: 8px;
  color: var(--muted, #607086);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 4px 10px;
}
.tiny-btn:hover { border-color: var(--danger, #b91c1c); color: var(--danger, #b91c1c); }

.stat-list { display: grid; gap: 10px; margin-bottom: 16px; }
.stat {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 64px 1fr 36px;
}
.stat-label { font-size: 0.88rem; font-weight: 650; }
.bar {
  background: var(--surface-soft, #eef4f6);
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
}
.bar-fill { height: 100%; transition: width 0.4s; }
.bar-fill.good { background: #22c55e; }
.bar-fill.warn { background: #f59e0b; }
.bar-fill.bad { background: #ef4444; }
.stat-val { font-size: 0.82rem; color: var(--muted, #607086); text-align: right; }

.action-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 14px;
}
.act {
  align-items: center;
  background: var(--surface-soft, #eef4f6);
  border: 1px solid var(--line, #d9e1ea);
  border-radius: 12px;
  color: var(--text, #18212f);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-weight: 700;
  gap: 4px;
  padding: 12px 6px;
  transition: transform 0.12s, border-color 0.12s;
}
.act:hover:not(:disabled) { border-color: var(--pet-color, #f59e0b); transform: translateY(-2px); }
.act:disabled { cursor: not-allowed; opacity: 0.5; }
.act-emoji { font-size: 24px; }
.act.heal { grid-column: span 1; }

.food-menu {
  border-top: 1px dashed var(--line, #d9e1ea);
  display: grid;
  gap: 8px;
  padding-top: 12px;
}
.food-item {
  align-items: center;
  background: transparent;
  border: 1px solid var(--line, #d9e1ea);
  border-radius: 10px;
  cursor: pointer;
  display: grid;
  gap: 8px;
  grid-template-columns: auto 1fr auto auto;
  padding: 8px 10px;
  text-align: left;
}
.food-item:hover:not(:disabled) { border-color: var(--pet-color, #f59e0b); }
.food-item:disabled { cursor: not-allowed; opacity: 0.5; }
.food-emoji { font-size: 22px; }
.food-name { font-weight: 700; }
.food-name small { color: var(--muted, #607086); font-weight: 500; }
.food-info { color: var(--muted, #607086); font-size: 0.82rem; }
.food-cost { color: #b45309; font-weight: 750; }

.hint {
  background: var(--surface-soft, #eef4f6);
  border-radius: 10px;
  color: var(--muted, #607086);
  font-size: 0.88rem;
  margin-top: 8px;
  padding: 10px 12px;
}

/* 小游戏弹窗 */
.modal-overlay {
  align-items: center;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 20px;
  position: fixed;
  z-index: 60;
}
.game-card {
  background: var(--surface, #fff);
  border-radius: 16px;
  box-shadow: var(--shadow, 0 18px 50px rgba(0,0,0,.3));
  max-width: 560px;
  padding: 22px;
  width: 100%;
}
.game-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}
.game-head h2 { margin: 0; }
.game-score { color: var(--primary, #2563eb); font-weight: 800; }
.game-tip { color: var(--muted, #607086); font-size: 0.88rem; margin: 8px 0 14px; }

.play-area {
  background: linear-gradient(160deg, #fef3c7, #fde6d2);
  border-radius: 14px;
  height: 320px;
  position: relative;
  overflow: hidden;
}
.target {
  background: none;
  border: 0;
  cursor: pointer;
  font-size: 40px;
  position: absolute;
  transform: translate(-50%, -50%);
  transition: transform 0.08s;
}
.target:hover { transform: translate(-50%, -50%) scale(1.2); }
.game-time {
  background: rgba(0,0,0,0.1);
  border-radius: 999px;
  height: 6px;
  left: 12px;
  position: absolute;
  right: 12px;
  top: 12px;
  overflow: hidden;
}
.time-fill {
  background: #ef4444;
  height: 100%;
  transition: width 0.05s linear;
}
.game-start {
  align-items: center;
  display: flex;
  height: 100%;
  justify-content: center;
}
.primary {
  background: var(--primary, #2563eb);
  border: 0;
  border-radius: 10px;
  color: #fff;
  cursor: pointer;
  font-weight: 750;
  padding: 10px 28px;
}
.game-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
.ghost {
  background: transparent;
  border: 1px solid var(--line, #d9e1ea);
  border-radius: 10px;
  color: var(--muted, #607086);
  cursor: pointer;
  padding: 8px 18px;
}
</style>
