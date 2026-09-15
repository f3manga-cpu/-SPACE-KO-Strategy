import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerValue, Confidence, Question, ScoreBreakdown } from '../core/types';
import type { MissionSpec } from '../ui/content';
import { StackoffScene, type SceneResolution } from './StackoffScene';
import { audio } from './audio';

export interface GradeFeedback {
  correct: boolean;
  score: number;
  response: AnswerValue;
  expected: AnswerValue;
  explanation: string;
  headline: string;
  detail: string;
  lineStatus: 'fit' | 'residue' | 'early';
  stackDeltaBb: number;
  breakdown: ScoreBreakdown;
  newBest?: string | null;
  masteryEvent?: string | null;
  causalSizing?: boolean;
}

export interface GameScreenProps {
  mission: MissionSpec;
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  score: number;
  streak: number;
  lives: number | null;
  askConfidence: boolean;
  feedback: GradeFeedback | null;
  ghostDeltaMs?: number | null;
  remainingMs?: number | null;
  reducedMotion: boolean;
  onSubmit: (answer: AnswerValue, confidence: Confidence | null) => void;
  onNext: () => void;
  onExit: () => void;
}

const unitLabel = (question: Question) => question.unit === 'percent' ? '% POT' : question.unit === 'spr' ? 'SPR' : question.unit === 'bb' ? 'BB' : '';

function TableState({ question }: { question: Question }) {
  const context = question.context;
  const boardCount = context.streetsRemaining === 3 ? 3 : 4;
  return (
    <div className="table-read" data-testid="table-read">
      <div className="table-read__rail" />
      <div className="table-seat table-seat--villain"><i className="pilot-avatar">V</i><span>EFFECTIVE STACK</span><strong>{context.effectiveStackBb?.toFixed(1)}<small>bb</small></strong></div>
      <div className="board-strip" aria-label={`${context.streetsRemaining === 3 ? 'Flop' : 'Turn'} board`}>
        {Array.from({ length: boardCount }, (_, index) => <i key={index} className={`board-card card-${index}`}><span>{['A', '9', '4', 'K'][index]}</span><b>{['◆', '●', '▲', '◆'][index]}</b></i>)}
      </div>
      <div className="table-pot"><span>CURRENT POT</span><strong>{context.potBb?.toFixed(1)}<small>bb</small></strong></div>
      <div className="street-badge">{context.streetsRemaining === 3 ? 'FLOP' : 'TURN'} // {context.streetsRemaining} STREETS</div>
      <div className="table-seat table-seat--hero"><i className="pilot-avatar">YOU</i><span>DECISION NODE</span><strong>BET</strong></div>
    </div>
  );
}

function RatioRig({ question }: { question: Question }) {
  const pot = question.context.potBb ?? 10;
  const stack = question.context.effectiveStackBb ?? 40;
  const max = Math.max(pot, stack);
  return (
    <div className="ratio-rig">
      <div className="ratio-column ratio-column--stack"><span>EFFECTIVE STACK</span><div className="ratio-column__meter"><i style={{ height: `${Math.max(12, stack / max * 100)}%` }} /></div><strong>{stack.toFixed(1)}<small>bb</small></strong></div>
      <div className="ratio-operator"><span>STACK</span><strong>÷</strong><span>POT</span></div>
      <div className="ratio-column ratio-column--pot"><span>STARTING POT</span><div className="ratio-column__meter"><i style={{ height: `${Math.max(12, pot / max * 100)}%` }} /></div><strong>{pot.toFixed(1)}<small>bb</small></strong></div>
      <div className="ratio-reticle"><i /><span>LOCK THE RATIO</span></div>
    </div>
  );
}

function RunwayRig({ question }: { question: Question }) {
  const streets = question.context.streetsRemaining ?? 3;
  const size = question.context.targetPercent ?? Number(question.expectedAnswer);
  return (
    <div className={`runway-rig runway-${streets}`}>
      <div className="runway-core"><span>SPR</span><strong>{question.context.spr}</strong></div>
      <div className="runway-track">
        {Array.from({ length: streets }, (_, index) => <div key={index}><i /><span>{streets === 3 ? ['FLOP', 'TURN', 'RIVER'][index] : ['TURN', 'RIVER'][index]}</span></div>)}
      </div>
      <div className="runway-pressure"><span>REQUIRED COMPRESSION</span><div><i style={{ width: `${Math.min(100, size)}%` }} /></div><em>CLASSIFY BEFORE CALCULATING</em></div>
    </div>
  );
}

