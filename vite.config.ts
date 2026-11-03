import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Cloudflare Pages: npm run build → dist, base '/'
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: { outDir: 'dist' },
});
