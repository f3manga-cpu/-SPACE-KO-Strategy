import { useMemo, useState } from 'react';
import { rootReactorStages } from '../core/geometry';

const pipeline = [
  { label: 'Effective stack', glyph: 'S', detail: 'The chips either player can still put at risk.' },
  { label: 'Pot', glyph: 'P', detail: 'The chips already in the middle — the reference for every bet.' },
  { label: 'SPR', glyph: '÷', detail: 'Effective stack ÷ pot. This is the stack-to-pot ratio.' },
  { label: 'Streets', glyph: 'n', detail: 'The runway left: three streets on the flop, two on the turn.' },
  { label: '% pot', glyph: '%', detail: 'The strategic representation: the same fraction of each live pot.' },
  { label: 'Actual BB action', glyph: 'BB', detail: 'The executable table action: percentage × current pot.' },
] as const;

const threeStreetAnchors = [
  { spr: '2', size: '35%' },
  { spr: '3', size: '46%' },
  { spr: '4', size: '54%', key: true },
  { spr: '5', size: '61%' },
  { spr: '6', size: '68%' },
];

const twoStreetAnchors = [
  { spr: '1', size: '37%' },
  { spr: '1.5', size: '50%', key: true },
  { spr: '2', size: '62%' },
  { spr: '3', size: '82%' },
  { spr: '4', size: 'POT', key: true },
];

const operations = [
  { label: 'DOUBLE', short: '2S', meaning: 'Both effective stacks ultimately need to enter the pot.' },
  { label: 'PLUS ONE', short: '+1', meaning: 'Add the current pot, which already exists before either stack enters.' },
  { label: 'ROOT', short: 'ROOT', meaning: 'Distribute the total pot growth evenly over the remaining streets.' },
  { label: 'MINUS ONE', short: '−1', meaning: 'Remove the existing-pot portion from the per-street growth multiplier.' },
  { label: 'HALF', short: '÷2', meaning: "A called bet adds two equal shares: hero's bet and villain's call." },
] as const;

