/* Nivel 5 · «Bajo la superficie» — simulación determinista, sin dibujo (se prueba en Node).
   La botella cae al mar y recorre el cementerio de barcos: camina por la arena, nada con cada salto,
   resiste corrientes y enfrenta al Tragabarcos. Una sola vez por nivel puede volverse torbellino. */
(function (root) {
  "use strict";
  const W = 1280,
    SCREENS = 12,
    WIDTH = SCREENS * W,
    ARENA_X = 10 * W,
    ARENA_RIGHT = ARENA_X + W,
    EXIT_X = WIDTH - 150,
    TOP = 150, // la botella no sube más que esto (pies)
    START_X = 300;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  const s = (i, x = 0) => i * W + x;

  const NAMES = [
    "El fondo del naufragio",
    "La cubierta hundida",
    "El barco partido",
    "Los paraguas del fondo",
    "El abismo",
    "Las velas rotas",
    "El cementerio de cascos",
    "El faro sumergido",
    "El jardín de coral",
    "El lomo de la bestia",
    "El Tragabarcos",
    "La superficie",
  ];
  const SECTIONS = ["01 / EL NAUFRAGIO", "02 / LA PROFUNDIDAD", "03 / LOS MÁSTILES", "04 / HACIA LA LUZ"];

  /* Piso de cada fondo: tramos [desde, hasta, altura de los pies] en coordenadas de pantalla. */
  const SCREEN_FLOORS = [
    [[0, 1280, 494]],
    [[0, 1280, 496]],
    [[0, 1280, 495]],
    [[0, 1150, 491], [1150, 1280, 480]],
    [[0, 262, 383], [1036, 1280, 384]], // el abismo
    [[0, 1280, 509]],
    [[0, 1280, 510]],
    [[0, 1280, 510]],
    [[0, 1280, 512]],
    [[0, 1280, 497]],
    [[0, 1280, 472]],
    [[0, 1280, 521]],
  ];
  const SEGMENTS = SCREEN_FLOORS.flatMap((list, i) => list.map(([a, b, y]) => ({ x: s(i, a), w: b - a, y })));
  const CHASM = { x: s(4, 262), w: 1036 - 262 };

  const PHY = {
    grav: 640, // el agua frena la caída
    sinkMax: 250,
    diveMax: 430,
    floatGrav: 0.38, // manteniendo SALTAR la botella flota
    walk: 200,
    run: 300,
    swimMax: 250,
    swimRun: 310,
    accelGround: 1500,
    accelWater: 760,
    dragWater: 1.6,
    jump: 560,
    stroke: 390,
    strokeCd: 0.26,
    step: 26, // escalón que se sube caminando
  };
  const DMG = { medusa: 12, cangrejo: 12, almeja: 18, morena: 14, globo: 10, cubierto: 8, pulpo: 12, tinta: 4, cria: 8, fall: 15, charge: 22, bite: 20, burbuja: 8 };
  const HP = { medusa: 2, cangrejo: 3, almeja: 3, morena: 2, globo: 2, pulpo: 3, cria: 1 };
  const POINTS = { medusa: 200, cangrejo: 250, almeja: 300, morena: 250, globo: 250, pulpo: 300, cria: 100 };
  const WHIRL_TIME = 4.2;
  const BOSS = { hp: 60, body: 1, weak: 3, whirl: 12 };

  /* Enemigos repartidos según la zona: crías y morenas en lo oscuro, cangrejos y almejas en la arena,
     medusas, peces globo y pulpos donde llega la luz. */
  const ENEMIES = [
    ["medusa", s(0, 820), 300],
    ["globo", s(0, 1120), 330],
    ["morena", s(1, 380), 0],
    ["cria", s(1, 760), 320],
    ["cria", s(1, 820), 270],
    ["medusa", s(1, 1080), 260],
    ["cangrejo", s(2, 260), 0, s(2, 120), s(2, 560)],
    ["almeja", s(2, 900), 0],
    ["morena", s(2, 1180), 0],
    ["cangrejo", s(3, 300), 0, s(3, 180), s(3, 640)],
    ["almeja", s(3, 820), 0],
    ["cria", s(3, 1000), 300],
    ["cria", s(3, 1060), 250],
    ["cria", s(3, 1110), 330],
    ["medusa", s(4, 470), 360],
    ["medusa", s(4, 800), 330],
    ["cria", s(4, 560), 560],
    ["cria", s(4, 700), 600],
    ["cria", s(4, 900), 540],
    ["morena", s(5, 470), 0],
    ["pulpo", s(5, 950), 0],
    ["morena", s(6, 300), 0],
    ["globo", s(6, 760), 300],
    ["cria", s(6, 1040), 330],
    ["cria", s(6, 1100), 280],
    ["medusa", s(7, 380), 270],
    ["globo", s(7, 760), 320],
    ["pulpo", s(7, 1100), 0],
    ["almeja", s(8, 330), 0],
    ["pulpo", s(8, 720), 0],
    ["medusa", s(8, 1000), 280],
    ["globo", s(8, 1160), 300],
    ["cangrejo", s(9, 300), 0, s(9, 160), s(9, 620)],
    ["pulpo", s(9, 720), 0],
    ["medusa", s(9, 900), 270],
    ["cria", s(9, 1000), 310],
    ["cria", s(9, 1050), 260],
    ["cria", s(9, 1100), 340],
    ["cangrejo", s(11, 420), 0, s(11, 300), s(11, 700)],
    ["almeja", s(11, 920), 0],
  ];
  /* Perlas en arcos para invitar a nadar, recargas y tapas escudo. */
  const ITEMS = (() => {
    const list = [];
    const arc = (x, y, n = 5, dx = 46, h = 60) => {
      for (let i = 0; i < n; i++) list.push({ kind: "perla", x: x + i * dx, y: y - Math.sin((i / (n - 1)) * Math.PI) * h });
    };
    arc(s(0, 420), 400);
    arc(s(0, 900), 230, 4);
    arc(s(1, 520), 360);
    arc(s(1, 1000), 200, 4, 50, 40);
    arc(s(2, 640), 380);
    arc(s(3, 520), 300, 5, 50, 90);
    arc(s(4, 330), 300, 6, 70, 40);
    arc(s(4, 760), 250, 4, 50, 30);
    arc(s(5, 620), 380);
    arc(s(6, 520), 260, 6, 46, 70);
    arc(s(7, 520), 220, 5, 50, 30);
    arc(s(8, 520), 360);
    arc(s(9, 520), 230, 5, 50, 50);
    arc(s(11, 560), 400);
    list.push({ kind: "leche", x: s(4, 650), y: 200 }, { kind: "tapa", x: s(2, 1020), y: 270 }, { kind: "leche", x: s(7, 980), y: 210 }, { kind: "tapa", x: s(9, 400), y: 240 }, { kind: "leche", x: s(9, 1210), y: 300 });
    return list.map((it, i) => ({ ...it, id: i, taken: false, t: i * 0.7 }));
  })();
  const FLAGS = [s(2, 700), s(5, 260), s(7, 620), s(9, 1000)].map((x, i) => ({ x, i }));

  /* Corrientes: periódicas (ráfagas) o constantes. fx/fy son aceleraciones. */
  const CURRENTS = [
    { x: s(1, 300), w: 900, y0: 0, y1: 720, fx: -430, fy: -60, period: 9, dur: 3, phase: 2, kind: "ráfaga" },
    { x: CHASM.x + 60, w: CHASM.w - 120, y0: 420, y1: 2000, fx: 0, fy: 420, period: 0, kind: "abismo" },
    { x: s(6, 0), w: 1280, y0: 0, y1: 720, fx: 380, fy: -140, period: 8, dur: 3, phase: 0, kind: "corriente" },
    { x: s(7, 200), w: 900, y0: 0, y1: 720, fx: -460, fy: 40, period: 10, dur: 3, phase: 5, kind: "ráfaga" },
    { x: s(10, 0), w: 0, y0: 0, y1: 0, fx: 0, fy: 0, period: 0, kind: "succión" }, // la usa el jefe
  ];
  /* Chorros de burbujas del lomo de la bestia: empujan hacia arriba en cada exhalación. */
  const JETS = [s(9, 240), s(9, 560), s(9, 880)].map((x, i) => ({ x, w: 90, period: 4.2, phase: i * 1.4 }));
  const DARK = [1, 2, 3, 4]; // fondos oscuros: la luz propia importa
  const SAND = [0, 2, 3, 8, 11];

  function floorAt(x) {
    for (const g of SEGMENTS) if (x >= g.x && x < g.x + g.w) return g.y;
    return null;
  }
  const inChasm = (x) => x > CHASM.x && x < CHASM.x + CHASM.w;

  class Level5 {
    constructor(save) {
      this.reset(save);
    }
    reset(save) {
      // V12.3: tolerate old/partial checkpoint data without NaN or missing arrays.
      if (save && typeof save === "object" && !Array.isArray(save)) {
        const n = (v, fallback = 0) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : fallback;
        const ids = (v, limit) => Array.isArray(v) ? [...new Set(v.filter(x => Number.isInteger(x) && x >= 0 && x < limit))] : [];
        save = { ...save, flag: Number.isInteger(save.flag) ? clamp(save.flag, -1, FLAGS.length - 1) : -1,
          score: n(save.score), pearls: Math.floor(n(save.pearls)), whirl: save.whirl === 0 ? 0 : 1,
          taken: ids(save.taken, ITEMS.length), cleared: ids(save.cleared, ENEMIES.length) };
      } else save = null;
      const flag = save ? FLAGS[save.flag] : null;
      const x = flag ? flag.x + 60 : START_X;
      this.time = 0;
      this.player = { x, y: floorAt(x), vx: 0, vy: 0, face: 1, grounded: true, state: "idle", phase: 0, strokeCd: 0, invuln: 0, dead: false, death: 0, crouch: 0, safeX: x, swim: 0, hurtT: 0 };
      this.hp = 100;
      this.shield = save ? !!save.shield : false;
      this.score = save ? save.score : 0;
      this.pearls = save ? save.pearls : 0;
      this.flag = save ? save.flag : -1;
      this.whirl = { charges: save ? save.whirl : 1, t: 0, hitCd: 0 };
      this.items = ITEMS.map((it) => ({ ...it, taken: !!(save && save.taken.includes(it.id)) }));
      this.enemies = ENEMIES.map(([kind, ex, ey, a, b], id) => this.makeEnemy(kind, ex, ey, a, b, id));
      if (save) for (const e of this.enemies) if (save.cleared.includes(e.id)) { e.gone = true; e.alive = false; }
      this.bullets = [];
      this.shots = []; // proyectiles enemigos
      this.inks = []; // nubes de tinta que tapan la vista
      this.shootCd = 0;
      this.shootPose = 0;
      this.boss = { state: save && save.boss === "dead" ? "dead" : "waiting", hp: BOSS.hp, x: ARENA_RIGHT + 300, y: 300, vx: 0, vy: 0, face: -1, t: 0, attack: "", at: 0, phase: 1, hitFlash: 0, frame: 0, cycle: 0, mouth: 0, suction: 0, spawned: 0 };
      this.complete = false;
      this.won = false;
      this.zone = Math.floor(x / W);
      this.tremor = { t: 0, next: 18, on: false, strength: 0 };
      this.eyes = save ? !!save.eyes : false;
      this.gust = 0;
      this.saved = save || this.snapshot();
      this.stats = { kills: 0, damage: 0, deaths: 0 };
    }
    makeEnemy(kind, x, y, a, b, id) {
      const fy = floorAt(x) ?? 500;
      const e = { id, kind, x, y: y || fy, y0: y || fy, hp: HP[kind], t: (id * 0.37) % 3, state: "idle", st: 0, face: -1, alive: true, gone: false, death: 0, flash: 0, cd: 1 + (id % 3) };
      if (kind === "cangrejo") Object.assign(e, { a, b, face: 1, y: fy });
      if (kind === "almeja" || kind === "pulpo") e.y = fy;
      if (kind === "morena") Object.assign(e, { y: fy - 112, out: 0, face: -1 });
      if (kind === "cria") Object.assign(e, { hx: x, hy: e.y, vx: 0, vy: 0 });
      return e;
    }
    snapshot() {
      return {
        flag: this.flag,
        score: this.score,
        pearls: this.pearls,
        whirl: this.whirl ? this.whirl.charges : 1,
        shield: this.shield,
        taken: (this.items || []).filter((i) => i.taken).map((i) => i.id),
        cleared: (this.enemies || []).filter((e) => !e.alive).map((e) => e.id),
        boss: this.boss ? this.boss.state : "waiting",
        eyes: this.eyes,
      };
    }
    get arena() {
      return this.boss.state === "intro" || this.boss.state === "fight" || this.boss.state === "dying";
    }
    floorAt(x) {
      return floorAt(x);
    }
    floorSegments() {
      return SEGMENTS;
    }
    currentAt(x, y) {
      let fx = 0,
        fy = 0;
      for (const c of CURRENTS) {
        if (!c.w || x < c.x || x > c.x + c.w || y < c.y0 || y > c.y1) continue;
        if (c.period && (this.time + c.phase) % c.period > c.dur) continue;
        fx += c.fx;
        fy += c.fy;
      }
      for (const j of JETS) if (Math.abs(x - j.x) < j.w / 2 && this.jetOn(j)) fy -= 1500;
      return { fx, fy };
    }
    jetOn(j) {
      return (this.time + j.phase) % j.period < 1.1;
    }
    gustActive(x) {
      for (const c of CURRENTS) if (c.period && c.w && x > c.x - 200 && x < c.x + c.w + 200 && (this.time + c.phase) % c.period < c.dur) return c;
      return null;
    }

    /* ---------- Paso principal ---------- */
    step(dt, input) {
      const ev = [];
      this.time += dt;
      const p = this.player;
      this.zone = clamp(Math.floor(p.x / W), 0, SCREENS - 1);
      this.shootCd = Math.max(0, this.shootCd - dt);
      this.shootPose = Math.max(0, this.shootPose - dt);
      if (p.dead) {
        p.death += dt;
        p.vy = -40;
        p.y += p.vy * dt;
        if (p.death > 2.2) this.respawn(ev);
        this.updateWorld(dt, ev, false);
        return ev;
      }
      if (this.complete) return ev;
      this.movePlayer(dt, input, ev);
      if (input.whirlPressed) this.startWhirl(ev);
      if ((input.shoot || input.shootPressed) && this.shootCd <= 0 && this.whirl.t <= 0) this.shoot(ev);
      this.updateWorld(dt, ev, true);
      this.collect(ev);
      this.checkFlags(ev);
      this.beastEvents(dt, ev);
      if (this.boss.state === "dead" && p.x > EXIT_X && !this.complete) {
        this.complete = true;
        this.won = true;
        this.score += 2000 + Math.round(this.hp * 10);
        ev.push({ type: "complete" });
      }
      return ev;
    }
    movePlayer(dt, input, ev) {
      const p = this.player;
      p.invuln = Math.max(0, p.invuln - dt);
      p.strokeCd = Math.max(0, p.strokeCd - dt);
      p.hurtT = Math.max(0, p.hurtT - dt);
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const cur = this.currentAt(p.x, p.y - 60);
      if (this.whirl.t > 0) {
        // Torbellino: se mueve libre en las dos direcciones, rápido e invencible.
        this.whirl.t -= dt;
        const up = (input.up || input.jump ? 1 : 0) - (input.down ? 1 : 0);
        p.vx = approach(p.vx, dir * 420, 2600 * dt);
        p.vy = approach(p.vy, -up * 330, 2200 * dt);
        if (dir) p.face = dir;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        this.limits(p);
        const fy = floorAt(p.x);
        if (fy !== null && p.y > fy) p.y = fy;
        p.grounded = fy !== null && p.y >= fy - 1;
        p.state = "whirl";
        if (this.whirl.t <= 0) {
          this.whirl.t = 0;
          p.invuln = 0.8;
          ev.push({ type: "whirlOff", x: p.x, y: p.y });
        }
        return;
      }
      const grounded = p.grounded;
      const max = grounded ? (input.run ? PHY.run : PHY.walk) : input.run ? PHY.swimRun : PHY.swimMax;
      const acc = grounded ? PHY.accelGround : PHY.accelWater;
      p.crouch = approach(p.crouch, input.down && grounded ? 1 : 0, dt * 8);
      // Las corrientes y la succión del jefe corren el objetivo de velocidad: hay que resistirlas.
      const ext = this.pull || { x: 0, y: 0 };
      const drift = cur.fx * (p.grounded ? 0.5 : 0.62) + ext.x;
      const target = (p.crouch > 0.5 ? 0 : dir * max) + drift * (p.crouch > 0.5 ? 0.3 : 1);
      p.vx = approach(p.vx, target, acc * dt);
      if (dir) p.face = dir;
      // Saltar desde el piso o dar una brazada en el agua.
      if (input.jumpPressed) {
        if (grounded) {
          p.vy = -PHY.jump;
          p.grounded = false;
          p.strokeCd = PHY.strokeCd;
          ev.push({ type: "jump", x: p.x, y: p.y });
        } else if (p.strokeCd <= 0) {
          p.vy = Math.min(p.vy, -PHY.stroke);
          p.strokeCd = PHY.strokeCd;
          p.swim = 0.5;
          ev.push({ type: "stroke", x: p.x, y: p.y - 70 });
        }
      }
      p.swim = Math.max(0, p.swim - dt);
      if (!p.grounded) {
        let gk = input.jump && p.vy > -60 ? PHY.floatGrav : 1;
        if (input.down) gk = 2.2;
        p.vy += PHY.grav * gk * dt;
        p.vy = Math.min(p.vy, input.down ? PHY.diveMax : PHY.sinkMax);
        p.vx *= 1 - Math.min(0.5, PHY.dragWater * dt * 0.2);
      }
      // Corrientes y chorros.
      p.vy += (cur.fy + ext.y) * dt;
      if (ext.lift && p.grounded) {
        p.grounded = false;
        p.vy = -160;
      }
      if (cur.fy < -600 && p.grounded) {
        p.grounded = false;
        p.vy = -200;
      }
      if (p.y < TOP + 30 && p.vy < 0) p.vy *= 0.85;
      // Movimiento horizontal con paredes: los escalones altos frenan.
      const nx = p.x + p.vx * dt;
      const nf = floorAt(nx);
      if (nf !== null && nf < p.y - PHY.step && (p.grounded || p.y > nf)) {
        p.vx = 0;
      } else p.x = nx;
      p.y += p.vy * dt;
      this.limits(p);
      const fy = floorAt(p.x);
      const was = p.grounded;
      if (fy !== null && p.y >= fy && p.vy >= 0) {
        if (!was && p.vy > 120) ev.push({ type: p.vy > 330 ? "hardland" : "land", x: p.x, y: fy });
        p.y = fy;
        p.vy = 0;
        p.grounded = true;
        p.safeX = p.x;
      } else if (fy !== null && p.grounded && p.y < fy && fy - p.y < PHY.step + 4 && p.vy >= 0) {
        p.y = fy; // baja escalones sin despegarse
      } else p.grounded = false;
      // El abismo: caer muy hondo quita leche y devuelve a la orilla.
      if (p.y > 900) {
        this.damage(DMG.fall, ev, "fall", true);
        if (!p.dead) {
          const back = p.x < CHASM.x + CHASM.w / 2 ? CHASM.x - 90 : CHASM.x + CHASM.w + 90;
          p.x = inChasm(p.safeX) ? back : p.safeX;
          p.y = floorAt(p.x) ?? 380;
          p.vx = p.vy = 0;
          p.grounded = true;
          p.invuln = 1.2;
          ev.push({ type: "recover", x: p.x, y: p.y });
        }
      }
      // Estado para el dibujo.
      const speed = Math.abs(p.vx);
      if (p.grounded) {
        p.phase += dt * (speed / 26);
        p.state = p.crouch > 0.5 ? "crouch" : speed > 230 ? "run" : speed > 25 ? "walk" : "idle";
        if (speed > 140 && Math.floor(p.phase * 2) !== Math.floor((p.phase - dt * (speed / 26)) * 2)) ev.push({ type: "sand", x: p.x - p.face * 18, y: p.y, big: speed > 230 });
      } else {
        p.phase += dt * 9;
        p.state = Math.abs(p.vx) > 90 || p.swim > 0 ? "swim" : p.vy < -40 ? "rise" : "sink";
      }
    }
    limits(p) {
      const lo = this.arena ? ARENA_X + 40 : 40;
      const hi = this.arena ? ARENA_RIGHT - 40 : WIDTH - 30;
      p.x = clamp(p.x, lo, hi);
      if (p.y < TOP) {
        p.y = TOP;
        if (p.vy < 0) p.vy = 0;
      }
    }
    startWhirl(ev) {
      const p = this.player;
      if (this.whirl.t > 0 || this.whirl.charges <= 0 || p.dead) {
        if (this.whirl.charges <= 0 && this.whirl.t <= 0) ev.push({ type: "whirlEmpty" });
        return;
      }
      this.whirl.charges--;
      this.saved.whirl = 0;
      this.whirl.t = WHIRL_TIME;
      this.whirl.hitCd = 0;
      p.invuln = 0;
      p.grounded = false;
      p.vy = -120;
      ev.push({ type: "whirlOn", x: p.x, y: p.y });
    }
    shoot(ev) {
      const p = this.player;
      this.shootCd = 0.3;
      this.shootPose = 0.24;
      const y = p.y - (p.crouch > 0.5 ? 50 : p.grounded ? 82 : 70);
      this.bullets.push({ x: p.x + p.face * 36, y, vx: p.face * 600 + p.vx * 0.3, vy: 0, life: 1 });
      ev.push({ type: "shoot", x: p.x, y });
    }
    damage(amount, ev, kind, ignoreInvuln = false) {
      const p = this.player;
      if (p.dead || this.complete) return false;
      if (this.whirl.t > 0 && kind !== "fall") return false;
      if (!ignoreInvuln && p.invuln > 0) return false;
      if (this.shield && kind !== "fall") {
        this.shield = false;
        p.invuln = 1;
        ev.push({ type: "shield", x: p.x, y: p.y });
        return false;
      }
      this.hp = Math.max(0, this.hp - amount);
      this.stats.damage += amount;
      p.invuln = 1.1;
      p.hurtT = 0.4;
      ev.push({ type: "hurt", x: p.x, y: p.y - 80, amount, kind });
      if (this.hp <= 0) {
        p.dead = true;
        p.death = 0;
        p.vx = 0;
        this.whirl.t = 0;
        this.stats.deaths++;
        ev.push({ type: "death", x: p.x, y: p.y });
      }
      return true;
    }
    knock(from, power = 260) {
      const p = this.player;
      p.vx = Math.sign(p.x - from || 1) * power;
      p.vy = Math.min(p.vy, -200);
      p.grounded = false;
    }
    respawn(ev) {
      const stats = this.stats;
      // Preserve rewards AND their sources; restart position remains the checkpoint.
      const snap = { ...this.snapshot(), flag: this.saved.flag };
      this.reset(snap);
      this.stats = stats;
      ev.push({ type: "respawn" });
    }

    /* ---------- Mundo: balas, enemigos, jefe ---------- */
    updateWorld(dt, ev, live) {
      const p = this.player;
      for (const b of this.bullets) {
        b.life -= dt;
        b.vx *= 1 - 0.9 * dt; // el agua frena la leche
        b.vy += 40 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        const fy = floorAt(b.x);
        if (fy !== null && b.y > fy - 4) b.life = 0;
      }
      for (const sh of this.shots) {
        sh.life -= dt;
        if (sh.kind === "burbuja") {
          // Las burbujas del jefe persiguen un poco.
          const dx = p.x - sh.x,
            dy = p.y - 70 - sh.y,
            d = Math.hypot(dx, dy) || 1;
          sh.vx = approach(sh.vx, (dx / d) * 170, 120 * dt);
          sh.vy = approach(sh.vy, (dy / d) * 170 - 20, 120 * dt);
        }
        if (sh.kind === "tinta") {
          sh.vx *= 1 - 0.5 * dt;
          sh.vy *= 1 - 0.5 * dt;
        }
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        sh.rot = (sh.rot || 0) + dt * 8;
        if (live && !p.dead && Math.abs(sh.x - p.x) < 26 && Math.abs(sh.y - (p.y - 70)) < 58) {
          sh.life = 0;
          if (sh.kind === "tinta") this.addInk(p.x, p.y - 80, ev);
          this.damage(DMG[sh.kind] || 8, ev, sh.kind);
        }
      }
      for (const ink of this.inks) ink.life -= dt;
      this.inks = this.inks.filter((i) => i.life > 0);
      for (const e of this.enemies) this.updateEnemy(e, dt, ev, live);
      this.updateBoss(dt, ev, live);
      // Impactos de la leche.
      for (const b of this.bullets) {
        if (b.life <= 0) continue;
        for (const e of this.enemies) {
          if (!e.alive || e.gone) continue;
          const hb = this.hitbox(e);
          if (!hb || Math.abs(b.x - hb.x) > hb.w / 2 + 8 || Math.abs(b.y - hb.y) > hb.h / 2 + 8) continue;
          b.life = 0;
          if (this.shielded(e)) {
            ev.push({ type: "tink", x: b.x, y: b.y, kind: e.kind });
            break;
          }
          this.hurtEnemy(e, 1, ev, "shot");
          break;
        }
        if (b.life > 0) this.hitBoss(b, ev);
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      this.shots = this.shots.filter((s) => s.life > 0);
      for (const it of this.items) it.t += dt;
      this.gust = this.gustActive(p.x) ? Math.min(1, this.gust + dt * 2) : Math.max(0, this.gust - dt * 1.2);
    }
    hitbox(e) {
      switch (e.kind) {
        case "medusa":
          return { x: e.x, y: e.y, w: 70, h: 120, top: e.y - 60 };
        case "cangrejo":
          return { x: e.x, y: e.y - 40, w: 76, h: 76, top: e.y - 80 };
        case "almeja":
          return { x: e.x, y: e.y - 34, w: 150, h: 64, top: e.y - 66 };
        case "morena":
          return e.out > 0.15 ? { x: e.x + e.face * (30 + e.out * 120), y: e.y, w: 70 + e.out * 120, h: 60, top: e.y - 30 } : null;
        case "globo":
          return { x: e.x, y: e.y, w: e.state === "puffed" || e.state === "inflate" ? 120 : 84, h: e.state === "puffed" || e.state === "inflate" ? 110 : 76, top: e.y - 45 };
        case "pulpo":
          return { x: e.x, y: e.y - 60, w: 90, h: 110, top: e.y - 115 };
        case "cria":
          return { x: e.x, y: e.y, w: 56, h: 46, top: e.y - 23 };
      }
      return null;
    }
    shielded(e) {
      return (e.kind === "cangrejo" && e.state === "hide") || (e.kind === "almeja" && (e.state === "closed" || e.state === "snap"));
    }
    hurtEnemy(e, amount, ev, how) {
      e.hp -= amount;
      e.flash = 0.15;
      if (e.hp > 0) {
        ev.push({ type: "hit", x: e.x, y: e.y - 30, kind: e.kind });
        return;
      }
      this.killEnemy(e, ev, how);
    }
    killEnemy(e, ev, how) {
      e.alive = false;
      e.death = 0;
      this.stats.kills++;
      const pts = POINTS[e.kind] + (how === "stomp" ? 50 : 0);
      this.score += pts;
      ev.push({ type: "pop", x: e.x, y: (this.hitbox(e) || e).y, kind: e.kind, how });
      ev.push({ type: "points", x: e.x, y: e.y - 90, value: pts });
    }
    // Contacto entre la botella y un enemigo: aplastar, torbellino o daño.
    contact(e, ev) {
      const p = this.player;
      if (p.dead || !e.alive) return;
      const hb = this.hitbox(e);
      if (!hb) return;
      // Caja de la botella: 48 de ancho, del pie hasta la tapa (≈128).
      if (Math.abs(p.x - hb.x) > hb.w / 2 + 24 || p.y < hb.y - hb.h / 2 || p.y - 128 > hb.y + hb.h / 2) return;
      if (this.whirl.t > 0) {
        this.killEnemy(e, ev, "whirl");
        return;
      }
      const stomp = p.vy > 40 && p.y < hb.top + 28 && !p.grounded;
      if (stomp) {
        if (e.kind === "globo" && (e.state === "puffed" || e.state === "inflate")) {
          this.damage(DMG.globo, ev, "globo");
          p.vy = -420;
          return;
        }
        if (e.kind === "cangrejo") {
          e.state = "hide";
          e.st = 2.6;
          p.vy = -460;
          this.score += 50;
          ev.push({ type: "stomp", x: e.x, y: hb.top, kind: e.kind, hide: true });
          return;
        }
        if (e.kind === "almeja" || e.kind === "morena") {
          if (e.kind === "almeja" && e.state !== "closed") return this.bite(e, ev);
          p.vy = -420;
          ev.push({ type: "stomp", x: e.x, y: hb.top, kind: e.kind, hide: true });
          return;
        }
        p.vy = -460;
        ev.push({ type: "stomp", x: e.x, y: hb.top, kind: e.kind });
        this.killEnemy(e, ev, "stomp");
        return;
      }
      if (this.shielded(e) && e.kind === "cangrejo") return; // escondido no pellizca
      if (e.kind === "almeja") return; // la almeja solo lastima cuando se cierra de golpe
      if (this.damage(DMG[e.kind], ev, e.kind)) {
        this.knock(e.x, e.kind === "pulpo" ? 360 : 260);
        if (e.kind === "cria") e.vx = -Math.sign(p.x - e.x || 1) * 240; // la cría rebota hacia atrás
      }
    }
    bite(e, ev) {
      if (this.damage(DMG.almeja, ev, "almeja")) {
        const p = this.player;
        p.vy = -520;
        p.vx = Math.sign(p.x - e.x || 1) * 200;
        p.grounded = false;
        ev.push({ type: "snap", x: e.x, y: e.y - 40 });
      }
    }
    updateEnemy(e, dt, ev, live) {
      if (e.gone) return;
      e.flash = Math.max(0, e.flash - dt);
      if (!e.alive) {
        e.death += dt;
        e.y -= 20 * dt;
        if (e.death > 1.2) e.gone = true;
        return;
      }
      e.t += dt;
      const p = this.player;
      const dx = p.x - e.x,
        dy = p.y - 70 - e.y,
        dist = Math.hypot(dx, dy);
      const near = Math.abs(dx) < 900;
      if (!near && e.kind !== "cria") return;
      switch (e.kind) {
        case "medusa":
          e.y = e.y0 + Math.sin(e.t * 1.15) * 70;
          e.x += Math.sin(e.t * 0.5) * 12 * dt;
          break;
        case "cangrejo": {
          if (e.state === "hide") {
            e.st -= dt;
            if (e.st <= 0) e.state = "walk";
            break;
          }
          if (e.state === "pinch") {
            e.st -= dt;
            if (e.st <= 0) {
              e.state = "walk";
              e.cd = 1.2;
            }
          } else {
            e.state = "walk";
            e.x += e.face * 70 * dt;
            if (e.x > e.b) e.face = -1;
            if (e.x < e.a) e.face = 1;
            e.cd -= dt;
            if (Math.abs(dx) < 140 && Math.abs(p.y - e.y) < 90 && e.cd <= 0) {
              e.face = Math.sign(dx) || 1;
              e.state = "pinch";
              e.st = 0.55;
              ev.push({ type: "pinch", x: e.x, y: e.y - 40 });
            }
          }
          if (Math.random() < dt * 2.4) ev.push({ type: "sandSmall", x: e.x, y: e.y });
          break;
        }
        case "almeja": {
          // Respira entreabierta; si pasás por encima se cierra de golpe.
          if (e.state === "idle" || e.state === "closed") {
            e.state = (e.t % 4.4) < 2.6 ? "idle" : "closed";
            if (e.state === "idle" && Math.abs(dx) < 70 && p.y < e.y - 20 && p.y > e.y - 260 && live) {
              e.state = "snap";
              e.st = 0;
              ev.push({ type: "snapWarn", x: e.x, y: e.y - 40 });
            }
          } else if (e.state === "snap") {
            e.st += dt;
            if (e.st > 0.32 && e.st - dt <= 0.32) {
              ev.push({ type: "snap", x: e.x, y: e.y - 40 });
              if (Math.abs(p.x - e.x) < 85 && p.y > e.y - 150 && p.y <= e.y + 4 && this.whirl.t <= 0) this.bite(e, ev);
              ev.push({ type: "sandSmall", x: e.x, y: e.y, big: true });
            }
            if (e.st > 1.1) {
              e.state = "closed";
              e.t = 2.6; // queda cerrada un rato
            }
          }
          break;
        }
        case "morena": {
          // Sale disparada del ojo de buey cuando pasás cerca y vuelve a esconderse.
          e.face = dx < 0 ? -1 : 1;
          if (e.state === "idle") {
            e.out = Math.max(0, e.out - dt * 3);
            e.cd -= dt;
            if (Math.abs(dx) < 300 && Math.abs(dy) < 130 && e.cd <= 0 && live) {
              e.state = "strike";
              e.st = 0;
              ev.push({ type: "morena", x: e.x, y: e.y });
            }
          } else {
            e.st += dt;
            e.out = e.st < 0.25 ? e.st / 0.25 : e.st < 0.75 ? 1 : Math.max(0, 1 - (e.st - 0.75) / 0.4);
            if (e.st > 1.15) {
              e.state = "idle";
              e.cd = 1.4;
              e.out = 0;
            }
          }
          break;
        }
        case "globo": {
          e.y = e.y0 + Math.sin(e.t * 1.4) * 22;
          e.face = dx < 0 ? -1 : 1;
          if (e.state === "idle") {
            e.cd -= dt;
            if (dist < 250 && e.cd <= 0 && live) {
              e.state = "inflate";
              e.st = 0;
              ev.push({ type: "inflate", x: e.x, y: e.y });
            }
          } else if (e.state === "inflate") {
            e.st += dt;
            if (e.st > 0.6) {
              e.state = "puffed";
              e.st = 0;
              // Un cubierto en cada dirección.
              for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2;
                this.shots.push({ kind: "cubierto", x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, life: 1.6, rot: a, tool: i % 3 });
              }
              ev.push({ type: "cubiertos", x: e.x, y: e.y });
            }
          } else {
            e.st += dt;
            if (e.st > 1.4) {
              e.state = "idle";
              e.cd = 2.4;
            }
          }
          break;
        }
        case "pulpo": {
          e.face = dx < 0 ? -1 : 1;
          e.cd -= dt;
          if (e.state === "swing") {
            e.st += dt;
            if (e.st > 0.25 && e.st - dt <= 0.25 && Math.abs(dx) < 130 && Math.abs(p.y - e.y) < 140 && live) {
              if (this.damage(DMG.pulpo, ev, "pulpo")) this.knock(e.x, 420);
            }
            if (e.st > 0.6) {
              e.state = "idle";
              e.cd = 1.2;
            }
          } else if (e.state === "ink") {
            e.st += dt;
            if (e.st > 0.5) {
              e.state = "idle";
              e.cd = 3.6;
            }
          } else if (e.cd <= 0 && live) {
            if (Math.abs(dx) < 130 && Math.abs(p.y - e.y) < 140) {
              e.state = "swing";
              e.st = 0;
              ev.push({ type: "swing", x: e.x, y: e.y - 60 });
            } else if (Math.abs(dx) < 520) {
              e.state = "ink";
              e.st = 0;
              const iy = p.y - e.y,
                d = Math.hypot(dx, iy) || 1;
              this.shots.push({ kind: "tinta", x: e.x, y: e.y - 70, vx: (dx / d) * 420, vy: (iy / d) * 420, life: 1.8 });
              ev.push({ type: "ink", x: e.x, y: e.y - 70 });
            }
          }
          break;
        }
        case "cria": {
          // En lo oscuro: si ven tu luz, te persiguen; si no, vuelven a su lugar.
          const sees = dist < 330 && live && !p.dead;
          const tx = sees ? p.x : e.hx + Math.sin(e.t * 0.7 + e.id) * 40,
            ty = sees ? p.y - 70 : e.hy + Math.cos(e.t * 0.9 + e.id) * 20;
          const sp = sees ? 150 : 60;
          const ddx = tx - e.x,
            ddy = ty - e.y,
            d = Math.hypot(ddx, ddy) || 1;
          e.vx = approach(e.vx, (ddx / d) * sp, 260 * dt);
          e.vy = approach(e.vy, (ddy / d) * sp + Math.sin(e.t * 6) * 30, 260 * dt);
          e.x += e.vx * dt;
          e.y += e.vy * dt;
          const fy = floorAt(e.x);
          if (fy !== null && e.y > fy - 26) e.y = fy - 26;
          if (Math.abs(e.vx) > 8) e.face = e.vx < 0 ? -1 : 1;
          if (sees && e.state !== "chase") ev.push({ type: "criaSees", x: e.x, y: e.y });
          e.state = sees ? "chase" : "idle";
          break;
        }
      }
      if (live) this.contact(e, ev);
    }
    addInk(x, y, ev) {
      if (this.inks.length < 4) this.inks.push({ x, y, life: 3.2, max: 3.2, r: 150 + Math.random() * 40 });
      ev.push({ type: "inkHit", x, y });
    }
    collect(ev) {
      const p = this.player;
      const pull = this.whirl.t > 0 ? 240 : 0;
      for (const it of this.items) {
        if (it.taken) continue;
        const iy = it.y + Math.sin(it.t * 2) * 6;
        const dx = it.x - p.x,
          dy = iy - (p.y - 70);
        if (pull && Math.hypot(dx, dy) < pull) {
          it.x -= dx * 0.08;
          it.y -= dy * 0.08;
        }
        if (Math.abs(dx) > 40 || Math.abs(dy) > 75) continue;
        it.taken = true;
        if (it.kind === "perla") {
          this.pearls++;
          this.score += 50;
        } else if (it.kind === "leche") {
          this.hp = 100;
          this.score += 100;
        } else if (it.kind === "tapa") {
          this.shield = true;
          this.score += 100;
        }
        ev.push({ type: "collect", kind: it.kind, x: it.x, y: iy });
      }
    }
    checkFlags(ev) {
      const p = this.player;
      for (const f of FLAGS) {
        if (f.i <= this.flag || p.x < f.x - 20) continue;
        this.flag = f.i;
        this.hp = 100;
        this.saved = this.snapshot();
        ev.push({ type: "checkpoint", index: f.i, x: f.x, snapshot: this.saved });
      }
    }
    /* La bestia se hace sentir: temblores cada vez más seguidos, ojos en el abismo, corrientes. */
    beastEvents(dt, ev) {
      const p = this.player,
        tr = this.tremor;
      if (this.boss.state === "waiting") {
        tr.next -= dt;
        if (tr.next <= 0 && !tr.on) {
          tr.on = true;
          tr.t = 0;
          tr.strength = 0.4 + this.zone * 0.05;
          ev.push({ type: "tremor", x: p.x, strength: tr.strength });
        }
      }
      if (tr.on) {
        tr.t += dt;
        if (tr.t > 2) {
          tr.on = false;
          tr.next = Math.max(9, 26 - this.zone * 1.6);
        }
      }
      if (!this.eyes && inChasm(p.x) && p.x > CHASM.x + 250) {
        this.eyes = true;
        ev.push({ type: "eyes", x: CHASM.x + CHASM.w / 2, y: 640 });
      }
      const gust = this.gustActive(p.x);
      if (gust && !this.lastGust) ev.push({ type: "gust", dir: Math.sign(gust.fx) || 1 });
      this.lastGust = !!gust;
    }

    /* ---------- El Tragabarcos ---------- */
    lantern() {
      const b = this.boss;
      return { x: b.x + b.face * 120, y: b.y - 62 };
    }
    mouthPos() {
      const b = this.boss;
      return { x: b.x + b.face * 175, y: b.y + 28 };
    }
    hitBoss(bullet, ev) {
      const b = this.boss;
      if (b.state !== "fight") return;
      const l = this.lantern(),
        m = this.mouthPos();
      let dmg = 0,
        spot = "";
      if (Math.hypot(bullet.x - l.x, bullet.y - l.y) < 52) {
        dmg = BOSS.weak;
        spot = "farol";
      } else if (b.mouth > 0.5 && Math.hypot(bullet.x - m.x, bullet.y - m.y) < 80) {
        dmg = BOSS.weak;
        spot = "boca";
      } else if (Math.abs(bullet.x - b.x) < 200 && Math.abs(bullet.y - b.y) < 110) {
        dmg = BOSS.body;
        spot = "cuerpo";
      }
      if (!dmg) return;
      bullet.life = 0;
      this.hurtBoss(dmg, ev, spot);
    }
    hurtBoss(dmg, ev, spot) {
      const b = this.boss;
      b.hp = Math.max(0, b.hp - dmg);
      b.hitFlash = 0.15;
      this.score += dmg * 40;
      ev.push({ type: "bossHit", x: b.x, y: b.y, spot, amount: dmg });
      if (b.phase === 1 && b.hp <= BOSS.hp / 2) {
        b.phase = 2;
        ev.push({ type: "bossPhase", phase: 2 });
      }
      if (b.hp <= 0) {
        b.state = "dying";
        b.t = 0;
        this.whirl.t = Math.min(this.whirl.t, 0.5);
        this.score += 5000;
        this.shots = [];
        for (const e of this.enemies) if (e.kind === "cria" && e.alive && e.x > ARENA_X) e.gone = true;
        ev.push({ type: "bossDown", x: b.x, y: b.y });
      }
    }
    updateBoss(dt, ev, live) {
      const b = this.boss,
        p = this.player;
      b.hitFlash = Math.max(0, b.hitFlash - dt);
      b.t += dt;
      this.pull = { x: 0, y: 0, lift: false };
      if (b.state === "waiting") {
        if (live && p.x > ARENA_X + 220) {
          b.state = "intro";
          b.t = 0;
          b.x = ARENA_RIGHT + 260;
          b.y = 760;
          b.face = -1;
          ev.push({ type: "bossIntro" });
        }
        return;
      }
      if (b.state === "dead") return;
      if (b.state === "intro") {
        // Sube desde el abismo, ruge y empieza.
        b.x = approach(b.x, ARENA_RIGHT - 300, 380 * dt);
        b.y = approach(b.y, 300, 260 * dt);
        b.mouth = b.t > 1.6 && b.t < 2.8 ? 1 : 0;
        if (b.t > 1.6 && b.t - dt <= 1.6) ev.push({ type: "roar" });
        if (b.t > 3.6) {
          b.state = "fight";
          b.attack = "cruise";
          b.at = 0;
        }
        return;
      }
      if (b.state === "dying") {
        b.mouth = 0.4;
        b.y += 90 * dt;
        b.x += b.face * 20 * dt;
        if (b.t > 3.4) {
          b.state = "dead";
          this.saved = this.snapshot();
          ev.push({ type: "bossGone", snapshot: this.saved });
        }
        return;
      }
      // Pelea.
      const fast = b.phase === 2 ? 1.25 : 1;
      b.at += dt;
      const dx = p.x - b.x;
      switch (b.attack) {
        case "cruise": {
          b.mouth = approach(b.mouth, 0, dt * 3);
          const side = p.x < ARENA_X + 640 ? ARENA_RIGHT - 280 : ARENA_X + 280;
          b.x = approach(b.x, side, 260 * fast * dt);
          b.y = approach(b.y, clamp(p.y - 140, 230, 360) + Math.sin(b.t * 2) * 30, 120 * dt);
          b.face = dx < 0 ? -1 : 1;
          if (b.at > 2.2 / fast) {
            const order = ["charge", "suction", "spit", "charge", "spit", "suction"];
            b.attack = order[b.cycle % order.length];
            b.cycle++;
            b.at = 0;
            if (b.attack === "charge") ev.push({ type: "chargeWarn" });
            if (b.attack === "suction") ev.push({ type: "suction" });
          }
          break;
        }
        case "charge": {
          // Aviso con el farol y embestida a tu altura.
          if (b.at < 0.9) {
            b.face = dx < 0 ? -1 : 1;
            b.y = approach(b.y, clamp(p.y - 80, 200, 470), 300 * dt);
            b.x -= b.face * 40 * dt;
            b.mouth = 0.3;
          } else {
            b.vx = b.face * (b.phase === 2 ? 940 : 760);
            b.x += b.vx * dt;
            b.mouth = 1;
            if ((b.face > 0 && b.x > ARENA_RIGHT - 160) || (b.face < 0 && b.x < ARENA_X + 160)) {
              b.attack = "cruise";
              b.at = 0;
              b.face = -b.face;
              ev.push({ type: "turn" });
            }
          }
          break;
        }
        case "suction": {
          // Abre la boca y aspira: todo se inclina hacia él.
          b.mouth = approach(b.mouth, 1, dt * 3);
          b.face = dx < 0 ? -1 : 1;
          b.suction = b.at > 0.5 && b.at < 3.6 ? 1 : 0;
          if (b.suction && live && this.whirl.t <= 0) {
            const m = this.mouthPos();
            const ddx = m.x - p.x,
              ddy = m.y - (p.y - 70),
              d = Math.hypot(ddx, ddy) || 1;
            const force = (b.phase === 2 ? 640 : 520) * clamp(700 / (d + 200), 0.5, 1.6);
            this.pull = { x: (ddx / d) * force * 0.55, y: (ddy / d) * force * 0.9, lift: ddy < -120 && d < 520 };
            if (d < 85) {
              if (this.damage(DMG.bite, ev, "bite")) {
                p.vx = -b.face * 680;
                p.vy = -300;
                p.grounded = false;
                ev.push({ type: "bite", x: m.x, y: m.y });
              }
            }
          }
          if (b.at > 4) {
            b.attack = "cruise";
            b.at = 0;
            b.suction = 0;
          }
          break;
        }
        case "spit": {
          b.mouth = b.at < 1.4 ? 0.7 : 0;
          b.face = dx < 0 ? -1 : 1;
          const n = b.phase === 2 ? 5 : 4;
          const k = Math.floor(b.at / 0.28);
          if (b.at > 0.3 && k <= n && k !== b.spawned) {
            b.spawned = k;
            const m = this.mouthPos();
            this.shots.push({ kind: "burbuja", x: m.x, y: m.y, vx: b.face * 200, vy: (k - n / 2) * 50, life: 3.2 });
            ev.push({ type: "spit", x: m.x, y: m.y });
          }
          if (b.at > 1.8) {
            // En la fase II además libera crías.
            if (b.phase === 2 && this.enemies.filter((e) => e.kind === "cria" && e.alive && !e.gone && e.x > ARENA_X).length < 3) {
              const m = this.mouthPos();
              for (let i = 0; i < 2; i++) {
                const c = this.makeEnemy("cria", m.x + i * 30, m.y + i * 20, 0, 0, 1000 + this.enemies.length);
                c.hx = ARENA_X + 640;
                c.hy = 300;
                this.enemies.push(c);
              }
              ev.push({ type: "crias", x: m.x, y: m.y });
            }
            b.attack = "cruise";
            b.at = 0;
            b.spawned = -1;
          }
          break;
        }
      }
      b.x = clamp(b.x, ARENA_X + 120, ARENA_RIGHT - 120);
      // Contacto: el cuerpo empuja; la boca abierta en embestida muerde.
      if (live && !p.dead) {
        const near = Math.abs(p.x - b.x) < 190 && Math.abs(p.y - 70 - b.y) < 100;
        if (near) {
          if (this.whirl.t > 0) {
            this.whirl.hitCd -= dt;
            if (this.whirl.hitCd <= 0) {
              this.whirl.hitCd = 0.7;
              this.hurtBoss(BOSS.whirl, ev, "torbellino");
              b.attack = "cruise";
              b.at = 0;
            }
          } else if (p.vy > 60 && p.y - 70 < b.y - 60 && !p.grounded) {
            p.vy = -480;
            ev.push({ type: "stomp", x: p.x, y: p.y, kind: "jefe" });
            this.hurtBoss(2, ev, "lomo");
          } else if (this.damage(b.attack === "charge" ? DMG.charge : 12, ev, "jefe")) this.knock(b.x, 520);
        }
      }
    }
  }

  root.MilkLevel5Core = { Level5, W, WIDTH, SCREENS, ARENA_X, ARENA_RIGHT, EXIT_X, TOP, NAMES, SECTIONS, SEGMENTS, CHASM, FLAGS, ITEMS, ENEMIES, CURRENTS, JETS, DARK, SAND, PHY, DMG, BOSS, WHIRL_TIME, floorAt, inChasm };
  if (typeof module !== "undefined") module.exports = root.MilkLevel5Core;
})(typeof window !== "undefined" ? window : globalThis);
