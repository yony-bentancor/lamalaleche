/* V4: contenido nuevo del recorrido. Lógica pura, sin dibujo: se puede probar en Node.
   Gotas, tapitas, cajas sorpresa, ladrillos, power-ups, enemigos nuevos, peligros de fábrica,
   plataformas móviles, resortes, cintas, charcos, hielo, temperatura, puntaje y combos. */
(function (root) {
  "use strict";
  const FLOOR = 520,
    WIDTH = 14150,
    STRIDE = 1170,
    PW = 42,
    PH = 142,
    ARENA_X = WIDTH - 1090;
  const BLOCK = 44;
  const COMBO = [100, 200, 400, 800, 1000, 2000, 4000, 8000];
  const POWER_TIME = { cacao: 20, frutilla: 12, uht: 9 };
  const ENEMY_SPEC = {
    bacteria: { w: 46, h: 40, hp: 20, speed: 48, contact: 10, points: 100 },
    limon: { w: 68, h: 100, hp: 30, speed: 250, contact: 15, points: 200 },
    mosca: { w: 38, h: 30, hp: 10, speed: 0, contact: 5, points: 200 },
    raton: { w: 60, h: 34, hp: 20, speed: 190, contact: 10, points: 200 },
    robot: { w: 60, h: 135, hp: 60, speed: 70, contact: 20, points: 1000 },
  };
  const zoneOf = (x) => Math.max(0, Math.min(11, Math.floor(x / STRIDE)));
  const themeOf = (x) => {
    const z = zoneOf(x);
    return z < 4 ? "steel" : z < 7 ? "wood" : z < 10 ? "forest" : "ice";
  };

  /* ---------- Diseño del nivel (coordenadas absolutas del mundo) ---------- */
  function layout() {
    const drops = [],
      add = (x, y) => drops.push({ x, y });
    const row = (x0, y, n, gap = 34) => {
      for (let i = 0; i < n; i++) add(x0 + i * gap, y);
    };
    const arc = (x0, x1, y, n, lift = 70) => {
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0.5 : i / (n - 1);
        add(Math.round(x0 + (x1 - x0) * k), Math.round(y - Math.sin(k * Math.PI) * lift));
      }
    };
    // Zona 0 · Planta embotelladora (tutorial)
    row(120, 478, 3);
    arc(700, 880, 300, 6, 40);
    row(990, 392, 3, 40);
    // Zona 1
    arc(1300, 1450, 330, 5, 40);
    row(1595, 395, 4, 40);
    arc(1880, 2050, 300, 5, 40);
    // Zona 2
    row(2440, 478, 4, 44);
    arc(2760, 2900, 390, 4, 30);
    arc(3290, 3430, 360, 5, 50);
    // Zona 3
    row(3960, 395, 3, 40);
    row(4225, 310, 5, 38);
    arc(4500, 4610, 380, 3, 20);
    // Zona 4
    arc(4760, 4900, 470, 4, 40);
    row(5100, 395, 4, 40);
    arc(5390, 5560, 300, 5, 40);
    // Zona 5
    row(5945, 385, 2, 40);
    row(6055, 315, 2, 40);
    arc(6380, 6520, 300, 5, 60);
    arc(6840, 6950, 390, 3, 20);
    // Zona 6 · último rayo de sol
    row(7100, 478, 3, 44);
    row(7440, 395, 4, 40);
    arc(7730, 7900, 300, 5, 40);
    // Zona 7
    arc(8290, 8420, 330, 4, 30);
    row(8610, 395, 4, 40);
    arc(8900, 9070, 300, 5, 40);
    // Zona 8 · bosque helado
    row(9420, 478, 6, 44);
    arc(9950, 10120, 380, 5, 60);
    row(10350, 390, 3, 40);
    // Zona 9
    row(10950, 395, 4, 40);
    arc(11240, 11410, 300, 5, 40);
    row(11480, 478, 5, 44);
    // Zona 10
    row(11950, 478, 5, 44);
    row(12120, 395, 4, 40);
    arc(12680, 12800, 390, 3, 20);
    // Zona 11 · antes del guardián
    arc(12900, 13040, 470, 4, 50);
    const caps = [
      [780, 175],
      [2210, 250],
      [4300, 130],
      [6190, 140],
      [7815, 150],
      [10155, 130],
      [12495, 110],
    ].map(([x, y], id) => ({ id, x, y }));
    // y = borde superior de la caja. 290 se golpea desde el suelo; 200 desde una plataforma de 435; 160 desde una de 350.
    // La base de cada caja queda al menos 144 px sobre el piso o la plataforma de abajo, para poder caminar debajo.
    const blocks = [
      ["brick", 250, 290, "none"],
      ["q", 294, 290, "drops5"],
      ["brick", 338, 290, "none"],
      ["q", 463, 200, "cacao"],
      ["q", 1923, 160, "shield"],
      ["brick", 2440, 290, "drop"],
      ["q", 2484, 290, "drops5"],
      ["brick", 2528, 290, "none"],
      ["q", 4038, 200, "drops5"],
      ["q", 4800, 290, "frutilla"],
      ["brick", 4844, 290, "none"],
      ["brick", 7150, 290, "none"],
      ["q", 7194, 290, "uht"],
      ["brick", 7238, 290, "drop"],
      ["q", 7282, 290, "drops5"],
      ["brick", 8620, 200, "none"],
      ["brick", 8664, 200, "drop"],
      ["q", 8708, 200, "drops5"],
      ["hidden", 8800, 290, "cap"],
      ["q", 11013, 200, "shield"],
      ["q", 12473, 160, "cacao"],
      ["q", 12940, 290, "frutilla"],
    ].map(([kind, x, y, content], id) => ({ id, kind, x, y, w: BLOCK, h: BLOCK, content }));
    const enemies = [
      ["bacteria", 620, 560, 700],
      ["bacteria", 2780, 2700, 2960],
      ["bacteria", 2900, 2700, 2960],
      ["bacteria", 6650, 6570, 6800],
      ["bacteria", 8800, 8700, 8900],
      ["bacteria", 12700, 12620, 12860],
      ["limon", 4900, 4720, 5060],
      ["limon", 5500, 5330, 5640],
      ["limon", 7800, 7700, 7980],
      ["limon", 8050, 7990, 8180],
      ["mosca", 2200, 2140, 2280, 330],
      ["mosca", 5450, 5380, 5560, 290],
      ["mosca", 6450, 6380, 6520, 290],
      ["mosca", 8700, 8620, 8780, 280],
      ["mosca", 9200, 9140, 9300, 300],
      ["raton", 3100, 2980, 3250],
      ["raton", 10400, 10300, 10520],
      ["raton", 12150, 11950, 12230],
      ["robot", 4150, 3960, 4400],
      ["robot", 11250, 11100, 11450],
    ].map(([type, x, min, max, ay], id) => ({ id: 100 + id, type, x, min, max, ay: ay || 0 }));
    return {
      drops,
      caps,
      blocks,
      enemies,
      platforms: [{ x: 1290, w: 130, y: 400, theme: "steel", extra: true }],
      movers: [
        { x0: 4950, y0: 400, w: 100, ax: 0, ay: 70, period: 3.4 },
        { x0: 8250, y0: 385, w: 110, ax: 90, ay: 0, period: 4 },
        { x0: 9990, y0: 445, w: 100, ax: 50, ay: 0, period: 3 },
        { x0: 11880, y0: 400, w: 100, ax: 0, ay: 75, period: 3.6 },
      ],
      fallers: [
        { x: 5930, y: 425, w: 92 },
        { x: 6040, y: 355, w: 92 },
      ],
      springs: [{ x: 1020 }, { x: 6170 }, { x: 9500 }],
      belts: [
        { x: 720, w: 240, speed: 80 },
        { x: 3680, w: 220, speed: -70 },
        { x: 11450, w: 240, speed: 100 },
      ],
      puddles: [
        { x: 4760, w: 140 },
        { x: 7330, w: 90 },
      ],
      ice: [
        { x: 9400, w: 300 },
        { x: 12000, w: 200 },
      ],
      presses: [{ x: 3720 }, { x: 3830, offset: 1.4 }, { x: 10870 }],
      steam: [{ x: 1500 }, { x: 3500, offset: 1 }, { x: 11150, cold: true }, { x: 12060, cold: true, offset: 1.5 }],
      drops_hazard: [
        { x: 2980, kind: "caja" },
        { x: 7300, kind: "caja" },
        { x: 9600, kind: "carambano" },
        { x: 10350, kind: "carambano" },
        { x: 12000, kind: "carambano" },
        { x: 12700, kind: "carambano" },
      ],
      fridges: [{ x: 2250 }, { x: 3560 }, { x: 6950 }, { x: 7950 }],
      sun: [
        [60, 330],
        [560, 780],
        [1500, 1800],
        [2340, 2500],
        [2900, 3100],
        [4700, 4950],
        [5300, 5500],
        [5850, 6100],
        [6700, 6990],
        [7020, 7350],
        [7650, 7940],
      ].map(([a, b]) => ({ x: a, w: b - a })),
      signs: [
        { x: 140, text: "↑ GOLPEÁ LAS CAJAS DESDE ABAJO" },
        { x: 520, text: "SALTÁ ENCIMA PARA APLASTAR" },
        { x: 845, text: "LA CINTA TE EMPUJA →" },
        { x: 1460, text: "VAPOR · ESPERÁ EL MOMENTO" },
        { x: 3690, text: "SELLADORAS · PASÁ AL SUBIR" },
        { x: 3950, text: "↓ AGACHATE · EL ROBOT NO TE VE" },
        { x: 6120, text: "MANTENÉ SALTO EN EL RESORTE" },
        { x: 9380, text: "¡HIELO! CUESTA FRENAR" },
      ],
    };
  }

  class Extras {
    constructor(adventure) {
      this.adv = adventure;
      this.L = layout();
      this.found = new Set();
      this.hook();
      this.reset();
    }
    // Escudo, UHT y cacao también actúan sobre las balas y enemigos originales, sin modificar adventure.js.
    hook() {
      const a = this.adv;
      if (!a || a.__v4) return;
      a.__v4 = true;
      a.shotPower = () => this.power.cacao > 0;
      const hurt = a.damagePlayer.bind(a),
        hit = a.damageEnemy.bind(a);
      a.damagePlayer = (p, amount) => {
        if (p.dead || p.invuln > 0) return false;
        if (this.power.uht > 0) return false;
        if (this.power.shield) {
          this.power.shield = false;
          p.invuln = 1.2;
          this.emit("shieldbreak", p.x, p.y - 80);
          return false;
        }
        const ok = hurt(p, amount);
        if (ok) this.emit("hurt", p.x, p.y - 80, { amount });
        return ok;
      };
      a.damageEnemy = (e, amount, fixedDamage = false) => {
        const mult = !fixedDamage && this.power.cacao > 0 && !this.stomping ? 2 : 1;
        const was = e.hp;
        const ok = hit(e, amount * mult);
        if (ok && was > 0 && e.hp <= 0) this.addPoints(e.final ? 5000 : 500, e.x, e.y - 160);
        return ok;
      };
    }
    reset() {
      const L = this.L;
      this.events = [];
      this.score = 0;
      this.dropCount = 0;
      this.dropTotal = L.drops.length + L.blocks.reduce((n, b) => n + (b.content === "drops5" ? 5 : b.content === "drop" ? 1 : 0), 0);
      this.kills = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.time = 0;
      this.temp = 22;
      this.sourTick = 0;
      this.tempWarned = false;
      this.stomping = false;
      this.power = { cacao: 0, frutilla: 0, uht: 0, shield: false };
      this.drops = L.drops.map((d) => ({ ...d, taken: false, t: Math.random() * 6 }));
      this.caps = L.caps.map((c) => ({ ...c, taken: false }));
      this.blocks = L.blocks.map((b) => ({ ...b, used: false, gone: false, revealed: b.kind !== "hidden", hits: 0, bounce: 0 }));
      this.items = [];
      this.debris = [];
      this.platforms = L.platforms.map((p) => ({ ...p }));
      this.movers = L.movers.map((m) => ({ ...m, x: m.x0, y: m.y0, dx: 0, dy: 0, moving: true, theme: themeOf(m.x0), kind: "mover" }));
      this.fallers = L.fallers.map((f) => ({ ...f, y0: f.y, state: "idle", t: 0, vy: 0, dx: 0, moving: true, theme: themeOf(f.x), kind: "faller" }));
      this.springs = L.springs.map((s) => ({ x: s.x, w: 40, y: FLOOR - 26, h: 26, spring: 980, boing: 0, kind: "spring" }));
      this.presses = L.presses.map((p) => ({ x: p.x, w: 84, offset: p.offset || 0, head: 300, phase: "up", hurtCd: 0 }));
      this.steam = L.steam.map((s) => ({ ...s, offset: s.offset || 0, on: false, warn: false, power: 0 }));
      this.hazards = L.drops_hazard.map((h) => ({ ...h, state: "armed", t: 0, y: -80, vy: 0 }));
      this.fridges = L.fridges.map((f) => ({ ...f, open: 0, told: false }));
      this.enemies = L.enemies.map((e) => this.spawnEnemy(e));
      this.rebuild();
    }
    spawnEnemy(d) {
      const s = ENEMY_SPEC[d.type];
      return {
        ...d,
        home: d.x,
        y: d.type === "mosca" ? d.ay : FLOOR,
        w: s.w,
        h: s.h,
        hp: s.hp,
        face: -1,
        vx: 0,
        vy: 0,
        t: Math.random() * 5,
        state: "patrol",
        dead: false,
        death: 0,
        hit: 0,
        alarm: 0,
        cool: 0,
        squash: false,
      };
    }
    // Respawn tras romperse: se conserva lo recolectado; los peligros vuelven a su estado inicial.
    respawn() {
      this.temp = 22;
      this.combo = 0;
      this.power.frutilla = 0;
      for (const h of this.hazards) Object.assign(h, { state: "armed", t: 0, y: -80, vy: 0 });
      for (const f of this.fallers) Object.assign(f, { y: f.y0, state: "idle", t: 0, vy: 0 });
      for (const e of this.enemies) if (!e.dead) Object.assign(e, { x: e.home, state: "patrol", alarm: 0, vx: 0 });
    }
    rebuild() {
      this.staticSurfaces = [...this.platforms, ...this.springs];
    }
    get surfaces() {
      const out = [];
      for (const b of this.blocks) if (!b.gone && b.revealed) out.push(b);
      for (const p of this.platforms) out.push(p);
      for (const m of this.movers) out.push(m);
      for (const f of this.fallers) if (f.state !== "gone") out.push(f);
      for (const s of this.springs) out.push(s);
      return out;
    }
    get ceilings() {
      return this.blocks.filter((b) => !b.gone);
    }
    get solids() {
      const out = [];
      for (const b of this.blocks) if (!b.gone && b.revealed) out.push(b);
      for (const s of this.springs) out.push(s);
      for (const p of this.presses) if (p.head > FLOOR - 60) out.push({ x: p.x + 6, w: p.w - 12, y: p.head - 40, h: 520 });
      return out;
    }
    modifiers(p) {
      const g = p.ground;
      if (!g) return {};
      const onFloor = Math.abs(p.y - FLOOR) < 1;
      let belt = 0,
        slip = 0;
      if (onFloor) {
        for (const b of this.L.belts) if (p.x > b.x && p.x < b.x + b.w) belt = b.speed;
        for (const d of this.L.puddles) if (p.x > d.x && p.x < d.x + d.w) slip = 0.22;
        for (const d of this.L.ice) if (p.x > d.x && p.x < d.x + d.w) slip = 0.3;
      }
      if (g.theme === "ice") slip = slip || 0.45;
      return { belt, slip };
    }
    inSun(x) {
      return this.L.sun.some((s) => x > s.x && x < s.x + s.w);
    }
    emit(type, x, y, extra) {
      this.events.push({ ...(extra || {}), type, x, y });
    }
    addPoints(value, x, y, label) {
      this.score += value;
      this.emit("points", x, y, { value, label });
    }
    give(kind, x, y) {
      if (kind === "drop") {
        this.dropCount++;
        this.score += 10;
        this.emit("drop", x, y);
        if (this.dropCount % 50 === 0) {
          this.adv.hp = Math.min(100, this.adv.hp + 25);
          this.addPoints(1000, x, y - 30, "+25% ENERGÍA");
          this.emit("bonus", x, y);
        }
      }
    }
    activate(kind, p) {
      if (kind === "shield") this.power.shield = true;
      else this.power[kind] = POWER_TIME[kind];
      if (kind === "cacao") this.adv.hp = Math.min(100, this.adv.hp + 25);
      if (kind === "uht") this.temp = 22;
      this.addPoints(1000, p.x, p.y - 160);
      this.emit("power", p.x, p.y - 80, { kind });
    }
    /* ---------- Paso de simulación ---------- */
    step(dt, p, input, world) {
      this.time += dt;
      const ev = this.events;
      for (const k of ["cacao", "frutilla", "uht"]) {
        if (this.power[k] > 0) {
          this.power[k] = Math.max(0, this.power[k] - dt);
          if (!this.power[k]) this.emit("powerend", p.x, p.y - 80, { kind: k });
        }
      }
      if (p.grounded) {
        if (this.combo > this.bestCombo) this.bestCombo = this.combo;
        this.combo = 0;
      }
      this.stepPlatforms(dt, p);
      this.stepBlocks(dt, p);
      this.stepItems(dt, p, world);
      if (!p.dead) {
        this.collect(p);
        this.stepTemperature(dt, p);
      }
      this.stepHazards(dt, p);
      this.stepEnemies(dt, p, input);
      for (const d of this.debris) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.vy += 1600 * dt;
        d.r += d.spin * dt;
        d.life -= dt;
      }
      this.debris = this.debris.filter((d) => d.life > 0);
      this.events = [];
      return ev;
    }
    // Se llama después de que adventure.js procesa balas: la leche también impacta enemigos y cajas nuevas.
    post(p) {
      const ev = this.events;
      for (const b of this.adv.bullets) {
        if (b.owner !== "milk" || b.life <= 0) continue;
        if (b.cacao === undefined) {
          b.cacao = this.power.cacao > 0;
          if (b.cacao) b.r = 11;
        }
        for (const k of this.blocks) {
          if (!k.gone && k.revealed && b.x > k.x && b.x < k.x + k.w && b.y > k.y && b.y < k.y + k.h) {
            b.life = 0;
            this.emit("splash", b.x, b.y, { color: "#fff4d6" });
          }
        }
        if (b.life <= 0) continue;
        for (const e of this.enemies) {
          if (e.dead || e.x < -100) continue;
          if (Math.abs(b.x - e.x) < e.w / 2 + b.r && b.y > e.y - e.h - b.r && b.y < e.y + b.r) {
            b.life = 0;
            this.hurtEnemy(e, b.cacao ? 20 : 10, b.vx > 0 ? 1 : -1, "shot");
            this.emit("splash", b.x, b.y, { color: b.cacao ? "#8a5a35" : "#fff4d6" });
            break;
          }
        }
      }
      this.events = [];
      return ev;
    }
    stepPlatforms(dt, p) {
      for (const m of this.movers) {
        const k = Math.sin((this.time / m.period) * Math.PI * 2);
        const nx = m.x0 + k * m.ax,
          ny = m.y0 + k * m.ay;
        m.dx = nx - m.x;
        m.dy = ny - m.y;
        m.x = nx;
        m.y = ny;
      }
      for (const f of this.fallers) {
        f.dx = 0;
        if (f.state === "idle" && p.ground === f) {
          f.state = "shake";
          f.t = 0.45;
          this.emit("crumble", f.x + f.w / 2, f.y);
        } else if (f.state === "shake") {
          f.t -= dt;
          if (f.t <= 0) f.state = "fall";
        } else if (f.state === "fall") {
          f.vy = Math.min(900, f.vy + 1500 * dt);
          f.y += f.vy * dt;
          if (f.y > 820) {
            f.state = "gone";
            f.t = 3.5;
          }
        } else if (f.state === "gone") {
          f.t -= dt;
          if (f.t <= 0) Object.assign(f, { state: "idle", y: f.y0, vy: 0 });
        }
      }
      for (const s of this.springs) s.boing = Math.max(0, s.boing - dt);
    }
    stepBlocks(dt, p) {
      for (const b of this.blocks) b.bounce = Math.max(0, b.bounce - dt);
      const b = p.bumped;
      if (!b || !this.blocks.includes(b)) return;
      const cx = b.x + b.w / 2;
      b.bounce = 0.2;
      // Golpear una caja desde abajo voltea a los enemigos y junta las gotas que estén encima.
      for (const e of this.enemies) if (!e.dead && Math.abs(e.y - b.y) < 4 && Math.abs(e.x - cx) < 40) this.hurtEnemy(e, 999, 1, "bump");
      for (const d of this.drops) if (!d.taken && Math.abs(d.x - cx) < 26 && d.y < b.y && d.y > b.y - 50) {
        d.taken = true;
        this.give("drop", d.x, d.y);
      }
      if (b.kind === "hidden" && !b.revealed) {
        b.revealed = true;
        this.emit("secret", cx, b.y);
      }
      if (b.used) {
        this.emit("bumpused", cx, b.y + b.h);
        return;
      }
      if (b.content === "drops5") {
        b.hits++;
        this.give("drop", cx, b.y - 10);
        this.emit("popdrop", cx, b.y);
        if (b.hits >= 5) b.used = true;
      } else if (b.content === "drop") {
        this.give("drop", cx, b.y - 10);
        this.emit("popdrop", cx, b.y);
        b.used = true;
      } else if (b.content === "cap") {
        this.caps.push({ id: 7, x: cx, y: b.y - 40, taken: false, popped: 0.4 });
        this.emit("popitem", cx, b.y);
        b.used = true;
      } else if (b.content === "none" && b.kind === "brick") {
        b.gone = true;
        this.score += 50;
        for (let i = 0; i < 4; i++)
          this.debris.push({ x: cx + (i % 2 ? 10 : -10), y: b.y + (i < 2 ? 10 : 30), vx: (i % 2 ? 1 : -1) * (110 + i * 25), vy: -520 + (i < 2 ? -120 : 0), r: 0, spin: (i % 2 ? 1 : -1) * 9, life: 1.4, kind: "ladrillo" });
        this.emit("break", cx, b.y + 22);
      } else {
        this.items.push({ kind: b.content, x: cx, y: b.y, base: b.y, w: 34, h: 34, vx: 0, vy: 0, rise: 0.55, life: 30 });
        this.emit("popitem", cx, b.y);
        b.used = true;
      }
    }
    stepItems(dt, p, world) {
      const surfaces = world ? world.surfaces(p.x) : [];
      for (const it of this.items) {
        it.life -= dt;
        if (it.rise > 0) {
          it.rise -= dt;
          it.y = it.base - (1 - Math.max(0, it.rise) / 0.55) * 36;
          if (it.rise <= 0) {
            it.vx = it.kind === "shield" ? 0 : it.kind === "uht" ? 170 : 120;
            if (p.x < it.x && it.kind !== "shield") it.vx *= -1;
            it.vy = it.kind === "uht" ? -420 : 0;
          }
          continue;
        }
        if (it.kind === "shield") {
          it.y = it.base - 36 + Math.sin(this.time * 3) * 5;
          continue;
        }
        const oldY = it.y;
        it.vy = Math.min(900, it.vy + 1700 * dt);
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        for (const s of [...this.solids]) {
          if (it.y > s.y + 2 && it.y - it.h < s.y + s.h && it.x + 14 > s.x && it.x - 14 < s.x + s.w) {
            it.vx *= -1;
            it.x += it.vx * dt * 2;
          }
        }
        for (const s of surfaces) {
          if (it.x > s.x && it.x < s.x + s.w && it.vy >= 0 && oldY <= s.y + 2 && it.y >= s.y) {
            it.y = s.y;
            it.vy = it.kind === "uht" ? -560 : it.kind === "frutilla" ? -380 : 0;
            break;
          }
        }
        if (it.x < 20 || it.x > WIDTH - 20) it.vx *= -1;
      }
      this.items = this.items.filter((it) => it.life > 0 && it.y < 900);
    }
    collect(p) {
      const top = p.y - (p.crouch > 0.5 ? 96 : PH);
      const touch = (x, y, r) => x + r > p.x - PW / 2 && x - r < p.x + PW / 2 && y + r > top && y - r < p.y;
      for (const d of this.drops) {
        if (!d.taken && touch(d.x, d.y, 12)) {
          d.taken = true;
          this.give("drop", d.x, d.y);
        }
      }
      for (const c of this.caps) {
        if (c.popped > 0) {
          c.popped -= 1 / 120;
          continue;
        }
        if (!c.taken && touch(c.x, c.y, 18)) {
          c.taken = true;
          this.found.add(c.id);
          this.addPoints(2000, c.x, c.y - 20, "¡TAPITA DORADA!");
          this.emit("cap", c.x, c.y, { id: c.id, count: this.capCount });
        }
      }
      for (const it of this.items) {
        if (it.life > 0 && it.rise <= 0 && touch(it.x, it.y - 17, 17)) {
          it.life = 0;
          this.activate(it.kind, p);
        }
      }
    }
    get capCount() {
      return this.caps.filter((c) => c.taken).length;
    }
    stepTemperature(dt, p) {
      const z = zoneOf(p.x);
      let rate;
      if (this.power.uht > 0) rate = -20;
      else if (z >= 8) rate = -9;
      else if (this.inSun(p.x)) rate = 6.5;
      else rate = -3;
      for (const f of this.fridges) {
        const near = Math.abs(p.x - f.x) < 75;
        f.open += ((near ? 1 : 0) - f.open) * Math.min(1, dt * 6);
        if (near) {
          rate = -45;
          if (!f.told) {
            f.told = true;
            this.emit("fridge", f.x, FLOOR - 120);
          }
        }
      }
      if (this.adv.flags && this.adv.flags.some((f) => f.inside)) rate = -60;
      this.temp = Math.max(0, Math.min(100, this.temp + rate * dt));
      if (this.temp > 75 && !this.tempWarned) {
        this.tempWarned = true;
        this.emit("hot", p.x, p.y - 160);
      }
      if (this.temp < 55) this.tempWarned = false;
      if (this.temp >= 100) {
        this.sourTick -= dt;
        if (this.sourTick <= 0) {
          this.sourTick = 1.6;
          this.adv.damagePlayer(p, 5);
          this.emit("sour", p.x, p.y - 150);
        }
      } else this.sourTick = 0.4;
    }
    hurt(p, amount, fromX) {
      if (p.dead || p.invuln > 0 || this.power.uht > 0) return false;
      const ok = this.adv.damagePlayer(p, amount);
      if (ok) {
        if (!p.dead) {
          p.invuln = Math.max(p.invuln, 1.1);
          if (fromX !== undefined) p.vx = (p.x < fromX ? -1 : 1) * 260;
        }
      }
      return ok;
    }
    stepHazards(dt, p) {
      const top = p.y - (p.crouch > 0.5 ? 96 : PH);
      // Selladoras: suben, avisan temblando, golpean y vuelven a subir.
      for (const s of this.presses) {
        const c = (this.time + s.offset) % 3.4;
        let head;
        if (c < 1.5) {
          s.phase = "up";
          head = 300;
        } else if (c < 2.1) {
          s.phase = "warn";
          head = 300 - Math.sin(((c - 1.5) / 0.6) * Math.PI) * 14;
        } else if (c < 2.24) {
          s.phase = "slam";
          head = 300 + ((c - 2.1) / 0.14) * (FLOOR - 300);
        } else if (c < 2.9) {
          s.phase = "down";
          head = FLOOR;
        } else {
          s.phase = "rise";
          head = FLOOR - ((c - 2.9) / 0.5) * (FLOOR - 300);
        }
        if (s.phase === "down" && s.lastPhase === "slam") this.emit("slam", s.x + s.w / 2, FLOOR);
        s.lastPhase = s.phase;
        s.head = head;
        if (!p.dead && (s.phase === "slam" || s.phase === "down") && p.x + PW / 2 > s.x + 4 && p.x - PW / 2 < s.x + s.w - 4 && head > top + 6) {
          if (this.hurt(p, 20, s.x + s.w / 2)) {
            p.x = p.x < s.x + s.w / 2 ? s.x - PW / 2 - 2 : s.x + s.w + PW / 2 + 2;
            p.vy = -300;
            p.grounded = false;
          }
        }
      }
      // Válvulas de vapor (rojas) y de aire helado (azules).
      for (const v of this.steam) {
        const c = (this.time + v.offset) % 3.2;
        v.warn = c > 1.4 && c < 2;
        v.on = c >= 2 && c < 3.1;
        v.power = v.on ? Math.min(1, (c - 2) * 6) * Math.min(1, (3.1 - c) * 8) : 0;
        if (v.on && v.power > 0.5 && !p.dead && Math.abs(p.x - v.x) < 28 && top < FLOOR && p.y > 300) {
          if (v.cold) {
            this.temp = Math.max(0, this.temp - 30 * dt * 4);
            if (this.hurt(p, 5, v.x)) p.vy = -380;
          } else if (this.hurt(p, 10, v.x)) {
            p.vy = -420;
            p.grounded = false;
          }
        }
      }
      // Cajas y carámbanos que caen, con sombra de aviso.
      for (const h of this.hazards) {
        if (h.state === "armed") {
          if (!p.dead && p.x > h.x - 250 && p.x < h.x + 40) {
            h.state = "warn";
            h.t = 0.75;
            this.emit("warn", h.x, FLOOR);
          }
        } else if (h.state === "warn") {
          h.t -= dt;
          if (h.t <= 0) {
            h.state = "fall";
            h.y = -60;
            h.vy = 0;
          }
        } else if (h.state === "fall") {
          h.vy += 2300 * dt;
          h.y += h.vy * dt;
          const hw = h.kind === "caja" ? 30 : 14;
          if (!p.dead && Math.abs(p.x - h.x) < hw + PW / 2 && h.y > top && h.y - 50 < p.y) {
            this.hurt(p, 15, h.x);
          }
          if (h.y >= FLOOR) {
            h.y = FLOOR;
            h.state = "broken";
            h.t = 4;
            for (let i = 0; i < 6; i++)
              this.debris.push({ x: h.x + (i - 2.5) * 8, y: FLOOR - 20, vx: (i - 2.5) * 70, vy: -300 - (i % 3) * 90, r: 0, spin: (i % 2 ? 1 : -1) * 10, life: 1.1, kind: h.kind });
            this.emit(h.kind === "caja" ? "cratebreak" : "icebreak", h.x, FLOOR);
          }
        } else if (h.state === "broken") {
          h.t -= dt;
          if (h.t <= 0 && Math.abs(p.x - h.x) > 400) h.state = "armed";
        }
      }
    }
    hurtEnemy(e, amount, dir, how) {
      if (e.dead) return;
      e.hp -= amount;
      e.hit = 0.15;
      if (e.hp <= 0) {
        e.dead = true;
        e.death = 0;
        e.squash = how === "stomp";
        e.fling = how !== "stomp";
        e.vx = dir * 140;
        e.vy = how === "stomp" ? 0 : -420;
        this.kills++;
        if (how !== "stomp") this.addPoints(ENEMY_SPEC[e.type].points * (how === "uht" ? 2 : 1), e.x, e.y - e.h - 20);
        this.emit("enemydeath", e.x, e.y - e.h / 2, { enemyType: e.type, how });
      } else this.emit("enemyhit", e.x, e.y - e.h / 2, { enemyType: e.type });
    }
    stomp(p, input, top, x) {
      this.combo++;
      const value = COMBO[Math.min(this.combo - 1, COMBO.length - 1)];
      this.addPoints(value, x, top - 30, this.combo > 1 ? "COMBO x" + this.combo : null);
      p.y = top;
      p.vy = -(input.jump ? 660 : 480);
      p.jumpHeld = !!input.jump;
      p.grounded = false;
      p.ground = null;
      this.emit("stomp", x, top, { combo: this.combo });
    }
    stepEnemies(dt, p, input) {
      const pTop = p.y - (p.crouch > 0.5 ? 96 : PH);
      const falling = p.vy > 0 || p.y > p.py;
      // Pisotón también sobre los enemigos originales (1 y 2) y el guardián: daño parcial y rebote.
      if (!p.dead && falling) {
        for (const e of this.adv.enemies) {
          if (e.hp <= 0) continue;
          const t = e.y - (e.final || e.type === "blocker" ? e.height : 135);
          if (Math.abs(p.x - e.x) < 38 && p.py <= t + 10 && p.y >= t - 2) {
            this.stomping = true;
            this.adv.damageEnemy(e, e.final ? 20 : 50);
            this.stomping = false;
            this.stomp(p, input, t, e.x);
            break;
          }
        }
      }
      for (const e of this.enemies) {
        e.t += dt;
        e.hit = Math.max(0, e.hit - dt);
        if (e.dead) {
          e.death += dt;
          if (e.fling) {
            e.x += e.vx * dt;
            e.y += e.vy * dt;
            e.vy += 1500 * dt;
          }
          continue;
        }
        if (Math.abs(e.x - p.x) > 1500) continue;
        const spec = ENEMY_SPEC[e.type];
        const dx = p.x - e.x;
        if (e.type === "bacteria") {
          e.vx = (e.face || -1) * spec.speed;
          e.x += e.vx * dt;
          if (e.x < e.min) {
            e.x = e.min;
            e.face = 1;
          }
          if (e.x > e.max) {
            e.x = e.max;
            e.face = -1;
          }
        } else if (e.type === "raton") {
          const c = e.t % 4;
          if (c < 3) {
            e.state = "run";
            e.x += e.face * spec.speed * dt;
          } else e.state = "sniff";
          if (e.x < e.min) {
            e.x = e.min;
            e.face = 1;
          }
          if (e.x > e.max) {
            e.x = e.max;
            e.face = -1;
          }
        } else if (e.type === "limon") {
          // Camina apoyado en el piso; acelera al detectar a la botella.
          if (e.state === "roll") e.state = "walk";
          if (e.state === "patrol" && Math.abs(dx) < 480 && Math.abs(p.y - FLOOR) < 160) {
            e.state = "walk";
            e.face = dx < 0 ? -1 : 1;
            this.emit("lemon", e.x, e.y - 30);
          }
          e.x += e.face * (e.state === "walk" ? spec.speed : 85) * dt;
          e.y = FLOOR;
          e.vy = 0;
          if (e.x < e.min || e.x > e.max) {
            e.x = Math.max(e.min, Math.min(e.max, e.x));
            e.face *= -1;
          }
        } else if (e.type === "mosca") {
          e.x = e.home + Math.sin(e.t * 1.3) * ((e.max - e.min) / 2);
          e.y = e.ay + Math.sin(e.t * 3.1) * 28 + e.h;
          e.face = Math.cos(e.t * 1.3) > 0 ? 1 : -1;
        } else if (e.type === "robot") {
          e.cool = Math.max(0, e.cool - dt);
          const eyeY = e.y - 125,
            ahead = dx * e.face;
          const spread = 6 + Math.max(0, ahead) * 0.05;
          const seen = !p.dead && ahead > 0 && ahead < 380 && pTop < eyeY + spread && p.y > eyeY - spread && this.power.uht <= 0;
          if (e.alarm > 0) {
            e.alarm -= dt;
            e.x += e.face * 330 * dt;
            if (e.alarm <= 0) e.cool = 1.2;
          } else if (seen && e.cool <= 0) {
            e.alarm = 1.4;
            this.emit("alarm", e.x, e.y - e.h - 30);
          } else {
            e.x += e.face * spec.speed * dt;
          }
          e.state = e.alarm > 0 ? "alarm" : "patrol";
          if (e.x < e.min) {
            e.x = e.min;
            e.face = 1;
            e.alarm = 0;
          }
          if (e.x > e.max) {
            e.x = e.max;
            e.face = -1;
            e.alarm = 0;
          }
        }
        if (p.dead) continue;
        const top = e.y - e.h,
          overlapX = Math.abs(p.x - e.x) < e.w / 2 + PW / 2 - 4,
          overlapY = p.y > top && pTop < e.y;
        if (!overlapX || !overlapY) continue;
        if (this.power.uht > 0) {
          this.hurtEnemy(e, 999, p.x < e.x ? 1 : -1, "uht");
          continue;
        }
        if (falling && p.py <= top + 12) {
          this.stomp(p, input, top, e.x);
          this.hurtEnemy(e, e.type === "robot" ? 30 : 999, 1, "stomp");
          if (e.type === "robot" && !e.dead) e.cool = 2;
          continue;
        }
        this.hurt(p, spec.contact, e.x);
      }
      this.enemies.forEach((e) => {
        if (e.dead && e.death > 2.5) e.x = -9999;
      });
    }
    serialize() {
      return { caps: [...this.found] };
    }
  }
  root.MilkExtras = { Extras, layout, ENEMY_SPEC, COMBO, zoneOf, themeOf, FLOOR, ARENA_X };
  if (typeof module !== "undefined") module.exports = root.MilkExtras;
})(typeof window !== "undefined" ? window : globalThis);
