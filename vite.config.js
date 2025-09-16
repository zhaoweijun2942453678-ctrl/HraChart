import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [vue(),tailwindcss() ], 
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 让 @ 指向 src
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 前端调用 /api/* → 自动代理到 Spring Boot
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '')
      },
    },
  },
})
