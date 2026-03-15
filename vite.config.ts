import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/finance/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        finance: resolve(__dirname, 'finance/index.html'),
      },
    },
  },
  server: {
    port: 5173,
    host: true
  }
})
