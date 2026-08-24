import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { webSearchMiddleware } from './server/websearch.js'

// LLM 接入地址（均为 OpenAI 兼容协议）：
// - 火山引擎方舟（Ark）Coding Plan 接口（配置了 HUOSHAN_KEY 时优先使用）
// - DeepSeek 官方接口（回退方案）
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
  const huoshanKey = env.HUOSHAN_KEY || env.ARK_API_KEY || ''
  const deepseekKey = env.DEEPSEEK_KEY || env.DEEPSEEK_API_KEY || ''
  // 火山方舟优先；两者都没配时保留 DeepSeek 目标（请求会 401，页面会给出错误提示）
  const useArk = !!huoshanKey

  const target = useArk ? ARK_TARGET : DEEPSEEK_TARGET
  const apiKey = useArk ? huoshanKey : deepseekKey
  const model = useArk ? 'ark-code-latest' : 'deepseek-v4-flash'
  const provider = useArk ? 'ark' : 'deepseek'
  console.log(`[vite] LLM 代理：${useArk ? '火山方舟' : 'DeepSeek'}，模型 ${model}${apiKey ? '' : '（未配置密钥）'}`)

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

  // 网页检索插件：在 dev / preview 阶段真正挂载 /websearch 中间件
  // 注意：configureServer / configurePreviewServer 是「插件钩子」，必须放在 plugins 数组里，
  // 之前误写在 server / preview 配置对象下，Vite 不会调用，导致中间件从未挂载。
  const webSearchPlugin = {
    name: 'web-search-middleware',
    configureServer(server) {
      server.middlewares.use(webSearchMiddleware)
      console.log('[websearch] dev 中间件已挂载')
    },
    configurePreviewServer(server) {
      server.middlewares.use(webSearchMiddleware)
      console.log('[websearch] preview 中间件已挂载')
    }
  }

  return {
    plugins: [vue(), llmConfigPlugin(model, provider), webSearchPlugin],
    server: {
      // 不复用其它工作区的 5173；默认由系统分配空闲端口，避免串到旧页面。
      port: Number(env.PORT) || 0,
      strictPort: false,
      host: true,
      open: true,
      proxy: llmProxy
    },
    preview: {
      port: Number(env.PREVIEW_PORT) || 0,
      strictPort: false,
      proxy: llmProxy
    }
  }
})
