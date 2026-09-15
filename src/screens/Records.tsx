import type { Attempt, PersonalBestKey, Profile, RunSummary } from '../core/types';
import { RANKS } from '../ui/content';

function formatTime(ms?: number) {
  if (!ms || !Number.isFinite(ms)) return '—';
  return ms < 60_000 ? `${(ms / 1_000).toFixed(2)}s` : `${Math.floor(ms / 60_000)}:${String(Math.round(ms % 60_000 / 1_000)).padStart(2, '0')}`;
}

function formatDate(timestamp?: number) {
  if (!timestamp) return 'NO SIGNAL';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(timestamp)).toUpperCase();
}

function recordRows(profile: Profile): Array<{ key: PersonalBestKey; label: string; value: string; date?: number; className?: string }> {
  const { records } = profile;
  return [
    { key: 'perfectTen', label: 'Perfect Ten', value: formatTime(records.perfectTen?.durationMs), date: records.perfectTen?.achievedAt, className: 'gold' },
    { key: 'reflexArena', label: 'Reflex Rush', value: records.reflexArena?.score.toLocaleString() ?? '—', date: records.reflexArena?.achievedAt },
    { key: 'tableTransfer', label: 'Table Transfer', value: records.tableTransfer?.score.toLocaleString() ?? '—', date: records.tableTransfer?.achievedAt },
    { key: 'fastestSprSequence', label: 'SPR Snap Sequence', value: formatTime(records.fastestSprSequence?.durationMs), date: records.fastestSprSequence?.achievedAt },
    { key: 'longestCleanStreak', label: 'Longest Clean Streak', value: records.longestCleanStreak ? `${records.longestCleanStreak}` : '—' },
    { key: 'fastAccurateLatency', label: 'Latency at ≥90%', value: records.fastAccurateLatency ? formatTime(records.fastAccurateLatency.averageResponseMs) : '—', date: records.fastAccurateLatency?.achievedAt },
  ];
}

function groupAttempts(attempts: Attempt[]) {
  const chunks: Attempt[][] = [];
  for (let index = 0; index < attempts.length; index += 10) chunks.push(attempts.slice(index, index + 10));
  return chunks.slice(-12);
}

function runLabel(run: RunSummary) {
  return run.mode.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function Records({ profile }: { profile: Profile }) {
  const rank = RANKS.find((entry) => entry.id === profile.rank.current) ?? RANKS[0];
  const chunks = groupAttempts(profile.attempts);
  const recentRuns = profile.runs.slice(-6).reverse();
  return (
    <main className="screen records-screen" data-screen="records">
      <header className="screen-title"><div><span className="eyebrow">PERFORMANCE ARCHIVE</span><h1>Your competitive record</h1><p>Only valid, accuracy-qualified performances become records. Every benchmark is your own or explicitly standardized.</p></div><div className="rank-record"><span>{rank.short}</span><div><small>HIGHEST CLASS</small><strong>{RANKS.find((entry) => entry.id === profile.rank.highest)?.label ?? rank.label}</strong></div></div></header>
      <section className="record-layout">
        <article className="personal-bests game-frame">
          <div className="block-heading"><div><span className="eyebrow">PERSONAL BEST ARRAY</span><h2>Records worth chasing</h2></div><span className="signal-tag">VERIFIED LOCAL</span></div>
          <div className="record-list">
            {recordRows(profile).map((row, index) => <div key={row.key} className={row.className ?? ''}><span className="record-index">{String(index + 1).padStart(2, '0')}</span><div><small>{row.label}</small><strong>{row.value}</strong></div><em>{formatDate(row.date)}</em></div>)}
          </div>
        </article>
        <article className="classification game-frame">
          <div className="block-heading"><div><span className="eyebrow">CLASSIFICATION BASIS</span><h2>{rank.label}</h2></div><strong className="classification-score">{Math.round(profile.rank.skillRating)}</strong></div>
          <div className="rank-ladder-mini">
            {RANKS.map((entry) => <div key={entry.id} className={entry.threshold <= profile.rank.skillRating ? 'reached' : entry.id === profile.rank.eligibleFor ? 'eligible' : ''}><i /><span>{entry.label}</span><em>{entry.threshold}</em></div>)}
          </div>
          <p className="block-note">Classification uses minimum gates across recall, transfer, spacing, independence and accuracy-qualified latency. Volume alone cannot compensate for a missing skill.</p>
        </article>
      </section>
      <section className="progress-block game-frame">
        <div className="block-heading"><div><span className="eyebrow">CAPABILITY TRAJECTORY</span><h2>Accuracy / response latency</h2></div><span className="signal-tag">10-DECISION WINDOWS</span></div>
        <div className="progress-chart">
          <div className="progress-axis"><span>100%</span><span>90%</span><span>75%</span><span>50%</span></div>
          <svg viewBox="0 0 900 260" preserveAspectRatio="none" role="img" aria-label="Accuracy and response latency over time">
            <g className="chart-grid"><line x1="0" y1="20" x2="900" y2="20"/><line x1="0" y1="65" x2="900" y2="65"/><line x1="0" y1="130" x2="900" y2="130"/><line x1="0" y1="230" x2="900" y2="230"/></g>
            {chunks.length > 1 && <polyline className="accuracy-line" points={chunks.map((chunk, index) => `${index / (chunks.length - 1) * 880 + 10},${230 - chunk.filter((attempt) => attempt.correct).length / chunk.length * 210}`).join(' ')} />}
            {chunks.length > 1 && <polyline className="latency-line" points={chunks.map((chunk, index) => { const latency = chunk.reduce((sum, attempt) => sum + attempt.responseTimeMs, 0) / chunk.length; return `${index / (chunks.length - 1) * 880 + 10},${Math.min(230, 30 + latency / 25)}`; }).join(' ')} />}
            {chunks.map((chunk, index) => { const accuracy = chunk.filter((attempt) => attempt.correct).length / chunk.length; return <circle key={index} className="accuracy-dot" cx={chunks.length === 1 ? 450 : index / (chunks.length - 1) * 880 + 10} cy={230 - accuracy * 210} r="5" />; })}
          </svg>
          {!chunks.length && <div className="chart-empty">Capability trajectory appears after your first ten decisions.</div>}
          <div className="chart-legend"><span><i className="cyan" />ACCURACY</span><span><i className="amber" />LATENCY — LOWER IS BETTER</span></div>
        </div>
      </section>
      <section className="run-history game-frame">
        <div className="block-heading"><div><span className="eyebrow">RECENT SORTIES</span><h2>Run archive</h2></div></div>
        {recentRuns.length ? recentRuns.map((run) => <div className="run-row" key={run.id}><span>{formatDate(run.endedAt)}</span><strong>{runLabel(run)}</strong><em>{Math.round(run.accuracy * 100)}% · {formatTime(run.medianResponseMs)}</em><b>{run.score.toLocaleString()}</b></div>) : <div className="empty-run">No completed sorties. The first record is waiting.</div>}
      </section>
    </main>
  );
}
