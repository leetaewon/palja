// npm run sim:lives [-- --n 10000 --era 1592 --json]
// 자동 선택 봇으로 인생을 시뮬레이션하고 PRD 6-1 보정 목표를 확인한다.
import { loadContent } from '../src/content/index';
import {
  autoLive,
  createBirth,
  findStatus,
  judgeRecord,
  regress,
  RECORD_LEVELS,
  causeName,
  type Content,
  type LifeState,
  type RecordLevel,
} from '../src/engine/index';
import { recordRank } from '../src/engine/ending';

export interface SimSummary {
  n: number;
  meanDeathAge: number;
  under5Rate: number;
  adultMeanDeathAge: number;
  statusDist: Record<string, number>;
  meanByStatus: Record<string, { n: number; mean: number; adultMean: number; over60: number; under5: number }>;
  causeDist: Record<string, number>;
  recordDist: Record<RecordLevel, number>;
  regression: {
    first: { mean: number; adultMean: number };
    naive: { mean: number; adultMean: number };
    smart: { mean: number; adultMean: number; recordUp: number; withChanges: number; scopes: Record<string, number>; knowledgeUses: number };
    surviveLonger: number;
  };
  targets: { name: string; value: string; ok: boolean }[];
}

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

function deathAge(s: LifeState): number {
  return s.dead?.age ?? 0;
}

