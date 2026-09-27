import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { budgieApi } from './server/api.js'

// https://vite.dev/config/
export default defineConfig({
  // budgieApi serves /api/* (Snowflake) from the dev and preview servers.
  plugins: [react(), budgieApi()],
})
