<template>
  <div class="home">
    <p class="subtitle">几个用 Vue 写的小玩具，点开即玩。</p>
    <div class="cards">
      <RouterLink class="card" to="/subway">
        <div class="emoji">🚇</div>
        <h2>北京地铁 · 站站距离</h2>
        <p>覆盖全部运营线路，算任意两站最短路径的总距离、换乘次数与逐段里程；也能按线路逐站看相邻站间距。</p>
      </RouterLink>
      <RouterLink class="card" to="/history">
        <div class="emoji">📜</div>
        <h2>历史 · 时间轴</h2>
        <p>默认中国历史；可在页面顶部选择国外国家与文明。人物、统治者和事件均支持按时间查看。</p>
      </RouterLink>
      <RouterLink class="card" to="/secure-storage">
        <div class="emoji">🔐</div>
        <h2>端到端加密 · 云端密文存储</h2>
        <p>本地用 ECIES 加密后再上云，云端只存密文；私钥本机保存，没有密钥连管理员也解不开你存了什么。</p>
      </RouterLink>
      <RouterLink class="card" to="/driving">
        <div class="emoji">🚗</div>
        <h2>模拟驾驶 · 练车找手感</h2>
        <p>俯视小车练习变道、转弯、掉头：转向灯时机、导向车道、压线扣分一样不少，方向盘打多少回多少。</p>
      </RouterLink>
      <RouterLink class="card" to="/emperor">
        <div class="emoji">🐉</div>
        <h2>皇帝模拟器 · 日理万机</h2>
        <p>拟年号登基，每月朱批奏折：赈灾、边患、党争、选秀。国库民心军力朝纲圣躬五端须平衡，盖棺论定看谥号。</p>
      </RouterLink>
      <RouterLink class="card" to="/xifengkou">
        <div class="emoji">🔪</div>
        <h2>喜峰口 · 大刀夜袭</h2>
        <p>1933 年白台子夜袭模拟：摸进日军营地，避灯潜行、背后挥刀，天亮前撤出，配《大刀进行曲》。</p>
      </RouterLink>
      <RouterLink class="card" to="/stickfight">
        <div class="emoji">🥋</div>
        <h2>火柴人格斗 · 龙潭虎穴</h2>
        <p>火柴人连闯六个房间：三段拳脚连击、飞踢、翻滚闪避加炸药包，红色血液四溅，清空敌人开门突入。</p>
      </RouterLink>
      <RouterLink class="card" to="/minister">
        <div class="emoji">👑</div>
        <h2>大臣模拟器 · 宦海沉浮</h2>
        <p>扮演大雍朝官员，批答奏报、周旋同僚；圣眷政绩名望家财四端须平衡，任何一端崩盘都仕途终结。</p>
      </RouterLink>
      <RouterLink class="card" to="/canghai">
        <div class="emoji">🌊</div>
        <h2>沧海一声笑 · 古琴和曲</h2>
        <p>月下沧海、孤剑侠客，五弦下落音符和一曲《沧海一声笑》，D F G J K 拨弦，评 S/A/B/C/D 境界。</p>
      </RouterLink>
      <RouterLink class="card" to="/pet">
        <div class="emoji">🐾</div>
        <h2>宠物模拟器 · 云养毛孩子</h2>
        <p>养一只哈基米、大狗、兔子或仓鼠：喂食、陪玩、洗澡、哄睡，四项状态随时间变化，逗宠小游戏赚金币，升级解锁。</p>
      </RouterLink>
      <RouterLink class="card" to="/fight">
        <div class="emoji">🥊</div>
        <h2>擂台投注 · 小人打架</h2>
        <p>红蓝两个小人随机对打，下注猜胜者；快速投注模式自动连打，看多少轮输光本金。</p>
      </RouterLink>
      <RouterLink class="card" to="/domino">
        <div class="emoji">🎴</div>
        <h2>多米诺骨牌 · 连锁倒下</h2>
        <p>鼠标画一条路线生成骨牌，点推倒，连锁波沿曲线一节节倒下。</p>
      </RouterLink>
      <RouterLink class="card" to="/calligraphy">
        <div class="emoji">✒️</div>
        <h2>毛笔书法 · 停笔自动优化</h2>
        <p>宣纸上书写，停笔 2 秒自动优化成大师笔法，可向标准字形靠拢。</p>
      </RouterLink>
      <RouterLink class="card" to="/officials">
        <div class="emoji">⚖️</div>
        <h2>中国官职 · 古今对比</h2>
        <p>以现代行政级别为轴，横向对比各王朝相当官职，支持王朝、级别筛选。</p>
      </RouterLink>
      <RouterLink class="card" to="/nexus">
        <div class="emoji">🔮</div>
        <h2>炉石魔网 · 脸伤计算器</h2>
        <p>输入法强与场上怪血量，模拟随机砸怪溢出，算脸伤期望、最大最小与分布。</p>
      </RouterLink>
      <RouterLink class="card" to="/interval-training">
        <div class="emoji">🏃</div>
        <h2>400 米间歇训练</h2>
        <p>配速趋势、评级、日历与导入导出的跑步数据看板。</p>
      </RouterLink>
      <RouterLink class="card" to="/jiangyin">
        <div class="emoji">🗺️</div>
        <h2>江阴保卫战 · 形势图</h2>
        <p>清军与义军交战路线互动地图，点箭头看事件。</p>
      </RouterLink>
      <RouterLink class="card" to="/worldcup">
        <div class="emoji">⚽</div>
        <h2>世界杯 · 点球大战</h2>
        <p>拖拽调整角度和力度，10 次射门挑战 AI 守门员。</p>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
// 首页：各小功能的入口卡片
</script>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
}

.subtitle {
  color: var(--color-muted);
  margin-top: 0;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-top: 28px;
}

.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  padding: 24px;
  color: var(--color-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.12);
}

.card .emoji {
  font-size: 36px;
}

.card h2 {
  font-size: 18px;
  margin: 12px 0 8px;
}

.card p {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0;
}
</style>

