<script setup>
// 页面根组件：装配控制条、办公室舞台与右侧群聊栏；引擎随页面挂载/卸载启停
import { onMounted, onUnmounted } from 'vue'
import ControlBar from '../components/ControlBar.vue'
import OfficeStage from '../components/OfficeStage.vue'
import ChatFeed from '../components/ChatFeed.vue'
import { sim, initSim, destroySim, setRunning, setSpeed, setMode, retryAi, resetSim, requestTopic, sendUserMessage, pokeEmployee, startBossScene } from '../game/engine.js'

onMounted(initSim)
onUnmounted(destroySim)
</script>

<template>
  <div class="app">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>
    <header class="title">
      <h1>🏢 AI 公司·摸鱼群聊</h1>
      <p>
        十位 AI 员工各带人设：老板画饼、产品改需求、程序员救火、设计师改稿、财务守门……全自动群聊，谁说话谁头顶冒泡，右侧群里同步刷屏。为省 token，AI 每批只聊 10 轮就自动暂停，点「▶ 继续」再加一批；点小人戳一戳、在下方插话，或以王总身份「布置议题」开一场讨论会。
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

      <ChatFeed @send="sendUserMessage" @scene="startBossScene" />
    </div>

    <footer class="foot">
      AI 接龙每 10 轮自动暂停省 token，续跑需手点「▶ 继续」；剧本模式免费循环 · 布置议题＝以王总身份开会，聊 8 轮后李经理总结
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
