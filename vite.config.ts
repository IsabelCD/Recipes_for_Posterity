import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Client-side SPA only — no SSR, no backend. Suitable for static hosting
// (e.g. Firebase Hosting) once built to dist/.
export default defineConfig({
  plugins: [react()],
});
