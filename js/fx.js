/* V4: efectos visuales. Partículas, textos flotantes, destellos, hit-stop, cámara lenta,
   transiciones circulares, clima por zona, oscuridad con luz propia y primer plano. */
(function (root) {
  "use strict";
  const W = 1280,
    H = 720,
    FLOOR = 520,
    TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  class MilkFX {
    constructor() {
      this.parts = [];
      this.flash = { a: 0, color: "#fff" };
      this.hurtPulse = 0;
      this.hitstop = 0;
      this.slow = 0;
      this.iris = { r: 2000, target: 2000, x: W / 2, y: H / 2 };
      this.kick = 0;
      this.zoomPunch = 0;
      this.trail = [];
      this.weatherSeed = Array.from({ length: 70 }, (_, i) => ({ x: Math.random() * 1500, y: Math.random() * 720, s: Math.random(), i }));
    }
    reset() {
      this.parts = [];
      this.flash.a = 0;
      this.hurtPulse = 0;
      this.hitstop = 0;
      this.slow = 0;
      this.trail = [];
    }
    get timeScale() {
      return this.slow > 0 ? 0.35 : 1;
    }
    add(p) {
      if (this.parts.length < 600) this.parts.push(p);
    }
    burst(x, y, n, color, speed = 200, kind = "dot", extra = {}) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU,
          v = rnd(0.3, 1) * speed;
        this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, life: rnd(0.35, 0.7), max: 0.7, size: rnd(2, 5), color, kind, grav: 600, rot: Math.random() * 6, spin: rnd(-10, 10), ...extra });
      }
    }
    text(x, y, text, color = "#fff", size = 18) {
      this.add({ x, y, vx: 0, vy: -70, life: 1.1, max: 1.1, kind: "text", text, color, size, grav: 40 });
    }
    ring(x, y, color = "#fff", max = 60, w = 3) {
      this.add({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, kind: "ring", color, size: max, lw: w, grav: 0 });
    }
    confetti(x, y, n = 50) {
      const colors = ["#ffd23f", "#59c69b", "#2a74c9", "#ff6b6b", "#ffffff", "#c58bff"];
      for (let i = 0; i < n; i++)
        this.add({ x: x + rnd(-20, 20), y, vx: rnd(-260, 260), vy: rnd(-620, -300), life: rnd(1.2, 2), max: 2, kind: "confetti", color: colors[i % colors.length], size: rnd(4, 7), grav: 700, rot: Math.random() * 6, spin: rnd(-12, 12), drag: 1.6 });
    }
    // Reacción visual a cada evento del juego.
    event(e, opts) {
      const fxOn = opts.effects,
        impact = opts.impact;
      switch (e.type) {
        case "drop":
          this.burst(e.x, e.y, 6, "#ffffff", 120, "star");
          this.ring(e.x, e.y, "#cfe6ff", 22, 2);
          break;
        case "points":
          this.text(e.x, e.y, e.label ? e.label + "  +" + e.value : "+" + e.value, e.label ? "#ffd23f" : "#ffffff", e.label ? 20 : 16);
          break;
        case "cap":
          this.confetti(e.x, e.y, 40);
          this.flash = { a: 0.35, color: "#ffe9a0" };
          this.ring(e.x, e.y, "#ffd23f", 90, 4);
          if (impact) this.hitstop = 0.12;
          break;
        case "stomp":
          this.burst(e.x, e.y, 14, "#ffffff", 220, "dot");
          this.ring(e.x, e.y, "#ffffff", 50, 4);
          if (impact) this.hitstop = 0.06 + Math.min(4, e.combo) * 0.01;
          this.kick = 0.08;
          break;
        case "enemydeath":
          this.burst(e.x, e.y, 18, e.enemyType === "limon" ? "#f7dc2d" : e.enemyType === "bacteria" ? "#8ad65a" : "#ffe1b0", 260, "dot");
          this.burst(e.x, e.y, 6, "#ffffff", 180, "star");
          if (impact) this.hitstop = Math.max(this.hitstop, 0.05);
          break;
        case "enemyhit":
          this.burst(e.x, e.y, 5, "#ffffff", 140, "star");
          break;
        case "bump":
        case "bumpused":
          this.burst(e.x, e.y, 4, "#ffe7b0", 90, "dot");
          break;
        case "break":
          this.burst(e.x, e.y, 10, "#d9a96a", 220, "dot");
          this.kick = 0.06;
          break;
        case "popdrop":
          this.add({ x: e.x, y: e.y - 10, vx: 0, vy: -520, life: 0.45, max: 0.45, kind: "popdrop", grav: 1800, size: 1 });
          break;
        case "popitem":
          this.burst(e.x, e.y, 12, "#fff6c8", 160, "star");
          break;
        case "secret":
          this.burst(e.x, e.y, 20, "#ffd23f", 200, "star");
          this.text(e.x, e.y - 20, "¡SECRETO!", "#ffd23f", 20);
          break;
        case "power":
          this.flash = { a: 0.45, color: e.kind === "cacao" ? "#e0b38a" : e.kind === "frutilla" ? "#ffb3c1" : e.kind === "uht" ? "#ffffff" : "#bfe6ff" };
          this.confetti(e.x, e.y, 24);
          this.zoomPunch = 0.06;
          this.text(e.x, e.y - 60, { cacao: "¡CHOCOLATADA!", frutilla: "¡FRUTILLA!", shield: "¡TAPA ESCUDO!", uht: "¡LECHE UHT!" }[e.kind], "#ffffff", 26);
          break;
        case "powerend":
          this.burst(e.x, e.y, 10, "#c9d6e0", 120, "dot");
          break;
        case "shieldbreak":
          this.burst(e.x, e.y, 26, "#7cc4ff", 300, "shard");
          this.flash = { a: 0.3, color: "#bfe6ff" };
          this.text(e.x, e.y - 40, "¡ESCUDO ROTO!", "#7cc4ff", 18);
          break;
        case "hurt":
          this.hurtPulse = 1;
          this.burst(e.x, e.y, 10, "#e8f6ff", 220, "shard");
          if (impact) this.hitstop = 0.07;
          break;
        case "spring":
          this.ring(e.x, e.y, "#ffffff", 50, 3);
          this.burst(e.x, e.y, 8, "#ffffff", 150, "dot");
          break;
        case "slam":
          this.burst(e.x, e.y - 4, 16, "#c8d4dc", 260, "dot", { grav: 900 });
          this.kick = 0.12;
          break;
        case "cratebreak":
          this.burst(e.x, e.y - 20, 14, "#c2884c", 260, "dot");
          this.kick = 0.08;
          break;
        case "icebreak":
          this.burst(e.x, e.y - 10, 18, "#e4f8ff", 280, "shard");
          break;
        case "splash":
          this.burst(e.x, e.y, 6, e.color || "#fff", 120, "dot");
          break;
        case "checkpoint":
          this.confetti(e.x, e.y - 130, 70);
          this.flash = { a: 0.25, color: "#c8ffe0" };
          break;
        case "crumble":
          this.burst(e.x, e.y, 8, "#ffffff", 80, "dot");
          break;
        case "death":
          this.slow = 0.9;
          this.flash = { a: 0.6, color: "#ffffff" };
          this.burst(e.x, e.y, 30, "#ffffff", 320, "shard");
          break;
        case "victory":
          this.confetti(e.x, e.y - 200, 140);
          this.flash = { a: 0.5, color: "#ffffff" };
          break;
      }
    }
    update(dt) {
      this.hitstop = Math.max(0, this.hitstop - dt);
      this.slow = Math.max(0, this.slow - dt);
      this.flash.a = Math.max(0, this.flash.a - dt * 1.6);
      this.hurtPulse = Math.max(0, this.hurtPulse - dt * 1.8);
      this.kick = Math.max(0, this.kick - dt);
      this.zoomPunch = Math.max(0, this.zoomPunch - dt * 0.25);
      this.iris.r += (this.iris.target - this.iris.r) * Math.min(1, dt * (this.iris.target > this.iris.r ? 3.5 : 7));
      for (const p of this.parts) {
        p.life -= dt;
        if (p.drag) {
          p.vx *= 1 - p.drag * dt;
          p.vy *= 1 - p.drag * dt * 0.4;
        }
        p.vy += (p.grav || 0) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.spin) p.rot += p.spin * dt;
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const a of this.trail) a.life -= dt;
      this.trail = this.trail.filter((a) => a.life > 0);
    }
    drawWorld(g, cx, cy) {
      g.save();
      for (const p of this.parts) {
        const k = Math.max(0, p.life / p.max),
          x = p.x - cx,
          y = p.y - cy;
        if (x < -100 || x > W + 100) continue;
        g.globalAlpha = Math.min(1, k * 1.6);
        if (p.kind === "text") {
          g.font = `900 ${p.size}px Arial`;
          g.textAlign = "center";
          g.lineWidth = 4;
          g.strokeStyle = "#14263a";
          g.strokeText(p.text, x, y);
          g.fillStyle = p.color;
          g.fillText(p.text, x, y);
        } else if (p.kind === "ring") {
          g.strokeStyle = p.color;
          g.lineWidth = p.lw * k;
          g.beginPath();
          g.ellipse(x, y, p.size * (1 - k) + 4, (p.size * (1 - k) + 4) * 0.45, 0, 0, TAU);
          g.stroke();
        } else if (p.kind === "star") {
          g.fillStyle = p.color;
          g.save();
          g.translate(x, y);
          g.rotate(p.rot);
          g.beginPath();
          for (let i = 0; i < 8; i++) {
            const r = i % 2 ? p.size * 0.35 : p.size * 1.3;
            g.lineTo(Math.cos((i * Math.PI) / 4) * r, Math.sin((i * Math.PI) / 4) * r);
          }
          g.fill();
          g.restore();
        } else if (p.kind === "confetti" || p.kind === "shard") {
          g.fillStyle = p.color;
          g.save();
          g.translate(x, y);
          g.rotate(p.rot);
          g.scale(1, Math.abs(Math.sin(p.rot * 1.3)) + 0.2);
          if (p.kind === "shard") {
            g.beginPath();
            g.moveTo(-p.size, 0);
            g.lineTo(0, -p.size * 0.6);
            g.lineTo(p.size, p.size * 0.4);
            g.fill();
          } else g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          g.restore();
        } else if (p.kind === "popdrop") {
          if (root.MilkDesigns) root.MilkDesigns.draw(g, "gota", p.life * 10, x, y + 14);
        } else {
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(x, y, p.size * (0.4 + k * 0.6), 0, TAU);
          g.fill();
        }
      }
      g.restore();
    }
    /* Clima por zona: burbujas de fábrica, mariposas y pájaros en el campo, polen dorado al atardecer,
       luciérnagas en el huerto y nieve en el bosque helado y la cámara refrigerada. */
    weather(g, zone, cx, cy, t, front) {
      g.save();
      const S = this.weatherSeed;
      if (!front) {
        if (zone >= 4 && zone <= 6) {
          // Pájaros lejanos
          g.strokeStyle = zone === 6 ? "rgba(60,35,40,.55)" : "rgba(30,50,70,.45)";
          g.lineWidth = 2;
          for (let i = 0; i < 5; i++) {
            const x = ((((t * (30 + i * 6) + i * 300 - cx * 0.15) % 1600) + 1600) % 1600) - 160,
              y = 70 + i * 26 + Math.sin(t + i) * 10,
              f = Math.sin(t * 8 + i) * 5;
            g.beginPath();
            g.moveTo(x - 8, y - f);
            g.quadraticCurveTo(x - 3, y - 4, x, y);
            g.quadraticCurveTo(x + 3, y - 4, x + 8, y - f);
            g.stroke();
          }
        }
      } else {
        if (zone <= 3) {
          for (let i = 0; i < 14; i++) {
            const s = S[i],
              k = (t * (0.05 + s.s * 0.05) + s.s) % 1,
              x = ((((s.x - cx * 0.9) % 1400) + 1400) % 1400) - 60 + Math.sin(t * 2 + i) * 10,
              y = FLOOR - cy - k * 420;
            g.strokeStyle = `rgba(255,255,255,${0.5 * Math.sin(k * Math.PI)})`;
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(x, y, 3 + s.s * 4, 0, TAU);
            g.stroke();
            g.fillStyle = `rgba(255,255,255,${0.6 * Math.sin(k * Math.PI)})`;
            g.fillRect(x - 1.5, y - 2.5, 1.5, 1.5);
          }
        } else if (zone <= 5) {
          for (let i = 0; i < 6; i++) {
            const s = S[i],
              x = ((((s.x + t * 40 - cx * 1.05) % 1450) + 1450) % 1450) - 80,
              y = 260 + ((s.y * 0.4) % 200) + Math.sin(t * 1.7 + i * 2) * 40 - cy,
              f = Math.abs(Math.sin(t * 14 + i));
            g.fillStyle = ["#ffd23f", "#ffffff", "#ff9fb2", "#9fd3ff"][i % 4];
            g.save();
            g.translate(x, y);
            g.scale(f * 0.9 + 0.1, 1);
            g.beginPath();
            g.ellipse(-4, -2, 5, 4, -0.5, 0, TAU);
            g.ellipse(4, -2, 5, 4, 0.5, 0, TAU);
            g.fill();
            g.restore();
          }
        } else if (zone === 6) {
          for (let i = 0; i < 40; i++) {
            const s = S[i],
              x = ((((s.x + t * 18 * (0.5 + s.s) - cx * (0.7 + s.s * 0.4)) % 1450) + 1450) % 1450) - 80,
              y = ((s.y + Math.sin(t * 0.8 + i) * 30) % 560) - cy * 0.5;
            g.fillStyle = `rgba(255,214,120,${0.35 + s.s * 0.4})`;
            g.beginPath();
            g.arc(x, y, 1 + s.s * 1.8, 0, TAU);
            g.fill();
          }
        } else if (zone === 7) {
          for (let i = 0; i < 26; i++) {
            const s = S[i],
              x = ((((s.x + Math.sin(t * 0.4 + i) * 60 - cx * (0.8 + s.s * 0.3)) % 1450) + 1450) % 1450) - 80,
              y = 200 + ((s.y * 0.45) % 320) + Math.cos(t * 0.6 + i * 1.7) * 30 - cy,
              glow = 0.5 + Math.sin(t * 3 + i * 2.3) * 0.5;
            const r = g.createRadialGradient(x, y, 0, x, y, 12);
            r.addColorStop(0, `rgba(230,255,120,${0.9 * glow})`);
            r.addColorStop(1, "rgba(230,255,120,0)");
            g.fillStyle = r;
            g.fillRect(x - 12, y - 12, 24, 24);
          }
        } else {
          for (let i = 0; i < 70; i++) {
            const s = S[i],
              depth = 0.5 + s.s,
              x = ((((s.x + Math.sin(t * 0.7 + i) * 25 - cx * depth + t * 15) % 1450) + 1450) % 1450) - 80,
              y = (((s.y + t * (30 + s.s * 50)) % 760) + 760) % 760 - 20;
            g.fillStyle = `rgba(255,255,255,${0.45 + s.s * 0.45})`;
            g.beginPath();
            g.arc(x, y, 0.8 + s.s * 2.2, 0, TAU);
            g.fill();
          }
        }
      }
      g.restore();
    }
    /* Penumbra: el huerto y el bosque se oscurecen y la botella ilumina su alrededor. */
    darkness(g, zone, px, py, t, amount) {
      const strength = zone === 7 ? 0.42 : zone === 8 ? 0.32 : zone === 9 ? 0.38 : 0;
      if (!strength) return;
      const a = strength * amount;
      const r = g.createRadialGradient(px, py - 70, 40, px, py - 70, 520);
      r.addColorStop(0, "rgba(4,10,24,0)");
      r.addColorStop(0.45, `rgba(4,10,24,${a * 0.5})`);
      r.addColorStop(1, `rgba(4,10,24,${a})`);
      g.fillStyle = r;
      g.fillRect(0, 0, W, H);
      g.save();
      g.globalCompositeOperation = "screen";
      const glow = g.createRadialGradient(px, py - 70, 0, px, py - 70, 160);
      glow.addColorStop(0, `rgba(255,248,225,${0.12 + Math.sin(t * 2) * 0.02})`);
      glow.addColorStop(1, "rgba(255,248,225,0)");
      g.fillStyle = glow;
      g.fillRect(px - 160, py - 230, 320, 320);
      g.restore();
    }
    /* Primer plano: siluetas oscuras abajo de todo que corren más rápido que la cámara. */
    foreground(g, zone, cx, t) {
      g.save();
      g.fillStyle = "rgba(4,16,26,.82)";
      const ratio = 1.35;
      for (let i = 0; i < 9; i++) {
        const x = ((((i * 410 + 120 - cx * ratio) % 3690) + 3690) % 3690) - 300;
        if (x < -300 || x > W + 300) continue;
        const kind = zone <= 3 ? "pipe" : zone <= 6 ? "fence" : zone <= 9 ? "fern" : "ice";
        const y = H;
        g.beginPath();
        if (kind === "pipe") {
          g.rect(x, y - 54, 160, 24);
          g.rect(x + 150, y - 70, 18, 56);
          g.rect(x - 10, y - 58, 14, 32);
          g.arc(x + 70, y - 66, 13, 0, TAU);
          g.rect(x + 67, y - 70, 6, 20);
          g.rect(x + 20, y - 30, 20, 30);
        } else if (kind === "fence") {
          for (let k = 0; k < 4; k++) {
            g.rect(x + k * 46, y - 74 - (k % 2) * 6, 12, 74);
          }
          g.rect(x - 6, y - 58, 160, 9);
          g.rect(x - 6, y - 32, 160, 9);
          for (let k = 0; k < 9; k++) {
            g.moveTo(x + k * 20, y);
            g.lineTo(x + k * 20 + 6 + Math.sin(t * 1.4 + k) * 3, y - 30 - (k % 3) * 8);
            g.lineTo(x + k * 20 + 10, y);
          }
        } else if (kind === "fern") {
          for (let k = 0; k < 6; k++) {
            const sway = Math.sin(t * 1.1 + k + i) * 6;
            g.moveTo(x + k * 18, y);
            g.quadraticCurveTo(x + k * 18 - 20 + sway, y - 60, x + k * 18 - 40 + sway, y - 95 + k * 6);
            g.quadraticCurveTo(x + k * 18 - 10 + sway, y - 50, x + k * 18 + 8, y);
          }
          g.rect(x + 120, y - 130, 26, 130);
        } else {
          for (let k = 0; k < 5; k++) {
            g.moveTo(x + k * 30, y);
            g.lineTo(x + k * 30 + 12, y - 40 - (k % 3) * 22);
            g.lineTo(x + k * 30 + 24, y);
          }
        }
        g.fill();
      }
      g.restore();
    }
    // Capa de pantalla: destellos, viñeta de daño, calor, poca energía y transición circular.
    screen(g, s) {
      if (this.flash.a > 0) {
        g.globalAlpha = this.flash.a;
        g.fillStyle = this.flash.color;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = 1;
      }
      const edge = (color, a, inner = 0.55) => {
        if (a <= 0.01) return;
        const r = g.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, W * 0.75);
        r.addColorStop(0, "rgba(0,0,0,0)");
        r.addColorStop(1, color.replace("A", a.toFixed(3)));
        g.fillStyle = r;
        g.fillRect(0, 0, W, H);
      };
      edge("rgba(220,30,40,A)", this.hurtPulse * 0.55);
      if (s.temp > 70) edge("rgba(255,140,30,A)", ((s.temp - 70) / 30) * (0.35 + Math.sin(s.t * 6) * 0.08), 0.5);
      if (s.cold) edge("rgba(190,235,255,A)", 0.28, 0.6);
      if (s.hp <= 20 && s.hp > 0 && !s.dead) edge("rgba(200,20,30,A)", 0.22 + Math.max(0, Math.sin(s.t * 7)) * 0.2);
      if (s.uht) edge(`hsla(${(s.t * 300) % 360},90%,60%,A)`, 0.3, 0.5);
      if (this.iris.r < 1500) {
        g.save();
        g.fillStyle = "#06121c";
        g.beginPath();
        g.rect(0, 0, W, H);
        g.arc(this.iris.x, this.iris.y, Math.max(0, this.iris.r), 0, TAU, true);
        g.fill("evenodd");
        g.restore();
      }
    }
    irisTo(x, y, r) {
      this.iris.x = x;
      this.iris.y = y;
      this.iris.target = r;
    }
  }
  root.MilkFX = MilkFX;
})(window);
