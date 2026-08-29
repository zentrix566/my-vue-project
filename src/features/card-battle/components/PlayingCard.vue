<script setup>
// 单张扑克牌：card 为 null 时亮出队色背面，传入牌后 3D 翻到正面；tone 控制胜/弃状态
defineProps({
  card: { type: Object, default: null },
  tone: { type: String, default: 'neutral' }, // neutral | win | dead
  side: { type: String, default: 'red' }, // 背面配色 + 胜利光环颜色
})
</script>

<template>
  <div class="card3d" :class="{ flipped: !!card }">
    <div class="face back">
      <div class="deckback" :class="side"><span>✦</span></div>
    </div>
    <div class="face front">
      <div
        v-if="card"
        class="pcard"
        :class="[side, tone, card.red ? 'is-red' : 'is-black', { joker: card.kind === 'joker' }]"
      >
        <span class="corner tl">{{ card.label }}<i v-if="card.suitSymbol">{{ card.suitSymbol }}</i></span>
        <span class="pip" :class="{ vertical: card.kind === 'joker' }">{{
          card.kind === 'joker' ? card.label : card.suitSymbol
        }}</span>
        <span class="corner br">{{ card.label }}<i v-if="card.suitSymbol">{{ card.suitSymbol }}</i></span>
        <span v-if="tone === 'dead'" class="stamp">弃</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card3d {
  position: relative;
  width: var(--cb-card-w, 66px);
  height: calc(var(--cb-card-w, 66px) * 1.4);
  perspective: 620px;
  transform-style: preserve-3d;
  transition: transform 0.45s ease;
}

.card3d.flipped {
  transform: rotateY(180deg);
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 8px;
}

.face.front {
  transform: rotateY(180deg);
}

/* 队色斜纹牌背 */
.deckback {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.28);
  display: grid;
  place-items: center;
}

.deckback.red {
  background: repeating-linear-gradient(45deg, #c2413a 0 6px, #a03030 6px 12px);
}

.deckback.blue {
  background: repeating-linear-gradient(45deg, #2f6fed 0 6px, #2553c4 6px 12px);
}

.deckback span {
  width: calc(var(--cb-card-w, 66px) * 0.52);
  height: calc(var(--cb-card-w, 66px) * 0.52);
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  color: rgba(255, 255, 255, 0.92);
  font-size: calc(var(--cb-card-w, 66px) * 0.3);
}

/* 牌面 */
.pcard {
  position: absolute;
  inset: 0;
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.18);
  font-weight: 800;
  transition: box-shadow 0.3s ease, filter 0.3s ease, opacity 0.3s ease, transform 0.3s ease;
}

.pcard.is-red {
  color: #d4452f;
}

.pcard.is-black {
  color: #1f2430;
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: calc(var(--cb-card-w, 66px) * 0.185);
  line-height: 1.05;
}

.corner i {
  font-style: normal;
  font-size: calc(var(--cb-card-w, 66px) * 0.165);
}

.corner.tl {
  top: 4%;
  left: 8%;
}

.corner.br {
  bottom: 4%;
  right: 8%;
  transform: rotate(180deg);
}

.pip {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--cb-card-w, 66px) * 0.52);
}

.pip.vertical {
  writing-mode: vertical-rl;
  font-size: calc(var(--cb-card-w, 66px) * 0.3);
  letter-spacing: 2px;
}

/* 大小王：金红 / 靛蓝底色 */
.pcard.joker.is-red {
  background: linear-gradient(160deg, #fffbeb, #fee2e2);
  border-color: #fecaca;
  color: #b91c1c;
}

.pcard.joker.is-black {
  background: linear-gradient(160deg, #f0f9ff, #e0e7ff);
  border-color: #c7d2fe;
  color: #1e3a8a;
}

/* 赢家：队色光环 + 微放大 */
.pcard.win.side-red {
  box-shadow: 0 0 0 3px rgba(212, 69, 47, 0.65), 0 4px 12px rgba(212, 69, 47, 0.35);
  transform: scale(1.07);
}

.pcard.win.side-blue {
  box-shadow: 0 0 0 3px rgba(47, 111, 237, 0.65), 0 4px 12px rgba(47, 111, 237, 0.35);
  transform: scale(1.07);
}

/* 弃牌：灰化 + 盖「弃」印章 */
.pcard.dead {
  filter: grayscale(0.85);
  opacity: 0.62;
}

.stamp {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-16deg);
  border: 2px solid #d4452f;
  border-radius: 6px;
  padding: 0 5px;
  color: #d4452f;
  background: rgba(255, 255, 255, 0.88);
  font-size: calc(var(--cb-card-w, 66px) * 0.32);
  letter-spacing: 2px;
  text-indent: 2px;
}
</style>
