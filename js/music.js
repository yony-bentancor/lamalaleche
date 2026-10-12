/* V7 Premium: música generada en el momento, sin archivos. Un tema por situación:
   nivel 1 (pastoral), nivel 2 (bossa de supermercado), apagón (filtrado y tenso), jefe (rápido) y victoria.
   Usa el volumen general y el interruptor «Música de fondo» de Ajustes. */
(function (root) {
  "use strict";
  const N = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // Acordes como notas MIDI: [bajo, ...voces]
  const THEMES = {
    level1: {
      bpm: 92,
      swing: 0,
      chords: [
        [43, 59, 62, 67],
        [40, 59, 64, 67],
        [36, 60, 64, 67],
        [38, 57, 62, 66],
      ],
      melody: [
        71,
        null,
        74,
        null,
        72,
        71,
        67,
        null,
        69,
        null,
        71,
        72,
        74,
        null,
        null,
        null,
        76,
        null,
        74,
        72,
        71,
        null,
        69,
        null,
        67,
        null,
        69,
        71,
        67,
        null,
        null,
        null,
      ],
      comp: "arp",
      drums: "soft",
      lead: "triangle",
      bright: 2600,
    },
    level2: {
      bpm: 104,
      swing: 0.12,
      chords: [
        [41, 57, 60, 64, 69],
        [38, 57, 60, 65, 69],
        [43, 58, 62, 65, 70],
        [36, 58, 62, 64, 67],
      ],
      melody: [
        76,
        null,
        77,
        76,
        74,
        null,
        72,
        null,
        null,
        69,
        72,
        null,
        74,
        null,
        null,
        null,
        77,
        null,
        79,
        77,
        76,
        null,
        74,
        72,
        null,
        null,
        70,
        null,
        72,
        null,
        null,
        null,
      ],
      comp: "bossa",
      drums: "bossa",
      lead: "sine",
      bright: 3200,
    },
    blackout: {
      bpm: 104,
      swing: 0,
      chords: [
        [38, 53, 57, 60],
        [38, 53, 56, 60],
        [34, 53, 58, 62],
        [37, 52, 56, 61],
      ],
      melody: [],
      comp: "pad",
      drums: "heart",
      lead: "sine",
      bright: 700,
    },
    boss: {
      bpm: 138,
      swing: 0,
      chords: [
        [38, 62, 65, 69],
        [34, 62, 65, 70],
        [36, 60, 64, 67],
        [33, 61, 64, 69],
      ],
      melody: [
        74,
        77,
        81,
        77,
        74,
        77,
        81,
        82,
        81,
        77,
        74,
        72,
        70,
        72,
        74,
        77,
        74,
        77,
        81,
        77,
        74,
        77,
        82,
        84,
        81,
        79,
        77,
        76,
        73,
        76,
        69,
        null,
      ],
      comp: "stab",
      drums: "drive",
      lead: "square",
      bright: 4200,
    },
    victory: {
      bpm: 120,
      swing: 0,
      chords: [
        [41, 60, 65, 69],
        [46, 62, 65, 70],
        [48, 60, 64, 67],
        [41, 60, 65, 69],
      ],
      melody: [72, 77, 81, 84, null, 81, 84, null, 86, null, 84, 81, 77, null, 81, null],
      comp: "arp",
      drums: "soft",
      lead: "triangle",
      bright: 3600,
    },
    // V10 · Nivel 4: cielo abierto (vals ligero), tormenta y el Capitán Cúmulo.
    level4: {
      bpm: 112,
      swing: 0,
      chords: [
        [41, 57, 60, 65, 69],
        [36, 55, 60, 64, 67],
        [38, 57, 62, 65, 69],
        [43, 55, 59, 62, 67],
      ],
      melody: [72, null, 77, 79, 81, null, 79, 77, 76, null, 72, null, 74, 76, 77, null, 81, null, 84, 83, 81, null, 77, 79, 76, null, 74, null, 72, null, null, null],
      comp: "arp",
      drums: "soft",
      lead: "triangle",
      bright: 3800,
    },
    storm4: {
      bpm: 96,
      swing: 0,
      chords: [
        [40, 55, 59, 62],
        [36, 55, 60, 64],
        [38, 54, 57, 62],
        [35, 54, 59, 63],
      ],
      melody: [64, null, null, 67, 66, null, 62, null, 64, null, null, null, 59, null, 62, null, 64, null, 67, null, 71, null, 69, 67, 66, null, null, null, 63, null, null, null],
      comp: "pad",
      drums: "heart",
      lead: "sine",
      bright: 1300,
    },
    boss4: {
      bpm: 150,
      swing: 0,
      chords: [
        [33, 57, 60, 64],
        [29, 57, 60, 65],
        [31, 55, 59, 62],
        [28, 56, 59, 64],
      ],
      melody: [81, null, 84, 81, 88, null, 86, 84, 81, null, 79, null, 76, null, 79, 80, 81, null, 84, 86, 88, null, 91, 89, 88, 86, 84, null, 83, null, 80, null],
      comp: "stab",
      drums: "drive",
      lead: "square",
      bright: 4300,
    },
    // V12 · Nivel 5: bajo el agua (pad lento y apagado), el abismo y el Tragabarcos.
    level5: {
      bpm: 84,
      swing: 0.08,
      chords: [
        [38, 57, 62, 65, 69],
        [34, 57, 62, 65, 70],
        [36, 55, 60, 64, 67],
        [33, 57, 61, 64, 69],
      ],
      melody: [74, null, null, 77, 76, null, 74, null, 69, null, null, null, 72, null, 74, null, 77, null, 79, null, 81, null, 79, 77, 76, null, null, 72, 74, null, null, null],
      comp: "pad",
      drums: "soft",
      lead: "sine",
      bright: 1500,
    },
    abyss5: {
      bpm: 70,
      swing: 0,
      chords: [
        [33, 52, 55, 60],
        [32, 52, 56, 59],
        [31, 50, 55, 58],
        [32, 51, 56, 59],
      ],
      melody: [64, null, null, null, 63, null, null, null, 60, null, null, null, null, null, null, null, 64, null, 67, null, 66, null, null, null, 63, null, null, null, null, null, null, null],
      comp: "pad",
      drums: "heart",
      lead: "sine",
      bright: 800,
    },
    boss5: {
      bpm: 138,
      swing: 0,
      chords: [
        [26, 50, 53, 57],
        [29, 53, 56, 60],
        [24, 48, 52, 55],
        [25, 49, 52, 56],
      ],
      melody: [74, null, 77, 74, 81, null, 80, 77, 74, null, 72, null, 69, null, 72, 73, 74, null, 77, 79, 81, null, 84, 82, 81, 79, 77, null, 76, null, 73, null],
      comp: "stab",
      drums: "drive",
      lead: "triangle",
      bright: 2600,
    },
    // V9 · Nivel 3: noche de ciudad (neo-soul con swing), persecución del gato y la Vaca Mecánica.
    level3: {
      bpm: 92,
      swing: 0.14,
      chords: [
        [38, 53, 57, 60, 64],
        [43, 53, 57, 59, 64],
        [36, 52, 55, 59, 62],
        [33, 55, 58, 61, 64],
      ],
      melody: [69, null, 72, null, 74, 72, 69, null, 67, null, 64, null, 62, null, null, null, 69, null, 72, 74, 76, null, 74, 72, 70, null, 69, null, 67, null, null, null],
      comp: "bossa",
      drums: "bossa",
      lead: "sine",
      bright: 2300,
    },
    chase3: {
      bpm: 156,
      swing: 0,
      chords: [
        [38, 62, 65, 69],
        [38, 62, 65, 70],
        [36, 60, 64, 67],
        [37, 61, 64, 69],
      ],
      melody: [74, 74, 77, null, 74, 72, 69, null, 74, 74, 77, null, 79, 77, 74, null, 81, null, 79, 77, 76, null, 73, null, 74, null, 69, null, 72, 73, 74, null],
      comp: "stab",
      drums: "drive",
      lead: "triangle",
      bright: 3600,
    },
    boss3: {
      bpm: 142,
      swing: 0,
      chords: [
        [40, 64, 67, 71],
        [36, 64, 67, 72],
        [38, 62, 66, 69],
        [35, 63, 66, 71],
      ],
      melody: [76, null, 79, 76, 83, null, 81, 79, 76, null, 74, null, 71, null, 74, 75, 76, null, 79, 81, 83, null, 86, 84, 83, 81, 79, null, 78, null, 75, null],
      comp: "stab",
      drums: "drive",
      lead: "square",
      bright: 3800,
    },
  };
  class MilkMusic {
    constructor(ctx) {
      this.c = ctx;
      this.out = ctx.createGain();
      this.out.gain.value = 0;
      this.filter = ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.frequency.value = 3000;
      this.dry = ctx.createGain();
      this.wet = ctx.createGain();
      this.wet.gain.value = 0.22;
      this.verb = ctx.createConvolver();
      this.verb.buffer = this.impulse(1.8);
      this.filter.connect(this.dry);
      this.filter.connect(this.verb);
      this.verb.connect(this.wet);
      this.dry.connect(this.out);
      this.wet.connect(this.out);
      this.out.connect(ctx.destination);
      const len = ctx.sampleRate * 0.5;
      this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.theme = "off";
      this.step = 0;
      this.next = 0;
      this.target = 0;
      this.level = -1;
    }
    impulse(sec) {
      const c = this.c,
        len = Math.floor(c.sampleRate * sec),
        b = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      return b;
    }
    /* name: level1 | level2 | blackout | boss | level3 | chase3 | boss3 | victory | pause | off */
    set(name, settings) {
      const c = this.c,
        t = c.currentTime;
      const on = settings && settings.sound && settings.ambient !== false && Number(settings.volume) > 0;
      const duck = name === "pause" ? 0.35 : 1;
      const target = name === "off" || !on ? 0 : (Number(settings.volume) / 100) * 0.2 * duck;
      if (Math.abs(target - this.level) > 0.001) {
        this.out.gain.setTargetAtTime(target, t, name === "off" ? 0.15 : 0.35);
        this.level = target;
      }
      if (name === "pause" || name === "off") {
        if (name === "off") this.theme = "off";
        return;
      }
      if (name !== this.theme) {
        const was = this.theme;
        this.theme = name;
        if (was === "off" || !THEMES[was]) {
          this.step = 0;
          this.next = t + 0.08;
        } else this.step = Math.ceil(this.step / 16) * 16;
        this.filter.frequency.setTargetAtTime(THEMES[name].bright, t, 0.6);
      }
      if (!on) {
        this.next = t + 0.1;
        return;
      }
      this.schedule();
    }
    schedule() {
      const c = this.c,
        th = THEMES[this.theme];
      if (!th) return;
      const sixteenth = 60 / th.bpm / 4;
      if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.05;
      while (this.next < c.currentTime + 0.18) {
        const s = this.step,
          swing = s % 2 ? th.swing * sixteenth : 0;
        this.play(th, s, this.next + swing, sixteenth);
        this.next += sixteenth;
        this.step++;
      }
    }
    voice(freq, t, dur, type, vol, attack = 0.01, detune = 0) {
      const c = this.c,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.filter);
      o.start(t);
      o.stop(t + dur + 0.05);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    hit(t, dur, vol, freq, type = "highpass") {
      const c = this.c,
        s = c.createBufferSource(),
        f = c.createBiquadFilter(),
        g = c.createGain();
      s.buffer = this.noise;
      f.type = type;
      f.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f);
      f.connect(g);
      g.connect(this.filter);
      s.start(t);
      s.stop(t + dur + 0.02);
      s.onended = () => {
        s.disconnect();
        f.disconnect();
        g.disconnect();
      };
    }
    kick(t, vol = 0.5) {
      const c = this.c,
        o = c.createOscillator(),
        g = c.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g);
      g.connect(this.out);
      o.start(t);
      o.stop(t + 0.25);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
    play(th, s, t, six) {
      const bar = Math.floor(s / 16),
        pos = s % 16,
        chord = th.chords[bar % th.chords.length],
        bass = chord[0],
        voices = chord.slice(1);
      // Bajo
      if (th.comp === "bossa") {
        if (pos === 0) this.voice(N(bass), t, six * 5, "triangle", 0.32);
        if (pos === 6) this.voice(N(bass + 7), t, six * 2, "triangle", 0.24);
        if (pos === 8) this.voice(N(bass + 7), t, six * 5, "triangle", 0.26);
        if (pos === 14) this.voice(N(bass), t, six * 2, "triangle", 0.22);
      } else if (th.comp === "stab") {
        if (pos % 2 === 0) this.voice(N(bass + (pos % 8 === 6 ? 12 : 0)), t, six * 1.6, "sawtooth", 0.13);
      } else if (th.comp === "pad") {
        if (pos === 0) this.voice(N(bass), t, six * 16, "sine", 0.3, 0.6);
      } else {
        if (pos === 0 || pos === 10) this.voice(N(bass), t, six * 6, "triangle", 0.28);
      }
      // Acompañamiento
      if (th.comp === "bossa") {
        // Rasgueo sincopado de piano eléctrico
        if ([0, 3, 6, 10, 13].includes(pos)) for (const v of voices) this.voice(N(v), t, six * 2.6, "sine", 0.05, 0.006, 4);
      } else if (th.comp === "arp") {
        const v = voices[[0, 1, 2, 1, 3, 2, 1, 2][pos % 8] % voices.length] + (pos >= 8 ? 12 : 0);
        this.voice(N(v), t, six * 3, "triangle", 0.06);
      } else if (th.comp === "stab") {
        if (pos === 0 || pos === 3 || pos === 6 || pos === 10) for (const v of voices) this.voice(N(v), t, six * 1.2, "square", 0.025);
      } else if (th.comp === "pad") {
        if (pos === 0) for (const v of voices) this.voice(N(v), t, six * 16, "sine", 0.04, 0.9, (Math.random() - 0.5) * 12);
      }
      // Melodía (cada dos compases, para que respire)
      const mel = th.melody;
      if (mel.length) {
        const cycle = mel.length,
          idx = (s / 2) % cycle;
        if (s % 2 === 0 && Number.isInteger(idx) && Math.floor(s / (cycle * 2)) % 2 === 0) {
          const m = mel[idx];
          if (m) this.voice(N(m), t, six * 3.2, th.lead, th.lead === "square" ? 0.035 : 0.07, 0.015, th.lead === "sine" ? 6 : 0);
        }
      }
      // Percusión
      if (th.drums === "bossa") {
        this.hit(t, 0.03, pos % 4 === 2 ? 0.07 : 0.035, 7000);
        if ([3, 6, 10, 12].includes(pos)) this.hit(t, 0.05, 0.08, 1800, "bandpass");
        if (pos === 0 || pos === 8) this.kick(t, 0.22);
      } else if (th.drums === "soft") {
        if (pos % 2 === 0) this.hit(t, 0.025, 0.03, 8000);
        if (pos === 0 || pos === 8) this.kick(t, 0.16);
      } else if (th.drums === "drive") {
        this.hit(t, 0.025, pos % 2 ? 0.03 : 0.05, 8000);
        if (pos % 4 === 0) this.kick(t, 0.36);
        if (pos === 4 || pos === 12) this.hit(t, 0.14, 0.16, 1500, "bandpass");
      } else if (th.drums === "heart") {
        if (pos === 0 || pos === 3) this.kick(t, 0.25);
      }
    }
  }
  root.MilkMusic = MilkMusic;
  root.MilkMusicThemes = THEMES;
})(typeof window !== "undefined" ? window : globalThis);