function ContrastRig({ question }: { question: Question }) {
  const pair = question.context.comparison;
  if (!pair) return <RunwayRig question={question} />;
  return (
    <div className="contrast-rig">
      {pair.map((item, index) => <div key={`${item.spr}-${item.streetsRemaining}`} className={`contrast-side contrast-side--${index}`}><span>VECTOR {index ? 'B' : 'A'}</span><div className="contrast-spr"><small>SPR</small><strong>{item.spr}</strong></div><div className="mini-runway">{Array.from({ length: item.streetsRemaining }, (_, track) => <i key={track} />)}</div><em>{item.streetsRemaining} STREETS</em></div>)}
      <div className="contrast-divider"><span>VS</span></div>
    </div>
  );
}

function GhostRig({ question }: { question: Question }) {
  const line = question.context.line ?? [];
  const maxPot = Math.max(...line.map((point) => point.potAfterCall), 1);
  return (
    <div className="ghost-rig">
      <div className="ghost-grid" />
      <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-label="Unlabelled geometric betting trajectory">
        <defs><linearGradient id="ghostGlow" x1="0" x2="1"><stop stopColor="#56ddff" stopOpacity=".2"/><stop offset="1" stopColor="#56ddff" stopOpacity=".9"/></linearGradient></defs>
        <polyline points={line.map((point, index) => `${55 + index * (490 / Math.max(1, line.length - 1))},${190 - point.potAfterCall / maxPot * 150}`).join(' ')} fill="none" stroke="url(#ghostGlow)" strokeWidth="5" />
        {line.map((point, index) => <g key={point.streetIndex}><circle cx={55 + index * (490 / Math.max(1, line.length - 1))} cy={190 - point.potAfterCall / maxPot * 150} r="10"/><line x1={55 + index * (490 / Math.max(1, line.length - 1))} y1="28" x2={55 + index * (490 / Math.max(1, line.length - 1))} y2="200"/></g>)}
      </svg>
      <div className="ghost-label"><span>GROWTH SIGNATURE</span><strong>IDENTITY WITHHELD</strong><em>{line.length} GATES OBSERVED</em></div>
    </div>
  );
}

const reactorCanonical = ['DOUBLE', '+1', 'ROOT', '−1', 'HALF'];

function ReactorControl({ value, onChange, disabled }: { value: AnswerValue | null; onChange: (value: AnswerValue) => void; disabled: boolean }) {
  const selected = typeof value === 'string' && value ? value.split('|') : [];
  const available = reactorCanonical.filter((operation) => !selected.includes(operation));
  const add = (operation: string) => onChange([...selected, operation].join('|'));
  const reset = () => onChange('');
  return (
    <div className="reactor-control">
      <div className="reactor-pipeline">
        {reactorCanonical.map((_, index) => <button type="button" key={index} disabled={disabled || index >= selected.length} onClick={() => !disabled && onChange(selected.slice(0, index).join('|'))} className={index < selected.length ? 'filled' : ''}><small>0{index + 1}</small><strong>{selected[index] ?? '—'}</strong></button>)}
      </div>
      <div className="reactor-bank">
        {available.map((operation) => <button type="button" key={operation} disabled={disabled} onClick={() => add(operation)}>{operation}</button>)}
        {!!selected.length && <button type="button" className="reactor-reset" onClick={reset} disabled={disabled}>RESET</button>}
      </div>
      <div className="reactor-story"><span>2S</span><i>both stacks</i><span>+1</span><i>starting pot</i><span>ROOT</span><i>equal growth</i><span>−1</span><i>remove base</i><span>÷2</span><i>bet + call</i></div>
    </div>
  );
}

