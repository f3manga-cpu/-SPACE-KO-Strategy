import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ANCHORS,
  CONCEPT_CATALOG,
  analyseLine,
  calculateAttemptScore,
  clearProfile,
  completeQualification,
  createDefaultProfile,
  evaluateAnswer,
  evaluateRank,
  generateQuestion,
  loadProfile,
  recordAttempt,
  saveProfile,
  selectNextConcept,
  updatePersonalRecords,
  type AnswerValue,
  type Attempt,
  type Confidence,
  type Profile,
  type Question,
  type QuestionType,
  type RankId,
  type RunSummary,
  type ScaffoldLevel,
} from './core';
import { Header, BottomNav, SettingsDrawer } from './components/Chrome';
import { CommandDeck } from './screens/CommandDeck';
import { SectorGrid } from './screens/SectorGrid';
import { AnchorGrid } from './screens/AnchorGrid';
import { Records } from './screens/Records';
import { GameScreen, type GradeFeedback } from './game/GameScreen';
import { Onboarding } from './game/Onboarding';
import { RunResults } from './game/RunResults';
import { audio, haptic } from './game/audio';
import type { MissionSpec, NavScreen } from './ui/content';

interface ActiveRun {
  id: string;
  mission: MissionSpec;
  seed: number;
  startedAt: number;
  questionStartedAt: number;
  question: Question;
  askConfidence: boolean;
  index: number;
  score: number;
  correct: number;
  streak: number;
  longestStreak: number;
  lives: number | null;
  attemptIds: string[];
  conceptIds: string[];
  responseTimes: number[];
  splits: number[];
  feedback: GradeFeedback | null;
  terminateAfterFeedback: boolean;
  result: RunSummary | null;
  rankDelta: number;
  strengthened: string;
  weakness: string | null;
  startSkillRating: number;
  startRank: RankId;
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};
const modeMultiplier = (mission: MissionSpec) => mission.mode === 'qualification' ? 1.5 : mission.mode === 'reflex-rush' ? 1.35 : mission.highStakes ? 1.18 : 1;

function allowedIdsForType(type: QuestionType) {
  return CONCEPT_CATALOG.filter((concept) => concept.questionType === type).map((concept) => concept.id);
}

function plannedType(mission: MissionSpec, index: number): QuestionType | null {
  if (mission.focus) return mission.focus;
  if (mission.mode === 'reflex-rush') return (['anchor', 'spr-snap', 'transfer', 'runway'] as QuestionType[])[index % 4]!;
  if (mission.mode === 'stackoff-survival') return (['anchor', 'spr-snap', 'runway', 'transfer', 'contrast', 'precision'] as QuestionType[])[index % 6]!;
  if (mission.mode === 'qualification') return (['anchor', 'transfer', 'contrast', 'precision', 'spr-snap', 'runway'] as QuestionType[])[index % 6]!;
  if (mission.mode === 'daily-challenge') return (['anchor', 'spr-snap', 'transfer', 'contrast', 'runway', 'precision'] as QuestionType[])[index % 6]!;
  return null;
}

