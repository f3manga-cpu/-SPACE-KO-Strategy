import type { Profile } from '../core/types';
import { RANKS, type NavScreen } from '../ui/content';

interface HeaderProps {
  profile: Profile;
  onSettings: () => void;
}

export function ForgeMark() {
  return (
    <span className="forge-mark" aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}

export function Header({ profile, onSettings }: HeaderProps) {
  const rank = RANKS.find((entry) => entry.id === profile.rank.current) ?? RANKS[0];
  const due = Object.values(profile.concepts).filter((concept) => concept.attempts > 0 && concept.nextReviewAt <= Date.now()).length;
  return (
    <header className="command-header">
      <div className="brand-lockup">
        <ForgeMark />
        <div>
          <span>AXIOM COGNITION DIVISION</span>
          <strong>REFLEX FORGE <em>// TABLE ZERO</em></strong>
        </div>
      </div>
      <div className="header-status">
        <div className="sync-state"><i /> SYSTEM ONLINE</div>
        <div className="due-chip" title="Memory reviews due"><span>DUE</span><strong>{String(due).padStart(2, '0')}</strong></div>
        <button type="button" className="rank-chip" aria-label={`Current rank ${rank.label}`}>
          <span>{rank.short}</span>
          <div><small>CURRENT CLASS</small><strong>{rank.label}</strong></div>
        </button>
        <button className="icon-button" type="button" onClick={onSettings} aria-label="Open settings"><span aria-hidden="true">⌘</span></button>
      </div>
    </header>
  );
}

interface BottomNavProps {
  active: NavScreen;
  onChange: (screen: NavScreen) => void;
}

const navItems: Array<{ id: NavScreen; label: string; glyph: string }> = [
  { id: 'command', label: 'Command', glyph: '⌂' },
  { id: 'sectors', label: 'Sectors', glyph: '⬡' },
  { id: 'grid', label: 'Anchor Grid', glyph: '⌘' },
  { id: 'records', label: 'Records', glyph: '⌁' },
  { id: 'academy', label: 'Learn', glyph: '?' },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {navItems.map((item) => (
        <button type="button" key={item.id} className={active === item.id ? 'active' : ''} onClick={() => onChange(item.id)} aria-current={active === item.id ? 'page' : undefined}>
          <span aria-hidden="true">{item.glyph}</span><small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

export function SettingsDrawer({ profile, onClose, onChange, onReset }: {
  profile: Profile;
  onClose: () => void;
  onChange: (settings: Profile['settings']) => void;
  onReset: () => void;
}) {
  const toggle = (key: keyof Profile['settings']) => onChange({ ...profile.settings, [key]: !profile.settings[key] });
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-drawer game-frame" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="drawer-head"><div><span className="eyebrow">SYSTEM CONTROL</span><h2 id="settings-title">Interface protocols</h2></div><button className="icon-button" onClick={onClose} type="button" aria-label="Close settings">×</button></div>
        <div className="setting-list">
          <button type="button" onClick={() => toggle('muted')}><div><strong>Sound field</strong><span>Informational response cues</span></div><i className={!profile.settings.muted ? 'on' : ''}>{!profile.settings.muted ? 'ON' : 'OFF'}</i></button>
          <button type="button" onClick={() => toggle('haptics')}><div><strong>Tactile response</strong><span>Supported mobile devices</span></div><i className={profile.settings.haptics ? 'on' : ''}>{profile.settings.haptics ? 'ON' : 'OFF'}</i></button>
          <button type="button" onClick={() => toggle('reducedMotion')}><div><strong>Reduced motion</strong><span>Compress non-essential choreography</span></div><i className={profile.settings.reducedMotion ? 'on' : ''}>{profile.settings.reducedMotion ? 'ON' : 'OFF'}</i></button>
          <button type="button" onClick={() => toggle('highContrast')}><div><strong>High contrast</strong><span>Increase critical-state separation</span></div><i className={profile.settings.highContrast ? 'on' : ''}>{profile.settings.highContrast ? 'ON' : 'OFF'}</i></button>
        </div>
        <div className="settings-note"><span>LOCAL PROFILE</span><p>Your learning history stays in this browser. The architecture is ready for an account-backed profile later.</p></div>
        <button type="button" className="danger-link" onClick={onReset}>Reset all training data</button>
      </section>
    </div>
  );
}
