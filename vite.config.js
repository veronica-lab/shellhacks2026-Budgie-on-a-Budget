import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The API server writes its cache here; watching it makes Vite/Tailwind reload the page
    watch: { ignored: ['**/server/**'] },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})