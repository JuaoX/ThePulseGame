import { createUISFX, type CueName, type UISFXPlayer } from 'uisfx';

class PulseSound {
  private player: UISFXPlayer | undefined;
  private level = 0.5;
  private lastHover = 0;
  private getPlayer(): UISFXPlayer {
    return this.player ||= createUISFX({ pack: 'soft', volume: this.level, maxVoices: 4, cooldownMs: 100 });
  }
  set volume(value: number) {
    this.level = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
    this.player?.setVolume(this.level);
    this.player?.setEnabled(this.level > 0);
    if (this.level === 0) this.player?.stopAll();
  }
  get volume(): number { return this.level; }
  unlock(): void {
    if (this.level <= 0) return;
    try { void this.getPlayer().unlock().catch(() => {}); } catch { /* Sound is optional. */ }
  }
  private play(cue: CueName): void {
    if (this.level <= 0) return;
    try { this.getPlayer().play(cue); } catch { /* Visible feedback remains available. */ }
  }
  hoverTick(): void {
    const now = performance.now();
    if (now - this.lastHover < 180) return;
    this.lastHover = now;
    this.play('hover');
  }
  keyClick(): void { /* Typing stays quiet. */ }
  modeSelect(): void { this.play('select'); }
  hit(_streak = 0): void { this.play('success'); }
  bank(): void { this.play('reward'); }
  error(): void { this.play('warning'); }
  tickUrgent(): void { /* A visible clock carries urgency without repeated beeps. */ }
  finish(): void { this.play('complete'); }
  stop(): void { this.player?.stopAll(); }
}
export const SoundEngine = new PulseSound();
