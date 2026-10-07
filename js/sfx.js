/* V4: efectos de sonido sintetizados. Sin archivos externos. */
(function (root) {
  "use strict";
  class MilkSfx {
    constructor(ctx) {
      this.c = ctx;
      this.out = ctx.createGain();
      this.out.connect(ctx.destination);
      const len = ctx.sampleRate * 1;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.uhtNext = 0;
      this.uhtStep = 0;
      this.dropPitch = 0;
      this.lastDrop = 0;
    }
    tone(freq, start, dur, type = "square", vol = 0.25, endFreq, attack = 0.005) {
      const c = this.c,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, start);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), start + dur);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(vol, start + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(this.out);
      o.start(start);
      o.stop(start + dur + 0.02);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    hiss(start, dur, vol = 0.2, freq = 2000, type = "highpass") {
      const c = this.c,
        s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = this.noise;
      f.type = type;
      f.frequency.value = freq;
      g.gain.setValueAtTime(vol, start);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.out);
      s.start(start);
      s.stop(start + dur + 0.02);
      s.onended = () => {
        s.disconnect();
        f.disconnect();
        g.disconnect();
      };
    }
    play(type, volume = 25, opts = {}) {
      const c = this.c,
        t = c.currentTime;
      this.out.gain.value = (volume / 100) * 0.55;
      const n = (semi) => 523.25 * Math.pow(2, semi / 12);
      switch (type) {
        case "drop": {
          this.dropPitch = t - this.lastDrop < 0.35 ? Math.min(this.dropPitch + 1, 7) : 0;
          this.lastDrop = t;
          const b = 12 + this.dropPitch;
          this.tone(n(b), t, 0.06, "square", 0.12);
          this.tone(n(b + 7), t + 0.055, 0.16, "square", 0.12);
          break;
        }
        case "cap":
          [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(n(s + 7), t + i * 0.055, 0.22, "triangle", 0.2));
          break;
        case "bump":
          this.tone(160, t, 0.09, "triangle", 0.35, 90);
          break;
        case "bumpused":
          this.tone(110, t, 0.07, "triangle", 0.25, 80);
          break;
        case "break":
          this.hiss(t, 0.25, 0.35, 900, "lowpass");
          this.tone(140, t, 0.12, "square", 0.15, 60);
          break;
        case "popitem":
          for (let i = 0; i < 8; i++) this.tone(300 + i * 90, t + i * 0.035, 0.06, "triangle", 0.18);
          break;
        case "power":
          [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(n(s), t + i * 0.045, 0.12, "square", 0.12));
          break;
        case "powerend":
          this.tone(n(7), t, 0.12, "triangle", 0.18);
          this.tone(n(0), t + 0.12, 0.25, "triangle", 0.18);
          break;
        case "stomp": {
          const k = Math.min(opts.combo || 1, 8);
          this.tone(380 + k * 60, t, 0.12, "square", 0.18, 160 + k * 30);
          break;
        }
        case "spring":
          this.tone(180, t, 0.35, "sine", 0.35, 620);
          this.tone(620, t + 0.12, 0.25, "triangle", 0.12, 300);
          break;
        case "slam":
          this.hiss(t, 0.3, 0.4, 500, "lowpass");
          this.tone(70, t, 0.25, "sine", 0.5, 40);
          break;
        case "steam":
          this.hiss(t, 0.7, 0.12, 3000);
          break;
        case "warn":
          this.tone(880, t, 0.08, "square", 0.1);
          this.tone(880, t + 0.16, 0.08, "square", 0.1);
          break;
        case "alarm":
          for (let i = 0; i < 4; i++) this.tone(i % 2 ? 660 : 880, t + i * 0.13, 0.12, "sawtooth", 0.09);
          break;
        case "shieldbreak":
          this.hiss(t, 0.4, 0.25, 4000);
          this.tone(1600, t, 0.3, "sine", 0.2, 500);
          break;
        case "enemydeath":
          this.tone(500, t, 0.15, "square", 0.15, 900);
          this.hiss(t + 0.05, 0.15, 0.15, 1500);
          break;
        case "enemyhit":
          this.tone(320, t, 0.06, "square", 0.12, 260);
          break;
        case "lemon":
          this.tone(900, t, 0.12, "sine", 0.12, 1400);
          break;
        case "crumble":
          this.hiss(t, 0.35, 0.12, 700, "bandpass");
          break;
        case "fridge":
          this.hiss(t, 0.8, 0.1, 1200, "bandpass");
          this.tone(n(12), t, 0.4, "sine", 0.1);
          break;
        case "hot":
        case "sour":
          this.tone(220, t, 0.3, "sawtooth", 0.08, 160);
          break;
        case "checkpoint":
          [0, 4, 7, 12].forEach((s, i) => this.tone(n(s), t + i * 0.09, 0.3, "triangle", 0.2));
          break;
        case "secret":
          [19, 18, 15, 9, 8, 16, 20, 24].forEach((s, i) => this.tone(n(s - 12), t + i * 0.07, 0.12, "square", 0.1));
          break;
        case "bonus":
          [0, 7, 12, 19].forEach((s, i) => this.tone(n(s + 5), t + i * 0.06, 0.2, "square", 0.12));
          break;
        case "cratebreak":
        case "icebreak":
          this.hiss(t, 0.3, 0.3, type === "icebreak" ? 3500 : 800, type === "icebreak" ? "highpass" : "lowpass");
          break;
        // ---- V7 Premium ----
        case "skid":
          // Roce suave de zapatilla en lugar del zumbido grave.
          this.hiss(t, 0.09, 0.05, 2400, "bandpass");
          this.tone(1150, t, 0.07, "sine", 0.025, 900);
          break;
        case "shoot":
          this.tone(opts.cacao ? 420 : 620, t, 0.09, "sine", 0.14, opts.cacao ? 220 : 320);
          this.hiss(t, 0.06, 0.05, opts.cacao ? 900 : 2200, "bandpass");
          break;
        case "days":
          [12, 16, 19].forEach((s, i) => this.tone(n(s), t + i * 0.05, 0.18, "triangle", 0.16));
          break;
        case "refill":
          [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(n(s), t + i * 0.045, 0.2, "sine", 0.16));
          this.hiss(t, 0.5, 0.04, 3000, "bandpass");
          break;
        case "clone":
          [0, 7, 12, 19].forEach((s, i) => {
            this.tone(n(s), t + i * 0.06, 0.14, "square", 0.08);
            this.tone(n(s) * 1.01, t + i * 0.06 + 0.03, 0.14, "square", 0.06);
          });
          break;
        case "splat":
          this.hiss(t, opts.soft ? 0.15 : 0.32, opts.soft ? 0.12 : 0.28, 600, "lowpass");
          this.tone(opts.soft ? 260 : 180, t, 0.22, "sine", opts.soft ? 0.1 : 0.2, 60);
          break;
        case "robotdown":
          this.tone(420, t, 0.5, "sawtooth", 0.08, 70);
          this.hiss(t + 0.35, 0.3, 0.25, 500, "lowpass");
          break;
        case "throw":
          this.hiss(t, 0.18, 0.08, 1400, "bandpass");
          break;
        case "wind":
          this.hiss(t, 2.4, 0.09, 500, "bandpass");
          this.hiss(t + 0.8, 1.6, 0.06, 900, "bandpass");
          break;
        case "thunder":
          this.hiss(t, 2.2, 0.35, 160, "lowpass");
          this.tone(48, t, 1.5, "sine", 0.25, 32);
          break;
        case "powerdown":
          this.tone(320, t, 0.7, "sawtooth", 0.06, 50);
          break;
        case "laser":
          this.tone(1400, t, 0.4, "sawtooth", 0.06, 900);
          break;
        case "enemywarn":
          this.tone(700, t, 0.07, "triangle", 0.06, 900);
          break;
        // ---- V9 · Nivel 3: la ciudad y la Vaca Mecánica ----
        case "moo":
          // Mugido metálico: dos sierras graves que bajan con vibrato.
          this.tone(150, t, 1.1, "sawtooth", 0.12, 95, 0.12);
          this.tone(152, t + 0.02, 1.1, "square", 0.05, 92, 0.12);
          this.hiss(t, 0.5, 0.05, 700, "bandpass");
          break;
        case "cowland":
          this.tone(70, t, 0.9, "sine", 0.55, 28);
          this.tone(46, t, 1.4, "sine", 0.4, 24);
          this.hiss(t, 1.3, 0.45, 220, "lowpass");
          this.hiss(t + 0.05, 0.35, 0.2, 1800, "bandpass");
          [0.18, 0.31, 0.46].forEach((d, i) => this.tone(900 - i * 150, t + d, 0.06, "square", 0.04, 500));
          break;
        case "whoosh":
          this.hiss(t, 0.55, 0.18, opts.down ? 500 : 900, "bandpass");
          this.tone(opts.down ? 500 : 180, t, 0.5, "sine", 0.08, opts.down ? 120 : 520);
          break;
        case "charge":
          this.tone(200, t, 1.3, "sawtooth", 0.06, 1400, 0.3);
          this.tone(203, t, 1.3, "square", 0.03, 1420, 0.3);
          break;
        case "cowfire":
          this.tone(1300, t, 0.5, "sawtooth", 0.12, 160);
          this.hiss(t, 0.45, 0.25, 1200, "bandpass");
          this.tone(90, t, 0.4, "sine", 0.3, 40);
          break;
        case "blast":
          this.hiss(t, 0.7, 0.35, 600, "lowpass");
          this.tone(110, t, 0.5, "sine", 0.35, 35);
          [0, 5, 9].forEach((s, i) => this.tone(n(s + 12), t + 0.04 * i, 0.15, "triangle", 0.05));
          break;
        case "armor":
          this.tone(1800, t, 0.08, "triangle", 0.07, 2600);
          this.tone(2400, t + 0.03, 0.1, "sine", 0.05);
          break;
        case "shieldup":
          [7, 12, 19].forEach((s, i) => this.tone(n(s), t + i * 0.04, 0.12, "sine", 0.06));
          this.hiss(t, 0.25, 0.04, 4000);
          break;
        case "meow":
          this.tone(opts.soft ? 900 : 700, t, 0.28, "triangle", opts.soft ? 0.07 : 0.12, opts.soft ? 600 : 1100, 0.04);
          this.tone(opts.soft ? 1000 : 1150, t + 0.2, 0.22, "triangle", 0.08, 650);
          break;
        case "hiss":
          this.hiss(t, 0.35, 0.18, 3500);
          break;
        case "bark":
          [0, 0.18].forEach((d) => {
            this.tone(320, t + d, 0.11, "sawtooth", 0.14, 160);
            this.hiss(t + d, 0.08, 0.1, 900, "bandpass");
          });
          break;
        case "coo":
          [0, 0.16].forEach((d) => this.tone(420, t + d, 0.14, "sine", 0.08, 330, 0.03));
          break;
        case "squeak":
          this.tone(2200, t, 0.06, "sine", 0.07, 3000);
          this.tone(2600, t + 0.07, 0.05, "sine", 0.05, 3200);
          break;
        case "clang":
          this.tone(opts.soft ? 900 : 640, t, opts.soft ? 0.12 : 0.3, "square", opts.soft ? 0.03 : 0.07, 420);
          this.tone(1470, t, 0.18, "triangle", 0.04);
          break;
        case "dash":
          this.hiss(t, 0.2, 0.14, 2500, "bandpass");
          this.tone(500, t, 0.18, "sine", 0.08, 1400);
          break;
        case "doublejump":
          this.tone(n(7), t, 0.08, "square", 0.08, n(14));
          this.tone(n(14), t + 0.06, 0.12, "triangle", 0.08);
          break;
        case "cortado":
          this.hiss(t, 0.5, 0.12, 900, "bandpass");
          this.tone(300, t, 0.4, "sine", 0.1, 120);
          break;
        case "horn":
          [0, 0.32].forEach((d) => {
            this.tone(330, t + d, 0.26, "sawtooth", 0.08);
            this.tone(415, t + d, 0.26, "sawtooth", 0.06);
          });
          break;
        case "pop":
          this.tone(opts.soft ? 600 : 400, t, 0.12, "triangle", 0.06, 1200);
          this.hiss(t + 0.05, 0.4, 0.05, 3000);
          break;
        // ---- V10 · Nivel 4: paraguas, cielo y tormenta ----
        case "umbopen":
          this.hiss(t, 0.16, 0.12, 1800, "bandpass");
          this.tone(260, t, 0.16, "triangle", 0.1, 520);
          this.tone(n(7), t + 0.08, 0.12, "sine", 0.05);
          break;
        case "umbclose":
          this.hiss(t, 0.1, 0.06, 2600, "bandpass");
          this.tone(520, t, 0.1, "triangle", 0.05, 260);
          break;
        case "caw":
          [0, 0.13].forEach((d) => this.tone(980, t + d, 0.12, "sawtooth", 0.05, 640, 0.01));
          break;
        case "zap":
          this.tone(1800, t, 0.12, "square", 0.04, 400);
          this.hiss(t, 0.1, 0.05, 5000);
          break;
        case "crack":
          this.hiss(t, 0.5, 0.42, 2500);
          this.hiss(t + 0.03, 1.4, 0.3, 200, "lowpass");
          this.tone(70, t, 0.9, "sawtooth", 0.18, 30);
          break;
        case "strikewarn":
          this.tone(1200, t, 0.5, "sine", 0.03, 2400, 0.2);
          this.hiss(t, 0.6, 0.03, 6000);
          break;
        case "hail":
          for (let i = 0; i < 6; i++) this.tone(1600 + i * 120, t + i * 0.05, 0.03, "square", 0.025);
          break;
        case "puff":
          this.hiss(t, 0.4, 0.12, 900, "lowpass");
          break;
        case "crumble":
          this.hiss(t, 0.35, 0.18, 700, "lowpass");
          this.tone(150, t, 0.25, "sawtooth", 0.06, 70);
          break;
        case "rope":
          this.tone(330, t, 0.3, "triangle", 0.08, 880);
          this.hiss(t, 0.3, 0.06, 1600, "bandpass");
          break;
        case "updraft":
          this.hiss(t, 1.2, 0.08, 700, "bandpass");
          this.tone(300, t, 1.2, "sine", 0.04, 700, 0.4);
          break;
        case "beamcharge":
          this.tone(180, t, 1.2, "sawtooth", 0.05, 1600, 0.3);
          this.tone(182, t, 1.2, "triangle", 0.04, 1630, 0.3);
          break;
        case "beamfire":
          this.tone(1600, t, 0.9, "sawtooth", 0.09, 300);
          this.hiss(t, 0.9, 0.22, 1800, "bandpass");
          this.tone(60, t, 0.6, "sine", 0.3, 35);
          break;
        case "block":
          this.tone(900, t, 0.05, "triangle", 0.05, 1400);
          break;
        case "propeller":
          for (let i = 0; i < 8; i++) this.hiss(t + i * 0.06, 0.04, 0.05, 300, "lowpass");
          break;
        case "victory":
          [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(n(s), t + i * 0.12, 0.35, "triangle", 0.2));
          break;
      }
    }
    // Arpegio rápido mientras dura la leche UHT.
    update(uht, volume, sound) {
      const c = this.c,
        t = c.currentTime;
      if (!uht || !sound) {
        this.uhtNext = t;
        return;
      }
      if (t < this.uhtNext) return;
      this.out.gain.value = (volume / 100) * 0.55;
      const seq = [0, 4, 7, 12, 16, 12, 7, 4];
      const s = seq[this.uhtStep++ % seq.length];
      this.tone(523.25 * Math.pow(2, (s + 7) / 12), t, 0.09, "square", 0.05);
      this.uhtNext = t + 0.1;
    }
  }
  root.MilkSfx = MilkSfx;
})(window);
