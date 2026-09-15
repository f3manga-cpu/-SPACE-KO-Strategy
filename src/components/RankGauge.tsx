import type { RankId } from '../core/types';
import { RANKS } from '../ui/content';

export function RankGauge({ rank, rating, eligible }: { rank: RankId; rating: number; eligible?: RankId | null }) {
  const current = RANKS.find((entry) => entry.id === rank) ?? RANKS[0];
  const index = RANKS.indexOf(current);
  const next = RANKS[Math.min(index + 1, RANKS.length - 1)];
  const span = Math.max(1, next.threshold - current.threshold);
  const progress = current === next ? 100 : Math.max(0, Math.min(100, ((rating - current.threshold) / span) * 100));
  return (
    <div className="rank-gauge" style={{ '--rank-progress': `${progress}%` } as React.CSSProperties}>
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <defs><linearGradient id="rankArc" x1="0" x2="1"><stop stopColor="#53d8ff"/><stop offset="1" stopColor="#ffb45f"/></linearGradient></defs>
        <circle className="rank-gauge__track" cx="90" cy="90" r="74" />
        <circle className="rank-gauge__arc" cx="90" cy="90" r="74" pathLength="100" strokeDasharray={`${progress} 100`} />
        {Array.from({ length: 12 }, (_, index2) => <line key={index2} x1="90" y1="8" x2="90" y2="14" transform={`rotate(${index2 * 30} 90 90)`} />)}
      </svg>
      <div className="rank-gauge__core"><small>SKILL RATING</small><strong>{Math.round(rating)}</strong><span>{current.label}</span></div>
      <div className="rank-gauge__footer">{eligible ? `${RANKS.find((entry) => entry.id === eligible)?.label} qualification ready` : current === next ? 'Apex classification held' : `${Math.max(0, Math.ceil(next.threshold - rating))} points to ${next.label}`}</div>
    </div>
  );
}
