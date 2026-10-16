class WebAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private playTone(freq: number, type: OscillatorType, durationMs: number, gainVal = 0.07, delayMs = 0): void {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const start = this.ctx.currentTime + delayMs / 1000;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(gainVal, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + durationMs / 1000);
    } catch {
      // Ignora caso o navegador bloqueie áudio antes de clique
    }
  }

  public keyClick(): void {
    this.playTone(620, 'sine', 22, 0.02, 0);
  }

  public hit(streak: number): void {
    const base = 420 + Math.min(streak, 6) * 48;
    this.playTone(base, 'triangle', 100, 0.08, 0);
    this.playTone(base * 1.25, 'sine', 150, 0.07, 45);
  }

  public bank(): void {
    this.playTone(523.25, 'sine', 95, 0.09, 0);
    this.playTone(659.25, 'sine', 115, 0.09, 55);
    this.playTone(783.99, 'triangle', 200, 0.1, 110);
  }

  public error(): void {
    this.playTone(195, 'sawtooth', 160, 0.075, 0);
    this.playTone(145, 'sawtooth', 230, 0.075, 75);
  }

  public tickUrgent(): void {
    this.playTone(840, 'sine', 35, 0.025, 0);
  }

  public finish(): void {
    this.playTone(523.25, 'triangle', 130, 0.08, 0);
    this.playTone(783.99, 'triangle', 260, 0.09, 95);
  }
}

export const SoundEngine = new WebAudioSynthesizer();