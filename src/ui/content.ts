import type { GameMode, QuestionType, RankId } from '../core/types';

export type NavScreen = 'command' | 'sectors' | 'grid' | 'records';

export interface MissionSpec {
  id: string;
  label: string;
  callSign: string;
  description: string;
  operation: string;
  mode: GameMode;
  focus?: QuestionType;
  length: number;
  metric: string;
  icon: string;
  unlockRank: RankId;
  accent: 'cyan' | 'amber' | 'violet' | 'green' | 'red';
  highStakes?: boolean;
}

export const RANKS: Array<{ id: RankId; label: string; short: string; threshold: number }> = [
  { id: 'unranked', label: 'Unranked', short: 'UR', threshold: 0 },
  { id: 'bronze', label: 'Bronze', short: 'B', threshold: 25 },
  { id: 'silver', label: 'Silver', short: 'S', threshold: 36 },
  { id: 'gold', label: 'Gold', short: 'G', threshold: 48 },
  { id: 'platinum', label: 'Platinum', short: 'P', threshold: 59 },
  { id: 'diamond', label: 'Diamond', short: 'D', threshold: 69 },
  { id: 'master', label: 'Master', short: 'M', threshold: 78 },
  { id: 'grandmaster', label: 'Grandmaster', short: 'GM', threshold: 87 },
  { id: 'geometry-elite', label: 'Geometry Elite', short: 'GE', threshold: 94 },
];

export const MISSIONS: MissionSpec[] = [
  {
    id: 'anchor-forge', label: 'Anchor Forge', callSign: 'AF–10', description: 'Burn the ten canonical lines into direct recall.', operation: 'RETRIEVE', mode: 'adaptive', focus: 'anchor', length: 10, metric: 'Accuracy + recall speed', icon: '⌁', unlockRank: 'unranked', accent: 'cyan',
  },
  {
    id: 'spr-snap', label: 'Ratio Lock', callSign: 'RL–08', description: 'Read pot and effective stack as SPR without breaking flow.', operation: 'RECOGNIZE', mode: 'adaptive', focus: 'spr-snap', length: 8, metric: 'SPR recognition', icon: '÷', unlockRank: 'unranked', accent: 'amber',
  },
  {
    id: 'runway', label: 'Runway Forge', callSign: 'RW–08', description: 'Feel how fewer streets compress the required sizing.', operation: 'DISCRIMINATE', mode: 'adaptive', focus: 'runway', length: 8, metric: 'Runway discrimination', icon: '⇥', unlockRank: 'unranked', accent: 'green',
  },
  {
    id: 'root-reactor', label: 'Root Reactor', callSign: 'RR–06', description: 'Rebuild unknown sizings through the five causal operations.', operation: 'RECONSTRUCT', mode: 'precision', focus: 'root-reactor', length: 6, metric: 'Fallback fluency', icon: '√', unlockRank: 'unranked', accent: 'violet',
  },
  {
    id: 'ghost-line', label: 'Ghost Array', callSign: 'GA–08', description: 'Read a betting trajectory in reverse, with the numbers stripped away.', operation: 'INVERT', mode: 'contrast-duel', focus: 'ghost-line', length: 8, metric: 'Inverse geometry', icon: '≋', unlockRank: 'silver', accent: 'violet',
  },
  {
    id: 'precision', label: 'Precision Core', callSign: 'PC–10', description: 'Produce exact geometry for arbitrary stack-to-pot ratios.', operation: 'GENERATE', mode: 'precision', focus: 'precision', length: 10, metric: 'Narrowing tolerance', icon: '◇', unlockRank: 'silver', accent: 'cyan',
  },
  {
    id: 'contrast', label: 'Contrast Duel', callSign: 'CD–10', description: 'Separate neighboring lines and cross-system traps at combat speed.', operation: 'SEPARATE', mode: 'contrast-duel', focus: 'contrast', length: 10, metric: 'Confusion resistance', icon: '⟷', unlockRank: 'bronze', accent: 'amber',
  },
  {
    id: 'table-zero', label: 'Table Zero', callSign: 'TZ–10', description: 'The flagship simulation: table state in, bet decision out.', operation: 'TRANSFER', mode: 'arena', focus: 'transfer', length: 10, metric: 'Table transfer', icon: '◎', unlockRank: 'unranked', accent: 'red', highStakes: true,
  },
];

export const REPLAY_MODES: MissionSpec[] = [
  {
    id: 'perfect-ten', label: 'Perfect Ten', callSign: 'P10', description: 'Ten anchors. One miss terminates the run. Race your personal ghost.', operation: 'PERFECT RUN', mode: 'perfect-ten', focus: 'anchor', length: 10, metric: 'Perfect time', icon: '10', unlockRank: 'unranked', accent: 'amber', highStakes: true,
  },
  {
    id: 'reflex-rush', label: 'Reflex Rush', callSign: 'RX', description: 'Accuracy-gated speed. Maintain the line as the chamber accelerates.', operation: 'PRESSURE', mode: 'reflex-rush', length: 16, metric: 'Score in 45 seconds', icon: '»', unlockRank: 'silver', accent: 'red', highStakes: true,
  },
  {
    id: 'survival', label: 'Stackoff Survival', callSign: 'SS', description: 'Difficulty climbs continuously. Three critical errors end the sequence.', operation: 'ENDURE', mode: 'stackoff-survival', length: 24, metric: 'Depth reached', icon: '∞', unlockRank: 'gold', accent: 'red', highStakes: true,
  },
  {
    id: 'transfer-gauntlet', label: 'Transfer Gauntlet', callSign: 'TG', description: 'Only table information. No explicit SPR and no anchor grid.', operation: 'PROVE', mode: 'transfer-gauntlet', focus: 'transfer', length: 12, metric: 'Unassisted transfer', icon: '⌾', unlockRank: 'silver', accent: 'cyan', highStakes: true,
  },
];

export const rankIndex = (rank: RankId) => RANKS.findIndex((entry) => entry.id === rank);
export const isMissionUnlocked = (mission: MissionSpec, rank: RankId) => rankIndex(rank) >= rankIndex(mission.unlockRank);
