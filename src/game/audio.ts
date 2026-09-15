type Cue = 'engage' | 'select' | 'correct' | 'hard-correct' | 'wrong' | 'mastery' | 'record' | 'rank' | 'tick';

class AudioDirector {
  private context: AudioContext | null = null;
  private muted = false;

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  async unlock() {
    if (this.muted) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      // Audio is enhancement-only. Browser policy may reject initialization.
    }
  }

  cue(name: Cue) {
    if (this.muted) return;
    void this.unlock().then(() => {
      const ctx = this.context;
      if (!ctx) return;
      const patterns: Record<Cue, Array<[number, number, number, OscillatorType]>> = {
        engage: [[110, 0, 0.16, 'sine'], [220, 0.07, 0.18, 'triangle']],
        select: [[420, 0, 0.045, 'sine']],
        correct: [[392, 0, 0.13, 'sine'], [523.25, 0.055, 0.18, 'sine'], [659.25, 0.11, 0.22, 'sine']],
        'hard-correct': [[261.63, 0, 0.17, 'triangle'], [392, 0.055, 0.2, 'sine'], [523.25, 0.11, 0.25, 'sine'], [783.99, 0.17, 0.28, 'sine']],
        wrong: [[196, 0, 0.13, 'triangle'], [174.61, 0.08, 0.2, 'sine']],
        mastery: [[261.63, 0, 0.28, 'sine'], [392, 0.08, 0.3, 'sine'], [659.25, 0.17, 0.38, 'sine']],
        record: [[523.25, 0, 0.13, 'triangle'], [659.25, 0.07, 0.16, 'triangle'], [783.99, 0.14, 0.2, 'sine'], [1046.5, 0.23, 0.38, 'sine']],
        rank: [[130.81, 0, 0.32, 'sawtooth'], [261.63, 0.08, 0.34, 'triangle'], [392, 0.16, 0.4, 'sine'], [523.25, 0.26, 0.55, 'sine']],
        tick: [[880, 0, 0.035, 'square']],
      };
      const start = ctx.currentTime + 0.005;
      for (const [frequency, offset, duration, type] of patterns[name]) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start + offset);
        filter.type = 'lowpass';
        filter.frequency.value = name === 'rank' ? 1800 : 2600;
        gain.gain.setValueAtTime(0.0001, start + offset);
        gain.gain.exponentialRampToValueAtTime(name === 'tick' ? 0.012 : 0.045, start + offset + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + duration);
        oscillator.connect(filter).connect(gain).connect(ctx.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration + 0.02);
      }
    });
  }
}

export const audio = new AudioDirector();

export function haptic(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Haptics are enhancement-only.
  }
}
