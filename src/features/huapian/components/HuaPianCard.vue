<script setup>
defineProps({
  card: { type: Object, required: true },
  size: { type: String, default: 'md' }, // md 场上 / sm 面板 / mini 战利品
})
</script>

<template>
  <div class="hp-card" :class="[card.rarity, `s-${size}`]">
    <span class="hp-name">{{ card.name }}</span>
    <span class="hp-art">{{ card.emoji }}</span>
    <span class="hp-tag">{{ card.rarityLabel }}</span>
    <i class="hp-sheen" />
  </div>
</template>

<style scoped>
.hp-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  flex: none;
  aspect-ratio: 5 / 7;
  padding: 6% 4%;
  border-radius: 9px;
  background: linear-gradient(160deg, #faf4e4, #efe6cd);
  border: 3px solid #b7a583;
  box-shadow: 0 3px 8px rgba(15, 23, 42, 0.22);
  overflow: hidden;
  animation: hp-pop 0.32s ease;
  user-select: none;
}

@keyframes hp-pop {
  from {
    transform: scale(0.5) translateY(-14px);
    opacity: 0;
  }
  60% {
    transform: scale(1.06);
    opacity: 1;
  }
  to {
    transform: scale(1);
  }
}

.hp-card.s-md {
  width: 116px;
}

.hp-card.s-sm {
  width: 84px;
  border-width: 2px;
}

.hp-card.s-mini {
  width: 46px;
  border-width: 2px;
  border-radius: 6px;
}

.hp-name {
  font-size: 12px;
  font-weight: 700;
  color: #5c4a2e;
  line-height: 1.1;
  text-align: center;
}

.s-md .hp-name {
  font-size: 14px;
}

.s-mini .hp-name {
  font-size: 8px;
}

.hp-art {
  font-size: 30px;
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.18));
}

.s-md .hp-art {
  font-size: 42px;
}

.s-mini .hp-art {
  font-size: 18px;
}

.hp-tag {
  font-size: 10px;
  color: #8a7a5c;
}

.s-mini .hp-tag {
  display: none;
}

.hp-card.hard {
  border-color: #7a5c3e;
  background: linear-gradient(160deg, #f3ead2, #e2d3ae);
  box-shadow:
    0 3px 8px rgba(15, 23, 42, 0.28),
    inset 0 0 0 2px rgba(122, 92, 62, 0.25);
}

.hp-card.foil {
  border-color: #d4a017;
  background: linear-gradient(150deg, #fdf6d8 0%, #f9e7f0 35%, #e8f4fb 70%, #fdf3d8 100%);
  box-shadow: 0 3px 10px rgba(180, 130, 20, 0.4);
}

.hp-card.foil .hp-tag {
  color: #b07d0e;
  font-weight: 700;
}

.hp-sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.55) 48%, rgba(255, 255, 255, 0.15) 52%, transparent 70%);
  transform: translateX(-120%);
}

.foil .hp-sheen {
  animation: hp-sheen 2.4s ease-in-out infinite;
}

@keyframes hp-sheen {
  0%,
  55% {
    transform: translateX(-120%);
  }
  85%,
  100% {
    transform: translateX(120%);
  }
}
</style>
