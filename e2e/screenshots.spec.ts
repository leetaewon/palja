import { expect, test, type Page } from '@playwright/test';
import { liveToDeath, startWithSeed } from './helpers';

// npm run screenshots 로만 돈다. docs/screenshots/{화면}-{폭}-{테마}.jpg (한지 결 때문에 PNG는 너무 커서 JPEG)
test.skip(!process.env.SCREENSHOTS, 'SCREENSHOTS=1 일 때만');

const OUT = 'docs/screenshots';
const WIDTHS = [360, 390, 1280];
const THEMES = ['light', 'dark'] as const;
// 양반으로 태어나 갈림길을 거쳐 문집·읍지 기록이 남는 시드
const SEED = 'palja58';

async function setTheme(page: Page, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    await page.getByRole('button', { name: /설정/ }).first().click();
    await page.getByRole('button', { name: /먹 \(어두운 화면\)/ }).click();
    await page.getByRole('button', { name: '적용하기' }).click();
  }
}

for (const width of WIDTHS) {
  for (const theme of THEMES) {
    test(`스크린샷 ${width}px ${theme}`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', '한 프로젝트에서만 찍는다');
      await page.setViewportSize({ width, height: width < 768 ? 800 : 860 });
      const shot = (name: string, fullPage = false) =>
        page.screenshot({ path: `${OUT}/${name}-${width}-${theme}.jpg`, fullPage, type: 'jpeg', quality: 80 });

      await startWithSeed(page, SEED);
      await page.goto('/');
      await setTheme(page, theme);
      await shot('title', true);

      await page.getByText('시드로 태어나기').click();
      await page.locator('#seed-input').fill(SEED);
      await page.getByRole('button', { name: '태어나기', exact: true }).click();
      await shot('birth', true);

      let choiceShot = false;
      await liveToDeath(page, {
        stopWhen: async () => {
          if (!choiceShot && (await page.locator('.sheet').count())) {
            await shot('choice');
            choiceShot = true;
          }
          if (choiceShot && !(await page.locator('.sheet').count())) return true;
          return false;
        },
      });
      await shot('life');
      if (width < 768) {
        await page.locator('.life-top__summary').click();
        await shot('life-panel');
        await page.locator('.life-top__summary').click();
      }
      // 버튼 위치가 바뀌지 않게 "멈춤" 상태는 유지된다
      await page.getByRole('button', { name: '진행' }).first().isVisible();
      const { choices } = await liveToDeathContinue(page);
      expect(choices).toBeGreaterThanOrEqual(0);
      await page.getByRole('button', { name: '남은 기록 보기' }).click();
      await shot('ending', true);
      await page.getByRole('button', { name: '인생 도감' }).click();
      await shot('codex', true);
      await page.getByRole('button', { name: /돌아가기/ }).click();
      await page.getByRole('button', { name: '근거 보기' }).click();
      await shot('sources');
      await page.getByRole('button', { name: /돌아가기/ }).click();
      await page.getByRole('button', { name: /팔자 고치기/ }).click();
      await shot('regress-birth', true);

      // 왕족 출생 (연출이 끝난 모습. 스크린샷은 움직임 줄이기로 찍는다)
      await startWithSeed(page, 'royal243');
      await setTheme(page, theme);
      await shot('royal-birth', true);
    });
  }
}

/** 이미 멈춘 일생을 죽을 때까지 이어 간다 */
async function liveToDeathContinue(page: Page): Promise<{ choices: number }> {
  let choices = 0;
  for (let i = 0; i < 500; i++) {
    if (await page.getByTestId('death-line').count()) return { choices };
    const sheet = page.locator('.sheet');
    if (await sheet.count()) {
      await sheet.locator('.choice').first().click();
      choices++;
      continue;
    }
    const step = page.getByRole('button', { name: '한 해 넘기기' });
    if (await step.isEnabled()) await step.click({ timeout: 2_000 }).catch(() => undefined);
  }
  throw new Error('인생이 끝나지 않았다');
}
