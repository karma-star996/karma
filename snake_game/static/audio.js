// ============================================================
// Snake — Web Audio API 8-Bit Chiptune Synthesizer
// Pure procedural sound effects without external audio files.
// ============================================================

class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem("snake_muted") === "true";
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    localStorage.setItem("snake_muted", this.muted ? "true" : "false");
  }

  playTone(freq, type, duration, startVol = 0.18, endVol = 0.001) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(endVol, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playEat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playGolden() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "square", 0.09, 0.22);
      }, idx * 60);
    });
  }

  playPowerup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, "triangle", 0.12, 0.2);
      }, idx * 70);
    });
  }

  playDie() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  playClick() {
    this.playTone(600, "sine", 0.03, 0.1);
  }

  playPause() {
    this.playTone(400, "square", 0.05, 0.12);
    setTimeout(() => this.playTone(300, "square", 0.05, 0.12), 60);
  }

  playResume() {
    this.playTone(300, "square", 0.05, 0.12);
    setTimeout(() => this.playTone(400, "square", 0.05, 0.12), 60);
  }

  playFanfare() {
    if (this.muted) return;
    const fanfareNotes = [
      { f: 523.25, d: 100 },
      { f: 659.25, d: 100 },
      { f: 783.99, d: 100 },
      { f: 1046.5, d: 250 },
    ];
    let offset = 0;
    fanfareNotes.forEach((n) => {
      setTimeout(() => {
        this.playTone(n.f, "square", n.d / 1000, 0.25);
      }, offset);
      offset += n.d + 20;
    });
  }
}

// Global singleton instance
window.soundFX = new SoundFX();

// Auto-unlock audio context on first user touch/key
window.addEventListener("pointerdown", () => window.soundFX.init(), { once: true });
window.addEventListener("keydown", () => window.soundFX.init(), { once: true });
