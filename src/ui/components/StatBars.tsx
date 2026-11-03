import type { Stats } from '../../engine';

export const STAT_LABEL: Record<keyof Stats, string> = {
  health: '건강',
  wealth: '재산',
  learning: '학식',
  trust: '신뢰',
};

const ORDER: (keyof Stats)[] = ['health', 'wealth', 'learning', 'trust'];

export function StatBars({ stats, compact = false }: { stats: Stats; compact?: boolean }) {
  return (
    <dl className={`stats ${compact ? 'stats--compact' : ''}`}>
      {ORDER.map((k) => (
        <div key={k} className="stats__row">
          <dt>{STAT_LABEL[k]}</dt>
          <dd>
            <span className="stats__bar" aria-hidden="true">
              <span className="stats__fill" style={{ width: `${stats[k]}%` }} />
            </span>
            <span className="stats__num">{stats[k]}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function StatLine({ stats }: { stats: Stats }) {
  return (
    <span className="statline">
      {ORDER.map((k) => (
        <span key={k} className="statline__item">
          {STAT_LABEL[k]} <b>{stats[k]}</b>
        </span>
      ))}
    </span>
  );
}
