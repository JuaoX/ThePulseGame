class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public volume: number = 0.85;

  private init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, durationMs: number, gainVal = 0.08, delayMs = 0): void {
    if (this.volume <= 0.01) return;
    try {
      this.init();
      if (!this.ctx) return;
      const start = this.ctx.currentTime + delayMs / 1000;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(gainVal * this.volume, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + durationMs / 1000);
    } catch {
      // Ignore autoplay lock
    }
  }

  public hoverTick(): void {
    this.playTone(540, 'sine', 18, 0.018, 0);
  }

  public modeSelect(): void {
    this.playTone(480, 'triangle', 55, 0.05, 0);
    this.playTone(720, 'sine', 90, 0.06, 35);
  }

  public keyClick(): void {
    this.playTone(680, 'sine', 24, 0.03, 0);
  }

  public hit(streak: number): void {
    const base = 440 + Math.min(streak, 6) * 55;
    this.playTone(base, 'triangle', 105, 0.09, 0);
    this.playTone(base * 1.25, 'sine', 155, 0.08, 48);
  }

  public bank(): void {
    this.playTone(523.25, 'sine', 95, 0.1, 0);
    this.playTone(659.25, 'sine', 115, 0.1, 58);
    this.playTone(783.99, 'triangle', 210, 0.11, 115);
  }

  public error(): void {
    this.playTone(185, 'sawtooth', 170, 0.085, 0);
    this.playTone(138, 'sawtooth', 240, 0.085, 75);
  }

  public tickUrgent(): void {
    this.playTone(900, 'sine', 38, 0.035, 0);
  }

  public finish(): void {
    this.playTone(523.25, 'triangle', 110, 0.09, 0);
    this.playTone(659.25, 'triangle', 130, 0.09, 85);
    this.playTone(880, 'triangle', 320, 0.11, 175);
  }
}

export const SoundEngine = new WebAudioSynthesizer();