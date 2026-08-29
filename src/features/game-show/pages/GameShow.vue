<script setup>
import { ref } from 'vue'
import DealOrNoDeal from '../components/DealOrNoDeal.vue'
import MoneyDrop from '../components/MoneyDrop.vue'
import { formatMoney } from '../utils/deal-engine.js'
import { bestPrize, clearRecords, loadRecords } from '../utils/records.js'
import { isMuted, playBundle, toggleMuted } from '../utils/sound.js'

const fmt = formatMoney
const tab = ref('deal')
const records = ref(loadRecords())
const soundOn = ref(!isMuted())
const confirmClear = ref(false)

function refresh() {
  records.value = loadRecords()
}

function switchTab(t) {
  tab.value = t
  confirmClear.value = false
  if (t === 'records') refresh()
}

function onSound() {
  soundOn.value = toggleMuted()
  if (soundOn.value) playBundle()
}

// 清空也是两段确认，避免手滑
function onClear() {
  if (!confirmClear.value) {
    confirmClear.value = true
    return
  }
  clearRecords()
  refresh()
  confirmClear.value = false
}

function fmtTime(ts) {
  const d = new Date(ts)
  const p = n => String(n).padStart(2, '0')
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
</script>

<template>
  <div class="page game-show">
    <header class="gs-head">
      <div>
        <p class="card-kicker">AMERICAN GAME SHOW</p>
        <h1 class="page-title">美式游戏秀 · 百万奖金挑战</h1>
        <p class="page-subtitle">
          还原两档老美经典刺激节目：《Deal or No Deal》一锤定音开箱谈判，与《Million Dollar Money Drop》百万现金压门坠落——看看你最后能带走多少奖金。
        </p>
      </div>
      <button class="btn ghost gs-sound" @click="onSound">{{ soundOn ? '🔊 音效开' : '🔇 已静音' }}</button>
    </header>

    <nav class="gs-tabs">
      <button class="gs-tab" :class="{ active: tab === 'deal' }" @click="switchTab('deal')">💼 一锤定音</button>
      <button class="gs-tab" :class="{ active: tab === 'drop' }" @click="switchTab('drop')">💵 金钱坠落</button>
      <button class="gs-tab" :class="{ active: tab === 'records' }" @click="switchTab('records')">🏆 战绩榜</button>
    </nav>

    <KeepAlive>
      <DealOrNoDeal v-if="tab === 'deal'" @finished="refresh" />
      <MoneyDrop v-else-if="tab === 'drop'" @finished="refresh" />
    </KeepAlive>

    <section v-if="tab === 'records'" class="gs-records">
      <div class="gs-best">
        <span class="hud-label">历史最高奖金</span>
        <p class="gs-best-num" :class="{ zero: !records.length }">{{ records.length ? fmt(bestPrize(records)) : '—' }}</p>
        <span class="hud-label">共 {{ records.length }} 局 · 数据保存在本机浏览器</span>
      </div>
      <ul v-if="records.length" class="gs-list">
        <li v-for="(r, i) in records" :key="r.ts + '-' + i" :class="{ top: r.prize === bestPrize(records) }">
          <span class="gs-time">{{ fmtTime(r.ts) }}</span>
          <span class="gs-game">{{ r.game === 'deal' ? '💼 一锤定音' : '💵 金钱坠落' }}</span>
          <span class="gs-prize">{{ fmt(r.prize) }}</span>
          <span class="gs-note">{{ r.note }}</span>
        </li>
      </ul>
      <p v-else class="gs-empty">还没有战绩——先去赢一局！</p>
      <button v-if="records.length" class="btn ghost gs-clear" @click="onClear">
        {{ confirmClear ? '⚠️ 再点一次确认清空' : '清空战绩' }}
      </button>
    </section>

    <footer class="gs-foot">规则为节目玩法模拟，奖金为虚拟数字 · 灵感来自美版《Deal or No Deal》与《Million Dollar Money Drop》</footer>
  </div>
</template>

<style>
/* 两个游戏共用的舞台样式：非 scoped，但全部挂在 .game-show 下避免泄漏 */
.game-show {
  background: radial-gradient(1200px 620px at 50% -10%, #1d2a4d 0%, #101528 55%, #0a0e1c 100%);
  color: #f2ecdc;
  border-radius: 18px;
}
.game-show .page-title {
  color: #fff;
}
.game-show .page-subtitle {
  color: #9aa3bd;
}
.game-show .gs-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.game-show .gs-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 18px 0 16px;
}
.game-show .gs-tab {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: #d8d2bf;
  padding: 9px 18px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s, color 0.2s;
}
.game-show .gs-tab:hover {
  background: rgba(255, 255, 255, 0.12);
}
.game-show .gs-tab.active {
  background: linear-gradient(135deg, #f5c542, #e8a020);
  color: #221a04;
  font-weight: 800;
  border-color: transparent;
}
.game-show .hud-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 9px 16px;
}
.game-show .hud-label {
  font-size: 12px;
  color: #9aa3bd;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.game-show .hud-value {
  font-size: 17px;
  font-weight: 800;
  color: #f6f1e0;
  white-space: nowrap;
}
.game-show .hud-cell.gold .hud-value {
  color: #ffd968;
}
.game-show .hud-cell.warn .hud-value {
  color: #ff9d7a;
}
.game-show .stage {
  margin-top: 16px;
  border-radius: 16px;
  padding: 20px 22px;
  background: linear-gradient(180deg, rgba(245, 197, 66, 0.09), rgba(245, 197, 66, 0.03));
  border: 1px solid rgba(245, 197, 66, 0.35);
  text-align: center;
}
.game-show .stage.compact {
  padding: 14px 18px;
}
.game-show .stage-line {
  font-size: 17px;
  margin: 0 0 6px;
}
.game-show .stage-sub {
  font-size: 13px;
  color: #9aa3bd;
  margin: 0 0 10px;
}
.game-show .stage-btns {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}
.game-show .final-prize {
  font-size: clamp(34px, 6vw, 52px);
  font-weight: 900;
  color: #ffd968;
  margin: 4px 0 8px;
  text-shadow: 0 0 26px rgba(245, 197, 66, 0.4);
}
.game-show .gold {
  color: #ffd968;
}
.game-show .big {
  padding: 11px 26px;
  font-size: 16px;
}
.game-show .btn.primary {
  background: linear-gradient(135deg, #f5c542, #e8a020);
  color: #221a04;
  font-weight: 800;
  border: none;
}
.game-show .btn.danger {
  background: linear-gradient(135deg, #e05252, #b23434);
  color: #fff;
  font-weight: 800;
  border: none;
}
.game-show .btn.secondary {
  background: rgba(255, 255, 255, 0.12);
  color: #f2ecdc;
  border: 1px solid rgba(255, 255, 255, 0.25);
}
.game-show .btn.ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #e8e2cf;
}
.game-show .gs-records {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.game-show .gs-best {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 22px;
  border-radius: 16px;
  border: 1px solid rgba(245, 197, 66, 0.35);
  background: linear-gradient(180deg, rgba(245, 197, 66, 0.09), rgba(245, 197, 66, 0.03));
}
.game-show .gs-best-num {
  font-size: clamp(34px, 6vw, 52px);
  font-weight: 900;
  color: #ffd968;
  margin: 0;
  text-shadow: 0 0 26px rgba(245, 197, 66, 0.4);
}
.game-show .gs-best-num.zero {
  color: #6d7590;
  text-shadow: none;
}
.game-show .gs-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.game-show .gs-list li {
  display: grid;
  grid-template-columns: 90px 130px minmax(110px, auto) 1fr;
  gap: 10px;
  align-items: baseline;
  padding: 9px 12px;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
  font-size: 14px;
}
.game-show .gs-list li.top {
  background: rgba(245, 197, 66, 0.08);
  border-radius: 10px;
}
.game-show .gs-time {
  color: #6d7590;
  font-size: 12px;
}
.game-show .gs-game {
  color: #cfd4e4;
}
.game-show .gs-prize {
  color: #ffd968;
  font-weight: 800;
}
.game-show .gs-note {
  color: #9aa3bd;
  font-size: 13px;
}
.game-show .gs-empty {
  text-align: center;
  color: #6d7590;
  padding: 20px 0;
}
.game-show .gs-clear {
  align-self: center;
}
.game-show .gs-foot {
  margin-top: 22px;
  text-align: center;
  font-size: 12px;
  color: #6d7590;
}
@media (max-width: 640px) {
  .game-show .gs-head {
    flex-direction: column;
  }
  .game-show .gs-list li {
    grid-template-columns: 76px 1fr auto;
  }
  .game-show .gs-note {
    grid-column: 1 / -1;
  }
}
</style>
