import type { Profile } from '../core/types';
import { MISSIONS, REPLAY_MODES, isMissionUnlocked, type MissionSpec } from '../ui/content';

function FacilityCard({ mission, profile, onLaunch, index }: { mission: MissionSpec; profile: Profile; onLaunch: (mission: MissionSpec) => void; index: number }) {
  const unlocked = isMissionUnlocked(mission, profile.rank.current);
  const attempts = profile.attempts.filter((attempt) => mission.focus ? attempt.questionType === mission.focus : attempt.mode === mission.mode);
  const accuracy = attempts.length ? Math.round(attempts.filter((attempt) => attempt.correct).length / attempts.length * 100) : null;
  return (
    <button type="button" className={`facility-card accent-${mission.accent} ${!unlocked ? 'locked' : ''}`} onClick={() => unlocked && onLaunch(mission)} disabled={!unlocked} data-mission={mission.id}>
      <div className="facility-card__index">0{index + 1}</div>
      <div className="facility-card__glyph" aria-hidden="true"><span>{mission.icon}</span><i /></div>
      <div className="facility-card__copy"><span>{mission.callSign} // {mission.operation}</span><h3>{mission.label}</h3><p>{mission.description}</p></div>
      <div className="facility-card__metric"><span>{unlocked ? accuracy === null ? 'UNMAPPED' : `${accuracy}% SIGNAL` : `REQUIRES ${mission.unlockRank.toUpperCase()}`}</span><i>→</i></div>
    </button>
  );
}

export function SectorGrid({ profile, onLaunch }: { profile: Profile; onLaunch: (mission: MissionSpec) => void }) {
  return (
    <main className="screen sector-screen" data-screen="sectors">
      <header className="screen-title"><div><span className="eyebrow">TRAINING FACILITY // SELECT ROUTE</span><h1>Eight operations. One reflex.</h1><p>Choose a subskill to sharpen. The adaptive route still controls difficulty, cues and delayed returns.</p></div><div className="facility-count"><strong>{MISSIONS.filter((mission) => isMissionUnlocked(mission, profile.rank.current)).length}</strong><span>SECTORS ONLINE</span></div></header>
      <section className="facility-grid" aria-label="Training sectors">
        {MISSIONS.map((mission, index) => <FacilityCard key={mission.id} mission={mission} profile={profile} onLaunch={onLaunch} index={index} />)}
      </section>
      <header className="screen-title compact"><div><span className="eyebrow">COMPETITIVE SIMULATIONS</span><h2>Pressure protocols</h2><p>Records count only when the run satisfies its accuracy and assistance rules.</p></div></header>
      <section className="replay-grid">
        {REPLAY_MODES.map((mission, index) => <FacilityCard key={mission.id} mission={mission} profile={profile} onLaunch={onLaunch} index={index + MISSIONS.length} />)}
      </section>
    </main>
  );
}
