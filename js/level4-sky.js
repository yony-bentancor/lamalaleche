/* Nivel 4 · El cielo vivo. Anima lo que está pintado en los 13 fondos (12 + el cielo despejado del final):
   neón y vapor del último techo, cargas colgantes que se mecen, vapor que sube en espiral, capas de nubes,
   molinos y cascadas, mangas de viento, la tormenta con relámpagos, niebla entre los restos de dirigibles,
   el haz de luz del ojo de la tormenta, hélices y luces del puerto, papeles aspirados por la tormenta y
   el remolino de la arena, que se abre al ganar. Coordenadas en píxeles de la ilustración (1672×941). */
(function (root) {
  "use strict";
  const SX = 1280 / 1672,
    TAU = Math.PI * 2;
  const hash = (n) => {
    const s = Math.sin(n * 12.9898) * 43758.5453;
    return s - Math.floor(s);
  };
  let g = null,
    s = null,
    O = { x: 0, y: 0 },
    floorRow = 700,
    tileCanvas = null;
  // La fila del piso de cada fondo cae exactamente en el piso del juego (520).
  const mapY = (ys) => (ys < floorRow ? (ys * 520) / floorRow : 520 + ((ys - floorRow) * 200) / (941 - floorRow));
  const P = (xs, ys) => [O.x + xs * SX, O.y + mapY(ys)];
  function light(fn) {
    g.save();
    g.globalCompositeOperation = "lighter";
    fn();
    g.restore();
  }
  function glow(xs, ys, r, color, a = 1) {
    if (a <= 0.01) return;
    const [x, y] = P(xs, ys),
      R = r * SX;
    const gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = Math.min(1, a);
    g.fillStyle = gr;
    g.fillRect(x - R, y - R, R * 2, R * 2);
    g.globalAlpha = 1;
  }
  function steam(xs, ys, n = 5, rise = 90, alpha = 0.25, speed = 0.3, color = "#eef2f7") {
    if (!s.fx) return;
    for (let k = 0; k < n; k++) {
      const q = (s.t * speed + k / n + xs * 0.001) % 1;
      const [x, y] = P(xs + Math.sin(q * 6 + k) * 10 * q + s.wind * 60 * q, ys - q * rise);
      g.globalAlpha = (1 - q) * q * 4 * alpha;
      g.fillStyle = color;
      g.beginPath();
      g.arc(x, y, (5 + q * 22) * SX, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  /* Cargas que cuelgan del dirigible: se redibuja el recorte con un vaivén alrededor de la cuerda. */
  function hang(xs, ys, w, h, seed, amp = 0.05) {
    if (!s.fx || !tileCanvas) return;
    const a = Math.sin(s.t * 1.4 + seed) * amp + s.wind * 0.03;
    const [x, y] = P(xs, 0);
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.drawImage(tileCanvas, (xs - w / 2) * SX, 0, w * SX, mapY(ys + h / 2), (-w / 2) * SX, 0, w * SX, mapY(ys + h / 2));
    g.restore();
  }
  /* Aspas en movimiento: estelas curvas alrededor del eje (sin tapar el dibujo original). */
  function spin(xs, ys, r, speed, color = "rgba(255,255,255,.35)", blades = 4) {
    if (!s.fx) return;
    const [x, y] = P(xs, ys),
      R = r * SX;
    g.save();
    g.strokeStyle = color;
    g.lineCap = "round";
    for (let b = 0; b < blades; b++) {
      const a = s.t * speed + (b / blades) * TAU;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(x, y, R * 0.92, a, a + 0.55);
      g.stroke();
      g.lineWidth = 1.5;
      g.globalAlpha = 0.6;
      g.beginPath();
      g.arc(x, y, R * 0.65, a + 0.1, a + 0.45);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
  }
  function bolt(x0, y0, x1, y1, seed, width = 3, color = "rgba(225,215,255,1)") {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.shadowColor = "rgba(180,150,255,.9)";
    g.shadowBlur = 0;
    g.beginPath();
    g.moveTo(x0, y0);
    const n = 9;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      g.lineTo(x0 + (x1 - x0) * k + (i < n ? (hash(seed + i) - 0.5) * 46 : 0), y0 + (y1 - y0) * k);
    }
    g.stroke();
    g.globalAlpha = 0.35;
    g.lineWidth = width * 4;
    g.stroke();
    g.restore();
  }
  function stormFlashes(x0, x1, y0, y1, seed, rate = 1) {
    // Relámpagos dentro de la masa de nubes: destello + rayo ramificado.
    const cyc = (s.t * 0.22 * rate + seed) % 1;
    if (cyc > 0.06) return;
    const k = cyc / 0.06,
      id = Math.floor(s.t * 0.22 * rate + seed);
    const xs = x0 + hash(id * 3.1) * (x1 - x0);
    light(() => glow(xs, y0 + (y1 - y0) * 0.4, 380, "rgba(190,170,255,.55)", 1 - k));
    if (k < 0.5) {
      const [a, b] = P(xs, y0),
        [c, d] = P(xs + (hash(id) - 0.5) * 200, y1);
      bolt(a, b, c, d, id * 7);
    }
  }
  function rainBand(xs0, xs1, alpha) {
    if (!s.fx) return;
    const [a] = P(xs0, 0),
      [b] = P(xs1, 0);
    g.save();
    g.beginPath();
    g.rect(a, 0, b - a, 720);
    g.clip();
    g.strokeStyle = `rgba(200,210,255,${alpha})`;
    g.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x = a + ((i * 97 + s.t * 60) % (b - a + 40)),
        y = (i * 53 + s.t * 700) % 720;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 6, y + 20);
      g.stroke();
    }
    g.restore();
  }
  function lamp(xs, ys, r = 50, color = "rgba(255,200,120,.75)", seed = 0) {
    light(() => glow(xs, ys, r, color, 0.55 + 0.2 * Math.sin(s.t * 2.2 + seed)));
  }
  function cloudDrift(y, h, alpha, speed, seed, tint = "255,255,255") {
    // Velos de nubes que pasan en primer plano del fondo (capas a distinta velocidad).
    if (!s.fx) return;
    for (let i = 0; i < 4; i++) {
      const w = 420 + hash(i + seed) * 260;
      const xs = ((i * 520 + s.t * speed + seed * 300) % 2200) - 300;
      const [x, yy] = P(xs, y + hash(i * 7 + seed) * h);
      const gr = g.createRadialGradient(x, yy, 0, x, yy, w * SX * 0.5);
      gr.addColorStop(0, `rgba(${tint},${alpha})`);
      gr.addColorStop(1, `rgba(${tint},0)`);
      g.save();
      g.translate(x, yy);
      g.scale(1, 0.28);
      g.translate(-x, -yy);
      g.fillStyle = gr;
      g.fillRect(x - w * SX * 0.5, yy - w * SX * 0.5, w * SX, w * SX);
      g.restore();
    }
  }
  const LIFE = [
    // 1 · El último techo: neón del cartel, vapor de ventilación, antenas y ventanas.
    () => {
      light(() => glow(190, 230, 260, "rgba(255,70,190,.3)", 0.55 + 0.25 * Math.sin(s.t * 2.4)));
      steam(410, 470, 6, 140, 0.3);
      steam(500, 500, 5, 120, 0.25, 0.36);
      steam(1260, 520, 4, 90, 0.2);
      if (Math.sin(s.t * 3) > 0.4) light(() => [[1620, 340], [1660, 360], [1585, 470]].forEach(([x, y]) => glow(x, y, 16, "rgba(255,40,40,1)", 1)));
      light(() => glow(1500, 430, 260, "rgba(255,190,110,.32)", 0.7 + 0.1 * Math.sin(s.t * 0.6)));
      if (s.fx)
        light(() => {
          for (let i = 0; i < 14; i++) if (Math.sin(s.t * (0.7 + hash(i) * 0.6) + i * 3) > 0.7) glow(560 + hash(i * 5) * 900, 320 + hash(i * 9) * 220, 10, "rgba(255,220,140,.9)", 0.8);
        });
      cloudDrift(80, 140, 0.1, 18, 1, "255,200,220");
    },
    // 2 · La ciudad bajo los pies: cargas y cintas que se mecen con la brisa.
    () => {
      [[108, 120, 150, 230, 0], [388, 160, 170, 260, 1.1], [658, 140, 150, 240, 2.2], [1148, 140, 150, 240, 0.6], [1318, 80, 110, 170, 1.7], [1528, 170, 170, 260, 2.9]].forEach(([x, y, w, h, sd]) => hang(x, y, w, h, sd, 0.045));
      light(() => glow(248, 460, 230, "rgba(255,200,120,.35)", 0.6));
      cloudDrift(380, 160, 0.16, 26, 2);
      steam(1600, 600, 3, 60, 0.12);
    },
    // 3 · La primera corriente: hebras de vapor que suben en espiral y partículas doradas.
    () => {
      light(() => glow(340, 160, 260, "rgba(255,210,120,.4)", 0.7));
      if (s.fx) {
        g.save();
        g.strokeStyle = "rgba(255,245,220,.35)";
        g.lineWidth = 2;
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          for (let y = 0; y < 520; y += 12) {
            const ys = 640 - y;
            const [x, yy] = P(620 + k * 26 + Math.sin(ys * 0.02 + s.t * 1.5 + k) * 24, ys - ((s.t * 40) % 12));
            y === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
          }
          g.stroke();
        }
        g.restore();
        light(() => {
          for (let i = 0; i < 26; i++) {
            const q = (s.t * 0.12 + hash(i)) % 1;
            glow(560 + hash(i * 3) * 260, 640 - q * 600, 6, "rgba(255,230,160,.9)", (1 - q) * 0.9);
          }
        });
      }
      light(() => [[290, 300], [1490, 240]].forEach(([x, y], i) => glow(x, y - 40, 30, "rgba(255,90,60,1)", Math.sin(s.t * 2.5 + i) > 0.3 ? 0.9 : 0)));
      cloudDrift(420, 200, 0.18, 30, 3, "255,235,200");
    },
    // 4 · Un océano blanco: tres capas de nubes y el dirigible que se aleja.
    () => {
      cloudDrift(300, 120, 0.22, 14, 4);
      cloudDrift(420, 140, 0.25, 30, 5);
      cloudDrift(560, 80, 0.3, 50, 6);
      light(() => glow(1048, 200, 50, "rgba(255,240,200,.6)", 0.4 + 0.2 * Math.sin(s.t * 3)));
      if (s.fx) light(() => [[1500, 470], [1600, 380], [1650, 520]].forEach(([x, y], i) => glow(x, y + Math.sin(s.t + i) * 6, 26, "rgba(200,255,200,.35)", 0.6)));
    },
    // 5 · Los molinos del aire: aspas, banderines, cascadas y hojas.
    () => {
      spin(180, 260, 120, 2.2, "rgba(255,255,255,.45)");
      spin(1450, 290, 130, 2.6, "rgba(255,255,255,.45)");
      spin(380, 190, 50, 3, "rgba(255,255,255,.35)");
      spin(1260, 360, 55, 2.8, "rgba(255,255,255,.35)");
      if (s.fx) {
        g.save();
        g.strokeStyle = "rgba(255,255,255,.55)";
        g.lineWidth = 1.5;
        for (const [x, y0, y1] of [[400, 330, 560], [600, 260, 420], [1420, 420, 650], [1980 - 400, 300, 480]]) {
          for (let k = 0; k < 4; k++) {
            const q = (s.t * 1.2 + k / 4) % 1;
            const [a, b] = P(x + k * 4 - 6, y0 + (y1 - y0) * q),
              [, d] = P(x, y0 + (y1 - y0) * Math.min(1, q + 0.1));
            g.beginPath();
            g.moveTo(a, b);
            g.lineTo(a, d);
            g.stroke();
          }
        }
        g.restore();
        for (let i = 0; i < 10; i++) {
          const q = (s.t * 0.1 + hash(i)) % 1;
          const [x, y] = P(1700 - q * 1800, 120 + hash(i * 4) * 400 + Math.sin(s.t * 3 + i) * 20);
          g.fillStyle = ["#7fbf4a", "#9ccf5a", "#5f9e3a"][i % 3];
          g.save();
          g.translate(x, y);
          g.rotate(s.t * 4 + i);
          g.beginPath();
          g.ellipse(0, 0, 6, 3, 0, 0, TAU);
          g.fill();
          g.restore();
        }
      }
      cloudDrift(520, 80, 0.2, 40, 7);
    },
    // 6 · El corredor de las ráfagas: faroles, tormenta violeta que late y nubes empujadas.
    () => {
      [[164, 500], [368, 570], [1552, 580]].forEach(([x, y], i) => lamp(x, y, 46, "rgba(255,200,110,.8)", i));
      stormFlashes(1300, 1672, 60, 420, 0.3, 0.7);
      light(() => glow(1500, 260, 320, "rgba(160,110,255,.18)", 0.6 + 0.3 * Math.sin(s.t * 1.2)));
      cloudDrift(300, 240, 0.18 + Math.max(0, -s.wind) * 0.2, 40 - s.wind * 300, 8);
    },
    // 7 · La frontera oscura: el sol de la izquierda, relámpagos y lluvia a la derecha.
    () => {
      light(() => glow(100, 280, 320, "rgba(255,190,90,.4)", 0.7));
      stormFlashes(900, 1672, 40, 460, 0.1, 1.4);
      stormFlashes(1000, 1600, 80, 400, 0.6, 1.1);
      rainBand(760, 1672, 0.32);
      [[1140, 690], [1500, 700], [940, 720]].forEach(([x, y], i) => lamp(x, y, 40, "rgba(255,190,100,.7)", i + 2));
    },
    // 8 · El cementerio de los dirigibles: niebla, faroles, hélices quietas que crujen.
    () => {
      cloudDrift(380, 300, 0.22, 22, 9, "210,205,235");
      cloudDrift(600, 120, 0.25, 36, 10, "220,215,240");
      [[108, 530], [208, 230], [168, 790], [700, 780], [1180, 790], [1520, 780]].forEach(([x, y], i) => lamp(x, y, 40, "rgba(255,190,100,.75)", i * 1.7));
      spin(1388, 240, 80, 0.4, "rgba(230,230,255,.18)", 3);
      spin(150, 160, 70, 0.6, "rgba(230,230,255,.18)", 3);
      rainBand(0, 1672, 0.18);
      stormFlashes(500, 1500, 0, 200, 0.4, 0.6);
    },
    // 9 · El ojo de la tormenta: haz de luz, guirnalda de boyas y la estación a lo lejos.
    () => {
      if (s.fx) {
        light(() => {
          for (let k = 0; k < 5; k++) {
            const a = 0.1 + 0.06 * Math.sin(s.t * 0.8 + k);
            const [x0, y0] = P(760 + k * 40, 0),
              [x1, y1] = P(620 + k * 70, 600);
            const gr = g.createLinearGradient(0, y0, 0, y1);
            gr.addColorStop(0, `rgba(255,240,200,${a})`);
            gr.addColorStop(1, "rgba(255,240,200,0)");
            g.fillStyle = gr;
            g.beginPath();
            g.moveTo(x0 - 20, y0);
            g.lineTo(x0 + 20, y0);
            g.lineTo(x1 + 60, y1);
            g.lineTo(x1 - 60, y1);
            g.fill();
          }
          for (let i = 0; i < 24; i++) {
            const q = (s.t * 0.05 + hash(i)) % 1;
            glow(640 + hash(i * 2) * 420, 560 - q * 520, 5, "rgba(255,245,210,.9)", Math.sin(q * Math.PI));
          }
        });
      }
      [[1100, 470], [1200, 500], [1290, 495], [1390, 470], [1500, 450], [1590, 440]].forEach(([x, y], i) => lamp(x, y, 26, "rgba(255,200,110,.9)", i * 0.8));
      lamp(690, 400, 60);
      if (Math.sin(s.t * 2) > 0.5) light(() => glow(1360, 300, 30, "rgba(255,230,160,.8)", 0.8));
      stormFlashes(0, 300, 100, 600, 0.2, 0.8);
      stormFlashes(1400, 1672, 100, 600, 0.7, 0.8);
    },
    // 10 · El puerto suspendido: hélices, faroles, globitos y la grúa.
    () => {
      [[1180, 470, 90], [1290, 470, 90], [1460, 530, 110], [1610, 530, 110], [530, 860, 120], [1200, 870, 130]].forEach(([x, y, r], i) => spin(x, y, r, 6 + i, "rgba(255,240,220,.3)", 2));
      [[198, 580], [708, 580], [1000, 560], [1450, 330]].forEach(([x, y], i) => lamp(x, y, 40, "rgba(255,200,120,.8)", i));
      if (s.fx)
        light(() => [[68, 200], [120, 380], [480, 300]].forEach(([x, y], i) => glow(x, y + Math.sin(s.t * 1.3 + i) * 8, 26, "rgba(255,170,90,.7)", 0.6)));
      steam(1560, 300, 4, 70, 0.22);
      steam(820, 640, 4, 70, 0.18);
      cloudDrift(380, 160, 0.16, 20, 11, "255,225,200");
    },
    // 11 · El último amarre: papeles aspirados, faroles que fallan y la nube que respira.
    () => {
      const breath = 0.5 + 0.5 * Math.sin(s.t * 0.9);
      g.fillStyle = `rgba(30,10,60,${0.12 * breath})`;
      g.fillRect(O.x + 300 * SX, 0, 1000 * SX, mapY(700));
      stormFlashes(500, 1300, 40, 380, 0.5, 0.9);
      [[120, 340], [110, 600], [1600, 360], [1560, 640]].forEach(([x, y], i) => {
        const on = hash(Math.floor(s.t * 8) + i * 13) > 0.18;
        if (on) lamp(x, y, 40, "rgba(255,190,100,.8)", i);
      });
      if (s.fx) {
        for (let i = 0; i < 12; i++) {
          const q = (s.t * (0.08 + hash(i) * 0.06) + hash(i * 3)) % 1;
          const xs = 300 + q * 700 + Math.sin(q * 9 + i) * 40,
            ys = 400 - q * 260 + Math.sin(s.t * 3 + i) * 20;
          const [x, y] = P(xs, ys);
          g.save();
          g.translate(x, y);
          g.rotate(s.t * 5 + i);
          g.scale(Math.abs(Math.sin(s.t * 4 + i)) + 0.2, 1);
          g.globalAlpha = 1 - q;
          g.fillStyle = "#f0ead8";
          g.fillRect(-6, -8, 12, 16);
          g.restore();
        }
        g.globalAlpha = 1;
      }
    },
    // 12 · El Capitán Cúmulo: remolino de nubes, hélices laterales y el sol sobre la granja.
    () => arena(),
  ];
  function arena() {
    const clear = s.clear || 0,
      phase = s.boss ? s.boss.phase || 1 : 1;
    spin(128, 260, 190, 4 + phase, "rgba(255,240,220,.28)", 3);
    spin(1548, 300, 190, 4 + phase, "rgba(255,240,220,.28)", 3);
    if (s.fx && clear < 1) {
      // Remolino alrededor de la abertura: arcos que giran más rápido en cada fase.
      const [cx, cy] = P(930, 230);
      g.save();
      g.globalAlpha = 1 - clear;
      for (let k = 0; k < 14; k++) {
        const r = (160 + k * 26) * SX,
          a = s.t * (0.25 + phase * 0.12) * (k % 2 ? 1 : -1) + k;
        g.strokeStyle = phase >= 3 ? `rgba(255,120,150,${0.12 + (k % 3) * 0.04})` : `rgba(200,180,255,${0.12 + (k % 3) * 0.04})`;
        g.lineWidth = 3 + (k % 3);
        g.beginPath();
        g.ellipse(cx, cy, r, r * 0.72, 0, a, a + 1.2);
        g.stroke();
      }
      g.restore();
      stormFlashes(0, 600, 0, 400, 0.15, 0.6 + phase * 0.4);
      stormFlashes(1100, 1672, 0, 400, 0.65, 0.6 + phase * 0.4);
    }
    light(() => glow(930, 250, 300, "rgba(255,210,130,.35)", 0.5 + clear * 0.4 + 0.1 * Math.sin(s.t)));
    [[60, 760], [1610, 760], [420, 860], [1250, 860]].forEach(([x, y], i) => lamp(x, y, 40, "rgba(255,200,120,.8)", i));
  }
  root.MilkLevel4Sky = {
    draw(ctx, state, first, last) {
      g = ctx;
      s = state;
      for (let i = first; i <= last; i++) {
        O = { x: (i * 1170 - s.bgCamX) * 0.9, y: -s.camY * 0.25 };
        if (O.x > 1290 || O.x < -1290) continue;
        floorRow = s.floors[i];
        tileCanvas = s.tiles[i];
        g.save();
        try {
          LIFE[i]();
        } catch (e) {
          if (!s.warned) {
            s.warned = true;
            console.warn(e);
          }
        }
        g.restore();
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    },
    mapY: (ys, row) => (ys < row ? (ys * 520) / row : 520 + ((ys - row) * 200) / (941 - row)),
  };
})(window);
