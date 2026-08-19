import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// LLM 接入地址（均为 OpenAI 兼容协议）：
// - DeepSeek 官方接口（配置了 DEEPSEEK_KEY 时优先使用）
// - 火山引擎方舟（Ark）Coding Plan 接口（回退方案）
const DEEPSEEK_TARGET = 'https://api.deepseek.com/v1'
const ARK_TARGET = 'https://ark.cn-beijing.volces.com/api/coding/v3'

// 把当前模型/提供方注入虚拟模块 virtual:llm-config，前端 ark.js import 使用。
// 不用 config.define 是因为 dev 模式（rolldown-vite）不替换源码中的标识符，会导致运行时未定义。
function llmConfigPlugin(model, provider) {
  const virtualId = 'virtual:llm-config'
  const resolvedId = '\0' + virtualId
  return {
    name: 'llm-config',
    resolveId(id) {
      return id === virtualId ? resolvedId : null
    },
    load(id) {
      if (id !== resolvedId) return null
      return [
        `// 由 vite.config.js 构建期生成，勿手改`,
        `export const MODEL = ${JSON.stringify(model)}`,
        `export const PROVIDER = ${JSON.stringify(provider)}`
      ].join('\n')
    }
  }
}

export default defineConfig(({ mode }) => {
  // 读取不带 VITE_ 前缀的密钥：只在配置内使用，不会打包进前端产物
  const env = loadEnv(mode, process.cwd(), '')
  const deepseekKey = env.DEEPSEEK_KEY || env.DEEPSEEK_API_KEY || ''
  const arkApiKey = env.ARK_API_KEY || ''
  // DeepSeek 优先；两者都没配时保留 Ark 目标（请求会 401，页面会给出错误提示）
  const useDeepseek = !!deepseekKey

  const target = useDeepseek ? DEEPSEEK_TARGET : ARK_TARGET
  const apiKey = useDeepseek ? deepseekKey : arkApiKey
  const model = useDeepseek ? 'deepseek-v4-flash' : 'ark-code-latest'
  const provider = useDeepseek ? 'deepseek' : 'ark'
  console.log(`[vite] LLM 代理：${useDeepseek ? 'DeepSeek' : '火山方舟'}，模型 ${model}${apiKey ? '' : '（未配置密钥）'}`)

  // 把 /ark-api/* 代理到对应接口，并在服务端注入鉴权头，避免密钥暴露到浏览器
  const llmProxy = {
    '/ark-api': {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/ark-api/, ''),
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      // 大模型接口偶尔较慢，给足超时避免 502
      timeout: 300000,
      proxyTimeout: 300000
    }
  }

  return {
    plugins: [vue(), llmConfigPlugin(model, provider)],
    server: {
      port: 5173,
      host: true,
      proxy: llmProxy
    },
    preview: {
      port: 4173,
      proxy: llmProxy
    }
  }
})
