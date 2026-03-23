import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/jjlove/',
  plugins: [react()],
  server: {
    proxy: {
      '/jjlove/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/jjlove/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  }
})