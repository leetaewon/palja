import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { liveToDeath, setTheme, startWithSeed } from './helpers';

// 접근성 점검 (PRD 10-1, 12장 Phase 4): 화면마다 axe로 WCAG 2.1 AA 규칙(명도 대비·이름표·랜드마크 등)을 라이트·다크에서 본다.
const SEED = 'palja58';

async function audit(page: Page, where: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const report = r.violations.map((v) => `${where} · ${v.id}: ${v.help}\n  ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join('\n  ')}`);
  expect(report, report.join('\n')).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test(`axe 점검 · ${theme}`, async ({ page }) => {
    await startWithSeed(page, SEED);
    if (theme === 'dark') await setTheme(page, 'dark');
    await audit(page, '출생');
    await page.getByRole('button', { name: '처음으로' }).click();
    await audit(page, '타이틀');
    await page.getByText('시드로 태어나기').click();
    await audit(page, '타이틀(시드 펼침)');
    await page.locator('#seed-input').fill(SEED);
    await page.getByRole('button', { name: '태어나기', exact: true }).click();

    let sheetChecked = false;
    let lifeChecked = false;
    await liveToDeath(page, {
      stopWhen: async () => {
        if (!lifeChecked && (await page.getByTestId('age').innerText()) === '12세') {
          await audit(page, '일생');
          lifeChecked = true;
        }
        if (!sheetChecked && (await page.locator('.sheet').count())) {
          await audit(page, '갈림길');
          sheetChecked = true;
        }
        return false;
      },
    });
    await audit(page, '일생(죽음)');
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    await audit(page, '엔딩');
    await page.getByRole('button', { name: '인생 도감' }).click();
    await audit(page, '도감');
    await page.getByRole('button', { name: /돌아가기/ }).click();
    await page.getByRole('button', { name: '근거 보기' }).last().click();
    await audit(page, '근거 보기');
    await page.goto('/');
    await page.getByRole('button', { name: '이 게임에 대하여' }).click();
    await audit(page, '이 게임에 대하여');
    await page.getByRole('button', { name: /돌아가기/ }).click();
    await page.getByText('시드로 태어나기').click();
    await page.locator('#seed-input').fill('royal243');
    await page.getByRole('button', { name: '태어나기', exact: true }).click();
    await expect(page.getByTestId('royal-banner')).toBeVisible();
    await audit(page, '왕족 출생');
  });
}