function buildQuestion(profile: Profile, mission: MissionSpec, index: number, seed: number) {
  const forcedType = plannedType(mission, index);
  if (mission.mode === 'perfect-ten') {
    const anchor = ANCHORS[(index * 7 + seed) % ANCHORS.length]!;
    return { question: generateQuestion({ type: 'anchor', seed: seed + index * 97, conceptId: anchor.id, difficulty: .72, scaffoldLevel: 0 }), askConfidence: index === 4 || index === 9 };
  }
  const schedulerMode = forcedType ? 'adaptive' : mission.mode;
  const selection = selectNextConcept(profile, {
    mode: schedulerMode,
    seed: seed + index * 131,
    dueOnly: mission.mode === 'memory-return',
    allowedConceptIds: forcedType ? allowedIdsForType(forcedType) : undefined,
  });
  const type = forcedType ?? selection.questionType;
  const highPressure = ['qualification', 'transfer-gauntlet', 'reflex-rush'].includes(mission.mode);
  const scaffoldLevel = (mission.mode === 'qualification' || mission.mode === 'transfer-gauntlet' ? 0 : mission.mode === 'reflex-rush' ? Math.min(1, selection.scaffoldLevel) : selection.scaffoldLevel) as ScaffoldLevel;
  const difficulty = Math.min(1, selection.difficulty + (highPressure ? .12 : mission.mode === 'stackoff-survival' ? Math.min(.3, index * .025) : 0));
  return { question: generateQuestion({ type, seed: seed + index * 97, conceptId: selection.conceptId, difficulty, scaffoldLevel }), askConfidence: selection.askConfidence && mission.mode !== 'reflex-rush' };
}

function feedbackFor(question: Question, evaluation: ReturnType<typeof evaluateAnswer>, response: AnswerValue, score: number, breakdown: ReturnType<typeof calculateAttemptScore>): GradeFeedback {
  const causalSizing = question.unit === 'percent' || question.type === 'transfer';
  let lineStatus: GradeFeedback['lineStatus'] = evaluation.correct ? 'fit' : evaluation.errorDirection === 'low' ? 'residue' : 'early';
  let stackDeltaBb = 0;
  if (causalSizing && typeof evaluation.response === 'number') {
    const pot = question.context.potBb ?? 10;
    const stack = question.context.effectiveStackBb ?? pot * (question.context.spr ?? 4);
    const selectedPercent = question.type === 'transfer' ? evaluation.response / pot * 100 : evaluation.response;
    const outcome = analyseLine(pot, stack, question.context.streetsRemaining ?? 3, selectedPercent / 100);
    lineStatus = evaluation.correct ? 'fit' : outcome.status === 'residue' ? 'residue' : 'early';
    stackDeltaBb = outcome.stackDelta;
  }
  const expected = typeof evaluation.expected === 'number' ? Math.round(evaluation.expected * 10) / 10 : evaluation.expected;
  const answerUnit = question.unit === 'percent' ? '%' : question.unit === 'bb' ? 'bb' : '';
  const headline = causalSizing
    ? evaluation.correct ? 'Line fit' : lineStatus === 'residue' ? `${stackDeltaBb.toFixed(1)}bb remains` : 'Stack forced in too soon'
    : evaluation.correct ? 'Signal locked' : question.type === 'spr-snap' ? 'Ratio lock missed' : question.type === 'root-reactor' ? 'Reactor sequence diverged' : 'Discrimination missed';
  const detail = evaluation.correct
    ? causalSizing ? `Correct: ${expected}${answerUnit}. The selected line and geometric line converge.` : `Correct: ${expected}${answerUnit}. The retrieval signal is verified.`
    : causalSizing
      ? evaluation.errorDirection === 'low'
        ? 'Your input was too low. The final gate closes before the effective stack is absorbed.'
        : 'Your input was too high. The stack disappears before the final gate.'
      : question.type === 'spr-snap'
        ? 'Recompute effective stack ÷ pot, then lock the nearest ratio.'
        : question.type === 'root-reactor'
          ? 'Reconstruct DOUBLE → +1 → ROOT → −1 → HALF before calculating again.'
          : 'Re-read the available runway before choosing the pressure class.';
  return { correct: evaluation.correct, score: Math.max(0, score), response, expected: evaluation.expected, explanation: question.explanation, headline, detail, lineStatus, stackDeltaBb, breakdown, causalSizing };
}

