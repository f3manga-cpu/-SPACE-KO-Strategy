import type { Profile, QuestionType } from '../core/types';
import type { MissionSpec } from '../ui/content';
import { MISSIONS, REPLAY_MODES, RANKS, isMissionUnlocked } from '../ui/content';
import { RankGauge } from '../components/RankGauge';
import { rankDefinition } from '../core/rank';

const dayKey = () => new Intl.DateTimeFormat('en-CA').format(new Date());

function metricFor(profile: Profile, family: string) {
  const attempts = profile.attempts.filter((attempt) => attempt.questionType === family);
  if (!attempts.length) return null;
  return attempts.filter((attempt) => attempt.correct).length / attempts.length;
}

function recommendedMission(profile: Profile): MissionSpec & { reason: string } {
  const due = Object.values(profile.concepts).filter((concept) => concept.attempts > 0 && concept.nextReviewAt <= Date.now()).length;
  if (due > 0) {
    return {
      id: 'memory-return', label: 'Memory Return', callSign: 'MR–DUE', description: `${due} memory ${due === 1 ? 'trace is' : 'traces are'} ready for reconsolidation.`, operation: 'RECONSOLIDATE', mode: 'memory-return', length: Math.min(10, Math.max(4, due * 2)), metric: 'Spaced stability', icon: '↻', unlockRank: 'unranked', accent: 'green', reason: 'Highest-value review window',
    };
  }
  if (profile.stats.totalAttempts < 8) {
    return { ...MISSIONS[0], length: 6, reason: 'Complete landmark acquisition' };
  }
  const transferAccuracy = metricFor(profile, 'transfer');
  if (transferAccuracy !== null && transferAccuracy < 0.78) {
    return { ...MISSIONS.find((mission) => mission.id === 'table-zero')!, reason: 'Transfer is your current bottleneck' };
  }
  const startedConcepts = Object.values(profile.concepts).filter((concept) => concept.attempts > 0);
  if (startedConcepts.length) {
    const weakest = [...startedConcepts].sort((a, b) => a.mastery - b.mastery)[0];
    const focusMap: Partial<Record<typeof weakest.family, QuestionType>> = {
      'anchor-two': 'anchor', 'anchor-three': 'anchor', 'spr-recognition': 'spr-snap', runway: 'runway', precision: 'precision', 'table-transfer': 'transfer', contrast: 'contrast', 'inverse-geometry': 'ghost-line', 'root-method': 'root-reactor',
    };
    return {
      id: 'weakness-hunt', label: 'Weakness Hunt', callSign: 'WH–08', description: `Target ${weakest.id.replaceAll('-', ' ')} until the signal stabilizes, then return it to mixed play.`, operation: 'REPAIR', mode: 'weakness-hunt', focus: focusMap[weakest.family], length: 8, metric: 'Fragility recovered', icon: '⌖', unlockRank: 'unranked', accent: 'amber', reason: 'Scheduler-selected repair route',
    };
  }
  return { ...MISSIONS[0], length: 6, reason: 'First landmark acquisition' };
}

function formatRecord(milliseconds: number | undefined) {
  if (!milliseconds) return '—';
  return `${(milliseconds / 1_000).toFixed(2)}s`;
}

