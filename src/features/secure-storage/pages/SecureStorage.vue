<template>
  <div class="ss">
    <RouterLink class="back" to="/">← 返回主页</RouterLink>

    <header class="head">
      <h1>端到端加密 · 云端密文存储</h1>
      <p>数据在你本机加密后才上云，云端（包括管理员）只看到密文；只有持有你的私钥才能解密。</p>
    </header>

    <div class="banner">
      核心逻辑：用 <b>ECDH(P-256)</b> 协商一次性密钥，再用 <b>AES-256-GCM</b> 加密数据（业界标准 ECIES 混合加密）。
      公钥可公开、用于加密；<b>私钥只保存在你本机</b>，解密时本地加载。
      即使云端数据库被管理员查看、被拖库、被公开，没有你的私钥也只是一堆无意义密文——<b>连云端管理员都不知道你存了什么</b>。
    </div>

    <div class="grid">
      <!-- ① 密钥管理 -->
      <section class="card">
        <h2><span class="step">1</span> 密钥管理</h2>
        <p class="hint">生成非对称密钥对。公钥可发给别人用来加密；私钥请下载保存到本地，<b>切勿上传或泄露</b>。</p>
        <button @click="onGen">① 生成密钥对</button>

        <label>公钥（可公开，用来接收别人发来的加密内容）</label>
        <textarea v-model="pubKey" class="locked" readonly placeholder="点击上方按钮生成…"></textarea>
        <div class="row">
          <button class="ghost" @click="copy(pubKey, '已复制公钥。')">复制公钥</button>
        </div>

        <label>私钥（本人保存，解密时在本机加载）<span class="tag priv">保密</span></label>
        <textarea v-model="privKey" class="locked" readonly placeholder="点击上方按钮生成…"></textarea>
        <div class="row">
          <button class="ghost" @click="downloadPriv">下载私钥文件</button>
          <button class="ghost" @click="filePriv?.click()">从文件加载私钥</button>
          <input ref="filePriv" type="file" accept=".key,.txt,application/octet-stream" hidden
                 @change="readPriv($event, 'privKey')" />
        </div>
      </section>

      <!-- ② 加密 -->
      <section class="card">
        <h2><span class="step">2</span> 加密（发送方）</h2>
        <p class="hint">填入要保护的数据，指定<b>接收方公钥</b>，加密后得到密文。密文就是要存进云端 / 公共库的内容。</p>
        <label>明文数据</label>
        <textarea v-model="plain" placeholder="例如：我的备份密码是 Xy7!kP9，银行卡尾号 8832 …"></textarea>
        <label>接收方公钥（默认填你的公钥，方便自测）</label>
        <textarea v-model="encPub" class="locked" readonly placeholder="留空则使用上方你的公钥"></textarea>
        <div class="row">
          <button @click="onEncrypt">② 加密并生成密文</button>
        </div>
        <label>生成的密文（这就是存进云端的东西）</label>
        <textarea v-model="cipher" class="locked" readonly placeholder="加密后这里会出现密文…"></textarea>
        <div class="row">
          <button class="ghost" @click="copy(cipher, '已复制密文。')">复制密文</button>
          <button class="ghost" @click="toCloud">存入云端（模拟）</button>
        </div>
      </section>
    </div>

    <!-- ③ 云端存储模拟 -->
    <section class="card fluid">
      <h2><span class="step">3</span> 云端存储（模拟） <span class="tag cloud">服务端只看到密文</span></h2>
      <p class="hint">下面模拟「云端 / 公共数据库」。注意：这里永远不会出现明文，只有密文。即便被拖库、被截图、被公开，没有私钥也无法还原。</p>
      <label>云端保存的密文</label>
      <textarea v-model="cloud" class="locked" readonly placeholder="点「存入云端（模拟）」或「从云端加载（模拟）」…"></textarea>
      <div class="row">
        <button class="ghost" @click="fromCloud">从云端加载（模拟）</button>
        <button class="ghost" @click="clearCloud">清空云端</button>
        <span class="pill">{{ cloudState }}</span>
      </div>
    </section>

    <!-- ④ 解密 -->
    <section class="card fluid">
      <h2><span class="step">4</span> 解密（接收方）</h2>
      <p class="hint">粘贴密文 + 加载你的私钥，才能还原明文。<b>私钥缺失或错误都会解密失败。</b></p>
      <div class="grid">
        <div>
          <label>密文</label>
          <textarea v-model="decCipher" placeholder="粘贴密文…"></textarea>
        </div>
        <div>
          <label>私钥（在本机加载，不上传）</label>
          <textarea v-model="decPriv" class="locked" readonly placeholder="默认使用你的私钥，也可上传文件"></textarea>
          <div class="row">
            <button class="ghost" @click="filePriv2?.click()">加载私钥文件</button>
            <input ref="filePriv2" type="file" accept=".key,.txt,application/octet-stream" hidden
                   @change="readPriv($event, 'decPriv')" />
          </div>
        </div>
      </div>
      <div class="row">
        <button @click="onDecrypt">③ 输入私钥后解密</button>
      </div>
      <label>解密结果（明文）</label>
      <textarea v-model="decResult" class="locked" readonly placeholder="解密成功后这里显示明文…"></textarea>
      <div v-if="decMsg.text" class="msg" :class="decMsg.type">{{ decMsg.text }}</div>
    </section>

    <!-- 安全演示 -->
    <section class="card fluid">
      <h2>🔐 安全演示</h2>
      <p class="hint">用「别人的私钥」去解你的密文，看会发生什么——应该失败。</p>
      <div class="row">
        <button class="warn" @click="onHack">黑客用错误私钥尝试解密</button>
        <button @click="onAuto">⚡ 一键完整演示（生成→加密→存云→正确解密→错误解密）</button>
      </div>
      <p v-if="autoStatus" class="status">{{ autoStatus }}</p>
      <div v-if="hackMsg.text" class="msg" :class="hackMsg.type">{{ hackMsg.text }}</div>
    </section>

    <details>
      <summary>这套方案为什么安全？（点击展开原理）</summary>
      <p><b>1. 混合加密（ECIES）。</b> 纯非对称加密直接加密大段数据很慢，所以业界用「混合」：</p>
      <ul>
        <li>发送方随机生成一把 <code>AES-256</code> 一次性「数据密钥」，用它把明文加密成密文；</li>
        <li>再用<b>接收方公钥</b>通过 <code>ECDH(P-256)</code> 协商出共享密钥，把「数据密钥」也加密包裹进密文；</li>
        <li>密文里附带一个「临时公钥」，接收方用自己的<b>私钥</b>做同样的 ECDH，就能解出数据密钥，再解开明文。</li>
      </ul>
      <p><b>2. 私钥不出本机。</b> 私钥只在浏览器本地用于解密，从不上传到任何服务器，也不进数据库。</p>
      <p><b>3. 前向保密。</b> 每次加密都用新的临时密钥对，单条密文被破解不会影响其他数据。</p>
      <p><b>4. 完整性校验。</b> <code>AES-GCM</code> 自带认证，密文被篡改会直接解密失败，能防篡改。</p>
      <p class="pill">注：本功能使用浏览器原生 <code>Web Crypto API</code>，无需任何后端 / 第三方库，可完全离线运行。密钥与加解密全程在本地完成。</p>
    </details>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

