/* V4: dibujo del contenido nuevo. Usa MilkDesigns, así cada pieza se puede reemplazar por una imagen. */
(function (root) {
  "use strict";
  const FLOOR = 520,
    W = 1280;
  const D = () => root.MilkDesigns;
  const vis = (x, cx, pad = 160) => x - cx > -pad && x - cx < W + pad;

  // Haces de sol que entran por las ventanas: calientan la leche.
  function sun(g, X, cx, cy, t) {
    g.save();
    g.globalCompositeOperation = "screen";
    for (const s of X.L.sun) {
      const x = s.x - cx;
      if (x > W + 300 || x + s.w < -300) continue;
      const shift = 150;
      const grad = g.createLinearGradient(0, -cy, 0, FLOOR - cy);
      const flick = 0.85 + Math.sin(t * 1.3 + s.x) * 0.08;
      grad.addColorStop(0, `rgba(255,236,170,${0.05 * flick})`);
      grad.addColorStop(1, `rgba(255,214,120,${0.3 * flick})`);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(x - shift, -cy);
      g.lineTo(x + s.w - shift, -cy);
      g.lineTo(x + s.w, FLOOR - cy);
      g.lineTo(x, FLOOR - cy);
      g.fill();
      const pool = g.createRadialGradient(x + s.w / 2, FLOOR - cy, 4, x + s.w / 2, FLOOR - cy, s.w * 0.7);
      pool.addColorStop(0, `rgba(255,220,140,${0.32 * flick})`);
      pool.addColorStop(1, "rgba(255,220,140,0)");
      g.fillStyle = pool;
      g.beginPath();
      g.ellipse(x + s.w / 2, FLOOR - cy + 4, s.w * 0.7, 18, 0, 0, Math.PI * 2);
      g.fill();
      for (let i = 0; i < 10; i++) {
        const k = (t * 0.07 + i * 0.137 + s.x * 0.001) % 1,
          y = FLOOR - cy - k * 470,
          px = x + ((i * 47) % s.w) - shift * k + Math.sin(t + i) * 6;
        g.fillStyle = `rgba(255,248,210,${0.5 * Math.sin(k * Math.PI)})`;
        g.beginPath();
        g.arc(px, y, 1.4, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }
  function floorFeatures(g, X, cx, cy, t, p) {
    const y = FLOOR - cy;
    // Hielo
    for (const s of X.L.ice) {
      const x = s.x - cx;
      if (x > W || x + s.w < 0) continue;
      const grad = g.createLinearGradient(0, y, 0, y + 22);
      grad.addColorStop(0, "rgba(220,248,255,.75)");
      grad.addColorStop(1, "rgba(150,210,235,.15)");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(x + s.w / 2, y + 6, s.w / 2, 12, 0, 0, Math.PI * 2);
      g.fill();
      const sweep = ((t * 120) % (s.w + 200)) - 100;
      g.fillStyle = "rgba(255,255,255,.7)";
      g.fillRect(x + sweep, y + 2, 30, 2);
    }
    // Charcos de leche resbalosos, con onda al pisarlos
    for (const s of X.L.puddles) {
      const x = s.x - cx;
      if (x > W || x + s.w < 0) continue;
      g.fillStyle = "rgba(255,255,250,.85)";
      g.beginPath();
      g.ellipse(x + s.w / 2, y + 5, s.w / 2, 8, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(170,195,215,.8)";
      g.lineWidth = 1.5;
      g.stroke();
      g.fillStyle = "#ffffff";
      g.fillRect(x + s.w * 0.25, y + 2, s.w * 0.2, 2);
      if (p && p.x > s.x && p.x < s.x + s.w && Math.abs(p.vx) > 40) {
        const r = (t * 3) % 1;
        g.strokeStyle = `rgba(255,255,255,${1 - r})`;
        g.beginPath();
        g.ellipse(p.x - cx, y + 5, 8 + r * 30, 2 + r * 5, 0, 0, Math.PI * 2);
        g.stroke();
      }
    }
    // Cintas transportadoras sobre el piso
    for (const b of X.L.belts) {
      const x = b.x - cx;
      if (x > W || x + b.w < 0) continue;
      g.fillStyle = "#1c2833";
      g.fillRect(x, y - 2, b.w, 16);
      g.strokeStyle = "#0c141c";
      g.lineWidth = 2;
      g.strokeRect(x, y - 2, b.w, 16);
      g.save();
      g.beginPath();
      g.rect(x + 2, y, b.w - 4, 12);
      g.clip();
      const off = (((t * b.speed) % 24) + 24) % 24;
      g.fillStyle = "#f5c518";
      for (let k = -24; k < b.w + 24; k += 24) {
        const kx = x + k + off,
          d = Math.sign(b.speed);
        g.beginPath();
        g.moveTo(kx, y + 1);
        g.lineTo(kx + 6 * d, y + 6);
        g.lineTo(kx, y + 11);
        g.lineTo(kx + 4 * d, y + 11);
        g.lineTo(kx + 10 * d, y + 6);
        g.lineTo(kx + 4 * d, y + 1);
        g.fill();
      }
      g.restore();
      for (const rx of [x + 6, x + b.w - 6]) {
        g.fillStyle = "#566a7a";
        g.beginPath();
        g.arc(rx, y + 6, 7, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#0c141c";
        g.stroke();
        g.save();
        g.translate(rx, y + 6);
        g.rotate((t * b.speed) / 7);
        g.fillStyle = "#c3d0da";
        g.fillRect(-1, -6, 2, 12);
        g.restore();
      }
    }
  }
  function signs(g, X, cx, cy, t) {
    g.save();
    g.font = "bold 11px Arial";
    for (const s of X.L.signs) {
      if (!vis(s.x, cx, 200)) continue;
      const sx = s.x - cx,
        sy = FLOOR - cy,
        w = Math.max(90, g.measureText(s.text).width + 30);
      D().draw(g, "cartel", t, sx, sy, { w });
      g.textAlign = "center";
      g.fillStyle = "#f2f6f2";
      g.fillText(s.text, sx, sy - 39);
    }
    g.restore();
  }
  function fridges(g, X, cx, cy, t) {
    for (const f of X.fridges) {
      if (!vis(f.x, cx)) continue;
      const x = f.x - cx,
        y = FLOOR - cy;
      D().draw(g, "heladera", t, x, y, { open: f.open });
      if (f.open > 0.1) {
        g.save();
        for (let i = 0; i < 6; i++) {
          const k = (t * 0.6 + i / 6) % 1;
          g.fillStyle = `rgba(210,245,255,${0.35 * (1 - k) * f.open})`;
          g.beginPath();
          g.arc(x + 20 + k * 50, y - 40 + Math.sin(t * 2 + i) * 6 + k * 30, 6 + k * 16, 0, Math.PI * 2);
          g.fill();
        }
        g.restore();
      }
    }
  }
  function platformBody(g, key, s, cx, cy, t, extra = {}) {
    D().draw(g, key, t, s.x + s.w / 2 - cx, s.y - cy + 24 * (key === "plataforma_movil") + 26 * (key === "plataforma_espuma") - 2, {
      w: s.w,
      theme: s.theme,
      ...extra,
    });
  }
  function platforms(g, X, cx, cy, t) {
    for (const p of X.platforms) {
      if (!vis(p.x + p.w / 2, cx, 300)) continue;
      // Plataforma estática extra con el mismo lenguaje visual de las originales.
      const x = p.x - cx,
        y = p.y - cy;
      g.fillStyle = "#00182635";
      g.beginPath();
      g.ellipse(x + p.w / 2, FLOOR - cy + 4, p.w * 0.52, 7, 0, 0, 7);
      g.fill();
      const grad = g.createLinearGradient(0, y, 0, y + 26);
      grad.addColorStop(0, "#b1cad6");
      grad.addColorStop(0.35, "#557487");
      grad.addColorStop(1, "#243e55");
      g.fillStyle = grad;
      g.fillRect(x, y, p.w, 25);
      g.strokeStyle = "#182b35";
      g.lineWidth = 2;
      g.strokeRect(x, y, p.w, 25);
      g.fillStyle = "#d6edf0";
      g.fillRect(x + 2, y + 1, p.w - 4, 3);
      for (let k = 15; k < p.w - 5; k += 32) {
        g.fillStyle = "#152e43";
        g.beginPath();
        g.arc(x + k, y + 15, 2, 0, 7);
        g.fill();
        g.fillStyle = "#e8c35a";
        g.fillRect(x + k - 7, y + 7, 12, 3);
      }
    }
    for (const m of X.movers) {
      if (!vis(m.x + m.w / 2, cx, 300)) continue;
      // Rieles que muestran el recorrido de la plataforma.
      g.save();
      g.strokeStyle = "rgba(20,38,58,.35)";
      g.setLineDash([6, 6]);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(m.x0 - m.ax + m.w / 2 - cx, m.y0 - m.ay - cy + 12);
      g.lineTo(m.x0 + m.ax + m.w / 2 - cx, m.y0 + m.ay - cy + 12);
      g.stroke();
      g.restore();
      platformBody(g, "plataforma_movil", m, cx, cy, t);
    }
    for (const f of X.fallers) {
      if (f.state === "gone" || !vis(f.x + f.w / 2, cx, 300)) continue;
      g.save();
      const shake = f.state === "shake" ? Math.sin(t * 70) * 2.5 : 0;
      g.translate(shake, 0);
      if (f.state === "fall") g.globalAlpha = Math.max(0, 1 - (f.y - f.y0) / 250);
      platformBody(g, "plataforma_espuma", f, cx, cy, t);
      g.restore();
    }
    for (const s of X.springs) if (vis(s.x, cx)) D().draw(g, "resorte", t, s.x + s.w / 2 - cx, FLOOR - cy, { boing: s.boing });
  }
  function blocks(g, X, cx, cy, t) {
    for (const b of X.blocks) {
      if (b.gone || !b.revealed || !vis(b.x, cx)) continue;
      const lift = b.bounce > 0 ? Math.sin((b.bounce / 0.2) * Math.PI) * 10 : 0;
      const key = b.used ? "caja_usada" : b.kind === "brick" ? "ladrillo" : "caja_sorpresa";
      D().draw(g, key, t + b.id * 0.3, b.x + b.w / 2 - cx, b.y + b.h - cy - lift);
    }
  }
  function presses(g, X, cx, cy, t) {
    for (const s of X.presses) {
      if (!vis(s.x + s.w / 2, cx)) continue;
      const x = s.x + s.w / 2 - cx,
        head = s.head - cy,
        warn = s.phase === "warn";
      const jitter = warn ? Math.sin(t * 60) * 2 : 0;
      // Vástago hasta el techo
      const rod = g.createLinearGradient(x - 10, 0, x + 10, 0);
      rod.addColorStop(0, "#5c6d78");
      rod.addColorStop(0.5, "#e6eef2");
      rod.addColorStop(1, "#5c6d78");
      g.fillStyle = rod;
      g.fillRect(x - 10 + jitter, -cy - 20, 20, head - 60 + cy + 20);
      g.strokeStyle = "#14263a";
      g.lineWidth = 2;
      g.strokeRect(x - 10 + jitter, -cy - 20, 20, head - 60 + cy + 20);
      // Sombra de aviso en el piso
      const near = 1 - Math.min(1, (FLOOR - s.head) / 220);
      g.fillStyle = `rgba(10,20,30,${0.15 + near * 0.35})`;
      g.beginPath();
      g.ellipse(x, FLOOR - cy + 3, s.w * (0.35 + near * 0.25), 6, 0, 0, Math.PI * 2);
      g.fill();
      D().draw(g, "selladora", t, x + jitter, head, { w: s.w, warn });
      if (warn) {
        g.fillStyle = "#ff3b30";
        g.font = "900 18px Arial";
        g.textAlign = "center";
        g.fillText("!", x, head - 70);
      }
    }
  }
  function steamBases(g, X, cx, cy, t) {
    for (const v of X.steam) if (vis(v.x, cx)) D().draw(g, "valvula", t, v.x - cx, FLOOR - cy + 2, { cold: v.cold, warn: v.warn, on: v.on });
  }
  function steamPlumes(g, X, cx, cy, t) {
    g.save();
    for (const v of X.steam) {
      if (!vis(v.x, cx)) continue;
      const x = v.x - cx,
        y = FLOOR - cy - 18;
      if (v.warn) {
        for (let i = 0; i < 4; i++) {
          const k = (t * 2 + i / 4) % 1;
          g.fillStyle = v.cold ? `rgba(200,235,255,${0.4 * (1 - k)})` : `rgba(255,235,225,${0.4 * (1 - k)})`;
          g.beginPath();
          g.arc(x + Math.sin(i * 3 + t * 6) * 5, y - k * 30, 3 + k * 5, 0, Math.PI * 2);
          g.fill();
        }
      }
      if (v.power > 0) {
        for (let i = 0; i < 22; i++) {
          const k = (t * 2.2 + i / 22) % 1,
            r = 8 + k * 26,
            yy = y - k * 230,
            xx = x + Math.sin(k * 9 + i) * k * 16;
          const a = v.power * (1 - k) * 0.5;
          const c = g.createRadialGradient(xx, yy, 0, xx, yy, r);
          c.addColorStop(0, v.cold ? `rgba(200,240,255,${a})` : `rgba(255,250,245,${a})`);
          c.addColorStop(1, v.cold ? "rgba(160,220,255,0)" : "rgba(255,200,180,0)");
          g.fillStyle = c;
          g.fillRect(xx - r, yy - r, r * 2, r * 2);
        }
      }
    }
    g.restore();
  }
  function hazards(g, X, cx, cy, t) {
    for (const h of X.hazards) {
      if (!vis(h.x, cx)) continue;
      const x = h.x - cx;
      const key = h.kind === "caja" ? "caja_cae" : "carambano";
      if (h.state === "warn" || h.state === "fall") {
        const k = h.state === "warn" ? 1 - h.t / 0.75 : Math.min(1, 0.6 + (h.y + 60) / 900);
        g.fillStyle = `rgba(8,16,26,${0.18 + k * 0.32})`;
        g.beginPath();
        g.ellipse(x, FLOOR - cy + 3, 10 + k * 26, 3 + k * 4, 0, 0, Math.PI * 2);
        g.fill();
        if (h.state === "warn") {
          g.save();
          g.translate(Math.sin(t * 50) * 2, 0);
          D().draw(g, key, t, x, 40 - cy + 30);
          g.restore();
          g.fillStyle = "#ffd23f";
          g.font = "900 22px Arial";
          g.textAlign = "center";
          g.fillText("!", x, 130 - cy);
        }
      }
      if (h.state === "fall") D().draw(g, key, t, x, h.y - cy);
    }
  }
  function collectibles(g, X, cx, cy, t) {
    for (const d of X.drops) if (!d.taken && vis(d.x, cx, 40)) D().draw(g, "gota", t + d.t, d.x - cx, d.y - cy + 14);
    for (const c of X.caps) {
      if (c.taken || !vis(c.x, cx, 40)) continue;
      const x = c.x - cx,
        y = c.y - cy;
      g.save();
      const halo = g.createRadialGradient(x, y, 2, x, y, 40);
      halo.addColorStop(0, "rgba(255,225,120,.45)");
      halo.addColorStop(1, "rgba(255,225,120,0)");
      g.fillStyle = halo;
      g.fillRect(x - 40, y - 40, 80, 80);
      g.restore();
      D().draw(g, "tapita", t, x, y + 18, { alpha: X.found.has(c.id) ? 0.6 : 1 });
    }
    for (const it of X.items) {
      if (!vis(it.x, cx)) continue;
      g.save();
      if (it.rise > 0) {
        g.beginPath();
        g.rect(it.x - 30 - cx, -2000, 60, it.base - cy + 2000);
        g.clip();
      }
      if (it.life < 4 && Math.floor(it.life * 8) % 2) g.globalAlpha = 0.4;
      D().draw(g, it.kind, t, it.x - cx, it.y - cy);
      g.restore();
    }
  }
  function enemies(g, X, cx, cy, t) {
    for (const e of X.enemies) {
      if (e.x < -1000 || !vis(e.x, cx)) continue;
      const x = e.x - cx,
        y = e.y - cy;
      if (e.type === "robot" && !e.dead) {
        // Haz de escáner: si toca la botella de pie, se activa la alarma.
        const eyeY = y - 125,
          f = e.face;
        g.save();
        const beam = g.createLinearGradient(x, 0, x + f * 380, 0);
        const col = e.state === "alarm" ? "255,40,30" : "255,200,0";
        beam.addColorStop(0, `rgba(${col},.75)`);
        beam.addColorStop(0.6, `rgba(${col},.4)`);
        beam.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = beam;
        g.beginPath();
        g.moveTo(x + f * 18, eyeY - 4);
        g.lineTo(x + f * 380, eyeY - 25);
        g.lineTo(x + f * 380, eyeY + 25);
        g.lineTo(x + f * 18, eyeY + 4);
        g.fill();
        g.strokeStyle = `rgba(${col},.95)`;
        g.lineWidth = 2;
        g.setLineDash([10, 6]);
        g.lineDashOffset = -t * 60 * f;
        g.beginPath();
        g.moveTo(x + f * 18, eyeY - 4);
        g.lineTo(x + f * 380, eyeY - 25);
        g.moveTo(x + f * 18, eyeY + 4);
        g.lineTo(x + f * 380, eyeY + 25);
        g.stroke();
        g.setLineDash([]);
        const scan = (t * 1.5) % 1;
        g.strokeStyle = `rgba(255,255,255,${0.9 * (1 - scan)})`;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x + f * (18 + scan * 360), eyeY - 6 - scan * 18);
        g.lineTo(x + f * (18 + scan * 360), eyeY + 6 + scan * 18);
        g.stroke();
        g.restore();
      }
      if (!e.dead || e.squash || e.fling) {
        g.fillStyle = "rgba(6,35,45,.3)";
        const shadowY = (e.type === "mosca" ? FLOOR : FLOOR) - cy;
        g.beginPath();
        g.ellipse(x, shadowY + 2, e.w * 0.45 * (e.type === "mosca" ? 0.6 : 1), 4, 0, 0, Math.PI * 2);
        if (!e.fling) g.fill();
      }
      let alpha = 1;
      if (e.dead) alpha = e.squash ? Math.max(0, 1 - Math.max(0, e.death - 0.5) * 2) : Math.max(0, 1 - e.death * 0.8);
      if (alpha <= 0) continue;
      g.save();
      if (e.hit > 0 && !e.dead) g.filter = "brightness(2.2)";
      let dx = x,
        dy = y;
      if (e.fling) {
        g.translate(x, y - e.h / 2);
        g.rotate(e.death * 8);
        dx = 0;
        dy = e.h / 2;
      }
      D().draw(g, e.type, t + e.id, dx, dy, {
        face: e.face,
        squash: e.squash,
        state: e.state,
        alpha,
        rot: e.type === "limon" && e.state === "roll" ? e.x / 21 : 0,
      });
      g.restore();
      if (e.type === "robot" && !e.dead && e.hp < 60) {
        g.fillStyle = "#061725dd";
        g.fillRect(x - 25, y - 160, 50, 5);
        g.fillStyle = "#ee745e";
        g.fillRect(x - 25, y - 160, (50 * e.hp) / 60, 5);
      }
      if (e.type === "robot" && e.state === "alarm" && !e.dead) {
        g.fillStyle = "#ff3b30";
        g.font = "900 20px Arial";
        g.textAlign = "center";
        g.fillText("¡RECHAZADA!", x, y - 170);
      }
    }
    for (const d of X.debris) {
      g.save();
      g.translate(d.x - cx, d.y - cy);
      g.rotate(d.r);
      const key = d.kind === "carambano" ? "carambano" : d.kind === "caja" ? "caja_cae" : "ladrillo_pedazo";
      const s = d.kind === "ladrillo" ? 1 : 0.32;
      g.scale(s, s);
      D().draw(g, key, 0, 0, 8 / s, { alpha: Math.min(1, d.life * 2) });
      g.restore();
    }
  }
  // Brillo animado que recorre las plataformas originales y una sombra de contacto: suma volumen sin tocarlas.
  function platformGloss(g, adv, cx, cy, t) {
    g.save();
    for (const p of adv.platforms) {
      const x = p.x - cx,
        y = p.y - cy;
      if (x > W + 30 || x + p.w < -30) continue;
      const ao = g.createLinearGradient(0, y + 25, 0, y + 40);
      ao.addColorStop(0, "rgba(5,20,32,.35)");
      ao.addColorStop(1, "rgba(5,20,32,0)");
      g.fillStyle = ao;
      g.fillRect(x + 4, y + 25, p.w - 8, 15);
      const k = ((t * 0.35 + p.x * 0.0013) % 1.6) - 0.3;
      if (k > 0 && k < 1) {
        g.save();
        g.beginPath();
        g.rect(x, y, p.w, 25);
        g.clip();
        const gx = x + k * (p.w + 60) - 30;
        const shine = g.createLinearGradient(gx - 20, 0, gx + 20, 0);
        shine.addColorStop(0, "rgba(255,255,255,0)");
        shine.addColorStop(0.5, p.theme === "ice" ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.28)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = shine;
        g.beginPath();
        g.moveTo(gx - 12, y);
        g.lineTo(gx + 20, y);
        g.lineTo(gx + 8, y + 25);
        g.lineTo(gx - 24, y + 25);
        g.fill();
        g.restore();
      }
      if (p.theme === "ice") {
        g.fillStyle = "rgba(255,255,255,.85)";
        g.beginPath();
        for (let k2 = 0; k2 <= p.w; k2 += 10) g.lineTo(x + k2, y - 3 - Math.abs(Math.sin(k2 * 0.31)) * 3);
        g.lineTo(x + p.w, y + 2);
        g.lineTo(x, y + 2);
        g.fill();
      }
    }
    g.restore();
  }
  function back(g, X, adv, cx, cy, t, p) {
    sun(g, X, cx, cy, t);
    floorFeatures(g, X, cx, cy, t, p);
    signs(g, X, cx, cy, t);
    fridges(g, X, cx, cy, t);
    steamBases(g, X, cx, cy, t);
  }
  function mid(g, X, adv, cx, cy, t) {
    platformGloss(g, adv, cx, cy, t);
    platforms(g, X, cx, cy, t);
    blocks(g, X, cx, cy, t);
    collectibles(g, X, cx, cy, t);
    hazards(g, X, cx, cy, t);
    enemies(g, X, cx, cy, t);
    presses(g, X, cx, cy, t);
  }
  function front(g, X, cx, cy, t) {
    steamPlumes(g, X, cx, cy, t);
  }
  root.MilkExtrasDraw = { back, mid, front };
})(window);
