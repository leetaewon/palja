import { expect, type Page } from '@playwright/test';

/** 저장을 비우고 시드로 새 인생을 시작한다 */
export async function startWithSeed(page: Page, seed: string) {
  await page.goto('/');
  await page.evaluate(() => {
    try {
      localStorage.clear();
    } catch {
      /* 무시 */
    }
  });
  await page.goto('/');
  await page.getByText('시드로 태어나기').click();
  await page.locator('#seed-input').fill(seed);
  await page.getByRole('button', { name: '태어나기', exact: true }).click();
  await expect(page.getByTestId('birth-sentence')).toBeVisible();
}

/** 일생을 시작하고 멈춘 뒤, 한 해씩 넘기며 갈림길은 고른다. 죽으면 멈춘다. */
export async function liveToDeath(
  page: Page,
  opts: { prefer?: 'memory' | 'knowledge'; stopWhen?: () => Promise<boolean> } = {},
): Promise<{ choices: number }> {
  await page.getByRole('button', { name: /일생 시작|다시 살아 보기/ }).click();
  await page.getByRole('button', { name: '멈춤' }).click();
  let choices = 0;
  for (let i = 0; i < 500; i++) {
    if (await page.getByTestId('death-line').count()) return { choices };
    if (opts.stopWhen && (await opts.stopWhen())) return { choices };
    const sheet = page.locator('.sheet');
    if (await sheet.count()) {
      const special = opts.prefer ? sheet.locator(`.choice--${opts.prefer}`) : null;
      if (special && (await special.count())) await special.first().click();
      else await sheet.locator('.choice').first().click();
      choices++;
      continue;
    }
    const step = page.getByRole('button', { name: '한 해 넘기기' });
    if (await step.isEnabled()) await step.click({ timeout: 2_000 }).catch(() => undefined);
  }
  throw new Error('인생이 끝나지 않았다');
}