/**
 * 端到端加密云端存储
 * - ECIES 混合加密：ECDH(P-256) 协商密钥 + AES-256-GCM 加密数据
 * - 公钥可公开用于加密；私钥本机保存，仅用于本地解密
 * - 云端只存密文，无私钥无法还原
 */

const enc = new TextEncoder()
const dec = new TextDecoder()

const ab2b64 = (buf) => {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
const b642ab = (b64) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

// 生成 ECDH P-256 密钥对，导出为 base64（spki / pkcs8）
async function genKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const pub = await crypto.subtle.exportKey('spki', kp.publicKey)
  const priv = await crypto.subtle.exportKey('pkcs8', kp.privateKey)
  return { publicKey: ab2b64(pub), privateKey: ab2b64(priv) }
}

// ECIES 加密：接收方公钥 + 明文 -> 密文包（base64 JSON）
async function encryptData(plaintext, recipientPubB64) {
  const eph = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
  const recipientPub = await crypto.subtle.importKey(
    'spki', b642ab(recipientPubB64),
    { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: recipientPub }, eph.privateKey, 256
  )
  const wrapKey = await crypto.subtle.importKey(
    'raw', shared, { name: 'AES-GCM' }, false, ['encrypt']
  )
  const dataKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 }, true, ['encrypt']
  )
  const dataKeyRaw = await crypto.subtle.exportKey('raw', dataKey)
  const ivWrap = crypto.getRandomValues(new Uint8Array(12))
  const encKey = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivWrap }, wrapKey, dataKeyRaw
  )
  const ivData = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivData }, dataKey, enc.encode(plaintext)
  )
  const ephPub = await crypto.subtle.exportKey('spki', eph.publicKey)
  const bundle = {
    v: 1,
    ephem: ab2b64(ephPub),
    ivWrap: ab2b64(ivWrap),
    encKey: ab2b64(encKey),
    ivData: ab2b64(ivData),
    ct: ab2b64(ct)
  }
  return btoa(JSON.stringify(bundle))
}

