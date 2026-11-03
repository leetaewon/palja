import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { DEFAULT_SITE_URL } from './src/site';

// index.html의 %SITE_URL%을 사이트 주소로 바꾼다 (PRD 11장: 절대 주소는 한 곳에서)
function siteUrl(url: string): Plugin {
  return {
    name: 'palja-site-url',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replaceAll('%SITE_URL%', url.replace(/\/$/, '')),
    },
  };
}

// Cloudflare Pages: npm run build → dist, base '/'
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: '/',
    plugins: [react(), siteUrl(env.VITE_SITE_URL || DEFAULT_SITE_URL)],
    build: { outDir: 'dist' },
  };
});
