import { ANCHORS, THREE_STREET_RHYTHM, TWO_STREET_RHYTHM } from '../core/geometry';
import type { ConceptState, MasteryBand, Profile } from '../core/types';
import type { MissionSpec } from '../ui/content';

const bandOrder: MasteryBand[] = ['dormant', 'discovered', 'unstable', 'forged', 'stabilized', 'mastered'];

function conceptFor(profile: Profile, id: string): ConceptState | undefined {
  return profile.concepts[id];
}

function energy(concept?: ConceptState) {
  if (!concept) return 0;
  const recall = concept.mastery * 0.65 + concept.stability * 0.35;
  const overdueMs = Math.max(0, Date.now() - concept.nextReviewAt);
  const decayWindow = Math.max(86_400_000, concept.spacingIntervalMs || 86_400_000);
  const availability = concept.attempts > 0 ? Math.max(0.32, Math.exp(-overdueMs / decayWindow * 0.28)) : 0;
  return Math.round(Math.max(0.05, recall * availability) * 100);
}

function GridNode({ anchor, concept, side }: { anchor: (typeof ANCHORS)[number]; concept?: ConceptState; side: 'upper' | 'lower' }) {
  const state = concept?.masteryBand ?? 'dormant';
  const level = bandOrder.indexOf(state);
  const isCross = anchor.spr === 4;
  return (
    <div className={`anchor-node anchor-node--${side} is-${state} ${isCross ? 'is-cross' : ''}`} style={{ '--node-energy': `${energy(concept)}%` } as React.CSSProperties} data-concept={anchor.id}>
      <div className="anchor-node__halo"><i /><i /><i /></div>
      <div className="anchor-node__core">
        <small>SPR</small><strong>{anchor.spr}</strong><span>{anchor.percent === 100 ? 'POT' : `${anchor.percent}%`}</span>
      </div>
      <div className="anchor-node__state"><span>{state}</span><i>{level}/5</i></div>
    </div>
  );
}

export function AnchorGrid({ profile, onLaunch }: { profile: Profile; onLaunch: (mission: MissionSpec) => void }) {
  const mastered = ANCHORS.filter((anchor) => ['stabilized', 'mastered'].includes(conceptFor(profile, anchor.id)?.masteryBand ?? '')).length;
  const crossThree = conceptFor(profile, 'anchor:3:4');
  const crossTwo = conceptFor(profile, 'anchor:2:4');
  const crossEnergy = Math.round((energy(crossThree) + energy(crossTwo)) / 2);
  const forgeMission: MissionSpec = { id: 'anchor-forge', label: 'Anchor Forge', callSign: 'AF–10', description: 'Canonical line retrieval', operation: 'RETRIEVE', mode: 'adaptive', focus: 'anchor', length: 10, metric: 'Stable recall', icon: '⌁', unlockRank: 'unranked', accent: 'cyan' };
  return (
    <main className="screen anchor-grid-screen" data-screen="grid">
      <header className="screen-title"><div><span className="eyebrow">PERSISTENT MASTERY WORLD</span><h1>The Anchor Grid</h1><p>Earned nodes never vanish. Their energy reveals which memories remain accessible and which need reconsolidation.</p></div><div className="facility-count"><strong>{mastered}<small>/10</small></strong><span>STABLE NODES</span></div></header>
      <section className="mastery-world game-frame">
        <div className="mastery-world__header"><span>AXIOM MEMORY BUS</span><i /> <strong>{profile.rank.current.replace('-', ' ').toUpperCase()} ACCESS</strong></div>
        <div className="anchor-path anchor-path--upper">
          <div className="path-label"><span>PATH A</span><strong>THREE-STREET GEOMETRY</strong><em>FLOP → RIVER</em></div>
          <div className="path-rail"><i /></div>
          {ANCHORS.filter((anchor) => anchor.streets === 3).map((anchor) => <GridNode key={anchor.id} anchor={anchor} concept={conceptFor(profile, anchor.id)} side="upper" />)}
          <div className="rhythm-plate">{THREE_STREET_RHYTHM}</div>
        </div>
        <div className="cross-reactor">
          <div className="cross-reactor__orbit"><i /><i /><i /></div>
          <div><span>THE CROSS-SYSTEM LANDMARK</span><strong>SPR 4</strong><p><b>54%</b> across three streets <i>//</i> <b>POT</b> across two</p><em>{crossEnergy}% DUAL-TRACE ENERGY</em></div>
        </div>
        <div className="anchor-path anchor-path--lower">
          <div className="path-label"><span>PATH B</span><strong>TWO-STREET GEOMETRY</strong><em>TURN → RIVER</em></div>
          <div className="path-rail"><i /></div>
          {ANCHORS.filter((anchor) => anchor.streets === 2).map((anchor) => <GridNode key={anchor.id} anchor={anchor} concept={conceptFor(profile, anchor.id)} side="lower" />)}
          <div className="rhythm-plate">{TWO_STREET_RHYTHM}</div>
        </div>
        <div className="world-legend">
          {bandOrder.map((band) => <span key={band}><i className={`legend-${band}`} />{band}</span>)}
        </div>
      </section>
      <section className="grid-actions">
        <div><span className="eyebrow">GRID DOCTRINE</span><p>Same-session fluency can forge a node. Stabilization requires unassisted retrieval after a delay; mastery also requires table transfer.</p></div>
        <button type="button" className="action-primary" onClick={() => onLaunch(forgeMission)}>ENTER ANCHOR FORGE <i>→</i></button>
      </section>
    </main>
  );
}