// ECIES 解密：密文包 + 私钥 -> 明文
async function decryptData(bundleB64, privateKeyB64) {
  const bundle = JSON.parse(atob(bundleB64))
  const priv = await crypto.subtle.importKey(
    'pkcs8', b642ab(privateKeyB64),
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const ephPub = await crypto.subtle.importKey(
    'spki', b642ab(bundle.ephem),
    { name: 'ECDH', namedCurve: 'P-256' }, true, []
  )
  const shared = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: ephPub }, priv, 256
  )
  const wrapKey = await crypto.subtle.importKey(
    'raw', shared, { name: 'AES-GCM' }, false, ['decrypt']
  )
  const dataKeyRaw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642ab(bundle.ivWrap) }, wrapKey, b642ab(bundle.encKey)
  )
  const dataKey = await crypto.subtle.importKey(
    'raw', dataKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']
  )
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642ab(bundle.ivData) }, dataKey, b642ab(bundle.ct)
  )
  return dec.decode(pt)
}

// 生成一段不属于接收方的「黑客私钥」用于演示失败
async function genWrongPriv() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  return ab2b64(await crypto.subtle.exportKey('pkcs8', kp.privateKey))
}

// ---------- 状态 ----------
const pubKey = ref('')
const privKey = ref('')
const encPub = ref('')
const plain = ref('')
const cipher = ref('')
const cloud = ref('')
const decCipher = ref('')
const decPriv = ref('')
const decResult = ref('')
const cloudState = ref('')
const autoStatus = ref('')
const filePriv = ref(null)
const filePriv2 = ref(null)

