import { useMemo, useRef, useState } from 'react';
import { StackoffScene, type SceneResolution } from './StackoffScene';
import { audio, haptic } from './audio';

interface OnboardingAttempt {
  streets: 2 | 3;
  answer: number;
  correct: boolean;
  responseTimeMs: number;
}

export function Onboarding({ reducedMotion, haptics, onAttempt, onComplete }: {
  reducedMotion: boolean;
  haptics: boolean;
  onAttempt: (attempt: OnboardingAttempt) => void;
  onComplete: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: number; streets: 2 | 3 } | null>(null);
  const startTime = useRef(performance.now());
  const streets: 2 | 3 = stage <= 2 ? 3 : 2;
  const target = streets === 3 ? 54 : 100;
  const choices = streets === 3 ? [35, 54, 82] : [54, 82, 100];
  const resolution = useMemo<SceneResolution | null>(() => result ? { id: stage, pot: 10, stack: 40, streets: result.streets, selectedPercent: result.answer, targetPercent: result.streets === 3 ? 54 : 100, correct: result.correct } : null, [result, stage]);

  const beginChallenge = (nextStage: number) => {
    setStage(nextStage);
    setAnswer(null);
    setResult(null);
    startTime.current = performance.now();
    audio.cue('engage');
  };

  const commit = () => {
    if (answer === null) return;
    const correct = answer === target;
    const attempt = { streets, answer, correct, responseTimeMs: Math.round(performance.now() - startTime.current) };
    setResult({ correct, answer, streets });
    onAttempt(attempt);
    audio.cue(correct ? 'hard-correct' : 'wrong');
    if (haptics) haptic(correct ? [18, 32, 24] : 32);
  };

  if (stage === 0) {
    return (
      <div className="onboarding-shell">
        <div className="onboarding-atmosphere" />
        <section className="arrival-panel">
          <div className="arrival-sigil"><span>4</span><i /><i /></div>
          <span className="eyebrow">CALIBRATION BAY // FIRST CONTACT</span>
          <h1>Same stack.<br/><em>Different runway.</em></h1>
          <p>No lecture. Read the state, make a call, and let the machine show you what the line does.</p>
          <div className="arrival-state"><div><span>STARTING POT</span><strong>10<small>bb</small></strong></div><i>:</i><div><span>EFFECTIVE STACK</span><strong>40<small>bb</small></strong></div><b>SPR 4</b></div>
          <button type="button" className="action-primary arrival-action" onClick={() => beginChallenge(1)}>ENTER CALIBRATION <i>→</i></button>
          <small className="arrival-note">Sound activates after entry · headphones recommended</small>
        </section>
        <div className="arrival-footer"><span>AXIOM FACILITY 07</span><span>GEOMETRIC COGNITION PROGRAM</span></div>
      </div>
    );
  }

  if (stage === 5) {
    return (
      <div className="onboarding-shell onboarding-shell--reveal">
        <div className="onboarding-atmosphere" />
        <section className="aha-panel game-frame">
          <span className="eyebrow">CALIBRATION INSIGHT ACQUIRED</span>
          <h1>The runway changes everything.</h1>
          <p>Both states begin at SPR 4. Equal growth has three chances on the flop, but only two on the turn.</p>
          <div className="aha-contrast">
            <div><span>THREE STREETS</span><strong>54<small>%</small></strong><div><i/><i/><i/></div><em>54 → 54 → 54</em></div>
            <b>SPR 4</b>
            <div><span>TWO STREETS</span><strong>100<small>%</small></strong><div><i/><i/></div><em>POT → POT</em></div>
          </div>
          <div className="aha-model"><span>OBSERVE</span><i>→</i><span>IDENTIFY SPR</span><i>→</i><span>READ RUNWAY</span><i>→</i><strong>ACT</strong></div>
          <button type="button" className="action-primary arrival-action" onClick={() => { audio.cue('mastery'); onComplete(); }}>POWER UP THE FORGE <i>→</i></button>
        </section>
      </div>
    );
  }

  return (
    <div className="onboarding-shell onboarding-shell--challenge">
      <div className="onboarding-atmosphere" />
      <header className="calibration-header"><span>CALIBRATION // VECTOR {streets === 3 ? 'A' : 'B'}</span><div><i className={stage >= 1 ? 'active' : ''}/><i className={stage >= 3 ? 'active' : ''}/></div><strong>SPR 4</strong></header>
      <main className="calibration-stage">
        <section className="calibration-question">
          <span className="eyebrow">{streets === 3 ? 'FLOP // THREE BETTING STREETS' : 'TURN // TWO BETTING STREETS'}</span>
          <h1>What constant sizing puts the full stack in by the river?</h1>
          <div className="calibration-runway">{Array.from({ length: streets }, (_, index) => <div key={index}><i/><span>{streets === 3 ? ['FLOP', 'TURN', 'RIVER'][index] : ['TURN', 'RIVER'][index]}</span></div>)}</div>
          {!result ? <div className="calibration-choices">{choices.map((choice) => <button type="button" key={choice} className={answer === choice ? 'selected' : ''} onClick={() => { setAnswer(choice); audio.cue('select'); }}><span>{choice === 100 ? 'POT' : `${choice}%`}</span><i /></button>)}</div> : (
            <div className={`calibration-feedback ${result.correct ? 'correct' : 'wrong'}`} aria-live="assertive">
              <span>{result.correct ? 'CONVERGENCE' : result.answer < target ? 'RUNWAY EXHAUSTED' : 'STACK EXHAUSTED EARLY'}</span>
              <strong>{result.correct ? `${target === 100 ? 'POT' : `${target}%`} // LINE FIT` : `YOUR LINE ${result.answer}% // TARGET ${target === 100 ? 'POT' : `${target}%`}`}</strong>
              <p>{result.correct ? 'The stack reaches zero exactly as the final gate closes.' : result.answer < target ? `At ${result.answer}%, chips remain after the river. The line needed more compression.` : `At ${result.answer}%, the stack is forced in before the runway ends.`}</p>
            </div>
          )}
          {!result ? <button type="button" className="commit-control" disabled={answer === null} onClick={commit}><span>COMMIT LINE</span><i>GENERATE → COMMIT</i></button> : <button type="button" className="action-primary calibration-next" onClick={() => result.streets === 3 ? beginChallenge(3) : setStage(5)}>{result.streets === 3 ? 'CHANGE THE RUNWAY' : 'LOCK THE INSIGHT'} <i>→</i></button>}
        </section>
        <section className="calibration-proof"><div className="proof-heading"><span>STACKOFF MACHINE</span><small>{result ? 'SIMULATING YOUR LINE' : 'WAITING FOR COMMIT'}</small></div><StackoffScene pot={10} stack={40} streets={streets} resolution={resolution} reducedMotion={reducedMotion} /></section>
      </main>
    </div>
  );
}

