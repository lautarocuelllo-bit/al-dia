import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/ y https://v2.tauri.app/start/frontend/vite/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  // Que Vite no tape los errores de Rust en la consola
  clearScreen: false,
  server: {
    // Tauri espera un puerto fijo
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
}))
