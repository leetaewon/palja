import { expect, test, type Page } from '@playwright/test';
import { liveToDeath, startWithSeed } from './helpers';

// 4개 시점을 실제 화면에서 처음부터 기록 엔딩·회귀까지 한 번씩 돌린다.
// 시드는 엔진으로 미리 찾았다: 그 시점에 태어나고, 첫 선택지를 고르면 갈림길을 만나며 어른까지 사는 인생.
const ERAS = [
  { id: '660', seed: 'era3', years: [630, 650], label: '백제' },
  { id: '1170', seed: 'era89', years: [1145, 1165], label: '무신정변' },
  { id: '1592', seed: 'era27', years: [1565, 1580], label: '임진왜란' },
  { id: '1800s', seed: 'era55', years: [1790, 1815], label: '세도정치' },
] as const;

// 다른 시점의 기록 문장이 새어 나오면 보이는 표지
const FOREIGN: Record<string, RegExp> = {
  '660': /선원록|씨 족보|조회를 사흘|각 도|언문|고려사|왜군/,
  '1170': /선원록|씨 족보|조회를 사흘|각 도|언문|부여씨|5방|왜군/,
  '1592': /고려사|부여씨|5방|종실 세계|묘지명\. 백제/,
  '1800s': /고려사|부여씨|5방|종실 세계|임진년|의병조/,
};

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
}

async function birthYear(page: Page): Promise<number> {
  const text = await page.getByTestId('birth-sentence').innerText();
  const m = text.match(/(\d{3,4})년/);
  expect(m, text).not.toBeNull();
  return Number(m![1]);
}

for (const era of ERAS) {
  test(`${era.id} 시점: 출생 → 일생 → 기록 → 팔자 고치기 → 다시 기록`, async ({ page }) => {
    const errors = watchErrors(page);
    await startWithSeed(page, era.seed);
    const birth = await page.getByTestId('birth-sentence').innerText();
    const year = await birthYear(page);
    expect(year).toBeGreaterThanOrEqual(era.years[0]);
    expect(year).toBeLessThanOrEqual(era.years[1]);

    // 출생 화면의 근거 보기: 이 시점의 신분 근거로 간다
    await page.locator('.odds__src').getByRole('button', { name: /근거 보기/ }).click();
    await expect(page.getByRole('heading', { name: '찾으신 근거' })).toBeVisible();
    await expect(page.locator('.sources__focus .src').first()).toBeVisible();
    await page.getByRole('button', { name: /돌아가기/ }).click();
    await expect(page.getByTestId('birth-sentence')).toHaveText(birth);

    // 첫 인생
    const first = await liveToDeath(page);
    expect(first.choices).toBeGreaterThan(0);
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    await expect(page.getByTestId('death-sentence')).toContainText(/향년 \d+세/);
    const record1 = await page.getByTestId('record-text').innerText();
    expect(record1).not.toMatch(FOREIGN[era.id]);
    expect(record1).not.toMatch(/\{\w+\}/);
    await expect(page.locator('.neighbors__item')).toHaveCount(3);

    // 엔딩의 근거 보기: 이 시점의 기록 엔딩 근거로 간다
    await page.locator('.ending').getByRole('button', { name: '근거 보기' }).click();
    await expect(page.locator('.sources__focus .src').filter({ hasText: '기록' })).toHaveCount(1);
    await page.getByRole('button', { name: /돌아가기/ }).click();
    await expect(page.getByTestId('record-text')).toBeVisible();

    // 팔자 고치기: 같은 출생으로 돌아가 기억을 먼저 고르며 다시 산다
    await page.getByRole('button', { name: /팔자 고치기/ }).click();
    await expect(page.locator('.regress-banner')).toContainText('팔자를 고치러 돌아왔습니다');
    await expect(page.getByTestId('birth-sentence')).toHaveText(birth);
    await liveToDeath(page, { prefer: 'memory' });
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    const record2 = await page.getByTestId('record-text').innerText();
    expect(record2).not.toMatch(FOREIGN[era.id]);
    await expect(page.getByRole('button', { name: /팔자 고치기/ })).toContainText('남은 2/3회');

    expect(errors).toEqual([]);
  });
}

// 660·1170 왕족: 조선의 "선원록" 대신 그 시점 왕실 기록이 남는다
for (const r of [
  { seed: 'royal45', era: '660', expect: /부여씨 왕실 계보/ },
  { seed: 'royal1172', era: '1170', expect: /고려 종실 세계/ },
]) {
  test(`${r.era} 왕족의 기록은 그 시점 왕실 기록이다`, async ({ page }) => {
    await startWithSeed(page, r.seed);
    await expect(page.locator('.odds__royal')).toBeVisible();
    await liveToDeath(page);
    await page.getByRole('button', { name: '남은 기록 보기' }).click();
    const text = await page.getByTestId('record-text').innerText();
    expect(text).toMatch(r.expect);
    expect(text).not.toMatch(FOREIGN[r.era]);
  });
}

test('근거 보기에 4개 시점의 출생 확률과 연표 사건이 모두 있다', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '근거 보기' }).click();
  await expect(page.locator('.odds-table')).toHaveCount(4);
  await expect(page.locator('.timeline')).toHaveCount(4);
  for (const era of ERAS) {
    const block = page.locator('.timeline').filter({ hasText: era.label });
    await expect(block, era.id).toHaveCount(1);
    expect(await block.locator('.timeline__item').count(), era.id).toBeGreaterThanOrEqual(10);
  }
  // 근거 없는 칸("—")이 없다
  await expect(page.locator('.odds-table td', { hasText: /^—$/ })).toHaveCount(0);
});
