import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // La suite e2e levanta su propia API en otro puerto y la apunta con esta variable.
      '/api': process.env.TASKFLOW_API_URL ?? 'http://localhost:3000',
    },
  },
});
