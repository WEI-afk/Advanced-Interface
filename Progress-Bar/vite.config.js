import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// relative base: the built page works wherever it is hosted (e.g. /Advanced-Interface/Progress-Bar/)
export default defineConfig({
  plugins: [react()],
  base: './',
})
