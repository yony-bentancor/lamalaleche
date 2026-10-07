/* Nivel 3 · La ciudad viva. Anima elementos pintados en los 12 fondos: pantallas LED con publicidad,
   neones que titilan, dragones con energía, farolitos que se mecen, vapor, ropa tendida, faroles que se
   apagan al amanecer y el gran cartel de Granja La Esperanza, que se rompe durante la pelea con la vaca.
   Todas las coordenadas están en píxeles de la ilustración original (1672×941) y se convierten al fondo. */
(function (root) {
  "use strict";
  const SX = 1280 / 1672,
    SY = 520 / 700,
    TAU = Math.PI * 2;
  const hash = (n) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  /* Brillo de neón: estable con pequeñas caídas; cada tanto, un corte rápido. */
  function flick(t, seed, rate = 1) {
    const cyc = (t * 0.17 * rate + seed * 0.37) % 1;
    if (cyc > 0.93) return hash(Math.floor(t * 18) + seed * 31) > 0.45 ? 1 : 0.12;
    return 0.86 + 0.14 * Math.sin(t * 2.6 + seed * 5);
  }
  let g = null,
    s = null,
    O = { x: 0, y: 0 },
    tileCanvas = null;
  const P = (xs, ys) => [O.x + xs * SX, O.y + ys * SY];
  function glow(xs, ys, r, color, a = 1) {
    const [x, y] = P(xs, ys);
    const R = r * SX;
    if (a <= 0.01) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = Math.min(1, a);
    g.fillStyle = gr;
    g.fillRect(x - R, y - R, R * 2, R * 2);
    g.globalAlpha = 1;
  }
  function light(fn) {
    g.save();
    g.globalCompositeOperation = "lighter";
    fn();
    g.restore();
  }
  function dim(xs, ys, ws, hs, a, color = "8,2,18") {
    if (a <= 0.01) return;
    const [x, y] = P(xs, ys);
    g.fillStyle = `rgba(${color},${a})`;
    g.fillRect(x, y, ws * SX, hs * SY);
  }
  function steam(xs, ys, n = 5, rise = 80, spread = 10, alpha = 0.22, speed = 0.33) {
    if (!s.fx) return;
    for (let k = 0; k < n; k++) {
      const q = (s.t * speed + k / n + xs * 0.001) % 1;
      const [x, y] = P(xs + Math.sin(q * 6 + k) * spread * q, ys - q * rise);
      const r = (5 + q * 20) * SX;
      g.globalAlpha = (1 - q) * q * 4 * alpha;
      g.fillStyle = "#e9edf2";
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  /* Redibuja un recorte del propio fondo con un leve vaivén (ropa tendida, farolitos colgantes). */
  function sway(xs, ys, ws, hs, angle, slices = 1, phase = 0) {
    if (!s.fx || !tileCanvas) return;
    const sw = ws / slices;
    for (let k = 0; k < slices; k++) {
      const x0 = xs + k * sw,
        a = angle * Math.sin(s.t * 2.3 + phase + k * 0.9);
      const [x, y] = P(x0, ys);
      g.save();
      g.translate(x, y);
      g.transform(1, 0, a, 1, 0, 0);
      g.drawImage(tileCanvas, x0 * SX, ys * SY, sw * SX, hs * SY, 0, 0, sw * SX, hs * SY);
      g.restore();
    }
  }
  function lantern(xs, ys, seed) {
    // Farolito chino: vaivén suave alrededor del gancho y brillo cálido que respira.
    if (s.fx && tileCanvas) {
      const a = Math.sin(s.t * 1.7 + seed) * 0.05 * (1 + s.wind * 2);
      const top = ys - 34,
        [x, y] = P(xs, top);
      g.save();
      g.translate(x, y);
      g.rotate(a);
      g.drawImage(tileCanvas, (xs - 26) * SX, top * SY, 52 * SX, 72 * SY, -26 * SX, 0, 52 * SX, 72 * SY);
      g.restore();
    }
    light(() => glow(xs, ys, 70, "rgba(255,90,40,.55)", 0.55 + 0.25 * Math.sin(s.t * 2 + seed)));
  }
  /* ---------- Pantallas LED con publicidad ---------- */
  const screens = [];
  const AD_W = 320,
    AD_H = 180;
  const ADS = ["wanted", "farm", "news", "cafe", "offer"];
  function adCanvas(i) {
    if (!screens[i]) {
      const c = document.createElement("canvas");
      c.width = AD_W;
      c.height = AD_H;
      screens[i] = c;
    }
    return screens[i];
  }
  function txt(c, t, x, y, size, color, align = "center", weight = 900) {
    c.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(t, x, y);
  }
  function drawAd(c, kind, t, k) {
    const bottle = s.bottle,
      cow = s.cowIdle;
    c.save();
    if (kind === "alert") {
      const on = Math.floor(t * 3) % 2;
      c.fillStyle = on ? "#5a0612" : "#2a0208";
      c.fillRect(0, 0, AD_W, AD_H);
      c.fillStyle = "#ffcf3a";
      for (let x = -40; x < AD_W + 40; x += 40) {
        c.beginPath();
        c.moveTo(x + ((t * 60) % 40), 0);
        c.lineTo(x + 20 + ((t * 60) % 40), 0);
        c.lineTo(x + ((t * 60) % 40), 20);
        c.lineTo(x - 20 + ((t * 60) % 40), 20);
        c.fill();
      }
      txt(c, "⚠ ALERTA", AD_W / 2, 70, 34, "#ffffff");
      txt(c, "VACA MECÁNICA", AD_W / 2, 112, 32, on ? "#ff7aa8" : "#ffd0e0");
      txt(c, "EN LA AZOTEA · NO MIRAR AL CAÑÓN", AD_W / 2, 148, 14, "#ffcf3a", "center", 700);
    } else if (kind === "wanted") {
      c.fillStyle = "#efdcb4";
      c.fillRect(0, 0, AD_W, AD_H);
      c.strokeStyle = Math.floor(t * 2) % 2 ? "#c2272d" : "#7a1a1e";
      c.lineWidth = 8;
      c.strokeRect(6, 6, AD_W - 12, AD_H - 12);
      txt(c, "SE BUSCA", 205, 52, 38, "#b01d24");
      txt(c, "BOTELLA DE LECHE", 205, 82, 16, "#3a2a1c");
      txt(c, "FUGADA DE EL MOLDE", 205, 104, 15, "#3a2a1c", "center", 700);
      c.fillStyle = "#3a2a1c";
      c.fillRect(120, 118, 170, 2);
      txt(c, "RECOMPENSA: 2×1", 205, 148, 20, "#b01d24");
      if (bottle) {
        const h = 140,
          w = (bottle.width / bottle.height) * h;
        c.save();
        c.translate(64, 160 + Math.sin(t * 2) * 3);
        c.rotate(Math.sin(t * 1.3) * 0.05);
        c.drawImage(bottle, -w / 2, -h, w, h);
        c.restore();
      }
    } else if (kind === "farm") {
      const sky = c.createLinearGradient(0, 0, 0, AD_H);
      sky.addColorStop(0, "#ffb36b");
      sky.addColorStop(0.6, "#ffe2a0");
      sky.addColorStop(1, "#ffefc6");
      c.fillStyle = sky;
      c.fillRect(0, 0, AD_W, AD_H);
      c.fillStyle = "#fff4c2";
      c.beginPath();
      c.arc(250, 110, 34 + Math.sin(t) * 2, 0, TAU);
      c.fill();
      c.fillStyle = "#5c9a3c";
      c.beginPath();
      c.moveTo(0, 140);
      c.quadraticCurveTo(100, 105, 190, 135);
      c.quadraticCurveTo(260, 150, 320, 125);
      c.lineTo(320, 180);
      c.lineTo(0, 180);
      c.fill();
      c.fillStyle = "#3f7a2a";
      c.fillRect(0, 160, AD_W, 20);
      if (cow) {
        const h = 92,
          w = (cow.width / cow.height) * h;
        c.save();
        c.translate(250, 172);
        c.scale(-1, 1);
        c.drawImage(cow, -w / 2, -h + Math.abs(Math.sin(t * 3)) * -3, w, h);
        c.restore();
      }
      txt(c, "GRANJA", 92, 50, 32, "#d6336c");
      txt(c, "LA ESPERANZA", 92, 80, 22, "#d6336c");
      txt(c, "LECHE DE VERDAD · KM 42", 92, 104, 12, "#5a3218", "center", 700);
    } else if (kind === "news") {
      c.fillStyle = "#0b1d3a";
      c.fillRect(0, 0, AD_W, AD_H);
      c.fillStyle = "#c81e2b";
      c.fillRect(0, 14, 170, 28);
      txt(c, "ÚLTIMO MOMENTO", 85, 34, 15, "#fff");
      txt(c, "¿UNA BOTELLA SUELTA", 16, 80, 21, "#ffffff", "left");
      txt(c, "EN LA CIUDAD?", 16, 106, 21, "#ffffff", "left");
      if (bottle) {
        const h = 110,
          w = (bottle.width / bottle.height) * h;
        c.globalAlpha = 0.85;
        c.drawImage(bottle, 262 - w / 2, 128 - h, w, h);
        c.globalAlpha = 1;
      }
      c.fillStyle = "#ffcf3a";
      c.fillRect(0, 140, AD_W, 40);
      c.save();
      c.beginPath();
      c.rect(0, 140, AD_W, 40);
      c.clip();
      const msg = "TESTIGOS DICEN QUE ESQUIVA GATOS  ·  EL MOLDE NIEGA TODO  ·  AMANECER 06:00  ·  CAFÉ 24H TE INVITA UN CORTADO  ·  ";
      c.font = "800 16px Arial, Helvetica, sans-serif";
      const mw = c.measureText(msg).width,
        off = (t * 70) % mw;
      c.fillStyle = "#11203a";
      c.textAlign = "left";
      c.fillText(msg, -off, 166);
      c.fillText(msg, mw - off, 166);
      c.restore();
    } else if (kind === "cafe") {
      c.fillStyle = "#2b1710";
      c.fillRect(0, 0, AD_W, AD_H);
      // Neón sin sombras costosas: un trazo ancho y tenue debajo de uno fino y brillante.
      for (const [lw, col] of [[11, "rgba(255,158,61,.25)"], [4, "#ff9e3d"]]) {
        c.strokeStyle = col;
        c.lineWidth = lw;
        c.beginPath();
        c.roundRect(40, 80, 70, 56, 10);
        c.stroke();
        c.beginPath();
        c.arc(116, 104, 12, -1.3, 1.3);
        c.stroke();
        for (let i = 0; i < 3; i++) {
          c.beginPath();
          for (let y = 0; y < 40; y += 4) c.lineTo(56 + i * 18 + Math.sin(y * 0.2 + t * 4 + i) * 5, 70 - y);
          c.stroke();
        }
      }
      txt(c, "CAFÉ 24H", 214, 70, 34, "#ffb35a");
      txt(c, "CORTADO + MEDIALUNA", 214, 102, 14, "#ffe3c0", "center", 700);
      txt(c, "$2", 214, 146, 40, "#ffffff");
    } else {
      c.fillStyle = "#c8102e";
      c.fillRect(0, 0, AD_W, AD_H);
      txt(c, "EL MOLDE", AD_W / 2, 48, 36, "#ffffff");
      txt(c, "LECHE ENTERA", AD_W / 2, 84, 20, "#ffe9a8");
      txt(c, "-50%", AD_W / 2, 140, 54, "#ffffff");
      c.save();
      c.translate(240, 128);
      c.rotate(-0.25);
      c.strokeStyle = "#1a1a1a";
      c.lineWidth = 4;
      c.strokeRect(-48, -20, 96, 38);
      txt(c, "¿VENCIDA?", 0, 7, 17, "#1a1a1a");
      c.restore();
    }
    // Rejilla de LED y transición con estática.
    c.fillStyle = "rgba(0,0,0,.16)";
    for (let y = 0; y < AD_H; y += 3) c.fillRect(0, y, AD_W, 1);
    if (k < 0.07) {
      for (let i = 0; i < 26; i++) {
        c.fillStyle = `rgba(${200 + hash(i + t) * 55 | 0},${200 + hash(i * 3 + t) * 55 | 0},255,${0.4 + hash(i * 7 + t) * 0.5})`;
        c.fillRect(0, hash(i * 13 + Math.floor(t * 30)) * AD_H, AD_W, 2 + hash(i) * 10);
      }
    }
    c.restore();
  }
  function screen(i, quad, seed) {
    const [a, b, , d] = quad.map(([x, y]) => P(x, y));
    const alert = s.boss && !["waiting", "dead"].includes(s.boss.state) && !s.won;
    const period = 6,
      phase = (s.t + seed * 2.1) / period,
      kind = alert ? "alert" : ADS[(Math.floor(phase) + seed) % ADS.length],
      k = phase % 1;
    const c = adCanvas(seed);
    drawAd(c.getContext("2d"), kind, s.t, alert ? 1 : k);
    g.save();
    g.transform((b[0] - a[0]) / AD_W, (b[1] - a[1]) / AD_W, (d[0] - a[0]) / AD_H, (d[1] - a[1]) / AD_H, a[0], a[1]);
    g.globalAlpha = 0.93;
    g.drawImage(c, 0, 0);
    g.restore();
    // Halo del LED sobre la ciudad.
    const [cx, cy] = [(a[0] + b[0] + d[0] * 2) / 4 + (b[0] - a[0]) * 0.25, (a[1] + d[1]) / 2];
    light(() => {
      const R = Math.hypot(b[0] - a[0], d[1] - a[1]) * 0.8;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, alert ? "rgba(255,40,80,.18)" : "rgba(160,190,255,.12)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
    });
  }
  /* ---------- Autos con faros sobre la avenida ---------- */
  function traffic(x0, x1, y, n, seed) {
    if (!s.fx) return;
    const [ax, ay] = P(x0, y),
      [bx] = P(x1, y);
    g.save();
    g.beginPath();
    g.rect(ax, ay - 30, bx - ax, 50);
    g.clip();
    light(() => {
      for (let k = 0; k < n; k++) {
        const dir = k % 2 ? 1 : -1,
          q = (s.t * (0.09 + hash(k + seed) * 0.05) + hash(k * 7 + seed)) % 1,
          x = dir > 0 ? ax + q * (bx - ax + 200) - 100 : bx - q * (bx - ax + 200) + 100,
          yy = ay + (dir > 0 ? 6 : -2);
        const col = dir > 0 ? "rgba(255,240,200,.85)" : "rgba(255,50,40,.75)";
        for (const off of [0, 14]) {
          const gr = g.createRadialGradient(x + off, yy, 0, x + off, yy, 16);
          gr.addColorStop(0, col);
          gr.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = gr;
          g.fillRect(x + off - 16, yy - 16, 32, 32);
        }
        if (dir > 0) {
          g.fillStyle = "rgba(255,240,200,.12)";
          g.beginPath();
          g.moveTo(x + 18, yy - 3);
          g.lineTo(x + 110, yy - 14);
          g.lineTo(x + 110, yy + 12);
          g.closePath();
          g.fill();
        }
      }
    });
    g.restore();
  }
  function gulls(n, y0, seed) {
    if (!s.fx) return;
    g.strokeStyle = "rgba(40,30,60,.7)";
    g.lineWidth = 1.6;
    for (let k = 0; k < n; k++) {
      const q = (s.t * (0.025 + hash(k + seed) * 0.02) + hash(k * 5 + seed)) % 1;
      const [x, y] = P(1700 - q * 1800, y0 + hash(k * 11) * 120 + Math.sin(s.t + k) * 8);
      const f = Math.sin(s.t * 7 + k * 2) * 4;
      g.beginPath();
      g.moveTo(x - 9, y - f);
      g.quadraticCurveTo(x - 4, y - 5, x, y);
      g.quadraticCurveTo(x + 4, y - 5, x + 9, y - f);
      g.stroke();
    }
  }
  function dragonPulse(x0, y0, w, h, seed) {
    light(() => {
      glow(x0 + w / 2, y0 + h / 2, w * 0.95, "rgba(255,70,30,.35)", 0.4 + 0.25 * Math.sin(s.t * 1.8 + seed));
      if (!s.fx) return;
      for (let k = 0; k < 7; k++) {
        const u = (s.t * 0.35 + k / 7) % 1;
        const xs = x0 + w * (0.5 + Math.sin(u * Math.PI * 2.4 + seed) * 0.28),
          ys = y0 + u * h;
        glow(xs, ys, 26, "rgba(255,220,120,.9)", (1 - Math.abs(u - 0.5) * 1.6) * 0.75);
      }
    });
  }
  function sparks(xs, ys, seed) {
    if (!s.fx) return;
    const burst = (s.t * 0.3 + seed) % 1;
    if (burst > 0.18) return;
    light(() => {
      for (let k = 0; k < 12; k++) {
        const q = burst / 0.18,
          vx = (hash(k + seed) - 0.5) * 120,
          vy = -40 - hash(k * 3 + seed) * 60;
        const [x, y] = P(xs + vx * q, ys + vy * q + 260 * q * q);
        g.fillStyle = `rgba(255,${200 + k * 4},120,${1 - q})`;
        g.fillRect(x, y, 2.5, 2.5);
      }
    });
  }
  /* ---------- Cada fondo ---------- */
  const LIFE = [
    // 1 · La vereda de El Molde: cartel del súper, cartel de la vaca con marquesina y tránsito.
    () => {
      const f = flick(s.t, 1.3);
      light(() => glow(300, 260, 300, "rgba(255,40,50,.32)", f * 0.7));
      dim(150, 200, 330, 120, (1 - f) * 0.55, "40,0,0");
      light(() => glow(980, 120, 220, "rgba(255,60,200,.35)", 0.55 + 0.2 * Math.sin(s.t * 2)));
      if (s.fx)
        light(() => {
          for (let i = 0; i < 20; i++) {
            const on = (Math.floor(s.t * 8) + i) % 4 === 0;
            glow(842 + i * 14.5, 196, 10, on ? "rgba(255,240,170,1)" : "rgba(255,150,220,.5)", on ? 1 : 0.5);
          }
        });
      traffic(620, 1672, 588, 6, 1);
      light(() => glow(730, 300, 60, "rgba(255,200,120,.5)", 0.6));
    },
    // 2 · Avenida de los rascacielos: tres pantallas LED, semáforo y autos.
    () => {
      screen(1, [[230, 136], [436, 83], [437, 204], [227, 245]], 0);
      screen(1, [[649, 160], [868, 205], [868, 302], [645, 273]], 1);
      screen(1, [[1116, 185], [1272, 129], [1273, 250], [1114, 289]], 2);
      const c = Math.floor((s.t % 12) / 4);
      light(() => glow(786, 372 + c * 9, 22, ["rgba(255,50,40,1)", "rgba(255,190,40,1)", "rgba(60,255,120,1)"][c], 0.9));
      traffic(0, 1672, 580, 8, 2);
      steam(1420, 590, 5, 90, 12, 0.18);
    },
    // 3 · El callejón del gato: cartel HOTEL con una letra rota, vapor y ojos en la oscuridad.
    () => {
      const f = flick(s.t, 2.1);
      light(() => glow(1158, 210, 190, "rgba(255,40,40,.4)", f * 0.75));
      const broken = flick(s.t, 7.7, 2.4);
      dim(1112, 170, 90, 76, broken < 0.5 ? 0.7 : 0, "20,0,0");
      steam(528, 572, 6, 120, 16, 0.28, 0.28);
      light(() => {
        glow(692, 398, 70, "rgba(255,200,120,.7)", 0.45 + 0.15 * flick(s.t, 4));
        glow(1548, 398, 60, "rgba(255,200,120,.7)", 0.4);
      });
      if (!s.catOut) {
        const blink = (s.t % 4.3) < 0.14;
        if (!blink)
          light(() => {
            glow(1010, 580, 14, "rgba(255,230,80,1)", 0.9);
            glow(1028, 580, 14, "rgba(255,230,80,1)", 0.9);
          });
      }
    },
    // 4 · La puerta del barrio chino: dragón con energía y farolitos.
    () => {
      dragonPulse(1385, 10, 205, 430, 0.5);
      for (const [x, y, k] of [[367, 293, 0], [590, 291, 1], [880, 300, 2], [1093, 317, 3], [1273, 260, 4], [1573, 220, 5]]) lantern(x, y, k);
      light(() => glow(164, 390, 60, "rgba(255,200,120,.7)", 0.5));
    },
    // 5 · Calle de los farolitos: dragón, cuenco de neón, gato de la suerte y vapores.
    () => {
      dragonPulse(113, 10, 207, 430, 2.2);
      const f = flick(s.t, 3.3);
      light(() => glow(1160, 350, 70, "rgba(255,60,60,.6)", f * 0.7));
      dim(1125, 315, 70, 70, (1 - f) * 0.5, "30,0,0");
      for (const [x, y, k] of [[790, 156, 0], [1080, 274, 1], [1260, 280, 2], [1440, 320, 3]]) lantern(x, y, k + 7);
      light(() => glow(1024, 506, 26, "rgba(255,230,140,.8)", 0.4 + 0.4 * Math.max(0, Math.sin(s.t * 3))));
      steam(720, 470, 6, 90, 12, 0.26);
      steam(1240, 510, 6, 90, 12, 0.26);
      for (const [x, y0, y1, k] of [[660, 40, 280, 1], [864, 30, 190, 2], [1200, 120, 280, 3], [1280, 210, 340, 4]]) {
        const ff = flick(s.t, k * 4.1, 1.3);
        light(() => glow(x, (y0 + y1) / 2, (y1 - y0) * 0.7, "rgba(255,80,200,.25)", ff * 0.6));
      }
    },
    // 6 · El mercado nocturno: pantalla, farolitos, guirnaldas y burbujas en las peceras.
    () => {
      screen(5, [[739, 202], [1046, 174], [1047, 298], [738, 313]], 3);
      for (const [x, y, k] of [[200, 100, 0], [671, 187, 1], [1147, 133, 2], [1620, 220, 3]]) lantern(x, y, k + 12);
      if (s.fx) {
        for (const [x0, x1, y0, y1] of [[300, 380, 380, 450], [520, 680, 430, 490], [790, 890, 450, 490], [910, 1020, 440, 490], [1180, 1300, 410, 480]]) {
          for (let k = 0; k < 4; k++) {
            const q = (s.t * 0.45 + k / 4 + x0 * 0.01) % 1;
            const [x, y] = P(x0 + (x1 - x0) * hash(k + x0) + Math.sin(q * 9) * 3, y1 - q * (y1 - y0));
            g.strokeStyle = `rgba(200,255,255,${0.7 * (1 - q)})`;
            g.lineWidth = 1;
            g.beginPath();
            g.arc(x, y, 1.6 + q * 1.5, 0, TAU);
            g.stroke();
          }
          light(() => glow((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.6, "rgba(40,220,255,.25)", 0.5 + 0.2 * Math.sin(s.t * 1.4 + x0)));
        }
        light(() => {
          for (let i = 0; i < 24; i++) {
            const tw = Math.sin(s.t * 3 + i * 1.7) > 0.6;
            if (tw) glow(420 + i * 45, 70 + Math.sin(i * 0.8) * 30, 9, "rgba(255,230,150,1)", 0.7);
          }
        });
      }
    },
    // 7 · Escaleras de incendio: ropa tendida que flamea y farolitos.
    () => {
      sway(1108, 140, 290, 100, 0.06 + s.wind * 0.12, 6, 0);
      for (const [x, y, k] of [[88, 140, 0], [169, 213, 1]]) lantern(x, y, k + 20);
      light(() => glow(1045, 540, 40, "rgba(255,190,90,.6)", 0.3 + 0.2 * flick(s.t, 9)));
    },
    // 8 · Las azoteas: luna, ropa tendida, luces de aviación y tanques de agua.
    () => {
      light(() => glow(1177, 100, 170, "rgba(200,220,255,.35)", 0.6 + 0.1 * Math.sin(s.t * 0.7)));
      sway(298, 170, 150, 70, 0.07 + s.wind * 0.12, 4, 1);
      const on = Math.sin(s.t * 3.1) > 0.6;
      if (on) light(() => [[868, 52], [548, 262], [1308, 190]].forEach(([x, y]) => glow(x, y, 16, "rgba(255,40,40,1)", 1)));
    },
    // 9 · Entre carteles gigantes: dos pantallas, taza, estrella y rayo de neón con chispas.
    () => {
      light(() => glow(251, 100, 150, "rgba(200,220,255,.3)", 0.6));
      screen(8, [[704, 64], [978, 74], [982, 260], [702, 255]], 4);
      screen(8, [[1182, 93], [1479, 58], [1481, 249], [1180, 271]], 5);
      const fc = flick(s.t, 5.5),
        fs = flick(s.t, 6.6, 1.4),
        fb = flick(s.t, 8.8, 2);
      light(() => {
        glow(578, 140, 160, "rgba(60,170,255,.35)", fc * 0.7);
        glow(1073, 186, 120, "rgba(255,190,40,.35)", fs * 0.7);
        glow(1578, 170, 140, "rgba(255,200,40,.4)", fb * 0.75);
      });
      dim(1520, 60, 115, 220, (1 - fb) * 0.45, "15,10,0");
      // La estrella late como un cartel de casino.
      if (s.fx) light(() => glow(1073, 186, 60, "rgba(255,240,170,.9)", Math.max(0, Math.sin(s.t * 4)) * 0.5));
      sparks(1600, 282, 0.2);
      sparks(1600, 282, 0.7);
      light(() => [[50, 360], [210, 390]].forEach(([x, y], i) => Math.sin(s.t * 2.7 + i) > 0.5 && glow(x, y - 40, 12, "rgba(255,40,40,1)", 1)));
    },
    // 10 · Café 24 horas: letras de neón, taza humeante, vapor de la cafetera y lámparas.
    () => {
      const f = flick(s.t, 4.4);
      light(() => glow(800, 200, 330, "rgba(255,150,40,.3)", f * 0.7));
      const letter = Math.floor(s.t / 7) % 7;
      dim(552 + letter * 70, 156, 66, 86, flick(s.t, 12.1, 3) < 0.5 ? 0.62 : 0, "25,10,0");
      if (s.fx)
        light(() => {
          for (let i = 0; i < 3; i++) {
            g.beginPath();
            for (let y = 0; y < 44; y += 4) {
              const [x, yy] = P(1160 + i * 18 + Math.sin(y * 0.18 + s.t * 3 + i) * 6, 112 - y);
              y === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
            }
            g.globalAlpha = 0.5 + 0.5 * Math.sin(s.t * 2 + i);
            g.strokeStyle = "rgba(255,150,50,.3)";
            g.lineWidth = 7;
            g.stroke();
            g.strokeStyle = "rgba(255,190,90,.9)";
            g.lineWidth = 2.5;
            g.stroke();
          }
          g.globalAlpha = 1;
        });
      steam(748, 345, 6, 70, 10, 0.32, 0.4);
      light(() => [[452, 320], [1124, 324], [1408, 280], [562, 100], [828, 100], [978, 100]].forEach(([x, y], i) => glow(x, y, 46, "rgba(255,200,120,.7)", 0.45 + 0.1 * Math.sin(s.t + i))));
    },
    // 11 · El puente al amanecer: faroles que se apagan a tu paso, gaviotas y sol que sube.
    () => {
      light(() => glow(1267, 400, 260 + s.dawn * 60, "rgba(255,170,80,.35)", 0.5 + s.dawn * 0.4));
      for (const [x, y] of [[296, 287], [687, 300], [1044, 287], [244, 410], [200, 440]]) {
        const [sx] = P(x, y);
        const off = Math.max(0, Math.min(1, (s.playerSX - sx - 40) / 220));
        const flickerOff = off > 0 && off < 0.6 ? (hash(Math.floor(s.t * 20) + x) > 0.5 ? 1 : 0.2) : 1 - off;
        light(() => glow(x, y, 80, "rgba(255,220,140,.75)", flickerOff * 0.75));
        if (off > 0.3) dim(x - 14, y - 22, 28, 34, Math.min(0.55, off * 0.6), "20,14,30");
      }
      light(() => [[916, 44], [1388, 150], [1580, 180]].forEach(([x, y], i) => glow(x, y, 60, "rgba(255,210,130,.7)", 0.5 + 0.1 * Math.sin(s.t * 2 + i))));
      light(() => glow(1360, 270, 110, "rgba(255,120,200,.25)", 0.5 + 0.2 * flick(s.t, 13)));
      light(() => glow(50, 200, 90, "rgba(255,150,40,.35)", flick(s.t, 14) * 0.7));
      gulls(5, 90, 3);
    },
    // 12 · El cartel de la vaca: la pelea final ocurre bajo este cartel.
    () => billboard(),
  ];
  function billboard() {
    const b = s.boss || {},
      breaks = b.breaks || 0,
      intro = b.state === "intro" ? b.t : 99,
      deadT = b.state === "dead" ? b.t : -1;
    // Apagón del cartel: cuando la vaca despierta y cuando cae derrotada (luego vuelve a encenderse).
    let power = 1;
    if (intro < 1.3) power = intro < 0.25 ? (Math.floor(intro * 30) % 2 ? 0.2 : 1) : 0.05;
    else if (intro < 1.8) power = hash(Math.floor(s.t * 25)) > 0.4 ? 1 : 0.2;
    if (deadT >= 0) power = deadT < 0.6 ? (hash(Math.floor(s.t * 30)) > 0.5 ? 1 : 0.1) : deadT < 2.4 ? 0.05 : Math.min(1, (deadT - 2.4) * 2);
    const wild = breaks >= 3 && !s.won ? flick(s.t, 21, 3) : 1;
    power *= wild;
    // Lámparas superiores con conos de luz.
    light(() => {
      for (const [x, y] of [[478, 50], [678, 40], [918, 40], [1188, 40]]) {
        glow(x, y, 50, "rgba(255,230,160,.9)", power * 0.7);
        const [a, c] = P(x, y);
        const gr = g.createLinearGradient(0, c, 0, c + 160 * SY);
        gr.addColorStop(0, `rgba(255,230,170,${0.16 * power})`);
        gr.addColorStop(1, "rgba(255,230,170,0)");
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(a - 10, c);
        g.lineTo(a + 10, c);
        g.lineTo(a + 70 * SX, c + 160 * SY);
        g.lineTo(a - 70 * SX, c + 160 * SY);
        g.fill();
      }
      glow(700, 190, 420, "rgba(255,60,190,.3)", power * (0.6 + 0.15 * Math.sin(s.t * 2.2)));
      // Rayos laterales que destellan en secuencia.
      for (let i = 0; i < 4; i++) if ((Math.floor(s.t * 5) % 5) === i) glow(1222, 140 + i * 28, 30, "rgba(255,120,220,1)", power * 0.9);
    });
    // Parpadeo del ojo abierto (al ganar, la vaca del cartel guiña: ¡Granja La Esperanza te espera!).
    const blinkCycle = s.won ? (s.winTime % 2.2) < 0.5 : (s.t % 4.6) < 0.13;
    if (blinkCycle && s.eyelid) {
      const [x, y] = P(1122, 115);
      g.fillStyle = s.eyelid;
      g.beginPath();
      g.ellipse(x, y, 15 * SX, 17 * SY, 0, 0, TAU);
      g.fill();
      g.strokeStyle = "#3a1e16";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(x, y - 4, 11 * SX, 0.25, Math.PI - 0.25);
      g.stroke();
    }
    // La campana brilla.
    if (s.fx && Math.sin(s.t * 1.3) > 0.85) light(() => glow(1095, 290, 26, "rgba(255,240,170,1)", 0.9));
    // Daños: cada 25 % de vida perdida por la vaca se apaga una parte del cartel.
    const dark = (x, y, w, h, a) => dim(x, y, w, h, a, "18,4,22");
    if (power < 0.95) {
      dark(420, 90, 830, 220, (1 - power) * 0.7);
    }
    if (breaks >= 1 && !s.won) {
      dark(663, 98, 76, 104, 0.7);
      sparks(700, 200, 0.1);
    }
    if (breaks >= 2 && !s.won) {
      dark(428, 205, 94, 90, flick(s.t, 17, 2.5) < 0.5 ? 0.8 : 0.55);
      sparks(470, 290, 0.5);
    }
    if (breaks >= 3 && !s.won) {
      dark(620, 205, 200, 90, 0.65);
      sparks(820, 260, 0.8);
      sparks(1200, 220, 0.35);
    }
    // Sol que asoma detrás de la ciudad.
    light(() => glow(948, 440, 220 + Math.sin(s.t * 0.5) * 10, "rgba(255,190,90,.45)", 0.75));
    gulls(4, 300, 7);
  }
  root.MilkLevel3City = {
    /* Toma el color de la piel de la vaca del cartel para pintar su párpado. */
    prepare(bg12) {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 1;
        const x = c.getContext("2d");
        x.drawImage(bg12, 1110, 88, 6, 6, 0, 0, 1, 1);
        const d = x.getImageData(0, 0, 1, 1).data;
        return `rgb(${d[0]},${d[1]},${d[2]})`;
      } catch {
        return "#f3e6dc";
      }
    },
    /* state: { t, fx, wind, dawn, boss, won, winTime, catOut, playerSX, bottle, cowIdle, eyelid, tiles, bgCamX, camY } */
    draw(ctx, state, first, last) {
      g = ctx;
      s = state;
      for (let i = first; i <= last; i++) {
        O = { x: (i * 1170 - s.bgCamX) * 0.9, y: -s.camY * 0.25 };
        if (O.x > 1290 || O.x < -1290) continue;
        tileCanvas = s.tiles[i];
        try {
          LIFE[i]();
        } catch (e) {
          g.restore?.();
        }
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    },
  };
})(window);
