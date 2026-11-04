import { expect, test } from '@playwright/test';
import { liveToDeath, startWithSeed } from './helpers';

// 연출: 움직임을 켠 채로 출생 공개·왕족 출생·기록 엔딩·회귀 전환이 끝까지 가는지, 건너뛸 수 있는지 본다.
// 움직임 줄이기에서는 회귀 전환이 아예 뜨지 않는다 (나머지 E2E는 reducedMotion: 'reduce').
const ROYAL_SEED = 'royal243'; // 1592 왕족, 어려서 죽는다

test.describe('움직임 켬', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('왕족 출생 → 기록 엔딩 → 회귀 전환 건너뛰기 → 같은 출생', async ({ page }) => {
    await startWithSeed(page, ROYAL_SEED);
    await expect(page.getByTestId('royal-banner')).toContainText('100명 중 1명');
    await expect(page.locator('.page--birth')).toHaveClass(/birth--royal/);
    const name = await page.locator('.birth__name').innerText();

    await liveToDeath(page);
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    await expect(page.locator('.page--ending')).toHaveClass(/reveal/);
    // 연출 중에도 버튼은 바로 누를 수 있다
    await page.getByRole('button', { name: /팔자 고치기/ }).click();

    const fx = page.getByTestId('regress-fx');
    await expect(fx).toBeVisible();
    await expect(fx).toContainText('팔자를 고치러');
    await expect(page.getByRole('button', { name: '건너뛰기' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(fx).toHaveCount(0);
    await expect(page.locator('.regress-banner')).toBeVisible();
    await expect(page.locator('.birth__name')).toHaveText(name);
  });

  test('회귀 전환은 기다리면 저절로 끝난다', async ({ page }) => {
    await startWithSeed(page, ROYAL_SEED);
    await liveToDeath(page);
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    await page.getByRole('button', { name: /팔자 고치기/ }).click();
    await expect(page.getByTestId('regress-fx')).toBeVisible();
    await expect(page.getByTestId('regress-fx')).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByRole('button', { name: '다시 살아 보기' })).toBeFocused();
  });
});

test('움직임 줄이기면 회귀 전환 없이 바로 출생 공개', async ({ page }) => {
  await startWithSeed(page, ROYAL_SEED);
  await liveToDeath(page);
  await page.getByRole('button', { name: '남은 기록 보기' }).click();
  await page.getByRole('button', { name: /팔자 고치기/ }).click();
  await expect(page.locator('.regress-banner')).toBeVisible();
  await expect(page.getByTestId('regress-fx')).toHaveCount(0);
  await expect(page.locator('.birth__name')).toHaveCSS('animation-name', 'none');
});
