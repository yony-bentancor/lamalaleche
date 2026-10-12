/* Nivel 4 · «Por las nubes» — simulación determinista, sin dibujo (se prueba en Node).
   Del último techo de la ciudad al mar de nubes, la tormenta y la estación del cielo,
   donde espera el Capitán Cúmulo. La etiqueta de la botella se convierte en paraguas:
   planea, aprovecha corrientes ascendentes, resiste ráfagas y, en la arena, vuela y dispara. */
(function (root) {
  "use strict";
  const P = root.MilkPhysics || (typeof require === "function" ? require("./physics.js") : null);
  const FLOOR = 520,
    STRIDE = 1170,
    CAM_MAX = 11 * STRIDE,
    ARENA_X = 12960,
    ARENA_W = 1700,
    ARENA_RIGHT = ARENA_X + ARENA_W,
    ARENA_CENTER = ARENA_X + ARENA_W / 2,
    WIDTH = ARENA_RIGHT + 60,
    FALL_Y = FLOOR + 170;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const near = (a, b, d) => Math.abs(a - b) < d;
  const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  const NAMES = [
    "El último techo",
    "La ciudad bajo los pies",
    "La primera corriente",
    "Un océano blanco",
    "Los molinos del aire",
    "El corredor de las ráfagas",
    "La frontera oscura",
    "El cementerio de los dirigibles",
    "El ojo de la tormenta",
    "El puerto suspendido",
    "El último amarre",
    "El Capitán Cúmulo",
  ];
  const SECTIONS = ["01 / POR ENCIMA DE LOS TECHOS", "02 / EL MAR DE NUBES", "03 / DENTRO DE LA TORMENTA", "04 / LA ESTACIÓN DEL CIELO"];
  /* Paraguas: la etiqueta de leche se despliega al mantener SALTAR en el aire. */
  const UMB = {
    glideFall: 110, // velocidad máxima de caída planeando
    tornFall: 300, // con el paraguas roto casi no frena
    airMax: 300, // velocidad horizontal planeando
    airAccel: 760,
    lift: 3900, // empuje de las corrientes ascendentes (supera la gravedad)
    liftMax: -340,
    flyThrust: 2950, // vuelo en la arena (↑ con el paraguas abierto)
    flyMax: -320,
    flyDrain: 26,
    flyRecharge: 40,
  };
  const DMG = { fall: 15, gull: 8, cloud: 6, drone: 10, bolt: 8, balloon: 10, spark: 8, lightning: 12, beam: 15, hail: 6, contact: 10 };
  const BOSS = { hp: 100, milk: 1, hot: 2, radius: 150 };
  const POWER_TIME = { cookie: 15, straw: 15, cacao: 20, uht: 9, torn: 4 };
  /* Huecos del piso: se cruzan saltando, planeando o con las corrientes. Ninguno supera lo que permite el paraguas. */
  const GAPS = [
    [1060, 360],
    [1900, 200],
    [2620, 280],
    [3080, 220],
    [3640, 260],
    [4120, 380],
    [4800, 300],
    [5250, 220],
    [6020, 240],
    [6500, 260],
    [7150, 240],
    [7640, 300],
    [8260, 420],
    [8820, 280],
    [10600, 330],
    [11080, 240],
    [11950, 340],
    [12450, 220],
  ].map(([x, w]) => ({ x, w }));
  /* Corrientes ascendentes: vapor (techos), térmicas (nubes) y hélices del puerto. */
  const UPDRAFTS = [
    { x: 2620, w: 280, top: 150, kind: "steam" },
    { x: 4120, w: 380, top: 190, kind: "thermal" },
    { x: 4800, w: 300, top: 120, kind: "thermal" },
    { x: 10600, w: 330, top: 140, kind: "fan" },
    { x: 11080, w: 240, top: 170, kind: "fan" },
  ];
  const STORM_ZONES = [6, 7];
  const RAIN_ZONES = [6, 7];
  const GUST_ZONE = 5;
  const BREEZE_ZONES = [1, 2];
  const SUCTION_ZONE = 10;
  const ROPE_X = 1010;
  function inGap(x, pad = 0) {
    return GAPS.find((g) => x > g.x - pad && x < g.x + g.w + pad) || null;
  }
  function build() {
    const platforms = [],
      items = [],
      enemies = [],
      shelters = [],
      flags = [2380, 5800, 9800, 12770].map((x, i) => ({ x, index: i, active: false }));
    let seq = 0;
    const add = (x, y, w, kind, opts = {}) => {
      const b = { id: "p" + seq++, x, y, w, h: 22, kind, baseX: x, baseY: y, ...opts };
      platforms.push(b);
      return b;
    };
    const item = (x, y, kind) => items.push({ id: "i" + items.length, x, y, kind, taken: false });
    const enemy = (kind, x, y, min, max) => {
      const spec = { gull: [62, 40, 10], cloud: [92, 60, 20], drone: [62, 54, 30], balloon: [56, 56, 10], spark: [38, 38, 10] }[kind];
      enemies.push({ id: "e" + enemies.length, kind, x, y, home: x, homeY: y, min, max, w: spec[0], h: spec[1], hp: spec[2], face: -1, vx: 0, vy: 0, state: "patrol", t: 0, phase: (enemies.length * 1.7) % 6, flash: 0, dead: 0, deadMax: 0, cool: kind === "drone" ? 2.4 + (enemies.length % 3) * 0.45 : 1.5 });
    };
    // Tres escalones por fondo (425, 330, 235), como en los niveles 2 y 3. El material cambia con el paisaje.
    const KIND = ["roof", "cargo", "cargo", "cloud", "island", "buoy", "stormcloud", "wreck", "deck", "crane", "deck"];
    const SIZES = [
      [200, 190, 180],
      [170, 160, 170],
      [160, 170, 160],
      [190, 180, 170],
      [220, 190, 180],
      [150, 140, 150],
      [190, 180, 170],
      [170, 160, 170],
      [220, 210, 200],
      [180, 170, 180],
      [200, 190, 180],
    ];
    for (let z = 0; z < 11; z++) {
      const x = z * STRIDE,
        kind = KIND[z],
        s = SIZES[z];
      [
        [x + 380, 425, s[0]],
        [x + 660, 330, s[1]],
        [x + 920, 235, s[2]],
      ].forEach(([px, py, w], k) => {
        const opts = {};
        if (kind === "cargo") Object.assign(opts, { moving: true, swing: { amp: 34, period: 3.4, phase: k * 1.3 } });
        if (kind === "crane") Object.assign(opts, { moving: true, swing: { amp: 70, period: 5, phase: k * 2 } });
        if (kind === "cloud" && k > 0) Object.assign(opts, { moving: true, sink: true });
        if (kind === "wreck") Object.assign(opts, { crumble: true });
        add(px, py, w, kind, opts);
      });
      for (let k = 0; k < 4; k++) item(x + 405 + k * 40, 397, "coin");
      item(x + 700 + 0, 302, "coin");
      item(x + 950 + 20, 207, "coin");
    }
    // Apoyos sobre los huecos largos.
    add(4245, 420, 110, "cloud", { moving: true, sink: true }); // nube que se hunde en el medio del hueco
    add(8330, 470, 80, "wreck", { crumble: true });
    add(8480, 440, 80, "wreck", { crumble: true });
    // Islas bajas del recorrido sencillo y la ruta alta con recompensas (molinos del aire).
    add(4890, 470, 120, "island");
    add(5000, 300, 120, "island");
    for (let k = 0; k < 5; k++) item(5010 + k * 22, 270, "coin");
    // Refugios contra los rayos: techos de madera. Debajo, los rayos no llegan.
    for (const x of [7010, 7460, 7930, 8640, 9150]) shelters.push({ x, w: 150, roof: 372 });
    for (const s of shelters) add(s.x - 6, s.roof - 6, s.w + 12, "shelter");
    // Arena: plataforma principal ancha y dos apoyos elevados.
    add(ARENA_X + 260, 360, 220, "ledge", { arena: true });
    add(ARENA_RIGHT - 480, 360, 220, "ledge", { arena: true });
    add(ARENA_CENTER - 90, 230, 180, "ledge", { arena: true, high: true });
    // Poderes: galletita (doble salto), pajita (impulso), escudo, chocolatada, UHT y recargas.
    const powers = [
      ["shield", "coin"],
      ["cookie", "coin"],
      ["refill", "straw"],
      ["cookie", "coin"],
      ["shield", "cacao"],
      ["straw", "refill"],
      ["shield", "uht"],
      ["cookie", "refill"],
      ["refill", "cacao"],
      ["straw", "shield"],
      ["refill", "uht"],
    ];
    for (let z = 0; z < 11; z++) {
      item(z * STRIDE + 750, 297, powers[z][0]);
      item(z * STRIDE + 990, 201, powers[z][1]);
    }
    item(9700, 470, "refill");
    item(12340, 470, "refill");
    item(ARENA_X + 370, 330, "shield");
    item(ARENA_RIGHT - 370, 330, "cacao");
    // Enemigos aéreos (diseños reemplazables desde el Catálogo).
    enemy("gull", 760, 300, 520, 980);
    enemy("gull", 1560, 280, 1350, 1800);
    enemy("balloon", 2000, 400, 2000, 2000);
    enemy("drone", 2960, 270, 2800, 3200);
    enemy("balloon", 3190, 380, 3190, 3190);
    enemy("cloud", 3900, 170, 3600, 4300);
    enemy("gull", 4450, 250, 4250, 4650);
    enemy("gull", 4980, 230, 4800, 5200);
    enemy("balloon", 5360, 400, 5360, 5360);
    enemy("drone", 5560, 250, 5420, 5760);
    enemy("drone", 6300, 260, 6150, 6450);
    enemy("balloon", 6630, 390, 6630, 6630);
    enemy("drone", 6860, 240, 6760, 7000);
    enemy("spark", 7060, FLOOR, 6850, 7140);
    enemy("cloud", 7400, 160, 7200, 7800);
    enemy("spark", 7950, FLOOR, 7910, 8240);
    enemy("drone", 8620, 250, 8500, 8780);
    enemy("balloon", 8960, 400, 8960, 8960);
    enemy("spark", 9250, FLOOR, 9110, 9340);
    enemy("gull", 10050, 260, 9900, 10300);
    enemy("drone", 10380, 250, 10250, 10560);
    enemy("balloon", 10740, 330, 10740, 10740);
    enemy("drone", 11400, 240, 11330, 11600);
    enemy("spark", 11760, FLOOR, 11400, 11940);
    enemy("drone", 12230, 250, 12100, 12420);
    enemy("cloud", 12600, 150, 12400, 12850);
    return { platforms, items, enemies, shelters, flags };
  }
  class Level4 {
    constructor(saved = null) {
      this.reset(saved);
    }
    reset(saved = null) {
      Object.assign(this, build());
      this.time = 0;
      this.hp = 100;
      this.score = 0;
      this.coins = 0;
      this.shield = false;
      this.power = { cookie: 0, straw: 0, cacao: 0, uht: 0, torn: 0 };
      this.umb = { open: 0, active: false, closing: 0, flight: 100, flying: false, opened: 0 };
      this.doubleUsed = false;
      this.dashUsed = false;
      this.dash = 0;
      this.shot = 0;
      this.shootPose = 0;
      this.runHeld = false;
      this.bullets = [];
      this.hazards = [];
      this.strikes = [];
      this.strikeIn = 2.5;
      this.events = [];
      this.checkpointIndex = -1;
      this.combo = 0;
      this.wind = 0;
      this.windWarn = false;
      this.won = false;
      this.complete = false;
      this.winTime = 0;
      this.firework = 0;
      this.falls = 0;
      this.updraftHint = false;
      this.safe = { x: 150, y: FLOOR };
      this.rope = { state: "hang", t: 0, x: ROPE_X, used: false };
      this.boss = { x: ARENA_CENTER + 300, y: -420, hp: BOSS.hp, state: "waiting", t: 0, face: -1, phase: 1, beamIn: 5, hailIn: 9, gustIn: 7, strikeIn: 3, hot: 0, flash: 0, anim: 0, beamY: 0, beamX: 0, beamDir: -1, second: false, gust: 0 };
      this.player = new P.Player(150, FLOOR);
      if (saved && saved.version === 4) {
        const s = { ...saved };
        this.checkpointIndex = clamp(Number.isInteger(s.flag) ? s.flag : -1, -1, 3);
        this.score = Number(s.score) || 0;
        this.coins = Number(s.coins) || 0;
        const taken = new Set(Array.isArray(s.taken) ? s.taken : []),
          defeated = new Set(Array.isArray(s.defeated) ? s.defeated : []);
        this.items.forEach((i) => (i.taken = taken.has(i.id)));
        this.enemies.forEach((e) => {
          if (defeated.has(e.id)) e.hp = 0;
        });
        this.flags.forEach((f) => (f.active = (Array.isArray(s.flags) ? s.flags : []).includes(f.index)));
        if (s.rope) this.rope = { state: "done", t: 0, x: ROPE_X, used: true };
        if (this.checkpointIndex >= 0) {
          const x = this.flags[this.checkpointIndex].x + 45;
          this.player.reset(x, FLOOR);
          this.safe = { x, y: FLOOR };
          this.rope.state = "done";
        }
      }
      this.saved = this.snapshot();
    }
    snapshot() {
      return {
        version: 4,
        flag: this.checkpointIndex,
        score: this.score,
        coins: this.coins,
        rope: this.rope.state === "done",
        flags: this.flags.filter((f) => f.active).map((f) => f.index),
        taken: this.items.filter((i) => i.taken).map((i) => i.id),
        defeated: this.enemies.filter((e) => e.hp <= 0).map((e) => e.id),
      };
    }
    emit(type, x = this.player.x, y = this.player.y, extra = {}) {
      this.events.push({ type, x, y, ...extra });
    }
    get zone() {
      return clamp(Math.floor(this.player.x / STRIDE), 0, 11);
    }
    get arena() {
      return this.boss.state !== "waiting";
    }
    /* Altitud de ambientación para el HUD: subimos desde los techos hasta la estación del cielo. */
    get altitude() {
      const p = this.player;
      return Math.round(180 + (clamp(p.x, 0, ARENA_X) / ARENA_X) * 2820 + (FLOOR - p.y) * 0.8);
    }
    floorSegments() {
      const segs = [];
      let x = 0;
      for (const g of GAPS) {
        segs.push({ x, y: FLOOR, w: g.x - x, kind: "floor" });
        x = g.x + g.w;
      }
      // Al ganar, el borde derecho de la arena queda libre: la botella baja planeando hacia la granja.
      segs.push({ x, y: FLOOR, w: (this.won ? ARENA_RIGHT : WIDTH) - x, kind: "floor" });
      return segs;
    }
    world() {
      const a = this;
      return {
        width: WIDTH,
        height: 720,
        solids: [],
        ceilings: [],
        surfaces() {
          return a.platforms.filter((b) => !b.gone).concat(a.floorSegments());
        },
        modifiers() {
          return {};
        },
      };
    }
    hurt(amount, sourceX = this.player.x, opts = {}) {
      const p = this.player;
      if (p.dead || this.won || p.invuln > 0 || (this.power.uht > 0 && !opts.fall)) return false;
      if (this.shield && !opts.fall) {
        this.shield = false;
        p.invuln = 0.8;
        this.emit("shield");
        return false;
      }
      this.hp = Math.max(0, this.hp - amount);
      if (opts.knock !== false) {
        p.damage();
        p.vx = (p.x < sourceX ? -1 : 1) * 190;
      }
      p.invuln = Math.max(p.invuln, opts.invuln || 1.1);
      this.emit("hurt", p.x, p.y - 65, { amount });
      if (this.hp <= 0) {
        p.kill();
        this.emit("death");
      }
      return true;
    }
    addScore(value, x, y, label = "") {
      this.score += value;
      this.emit("points", x, y, { value, label });
    }
    collect(i) {
      i.taken = true;
      if (i.kind === "coin") {
        this.coins++;
        this.score += 25;
        if (this.coins % 20 === 0) this.hp = Math.min(100, this.hp + 20);
      } else this.score += 100;
      this.emit("collect", i.x, i.y, { kind: i.kind });
      if (i.kind === "refill") {
        this.hp = 100;
        this.umb.flight = 100;
        this.power.torn = 0;
      }
      if (i.kind === "shield") this.shield = true;
      if (POWER_TIME[i.kind]) this.power[i.kind] = POWER_TIME[i.kind];
      if (i.kind === "cookie") this.doubleUsed = false;
    }
    killEnemy(e, how = "shot") {
      if (e.hp <= 0 && e.dead > 0) return;
      e.hp = 0;
      e.dead = e.deadMax = e.kind === "balloon" ? 0.6 : 1.1;
      e.how = how;
      e.vy = how === "stomp" ? 120 : -200;
      const value = how === "stomp" ? 150 * Math.max(1, this.combo) : 100;
      this.addScore(value, e.x, e.y - e.h - 18, how === "stomp" && this.combo > 1 ? "COMBO x" + this.combo : "");
      this.emit("pop", e.x, e.y - e.h / 2, { kind: e.kind, how });
    }
    damageEnemy(e, amount, how = "shot") {
      if (e.hp <= 0) return false;
      e.hp -= amount;
      e.flash = 0.15;
      this.emit("hit", e.x, e.y - e.h / 2, { kind: e.kind });
      if (e.hp <= 0) {
        e.hp = 1;
        this.killEnemy(e, how);
      }
      return true;
    }
    /* ---------- Viento ---------- */
    gustAt(t = this.time) {
      // Corredor de las ráfagas: 4,2 s de calma, 1 s de aviso (las mangas se inflan), 2,2 s de ráfaga fuerte.
      const c = t % 8;
      if (c < 4.2) return { s: 0, warn: false };
      if (c < 5.2) return { s: (c - 4.2) * 0.2, warn: true };
      if (c < 7.4) return { s: 1, warn: false };
      return { s: Math.max(0, 1 - (c - 7.4) / 0.6), warn: false };
    }
    windNow() {
      const z = this.zone;
      if (this.won) return { v: 0, warn: false };
      if (this.boss.gust > 0) return { v: Math.sign(this.player.x - this.boss.x || 1) * 0.85, warn: false };
      if (z === GUST_ZONE) {
        const g = this.gustAt();
        return { v: -g.s, warn: g.warn };
      }
      if (z === SUCTION_ZONE) {
        // La tormenta aspira hacia la arena en pulsos.
        const c = this.time % 7;
        return { v: c > 4 && c < 6.2 ? 0.55 : 0, warn: c > 3.4 && c < 4 };
      }
      if (BREEZE_ZONES.includes(z)) return { v: 0.12, warn: false };
      if (STORM_ZONES.includes(z)) return { v: -0.18 + Math.sin(this.time * 0.9) * 0.12, warn: false };
      return { v: 0, warn: false };
    }
    /* ---------- Paraguas, planeo, corrientes y vuelo ---------- */
    stepUmbrella(dt, p, input, wind) {
      const u = this.umb;
      const air = !p.grounded && !p.dead;
      const torn = this.power.torn > 0;
      // Se abre después del impulso del salto; una vez abierto sigue abierto mientras se mantenga SALTAR (también al subir con el aire).
      const flyKey = this.arena && !this.won && input.up && !torn && u.flight > 0;
      const want = air && ((input.jump && (p.vy > -90 || u.active)) || flyKey);
      const was = u.active;
      u.open = want ? Math.min(1, u.open + dt / (flyKey ? 0.12 : 0.26)) : Math.max(0, u.open - dt / (air ? 0.2 : 0.05));
      u.active = u.open >= 0.55 && air;
      if (u.active && !was) {
        u.opened = 0;
        this.emit("umbopen", p.x, p.y - 150, { torn });
      }
      u.opened += dt;
      if (!air && was) {
        u.closing = 0.45;
        this.emit("umbclose", p.x, p.y - 80);
      }
      u.closing = Math.max(0, u.closing - dt);
      const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const windVX = wind * 260;
      u.flying = false;
      if (u.active) {
        if (dir) p.face = dir;
        // Conserva el impulso de la carrera (se frena despacio); el viento empuja la tela.
        if (dir && Math.sign(p.vx) === dir && Math.abs(p.vx) > UMB.airMax) p.vx -= dir * 140 * dt;
        else p.vx = approach(p.vx, dir * UMB.airMax, UMB.airAccel * dt);
        p.vx = approach(p.vx, p.vx + windVX, Math.abs(windVX) * 2.2 * dt);
        // Vuelo en la arena: ↑ con el paraguas abierto, mientras dure la barra de vuelo.
        if (this.arena && !this.won && input.up && u.flight > 0 && !torn) {
          p.vy = Math.max(UMB.flyMax, p.vy - UMB.flyThrust * dt);
          u.flight = Math.max(0, u.flight - UMB.flyDrain * dt);
          u.flying = true;
        }
        const cap = torn ? UMB.tornFall : UMB.glideFall;
        if (p.vy > cap) p.vy = Math.max(cap, p.vy - 3600 * dt);
      } else if (air && wind) {
        this.moveExternal(windVX * 0.45 * dt);
      }
      if (!u.flying) u.flight = Math.min(100, u.flight + UMB.flyRecharge * dt * (p.grounded ? 1 : 0.3));
      // Corrientes ascendentes: con el paraguas abierto suben con fuerza; sin él apenas frenan la caída.
      for (const d of UPDRAFTS) {
        if (p.x < d.x || p.x > d.x + d.w || p.y < d.top || p.y > FALL_Y + 40) continue;
        const k = clamp((p.y - d.top) / 160, 0, 1);
        if (u.active) p.vy = Math.max(UMB.liftMax * (torn ? 0.4 : 1), p.vy - UMB.lift * k * dt);
        else if (air) p.vy -= 520 * k * dt;
        if (!this.updraftHint) {
          this.updraftHint = true;
          this.emit("updraft", d.x + d.w / 2, FLOOR - 80, { kind: d.kind });
        }
      }
    }
    moveExternal(dx) {
      const p = this.player;
      p.x = clamp(p.x + dx, 20, WIDTH - 20);
    }
    stepWind(dt, p) {
      const w = this.windNow();
      this.wind = w.v;
      if (w.warn && !this.windWarn) this.emit("windwarn", p.x, p.y - 140, { dir: Math.sign(this.windNow().v || -1) });
      this.windWarn = w.warn;
      if (!this.wind || !p.grounded || p.dead) return;
      // En el piso empuja menos; agachada casi no te mueve.
      const grip = p.crouch > 0.5 ? 0.12 : 0.45;
      this.moveExternal(this.wind * 170 * grip * dt);
    }
    /* ---------- Rayos: anuncian dónde caen; los refugios protegen ---------- */
    sheltered(x, p = this.player) {
      return this.shelters.some((s) => x > s.x && x < s.x + s.w && p.y >= s.roof + 4);
    }
    spawnStrike(x) {
      this.strikes.push({ x: clamp(x, 40, WIDTH - 40), t: 0, warn: 1.05, hit: false });
      this.emit("strikewarn", x, FLOOR);
    }
    stepStrikes(dt, p) {
      const storm = STORM_ZONES.includes(this.zone) && !this.won;
      const bossStorm = this.arena && this.boss.phase >= 3 && this.boss.hp > 0;
      if ((storm || bossStorm) && !p.dead) {
        this.strikeIn -= dt;
        if (this.strikeIn <= 0) {
          this.strikeIn = bossStorm ? 3 : 2.7 + ((this.time * 7.31) % 1);
          const lead = clamp(p.vx * 0.55, -180, 180),
            jitter = ((this.time * 977) % 140) - 70;
          this.spawnStrike(p.x + lead + jitter);
        }
      }
      for (const s of this.strikes) {
        s.t += dt;
        if (!s.hit && s.t >= s.warn) {
          s.hit = true;
          this.emit("lightning", s.x, FLOOR);
          if (!p.dead && near(p.x, s.x, 48) && !this.sheltered(p.x)) {
            if (this.umb.active) {
              this.power.torn = POWER_TIME.torn;
              this.emit("umbtorn", p.x, p.y - 150);
            }
            this.hurt(DMG.lightning, s.x);
          }
        }
      }
      this.strikes = this.strikes.filter((s) => s.t < s.warn + 0.5);
    }
    /* ---------- Plataformas vivas ---------- */
    stepPlatforms(dt, p) {
      for (const b of this.platforms) {
        b.dx = 0;
        if (b.swing && !b.gone) {
          const nx = b.baseX + b.swing.amp * Math.sin((this.time / b.swing.period) * Math.PI * 2 + b.swing.phase);
          b.dx = nx - b.x;
          b.x = nx;
        }
        const on = p.grounded && p.ground === b;
        if (b.sink) {
          if (b.gone) {
            b.back = (b.back || 0) - dt;
            if (b.back <= 0) Object.assign(b, { gone: false, y: b.baseY, st: 0 });
          } else if (on || b.st > 0) {
            b.st = (b.st || 0) + dt * (on ? 1 : 0.6);
            b.y = b.baseY + b.st * 46;
            if (b.st > 1.5) {
              Object.assign(b, { gone: true, back: 4 });
              this.emit("puff", b.x + b.w / 2, b.y);
            }
          }
        }
        if (b.crumble) {
          if (b.gone) {
            b.fallY = (b.fallY || 0) + dt * 600;
            b.back = (b.back || 0) - dt;
            if (b.back <= 0) Object.assign(b, { gone: false, ct: 0, fallY: 0 });
          } else if (on || b.ct > 0) {
            b.ct = (b.ct || 0) + dt;
            if (b.ct > 0.55) {
              Object.assign(b, { gone: true, back: 5, fallY: 0 });
              this.emit("crumble", b.x + b.w / 2, b.y);
            }
          }
        }
      }
    }
    /* ---------- Cuerda del dirigible (fondo 1) ---------- */
    stepRope(dt, p, input) {
      const r = this.rope;
      r.t += dt;
      r.x = ROPE_X + Math.sin(this.time * 1.6) * 24;
      if (r.state === "hang") {
        r.bottom = 330;
        if (!p.dead && near(p.x, r.x, 30) && p.y - 70 < r.bottom + 40 && p.y > 200) {
          Object.assign(r, { state: "lift", t: 0, used: true });
          this.emit("ropegrab", r.x, r.bottom);
        }
        return false;
      }
      if (r.state === "lift") {
        // La cuerda sube y cruza el hueco hasta la pasarela de carga.
        const k = Math.min(1, r.t / 1.5),
          e = k * k * (3 - 2 * k);
        p.x = r.x + e * 470;
        p.y = 360 - Math.sin(k * Math.PI) * 120;
        p.vx = p.vy = 0;
        p.grounded = false;
        if (k >= 1) {
          r.state = "done";
          p.vy = 60;
          this.safe = { x: p.x, y: FLOOR };
          this.addScore(300, p.x, p.y - 160, "¡A BORDO!");
          this.emit("ropedrop", p.x, p.y);
        }
        return true;
      }
      return false;
    }
    /* ---------- Enemigos ---------- */
    stepEnemies(dt, p, input) {
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.hp <= 0) {
          e.dead = Math.max(0, e.dead - dt);
          e.vy += 900 * dt;
          e.y += e.vy * dt;
          continue;
        }
        if (this.won || Math.abs(e.x - p.x) > 1400) continue;
        e.t += dt;
        e.phase += dt;
        e.cool = Math.max(0, e.cool - dt);
        const dx = p.x - e.x;
        if (e.kind === "gull") {
          // Gaviota: patrulla planeando; si pasás debajo, se tira en picada y vuelve a subir.
          if (e.state === "patrol") {
            e.x += e.face * 120 * dt;
            if (e.x < e.min) e.face = 1;
            if (e.x > e.max) e.face = -1;
            e.y = e.homeY + Math.sin(e.phase * 2.2) * 14;
            if (e.cool <= 0 && Math.abs(dx) < 260 && p.y > e.y + 40 && !p.dead) {
              e.state = "dive";
              e.t = 0;
              e.face = Math.sign(dx) || 1;
              e.vx = e.face * 280;
              e.vy = 360;
              this.emit("caw", e.x, e.y);
            }
          } else if (e.state === "dive") {
            e.x += e.vx * dt;
            e.vy -= 520 * dt;
            e.y += e.vy * dt;
            if (e.t > 1.4 || e.y < e.homeY - 4) {
              e.state = "patrol";
              e.y = Math.min(e.y, e.homeY);
              e.cool = 2.2;
              e.x = clamp(e.x, e.min, e.max);
            }
          }
        } else if (e.kind === "cloud") {
          // Nubarrón: te sigue desde arriba y deja caer gotas pesadas.
          e.x = clamp(e.x + clamp(dx, -1, 1) * 85 * dt, e.min, e.max);
          e.y = e.homeY + Math.sin(e.phase * 1.4) * 10;
          e.face = Math.sign(dx) || 1;
          if (e.cool <= 0 && Math.abs(dx) < 140 && !p.dead) {
            e.cool = 1.7;
            this.hazards.push({ kind: "drop", x: e.x + ((e.t * 37) % 30) - 15, y: e.y + 20, vx: 0, vy: 260, r: 9, life: 3 });
            this.emit("raindrop", e.x, e.y + 20);
          }
        } else if (e.kind === "drone") {
          // Dron cartero: flota y dispara chispas apuntadas a la botella.
          e.x = clamp(e.x + Math.sin(e.phase * 0.8) * 50 * dt, e.min, e.max);
          e.y = e.homeY + Math.sin(e.phase * 2.6) * 18;
          e.face = Math.sign(dx) || 1;
          if (e.cool <= 0 && Math.abs(dx) < 560 && !p.dead) {
            e.cool = 4.2;
            const tx = p.x,
              ty = p.y - 70,
              d = Math.hypot(tx - e.x, ty - e.y) || 1;
            this.hazards.push({ kind: "bolt", x: e.x + e.face * 26, y: e.y, vx: ((tx - e.x) / d) * 330, vy: ((ty - e.y) / d) * 330, r: 10, life: 2.6 });
            this.emit("zap", e.x, e.y);
          }
        } else if (e.kind === "balloon") {
          // Globo con púas: sube y baja sobre los huecos.
          e.y = e.homeY + Math.sin(e.phase * 1.3) * 70;
        } else if (e.kind === "spark") {
          // Chispa: corre por el piso en la tormenta.
          e.x += e.face * 190 * dt;
          if (e.x < e.min) e.face = 1;
          if (e.x > e.max) e.face = -1;
          e.y = FLOOR;
        }
        if (p.dead) continue;
        const ph = p.crouch > 0.5 ? 96 : 142,
          cy = e.kind === "spark" ? e.y : e.y + e.h / 2,
          top = cy - e.h;
        const overlap = near(p.x, e.x, e.w / 2 + 16) && p.y > top && p.y - ph < cy;
        if (!overlap) continue;
        if (this.power.uht > 0) {
          this.killEnemy(e, "uht");
          continue;
        }
        if (p.vy > 40 && p.py <= top + 16) {
          // Pisotón. Las nubes rebotan, los globos y las chispas lastiman.
          if (e.kind === "balloon" || e.kind === "spark") {
            this.hurt(e.kind === "balloon" ? DMG.balloon : DMG.spark, e.x);
            p.vy = -520;
            continue;
          }
          this.combo++;
          p.y = top;
          p.vy = e.kind === "cloud" ? -880 : input.jump ? -640 : -500;
          p.grounded = false;
          this.emit("stomp", e.x, top, { combo: this.combo, kind: e.kind });
          if (e.kind !== "cloud") this.damageEnemy(e, 999, "stomp");
          continue;
        }
        this.hurt({ gull: DMG.gull, cloud: DMG.cloud, drone: DMG.drone, balloon: DMG.balloon, spark: DMG.spark }[e.kind], e.x);
      }
    }
    /* ---------- El Capitán Cúmulo ---------- */
    bossPhase() {
      const h = this.boss.hp;
      return h > 66 ? 1 : h > 33 ? 2 : 3;
    }
    muzzle() {
      const b = this.boss;
      return { x: b.x + b.face * 170, y: b.y + 28 };
    }
    bossStep(dt) {
      const b = this.boss,
        p = this.player;
      b.flash = Math.max(0, b.flash - dt);
      b.anim += dt;
      b.hot = Math.max(0, b.hot - dt);
      b.gust = Math.max(0, b.gust - dt);
      if (b.state === "waiting") {
        if (p.x > ARENA_X + 60 && !p.dead) {
          Object.assign(b, { state: "intro", t: 0, x: ARENA_CENTER + 320, y: -420 });
          this.emit("bossintro", b.x, 200);
        }
        return;
      }
      // Por seguridad: si la vida llegó a cero por cualquier vía, la derrota se dispara igual.
      if (b.hp <= 0 && b.state !== "dead" && b.state !== "intro") {
        b.hp = 0.0001;
        this.bossHit(1);
      }
      if (b.state === "dead") {
        b.t += dt;
        b.y += 60 * dt;
        if (b.t > 3 && !this.won) {
          this.won = true;
          this.winTime = 0;
          this.emit("victory", b.x, 200);
        }
        return;
      }
      if (!this.won) p.x = clamp(p.x, ARENA_X - 20, ARENA_RIGHT - 24);
      b.t += dt;
      const phase = this.bossPhase();
      if (phase !== b.phase) {
        b.phase = phase;
        this.emit("bossphase", b.x, b.y, { phase });
      }
      const go = (s) => {
        b.state = s;
        b.t = 0;
      };
      const moveTo = (tx, ty, speed) => {
        const dx = tx - b.x,
          dy = ty - b.y,
          d = Math.hypot(dx, dy);
        if (d > 1) {
          const s = Math.min(d, speed * dt);
          b.x += (dx / d) * s;
          b.y += (dy / d) * s;
        }
      };
      switch (b.state) {
        case "intro":
          // Baja desde la tormenta con las hélices encendidas.
          b.y = -420 + 600 * Math.min(1, b.t / 2.6) * (2 - Math.min(1, b.t / 2.6));
          b.face = p.x < b.x ? -1 : 1;
          if (b.t > 3.4) go("fly");
          break;
        case "fly": {
          const tt = this.time;
          const tx = ARENA_CENTER + Math.sin(tt * 0.42) * 560,
            ty = 170 + Math.sin(tt * 0.83) * 105;
          moveTo(tx, ty, 230 + phase * 30);
          b.face = p.x < b.x ? -1 : 1;
          b.beamIn -= dt;
          if (phase >= 2) {
            b.hailIn -= dt;
            b.gustIn -= dt;
          }
          if (b.beamIn <= 0) {
            go("charge");
            b.second = false;
            this.emit("bosscharge", b.x, b.y);
          } else if (phase >= 2 && b.hailIn <= 0) {
            b.hailIn = phase >= 3 ? 7 : 9;
            this.hail();
          } else if (phase >= 2 && b.gustIn <= 0) {
            b.gustIn = 8.5;
            b.gust = 2.2;
            this.emit("bossgust", b.x, b.y, { dir: Math.sign(p.x - b.x) || 1 });
          }
          break;
        }
        case "charge": {
          // Apunta: se alinea con la altura de la botella. Se esquiva cambiando de altura a último momento.
          b.face = p.x < b.x ? -1 : 1;
          // Apunta hasta el 70 % de la carga; después «destella» y el disparo queda fijo: es el momento de esquivar.
          const dur = b.second ? 0.75 : 1.25;
          if (b.t < dur * 0.7) moveTo(b.x, clamp(p.y - 70 - 28, -60, 430), 240);
          else if (!b.locked) {
            b.locked = true;
            this.emit("beamlock", b.x, b.y);
          }
          if (b.t >= dur) {
            b.locked = false;
            go("beam");
            const m = this.muzzle();
            Object.assign(b, { beamY: m.y, beamX: m.x, beamDir: b.face, hitPlayer: false });
            this.emit("beam", m.x, m.y, { dir: b.face, phase });
          }
          break;
        }
        case "beam": {
          const active = b.t > 0.12 && b.t < 0.7;
          if (active && !b.hitPlayer && !p.dead) {
            const ph = p.crouch > 0.5 ? 96 : 142;
            const inX = b.beamDir < 0 ? p.x < b.beamX + 10 : p.x > b.beamX - 10;
            if (inX && p.y > b.beamY - 40 && p.y - ph < b.beamY + 40) {
              b.hitPlayer = true;
              if (this.umb.active) this.power.torn = POWER_TIME.torn;
              this.hurt(DMG.beam, b.x);
            }
          }
          if (b.t >= 1) {
            if (phase >= 3 && !b.second) {
              b.second = true;
              go("charge");
              this.emit("bosscharge", b.x, b.y, { quick: true });
            } else {
              go("recover");
              b.hot = 1.8;
              this.emit("bosshot", b.x, b.y);
            }
          }
          break;
        }
        case "recover":
          // Cañones recalentados: la leche hace el doble de daño.
          moveTo(b.x, b.y + 30, 40);
          if (b.t >= 1.8) {
            go("fly");
            b.beamIn = phase === 1 ? 6.5 : phase === 2 ? 5.5 : 4.6;
          }
          break;
      }
      b.x = clamp(b.x, ARENA_X + 160, ARENA_RIGHT - 160);
      // Contacto con el cuerpo del Capitán.
      if (b.state !== "intro" && !p.dead && Math.hypot(p.x - b.x, p.y - 70 - b.y) < 120) this.hurt(DMG.contact, b.x);
    }
    hail() {
      // Granizo: 14 piedras que caen sobre la arena con sombra de aviso.
      for (let i = 0; i < 14; i++) {
        const x = ARENA_X + 80 + ((i * 131 + this.time * 211) % (ARENA_W - 160));
        this.hazards.push({ kind: "hail", x, y: -300 - i * 70, vx: -20, vy: 420, r: 12, life: 4 });
      }
      this.emit("hail", ARENA_CENTER, 0);
    }
    bossHit(amount) {
      const b = this.boss;
      if (b.hp <= 0 || b.state === "intro" || b.state === "waiting" || b.state === "dead") return false;
      const dmg = b.hot > 0 ? amount * 2 : amount;
      b.hp = Math.max(0, b.hp - dmg);
      b.flash = 0.12;
      this.emit("bosshit", b.x, b.y, { hp: b.hp, hot: b.hot > 0 });
      if (b.hp === 0) {
        b.state = "dead";
        b.t = 0;
        this.hazards = [];
        this.strikes = [];
        b.gust = 0;
        this.addScore(6000, b.x, b.y - 120, "¡CAPITÁN DERROTADO!");
        this.emit("bossdeath", b.x, b.y);
      }
      return true;
    }
    /* ---------- Final: la tormenta se abre y la botella baja planeando hacia la granja ---------- */
    endingInput(p) {
      const t = this.winTime;
      if (t < 3.6) return {};
      if (p.grounded && p.x < ARENA_RIGHT - 30) return { right: true, run: true };
      // Al llegar al borde salta y abre el paraguas.
      return { right: true, jump: true, jumpPressed: p.grounded };
    }
    /* ---------- Paso principal ---------- */
    step(dt, input = {}) {
      this.events = [];
      const p = this.player;
      this.time += dt;
      if (p.dead) {
        p.step(dt, {}, this.world());
        if (p.death > 1.6) {
          this.reset(this.saved);
          this.emit("respawn");
        }
        return this.events;
      }
      this.shot = Math.max(0, this.shot - dt);
      this.shootPose = Math.max(0, this.shootPose - dt);
      for (const k of Object.keys(this.power)) {
        const before = this.power[k];
        this.power[k] = Math.max(0, before - dt);
        if (before > 0 && this.power[k] === 0) this.emit("powerend", p.x, p.y - 80, { kind: k });
      }
      if (this.won) {
        this.winTime += dt;
        this.firework -= dt;
        if (this.firework <= 0 && this.winTime < 5) {
          this.firework = 0.5;
          this.emit("firework", ARENA_CENTER - 600 + ((this.winTime * 371) % 1200), 40 + ((this.winTime * 97) % 160));
        }
        input = this.endingInput(p);
        if (p.y > FLOOR + 260 || this.winTime > 16) this.complete = true;
      }
      this.stepPlatforms(dt, p);
      if (this.stepRope(dt, p, input)) {
        this.stepEnemies(dt, p, {});
        return this.events;
      }
      this.stepEnemies(dt, p, input);
      // Galletita: doble salto. Pajita: impulso en el aire con CORRER.
      const runPressed = input.run && !this.runHeld;
      this.runHeld = !!input.run;
      const airborne = !p.grounded && p.coyote <= 0;
      let doubleJump = false;
      if (input.jumpPressed && airborne && this.power.cookie > 0 && !this.doubleUsed && !this.won) doubleJump = true;
      const evs = p.step(dt, { ...input, speed: this.power.uht > 0 ? 1.12 : 1, jumpPressed: doubleJump ? false : input.jumpPressed }, this.world());
      if (p.dead) return this.events;
      if (doubleJump && !p.grounded) {
        p.vy = -600;
        p.jumpHeld = !!input.jump;
        this.doubleUsed = true;
        this.umb.open = 0;
        this.emit("doublejump", p.x, p.y);
      }
      if (runPressed && airborne && this.power.straw > 0 && !this.dashUsed && !this.won) {
        this.dash = 0.2;
        this.dashUsed = true;
        this.emit("dash", p.x, p.y - 70, { face: p.face });
      }
      if (this.dash > 0) {
        this.dash -= dt;
        this.moveExternal(p.face * 900 * dt);
        p.vy = Math.min(p.vy, 40);
      }
      const wind = this.windNow().v;
      this.stepUmbrella(dt, p, input, wind);
      if (p.grounded) {
        this.combo = 0;
        this.doubleUsed = false;
        this.dashUsed = false;
        // Punto seguro para volver después de una caída.
        if (!inGap(p.x, 70) && !(p.ground && (p.ground.sink || p.ground.crumble || p.ground.swing))) this.safe = { x: p.x, y: p.y };
      }
      this.stepWind(dt, p);
      for (const ev of evs) if (["jump", "land", "hardland", "skid", "start", "spring"].includes(ev)) this.emit(ev);
      // Caída por un hueco: −15 % y volvés al último apoyo seguro.
      if (!this.won && p.y > FALL_Y) {
        this.falls++;
        const s = this.safe;
        this.emit("fall", p.x, FLOOR);
        p.reset(s.x, s.y);
        this.umb.open = 0;
        this.umb.active = false;
        if (this.hurt(DMG.fall, s.x, { knock: false, fall: true, invuln: 1.4 })) this.emit("recover", s.x, s.y);
        if (p.dead) return this.events;
      }
      if (!this.won) {
        if (input.shoot && this.shot === 0 && this.boss.state !== "dead") {
          this.shot = 0.25;
          this.shootPose = 0.24;
          const glide = this.umb.active;
          this.bullets.push({ x: p.x + p.face * 26, y: p.y - (p.crouch > 0.5 ? 52 : glide ? 64 : 81), vx: p.face * 760, life: 1.2, damage: this.power.cacao > 0 ? 20 : 10, cacao: this.power.cacao > 0 });
          this.emit("shoot", p.x, p.y - 80, { glide });
        }
        for (const i of this.items) if (!i.taken && near(p.x, i.x, 39) && i.y > p.y - 145 && i.y < p.y + 12) this.collect(i);
        for (const f of this.flags) {
          if (!f.active && near(p.x, f.x, 45) && p.y > 450 && p.grounded) {
            f.active = true;
            this.checkpointIndex = f.index;
            this.hp = 100;
            this.umb.flight = 100;
            this.power.torn = 0;
            this.saved = this.snapshot();
            this.emit("checkpoint", f.x, FLOOR, { snapshot: this.saved, index: f.index });
          }
        }
        this.stepStrikes(dt, p);
      }
      this.bossStep(dt);
      // Leche.
      for (const b of this.bullets) {
        const old = b.x;
        b.x += b.vx * dt;
        b.life -= dt;
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const cy = e.kind === "spark" ? e.y - e.h / 2 : e.y;
          if (Math.abs(b.y - cy) < e.h / 2 + 8 && Math.max(old, b.x) > e.x - e.w / 2 && Math.min(old, b.x) < e.x + e.w / 2) {
            this.damageEnemy(e, b.damage);
            b.life = 0;
            break;
          }
        }
        if (b.life <= 0) continue;
        const boss = this.boss;
        if (boss.hp > 0 && !["waiting", "dead"].includes(boss.state) && Math.abs(b.y - boss.y) < BOSS.radius && Math.max(old, b.x) > boss.x - 120 && Math.min(old, b.x) < boss.x + 120) {
          if (!this.bossHit(b.cacao ? BOSS.milk * 2 : BOSS.milk)) this.emit("armor", b.x, b.y);
          b.life = 0;
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      // Proyectiles enemigos.
      for (const h of this.hazards) {
        h.life -= dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        if (h.kind === "drop") h.vy += 900 * dt;
        const ph = p.crouch > 0.5 ? 96 : 142;
        if (!p.dead && near(p.x, h.x, h.r + 18) && h.y + h.r > p.y - ph && h.y - h.r < p.y) {
          h.life = 0;
          // El paraguas abierto ataja las gotas y el granizo.
          if (this.umb.active && (h.kind === "drop" || h.kind === "hail") && h.y < p.y - 100) this.emit("block", h.x, h.y);
          else this.hurt({ drop: DMG.cloud, bolt: DMG.bolt, hail: DMG.hail }[h.kind], h.x);
        }
        if (h.y >= FLOOR - 4 && h.kind !== "bolt" && !inGap(h.x)) {
          h.life = 0;
          this.emit(h.kind === "hail" ? "hailhit" : "splash", h.x, FLOOR);
        }
      }
      this.hazards = this.hazards.filter((h) => h.life > 0 && h.y < 900);
      return this.events;
    }
  }
  root.MilkLevel4Core = { Level4, FLOOR, STRIDE, WIDTH, CAM_MAX, ARENA_X, ARENA_W, ARENA_RIGHT, ARENA_CENTER, FALL_Y, NAMES, SECTIONS, UMB, DMG, BOSS, POWER_TIME, GAPS, UPDRAFTS, STORM_ZONES, RAIN_ZONES, GUST_ZONE, BREEZE_ZONES, SUCTION_ZONE, ROPE_X, inGap, build };
  if (typeof module !== "undefined") module.exports = root.MilkLevel4Core;
})(typeof window !== "undefined" ? window : globalThis);
