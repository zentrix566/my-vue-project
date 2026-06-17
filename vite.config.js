import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vite 配置：单页 Vue 应用
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true
  }
})