function ReactorNumericControl({ question, value, onChange, disabled }: { question: Question; value: AnswerValue | null; onChange: (value: AnswerValue) => void; disabled: boolean }) {
  const [sequence, setSequence] = useState<string[]>([]);
  useEffect(() => { setSequence([]); }, [question.id]);
  const available = reactorCanonical.filter((operation) => !sequence.includes(operation));
  const sequenceCorrect = sequence.join('|') === reactorCanonical.join('|');
  return (
    <div className="reactor-control">
      <div className="reactor-pipeline">
        {reactorCanonical.map((_, index) => <button type="button" key={index} disabled={disabled || index >= sequence.length} onClick={() => !disabled && setSequence(sequence.slice(0, index))} className={index < sequence.length ? 'filled' : ''}><small>0{index + 1}</small><strong>{sequence[index] ?? '—'}</strong></button>)}
      </div>
      {sequence.length < reactorCanonical.length ? <div className="reactor-bank">{available.map((operation) => <button type="button" key={operation} disabled={disabled} onClick={() => setSequence([...sequence, operation])}>{operation}</button>)}</div> : sequenceCorrect ? <NumericControl question={question} value={value} onChange={onChange} disabled={disabled} /> : <button type="button" className="reactor-repair" onClick={() => setSequence([])}>SEQUENCE DIVERGED // RESET REACTOR</button>}
      {sequenceCorrect && <div className="reactor-story"><span>2S</span><i>both stacks</i><span>+1</span><i>starting pot</i><span>ROOT</span><i>equal growth</i><span>−1</span><i>remove base</i><span>÷2</span><i>bet + call</i></div>}
    </div>
  );
}

function NumericControl({ question, value, onChange, disabled }: { question: Question; value: AnswerValue | null; onChange: (value: AnswerValue) => void; disabled: boolean }) {
  const isSizing = question.unit === 'percent';
  const isTable = question.type === 'transfer';
  const pot = question.context.potBb ?? 10;
  const min = isTable ? 0.1 : question.unit === 'spr' ? 0.5 : isSizing ? 20 : 0;
  const max = isTable ? Math.max(1, Math.min(question.context.effectiveStackBb ?? pot * 1.4, pot * 1.4)) : question.unit === 'spr' ? 8 : isSizing ? 140 : 100;
  const step = isTable ? 0.1 : question.unit === 'spr' ? 0.1 : 1;
  const numericValue = typeof value === 'number' ? value : isTable ? Math.round(pot * 5) / 10 : isSizing ? 50 : question.unit === 'spr' ? 2 : 0;
  if (isTable || question.type === 'precision') {
    const displayPercent = isTable ? numericValue / pot * 100 : numericValue;
    return (
      <div className="sizing-control">
        <div className="sizing-readout"><span>BET COMMAND</span><strong>{isTable ? numericValue.toFixed(1) : Math.round(numericValue)}<small>{isTable ? 'BB' : '%'}</small></strong><em>{isTable ? `${Math.round(displayPercent)}% pot` : `${(pot * numericValue / 100).toFixed(1)}bb`}</em></div>
        <div className="sizing-arc" style={{ '--dial': `${(numericValue - min) / (max - min) * 100}%` } as React.CSSProperties}><i /><b /></div>
        <input aria-label={isTable ? 'Bet amount in big blinds' : 'Bet size percentage'} type="range" min={min} max={max} step={step} value={numericValue} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
        <div className="sizing-labels"><span>{isTable ? `${min.toFixed(1)}bb` : `${min}%`}</span><span>½ POT</span><span>POT</span><span>{isTable ? `${max.toFixed(1)}bb` : `${max}%`}</span></div>
      </div>
    );
  }
  return (
    <label className="numeric-entry"><span>ENTER {unitLabel(question) || 'VALUE'}</span><div><input autoFocus inputMode="decimal" type="number" min={min} max={max} step={step} value={value === null ? '' : String(value)} disabled={disabled} onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))} placeholder="—"/><i>{unitLabel(question)}</i></div><small>Tolerance // ±{question.tolerance}{question.unit === 'percent' ? '%' : ''}</small></label>
  );
}