export function simulate(content: Content, n: number, opts: { eraId?: string; seedPrefix?: string; regression?: boolean } = {}): SimSummary {
  const prefix = opts.seedPrefix ?? 'sim';
  const ages: number[] = [];
  const adultAges: number[] = [];
  const statusCount: Record<string, number> = {};
  const byStatus: Record<string, { ages: number[]; adult: number[] }> = {};
  const causeCount: Record<string, number> = {};
  const recordCount = Object.fromEntries(RECORD_LEVELS.map((l) => [l, 0])) as Record<RecordLevel, number>;
  const naiveAges: number[] = [];
  const naiveAdult: number[] = [];
  const smartAges: number[] = [];
  const smartAdult: number[] = [];
  const firstAgesReg: number[] = [];
  const firstAdultReg: number[] = [];
  let recordUp = 0;
  let withChanges = 0;
  let longer = 0;
  let knowledgeUses = 0;
  const scopes: Record<string, number> = {};
  const doRegression = opts.regression ?? true;

  for (let i = 0; i < n; i++) {
    const birth = createBirth(content, `${prefix}-${i}`, { eraId: opts.eraId });
    const life = autoLive(content, birth, { policy: 'random' });
    const age = deathAge(life);
    ages.push(age);
    if (age >= 15) adultAges.push(age);
    statusCount[birth.statusId] = (statusCount[birth.statusId] ?? 0) + 1;
    const bs = (byStatus[birth.statusId] ??= { ages: [], adult: [] });
    bs.ages.push(age);
    if (age >= 15) bs.adult.push(age);
    const cause = life.dead?.cause ?? '?';
    causeCount[cause] = (causeCount[cause] ?? 0) + 1;
    const record = judgeRecord(content, life);
    recordCount[record.level] += 1;

    if (doRegression) {
      // 회귀 변화량: 같은 출생으로 한 번 회귀한다.
      // naive = 회귀했지만 기억·지식을 쓰지 않는 봇, smart = 기억·지식 선택지를 먼저 고르는 봇
      const naive = autoLive(content, birth, { lifeIndex: 1, memory: regress(content, life).memory, policy: 'random', botSeed: `${prefix}-${i}:bot:naive` });
      const smart = autoLive(content, birth, { lifeIndex: 1, memory: regress(content, life).memory, policy: 'smart', botSeed: `${prefix}-${i}:bot:naive` });
      const na = deathAge(naive);
      const sa = deathAge(smart);
      naiveAges.push(na);
      smartAges.push(sa);
      firstAgesReg.push(age);
      if (age >= 15) firstAdultReg.push(age);
      if (na >= 15) naiveAdult.push(na);
      if (sa >= 15) smartAdult.push(sa);
      if (sa > age) longer++;
      const r2 = judgeRecord(content, smart);
      if (recordRank(r2.level) > recordRank(record.level)) recordUp++;
      if (smart.changes.length > 0) withChanges++;
      for (const c of smart.changes) scopes[c.scope] = (scopes[c.scope] ?? 0) + 1;
      knowledgeUses += smart.knowledgeUsed.length;
    }
  }

  const meanDeathAge = mean(ages);
  const under5Rate = ages.filter((a) => a < 5).length / n;
  const adultMeanDeathAge = mean(adultAges);
  const meanByStatus: SimSummary['meanByStatus'] = {};
  for (const [k, v] of Object.entries(byStatus)) {
    meanByStatus[k] = {
      n: v.ages.length,
      mean: mean(v.ages),
      adultMean: mean(v.adult),
      over60: v.adult.filter((a) => a >= 60).length / Math.max(1, v.adult.length),
      under5: v.ages.filter((a) => a < 5).length / Math.max(1, v.ages.length),
    };
  }
  const overall = meanDeathAge;
  const royal = meanByStatus['royal'];
  const yangban = meanByStatus['yangban'];
  const targets = [
    { name: '전체 평균 사망 나이 20대 중반 (22~28세)', value: `${meanDeathAge.toFixed(1)}세`, ok: meanDeathAge >= 22 && meanDeathAge <= 28 },
    { name: '5세 이전 사망 30~40%', value: pct(under5Rate), ok: under5Rate >= 0.3 && under5Rate <= 0.4 },
    { name: '성인(15세 이상) 평균 사망 나이 45~55세', value: `${adultMeanDeathAge.toFixed(1)}세`, ok: adultMeanDeathAge >= 45 && adultMeanDeathAge <= 55 },
    {
      name: '왕족·양반은 평균보다 오래 산다',
      value: `왕족 ${royal?.mean.toFixed(1) ?? '-'}세, 양반 ${yangban?.mean.toFixed(1) ?? '-'}세 (전체 ${overall.toFixed(1)}세)`,
      ok: !!royal && !!yangban && royal.mean > overall && yangban.mean > overall,
    },
    {
      name: '장수가 보장되지는 않는다 (왕족·양반도 5세 이전 사망 15% 이상, 성인 중 60세 넘긴 사람 80% 미만)',
      value: `5세 이전 사망 왕족 ${royal ? pct(royal.under5) : '-'}·양반 ${yangban ? pct(yangban.under5) : '-'}, 성인 중 60세 이상 왕족 ${royal ? pct(royal.over60) : '-'}·양반 ${yangban ? pct(yangban.over60) : '-'}`,
      ok: !!royal && !!yangban && royal.under5 >= 0.15 && yangban.under5 >= 0.15 && royal.over60 < 0.8 && yangban.over60 < 0.8,
    },
  ];

  return {
    n,
    meanDeathAge,
    under5Rate,
    adultMeanDeathAge,
    statusDist: Object.fromEntries(Object.entries(statusCount).map(([k, v]) => [k, v / n])),
    meanByStatus,
    causeDist: Object.fromEntries(Object.entries(causeCount).map(([k, v]) => [k, v / n])),
    recordDist: Object.fromEntries(Object.entries(recordCount).map(([k, v]) => [k, v / n])) as Record<RecordLevel, number>,
    regression: {
      first: { mean: mean(firstAgesReg), adultMean: mean(firstAdultReg) },
      naive: { mean: mean(naiveAges), adultMean: mean(naiveAdult) },
      smart: {
        mean: mean(smartAges),
        adultMean: mean(smartAdult),
        recordUp: n ? recordUp / n : 0,
        withChanges: n ? withChanges / n : 0,
        scopes,
        knowledgeUses: n ? knowledgeUses / n : 0,
      },
      surviveLonger: n ? longer / n : 0,
    },
    targets,
  };
}

const RECORD_NAMES: Record<RecordLevel, string> = { none: '기록 없음', hojeok: '호적', jokbo: '족보', munjip: '문집·읍지', sillok: '실록' };
const SCOPE_NAMES: Record<string, string> = { family: '가족', village: '마을', county: '고을', nation: '나라' };

