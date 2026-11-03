import { expect, test } from '@playwright/test';
import { liveToDeath, startWithSeed } from './helpers';

// 시점이 늘면 같은 시드도 다른 시대에 태어날 수 있어, 갈림길을 만나는 시드를 차례로 찾는다
const SEED = 'palja1';
const CANDIDATES = ['palja1', 'palja21', 'palja46', 'palja58', 'palja94', 'palja2', 'palja35', 'palja100', 'palja119', 'palja209'];

test('새 환생 → 갈림길 선택 → 죽음 → 기록 → 팔자 고치기 → 같은 출생', async ({ page }) => {
  let birth = '';
  let name = '';
  let choices = 0;
  for (const seed of CANDIDATES) {
    await startWithSeed(page, seed);
    birth = await page.getByTestId('birth-sentence').innerText();
    name = await page.locator('.birth__name').innerText();
    await expect(page.locator('.seed-line code')).toHaveText(seed);
    ({ choices } = await liveToDeath(page));
    if (choices > 0) break;
  }
  expect(choices).toBeGreaterThan(0);
  await expect(page.getByTestId('death-line')).toContainText('세상을 떠났습니다');

  await page.getByRole('button', { name: '남은 기록 보기' }).click();
  await expect(page.getByTestId('death-sentence')).toContainText(/향년 \d+세/);
  await expect(page.getByTestId('record-text')).toBeVisible();
  await expect(page.locator('.neighbors__item')).toHaveCount(3);
  await expect(page.getByRole('button', { name: /팔자 고치기/ })).toContainText('남은 3/3회');

  await page.getByRole('button', { name: /팔자 고치기/ }).click();
  await expect(page.locator('.regress-banner')).toContainText('팔자를 고치러 돌아왔습니다');
  await expect(page.getByTestId('birth-sentence')).toHaveText(birth);
  await expect(page.locator('.birth__name')).toHaveText(name);
});

test('저장과 이어하기, 도감', async ({ page }) => {
  await startWithSeed(page, SEED);
  await page.getByRole('button', { name: '일생 시작' }).click();
  await page.getByRole('button', { name: '멈춤' }).click();
  await page.getByRole('button', { name: '한 해 넘기기' }).click();
  const year = await page.getByTestId('year').innerText();
  await page.reload();
  await page.getByRole('button', { name: /이어하기/ }).click();
  await expect(page.getByTestId('year')).toHaveText(year);

  await page.getByRole('button', { name: '처음 화면으로' }).click();
  await page.getByRole('button', { name: '인생 도감' }).click();
  await expect(page.getByTestId('codex-count')).toHaveText('0');
});

test('라이트 기본, 다크 전환은 기억된다', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: '어두운 화면으로 바꾸기' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('콘텐츠가 있는 시점은 열리고 나머지는 준비 중', async ({ page }) => {
  await page.goto('/');
  const open = page.locator('.era-strip__item.is-open');
  await expect(open.filter({ hasText: '1592' })).toHaveCount(1);
  expect(await page.locator('.era-strip__item').count()).toBeGreaterThanOrEqual(4);
});

test('근거 보기와 이 게임에 대하여', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '근거 보기' }).click();
  await expect(page.getByRole('heading', { name: '출생 확률', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '연표 사건', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /돌아가기/ }).click();
  await page.getByRole('button', { name: '이 게임에 대하여' }).click();
  await expect(page.getByText('80억분의 1')).toBeVisible();
  await expect(page.getByText('권장 나이 15세 이상')).toBeVisible();
});
