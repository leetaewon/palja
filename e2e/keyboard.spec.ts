import { expect, test, type Page } from '@playwright/test';

// 키보드만으로 완주 (PRD 10-1 "큰 화면에서는 키보드만으로 플레이 가능").
// 마우스·터치 없이: 시드 입력 → 출생 → 일생(스페이스·→·숫자키) → 갈림길(숫자키) → 기록 → 팔자 고치기 → 같은 출생 → 도감.

const SEED = 'palja58';

async function tabTo(page: Page, name: RegExp, back = false, max = 60) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const f = page.locator(':focus');
    if (!(await f.count())) continue;
    const label = `${(await f.getAttribute('aria-label')) ?? ''} ${await f.innerText()}`;
    if (name.test(label)) return;
  }
  throw new Error(`Tab으로 ${name}에 닿지 못했다`);
}

test('키보드만으로 한 인생을 끝내고 팔자를 고친다', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', '큰 화면에서만');
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');

  await tabTo(page, /시드로 태어나기/);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('#seed-input')).toBeFocused();
  await page.keyboard.type(SEED);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('birth-sentence')).toBeVisible();
  const birth = await page.getByTestId('birth-sentence').innerText();

  // 출생: 시작 버튼에 포커스가 있다
  await expect(page.getByRole('button', { name: '일생 시작' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('year')).toBeVisible();
  await page.keyboard.press('Space'); // 멈춤
  await expect(page.getByRole('button', { name: '진행' }).first()).toBeVisible();

  let choices = 0;
  for (let i = 0; i < 500; i++) {
    if (await page.getByTestId('death-line').count()) break;
    if (await page.locator('.sheet').count()) {
      // 갈림길이 열리면 첫 선택지에 포커스가 간다
      await expect(page.locator('.sheet .choice').first()).toBeFocused();
      await page.keyboard.press('1');
      choices++;
      continue;
    }
    if ((await page.getByTestId('age').innerText()) === '12세') await page.keyboard.press('2'); // 마음가짐 바꾸기
    await page.keyboard.press('ArrowRight');
  }
  await expect(page.getByTestId('death-line')).toBeVisible();
  expect(choices).toBeGreaterThan(0);

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('record-text')).toBeVisible();
  await expect(page.getByRole('button', { name: /팔자 고치기/ })).toBeFocused();

  // 묘비 한 줄을 키보드로 쓰고 다시 팔자 고치기로
  await tabTo(page, /인생 도감/);
  for (let i = 0; i < 20 && !(await page.locator('#epitaph-input:focus').count()); i++) await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#epitaph-input')).toBeFocused();
  await page.keyboard.type('키보드로 남긴 한 줄');
  await expect(page.locator('#epitaph-input')).toHaveValue('키보드로 남긴 한 줄');
  await tabTo(page, /팔자 고치기/);
  await page.keyboard.press('Enter');
  await expect(page.locator('.regress-banner')).toBeVisible();
  await expect(page.getByTestId('birth-sentence')).toHaveText(birth);
  await expect(page.getByRole('button', { name: '다시 살아 보기' })).toBeFocused();

  // 처음으로 → 도감
  await tabTo(page, /처음으로/, true);
  await page.keyboard.press('Enter');
  await tabTo(page, /인생 도감/);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('codex-count')).toHaveText('1');
});
