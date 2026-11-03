import { defineConfig } from '@playwright/test';

// npm run e2e — 개발 서버를 띄워 실제 화면으로 한 인생을 끝까지 플레이한다.
// npm run screenshots — docs/screenshots/에 화면 크기·테마별 스크린샷을 남긴다.
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: 'reduce',
    locale: 'ko-KR',
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