function AnchorLadder({ title, subtitle, anchors }: {
  title: string;
  subtitle: string;
  anchors: Array<{ spr: string; size: string; key?: boolean }>;
}) {
  return (
    <article className="academy-ladder game-frame">
      <header><div><span>{subtitle}</span><h3>{title}</h3></div><i aria-hidden="true">{anchors.length}</i></header>
      <div className="academy-ladder__rail">
        {anchors.map((anchor) => (
          <div className={anchor.key ? 'is-key' : ''} key={anchor.spr}>
            <span>SPR {anchor.spr}</span><strong>{anchor.size}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export function Academy() {
  const [activePipeline, setActivePipeline] = useState(0);
  const [streets, setStreets] = useState<2 | 3>(3);
  const [activeOperation, setActiveOperation] = useState(0);

  const reactorValues = useMemo(() => {
    const stages = rootReactorStages(4, streets);
    const doubled = stages.find((stage) => stage.id === 'double')!.value;
    const finalMultiple = stages.find((stage) => stage.id === 'add-one')!.value;
    const rooted = stages.find((stage) => stage.id === 'root')!.value;
    const incremental = stages.find((stage) => stage.id === 'minus-one')!.value;
    const fraction = stages.find((stage) => stage.id === 'half')!.value;
    return [
      '2 × 4 = 8',
      '8 + 1 = 9',
      streets === 2 ? '√9 = 3' : `∛9 ≈ ${rooted.toFixed(2)}`,
      streets === 2 ? '3 − 1 = 2' : `${rooted.toFixed(2)} − 1 ≈ ${incremental.toFixed(2)}`,
      streets === 2 ? '2 ÷ 2 = 100%' : `${incremental.toFixed(2)} ÷ 2 ≈ ${Math.round(fraction * 100)}%`,
    ];
  }, [streets]);

  return (
    <main className="screen academy-screen" data-screen="academy">
      <header className="screen-title academy-title">
        <div>
          <span className="eyebrow">FORGE ACADEMY // HOW TO PLAY</span>
          <h1>Make geometry executable.</h1>
          <p>Train one table-side reflex: turn stack, pot and runway into a geometric bet you can actually click.</p>
        </div>
        <div className="academy-status"><i /><span>FIELD MANUAL</span><strong>V5</strong></div>
      </header>

      <section className="academy-mission game-frame" aria-labelledby="academy-mission-title">
        <div className="academy-mission__copy">
          <span className="eyebrow">THE MISSION</span>
          <h2 id="academy-mission-title">Strategy in percent.<br />Action in big blinds.</h2>
          <p>Geometric sizing uses the same fraction of the live pot on every remaining street, so a called line absorbs both effective stacks at the final gate.</p>
          <div className="academy-example"><span>TABLE SIGNAL</span><strong>53.6 ÷ 13.4 = SPR 4</strong><i>→</i><strong>3 streets = 54%</strong><i>→</i><strong>7.2 BB</strong></div>
        </div>
        <div className="academy-mission__seal" aria-hidden="true"><i /><span>％</span><strong>=</strong><b>BB</b></div>
      </section>

      <section className="academy-section" aria-labelledby="pipeline-title">
        <div className="academy-section__heading"><div><span className="eyebrow">MENTAL PIPELINE</span><h2 id="pipeline-title">Six locks. One decision.</h2></div><p>Tap a lock to inspect what it contributes.</p></div>
        <div className="academy-pipeline" aria-label="Table execution pipeline">
          {pipeline.map((step, index) => (
            <button type="button" key={step.label} className={activePipeline === index ? 'active' : ''} aria-pressed={activePipeline === index} onClick={() => setActivePipeline(index)}>
              <small>0{index + 1}</small><i aria-hidden="true">{step.glyph}</i><strong>{step.label}</strong>
            </button>
          ))}
        </div>
        <div className="academy-pipeline__readout" aria-live="polite"><span>{pipeline[activePipeline].glyph}</span><div><strong>{pipeline[activePipeline].label}</strong><p>{pipeline[activePipeline].detail}</p></div></div>
      </section>

      <section className="academy-section" aria-labelledby="anchors-title">
        <div className="academy-section__heading"><div><span className="eyebrow">ANCHOR LADDERS</span><h2 id="anchors-title">Landmarks, not multiplication drills.</h2></div><p>Recall these percentages directly. Table Zero supplies the BB conversion in context.</p></div>
        <div className="academy-ladders">
          <AnchorLadder title="Flop runway" subtitle="THREE STREETS" anchors={threeStreetAnchors} />
          <AnchorLadder title="Turn runway" subtitle="TWO STREETS" anchors={twoStreetAnchors} />
        </div>
      </section>

      <section className="academy-section" aria-labelledby="modes-title">
        <div className="academy-section__heading"><div><span className="eyebrow">TRAINING ROUTES</span><h2 id="modes-title">Each chamber builds one link.</h2></div><p>Progress means demonstrated poker competence, not time spent.</p></div>
        <div className="academy-modes">
          <article className="game-frame"><i aria-hidden="true">⌁</i><div><span>RETRIEVE</span><h3>Anchor Forge</h3><p><strong>SPR + streets → % pot.</strong> Burn the ten strategic landmarks into direct memory.</p></div></article>
          <article className="game-frame"><i aria-hidden="true">√</i><div><span>UNDERSTAND</span><h3>Root Reactor</h3><p><strong>Reconstruct the percentage.</strong> Use the causal formula when no landmark is ready.</p></div></article>
          <article className="game-frame"><i aria-hidden="true">◎</i><div><span>EXECUTE</span><h3>Table Zero</h3><p><strong>Real state → table action.</strong> Read the pot and stack, then answer in % pot or BB.</p></div></article>
        </div>
        <div className="academy-support-routes">
          <span><b>Ratio Lock</b> finds SPR</span><i>·</i><span><b>Runway Forge</b> reads street pressure</span><i>·</i><span><b>Precision + Contrast</b> handle unfamiliar lines</span><i>·</i><span><b>Rush + Return</b> build speed and retention</span>
        </div>
      </section>

      <section className="academy-reactor game-frame" aria-labelledby="reactor-title">
        <header>
          <div><span className="eyebrow">ROOT REACTOR // INTERACTIVE PROOF</span><h2 id="reactor-title">DOUBLE → +1 → ROOT → −1 → HALF</h2><p>Use SPR 4 to watch the same starting state resolve across different runways.</p></div>
          <div className="academy-root-switch" role="group" aria-label="Remaining streets">
            <button type="button" className={streets === 2 ? 'active' : ''} aria-pressed={streets === 2} onClick={() => setStreets(2)}><strong>2 streets</strong><span>Square root</span></button>
            <button type="button" className={streets === 3 ? 'active' : ''} aria-pressed={streets === 3} onClick={() => setStreets(3)}><strong>3 streets</strong><span>Cube root</span></button>
          </div>
        </header>
        <div className="academy-reactor__pipeline" aria-label="Reconstruction operations">
          {operations.map((operation, index) => (
            <button type="button" key={operation.label} className={activeOperation === index ? 'active' : ''} aria-pressed={activeOperation === index} onClick={() => setActiveOperation(index)}>
              <small>0{index + 1}</small><strong>{operation.short}</strong><span>{operation.label}</span>
            </button>
          ))}
        </div>
        <div className="academy-reactor__readout" aria-live="polite">
          <div><span>TRANSFORMATION</span><strong>{reactorValues[activeOperation]}</strong></div>
          <p><b>{operations[activeOperation].label}</b>{operations[activeOperation].meaning}</p>
        </div>
        <div className="academy-reactor__meanings">
          {operations.map((operation, index) => <button type="button" key={operation.label} className={activeOperation === index ? 'active' : ''} onClick={() => setActiveOperation(index)}><b>{operation.label}</b><span>{operation.meaning}</span></button>)}
        </div>
        <div className="academy-identity">
          <div><span>UNDERLYING IDENTITY</span><strong>(1 + 2b)<sup>n</sup> = 1 + 2SPR</strong></div>
          <p>A called bet grows the pot by <b>1 + 2b</b>. Repeat that growth over <b>n</b> streets to reach the current pot plus both stacks.</p>
        </div>
      </section>

      <section className="academy-latency game-frame" aria-labelledby="latency-title">
        <div className="academy-latency__pulse" aria-hidden="true"><i /><strong>1.8</strong><span>SEC</span></div>
        <div><span className="eyebrow">TABLE READINESS</span><h2 id="latency-title">Latency is part of the skill.</h2><p>The clock runs from the actionable spot appearing until you commit. Switching between % POT and BB does not restart it: they are two representations of the same decision. Speed matters only when accuracy holds.</p></div>
      </section>
    </main>
  );
}
