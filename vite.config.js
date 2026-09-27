import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { budgieApi } from './server/api.js'

export default defineConfig({
  // budgieApi serves its own /api/* routes (Snowflake) from the dev and preview
  // servers; any other /api/* request falls through to the Express server.
  plugins: [react(), tailwindcss(), budgieApi()],
  server: {
    // The API server writes its cache here; watching it makes Vite/Tailwind reload the page
    watch: { ignored: ['**/server/**'] },
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