function ChoiceControl({ question, value, onChange, disabled }: { question: Question; value: AnswerValue | null; onChange: (value: AnswerValue) => void; disabled: boolean }) {
  return (
    <div className={`answer-bank answer-bank--${Math.min(5, question.choices?.length ?? 0)}`}>
      {question.choices?.map((choice, index) => <button type="button" key={choice.id} className={value === choice.value ? 'selected' : ''} disabled={disabled} onClick={() => { audio.cue('select'); onChange(choice.value); }}><small>{String(index + 1).padStart(2, '0')}</small><strong>{choice.label}</strong><i /></button>)}
    </div>
  );
}

function ConfidenceControl({ value, onChange, disabled }: { value: Confidence | null; onChange: (value: Confidence) => void; disabled: boolean }) {
  return (
    <fieldset className="confidence-control"><legend>CALIBRATION PULSE // HOW CERTAIN?</legend>{(['low', 'medium', 'locked'] as const).map((confidence) => <button type="button" key={confidence} disabled={disabled} className={value === confidence ? 'selected' : ''} onClick={() => onChange(confidence)}><i />{confidence.toUpperCase()}</button>)}</fieldset>
  );
}

function FeedbackPanel({ feedback, question, onNext, fastMode }: { feedback: GradeFeedback; question: Question; onNext: () => void; fastMode: boolean }) {
  const suffix = question.unit === 'percent' ? '%' : question.unit === 'bb' ? 'bb' : '';
  const responseLabel = typeof feedback.response === 'number' ? `${Math.round(feedback.response * 10) / 10}${suffix}` : String(feedback.response).replaceAll('|', ' → ');
  const targetLabel = typeof feedback.expected === 'number' ? `${Math.round(feedback.expected * 10) / 10}${suffix}` : String(feedback.expected).replaceAll('|', ' → ');
  return (
    <div className={`resolution-panel ${feedback.correct ? 'is-correct' : 'is-wrong'}`} data-testid="feedback-panel" aria-live="assertive">
      <div className="resolution-panel__signal"><span>{feedback.correct ? feedback.causalSizing ? 'CONVERGENCE CONFIRMED' : 'RETRIEVAL VERIFIED' : feedback.causalSizing ? feedback.lineStatus === 'residue' ? 'RUNWAY EXHAUSTED' : 'STACK EXHAUSTED EARLY' : 'RETRIEVAL MISMATCH'}</span><strong>{feedback.headline}</strong><p>{feedback.detail}</p></div>
      <div className="line-compare"><div><span>YOUR LINE</span><strong>{responseLabel}</strong></div><i>→</i><div><span>GEOMETRIC LINE</span><strong>{targetLabel}</strong></div></div>
      <div className="causal-note"><i>{feedback.correct ? '✓' : '!'}</i><p>{feedback.explanation}</p></div>
      <div className="score-packet"><span>+{feedback.score.toLocaleString()}</span><small>DIFFICULTY ×{feedback.breakdown.difficulty.toFixed(2)}</small><small>INDEPENDENCE ×{feedback.breakdown.independence.toFixed(2)}</small><small>RETENTION ×{feedback.breakdown.retention.toFixed(2)}</small></div>
      {(feedback.newBest || feedback.masteryEvent) && <div className="event-stamp"><span>{feedback.newBest ? 'NEW PERSONAL RECORD' : 'NODE STATE CHANGED'}</span><strong>{feedback.newBest ?? feedback.masteryEvent}</strong></div>}
      {!fastMode && <button type="button" className="action-primary resolution-next" onClick={onNext}>NEXT RETRIEVAL <i>→</i></button>}
    </div>
  );
}

