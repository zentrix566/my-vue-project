import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// 火山引擎方舟（Ark）兼容 OpenAI 协议的接入地址
const ARK_TARGET = 'https://ark.cn-beijing.volces.com/api/coding/v3'

export default defineConfig(({ mode }) => {
  // 读取不带 VITE_ 前缀的密钥：它只在本配置文件内使用，不会被打包进前端产物
  const env = loadEnv(mode, process.cwd(), '')
  const arkApiKey = env.ARK_API_KEY || ''

  // 把 /ark-api/* 代理到方舟接口，并在服务端注入鉴权头，避免密钥暴露到浏览器
  const arkProxy = {
    '/ark-api': {
      target: ARK_TARGET,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/ark-api/, ''),
      headers: arkApiKey ? { Authorization: `Bearer ${arkApiKey}` } : {},
      // 方舟接口偶尔较慢，给足超时避免 502
      timeout: 300000,
      proxyTimeout: 300000
    }
  }

  return {
    plugins: [vue()],
    server: {
      port: 5173,
      host: true,
      proxy: arkProxy
    },
    preview: {
      port: 4173,
      proxy: arkProxy
    }
  }
})