export function CommandDeck({ profile, onLaunch, onOpenSectors, onOpenGrid }: {
  profile: Profile;
  onLaunch: (mission: MissionSpec) => void;
  onOpenSectors: () => void;
  onOpenGrid: () => void;
}) {
  const recommended = recommendedMission(profile);
  const started = Object.values(profile.concepts).filter((concept) => concept.attempts > 0);
  const due = started.filter((concept) => concept.nextReviewAt <= Date.now()).length;
  const weak = started.length ? [...started].sort((a, b) => a.mastery - b.mastery)[0] : null;
  const stabilized = started.filter((concept) => ['stabilized', 'mastered'].includes(concept.masteryBand)).length;
  const latestAttempts = profile.attempts.slice(-20);
  const latestAccuracy = latestAttempts.length ? latestAttempts.filter((attempt) => attempt.correct).length / latestAttempts.length : 0;
  const eligibleRank = profile.rank.eligibleFor ? RANKS.find((rank) => rank.id === profile.rank.eligibleFor) : null;
  const qualificationQuestions = profile.rank.eligibleFor ? rankDefinition(profile.rank.eligibleFor).qualification?.questions ?? 12 : 12;
  const daily = {
    id: `daily-${dayKey()}`, label: 'Daily Protocol', callSign: dayKey().slice(5).replace('-', '·'), description: 'A seeded twelve-decision benchmark: anchors, ratios, contrast and table transfer.', operation: 'DAILY SIGNAL', mode: 'daily-challenge' as const, length: 12, metric: 'Daily score', icon: '◫', unlockRank: 'unranked' as const, accent: 'violet' as const, highStakes: true,
  };

  return (
    <main className="screen command-deck" data-screen="command">
      <section className="hero-command game-frame">
        <div className="hero-command__scan" />
        <div className="hero-command__copy">
          <div className="hero-command__status"><i /> NEXT OPTIMAL MISSION <span>{recommended.reason}</span></div>
          <h1>{recommended.label}</h1>
          <p>{recommended.description}</p>
          <div className="mission-vitals">
            <div><span>OPERATION</span><strong>{recommended.operation}</strong></div>
            <div><span>EST. DURATION</span><strong>{Math.max(2, Math.round(recommended.length * 0.35))} MIN</strong></div>
            <div><span>PRIMARY SIGNAL</span><strong>{recommended.metric.toUpperCase()}</strong></div>
          </div>
          <div className="hero-actions">
            <button type="button" className="action-primary" onClick={() => onLaunch(recommended)}><span>ENGAGE MISSION</span><i aria-hidden="true">→</i></button>
            <button type="button" className="action-secondary" onClick={onOpenSectors}>CHOOSE SECTOR</button>
          </div>
        </div>
        <div className="hero-command__rank">
          <RankGauge rank={profile.rank.current} rating={profile.rank.skillRating} eligible={profile.rank.eligibleFor} />
        </div>
        <div className="hero-command__coordinates"><span>SIM CHAMBER 07</span><span>47.218° // ACTIVE</span></div>
      </section>

      <section className="return-strip" aria-label="Return briefing">
        <button type="button" onClick={() => onLaunch({ ...recommended, id: 'memory-return', label: 'Memory Return', mode: 'memory-return', focus: undefined, length: Math.max(4, due * 2 || 4) })} disabled={!due}>
          <i className="return-icon">↻</i><div><span>MEMORY RETURN</span><strong>{due ? `${due} ${due === 1 ? 'anchor' : 'anchors'} due` : 'No traces due'}</strong></div><em>{due ? 'OPEN' : 'STABLE'}</em>
        </button>
        <button type="button" onClick={onOpenGrid}>
          <i className="return-icon">⌘</i><div><span>ANCHOR GRID</span><strong>{stabilized} stabilized</strong></div><em>VIEW</em>
        </button>
        <button type="button" onClick={() => onLaunch(daily)}>
          <i className="return-icon">◫</i><div><span>DAILY PROTOCOL</span><strong>{profile.records.dailyChallenge ? `Best ${profile.records.dailyChallenge.score.toLocaleString()}` : 'Signal unclaimed'}</strong></div><em>RUN</em>
        </button>
        <button type="button" onClick={() => onLaunch(REPLAY_MODES[0])}>
          <i className="return-icon">10</i><div><span>PERSONAL GHOST</span><strong>{profile.records.perfectTen ? formatRecord(profile.records.perfectTen.durationMs) : 'No clean line yet'}</strong></div><em>RACE</em>
        </button>
      </section>

      {eligibleRank && (
        <section className="qualification-banner game-frame">
          <div className="qualification-sigil"><span>{eligibleRank.short}</span></div>
          <div><span className="eyebrow">CLASSIFICATION EVENT AVAILABLE</span><h2>{eligibleRank.label} qualification</h2><p>Your metrics crossed the gate. Rank is awarded only if you prove it in a mixed, unassisted run.</p></div>
          <button type="button" className="action-primary" onClick={() => onLaunch({ id: 'qualification', label: `${eligibleRank.label} Qualification`, callSign: `Q–${qualificationQuestions}`, description: 'Mixed proof run', operation: 'QUALIFY', mode: 'qualification', length: qualificationQuestions, metric: 'Qualification standard', icon: eligibleRank.short, unlockRank: profile.rank.current, accent: 'amber', highStakes: true })}>ENTER GATE</button>
        </section>
      )}

      <section className="command-grid">
        <article className="telemetry-block game-frame">
          <div className="block-heading"><div><span className="eyebrow">LIVE CAPABILITY</span><h2>Faster without decay</h2></div><span className="signal-tag">LAST {latestAttempts.length || 0}</span></div>
          <div className="telemetry-hero">
            <div><small>RETRIEVAL ACCURACY</small><strong>{latestAttempts.length ? Math.round(latestAccuracy * 100) : '—'}<em>%</em></strong></div>
            <div><small>MEDIAN RESPONSE</small><strong>{profile.attempts.length ? (profile.attempts.slice(-20).map((attempt) => attempt.responseTimeMs).sort((a, b) => a - b)[Math.floor(Math.min(19, profile.attempts.length - 1) / 2)] / 1000).toFixed(2) : '—'}<em>s</em></strong></div>
            <div><small>UNASSISTED</small><strong>{latestAttempts.length ? Math.round(latestAttempts.filter((attempt) => attempt.scaffoldLevel === 0 && attempt.correct).length / latestAttempts.length * 100) : '—'}<em>%</em></strong></div>
          </div>
          <div className="signal-chart" aria-label="Last twenty answers">
            {Array.from({ length: 20 }, (_, index) => {
              const attempt = latestAttempts[index - (20 - latestAttempts.length)];
              const height = attempt ? Math.max(20, 100 - Math.min(80, attempt.responseTimeMs / 40)) : 8;
              return <i key={index} className={!attempt ? 'empty' : attempt.correct ? 'correct' : 'wrong'} style={{ height: `${height}%` }} />;
            })}
            <span className="chart-threshold">90% ACCURACY FLOOR</span>
          </div>
          <p className="block-note">Speed contributes only when accuracy is stable. Fast guesses never move classification.</p>
        </article>

        <article className="threat-block game-frame">
          <div className="block-heading"><div><span className="eyebrow">FRAGILITY SCAN</span><h2>{weak ? 'Weak trace isolated' : 'Awaiting calibration'}</h2></div><span className={`signal-tag ${weak ? 'warning' : ''}`}>{weak ? weak.masteryBand.toUpperCase() : 'NO DATA'}</span></div>
          {weak ? (
            <>
              <div className="weak-signal"><div className="weak-signal__glyph">⌖</div><div><span>{weak.family.replace('-', ' ').toUpperCase()}</span><strong>{weak.id.replaceAll('-', ' ')}</strong><p>{weak.highConfidenceErrors ? `${weak.highConfidenceErrors} locked-confidence error${weak.highConfidenceErrors === 1 ? '' : 's'} detected.` : weak.latencyEmaMs ? `Recall latency ${Math.round(weak.latencyEmaMs)}ms; trace needs reinforcement.` : 'Insufficient independent evidence.'}</p></div></div>
              <div className="stability-line"><span>TRACE ENERGY</span><div><i style={{ width: `${Math.round(weak.stability * 100)}%` }} /></div><strong>{Math.round(weak.stability * 100)}%</strong></div>
              <button type="button" className="action-secondary wide" onClick={() => onLaunch(recommended.id === 'weakness-hunt' ? recommended : { ...recommended, id: 'weakness-hunt', label: 'Weakness Hunt', mode: 'weakness-hunt', length: 8 })}>REPAIR SIGNAL</button>
            </>
          ) : (
            <div className="empty-scan"><span className="radar-pulse" /><p>Complete a short calibration run. The forge will identify exactly where your line breaks.</p></div>
          )}
        </article>
      </section>
    </main>
  );
}
