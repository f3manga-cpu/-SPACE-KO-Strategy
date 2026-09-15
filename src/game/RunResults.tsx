import type { PersonalBestKey, RunSummary } from '../core/types';
import { RANKS, type MissionSpec } from '../ui/content';

const recordNames: Record<PersonalBestKey, string> = {
  longestCleanStreak: 'Longest clean streak', perfectTen: 'Perfect Ten', reflexArena: 'Reflex Rush', tableTransfer: 'Table transfer', fastestSprSequence: 'SPR recognition', accuracyTwenty: '20-decision accuracy', highestDifficulty: 'Difficulty ceiling', dailyChallenge: 'Daily Protocol', fastAccurateLatency: 'Accurate latency',
};

export function RunResults({ mission, run, rankDelta, strengthened, weakness, onRetry, onRepair, onHome }: {
  mission: MissionSpec;
  run: RunSummary;
  rankDelta: number;
  strengthened: string;
  weakness: string | null;
  onRetry: () => void;
  onRepair: () => void;
  onHome: () => void;
}) {
  const modeRecord: Partial<Record<MissionSpec['mode'], PersonalBestKey>> = {
    'perfect-ten': 'perfectTen',
    'reflex-rush': 'reflexArena',
    'transfer-gauntlet': 'tableTransfer',
    'daily-challenge': 'dailyChallenge',
  };
  const preferredRecord = modeRecord[mission.mode];
  const newBest = preferredRecord && run.personalBestKeys.includes(preferredRecord) ? preferredRecord : run.personalBestKeys[0];
  const promoted = mission.mode === 'qualification' && run.rankAfter !== run.rankBefore;
  const qualificationFailed = mission.mode === 'qualification' && !promoted;
  const promotedRank = RANKS.find((rank) => rank.id === run.rankAfter);
  const headline = promoted ? `${promotedRank?.label ?? run.rankAfter} attained` : newBest ? recordNames[newBest] : mission.label;
  const eyebrow = promoted ? 'RANK PROMOTION' : qualificationFailed ? 'QUALIFICATION STANDARD MISSED' : newBest ? 'NEW PERSONAL RECORD' : run.perfect ? 'PERFECT CONVERGENCE' : 'SORTIE COMPLETE';
  return (
    <div className={`results-shell ${newBest ? 'has-record' : ''} ${promoted ? 'has-promotion' : ''}`} data-testid="run-results">
      <div className="results-atmosphere" />
      <header className="results-header"><span>{mission.callSign} // DEBRIEF</span><button type="button" onClick={onHome}>RETURN TO COMMAND ×</button></header>
      <main className="results-stage game-frame">
        <div className="result-classification"><div className={`result-seal ${run.perfect || promoted ? 'perfect' : ''}`}><i /><span>{promoted ? promotedRank?.short : run.perfect ? 'A+' : run.accuracy >= .9 ? 'A' : run.accuracy >= .8 ? 'B' : run.accuracy >= .65 ? 'C' : 'D'}</span></div><div><span className="eyebrow">{eyebrow}</span><h1>{headline}</h1><p>{promoted ? 'Classification confirmed. The facility has opened a deeper pressure tier.' : qualificationFailed ? 'The gate remains open. Repair the exposed signal and prove it again.' : newBest ? 'Your prior performance ghost has been overwritten.' : run.accuracy >= .9 ? 'The line held under pressure.' : weakness ? 'The forge isolated a repairable break in the line.' : 'Signal captured. The scheduler has adjusted.'}</p></div></div>
        <div className="result-score"><span>MISSION SCORE</span><strong>{run.score.toLocaleString()}</strong><em className={rankDelta >= 0 ? 'positive' : ''}>{rankDelta >= 0 ? '+' : ''}{rankDelta.toFixed(1)} SKILL SIGNAL</em></div>
        <div className="result-vitals">
          <div><span>ACCURACY</span><strong>{Math.round(run.accuracy * 100)}<small>%</small></strong><i style={{ width: `${run.accuracy * 100}%` }} /></div>
          <div><span>MEDIAN LATENCY</span><strong>{(run.medianResponseMs / 1000).toFixed(2)}<small>s</small></strong><i style={{ width: `${Math.max(8, Math.min(100, 100 - run.medianResponseMs / 40))}%` }} /></div>
          <div><span>CLEAN CHAIN</span><strong>{run.longestStreak}<small>x</small></strong><i style={{ width: `${Math.min(100, run.longestStreak / Math.max(1, run.total) * 100)}%` }} /></div>
          <div><span>INDEPENDENCE</span><strong>{run.scaffoldLevel === 0 ? 'FULL' : `L${run.scaffoldLevel}`}</strong><i style={{ width: `${(3 - run.scaffoldLevel) / 3 * 100}%` }} /></div>
        </div>
        <div className="result-intel">
          <div className="strength-intel"><i>↑</i><div><span>TRACE STRENGTHENED</span><strong>{strengthened}</strong><p>Scheduled according to its new stability.</p></div></div>
          <div className={weakness ? 'weakness-intel' : 'strength-intel'}><i>{weakness ? '⌖' : '✓'}</i><div><span>{weakness ? 'WEAKNESS EXPOSED' : 'NO CRITICAL BREAK'}</span><strong>{weakness ?? 'All tested signals held'}</strong><p>{weakness ? 'A focused repair route is ready.' : 'Next mission will increase desirable difficulty.'}</p></div></div>
        </div>
        {promoted && <div className="record-event rank-promotion"><span>CLASSIFICATION CONFIRMED</span><strong>{promotedRank?.label} // {promotedRank && RANKS.indexOf(promotedRank) === RANKS.length - 1 ? 'APEX STATUS' : 'NEW SECTORS AUTHORIZED'}</strong><i>{promotedRank?.short}</i></div>}
        {!promoted && newBest && <div className="record-event"><span>NEW PERSONAL RECORD</span><strong>{recordNames[newBest]}</strong><i>PB</i></div>}
        <div className="result-actions"><button type="button" className="action-secondary" onClick={onHome}>COMMAND DECK</button>{weakness && <button type="button" className="action-secondary repair" onClick={onRepair}>REPAIR WEAKNESS</button>}<button type="button" className="action-primary" onClick={onRetry}>RUN AGAIN <i>↻</i></button></div>
      </main>
    </div>
  );
}
