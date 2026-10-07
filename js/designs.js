/* V4: diseños de enemigos y objetos nuevos.
   Cada diseño tiene un nombre de archivo. Si existe una imagen en assets/custom/<nombre>-0.png (y -1, -2...),
   el juego la usa en lugar del dibujo por defecto. Ver assets/custom/LEEME.md. */
(function (root) {
  "use strict";
  const INK = "#14263a";
  const TAU = Math.PI * 2;
  const outline = (g, w = 3) => {
    g.lineWidth = w;
    g.strokeStyle = INK;
    g.lineJoin = "round";
    g.lineCap = "round";
    g.stroke();
  };
  const shine = (g, x, y, rx, ry, a = 0.7) => {
    g.fillStyle = `rgba(255,255,255,${a})`;
    g.beginPath();
    g.ellipse(x, y, rx, ry, -0.5, 0, TAU);
    g.fill();
  };
  const eye = (g, x, y, r, look = 0, angry = 0, side = 1) => {
    g.fillStyle = "#fff";
    g.beginPath();
    g.ellipse(x, y, r, r * 1.15, 0, 0, TAU);
    g.fill();
    outline(g, 2);
    g.fillStyle = INK;
    g.beginPath();
    g.arc(x + look * r * 0.35, y + r * 0.1, r * 0.5, 0, TAU);
    g.fill();
    g.fillStyle = "#fff";
    g.beginPath();
    g.arc(x + look * r * 0.35 - r * 0.18, y - r * 0.12, r * 0.16, 0, TAU);
    g.fill();
    if (angry) {
      g.beginPath();
      g.moveTo(x - r * 1.1 * side, y - r * 1.25 - angry * side * 0);
      g.lineTo(x + r * 1.1 * side, y - r * 0.85);
      outline(g, 3);
    }
  };
  const roundRect = (g, x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  const D = {};
  /* ---------------- Enemigos ---------------- */
  D.bacteria = {
    name: "Bacteria",
    group: "Enemigos",
    size: [46, 40],
    fps: 8,
    hint: "Camina de lado a lado. Se aplasta saltándole encima.",
    draw(g, t, o) {
      const w = o.w,
        h = o.h,
        sq = o.squash ? 0.35 : 1 + Math.sin(t * 9) * 0.06;
      g.save();
      g.scale(1 / Math.sqrt(sq), sq);
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const a = (i / 24) * TAU,
          wob = 1 + Math.sin(a * 5 + t * 6) * 0.06;
        const x = Math.cos(a) * (w / 2) * wob,
          y = -h / 2 + Math.sin(a) * (h / 2) * wob;
        i ? g.lineTo(x, Math.min(0, y)) : g.moveTo(x, Math.min(0, y));
      }
      const body = g.createRadialGradient(-w * 0.15, -h * 0.65, 2, 0, -h / 2, w * 0.6);
      body.addColorStop(0, "#c9f27a");
      body.addColorStop(0.6, "#6fc24a");
      body.addColorStop(1, "#3b8a3a");
      g.fillStyle = body;
      g.fill();
      outline(g);
      g.fillStyle = "#2f6f2f88";
      for (const [x, y, r] of [
        [-12, -12, 4],
        [10, -8, 3],
        [4, -26, 2.5],
      ]) {
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
      g.strokeStyle = INK;
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + 0.35 + i * 0.6,
          x = Math.cos(a) * w * 0.5,
          y = -h / 2 + Math.sin(a) * h * 0.5;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x * 1.25 + Math.sin(t * 12 + i) * 2, y * 1.12 - 4);
        g.stroke();
      }
      if (!o.squash) {
        eye(g, 7, -h * 0.58, 6, 1);
        eye(g, -7, -h * 0.58, 5, 1);
        g.beginPath();
        g.moveTo(-2, -h * 0.82);
        g.lineTo(14, -h * 0.74);
        g.moveTo(-14, -h * 0.76);
        g.lineTo(-3, -h * 0.8);
        outline(g, 2.5);
        g.beginPath();
        g.arc(2, -h * 0.28, 5, 0.15 * Math.PI, 0.85 * Math.PI);
        outline(g, 2);
      } else {
        g.beginPath();
        g.moveTo(-10, -h * 0.5);
        g.lineTo(-4, -h * 0.4);
        g.moveTo(-10, -h * 0.4);
        g.lineTo(-4, -h * 0.5);
        g.moveTo(4, -h * 0.5);
        g.lineTo(10, -h * 0.4);
        g.moveTo(4, -h * 0.4);
        g.lineTo(10, -h * 0.5);
        outline(g, 2);
      }
      g.restore();
    },
  };
  D.limon = {
    name: "Limón",
    group: "Enemigos",
    size: [42, 42],
    fps: 10,
    hint: "Rueda hacia la botella cuando la ve. Corta la leche: resta 15.",
    draw(g, t, o) {
      const r = o.w / 2;
      g.save();
      g.translate(0, -r);
      if (o.squash) g.scale(1.4, 0.4);
      g.rotate(o.rot || 0);
      g.beginPath();
      g.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
      g.moveTo(r - 2, -4);
      const peel = g.createRadialGradient(-r * 0.3, -r * 0.35, 2, 0, 0, r * 1.1);
      peel.addColorStop(0, "#fff7a0");
      peel.addColorStop(0.5, "#f7dc2d");
      peel.addColorStop(1, "#d7a514");
      g.fillStyle = peel;
      g.fill();
      outline(g);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.ellipse(s * r * 0.98, 0, 6, 5, 0, 0, TAU);
        g.fillStyle = "#e9c21f";
        g.fill();
        outline(g, 2.5);
      }
      g.fillStyle = "#c9971366";
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.arc(Math.cos(i * 2.3) * r * 0.6, Math.sin(i * 1.7) * r * 0.5, 1.4, 0, TAU);
        g.fill();
      }
      shine(g, -r * 0.35, -r * 0.4, 6, 3);
      g.restore();
      if (!o.squash) {
        eye(g, -7, -r - 2, 5.5, 0.6);
        eye(g, 8, -r - 2, 5.5, 0.6);
        g.beginPath();
        g.moveTo(-14, -r - 13);
        g.lineTo(-2, -r - 8);
        g.moveTo(15, -r - 13);
        g.lineTo(3, -r - 8);
        outline(g, 3);
        g.beginPath();
        g.moveTo(-6, -r + 11);
        g.quadraticCurveTo(0, -r + 6, 6, -r + 11);
        outline(g, 2.5);
      }
    },
  };
  D.mosca = {
    name: "Mosca",
    group: "Enemigos",
    size: [38, 30],
    fps: 24,
    hint: "Vuela en ondas. Se elimina pisándola o con un disparo.",
    draw(g, t, o) {
      const flap = Math.sin(t * 60) * 0.6;
      g.save();
      g.translate(0, -o.h / 2);
      for (const s of [-1, 1]) {
        g.save();
        g.translate(s * 3, -8);
        g.rotate(s * (-0.5 + flap));
        g.beginPath();
        g.ellipse(s * 8, -8, 7, 13, s * 0.4, 0, TAU);
        g.fillStyle = "rgba(210,240,255,.55)";
        g.fill();
        g.lineWidth = 1.5;
        g.strokeStyle = "#5a7a90";
        g.stroke();
        g.restore();
      }
      g.beginPath();
      g.ellipse(-4, 2, 14, 10, 0, 0, TAU);
      const b = g.createLinearGradient(0, -8, 0, 12);
      b.addColorStop(0, "#4b5a6a");
      b.addColorStop(1, "#1d2733");
      g.fillStyle = b;
      g.fill();
      outline(g, 2.5);
      g.strokeStyle = "#7d8e9e";
      g.lineWidth = 2;
      for (const x of [-10, -4, 2]) {
        g.beginPath();
        g.moveTo(x, -6);
        g.lineTo(x, 10);
        g.stroke();
      }
      g.beginPath();
      g.arc(11, -1, 8, 0, TAU);
      g.fillStyle = "#2a3542";
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.arc(14, -3, 5, 0, TAU);
      g.fillStyle = "#e0413a";
      g.fill();
      outline(g, 1.5);
      shine(g, 13, -5, 2, 1.3, 0.9);
      g.strokeStyle = INK;
      g.lineWidth = 1.5;
      for (const x of [-8, -2, 4]) {
        g.beginPath();
        g.moveTo(x, 11);
        g.lineTo(x - 3, 17 + Math.sin(t * 10 + x) * 2);
        g.stroke();
      }
      g.restore();
    },
  };
  D.raton = {
    name: "Ratón",
    group: "Enemigos",
    size: [60, 34],
    fps: 14,
    hint: "Corre rápido de un lado al otro y se detiene a olfatear.",
    draw(g, t, o) {
      const run = o.state !== "sniff",
        bob = run ? Math.abs(Math.sin(t * 16)) * 3 : 0;
      g.save();
      g.translate(0, -bob);
      if (o.squash) g.scale(1.2, 0.45);
      g.beginPath();
      g.moveTo(-24, -10);
      g.bezierCurveTo(-40, -6, -44, -26, -34, -30 + Math.sin(t * 8) * 4);
      outline(g, 3);
      g.strokeStyle = "#d98c96";
      g.lineWidth = 1.5;
      g.stroke();
      g.beginPath();
      g.ellipse(-4, -15, 22, 14, 0, 0, TAU);
      const b = g.createLinearGradient(0, -30, 0, 0);
      b.addColorStop(0, "#a7b1bb");
      b.addColorStop(1, "#6a7580");
      g.fillStyle = b;
      g.fill();
      outline(g);
      g.beginPath();
      g.moveTo(10, -26);
      g.quadraticCurveTo(30, -22, 30, -9);
      g.quadraticCurveTo(18, -4, 8, -6);
      g.closePath();
      g.fillStyle = "#a7b1bb";
      g.fill();
      outline(g);
      g.beginPath();
      g.arc(10, -27, 8, 0, TAU);
      g.fillStyle = "#e8a7b0";
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.arc(31, -10, 3, 0, TAU);
      g.fillStyle = "#e05a6c";
      g.fill();
      if (!o.squash) eye(g, 19, -17, 3.5, 1);
      g.strokeStyle = "#e9eef2";
      g.lineWidth = 1;
      for (const k of [-1, 0, 1]) {
        g.beginPath();
        g.moveTo(28, -10);
        g.lineTo(40, -12 + k * 4);
        g.stroke();
      }
      g.strokeStyle = INK;
      g.lineWidth = 3;
      for (const [x, ph] of [
        [-14, 0],
        [6, Math.PI],
      ]) {
        const s = run ? Math.sin(t * 16 + ph) * 6 : 0;
        g.beginPath();
        g.moveTo(x, -4);
        g.lineTo(x + s, 2 + bob);
        g.stroke();
      }
      g.restore();
    },
  };
  D.robot = {
    name: "Robot de control de calidad",
    group: "Enemigos",
    size: [60, 135],
    fps: 6,
    hint: "Patrulla con un haz de escáner. Si te ve de pie, embiste. Agachate para pasar sin ser vista. Dos pisotones.",
    draw(g, t, o) {
      const alarm = o.state === "alarm",
        w = o.w,
        h = o.h;
      g.save();
      if (o.squash) g.scale(1.1, 0.5);
      for (const x of [-18, 18]) {
        g.beginPath();
        g.arc(x, -11, 11, 0, TAU);
        g.fillStyle = "#2a3644";
        g.fill();
        outline(g);
        g.save();
        g.translate(x, -11);
        g.rotate(t * (alarm ? 14 : 5) * (o.face || 1));
        g.fillStyle = "#8aa0b2";
        g.fillRect(-2, -8, 4, 16);
        g.restore();
      }
      roundRect(g, -w / 2, -h + 38, w, h - 58, 10);
      const b = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      b.addColorStop(0, "#d4e1e8");
      b.addColorStop(0.5, "#f4f8fa");
      b.addColorStop(1, "#9fb3c0");
      g.fillStyle = b;
      g.fill();
      outline(g);
      g.fillStyle = "#2a74c9";
      g.fillRect(-w / 2 + 2, -h + 78, w - 4, 10);
      g.fillStyle = INK;
      g.font = "bold 11px Arial";
      g.textAlign = "center";
      g.fillText("QC", 0, -32);
      roundRect(g, -w / 2 + 6, -h + 2, w - 12, 42, 9);
      g.fillStyle = "#c0d0da";
      g.fill();
      outline(g);
      roundRect(g, -w / 2 + 11, -h + 8, w - 22, 28, 6);
      g.fillStyle = alarm ? "#3b0b0b" : "#0b2433";
      g.fill();
      outline(g, 2);
      const look = 8;
      g.fillStyle = alarm ? (Math.sin(t * 30) > 0 ? "#ff3b30" : "#ff8b6b") : "#5ff0ff";
      g.shadowColor = g.fillStyle;
      g.shadowBlur = 10;
      g.beginPath();
      g.ellipse(look, -h + 22, alarm ? 9 : 7, alarm ? 5 : 7, 0, 0, TAU);
      g.fill();
      g.shadowBlur = 0;
      g.beginPath();
      g.moveTo(0, -h + 2);
      g.lineTo(0, -h - 12);
      outline(g, 3);
      g.beginPath();
      g.arc(0, -h - 15, 5, 0, TAU);
      g.fillStyle = alarm ? (Math.sin(t * 24) > 0 ? "#ff3b30" : "#5a1010") : "#ffd23f";
      g.fill();
      outline(g, 2);
      g.beginPath();
      g.moveTo(-w / 2, -h + 60);
      g.lineTo(-w / 2 - 12, -h + 82 + Math.sin(t * 4) * 4);
      g.moveTo(w / 2, -h + 60);
      g.lineTo(w / 2 + 12, -h + 82 - Math.sin(t * 4) * 4);
      outline(g, 4);
      g.restore();
    },
  };
  /* ---------------- Coleccionables ---------------- */
  D.gota = {
    name: "Gota de leche",
    group: "Coleccionables",
    size: [22, 28],
    fps: 10,
    hint: "Suma 10 puntos. Cada 50 gotas devuelven 25% de energía.",
    draw(g, t, o) {
      const turn = Math.cos(t * 3.2),
        sx = Math.max(0.18, Math.abs(turn));
      g.save();
      g.translate(0, -o.h / 2 + Math.sin(t * 2.4) * 2);
      g.scale(sx, 1);
      g.beginPath();
      g.moveTo(0, -13);
      g.bezierCurveTo(4, -6, 10, -1, 10, 5);
      g.arc(0, 5, 10, 0, Math.PI);
      g.bezierCurveTo(-10, -1, -4, -6, 0, -13);
      const f = g.createRadialGradient(-3, 2, 1, 0, 4, 12);
      f.addColorStop(0, "#ffffff");
      f.addColorStop(0.7, turn > 0 ? "#f3f7ff" : "#dde8f7");
      f.addColorStop(1, "#bcd3ee");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      shine(g, -3.5, 3, 2.5, 4, 0.95);
      g.restore();
    },
  };
  D.tapita = {
    name: "Tapita dorada",
    group: "Coleccionables",
    size: [36, 36],
    fps: 10,
    hint: "Son 8, algunas escondidas. Suman 2000 y quedan registradas en el menú.",
    draw(g, t, o) {
      const r = o.w / 2,
        sx = Math.max(0.25, Math.abs(Math.cos(t * 2)));
      g.save();
      g.translate(0, -r + Math.sin(t * 2.2) * 3);
      g.shadowColor = "#ffd76a";
      g.shadowBlur = 16;
      g.scale(sx, 1);
      g.beginPath();
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * TAU,
          rr = i % 2 ? r : r - 3;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      const f = g.createLinearGradient(-r, -r, r, r);
      f.addColorStop(0, "#fff2a8");
      f.addColorStop(0.45, "#f3c03a");
      f.addColorStop(1, "#b77d16");
      g.fillStyle = f;
      g.fill();
      g.shadowBlur = 0;
      outline(g, 2.5);
      g.beginPath();
      g.arc(0, 0, r * 0.62, 0, TAU);
      g.strokeStyle = "#a76d12";
      g.lineWidth = 2;
      g.stroke();
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU,
          rr = i % 2 ? r * 0.22 : r * 0.48;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
      g.fillStyle = "#fff6c8";
      g.fill();
      g.strokeStyle = "#a76d12";
      g.stroke();
      const sweep = ((t * 0.9) % 2) - 1;
      g.save();
      g.clip();
      g.restore();
      shine(g, -r * 0.4 + sweep * 4, -r * 0.45, 5, 2.5, 0.9);
      g.restore();
    },
  };
  /* ---------------- Cajas ---------------- */
  D.caja_sorpresa = {
    name: "Caja sorpresa",
    group: "Cajas",
    size: [44, 44],
    fps: 6,
    hint: "Se golpea desde abajo. Puede tener gotas o un power-up.",
    draw(g, t, o) {
      const s = o.w;
      roundRect(g, -s / 2, -s, s, s, 6);
      const f = g.createLinearGradient(0, -s, 0, 0);
      f.addColorStop(0, "#ffe07a");
      f.addColorStop(0.5, "#f5b33a");
      f.addColorStop(1, "#d98318");
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      g.fillStyle = "#fff3c4";
      g.fillRect(-s / 2 + 4, -s + 4, s - 8, 4);
      g.fillStyle = "#9b5a10";
      for (const [x, y] of [
        [-15, -37],
        [15, -37],
        [-15, -7],
        [15, -7],
      ]) {
        g.beginPath();
        g.arc(x, y, 2.3, 0, TAU);
        g.fill();
      }
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      g.font = "900 28px Arial";
      g.textAlign = "center";
      g.lineWidth = 5;
      g.strokeStyle = INK;
      g.strokeText("?", 0, -11);
      g.fillStyle = `rgb(255,${250 - pulse * 30},${235 - pulse * 60})`;
      g.fillText("?", 0, -11);
      g.globalAlpha = 0.35 * pulse;
      g.fillStyle = "#fff";
      g.fillRect(-s / 2 + 3, -s + 3, s - 6, s - 6);
      g.globalAlpha = 1;
    },
  };
  D.caja_usada = {
    name: "Caja vacía",
    group: "Cajas",
    size: [44, 44],
    fps: 1,
    hint: "Así queda una caja sorpresa después de usarla.",
    draw(g, t, o) {
      const s = o.w;
      roundRect(g, -s / 2, -s, s, s, 6);
      g.fillStyle = "#8a6a4c";
      g.fill();
      outline(g, 3);
      g.fillStyle = "#6c5038";
      for (const [x, y] of [
        [-15, -37],
        [15, -37],
        [-15, -7],
        [15, -7],
      ]) {
        g.beginPath();
        g.arc(x, y, 2.3, 0, TAU);
        g.fill();
      }
      g.fillStyle = "#a88766";
      g.fillRect(-s / 2 + 4, -s + 4, s - 8, 3);
    },
  };
  D.ladrillo = {
    name: "Caja de cartón",
    group: "Cajas",
    size: [44, 44],
    fps: 1,
    hint: "Se rompe golpeándola desde abajo. Algunas guardan una gota.",
    draw(g, t, o) {
      const s = o.w;
      g.beginPath();
      g.rect(-s / 2, -s, s, s);
      const f = g.createLinearGradient(0, -s, 0, 0);
      f.addColorStop(0, "#d9a96a");
      f.addColorStop(1, "#b07a42");
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      g.fillStyle = "#e8d6a8";
      g.fillRect(-5, -s + 2, 10, s - 4);
      g.strokeStyle = "#7a5228";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-s / 2 + 3, -s / 2);
      g.lineTo(-7, -s / 2);
      g.moveTo(7, -s / 2);
      g.lineTo(s / 2 - 3, -s / 2);
      g.stroke();
      g.fillStyle = "#2a74c9";
      g.font = "bold 8px Arial";
      g.textAlign = "center";
      g.fillText("ML", -13, -8);
      g.fillStyle = "#ffffff55";
      g.fillRect(-s / 2 + 3, -s + 3, s - 6, 3);
    },
  };
  D.ladrillo_pedazo = {
    name: "Pedazo de cartón",
    group: "Cajas",
    size: [16, 16],
    fps: 1,
    hint: "Restos que vuelan al romper una caja de cartón.",
    draw(g, t, o) {
      g.beginPath();
      g.moveTo(-8, -2);
      g.lineTo(6, -9);
      g.lineTo(8, 4);
      g.lineTo(-4, 7);
      g.closePath();
      g.translate(0, -8);
      g.fillStyle = "#c48e50";
      g.fill();
      outline(g, 2);
    },
  };
  /* ---------------- Power-ups ---------------- */
  D.cacao = {
    name: "Cacao (chocolatada)",
    group: "Power-ups",
    size: [34, 40],
    fps: 8,
    hint: "20 s: disparos de chocolate con doble daño. Recupera 25% de energía.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -20);
      g.rotate(Math.sin(t * 3) * 0.08);
      // Tableta de chocolate asomando del envoltorio
      roundRect(g, -13, -19, 26, 22, 3);
      const f = g.createLinearGradient(0, -19, 0, 3);
      f.addColorStop(0, "#9a6338");
      f.addColorStop(1, "#5a3218");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#b9824f";
      for (const [x, y] of [
        [-9, -15],
        [2, -15],
        [-9, -7],
        [2, -7],
      ])
        g.fillRect(x, y, 7, 5);
      roundRect(g, -15, -4, 30, 23, 3);
      const w = g.createLinearGradient(0, -4, 0, 19);
      w.addColorStop(0, "#e5413a");
      w.addColorStop(1, "#a51f1a");
      g.fillStyle = w;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#fff4dc";
      g.fillRect(-15, 3, 30, 8);
      g.fillStyle = "#5a3218";
      g.font = "900 7px Arial";
      g.textAlign = "center";
      g.fillText("CACAO", 0, 10);
      g.strokeStyle = "#f5c518";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(-15, -4);
      g.lineTo(-11, 0);
      g.lineTo(-7, -4);
      g.lineTo(-3, 0);
      g.lineTo(1, -4);
      g.lineTo(5, 0);
      g.lineTo(9, -4);
      g.lineTo(13, 0);
      g.stroke();
      shine(g, -8, -16, 3, 1.5, 0.6);
      g.restore();
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + i * 2.1;
        g.fillStyle = "#ffe8c0";
        g.globalAlpha = 0.6 + Math.sin(a * 3) * 0.4;
        g.beginPath();
        g.arc(Math.cos(a) * 22, -20 + Math.sin(a) * 20, 1.8, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  };
  D.frutilla = {
    name: "Frutilla",
    group: "Power-ups",
    size: [34, 36],
    fps: 8,
    hint: "12 s: 30% más velocidad con estela rosada.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -18);
      g.rotate(Math.sin(t * 4) * 0.1);
      g.beginPath();
      g.moveTo(0, 16);
      g.bezierCurveTo(-18, 6, -18, -12, -6, -12);
      g.quadraticCurveTo(0, -14, 6, -12);
      g.bezierCurveTo(18, -12, 18, 6, 0, 16);
      const f = g.createRadialGradient(-5, -4, 2, 0, 0, 20);
      f.addColorStop(0, "#ff8a8a");
      f.addColorStop(0.6, "#e5303d");
      f.addColorStop(1, "#a8131f");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#ffe36b";
      for (let i = 0; i < 9; i++) {
        const x = Math.cos(i * 2.4) * 8,
          y = Math.sin(i * 1.9) * 7 + 1;
        g.beginPath();
        g.ellipse(x, y, 1.2, 1.8, 0, 0, TAU);
        g.fill();
      }
      g.fillStyle = "#3fa344";
      g.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + (i / 4) * Math.PI;
        g.lineTo(Math.cos(a) * 11, -12 + Math.sin(a) * 6);
        g.lineTo(Math.cos(a + 0.35) * 4, -11);
      }
      g.closePath();
      g.fill();
      outline(g, 2);
      shine(g, -6, -4, 3, 2, 0.8);
      g.restore();
    },
  };
  D.escudo = {
    name: "Tapa escudo",
    group: "Power-ups",
    size: [36, 36],
    fps: 8,
    hint: "Absorbe un impacto cualquiera, también las balas del enemigo 1.",
    draw(g, t, o) {
      const r = 15;
      g.save();
      g.translate(0, -18);
      g.beginPath();
      g.arc(0, 0, r + 6 + Math.sin(t * 5) * 2, 0, TAU);
      g.strokeStyle = "rgba(120,210,255,.55)";
      g.lineWidth = 3;
      g.stroke();
      g.beginPath();
      g.ellipse(0, 2, r, r * 0.55, 0, 0, TAU);
      g.fillStyle = "#1c5fae";
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.ellipse(0, -3, r, r * 0.55, 0, 0, TAU);
      const f = g.createLinearGradient(0, -12, 0, 6);
      f.addColorStop(0, "#7cc4ff");
      f.addColorStop(1, "#2a7fd6");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#e8f6ff";
      g.font = "900 10px Arial";
      g.textAlign = "center";
      g.fillText("ML", 0, 0);
      shine(g, -6, -7, 4, 1.8, 0.85);
      g.restore();
    },
  };
  D.uht = {
    name: "Leche UHT",
    group: "Power-ups",
    size: [32, 44],
    fps: 12,
    hint: "9 s de invencibilidad: aplasta todo lo que toca y no se calienta.",
    draw(g, t, o) {
      const hue = (t * 240) % 360;
      g.save();
      g.translate(0, 0);
      g.shadowColor = `hsl(${hue},90%,65%)`;
      g.shadowBlur = 18;
      g.beginPath();
      g.moveTo(-13, 0);
      g.lineTo(-13, -30);
      g.lineTo(-7, -38);
      g.lineTo(7, -38);
      g.lineTo(13, -30);
      g.lineTo(13, 0);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      g.shadowBlur = 0;
      outline(g, 2.5);
      g.fillStyle = `hsl(${hue},85%,55%)`;
      g.fillRect(-12, -24, 24, 10);
      g.fillStyle = "#fff";
      g.font = "900 8px Arial";
      g.textAlign = "center";
      g.fillText("UHT", 0, -16);
      g.fillStyle = "#2a74c9";
      g.fillRect(-4, -43, 8, 6);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-4, -43, 8, 6);
      for (let i = 0; i < 4; i++) {
        const a = t * 3 + i * 1.57,
          x = Math.cos(a) * 22,
          y = -20 + Math.sin(a) * 22;
        g.fillStyle = `hsl(${(hue + i * 90) % 360},90%,70%)`;
        g.beginPath();
        for (let k = 0; k < 8; k++) {
          const rr = k % 2 ? 1.4 : 4;
          g.lineTo(x + Math.cos((k * Math.PI) / 4) * rr, y + Math.sin((k * Math.PI) / 4) * rr);
        }
        g.fill();
      }
      g.restore();
    },
  };
  /* ---------------- Escenario ---------------- */
  D.resorte = {
    name: "Resorte",
    group: "Escenario",
    size: [40, 26],
    fps: 1,
    hint: "Lanza muy alto. Manteniendo salto, todavía más.",
    draw(g, t, o) {
      const k = o.boing ? Math.sin(o.boing * 40) * (o.boing / 0.35) : 0,
        h = 24 * (1 - Math.max(-0.4, Math.min(0.5, k * 0.5)));
      g.fillStyle = "#3a4b5c";
      g.fillRect(-20, -5, 40, 5);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-20, -5, 40, 5);
      g.beginPath();
      for (let i = 0; i <= 8; i++) g.lineTo(i % 2 ? 13 : -13, -5 - (i / 8) * (h - 9));
      g.lineWidth = 5;
      g.strokeStyle = INK;
      g.stroke();
      g.lineWidth = 3;
      g.strokeStyle = "#c8d6e0";
      g.stroke();
      roundRect(g, -20, -h - 4, 40, 8, 3);
      g.fillStyle = "#e5413a";
      g.fill();
      outline(g, 2);
      g.fillStyle = "#ffffff88";
      g.fillRect(-16, -h - 3, 32, 2);
    },
  };
  D.selladora = {
    name: "Selladora (prensa)",
    group: "Escenario",
    size: [84, 60],
    fps: 1,
    hint: "Baja con fuerza cada pocos segundos. Antes de bajar, tiembla.",
    draw(g, t, o) {
      const w = o.w,
        h = o.h;
      roundRect(g, -w / 2, -h, w, h, 6);
      const f = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      f.addColorStop(0, "#7d8f9c");
      f.addColorStop(0.5, "#dfe8ee");
      f.addColorStop(1, "#6b7c88");
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      g.save();
      g.beginPath();
      g.rect(-w / 2 + 2, -16, w - 4, 14);
      g.clip();
      for (let x = -w / 2 - 20; x < w / 2 + 20; x += 16) {
        g.fillStyle = "#f5c518";
        g.beginPath();
        g.moveTo(x, -2);
        g.lineTo(x + 8, -2);
        g.lineTo(x + 18, -16);
        g.lineTo(x + 10, -16);
        g.fill();
        g.fillStyle = "#1d1d1d";
        g.beginPath();
        g.moveTo(x + 8, -2);
        g.lineTo(x + 16, -2);
        g.lineTo(x + 26, -16);
        g.lineTo(x + 18, -16);
        g.fill();
      }
      g.restore();
      g.fillStyle = o.warn ? (Math.sin(t * 40) > 0 ? "#ff3b30" : "#ffb199") : "#3ad16b";
      g.beginPath();
      g.arc(w / 2 - 12, -h + 12, 5, 0, TAU);
      g.fill();
      outline(g, 1.5);
      g.fillStyle = INK;
      g.font = "bold 10px Arial";
      g.textAlign = "center";
      g.fillText("SELLO ML", -6, -h + 26);
    },
  };
  D.valvula = {
    name: "Válvula de vapor",
    group: "Escenario",
    size: [44, 26],
    fps: 1,
    hint: "Suelta vapor caliente (rojo) o aire helado (azul) cada pocos segundos.",
    draw(g, t, o) {
      const c = o.cold ? "#2a8fd6" : "#d23b2f";
      g.fillStyle = "#3d5262";
      g.fillRect(-22, -8, 44, 8);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-22, -8, 44, 8);
      roundRect(g, -10, -22, 20, 15, 3);
      g.fillStyle = "#8ea3b2";
      g.fill();
      outline(g, 2);
      g.save();
      g.translate(16, -16);
      g.rotate(o.warn ? Math.sin(t * 30) * 0.4 : 0);
      g.beginPath();
      g.arc(0, 0, 7, 0, TAU);
      g.strokeStyle = INK;
      g.lineWidth = 5;
      g.stroke();
      g.strokeStyle = c;
      g.lineWidth = 3;
      g.stroke();
      g.restore();
      g.fillStyle = o.warn || o.on ? c : "#2a3a46";
      g.beginPath();
      g.arc(-15, -14, 3, 0, TAU);
      g.fill();
    },
  };
  D.caja_cae = {
    name: "Caja que cae",
    group: "Escenario",
    size: [58, 52],
    fps: 1,
    hint: "Cae del techo. Su sombra en el suelo avisa dónde va a caer.",
    draw(g, t, o) {
      const w = o.w,
        h = o.h;
      g.beginPath();
      g.rect(-w / 2, -h, w, h);
      g.fillStyle = "#c2884c";
      g.fill();
      outline(g, 3);
      g.strokeStyle = "#7d5326";
      g.lineWidth = 3;
      g.strokeRect(-w / 2 + 5, -h + 5, w - 10, h - 10);
      g.beginPath();
      g.moveTo(-w / 2 + 6, -h + 6);
      g.lineTo(w / 2 - 6, -6);
      g.moveTo(w / 2 - 6, -h + 6);
      g.lineTo(-w / 2 + 6, -6);
      g.stroke();
      g.fillStyle = "#ffffff44";
      g.fillRect(-w / 2 + 3, -h + 3, w - 6, 3);
    },
  };
  D.carambano = {
    name: "Carámbano",
    group: "Escenario",
    size: [26, 54],
    fps: 1,
    hint: "Se desprende del techo en las zonas heladas.",
    draw(g, t, o) {
      g.beginPath();
      g.moveTo(-13, -54);
      g.lineTo(13, -54);
      g.lineTo(5, -30);
      g.lineTo(0, 0);
      g.lineTo(-5, -26);
      g.closePath();
      const f = g.createLinearGradient(-13, 0, 13, 0);
      f.addColorStop(0, "#9ed8f0");
      f.addColorStop(0.5, "#f2fcff");
      f.addColorStop(1, "#7bbfe0");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.strokeStyle = "#ffffffcc";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-6, -50);
      g.lineTo(-2, -24);
      g.stroke();
    },
  };
  D.heladera = {
    name: "Heladera",
    group: "Escenario",
    size: [62, 118],
    fps: 1,
    hint: "Acercate para bajar la temperatura de la leche.",
    draw(g, t, o) {
      const w = o.w,
        h = o.h,
        open = o.open || 0;
      g.fillStyle = "#0f2a3a55";
      g.beginPath();
      g.ellipse(0, 0, w * 0.6, 6, 0, 0, TAU);
      g.fill();
      roundRect(g, -w / 2, -h, w, h - 2, 10);
      const f = g.createLinearGradient(-w / 2, 0, w / 2, 0);
      f.addColorStop(0, "#d6e8f0");
      f.addColorStop(0.5, "#ffffff");
      f.addColorStop(1, "#b7cfdb");
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      if (open > 0.02) {
        g.fillStyle = "#bff2ff";
        g.shadowColor = "#bff2ff";
        g.shadowBlur = 25 * open;
        roundRect(g, -w / 2 + 6, -h + 40, w - 12, h - 50, 4);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "#ffffff";
        for (let i = 0; i < 3; i++) g.fillRect(-w / 2 + 10, -h + 60 + i * 20, w - 20, 3);
        g.fillStyle = "#2a74c9";
        g.fillRect(-8, -h + 66, 7, 13);
        g.fillRect(4, -h + 86, 7, 13);
        g.save();
        g.translate(w / 2 - 4, 0);
        g.scale(1 - open * 0.85, 1);
        roundRect(g, -w + 10, -h + 38, w - 6, h - 42, 6);
        g.fillStyle = "#e6f1f6";
        g.fill();
        outline(g, 3);
        g.restore();
      } else {
        g.beginPath();
        g.moveTo(-w / 2, -h + 38);
        g.lineTo(w / 2, -h + 38);
        outline(g, 2.5);
        roundRect(g, w / 2 - 14, -h + 50, 6, 30, 3);
        g.fillStyle = "#8aa0ae";
        g.fill();
        outline(g, 1.5);
      }
      roundRect(g, w / 2 - 14, -h + 10, 6, 20, 3);
      g.fillStyle = "#8aa0ae";
      g.fill();
      outline(g, 1.5);
      g.fillStyle = "#2a74c9";
      g.font = "bold 10px Arial";
      g.textAlign = "center";
      g.fillText("❄ FRÍO", -6, -h + 24);
      shine(g, -w / 2 + 12, -h + 22, 3, 10, 0.7);
    },
  };
  D.plataforma_movil = {
    name: "Plataforma móvil",
    group: "Escenario",
    size: [110, 24],
    fps: 6,
    hint: "Se mueve sola y transporta a la botella.",
    draw(g, t, o) {
      const w = o.w,
        theme = o.theme || "steel";
      const top = theme === "wood" ? "#c79b62" : theme === "forest" ? "#6f8a64" : theme === "ice" ? "#c3e8f2" : "#c6d7e0";
      const bot = theme === "wood" ? "#6e4a2a" : theme === "forest" ? "#34493c" : theme === "ice" ? "#4b8aa3" : "#3d5b70";
      roundRect(g, -w / 2, -24, w, 22, 5);
      const f = g.createLinearGradient(0, -24, 0, -2);
      f.addColorStop(0, top);
      f.addColorStop(1, bot);
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      g.fillStyle = "#ffffff66";
      g.fillRect(-w / 2 + 4, -22, w - 8, 3);
      for (let x = -w / 2 + 14; x < w / 2 - 8; x += 18) {
        g.fillStyle = Math.floor(t * 4 + x / 18) % 3 === 0 ? "#ffd23f" : "#20384a";
        g.beginPath();
        g.moveTo(x, -16);
        g.lineTo(x + 6, -12);
        g.lineTo(x, -8);
        g.fill();
      }
      g.fillStyle = INK;
      g.fillRect(-6, -2, 12, 6);
    },
  };
  D.plataforma_espuma = {
    name: "Plataforma de espuma",
    group: "Escenario",
    size: [92, 26],
    fps: 6,
    hint: "Aguanta un instante, tiembla y se desarma. Vuelve a aparecer.",
    draw(g, t, o) {
      const w = o.w;
      g.beginPath();
      for (let i = 0; i <= 7; i++) {
        const x = -w / 2 + (i / 7) * w;
        g.arc(x, -14 + (i % 2) * 3, 11 + (i % 3) * 2, Math.PI, 0);
      }
      g.lineTo(w / 2 + 8, -6);
      for (let i = 7; i >= 0; i--) g.arc(-w / 2 + (i / 7) * w, -8, 9, 0, Math.PI);
      g.closePath();
      const f = g.createLinearGradient(0, -28, 0, 2);
      f.addColorStop(0, "#ffffff");
      f.addColorStop(1, "#d3e3f0");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#ffffff";
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        g.arc(-w / 2 + 10 + i * 15, -18 + Math.sin(t * 3 + i) * 2, 3, 0, TAU);
        g.fill();
        g.strokeStyle = "#a9c3d6";
        g.lineWidth = 1;
        g.stroke();
      }
    },
  };
  D.cartel = {
    name: "Cartel de ayuda",
    group: "Escenario",
    size: [150, 58],
    fps: 1,
    hint: "Carteles con consejos. El texto se escribe encima del diseño; el ancho se ajusta al texto.",
    draw(g, t, o) {
      const w = o.w;
      for (const x of [-w / 2 + 16, w / 2 - 16]) {
        g.fillStyle = "#5b4330";
        g.fillRect(x - 3, -30, 6, 30);
        g.strokeStyle = INK;
        g.lineWidth = 2;
        g.strokeRect(x - 3, -30, 6, 30);
      }
      roundRect(g, -w / 2, -58, w, 30, 6);
      const f = g.createLinearGradient(0, -58, 0, -28);
      f.addColorStop(0, "#1d4561");
      f.addColorStop(1, "#102a3d");
      g.fillStyle = f;
      g.fill();
      outline(g, 3);
      g.strokeStyle = "#f5c518";
      g.lineWidth = 1.5;
      roundRect(g, -w / 2 + 4, -54, w - 8, 22, 4);
      g.stroke();
    },
  };
  D.recarga = {
    name: "Botella de energía (recarga)",
    group: "Power-ups",
    size: [34, 52],
    fps: 10,
    hint: "Nivel 2: devuelve el 100% de energía y quita la intoxicación.",
    draw(g, t, o) {
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      g.save();
      g.shadowColor = "#9ff0c6";
      g.shadowBlur = 14 + pulse * 10;
      g.beginPath();
      g.moveTo(-14, 0);
      g.lineTo(-14, -30);
      g.quadraticCurveTo(-14, -38, -7, -42);
      g.lineTo(-6, -48);
      g.lineTo(6, -48);
      g.lineTo(7, -42);
      g.quadraticCurveTo(14, -38, 14, -30);
      g.lineTo(14, 0);
      g.closePath();
      const f = g.createLinearGradient(-14, 0, 14, 0);
      f.addColorStop(0, "#e9fff4");
      f.addColorStop(0.5, "#ffffff");
      f.addColorStop(1, "#c9eedd");
      g.fillStyle = f;
      g.fill();
      g.shadowBlur = 0;
      outline(g, 2.5);
      // Nivel de leche que sube y baja
      g.save();
      g.clip();
      g.fillStyle = "rgba(160,235,200,.55)";
      g.fillRect(-14, -24 - pulse * 4, 28, 30);
      g.restore();
      roundRect(g, -8, -53, 16, 7, 2);
      g.fillStyle = "#2fbf7a";
      g.fill();
      outline(g, 2);
      g.fillStyle = "#2fbf7a";
      g.fillRect(-3, -22, 6, 16);
      g.fillRect(-8, -17, 16, 6);
      shine(g, -8, -30, 2.5, 7, 0.8);
      g.restore();
      for (let i = 0; i < 4; i++) {
        const q = (t * 0.8 + i / 4) % 1;
        g.globalAlpha = 1 - q;
        g.strokeStyle = "#bdf5da";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(Math.sin(i * 2.1) * 16, -10 - q * 50, 2 + i * 0.6, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;
    },
  };
  /* ---------------- Nivel 3 · La ciudad ---------------- */
  D.rata = {
    name: "Rata de alcantarilla",
    group: "Enemigos nivel 3",
    size: [46, 30],
    fps: 14,
    hint: "Sale de la alcantarilla cuando te acercás, corre y vuelve a esconderse. Se aplasta saltándole encima.",
    draw(g, t, o) {
      const run = o.state !== "hidden",
        bob = run ? Math.abs(Math.sin(t * 18)) * 2 : 0;
      g.save();
      g.translate(0, -bob);
      if (o.squash) g.scale(1.25, 0.4);
      g.beginPath();
      g.moveTo(-18, -8);
      g.bezierCurveTo(-34, -6, -38, -22, -30, -26 + Math.sin(t * 9) * 3);
      outline(g, 3);
      g.strokeStyle = "#c98a8f";
      g.lineWidth = 1.5;
      g.stroke();
      g.beginPath();
      g.ellipse(-2, -12, 18, 11, 0, 0, TAU);
      const b = g.createLinearGradient(0, -24, 0, 0);
      b.addColorStop(0, "#6e6258");
      b.addColorStop(1, "#3c332d");
      g.fillStyle = b;
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.moveTo(8, -20);
      g.quadraticCurveTo(26, -17, 25, -7);
      g.quadraticCurveTo(15, -3, 6, -5);
      g.closePath();
      g.fillStyle = "#6e6258";
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.arc(8, -21, 6, 0, TAU);
      g.fillStyle = "#d99aa2";
      g.fill();
      outline(g, 2);
      g.fillStyle = "#e05a6c";
      g.beginPath();
      g.arc(26, -8, 2.5, 0, TAU);
      g.fill();
      if (!o.squash) {
        g.fillStyle = "#ffdf5a";
        g.beginPath();
        g.arc(16, -14, 2.6, 0, TAU);
        g.fill();
        g.fillStyle = INK;
        g.beginPath();
        g.arc(17, -14, 1.2, 0, TAU);
        g.fill();
      }
      g.strokeStyle = INK;
      g.lineWidth = 2.5;
      for (const [x, ph] of [
        [-10, 0],
        [6, Math.PI],
      ]) {
        const s = run ? Math.sin(t * 18 + ph) * 5 : 0;
        g.beginPath();
        g.moveTo(x, -3);
        g.lineTo(x + s, 2 + bob);
        g.stroke();
      }
      g.restore();
    },
  };
  D.paloma = {
    name: "Paloma",
    group: "Enemigos nivel 3",
    size: [44, 36],
    fps: 12,
    hint: "Duerme posada. Si pasás corriendo o disparás cerca, se tira en picada.",
    draw(g, t, o) {
      const flying = o.state === "dive" || o.state === "away",
        flap = flying ? Math.sin(t * 30) : 0;
      g.save();
      g.translate(0, -o.h / 2);
      if (o.squash) g.scale(1.2, 0.5);
      g.beginPath();
      g.ellipse(-2, 2, 17, 12, 0, 0, TAU);
      const b = g.createLinearGradient(0, -10, 0, 14);
      b.addColorStop(0, "#9aa6b8");
      b.addColorStop(1, "#5e6a80");
      g.fillStyle = b;
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.moveTo(-18, 2);
      g.lineTo(-27, -2);
      g.lineTo(-25, 8);
      g.closePath();
      g.fillStyle = "#4c566b";
      g.fill();
      outline(g, 2);
      g.save();
      g.translate(-3, -2);
      g.rotate(flying ? -0.6 + flap * 0.9 : 0.1);
      g.beginPath();
      g.ellipse(-4, 0, 13, 6, 0, 0, TAU);
      g.fillStyle = "#7c879c";
      g.fill();
      outline(g, 2);
      g.restore();
      g.beginPath();
      g.arc(13, -8, 8, 0, TAU);
      g.fillStyle = "#8692a8";
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#3fae8f";
      g.fillRect(8, -2, 9, 4);
      g.fillStyle = "#f3a83a";
      g.beginPath();
      g.moveTo(20, -9);
      g.lineTo(26, -7);
      g.lineTo(20, -5);
      g.fill();
      if (o.state === "perch" && !o.squash) {
        g.strokeStyle = INK;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(12, -9);
        g.lineTo(17, -9);
        g.stroke();
        g.fillStyle = "#dfe9ff";
        g.font = "bold 10px Arial";
        g.fillText("z", 22 + Math.sin(t * 2) * 2, -20 - ((t * 8) % 8));
      } else {
        g.fillStyle = "#ff6b3d";
        g.beginPath();
        g.arc(15, -10, 2.2, 0, TAU);
        g.fill();
      }
      g.strokeStyle = "#f3a83a";
      g.lineWidth = 2;
      if (!flying) {
        g.beginPath();
        g.moveTo(-3, 13);
        g.lineTo(-3, 18);
        g.moveTo(4, 13);
        g.lineTo(4, 18);
        g.stroke();
      }
      g.restore();
    },
  };
  D.lata = {
    name: "Lata de gaseosa",
    group: "Enemigos nivel 3",
    size: [34, 40],
    fps: 12,
    hint: "Rueda por la vereda y rebota contra todo. Saltala o aplastala.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -17);
      if (o.squash) g.scale(1.3, 0.35);
      g.rotate(o.rot || 0);
      roundRect(g, -17, -12, 34, 24, 6);
      const b = g.createLinearGradient(0, -12, 0, 12);
      b.addColorStop(0, "#ff5a5a");
      b.addColorStop(0.5, "#d62839");
      b.addColorStop(1, "#8e1422");
      g.fillStyle = b;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#c9d3de";
      g.fillRect(-17, -12, 5, 24);
      g.fillRect(12, -12, 5, 24);
      g.strokeStyle = INK;
      g.lineWidth = 1.5;
      g.strokeRect(-17, -12, 5, 24);
      g.strokeRect(12, -12, 5, 24);
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.moveTo(-8, 4);
      g.bezierCurveTo(-2, -8, 4, 8, 9, -4);
      g.lineWidth = 2.5;
      g.strokeStyle = "#fff";
      g.stroke();
      shine(g, -2, -8, 6, 1.5, 0.6);
      g.restore();
      if (!o.squash) {
        eye(g, -5, -24, 4, 1);
        eye(g, 6, -24, 4, 1);
      }
    },
  };
  D.farol = {
    name: "Farolito caído",
    group: "Enemigos nivel 3",
    size: [44, 48],
    fps: 10,
    hint: "Un farol de papel suelto que rueda por el barrio chino.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -24);
      if (o.squash) g.scale(1.3, 0.4);
      g.rotate(o.rot || 0);
      g.beginPath();
      g.ellipse(0, 0, 21, 18, 0, 0, TAU);
      const b = g.createRadialGradient(-5, -5, 2, 0, 0, 24);
      b.addColorStop(0, "#ffb15a");
      b.addColorStop(0.5, "#e0312b");
      b.addColorStop(1, "#8e1414");
      g.fillStyle = b;
      g.shadowColor = "#ff6a3d";
      g.shadowBlur = 14;
      g.fill();
      g.shadowBlur = 0;
      outline(g, 2.5);
      g.strokeStyle = "#7a1010";
      g.lineWidth = 1.5;
      for (const k of [-10, 0, 10]) {
        g.beginPath();
        g.ellipse(k * 0.7, 0, Math.abs(k) * 0.6 + 4, 17, 0, -Math.PI / 2, Math.PI / 2, k < 0);
        g.stroke();
      }
      g.fillStyle = "#f2b43a";
      g.fillRect(-9, -21, 18, 5);
      g.fillRect(-9, 16, 18, 5);
      g.restore();
      if (!o.squash) {
        eye(g, -6, -28, 4, 1);
        eye(g, 7, -28, 4, 1);
      }
    },
  };
  D.perro = {
    name: "Perro de la feria",
    group: "Enemigos nivel 3",
    size: [96, 70],
    fps: 12,
    hint: "Duerme. Si corrés o disparás cerca, se despierta y te persigue un rato. No se lo lastima: pasá caminando.",
    draw(g, t, o) {
      const sleep = o.state === "sleep",
        run = o.state === "chase",
        bob = run ? Math.abs(Math.sin(t * 16)) * 4 : sleep ? Math.sin(t * 2) * 1.5 : 0;
      g.save();
      g.translate(0, -bob);
      // cuerpo
      g.beginPath();
      g.ellipse(-6, -30, 36, 20, 0, 0, TAU);
      const b = g.createLinearGradient(0, -50, 0, -10);
      b.addColorStop(0, "#c98d4e");
      b.addColorStop(1, "#8c5a2b");
      g.fillStyle = b;
      g.fill();
      outline(g, 3);
      g.fillStyle = "#f3e2c7";
      g.beginPath();
      g.ellipse(-2, -22, 20, 8, 0, 0, TAU);
      g.fill();
      // cola
      g.beginPath();
      g.moveTo(-40, -36);
      g.quadraticCurveTo(-56, -50 + (run ? Math.sin(t * 20) * 8 : 0), -50, -60);
      outline(g, 5);
      g.strokeStyle = "#c98d4e";
      g.lineWidth = 3;
      g.stroke();
      // patas
      g.strokeStyle = INK;
      g.lineWidth = 5;
      for (const [x, ph] of [
        [-28, 0],
        [-14, Math.PI],
        [12, Math.PI / 2],
        [22, -Math.PI / 2],
      ]) {
        const s = run ? Math.sin(t * 16 + ph) * 8 : 0;
        g.beginPath();
        g.moveTo(x, -16);
        g.lineTo(x + s, sleep ? -12 : 0);
        g.stroke();
      }
      // cabeza
      g.beginPath();
      g.ellipse(32, sleep ? -30 : -44, 18, 15, 0, 0, TAU);
      g.fillStyle = "#c98d4e";
      g.fill();
      outline(g, 3);
      g.beginPath();
      g.ellipse(46, sleep ? -27 : -40, 9, 7, 0, 0, TAU);
      g.fillStyle = "#f3e2c7";
      g.fill();
      outline(g, 2);
      g.fillStyle = INK;
      g.beginPath();
      g.arc(54, sleep ? -29 : -42, 3, 0, TAU);
      g.fill();
      g.beginPath();
      g.ellipse(24, sleep ? -40 : -56, 7, 13, -0.5, 0, TAU);
      g.fillStyle = "#6b4220";
      g.fill();
      outline(g, 2);
      if (sleep) {
        g.beginPath();
        g.moveTo(32, -33);
        g.lineTo(39, -33);
        outline(g, 2);
        g.fillStyle = "#e6f0ff";
        g.font = "bold 14px Arial";
        g.fillText("Z", 50, -54 - ((t * 10) % 14));
        g.font = "bold 10px Arial";
        g.fillText("z", 60, -68 - ((t * 8) % 10));
      } else {
        eye(g, 36, -48, 4.5, 1);
        if (run) {
          g.fillStyle = "#e05a6c";
          g.beginPath();
          g.ellipse(46, -32, 4, 7, 0.3, 0, TAU);
          g.fill();
        }
      }
      g.restore();
    },
  };
  D.barista = {
    name: "Barista apurado",
    group: "Enemigos nivel 3",
    size: [70, 160],
    fps: 10,
    hint: "Si te ve de pie, corre a buscarte para «hacer un cortado»: te lleva atrás y quedás manchada. Agachate lejos de él. Un disparo lo aturde.",
    draw(g, t, o) {
      const run = o.state === "chase",
        stun = o.stun > 0,
        sw = Math.sin(t * (run ? 16 : 8));
      g.save();
      // piernas
      g.strokeStyle = INK;
      g.lineWidth = 9;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 9, -62);
        g.lineTo(s * 9 + sw * s * (run ? 12 : 6), -4);
        g.stroke();
      }
      g.strokeStyle = "#2b2f4a";
      g.lineWidth = 6;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 9, -62);
        g.lineTo(s * 9 + sw * s * (run ? 12 : 6), -4);
        g.stroke();
      }
      // torso con delantal
      roundRect(g, -24, -126, 48, 68, 10);
      g.fillStyle = "#f3efe6";
      g.fill();
      outline(g, 3);
      roundRect(g, -18, -110, 36, 56, 6);
      g.fillStyle = "#5a3a28";
      g.fill();
      outline(g, 2);
      g.fillStyle = "#f3e2c7";
      g.font = "bold 8px Arial";
      g.textAlign = "center";
      g.fillText("CAFÉ", 0, -82);
      // brazo con taza
      g.save();
      g.translate(20, -112);
      g.rotate(run ? -1.2 + sw * 0.2 : -0.3);
      g.fillStyle = "#f3efe6";
      g.fillRect(-4, 0, 9, 34);
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.strokeRect(-4, 0, 9, 34);
      roundRect(g, -8, 32, 18, 14, 3);
      g.fillStyle = "#ffffff";
      g.fill();
      outline(g, 2);
      g.restore();
      // cabeza
      g.beginPath();
      g.arc(0, -142, 18, 0, TAU);
      g.fillStyle = "#f2c19a";
      g.fill();
      outline(g, 3);
      g.beginPath();
      g.ellipse(0, -156, 20, 8, 0, Math.PI, 0);
      g.fillStyle = "#3a2618";
      g.fill();
      outline(g, 2);
      g.fillStyle = INK;
      g.fillRect(-12, -149, 24, 3);
      if (stun) {
        for (let k = 0; k < 3; k++) {
          const a = t * 6 + k * 2.1;
          g.fillStyle = "#ffd23f";
          g.beginPath();
          g.arc(Math.cos(a) * 22, -170 + Math.sin(a) * 6, 3, 0, TAU);
          g.fill();
        }
      } else {
        eye(g, 8, -140, 4, 1);
        g.beginPath();
        g.moveTo(2, -130);
        g.quadraticCurveTo(8, run ? -125 : -131, 13, -130);
        outline(g, 2);
      }
      // bigote
      g.fillStyle = "#3a2618";
      g.beginPath();
      g.ellipse(8, -134, 7, 2.5, 0, 0, TAU);
      g.fill();
      g.restore();
    },
  };
  D.gota_cafe = {
    name: "Gota de café",
    group: "Enemigos nivel 3",
    size: [34, 38],
    fps: 10,
    hint: "Salta hacia la botella. Si te toca, quedás «cortado»: manchada y más lenta hasta una recarga.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -2);
      if (o.squash) g.scale(1.5, 0.35);
      g.beginPath();
      g.moveTo(0, -36);
      g.bezierCurveTo(6, -24, 16, -18, 16, -8);
      g.arc(0, -8, 16, 0, Math.PI);
      g.bezierCurveTo(-16, -18, -6, -24, 0, -36);
      const f = g.createRadialGradient(-4, -12, 2, 0, -10, 20);
      f.addColorStop(0, "#a8744e");
      f.addColorStop(0.7, "#5a3a28");
      f.addColorStop(1, "#3a2416");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      shine(g, -6, -14, 3, 5, 0.6);
      g.restore();
      if (!o.squash) {
        eye(g, -5, -14, 3.6, 1);
        eye(g, 6, -14, 3.6, 1);
      }
    },
  };
  D.gato = {
    name: "El gato del callejón",
    group: "Enemigos nivel 3",
    size: [86, 60],
    fps: 14,
    hint: "Te persigue en el callejón y en las azoteas. Si te alcanza resta 10. Corré hasta que se canse; un disparo o un pisotón lo frenan un momento.",
    draw(g, t, o) {
      const run = o.state === "run" || o.state === "leave",
        slow = o.slow > 0,
        sp = slow ? 6 : 18;
      g.save();
      const bob = run ? Math.abs(Math.sin(t * sp)) * 4 : 0;
      g.translate(0, -bob);
      // cola
      g.beginPath();
      g.moveTo(-34, -32);
      g.bezierCurveTo(-56, -40, -52, -68 + Math.sin(t * 5) * 6, -40, -70);
      outline(g, 8);
      g.strokeStyle = "#1c1a24";
      g.lineWidth = 5;
      g.stroke();
      // cuerpo
      g.beginPath();
      g.ellipse(-4, -30, 36, 16, 0, 0, TAU);
      g.fillStyle = "#1c1a24";
      g.fill();
      outline(g, 3);
      g.strokeStyle = "#3a3648";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-26, -40);
      g.quadraticCurveTo(-4, -46, 18, -40);
      g.stroke();
      // patas
      g.strokeStyle = "#1c1a24";
      g.lineWidth = 7;
      for (const [x, ph] of [
        [-26, 0],
        [-14, Math.PI],
        [14, Math.PI / 2],
        [24, -Math.PI / 2],
      ]) {
        const s = run ? Math.sin(t * sp + ph) * 10 : 0;
        g.beginPath();
        g.moveTo(x, -20);
        g.lineTo(x + s, 0);
        g.stroke();
      }
      // cabeza
      g.beginPath();
      g.arc(34, -42, 15, 0, TAU);
      g.fillStyle = "#1c1a24";
      g.fill();
      outline(g, 3);
      for (const k of [-1, 1]) {
        g.beginPath();
        g.moveTo(34 + k * 4, -54);
        g.lineTo(34 + k * 13, -66);
        g.lineTo(34 + k * 14, -50);
        g.closePath();
        g.fillStyle = "#1c1a24";
        g.fill();
        outline(g, 2);
      }
      // ojos amarillos
      for (const x of [30, 41]) {
        g.fillStyle = "#ffd23f";
        g.shadowColor = "#ffd23f";
        g.shadowBlur = 8;
        g.beginPath();
        g.ellipse(x, -44, 4, slow ? 1.5 : 4, 0, 0, TAU);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = INK;
        g.fillRect(x - 0.8, -47, 1.6, 6);
      }
      g.strokeStyle = "#cfd3e0";
      g.lineWidth = 1;
      for (const k of [-1, 0, 1]) {
        g.beginPath();
        g.moveTo(44, -38);
        g.lineTo(58, -40 + k * 4);
        g.stroke();
      }
      g.restore();
    },
  };
  D.galletita = {
    name: "Galletita (doble salto)",
    group: "Power-ups nivel 3",
    size: [34, 34],
    fps: 8,
    hint: "15 s: un segundo salto en el aire.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -17);
      g.rotate(Math.sin(t * 3) * 0.15);
      g.beginPath();
      g.arc(0, 0, 15, 0, TAU);
      const f = g.createRadialGradient(-4, -4, 2, 0, 0, 16);
      f.addColorStop(0, "#f3c27a");
      f.addColorStop(1, "#b9773d");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      g.fillStyle = "#4a2a16";
      for (const [x, y] of [
        [-6, -5],
        [5, -7],
        [7, 4],
        [-4, 6],
        [0, 0],
      ]) {
        g.beginPath();
        g.arc(x, y, 2.4, 0, TAU);
        g.fill();
      }
      g.restore();
      // alitas
      for (const s of [-1, 1]) {
        g.save();
        g.translate(s * 15, -22);
        g.rotate(s * (0.4 + Math.sin(t * 14) * 0.4));
        g.beginPath();
        g.ellipse(s * 8, 0, 9, 4, 0, 0, TAU);
        g.fillStyle = "rgba(255,255,255,.9)";
        g.fill();
        outline(g, 1.5);
        g.restore();
      }
    },
  };
  D.pajita = {
    name: "Pajita (impulso)",
    group: "Power-ups nivel 3",
    size: [30, 44],
    fps: 8,
    hint: "15 s: en el aire, CORRER da un impulso rápido hacia adelante.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -22);
      g.rotate(-0.5 + Math.sin(t * 3) * 0.1);
      roundRect(g, -4, -20, 8, 40, 3);
      g.fillStyle = "#ffffff";
      g.fill();
      outline(g, 2);
      g.save();
      g.clip();
      g.fillStyle = "#ff3ea5";
      for (let k = -24; k < 24; k += 8) g.fillRect(-6, k + ((t * 20) % 8), 12, 4);
      g.restore();
      g.beginPath();
      g.moveTo(-4, -20);
      g.lineTo(4, -20);
      g.lineTo(12, -30);
      g.lineTo(5, -32);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();
      outline(g, 2);
      g.restore();
      g.strokeStyle = "rgba(255,62,165,.6)";
      g.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(-18 - k * 4, -10 - k * 8);
        g.lineTo(-8 - k * 4, -10 - k * 8);
        g.stroke();
      }
    },
  };
  D.tapa_reflectora = {
    name: "Tapa reflectora",
    group: "Power-ups nivel 3",
    size: [36, 36],
    fps: 8,
    hint: "20 s: la botella ilumina mucho más en la oscuridad y ratas y palomas se alejan.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -18);
      const r = g.createRadialGradient(0, 0, 4, 0, 0, 30);
      r.addColorStop(0, "rgba(255,250,200,.9)");
      r.addColorStop(1, "rgba(255,250,200,0)");
      g.fillStyle = r;
      g.fillRect(-30, -30, 60, 60);
      g.beginPath();
      g.ellipse(0, 2, 15, 8, 0, 0, TAU);
      g.fillStyle = "#c9a227";
      g.fill();
      outline(g, 2.5);
      g.beginPath();
      g.ellipse(0, -3, 15, 8, 0, 0, TAU);
      const f = g.createLinearGradient(-15, -8, 15, 4);
      f.addColorStop(0, "#fffbe0");
      f.addColorStop(0.5, "#ffe066");
      f.addColorStop(1, "#d6a91c");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.5);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + t;
        g.strokeStyle = "rgba(255,240,150,.8)";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * 19, -3 + Math.sin(a) * 11);
        g.lineTo(Math.cos(a) * 25, -3 + Math.sin(a) * 15);
        g.stroke();
      }
      g.restore();
    },
  };
  /* ---------------- Nivel 4 · Por las nubes ---------------- */
  D.gaviota = {
    name: "Gaviota del puerto",
    group: "Enemigos nivel 4",
    size: [62, 40],
    fps: 10,
    hint: "Patrulla planeando. Si pasás por debajo se tira en picada y vuelve a subir. Se pisa o se derriba con leche.",
    draw(g, t, o) {
      const dive = o.state === "dive",
        flap = dive ? -0.9 : Math.sin(t * 9) * 0.9;
      g.save();
      g.translate(0, -20);
      if (o.rot) g.rotate(o.rot);
      if (dive) g.rotate(0.45);
      // Alas: dos curvas grandes que aletean.
      for (const side of [-1, 1]) {
        g.save();
        g.scale(1, 1);
        g.beginPath();
        g.moveTo(-6 * side, -2);
        g.quadraticCurveTo(-18 * side, -14 - flap * 14, -34 * side, -6 - flap * 18);
        g.quadraticCurveTo(-20 * side, 0, -4 * side, 4);
        g.closePath();
        g.fillStyle = side < 0 ? "#e9eef3" : "#d7dee6";
        g.fill();
        outline(g, 2.2);
        g.beginPath();
        g.moveTo(-28 * side, -5 - flap * 16);
        g.lineTo(-34 * side, -6 - flap * 18);
        g.strokeStyle = "#3b4654";
        g.lineWidth = 4;
        g.stroke();
        g.restore();
      }
      // Cuerpo.
      g.beginPath();
      g.ellipse(0, 2, 16, 10, 0, 0, TAU);
      g.fillStyle = "#f6f8fb";
      g.fill();
      outline(g, 2.4);
      // Cabeza con gorra de cartero.
      g.beginPath();
      g.arc(14, -6, 9, 0, TAU);
      g.fillStyle = "#f6f8fb";
      g.fill();
      outline(g, 2.2);
      g.beginPath();
      g.moveTo(8, -13);
      g.quadraticCurveTo(14, -21, 21, -13);
      g.closePath();
      g.fillStyle = "#2e5f8a";
      g.fill();
      outline(g, 1.6);
      g.fillStyle = "#e7b347";
      g.fillRect(19, -14, 6, 2);
      // Pico.
      g.beginPath();
      g.moveTo(21, -6);
      g.lineTo(31, -3);
      g.lineTo(21, -1);
      g.closePath();
      g.fillStyle = "#f2a83a";
      g.fill();
      outline(g, 1.6);
      g.fillStyle = "#e0442b";
      g.beginPath();
      g.arc(27, -3, 1.4, 0, TAU);
      g.fill();
      eye(g, 15, -7, 3.2, 1, 1);
      // Patas.
      g.strokeStyle = "#f2a83a";
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(-4, 11);
      g.lineTo(-8, 16);
      g.moveTo(3, 11);
      g.lineTo(0, 17);
      g.stroke();
      g.restore();
    },
  };
  D.nubarron = {
    name: "Nubarrón gruñón",
    group: "Enemigos nivel 4",
    size: [92, 60],
    fps: 8,
    hint: "Te sigue desde arriba y deja caer gotas pesadas. El paraguas abierto las ataja. Si lo pisás, rebotás alto.",
    draw(g, t, o) {
      const puff = 1 + Math.sin(t * 3) * 0.03;
      g.save();
      g.translate(0, -30);
      if (o.rot) g.rotate(o.rot);
      if (o.squash) g.scale(1.3, 0.6);
      g.scale(puff, 1 / puff);
      const balls = [
        [-26, 6, 18],
        [-8, -6, 22],
        [14, -4, 20],
        [30, 8, 15],
        [0, 10, 20],
      ];
      g.beginPath();
      for (const [x, y, r] of balls) {
        g.moveTo(x + r, y);
        g.arc(x, y, r, 0, TAU);
      }
      const f = g.createLinearGradient(0, -28, 0, 30);
      f.addColorStop(0, "#c9cfde");
      f.addColorStop(0.55, "#8a92ab");
      f.addColorStop(1, "#5a6080");
      g.fillStyle = f;
      g.fill();
      g.lineWidth = 2.6;
      g.strokeStyle = INK;
      g.stroke();
      // Interior sin contornos internos.
      g.fillStyle = f;
      for (const [x, y, r] of balls) {
        g.beginPath();
        g.arc(x, y, r - 2.4, 0, TAU);
        g.fill();
      }
      shine(g, -12, -16, 9, 4, 0.35);
      eye(g, -8, 2, 5, 0.5, 1, 1);
      eye(g, 10, 2, 5, 0.5, 1, -1);
      g.beginPath();
      g.moveTo(-6, 16);
      g.quadraticCurveTo(1, 11, 8, 16);
      outline(g, 2.4);
      g.restore();
      // Gotas colgando debajo.
      g.fillStyle = "#7fc4ff";
      for (let i = 0; i < 3; i++) {
        const q = (t * 1.5 + i / 3) % 1;
        g.globalAlpha = 1 - q;
        g.beginPath();
        g.ellipse(-18 + i * 18, 2 + q * 14, 2.4, 3.6, 0, 0, TAU);
        g.fill();
      }
      g.globalAlpha = 1;
    },
  };
  D.dron = {
    name: "Dron cartero",
    group: "Enemigos nivel 4",
    size: [62, 54],
    fps: 12,
    hint: "Pequeño ayudante del Capitán Cúmulo. Flota y dispara chispas apuntadas. Tres disparos de leche o un pisotón.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -27);
      if (o.rot) g.rotate(o.rot);
      // Hélice.
      const a = Math.abs(Math.sin(t * 40));
      g.fillStyle = "#b65a2a";
      g.beginPath();
      g.ellipse(0, -26, 24 * a + 3, 3.5, 0, 0, TAU);
      g.fill();
      outline(g, 1.6);
      g.fillStyle = "#8a6a3a";
      g.fillRect(-2, -26, 4, 8);
      // Cuerpo de lata con gorra.
      roundRect(g, -17, -18, 34, 32, 9);
      const f = g.createLinearGradient(-17, 0, 17, 0);
      f.addColorStop(0, "#2f5a5c");
      f.addColorStop(0.5, "#6f9c96");
      f.addColorStop(1, "#2b4c50");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.4);
      g.beginPath();
      g.moveTo(-18, -12);
      g.quadraticCurveTo(0, -24, 18, -12);
      g.lineTo(22, -9);
      g.lineTo(-18, -9);
      g.closePath();
      g.fillStyle = "#3d4d55";
      g.fill();
      outline(g, 1.8);
      // Ojo cian.
      const glow = g.createRadialGradient(0, 0, 1, 0, 0, 10);
      glow.addColorStop(0, "#e9ffff");
      glow.addColorStop(0.5, "#33e4f2");
      glow.addColorStop(1, "rgba(51,228,242,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(4, 0, 10, 0, TAU);
      g.fill();
      g.fillStyle = "#0b2a30";
      g.beginPath();
      g.arc(6, 0, 2.6, 0, TAU);
      g.fill();
      // Franja naranja y cañoncito.
      g.fillStyle = "#e36b2c";
      g.fillRect(-15, 7, 30, 4);
      roundRect(g, 14, 2, 12, 8, 3);
      g.fillStyle = "#c9873e";
      g.fill();
      outline(g, 1.6);
      if (o.stun) shine(g, 0, -4, 14, 10, 0.5);
      g.restore();
    },
  };
  D.globo_pinchos = {
    name: "Globo meteorológico con púas",
    group: "Enemigos nivel 4",
    size: [56, 74],
    fps: 6,
    hint: "Viejo globo de la estación del cielo. Sube y baja sobre los huecos: no se lo puede pisar. Un disparo de leche lo revienta.",
    draw(g, t, o) {
      const bob = Math.sin(t * 2) * 2;
      g.save();
      g.translate(0, -44 + bob);
      if (o.rot) g.rotate(o.rot);
      // Púas de bronce alrededor.
      g.fillStyle = "#c99a45";
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + t * 0.4;
        g.save();
        g.rotate(a);
        g.beginPath();
        g.moveTo(-4, -24);
        g.lineTo(0, -35);
        g.lineTo(4, -24);
        g.closePath();
        g.fill();
        outline(g, 1.4);
        g.restore();
      }
      // Globo de tela con parches.
      g.beginPath();
      g.arc(0, 0, 25, 0, TAU);
      const f = g.createRadialGradient(-8, -9, 3, 0, 0, 27);
      f.addColorStop(0, "#fff1d6");
      f.addColorStop(0.6, "#e46d4a");
      f.addColorStop(1, "#9c3523");
      g.fillStyle = f;
      g.fill();
      outline(g, 2.6);
      roundRect(g, 4, -14, 12, 10, 2);
      g.fillStyle = "#d9c08a";
      g.fill();
      outline(g, 1.4);
      g.strokeStyle = INK;
      g.lineWidth = 1;
      g.setLineDash([2, 2]);
      g.strokeRect(5.5, -12.5, 9, 7);
      g.setLineDash([]);
      shine(g, -9, -10, 6, 3.5, 0.6);
      eye(g, -7, 4, 4, 0, 1, 1);
      eye(g, 7, 4, 4, 0, 1, -1);
      // Cuerda y sensor colgante.
      g.beginPath();
      g.moveTo(0, 25);
      g.quadraticCurveTo(4 * Math.sin(t * 3), 34, 0, 42);
      g.strokeStyle = "#5a4630";
      g.lineWidth = 1.8;
      g.stroke();
      roundRect(g, -5, 40, 10, 8, 2);
      g.fillStyle = "#6b7f87";
      g.fill();
      outline(g, 1.4);
      g.restore();
    },
  };
  D.chispa = {
    name: "Chispa de tormenta",
    group: "Enemigos nivel 4",
    size: [38, 38],
    fps: 14,
    hint: "Corre por el piso durante la tormenta. Electrocuta si la tocás o la pisás: solo se apaga con leche.",
    draw(g, t, o) {
      g.save();
      g.translate(0, -19);
      if (o.rot) g.rotate(o.rot);
      const r = 13 + Math.sin(t * 20) * 1.5;
      const halo = g.createRadialGradient(0, 0, 2, 0, 0, r + 12);
      halo.addColorStop(0, "rgba(255,255,220,1)");
      halo.addColorStop(0.45, "rgba(150,220,255,.9)");
      halo.addColorStop(1, "rgba(120,140,255,0)");
      g.fillStyle = halo;
      g.beginPath();
      g.arc(0, 0, r + 12, 0, TAU);
      g.fill();
      // Rayos que saltan alrededor.
      g.strokeStyle = "#fff6a8";
      g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + Math.floor(t * 12) * 0.7;
        g.beginPath();
        g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        g.lineTo(Math.cos(a + 0.2) * (r + 7), Math.sin(a + 0.2) * (r + 7));
        g.lineTo(Math.cos(a - 0.1) * (r + 13), Math.sin(a - 0.1) * (r + 13));
        g.stroke();
      }
      g.beginPath();
      g.arc(0, 0, r - 3, 0, TAU);
      g.fillStyle = "#fffbe0";
      g.fill();
      outline(g, 2);
      eye(g, -4, -1, 3, 1, 1, 1);
      eye(g, 5, -1, 3, 1, 1, -1);
      g.restore();
    },
  };
  /* ---------------- Imágenes personalizadas ---------------- */
  const custom = {};
  let ready = false;
  function loadImage(src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  async function manifest() {
    // Con npm start el servidor detecta los archivos solo. Abriendo index.html directo, se usa personalizados.js.
    try {
      if (location.protocol.startsWith("http")) {
        const r = await fetch("__custom", { cache: "no-store" });
        if (r.ok) return await r.json();
      }
    } catch {}
    return root.MILK_CUSTOM || {};
  }
  async function load() {
    const list = await manifest();
    const jobs = [];
    for (const [key, n] of Object.entries(list)) {
      if (!D[key] || !n) continue;
      const frames = [];
      for (let i = 0; i < Math.min(+n, 32); i++) jobs.push(loadImage(`assets/custom/${key}-${i}.png`).then((im) => im && (frames[i] = im)));
      custom[key] = frames;
    }
    await Promise.all(jobs);
    for (const k of Object.keys(custom)) {
      custom[k] = custom[k].filter(Boolean);
      if (!custom[k].length) delete custom[k];
    }
    ready = true;
    return Object.keys(custom);
  }
  /* Dibuja un diseño con su base inferior centrada en (x, y). */
  function draw(g, key, t, x, y, opts = {}) {
    const d = D[key];
    if (!d) return;
    const w = opts.w || d.size[0],
      h = opts.h || d.size[1];
    g.save();
    g.translate(x, y);
    if (opts.alpha !== undefined) g.globalAlpha *= opts.alpha;
    if (opts.face === 1 || opts.face === -1) g.scale(opts.flip === false ? 1 : -opts.face * -1, 1);
    const frames = custom[key];
    if (frames) {
      const im = frames[Math.floor(t * (d.fps || 8)) % frames.length];
      let sx = 1,
        sy = 1;
      if (opts.squash) sy = 0.35;
      if (opts.rot) {
        g.translate(0, -h / 2);
        g.rotate(opts.rot);
        g.translate(0, h / 2);
      }
      const k = Math.min(w / im.width, h / im.height) * (opts.fill ? 1 : 1);
      const dw = im.width * k * sx,
        dh = im.height * k * sy;
      g.drawImage(im, -dw / 2, -dh, dw, dh);
    } else d.draw(g, t, { ...opts, w, h });
    g.restore();
  }
  root.MilkDesigns = {
    list: D,
    draw,
    load,
    isCustom: (k) => !!custom[k],
    frames: (k) => (custom[k] ? custom[k].length : 0),
    get ready() {
      return ready;
    },
  };
})(window);
