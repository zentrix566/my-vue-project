<script setup>
// 页面根组件：装配控制条、办公室舞台与右侧群聊栏；引擎随页面挂载/卸载启停
import { onMounted, onUnmounted } from 'vue'
import ControlBar from '../components/ControlBar.vue'
import OfficeStage from '../components/OfficeStage.vue'
import ChatFeed from '../components/ChatFeed.vue'
import { sim, initSim, destroySim, setRunning, setSpeed, setMode, retryAi, resetSim, requestTopic, sendUserMessage, pokeEmployee } from '../game/engine.js'

onMounted(initSim)
onUnmounted(destroySim)
</script>

<template>
  <div class="app">
    <header class="title">
      <h1>🏢 AI 公司·摸鱼群聊</h1>
      <p>
        十位 AI 员工各带人设：老板画饼、产品改需求、程序员救火、设计师改稿、财务守门……他们在一个大群里全自动开聊。办公室里谁说话谁头顶冒泡，右侧群里同步刷屏；点小人戳一戳、在输入框里插句话，还能点播话题把天聊歪。
      </p>
    </header>

    <div class="layout">
      <div class="board">
        <ControlBar
          :sim="sim"
          @toggle="setRunning(!sim.running)"
          @speed="setSpeed"
          @mode="setMode"
          @retry-ai="retryAi"
          @topic="requestTopic"
          @reset="resetSim"
        />
        <OfficeStage @poke="pokeEmployee" />
      </div>

      <ChatFeed @send="sendUserMessage" />
    </div>

    <footer class="foot">
      本地开发时自动连上大模型进入「AI 接龙」，线上无接口则退回内置剧本模式 · 全程自动演出
    </footer>
  </div>
</template>

<style scoped>
.app {
  min-height: calc(100vh - 137px);
  padding: 24px 16px 40px;
  box-sizing: border-box;
  /* 自带深色渐变，与全站浅色主题隔离 */
  background: radial-gradient(circle at 50% 0%, #343a40, #212529 70%);
}

.title {
  text-align: center;
  color: #f8f9fa;
  margin-bottom: 18px;
}

.title h1 {
  margin: 0 0 6px;
  font-size: 30px;
}

.title p {
  margin: 0 auto;
  font-size: 14px;
  color: #ced4da;
  max-width: 820px;
  line-height: 1.5;
}

.layout {
  margin: 0 auto;
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
}

.board {
  max-width: 100%;
  flex: none;
}

.foot {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: #868e96;
}

@media (max-width: 1330px) {
  .layout {
    flex-direction: column;
    align-items: center;
  }

  /* 子组件根节点会带上本组件 scoped 属性，可直接覆盖；加 !important 防注入顺序不确定 */
  .layout :deep(.feed) {
    width: 100%;
    max-width: 640px;
    height: 420px !important;
  }
}
</style>