export default function App() {
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<NavScreen>('command');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [run, setRun] = useState<ActiveRun | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const runRef = useRef<ActiveRun | null>(null);

  useEffect(() => {
    void loadProfile().then((loaded) => {
      const evaluation = evaluateRank(loaded);
      const ready = { ...loaded, rank: evaluation.progress };
      profileRef.current = ready;
      setProfile(ready);
    });
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setSystemReducedMotion(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { runRef.current = run; }, [run]);
  useEffect(() => { if (profile) { audio.setMuted(profile.settings.muted); document.documentElement.style.colorScheme = 'dark'; } }, [profile]);
  useEffect(() => {
    if (!profile) return;
    const timeout = window.setTimeout(() => { void saveProfile(profile); }, 120);
    return () => window.clearTimeout(timeout);
  }, [profile]);

  const mutateProfile = useCallback((updater: (current: Profile) => Profile) => {
    setProfile((current) => {
      if (!current) return current;
      const next = updater(current);
      profileRef.current = next;
      return next;
    });
  }, []);

  const launch = useCallback((mission: MissionSpec) => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;
    void audio.unlock();
    audio.cue('engage');
    const seed = mission.id.startsWith('daily-') ? Number(new Date().toISOString().slice(0, 10).replaceAll('-', '')) : Date.now() & 0x7fffffff;
    const first = buildQuestion(currentProfile, mission, 0, seed);
    const active: ActiveRun = {
      id: uid('run'), mission, seed, startedAt: Date.now(), questionStartedAt: performance.now(), question: first.question, askConfidence: first.askConfidence,
      index: 0, score: 0, correct: 0, streak: 0, longestStreak: 0, lives: mission.mode === 'stackoff-survival' ? 3 : null,
      attemptIds: [], conceptIds: [], responseTimes: [], splits: [], feedback: null, terminateAfterFeedback: false, result: null, rankDelta: 0, strengthened: first.question.primaryConceptId, weakness: null,
      startSkillRating: currentProfile.rank.skillRating, startRank: currentProfile.rank.current,
    };
    runRef.current = active;
    setRun(active);
    setRemainingMs(mission.mode === 'reflex-rush' ? 45_000 : null);
  }, []);

  const finalizeRun = useCallback((source?: ActiveRun) => {
    const active = source ?? runRef.current;
    const currentProfile = profileRef.current;
    if (!active || active.result || !currentProfile) return;
    const endedAt = Date.now();
    const total = active.attemptIds.length;
    const scaffoldLevels = currentProfile.attempts.filter((attempt) => active.attemptIds.includes(attempt.id)).map((attempt) => attempt.scaffoldLevel);
    const rankBefore = currentProfile.rank.current;
    let summary: RunSummary = {
      id: active.id, mode: active.mission.mode, seed: active.seed, startedAt: active.startedAt, endedAt, score: active.score,
      accuracy: total ? active.correct / total : 0, correct: active.correct, total, averageResponseMs: total ? active.responseTimes.reduce((sum, value) => sum + value, 0) / total : 0,
      medianResponseMs: median(active.responseTimes), longestStreak: active.longestStreak, perfect: total > 0 && active.correct === total,
      difficulty: currentProfile.attempts.filter((attempt) => active.attemptIds.includes(attempt.id)).reduce((sum, attempt) => sum + attempt.difficulty, 0) / Math.max(1, total),
      scaffoldLevel: (scaffoldLevels.length ? Math.max(...scaffoldLevels) : 0) as ScaffoldLevel, conceptIds: [...new Set(active.conceptIds)], rankBefore: active.startRank, rankAfter: rankBefore, personalBestKeys: [], attemptIds: active.attemptIds,
    };
    const recordUpdate = updatePersonalRecords(currentProfile.records, summary);
    summary = { ...summary, personalBestKeys: recordUpdate.broken };
    let nextProfile: Profile = { ...currentProfile, records: recordUpdate.records, runs: [...currentProfile.runs, summary].slice(-250), stats: { ...currentProfile.stats, sessions: currentProfile.stats.sessions + 1 } };
    const evaluation = evaluateRank(nextProfile, endedAt);
    nextProfile = { ...nextProfile, rank: evaluation.progress };
    if (active.mission.mode === 'qualification') {
      const qualified = completeQualification(nextProfile, summary, endedAt);
      nextProfile = { ...nextProfile, rank: qualified.progress };
      if (qualified.passed) audio.cue('rank');
    }
    summary = { ...summary, rankAfter: nextProfile.rank.current };
    nextProfile = { ...nextProfile, runs: [...nextProfile.runs.slice(0, -1), summary] };
    const attemptedConcepts = summary.conceptIds.map((id) => nextProfile.concepts[id]).filter(Boolean);
    const strengthened = [...attemptedConcepts].sort((a, b) => b.mastery - a.mastery)[0]?.id ?? active.strengthened;
    const wrongAttempts = nextProfile.attempts.filter((attempt) => active.attemptIds.includes(attempt.id) && !attempt.correct);
    const counts = new Map<string, number>(); wrongAttempts.forEach((attempt) => counts.set(attempt.primaryConceptId, (counts.get(attempt.primaryConceptId) ?? 0) + 1));
    const weakness = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const rankDelta = nextProfile.rank.skillRating - active.startSkillRating;
    profileRef.current = nextProfile; setProfile(nextProfile);
    const complete = { ...active, result: summary, rankDelta, strengthened, weakness };
    runRef.current = complete; setRun(complete); setRemainingMs(null);
    if (recordUpdate.broken.length) audio.cue('record'); else audio.cue(summary.perfect ? 'mastery' : 'engage');
  }, []);

  useEffect(() => {
    if (!run || run.mission.mode !== 'reflex-rush' || run.result) return;
    const interval = window.setInterval(() => {
      const active = runRef.current;
      if (!active) return;
      const left = Math.max(0, 45_000 - (Date.now() - active.startedAt));
      setRemainingMs(left);
      if (left <= 0) { window.clearInterval(interval); finalizeRun(active); }
    }, 100);
    return () => window.clearInterval(interval);
  }, [finalizeRun, run?.id, run?.mission.mode, run?.result]);

  const submitAnswer = useCallback((response: AnswerValue, confidence: Confidence | null) => {
    const active = runRef.current;
    const currentProfile = profileRef.current;
    if (!active || active.feedback || active.result || !currentProfile) return;
    const responseTimeMs = Math.max(80, Math.round(performance.now() - active.questionStartedAt));
    const evaluation = evaluateAnswer(active.question, response);
    const concept = currentProfile.concepts[active.question.primaryConceptId];
    const retentionGapMs = concept?.lastReviewedAt ? Date.now() - concept.lastReviewedAt : 0;
    const breakdown = calculateAttemptScore({ correct: evaluation.correct, difficulty: active.question.difficulty, scaffoldLevel: active.question.scaffoldLevel, responseTimeMs, timeTargetMs: active.question.timeTargetMs, retentionGapMs, spacingIntervalMs: concept?.spacingIntervalMs, confidence, streak: active.streak, modeMultiplier: modeMultiplier(active.mission) });
    const attempt: Attempt = {
      id: uid('attempt'), questionId: active.question.id, questionType: active.question.type, primaryConceptId: active.question.primaryConceptId, conceptIds: active.question.conceptIds,
      sessionId: active.id, runId: active.id, mode: active.mission.mode, timestamp: Date.now(), sequence: currentProfile.sequence,
      response: evaluation.response, expectedAnswer: evaluation.expected, correct: evaluation.correct, responseTimeMs, confidence,
      scaffoldLevel: active.question.scaffoldLevel, difficulty: active.question.difficulty, retentionGapMs, errorDirection: evaluation.errorDirection, score: breakdown.total,
    };
    let updatedProfile = recordAttempt(currentProfile, attempt);
    const evaluationRank = evaluateRank(updatedProfile);
    updatedProfile = { ...updatedProfile, rank: evaluationRank.progress };
    profileRef.current = updatedProfile; setProfile(updatedProfile);
    const streak = evaluation.correct ? active.streak + 1 : 0;
    const lives = active.lives === null ? null : Math.max(0, active.lives - (evaluation.correct ? 0 : 1));
    const terminate = (active.mission.mode === 'perfect-ten' && !evaluation.correct) || lives === 0;
    const feedback = feedbackFor(active.question, evaluation, evaluation.response, breakdown.total, breakdown);
    const next: ActiveRun = {
      ...active, score: Math.max(0, active.score + breakdown.total), correct: active.correct + (evaluation.correct ? 1 : 0), streak, longestStreak: Math.max(active.longestStreak, streak), lives,
      attemptIds: [...active.attemptIds, attempt.id], conceptIds: [...active.conceptIds, ...active.question.conceptIds], responseTimes: [...active.responseTimes, responseTimeMs], splits: [...active.splits, Date.now() - active.startedAt],
      feedback, terminateAfterFeedback: terminate, weakness: evaluation.correct ? active.weakness : active.question.primaryConceptId,
    };
    runRef.current = next; setRun(next);
    audio.cue(evaluation.correct ? active.question.scaffoldLevel === 0 || active.question.difficulty > .7 ? 'hard-correct' : 'correct' : 'wrong');
    if (updatedProfile.settings.haptics) haptic(evaluation.correct ? [14, 22, 20] : 30);
  }, []);

  const nextQuestion = useCallback(() => {
    const active = runRef.current;
    const currentProfile = profileRef.current;
    if (!active || !active.feedback || !currentProfile) return;
    const completed = active.index + 1;
    if (active.terminateAfterFeedback || (active.mission.mode !== 'reflex-rush' && completed >= active.mission.length)) { finalizeRun(active); return; }
    const generated = buildQuestion(currentProfile, active.mission, completed, active.seed);
    const next = { ...active, index: completed, question: generated.question, askConfidence: generated.askConfidence, questionStartedAt: performance.now(), feedback: null, terminateAfterFeedback: false };
    runRef.current = next; setRun(next);
  }, [finalizeRun]);

  const onboardingAttempt = useCallback(({ streets, answer, correct, responseTimeMs }: { streets: 2 | 3; answer: number; correct: boolean; responseTimeMs: number }) => {
    mutateProfile((current) => {
      const question = generateQuestion({ type: 'anchor', seed: streets * 4, conceptId: `anchor:${streets}:4`, difficulty: .2, scaffoldLevel: 3 });
      const scoreBreakdown = calculateAttemptScore({ correct, difficulty: .2, scaffoldLevel: 3, responseTimeMs, timeTargetMs: 8_000 });
      const attempt: Attempt = { id: uid('onboard'), questionId: question.id, questionType: 'anchor', primaryConceptId: question.primaryConceptId, conceptIds: question.conceptIds, sessionId: 'first-contact', runId: null, mode: 'calibration', timestamp: Date.now(), sequence: current.sequence, response: answer, expectedAnswer: streets === 3 ? 54 : 100, correct, responseTimeMs, confidence: null, scaffoldLevel: 3, difficulty: .2, retentionGapMs: 0, errorDirection: correct ? 'none' : answer < (streets === 3 ? 54 : 100) ? 'low' : 'high', score: scoreBreakdown.total };
      return recordAttempt(current, attempt);
    });
  }, [mutateProfile]);

  const completeOnboarding = useCallback(() => mutateProfile((current) => ({ ...current, onboardingComplete: true, unlockedSectors: ['calibration-bay', 'anchor-forge', 'ratio-lock', 'runway-forge'], stats: { ...current.stats, sessions: current.stats.sessions + 1 } })), [mutateProfile]);
  const changeSettings = useCallback((settings: Profile['settings']) => mutateProfile((current) => ({ ...current, settings })), [mutateProfile]);
  const reset = useCallback(() => { void clearProfile().then(() => { const fresh = createDefaultProfile(); profileRef.current = fresh; setProfile(fresh); setRun(null); setSettingsOpen(false); setResetOpen(false); setScreen('command'); }); }, []);

  const ghostDelta = useMemo(() => {
    if (!run || run.mission.mode !== 'perfect-ten' || !profile?.records.perfectTen) return null;
    const best = profile.runs.find((entry) => entry.id === profile.records.perfectTen?.runId);
    if (!best) return null;
    const bestAttempts = profile.attempts.filter((attempt) => best.attemptIds.includes(attempt.id));
    const bestSplit = bestAttempts.slice(0, run.index + 1).reduce((sum, attempt) => sum + attempt.responseTimeMs, 0);
    const currentSplit = run.responseTimes.reduce((sum, value) => sum + value, 0);
    return currentSplit - bestSplit;
  }, [profile, run]);

  if (!profile) return <div className="loading-screen"><div className="loading-reactor"><i/><i/><i/><span>4</span></div><strong>INITIALIZING TABLE ZERO</strong><small>RESTORING COGNITIVE PROFILE</small></div>;
  const reducedMotion = profile.settings.reducedMotion || systemReducedMotion;
  if (!profile.onboardingComplete) return <Onboarding reducedMotion={reducedMotion} haptics={profile.settings.haptics} onAttempt={onboardingAttempt} onComplete={completeOnboarding} />;
  if (run?.result) return <RunResults mission={run.mission} run={run.result} rankDelta={run.rankDelta} strengthened={run.strengthened.replaceAll(':', ' · ')} weakness={run.weakness?.replaceAll(':', ' · ') ?? null} onRetry={() => launch(run.mission)} onRepair={() => launch({ ...run.mission, id: 'weakness-hunt', label: 'Weakness Hunt', mode: 'weakness-hunt', length: 8 })} onHome={() => setRun(null)} />;
  if (run) return <GameScreen mission={run.mission} question={run.question} questionNumber={run.index + 1} totalQuestions={run.mission.length} score={run.score} streak={run.streak} lives={run.lives} askConfidence={run.askConfidence} feedback={run.feedback} ghostDeltaMs={ghostDelta} remainingMs={remainingMs} reducedMotion={reducedMotion} onSubmit={submitAnswer} onNext={nextQuestion} onExit={() => { setRun(null); setRemainingMs(null); }} />;

  return (
    <div className={`app-shell ${reducedMotion ? 'reduced-motion' : ''} ${profile.settings.highContrast ? 'high-contrast' : ''}`}>
      <Header profile={profile} onSettings={() => setSettingsOpen(true)} />
      {screen === 'command' && <CommandDeck profile={profile} onLaunch={launch} onOpenSectors={() => setScreen('sectors')} onOpenGrid={() => setScreen('grid')} />}
      {screen === 'sectors' && <SectorGrid profile={profile} onLaunch={launch} />}
      {screen === 'grid' && <AnchorGrid profile={profile} onLaunch={launch} />}
      {screen === 'records' && <Records profile={profile} />}
      <BottomNav active={screen} onChange={setScreen} />
      {settingsOpen && <SettingsDrawer profile={profile} onClose={() => setSettingsOpen(false)} onChange={changeSettings} onReset={() => setResetOpen(true)} />}
      {resetOpen && <div className="modal-backdrop"><section className="confirm-reset game-frame" role="alertdialog" aria-modal="true"><span className="eyebrow">DESTRUCTIVE COMMAND</span><h2>Erase the local pilot profile?</h2><p>Mastery, attempts, ranks and personal records on this browser will be removed permanently.</p><div><button type="button" className="action-secondary" onClick={() => setResetOpen(false)}>CANCEL</button><button type="button" className="danger-confirm" onClick={reset}>ERASE PROFILE</button></div></section></div>}
    </div>
  );
}