const decMsg = ref({ text: '', type: '' })
const hackMsg = ref({ text: '', type: '' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function copy(text, okText) {
  if (!text) return
  navigator.clipboard?.writeText(text)
  decMsg.value = { text: okText, type: 'ok' }
}

function downloadPriv() {
  if (!privKey.value) {
    decMsg.value = { text: '请先生成密钥对。', type: 'warn' }
    return
  }
  const blob = new Blob([privKey.value], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'my-private-key.key'
  a.click()
  decMsg.value = { text: '⬇️ 私钥已下载（my-private-key.key）。请离线保存，切勿上传。', type: 'warn' }
}

function readPriv(event, target) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (target === 'privKey') privKey.value = reader.result
    else decPriv.value = reader.result
    decMsg.value = { text: '已加载私钥文件到本地。', type: 'ok' }
  }
  reader.readAsText(file)
}

async function onGen() {
  const kp = await genKeyPair()
  pubKey.value = kp.publicKey
  privKey.value = kp.privateKey
  encPub.value = kp.publicKey
  decPriv.value = kp.privateKey
  decMsg.value = { text: '✅ 密钥对已生成。请下载私钥文件妥善保存。', type: 'ok' }
}

async function onEncrypt() {
  if (!plain.value) {
    decMsg.value = { text: '请先输入明文数据。', type: 'warn' }
    return
  }
  const pub = encPub.value || pubKey.value
  if (!pub) {
    decMsg.value = { text: '请先生成密钥对（或填入接收方公钥）。', type: 'warn' }
    return
  }
  try {
    cipher.value = await encryptData(plain.value, pub)
    decMsg.value = { text: '🔒 加密完成，已生成密文。可「存入云端（模拟）」。', type: 'ok' }
  } catch (e) {
    decMsg.value = { text: '❌ 加密失败：' + e.message, type: 'err' }
  }
}

const CLOUD_KEY = 'ss_cloud_cipher'
function toCloud() {
  if (!cipher.value) {
    decMsg.value = { text: '请先加密生成密文。', type: 'warn' }
    return
  }
  localStorage.setItem(CLOUD_KEY, cipher.value)
  cloud.value = cipher.value
  cloudState.value = '（已保存到本地模拟云端）'
  decMsg.value = { text: '☁️ 密文已存入「云端」。注意：云端只存了这一串密文。', type: 'ok' }
}
function fromCloud() {
  const v = localStorage.getItem(CLOUD_KEY) || ''
  cloud.value = v
  decCipher.value = v
  cloudState.value = v ? '（已从本地模拟云端读取）' : '（云端为空）'
}
function clearCloud() {
  localStorage.removeItem(CLOUD_KEY)
  cloud.value = ''
  cloudState.value = '（云端已清空）'
}

async function onDecrypt() {
  const src = decCipher.value || cloud.value
  const priv = decPriv.value || privKey.value
  if (!src) {
    decMsg.value = { text: '请先提供密文（可从云端加载）。', type: 'warn' }
    return
  }
  if (!priv) {
    decMsg.value = { text: '请先加载你的私钥。', type: 'warn' }
    return
  }
  try {
    decResult.value = await decryptData(src, priv)
    decMsg.value = { text: '🔓 解密成功！私钥正确，明文已还原。', type: 'ok' }
  } catch (e) {
    decResult.value = ''
    decMsg.value = { text: '❌ 解密失败：私钥不匹配或密文被篡改，无法还原数据。', type: 'err' }
  }
}

async function onHack() {
  const src = cloud.value || cipher.value
  if (!src) {
    hackMsg.value = { text: '请先加密并存入云端。', type: 'warn' }
    return
  }
  const wrong = await genWrongPriv()
  try {
    await decryptData(src, wrong)
    hackMsg.value = { text: '⚠️ 意外：竟然解密成功了（理论不应发生）。', type: 'err' }
  } catch (e) {
    hackMsg.value = {
      text: '🛡️ 黑客用错误私钥解密失败：' + e.message + ' —— 没有正确的私钥，密文无法还原。',
      type: 'ok'
    }
  }
}

async function onAuto() {
  hackMsg.value = { text: '', type: '' }
  autoStatus.value = '① 生成密钥对…'
  const kp = await genKeyPair()
  pubKey.value = kp.publicKey
  privKey.value = kp.privateKey
  encPub.value = kp.publicKey
  decPriv.value = kp.privateKey
  await sleep(150)

  autoStatus.value = '② 加密示例数据…'
  const sample = '机密：备份密码 Xy7!kP9，服务器 10.0.0.8 的 root 口令为 Qm@2026'
  plain.value = sample
  const c = await encryptData(sample, kp.publicKey)
  cipher.value = c
  localStorage.setItem(CLOUD_KEY, c)
  cloud.value = c
  await sleep(150)

  autoStatus.value = '③ 正确私钥解密…'
  const ok = await decryptData(c, kp.privateKey)
  decCipher.value = c
  decResult.value = ok
  await sleep(150)

  autoStatus.value = '④ 错误私钥解密（应失败）…'
  const wrong = await genWrongPriv()
  let hackOk = false
  try {
    await decryptData(c, wrong)
    hackOk = true
  } catch (e) {
    hackOk = false
  }
  await sleep(150)

  autoStatus.value = ''
  hackMsg.value = {
    text:
      '✅ 完整演示结束：\n' +
      '· 云端只存密文（' + c.length + ' 字符）\n' +
      '· 正确私钥解密成功：' + ok + '\n' +
      '· 错误私钥解密：' + (hackOk ? '意外成功' : '失败（符合预期，数据受保护）'),
    type: hackOk ? 'err' : 'ok'
  }
}
</script>

<style scoped>
.ss {
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 20px 64px;
}
.head h1 {
  font-size: 24px;
  margin: 0 0 6px;
}
.head p {
  margin: 0;
  color: var(--color-muted);
}
.banner {
  margin: 16px 0;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius);
  padding: 14px 18px;
  font-size: 14px;
}
.banner b {
  color: var(--color-primary);
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.card {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: var(--shadow-card);
}
.card.fluid {
  grid-column: 1 / -1;
  margin-top: 16px;
}
.card h2 {
  font-size: 16px;
  margin: 0 0 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.hint {
  color: var(--color-muted);
  font-size: 13px;
  margin: 2px 0 12px;
}
label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin: 12px 0 6px;
}
textarea {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 12.5px;
  resize: vertical;
  background: #fbfcfe;
  color: var(--color-text);
}
textarea {
  min-height: 76px;
}
textarea.locked {
  background: #f1f4f9;
  color: var(--color-muted);
}
.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
button {
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  background: var(--color-primary);
  color: #fff;
  transition: 0.15s;
}
button:hover {
  filter: brightness(0.94);
}
button.ghost {
  background: #fff;
  color: var(--color-primary);
  border-color: var(--color-primary);
}
button.ghost:hover {
  background: #eef3ff;
}
button.warn {
  background: #b54708;
}
.tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 6px;
  vertical-align: middle;
}
.tag.priv {
  background: #fdecea;
  color: var(--color-danger);
}
.tag.cloud {
  background: #eee7ff;
  color: #5b21b6;
}
.msg {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  white-space: pre-line;
}
.msg.ok {
  background: #e8f6ee;
  color: #18924e;
}
.msg.warn {
  background: #fdf2e6;
  color: #b54708;
}
.msg.err {
  background: #fdecea;
  color: var(--color-danger);
}
.status {
  margin-top: 12px;
  font-size: 13px;
  min-height: 18px;
  color: var(--color-muted);
}
.pill {
  font-size: 12px;
  color: var(--color-muted);
}
details {
  margin-top: 16px;
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 4px 18px;
}
details summary {
  cursor: pointer;
  font-weight: 600;
  padding: 12px 0;
}
details p,
details li {
  font-size: 14px;
  color: #2b3542;
}
code {
  background: #eef1f6;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 12.5px;
}
@media (max-width: 820px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