export function formatReport(content: Content, r: SimSummary, eraId: string): string {
  const L: string[] = [];
  const statusName = (id: string) => findStatus(content, eraId, id).name;
  L.push(`## sim:lives — 시점 ${eraId}, ${r.n.toLocaleString()} 인생 (자동 선택 봇)`);
  L.push('');
  L.push('### 보정 목표 (PRD 6-1)');
  for (const t of r.targets) L.push(`- [${t.ok ? 'x' : ' '}] ${t.name}: **${t.value}**`);
  L.push('');
  L.push('### 신분 분포와 신분별 사망 나이');
  L.push('| 신분 | 출생 비율 | 평균 사망 나이 | 5세 이전 사망 | 성인 평균 사망 나이 | 성인 중 60세 이상 |');
  L.push('|---|---:|---:|---:|---:|---:|');
  const order = ['royal', 'yangban', 'jungin', 'commoner', 'slave'];
  const keys = Object.keys(r.statusDist).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  for (const k of keys) {
    const m = r.meanByStatus[k];
    L.push(`| ${statusName(k)} | ${pct(r.statusDist[k])} | ${m.mean.toFixed(1)}세 | ${pct(m.under5)} | ${m.adultMean.toFixed(1)}세 | ${pct(m.over60)} |`);
  }
  L.push('');
  L.push(`- 전체 평균 사망 나이: ${r.meanDeathAge.toFixed(1)}세`);
  L.push(`- 5세 이전 사망률: ${pct(r.under5Rate)}`);
  L.push(`- 성인(15세 이상) 평균 사망 나이: ${r.adultMeanDeathAge.toFixed(1)}세`);
  L.push('');
  L.push('### 사인 분포');
  L.push('| 사인 | 비율 |');
  L.push('|---|---:|');
  for (const [k, v] of Object.entries(r.causeDist).sort((a, b) => b[1] - a[1])) L.push(`| ${causeName(content, k)} | ${pct(v)} |`);
  L.push('');
  L.push('### 기록 등급 분포');
  L.push('| 기록 | 비율 |');
  L.push('|---|---:|');
  for (const l of RECORD_LEVELS) L.push(`| ${RECORD_NAMES[l]} | ${pct(r.recordDist[l] ?? 0)} |`);
  L.push('');
  L.push('### 회귀 시 변화량 (같은 출생으로 1회 회귀)');
  const g = r.regression;
  L.push('| | 평균 사망 나이 | 성인 평균 사망 나이 |');
  L.push('|---|---:|---:|');
  L.push(`| 첫 인생 | ${g.first.mean.toFixed(1)}세 | ${g.first.adultMean.toFixed(1)}세 |`);
  L.push(`| 회귀, 기억·지식 안 씀 | ${g.naive.mean.toFixed(1)}세 | ${g.naive.adultMean.toFixed(1)}세 |`);
  L.push(`| 회귀, 기억·지식 씀 | ${g.smart.mean.toFixed(1)}세 | ${g.smart.adultMean.toFixed(1)}세 |`);
  L.push('');
  L.push(`- 회귀(기억·지식 씀)에서 첫 인생보다 오래 산 비율: ${pct(g.surviveLonger)}`);
  L.push(`- 기록 등급이 올라간 비율: ${pct(g.smart.recordUp)}`);
  L.push(`- "이번 생에서 바꾼 것"이 하나 이상인 비율: ${pct(g.smart.withChanges)}`);
  L.push(`- 인생당 현대 지식 사용 횟수: ${g.smart.knowledgeUses.toFixed(2)}`);
  L.push(
    `- 인생당 바꾼 것 (범위별 평균): ${['family', 'village', 'county', 'nation'].map((k) => `${SCOPE_NAMES[k]} ${((g.smart.scopes[k] ?? 0) / r.n).toFixed(2)}`).join(', ')}`,
  );
  return L.join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const n = Number(get('n') ?? 10000);
  const content = loadContent();
  const eras = get('era') ? [get('era') as string] : content.eras.map((e) => e.id);
  let failed = false;
  const t0 = performance.now();
  for (const eraId of eras) {
    const r = simulate(content, n, { eraId });
    if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else console.log(formatReport(content, r, eraId));
    if (r.targets.some((t) => !t.ok)) failed = true;
  }
  console.log(`\n(${((performance.now() - t0) / 1000).toFixed(1)}초)`);
  if (failed) {
    console.log('\n보정 목표를 만족하지 못한 항목이 있습니다.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].endsWith('sim-lives.ts')) main();