export function GameScreen({ mission, question, questionNumber, totalQuestions, score, streak, lives, askConfidence, feedback, ghostDeltaMs, remainingMs, reducedMotion, onSubmit, onNext, onExit }: GameScreenProps) {
  const defaultDial = question.type === 'transfer' ? Math.round((question.context.potBb ?? 10) * 5) / 10 : question.type === 'precision' ? 50 : null;
  const [answer, setAnswer] = useState<AnswerValue | null>(defaultDial);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [pulse, setPulse] = useState(0);
  const previousQuestion = useRef(question.id);
  const fastMode = mission.mode === 'reflex-rush';
  const timedProgress = fastMode && remainingMs !== null && remainingMs !== undefined ? Math.max(0, Math.min(100, (45_000 - remainingMs) / 45_000 * 100)) : null;
  const isValid = answer !== null && answer !== '' && (!askConfidence || confidence !== null) && (question.responseMode !== 'sequence' || String(answer).split('|').filter(Boolean).length === 5);

  useEffect(() => {
    if (previousQuestion.current === question.id) return;
    previousQuestion.current = question.id;
    setAnswer(question.type === 'transfer' ? Math.round((question.context.potBb ?? 10) * 5) / 10 : question.type === 'precision' ? 50 : null);
    setConfidence(null);
    setPulse((current) => current + 1);
  }, [question]);

  useEffect(() => {
    if (!feedback || !fastMode) return;
    const timer = window.setTimeout(onNext, reducedMotion ? 260 : feedback.correct ? 720 : 1_080);
    return () => window.clearTimeout(timer);
  }, [fastMode, feedback, onNext, reducedMotion]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' && event.key !== 'Enter') return;
      if (feedback) {
        if (event.key === 'Enter' && !fastMode) { event.preventDefault(); onNext(); }
        return;
      }
      const choiceIndex = Number(event.key) - 1;
      if (Number.isInteger(choiceIndex) && choiceIndex >= 0 && question.choices?.[choiceIndex]) {
        event.preventDefault();
        audio.cue('select');
        setAnswer(question.choices[choiceIndex]!.value);
      } else if (event.key === 'Enter' && isValid) {
        event.preventDefault();
        onSubmit(answer!, confidence);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [answer, confidence, fastMode, feedback, isValid, onNext, onSubmit, question.choices]);

  const resolution = useMemo<SceneResolution | null>(() => {
    if (!feedback) return null;
    const pot = question.context.potBb ?? 10;
    const stack = question.context.effectiveStackBb ?? pot * (question.context.spr ?? 4);
    const selected = typeof feedback.response === 'number' && question.type === 'transfer' ? feedback.response / pot * 100 : typeof feedback.response === 'number' && question.unit === 'percent' ? feedback.response : ((question.context.targetPercent ?? Number(question.expectedAnswer)) || 50);
    const target = question.context.targetPercent ?? (typeof question.expectedAnswer === 'number' && question.unit === 'percent' ? question.expectedAnswer : selected);
    return { id: pulse, pot, stack, streets: question.context.streetsRemaining ?? 3, selectedPercent: selected, targetPercent: target, correct: feedback.correct };
  }, [feedback, pulse, question]);

  const renderRig = () => {
    if (question.type === 'transfer') return <TableState question={question} />;
    if (question.type === 'spr-snap') return <RatioRig question={question} />;
    if (question.type === 'runway') return <RunwayRig question={question} />;
    if (question.type === 'contrast') return <ContrastRig question={question} />;
    if (question.type === 'ghost-line') return <GhostRig question={question} />;
    if (question.type === 'anchor') return <div className="anchor-prompt"><div className="anchor-prompt__spr"><span>SPR</span><strong>{question.context.spr}</strong></div><div className="anchor-prompt__gates">{Array.from({ length: question.context.streetsRemaining ?? 3 }, (_, index) => <i key={index}><span>{index + 1}</span></i>)}</div><div className="anchor-prompt__street"><span>RUNWAY</span><strong>{question.context.streetsRemaining} STREETS</strong></div></div>;
    if (question.type === 'root-reactor') return <div className="reactor-core-visual"><i /><span>ROOT REACTOR</span><strong>SPR {question.context.spr}</strong><em>{question.context.streetsRemaining} GROWTH GATES</em></div>;
    return <RunwayRig question={question} />;
  };

  const renderControl = () => {
    if (question.type === 'root-reactor' && question.responseMode !== 'sequence') return <ReactorNumericControl question={question} value={answer} onChange={setAnswer} disabled={!!feedback} />;
    if (question.responseMode === 'sequence') return <ReactorControl value={answer} onChange={setAnswer} disabled={!!feedback} />;
    if (question.choices?.length) return <ChoiceControl question={question} value={answer} onChange={setAnswer} disabled={!!feedback} />;
    return <NumericControl question={question} value={answer} onChange={setAnswer} disabled={!!feedback} />;
  };

  return (
    <div className={`game-overlay accent-${mission.accent} ${feedback ? 'is-resolving' : ''}`} data-mode={mission.id}>
      <div className="game-noise" />
      <header className="game-hud">
        <button type="button" className="exit-control" onClick={onExit} aria-label="Abort run">×</button>
        <div className="game-id"><span>{mission.callSign} // {mission.operation}</span><strong>{mission.label}</strong></div>
        <div className="run-progress"><div><i style={{ width: `${timedProgress ?? questionNumber / totalQuestions * 100}%` }} /></div><span>{fastMode ? `${String(questionNumber).padStart(2, '0')} LOCKS` : `${String(questionNumber).padStart(2, '0')} / ${String(totalQuestions).padStart(2, '0')}`}</span></div>
        <div className="game-stat"><span>SCORE</span><strong>{score.toLocaleString()}</strong></div>
        <div className="game-stat"><span>CHAIN</span><strong>×{Math.max(1, streak)}</strong></div>
        {lives !== null && <div className="integrity-meter" aria-label={`${lives} integrity remaining`}>{Array.from({ length: 3 }, (_, index) => <i key={index} className={index < lives ? 'live' : ''} />)}</div>}
        {remainingMs !== null && remainingMs !== undefined && <div className={`countdown ${remainingMs < 10_000 ? 'critical' : ''}`}><span>TIME</span><strong>{(remainingMs / 1000).toFixed(1)}</strong></div>}
      </header>
      {ghostDeltaMs !== null && ghostDeltaMs !== undefined && <div className={`ghost-delta ${ghostDeltaMs <= 0 ? 'ahead' : 'behind'}`}><span>PERSONAL GHOST</span><strong>{ghostDeltaMs <= 0 ? '−' : '+'}{Math.abs(ghostDeltaMs / 1000).toFixed(2)}s</strong></div>}
      <main className="game-stage">
        <section className="challenge-bay">
          <div className="challenge-copy"><span>{question.family.replace('-', ' ').toUpperCase()} // DIFFICULTY {Math.round(question.difficulty * 100)}</span><h1>{question.prompt}</h1><p>{question.instruction}</p></div>
          <div className="challenge-rig">{renderRig()}</div>
        </section>
        <section className="decision-bay">
          {!feedback ? (
            <>
              <div className="decision-heading"><span>COMMIT VECTOR</span><small>{question.scaffoldLevel === 0 ? 'NO ASSISTANCE' : `SCAFFOLD ${question.scaffoldLevel}`}</small></div>
              {renderControl()}
              {askConfidence && <ConfidenceControl value={confidence} onChange={setConfidence} disabled={false} />}
              <button type="button" className="commit-control" disabled={!isValid} onClick={() => isValid && onSubmit(answer!, confidence)}><span>{question.type === 'transfer' ? 'DEPLOY BET' : 'LOCK ANSWER'}</span><i>HOLD THE LINE →</i></button>
              <div className="input-shortcuts">KEYBOARD: 1–5 SELECT <i /> ENTER COMMIT</div>
            </>
          ) : <FeedbackPanel feedback={feedback} question={question} onNext={onNext} fastMode={fastMode} />}
        </section>
        <section className="proof-bay">
          <div className="proof-heading"><span>CAUSAL SIMULATION</span><small>{feedback ? 'LINE RESOLVING' : 'AWAITING COMMIT'}</small></div>
          <StackoffScene pot={question.context.potBb ?? 10} stack={question.context.effectiveStackBb ?? 10 * (question.context.spr ?? 4)} streets={question.context.streetsRemaining ?? 3} resolution={resolution} reducedMotion={reducedMotion} compact />
        </section>
      </main>
    </div>
  );
}
