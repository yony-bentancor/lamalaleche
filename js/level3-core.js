/* Nivel 3 · «Sin destino» — simulación determinista, sin dibujo (se prueba en Node).
   La ciudad de noche: vereda, rascacielos, callejón, barrio chino, techos, café 24 h, puente y
   la azotea del cartel de Granja La Esperanza, donde espera la Vaca Mecánica. */
(function (root) {
  "use strict";
  const P = root.MilkPhysics || (typeof require === "function" ? require("./physics.js") : null);
  const FLOOR = 520,
    STRIDE = 1170,
    WIDTH = 14880,
    ARENA_X = 12960,
    ARENA_RIGHT = WIDTH - 40,
    // La cámara normal llega hasta el último fondo; la azotea de la vaca se ve con zoom abierto.
    CAM_MAX = 11 * STRIDE,
    ARENA_CENTER = 13890,
    TRUCK_STOP = 14380,
    DAWN_SECONDS = 300;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const near = (a, b, d) => Math.abs(a - b) < d;
  const NAMES = [
    "La vereda de El Molde",
    "Avenida de los rascacielos",
    "El callejón del gato",
    "La puerta del barrio chino",
    "Calle de los farolitos",
    "El mercado nocturno",
    "Escaleras de incendio",
    "Las azoteas",
    "Entre carteles gigantes",
    "Café 24 horas",
    "El puente al amanecer",
    "El cartel de la vaca",
  ];
  const SECTIONS = ["01 / LA CALLE", "02 / BARRIO CHINO", "03 / LOS TECHOS", "04 / EL AMANECER"];
  /* La vaca: reglas pedidas. Salta cada 15 s (−5 %), dispara cada 30 s (−10 %), la leche le quita 2 %. */
  const COW = {
    height: 710, // 5 veces la botella (142)
    halfBody: 255,
    jumpEvery: 15,
    shootEvery: 30,
    jumpDamage: 5,
    shotDamage: 10,
    milkDamage: 2,
    minX: 13300,
    maxX: 14500,
    gravity: 900,
    // Escudo de energía: la vaca solo recibe daño un rato después de despertar, aterrizar o disparar.
    window: 3.5,
  };
  const POWER_TIME = { cookie: 15, straw: 15, reflector: 20, cacao: 20, uht: 9, cortado: 10 };
  const WIND_ZONES = [6, 7, 8, 10];
  const RAIN_ZONES = [0, 1, 2];
  const CHASES = [
    { x0: 2420, x1: 3470 },
    { x0: 8240, x1: 9320 },
  ];
  function build() {
    const platforms = [],
      items = [],
      enemies = [],
      vents = [],
      flags = [2250, 5650, 8080, 12700].map((x, i) => ({ x, index: i, active: false }));
    let seq = 0;
    const add = (x, y, w, kind, opts = {}) => {
      const b = { id: "p" + seq++, x, y, w, h: kind === "crate" ? FLOOR - y : 22, kind, ...opts };
      platforms.push(b);
      return b;
    };
    const item = (x, y, kind) => items.push({ id: "i" + items.length, x, y, kind, taken: false });
    const enemy = (kind, x, min, max, extra = {}) => {
      const spec = {
        rat: [46, 30, 20],
        pigeon: [44, 36, 10],
        can: [44, 76, 20],
        lantern: [44, 48, 20],
        dog: [132, 84, 999],
        barista: [100, 156, 999],
        coffee: [34, 38, 10],
      }[kind];
      enemies.push({
        id: "e" + enemies.length,
        kind,
        x,
        y: extra.y ?? FLOOR,
        home: x,
        homeY: extra.y ?? FLOOR,
        min,
        max,
        w: spec[0],
        h: spec[1],
        hp: spec[2],
        face: -1,
        vx: 0,
        vy: 0,
        state: kind === "rat" ? "hidden" : kind === "pigeon" ? "perch" : "patrol",
        t: 0,
        phase: Math.random() * 3,
        flash: 0,
        dead: 0,
        deadMax: 0,
        stun: 0,
        cool: 0,
      });
    };
    // Subidas iguales al nivel 2 (≤105 px), verificadas con el mismo motor de salto.
    for (let z = 0; z < 11; z++) {
      const x = z * STRIDE;
      const kind = z < 2 ? "awning" : z === 2 ? "fire" : z < 6 ? "redAwning" : z === 8 ? "neon" : z < 9 ? "roof" : z === 9 ? "table" : "girder";
      const sizes = [
        [200, 220, 180],
        [230, 180, 200],
        [170, 240, 170],
        [220, 210, 190],
        [190, 250, 175],
        [210, 190, 230],
        [240, 200, 170],
        [185, 225, 200],
        [170, 200, 170],
        [200, 230, 180],
        [220, 190, 220],
      ][z];
      add(x + 380, 425, sizes[0], kind, kind === "neon" ? { period: 4, offset: 0 } : {});
      add(x + 660, 330, sizes[1], kind, kind === "neon" ? { period: 4, offset: 1.3 } : {});
      add(x + 920, 235, sizes[2], kind, kind === "neon" ? { period: 4, offset: 2.6 } : {});
      for (let k = 0; k < 4; k++) item(x + 405 + k * 40, 397, "coin");
      if (z % 2 === 0) item(x + 190, 474, "coin");
    }
    // Cajas rompibles en el callejón y el mercado.
    add(2 * STRIDE + 770, 448, 88, "crate", { breakable: true, h: 72 });
    add(5 * STRIDE + 770, 448, 88, "crate", { breakable: true, h: 72 });
    // Sombrillas del café: rebotan como resortes.
    add(9 * STRIDE + 170, 432, 96, "umbrella", { spring: 920 });
    add(9 * STRIDE + 1090, 432, 96, "umbrella", { spring: 920 });
    // Plataformas de la azotea para esquivar a la vaca.
    add(ARENA_X + 60, 410, 150, "girder", { arena: true });
    add(ARENA_X + 300, 315, 130, "girder", { arena: true });
    add(13760, 410, 150, "girder", { arena: true });
    add(14480, 410, 150, "girder", { arena: true });
    add(14260, 315, 130, "girder", { arena: true });
    const powers = [
      ["shield", "coin"],
      ["cookie", "coin"],
      ["reflector", "refill"],
      ["straw", "coin"],
      ["cacao", "refill"],
      ["shield", "uht"],
      ["reflector", "refill"],
      ["cookie", "coin"],
      ["straw", "refill"],
      ["refill", "cacao"],
      ["shield", "uht"],
    ];
    for (let z = 0; z < 11; z++) {
      item(z * STRIDE + 750, 297, powers[z][0]);
      item(z * STRIDE + 990, 201, powers[z][1]);
    }
    item(12820, 472, "refill");
    item(12900, 472, "shield");
    // Enemigos de la ciudad.
    enemy("rat", 700, 560, 940);
    enemy("can", 1050, 900, 1160);
    enemy("rat", 1520, 1380, 1700);
    enemy("pigeon", 1930, 1830, 2030, { y: 330 });
    enemy("can", 2120, 1980, 2300);
    enemy("rat", 2720, 2560, 2900);
    enemy("rat", 3220, 3080, 3400);
    enemy("pigeon", 4250, 4170, 4380, { y: 330 });
    enemy("lantern", 3950, 3820, 4300);
    enemy("dog", 5150, 4980, 5420);
    enemy("rat", 5560, 5420, 5780);
    enemy("lantern", 6260, 6120, 6520);
    enemy("pigeon", 6830, 6790, 6960, { y: 235 });
    enemy("pigeon", 7300, 7200, 7450);
    enemy("pigeon", 7760, 7700, 7870, { y: 330 });
    enemy("pigeon", 9170, 9130, 9290, { y: 235 });
    enemy("pigeon", 10100, 10020, 10200, { y: 330 });
    enemy("can", 9800, 9650, 10000);
    enemy("barista", 10950, 10720, 11330);
    enemy("coffee", 10660, 10560, 10820);
    enemy("coffee", 11220, 11120, 11400);
    enemy("can", 12050, 11800, 12380);
    enemy("pigeon", 12440, 12380, 12560, { y: 330 });
    vents.push({ x: 2530, offset: 0 }, { x: 10620, offset: 1.1 }, { x: 11520, offset: 2.2 });
    return { platforms, items, enemies, vents, flags };
  }
  class Level3 {
    constructor(saved = null) {
      this.reset(saved);
    }
    reset(saved = null) {
      Object.assign(this, build());
      this.time = 0;
      this.clock = 0;
      this.hp = 100;
      this.score = 0;
      this.coins = 0;
      this.shield = false;
      this.power = { cookie: 0, straw: 0, reflector: 0, cacao: 0, uht: 0, cortado: 0 };
      this.doubleUsed = false;
      this.dashUsed = false;
      this.dash = 0;
      this.shot = 0;
      this.shootPose = 0;
      this.bullets = [];
      this.hazards = [];
      this.events = [];
      this.checkpointIndex = -1;
      this.combo = 0;
      this.wind = 0;
      this.windWarn = false;
      this.won = false;
      this.complete = false;
      this.winTime = 0;
      this.firework = 0;
      this.dawnBonus = false;
      this.runHeld = false;
      this.chases = CHASES.map((c) => ({ ...c, done: false, active: false }));
      this.truck = { x: WIDTH + 700, v: 0, state: "off", t: 0, jumped: false };
      this.cat = { active: false, x: 0, y: FLOOR, vy: 0, state: "off", t: 0, slow: 0, face: 1 };
      this.boss = {
        x: 14300,
        y: FLOOR,
        alt: 0,
        hp: 100,
        state: "waiting",
        t: 0,
        jumpIn: COW.jumpEvery,
        shootIn: COW.shootEvery,
        face: -1,
        targetX: 14300,
        flash: 0,
        anim: 0,
        hitPlayer: false,
        startX: 14300,
        breaks: 0,
        vuln: 0,
      };
      this.player = new P.Player(150, FLOOR);
      if (saved && saved.version === 3) {
        saved = { ...saved };
        for (const key of ["taken", "defeated", "broken", "chases", "loot"]) if (!Array.isArray(saved[key])) saved[key] = [];
        if (saved.flags !== undefined && !Array.isArray(saved.flags)) saved.flags = [];
        const flag = Number(saved.flag ?? -1);
        saved.flag = Number.isInteger(flag) ? flag : -1;
        for (const key of ["score", "coins", "clock", "seconds"]) {
          if (!Number.isFinite(Number(saved[key]))) saved[key] = 0;
        }
        this.checkpointIndex = clamp(saved.flag ?? -1, -1, 3);
        this.score = Number(saved.score) || 0;
        this.coins = Number(saved.coins) || 0;
        this.clock = clamp(Number(saved.clock) || 0, 0, DAWN_SECONDS * 2);
        const taken = new Set(saved.taken || []),
          defeated = new Set(saved.defeated || []);
        this.items.forEach((i) => (i.taken = taken.has(i.id)));
        this.enemies.forEach((e) => {
          if (defeated.has(e.id)) e.hp = 0;
        });
        this.platforms.forEach((p) => (p.gone = (saved.broken || []).includes(p.id)));
        // Reconstruir el botín también al abrir un guardado V9 anterior sin campo loot.
        for (const box of this.platforms.filter((p) => p.breakable && p.gone)) {
          const id = "box" + box.id;
          this.items.push({ id, x: box.x + box.w / 2, y: box.y - 20, kind: "coin", taken: taken.has(id) });
        }
        this.flags.forEach((f) => (f.active = (saved.flags || []).includes(f.index)));
        (saved.chases || []).forEach((done, i) => this.chases[i] && (this.chases[i].done = !!done));
        this.player.reset(this.checkpointIndex < 0 ? 150 : this.flags[this.checkpointIndex].x + 45, FLOOR);
      }
      this.saved = this.snapshot();
    }
    snapshot() {
      return {
        version: 3,
        flag: this.checkpointIndex,
        score: this.score,
        coins: this.coins,
        clock: this.clock,
        flags: this.flags.filter((f) => f.active).map((f) => f.index),
        taken: this.items.filter((i) => i.taken).map((i) => i.id),
        defeated: this.enemies.filter((e) => e.hp <= 0).map((e) => e.id),
        broken: this.platforms.filter((p) => p.gone).map((p) => p.id),
        chases: this.chases.map((c) => c.done),
      };
    }
    emit(type, x = this.player.x, y = this.player.y, extra = {}) {
      this.events.push({ type, x, y, ...extra });
    }
    get zone() {
      return clamp(Math.floor(this.player.x / STRIDE), 0, 11);
    }
    get dawn() {
      return clamp(this.clock / DAWN_SECONDS, 0, 1);
    }
    /* Las plataformas de neón se apagan 1,2 s de cada 4; titilan 0,6 s antes. */
    neonOn(b, t = this.time) {
      if (b.kind !== "neon") return true;
      const c = (t + b.offset) % b.period;
      return c < b.period - 1.2;
    }
    neonWarn(b, t = this.time) {
      if (b.kind !== "neon") return false;
      const c = (t + b.offset) % b.period;
      return c > b.period - 1.8 && c < b.period - 1.2;
    }
    get platformsNow() {
      return this.platforms.filter((b) => !b.gone && this.neonOn(b));
    }
    world() {
      const a = this;
      return {
        width: WIDTH,
        height: 720,
        solids: this.platforms.filter((p) => p.kind === "crate" && !p.gone),
        ceilings: [],
        surfaces() {
          const list = a.platformsNow.concat([{ x: 0, y: FLOOR, w: WIDTH, kind: "floor" }]);
          if (a.truck.state === "wait") list.push(a.truckBed());
          return list.sort((m, n) => m.y - n.y);
        },
        modifiers() {
          return {};
        },
      };
    }
    hurt(amount, sourceX = this.player.x, opts = {}) {
      const p = this.player;
      if (p.dead || this.won || p.invuln > 0 || this.power.uht > 0) return false;
      if (this.shield) {
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
    killEnemy(e, how = "shot") {
      if (e.hp <= 0) return;
      e.hp = 0;
      e.dead = e.deadMax = { rat: 1, pigeon: 1.3, can: 1, lantern: 1.1, coffee: 0.8 }[e.kind] || 1;
      e.how = how;
      e.vy = how === "stomp" ? 0 : -260;
      const value = how === "stomp" ? 150 * Math.max(1, this.combo) : 100;
      this.addScore(value, e.x, e.y - e.h - 18, how === "stomp" && this.combo > 1 ? "COMBO x" + this.combo : "");
      this.emit("pop", e.x, e.y - e.h / 2, { kind: e.kind, how });
    }
    damageEnemy(e, amount, how = "shot") {
      if (e.hp <= 0) return false;
      if (e.kind === "dog") {
        // Al perro no se lo lastima: el ruido lo despierta.
        if (e.state !== "chase") this.wakeDog(e);
        return false;
      }
      if (e.kind === "barista") {
        e.stun = 1.6;
        e.flash = 0.15;
        this.emit("stun", e.x, e.y - e.h);
        return true;
      }
      if (e.kind === "rat" && e.state === "hidden") return false;
      e.hp -= amount;
      e.flash = 0.15;
      this.emit("hit", e.x, e.y - e.h / 2);
      if (e.hp <= 0) {
        e.hp = 1;
        this.killEnemy(e, how);
      }
      return true;
    }
    wakeDog(e) {
      e.state = "chase";
      e.t = 0;
      this.emit("bark", e.x, e.y - 60);
    }
    collect(i) {
      i.taken = true;
      const p = this.player;
      if (i.kind === "coin") {
        this.coins++;
        this.score += 25;
        if (this.coins % 20 === 0) this.hp = Math.min(100, this.hp + 20);
      } else this.score += 100;
      this.emit("collect", i.x, i.y, { kind: i.kind });
      if (i.kind === "refill") {
        this.hp = 100;
        this.power.cortado = 0;
      }
      if (i.kind === "shield") this.shield = true;
      if (POWER_TIME[i.kind]) this.power[i.kind] = POWER_TIME[i.kind];
      if (i.kind === "cookie") this.doubleUsed = false;
    }
    /* ---------- Viento en techos y puente (igual que la playa de descarga del nivel 2) ---------- */
    windAt(t = this.time) {
      const c = t % 9;
      if (c < 5) return { strength: 0, warn: false };
      if (c < 6) return { strength: (c - 5) * 0.25, warn: true };
      if (c < 8.2) return { strength: 1, warn: false };
      return { strength: Math.max(0, 1 - (c - 8.2) / 0.8), warn: false };
    }
    stepWind(dt, p) {
      const z = this.zone;
      const w = WIND_ZONES.includes(z) && !this.won && !p.dead ? this.windAt() : { strength: 0, warn: false };
      this.wind = -w.strength;
      if (w.warn && !this.windWarn) this.emit("windwarn", p.x, p.y - 140);
      this.windWarn = w.warn;
      if (!this.wind) return;
      const grip = p.grounded ? (p.crouch > 0.5 ? 0.12 : 0.42) : 1;
      this.moveExternal(this.wind * 150 * grip * dt);
    }
    moveExternal(dx) {
      const p = this.player, half = P.CONFIG.width / 2;
      let next = clamp(p.x + dx, 20, WIDTH - 20);
      const height = p.crouch > 0.5 ? P.CONFIG.crouchHeight : P.CONFIG.height;
      for (const b of this.platforms) {
        if (b.kind !== "crate" || b.gone || p.y <= b.y + 1 || p.y - height >= b.y + b.h) continue;
        if (dx > 0 && p.x + half <= b.x + 1 && next + half > b.x) next = Math.min(next, b.x - half);
        if (dx < 0 && p.x - half >= b.x + b.w - 1 && next - half < b.x + b.w) next = Math.max(next, b.x + b.w + half);
      }
      p.x = next;
    }
    /* ---------- El gato del callejón: persigue en dos tramos ---------- */
    stepCat(dt, p) {
      const c = this.cat;
      for (const ch of this.chases) {
        if (!ch.done && !ch.active && p.x > ch.x0 && p.x < ch.x1 && !c.active) {
          ch.active = true;
          Object.assign(c, { active: true, x: Math.max(ch.x0 - 380, p.x - 560), y: FLOOR, vy: 0, state: "run", t: 0, slow: 0, chase: ch });
          this.emit("catchase", c.x, FLOOR - 60);
        }
      }
      if (!c.active) return;
      c.t += dt;
      c.slow = Math.max(0, c.slow - dt);
      const ch = c.chase;
      if (c.state === "run") {
        const speed = c.slow > 0 ? 120 : 335;
        c.face = p.x > c.x ? 1 : -1;
        c.x += c.face * speed * dt;
        if (p.x > ch.x1) {
          c.state = "leave";
          c.vy = -820;
          ch.done = true;
          ch.active = false;
          this.addScore(500, p.x, p.y - 170, "¡ESCAPASTE DEL GATO!");
          this.emit("catgone", c.x, FLOOR - 60);
        } else if (!p.dead && near(p.x, c.x, 50) && p.vy > 0 && p.py <= FLOOR - 60 && p.y >= FLOOR - 62) {
          // Resolver primero el cruce desde arriba: no confundirlo con contacto lateral.
          c.slow = 1.6;
          p.y = FLOOR - 62;
          p.vy = -560;
          p.grounded = false;
          p.coyote = 0;
          this.emit("stomp", c.x, FLOOR - 60, { combo: 1 });
        } else if (!p.dead && near(p.x, c.x, 48) && p.y > FLOOR - 70) {
          if (this.hurt(10, c.x)) {
            c.slow = 1.3;
            c.x = p.x - c.face * 380;
            this.emit("catpounce", p.x, p.y - 70);
          }
        }
      } else if (c.state === "leave") {
        c.vy += 1800 * dt;
        c.y += c.vy * dt;
        c.x += c.face * 260 * dt;
        if (c.t > 0.3 && c.y > FLOOR + 400) Object.assign(c, { active: false, state: "off" });
        if (c.y < -300) Object.assign(c, { active: false, state: "off" });
      }
    }
    /* ---------- Enemigos ---------- */
    stepEnemies(dt, p, input) {
      const reflect = this.power.reflector > 0;
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        if (e.hp <= 0) {
          e.dead = Math.max(0, e.dead - dt);
          if (e.kind === "pigeon" && e.how !== "stomp") {
            e.vy += 900 * dt;
            e.y = Math.min(FLOOR, e.y + e.vy * dt);
          }
          continue;
        }
        if (this.won || Math.abs(e.x - p.x) > 1500) continue;
        e.t += dt;
        e.phase += dt;
        e.stun = Math.max(0, e.stun - dt);
        e.cool = Math.max(0, e.cool - dt);
        const dx = p.x - e.x;
        if (e.kind === "rat") {
          // Sale de la alcantarilla cuando te acercás, corre y vuelve a esconderse.
          if (e.state === "hidden") {
            if (!reflect && Math.abs(dx) < 330 && e.cool <= 0) {
              e.state = "out";
              e.t = 0;
              e.face = Math.sign(dx) || 1;
              this.emit("ratout", e.x, FLOOR);
            }
          } else if (e.state === "out") {
            e.x = clamp(e.x + e.face * 210 * dt, e.min, e.max);
            if (e.x <= e.min || e.x >= e.max) e.face *= -1;
            if (e.t > 2.6 || reflect) {
              e.state = "back";
              e.face = Math.sign(e.home - e.x) || 1;
            }
          } else if (e.state === "back") {
            e.x += e.face * 230 * dt;
            if (Math.abs(e.x - e.home) < 8) {
              e.x = e.home;
              e.state = "hidden";
              e.cool = 1.4;
            }
          }
        } else if (e.kind === "pigeon") {
          // Duerme posada; si pasás corriendo cerca, se lanza en picada y luego se va volando.
          if (e.state === "perch") {
            const loud = Math.abs(p.vx) > 300 || this.shot > 0.2;
            if (!reflect && e.cool <= 0 && loud && Math.abs(dx) < 280 && Math.abs(p.y - e.y) < 260) {
              e.state = "dive";
              e.t = 0;
              e.face = Math.sign(dx) || 1;
              e.vx = e.face * 300;
              e.vy = -120;
              this.emit("coo", e.x, e.y - 30);
            }
          } else if (e.state === "dive") {
            e.vy += 700 * dt;
            e.x += e.vx * dt;
            e.y = Math.min(FLOOR - 4, e.y + e.vy * dt);
            if (e.y >= FLOOR - 4 || e.t > 1.4) {
              e.state = "away";
              e.vy = -380;
            }
          } else if (e.state === "away") {
            e.x += e.vx * 0.8 * dt;
            e.y += e.vy * dt;
            if (e.y < -140) {
              e.state = "perch";
              e.x = e.home;
              e.y = e.homeY;
              e.cool = 3;
            }
          }
        } else if (e.kind === "can" || e.kind === "lantern") {
          // Ruedan por la vereda y rebotan entre sus límites.
          if (e.state === "patrol") {
            if (Math.abs(dx) < 520) {
              e.state = "roll";
              e.face = Math.sign(dx) || -1;
            }
          } else {
            e.x += e.face * (e.kind === "lantern" ? 170 : 230) * dt;
            if (e.x < e.min || e.x > e.max) {
              e.x = clamp(e.x, e.min, e.max);
              e.face *= -1;
              this.emit("bonk", e.x, FLOOR - 20);
            }
          }
        } else if (e.kind === "dog") {
          // V11.1: patrulla visible; correr/disparar cerca activa la persecución.
          if (e.state === "sleep") e.state = "patrol"; // compatible con partidas anteriores
          if (e.state === "patrol") {
            e.x += e.face * 65 * dt;
            if (e.x <= e.min) { e.x = e.min; e.face = 1; }
            if (e.x >= e.max) { e.x = e.max; e.face = -1; }
            if ((Math.abs(p.vx) > 300 || this.shot > 0.2) && Math.abs(dx) < 360) this.wakeDog(e);
          } else if (e.state === "chase") {
            e.face = Math.sign(dx) || 1;
            e.x = clamp(e.x + e.face * 300 * dt, e.min - 200, e.max + 200);
            if (e.t > 3.2) {
              e.state = "tired";
              e.t = 0;
            }
          } else if (e.state === "tired") {
            e.face = Math.sign(e.home - e.x) || 1;
            e.x += e.face * 90 * dt;
            if (Math.abs(e.x - e.home) < 6) {
              e.state = "patrol";
              e.t = 0;
              e.x = e.home;
            }
          }
        } else if (e.kind === "barista") {
          // Patrulla el café. Si te ve de pie, corre a buscarte para «hacer un cortado».
          if (e.stun > 0) continue;
          const sees = Math.abs(dx) < 360 && dx * e.face > -40 && !(p.crouch > 0.5 && Math.abs(dx) > 120);
          if (sees && e.cool <= 0) {
            e.state = "chase";
            e.face = Math.sign(dx) || 1;
            e.x += e.face * 230 * dt;
          } else {
            e.state = "patrol";
            e.x += e.face * 70 * dt;
            if (e.x < e.min) e.face = 1;
            if (e.x > e.max) e.face = -1;
          }
          e.x = clamp(e.x, e.min - 120, e.max + 120);
        } else if (e.kind === "coffee") {
          // Gotas de café que saltan hacia la botella.
          e.vy += 1300 * dt;
          e.y += e.vy * dt;
          if (e.y >= FLOOR) {
            e.y = FLOOR;
            e.vy = Math.abs(dx) < 420 ? -420 : -200;
            e.face = Math.sign(dx) || 1;
          }
          e.x = clamp(e.x + e.face * (Math.abs(dx) < 420 ? 120 : 30) * dt, e.min, e.max);
        }
        // Contacto con la botella.
        if (p.dead) continue;
        const ph = p.crouch > 0.5 ? 96 : 142,
          top = e.y - e.h;
        const overlap = near(p.x, e.x, e.w / 2 + 18) && p.y > top && p.y - ph < e.y;
        if (!overlap) continue;
        if (e.kind === "rat" && e.state === "hidden") continue;
        if (this.power.uht > 0 && !["dog", "barista"].includes(e.kind)) {
          this.killEnemy(e, "uht");
          continue;
        }
        const stompable = !["dog", "barista"].includes(e.kind);
        if (p.vy > 50 && p.py <= top + 15) {
          this.combo++;
          p.y = top;
          p.vy = input.jump ? -620 : -480;
          p.grounded = false;
          this.emit("stomp", e.x, top, { combo: this.combo });
          if (stompable) this.damageEnemy(e, 999, "stomp");
          else if (e.kind === "dog") this.wakeDog(e);
          else e.stun = 2;
          continue;
        }
        if (e.kind === "barista") {
          if (e.state === "chase" && p.invuln <= 0 && this.power.uht <= 0) {
            this.power.cortado = POWER_TIME.cortado;
            // «¡Un cortado!»: te lleva unos pasos atrás y quedás manchada (más lenta) hasta una recarga.
            p.x = clamp(e.x - e.face * 320, 40, WIDTH - 40);
            p.invuln = 1;
            e.cool = 3;
            e.state = "patrol";
            this.emit("cortado", p.x, p.y - 80);
          }
          continue;
        }
        const dmg = e.kind === "dog" ? 10 : 5;
        if (this.hurt(dmg, e.x) && e.kind === "coffee") {
          this.power.cortado = POWER_TIME.cortado;
          this.emit("cortado", p.x, p.y - 80);
        }
      }
    }
    /* ---------- La Vaca Mecánica ---------- */
    cowBox() {
      const b = this.boss;
      return { x0: b.x - COW.halfBody, x1: b.x + COW.halfBody, top: b.y - b.alt - COW.height * 0.92, bottom: b.y - b.alt };
    }
    bossStep(dt) {
      const b = this.boss,
        p = this.player;
      b.flash = Math.max(0, b.flash - dt);
      b.anim += dt;
      const wasVuln = b.vuln > 0;
      b.vuln = Math.max(0, b.vuln - dt);
      if (wasVuln && b.vuln === 0 && b.hp > 0 && b.state !== "dead") this.emit("cowshield", b.x, FLOOR - 360);
      if (b.state === "waiting") {
        if (p.x > ARENA_X + 40 && !p.dead) {
          b.state = "intro";
          b.t = 0;
          b.alt = 1100;
          b.x = b.startX;
          if (this.clock < DAWN_SECONDS && !this.dawnBonus) {
            this.dawnBonus = true;
            this.addScore(3000, p.x, p.y - 190, "¡ANTES DEL AMANECER!");
          }
          this.emit("bossintro", b.x, FLOOR);
        }
        return;
      }
      if (b.state === "dead") {
        b.t += dt;
        if (b.t > 2.9 && !this.won) {
          this.won = true;
          this.winTime = 0;
          this.emit("victory", b.x, FLOOR - 300);
        }
        return;
      }
      if (b.state !== "intro") p.x = clamp(p.x, ARENA_X - 20, ARENA_RIGHT);
      b.t += dt;
      const busy = ["intro", "crouch", "rise", "hang", "fall", "land", "charge", "fire", "recover"].includes(b.state);
      if (!busy) {
        b.jumpIn -= dt;
        b.shootIn -= dt;
      }
      const go = (state) => {
        b.state = state;
        b.t = 0;
      };
      switch (b.state) {
        case "intro":
          // El cartel se apaga, la vaca cae del cielo y despierta.
          if (b.t > 1.2 && b.alt > 0) {
            b.alt = Math.max(0, 1100 * (1 - Math.pow((b.t - 1.2) / 0.55, 2)));
            if (b.alt === 0) this.emit("cowland", b.x, FLOOR, { intro: true });
          }
          if (b.t > 3.9) {
            go("idle");
            this.openWindow();
          }
          break;
        case "idle":
        case "walk": {
          const want = clamp(p.x + 430 * (Math.sign(b.x - p.x) || 1), COW.minX, COW.maxX);
          const d = want - b.x;
          if (Math.abs(d) > 12) {
            b.x += Math.sign(d) * 70 * dt;
            b.state = "walk";
          } else b.state = "idle";
          b.face = p.x < b.x ? -1 : 1;
          if (b.shootIn <= 0) {
            go("charge");
            b.targetX = p.x;
            this.emit("cowcharge", b.x + b.face * 420, FLOOR - 350);
          } else if (b.jumpIn <= 0) {
            go("crouch");
            this.emit("cowcrouch", b.x, FLOOR);
          }
          break;
        }
        case "crouch":
          if (b.t > 0.7) {
            go("rise");
            this.emit("cowjump", b.x, FLOOR);
          }
          break;
        case "rise":
          b.alt = 1100 * (1 - Math.pow(1 - Math.min(1, b.t / 0.6), 2));
          if (b.t >= 0.6) {
            go("hang");
            b.targetX = clamp(p.x, COW.minX, COW.maxX);
            b.from = b.x;
          }
          break;
        case "hang":
          b.alt = 1100;
          b.x = b.from + (b.targetX - b.from) * Math.min(1, b.t / 0.35);
          if (b.t >= 0.6) {
            go("fall");
            this.emit("cowfall", b.x, FLOOR);
          }
          break;
        case "fall":
          b.alt = Math.max(0, 1100 * (1 - Math.pow(Math.min(1, b.t / 0.45), 2)));
          if (b.t >= 0.45) {
            b.alt = 0;
            go("land");
            // El salto sacude todo: si la botella está en el piso (o debajo de la vaca), pierde 5 %.
            const under = near(p.x, b.x, COW.halfBody + 20);
            const grounded = p.grounded && p.y >= FLOOR - 2;
            if (!p.dead && (grounded || under)) this.hurt(COW.jumpDamage, b.x, { knock: true, invuln: 0.9 });
            if (under) p.x = clamp(b.x + (p.x < b.x ? -1 : 1) * (COW.halfBody + 40), ARENA_X - 20, ARENA_RIGHT);
            if (p.x < ARENA_X - 20 || p.x > ARENA_RIGHT) p.x = clamp(p.x, ARENA_X - 20, ARENA_RIGHT);
            this.emit("cowland", b.x, FLOOR, { hit: grounded || under });
          }
          break;
        case "land":
          if (b.t >= 0.9) {
            go("idle");
            b.jumpIn = COW.jumpEvery;
            this.openWindow();
          }
          break;
        case "charge":
          b.face = p.x < b.x ? -1 : 1;
          if (b.t >= 1.3) {
            go("fire");
            b.targetX = p.x;
            this.fireBall();
          }
          break;
        case "fire":
          if (b.t >= 0.95) go("recover");
          break;
        case "recover":
          if (b.t >= 0.8) {
            go("idle");
            b.shootIn = COW.shootEvery;
            if (b.jumpIn < COW.window + 1) b.jumpIn = COW.window + 1;
            this.openWindow();
          }
          break;
      }
      // La vaca es sólida: empuja a la botella fuera de su cuerpo (sin daño).
      if (b.alt < 40 && b.state !== "intro" && !p.dead) {
        const box = this.cowBox();
        if (p.x > box.x0 && p.x < box.x1 && p.y > box.top + 40) {
          const left = box.x0 - 24,
            right = box.x1 + 24;
          let nx = p.x - b.x < 0 ? left : right;
          if (nx < ARENA_X - 20) nx = right;
          if (nx > ARENA_RIGHT) nx = left;
          p.x = nx;
          p.vx = 0;
        }
      }
    }
    openWindow() {
      this.boss.vuln = COW.window;
      this.emit("cowopen", this.boss.x, FLOOR - 360);
    }
    muzzle() {
      const b = this.boss;
      return { x: b.x + b.face * 410, y: FLOOR - b.alt - 320 };
    }
    fireBall() {
      const b = this.boss,
        m = this.muzzle(),
        p = this.player;
      const T = 1.0,
        g = COW.gravity;
      const tx = clamp(p.x + p.vx * 0.35, ARENA_X - 10, ARENA_RIGHT);
      const vx = (tx - m.x) / T;
      const vy = (FLOOR - 26 - m.y - 0.5 * g * T * T) / T;
      this.hazards.push({ kind: "cowball", x: m.x, y: m.y, vx, vy, r: 40, life: 3, hit: false, ang: Math.atan2(vy, vx) });
      this.emit("cowfire", m.x, m.y, { face: b.face });
    }
    bossHit(amount) {
      const b = this.boss;
      if (b.hp <= 0 || b.state === "intro" || b.state === "waiting" || b.alt > 200 || b.vuln <= 0) return false;
      b.hp = Math.max(0, b.hp - amount);
      b.flash = 0.12;
      this.emit("bosshit", b.x - b.face * 0, FLOOR - 360, { hp: b.hp });
      const broken = Math.floor((100 - b.hp) / 25);
      if (broken > b.breaks) {
        b.breaks = broken;
        this.emit("billboardbreak", b.x, 200, { n: broken });
      }
      if (b.hp === 0) {
        b.state = "dead";
        b.t = 0;
        b.alt = 0;
        this.hazards = [];
        this.addScore(5000, b.x, FLOOR - 500, "¡VACA DERROTADA!");
        this.emit("bossdeath", b.x, FLOOR - 330);
      }
      return true;
    }
    /* ---------- Final: el camión de Granja La Esperanza ---------- */
    truckBed() {
      return { x: this.truck.x, y: FLOOR - 92, w: 280, kind: "truck" };
    }
    stepTruck(dt, p) {
      const k = this.truck;
      k.t += dt;
      if (k.state === "off" && this.winTime > 2.2) {
        Object.assign(k, { state: "arrive", t: 0, x: WIDTH + 700 });
        this.emit("truckhorn", TRUCK_STOP, FLOOR - 120);
      }
      if (k.state === "arrive") {
        // Frena con suavidad hasta quedar detrás de la vaca vencida.
        k.x = TRUCK_STOP + (WIDTH + 700 - TRUCK_STOP) * Math.pow(1 - Math.min(1, k.t / 2.4), 3);
        if (k.t >= 2.4) Object.assign(k, { state: "wait", t: 0, x: TRUCK_STOP });
        return {};
      }
      if (k.state === "wait") {
        const bed = this.truckBed();
        if (p.grounded && p.y <= bed.y + 1 && p.x > bed.x && p.x < bed.x + bed.w) {
          Object.assign(k, { state: "board", t: 0 });
          this.emit("truckboard", p.x, p.y - 60);
          return {};
        }
        // La botella corre y salta a la caja del camión.
        const jumpAt = bed.x - 120;
        const jumpPressed = !k.jumped && p.grounded && p.x > jumpAt;
        if (jumpPressed) k.jumped = true;
        if (k.jumped && p.grounded && p.y >= FLOOR - 1 && p.x > bed.x + bed.w) k.jumped = false;
        return { run: true, right: p.x < bed.x + 120, left: p.x > bed.x + 200, jump: k.jumped && !p.grounded, jumpPressed };
      }
      if (k.state === "board" || k.state === "leave") {
        if (k.state === "board" && k.t > 1.1) Object.assign(k, { state: "leave", t: 0 });
        if (k.state === "leave") {
          k.v = Math.min(620, k.v + 260 * dt);
          k.x += k.v * dt;
          if (k.t > 3.2) this.complete = true;
        }
        p.vx = 0;
        p.vy = 0;
        p.x = k.x + 150;
        p.y = FLOOR - 92;
        p.grounded = true;
        return {};
      }
      return {};
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
      if (!this.won && this.boss.state !== "dead") this.clock += dt;
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
        if (this.firework <= 0 && this.winTime < 6) {
          this.firework = 0.45;
          this.emit("firework", ARENA_CENTER - 700 + ((this.winTime * 371) % 1400), 60 + ((this.winTime * 99) % 160));
        }
        // V10: en lugar del camión, aparece el dirigible de reparto que abre el nivel 4 («Por las nubes»).
        if (this.winTime > 2.2 && !this.airshipCalled) {
          this.airshipCalled = true;
          this.emit("airship", ARENA_CENTER, 120);
        }
        input = {};
        if (this.winTime > 7.5) this.complete = true;
      }
      this.stepEnemies(dt, p, input);
      if (p.dead) return this.events;
      // Pajita: impulso en el aire con CORRER. Galletita: doble salto.
      const runPressed = input.run && !this.runHeld;
      this.runHeld = !!input.run;
      const airborne = !p.grounded && p.coyote <= 0;
      let doubleJump = false;
      if (input.jumpPressed && airborne && this.power.cookie > 0 && !this.doubleUsed && !this.won) doubleJump = true;
      const speedMul = (this.power.cortado > 0 ? 0.8 : 1) * (this.power.uht > 0 ? 1.12 : 1);
      const evs = p.step(dt, { ...input, speed: speedMul, jumpPressed: doubleJump ? false : input.jumpPressed }, this.world());
      if (doubleJump && !p.grounded) {
        p.vy = -600;
        p.jumpHeld = !!input.jump;
        p.buffer = 0;
        this.doubleUsed = true;
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
      if (p.grounded) {
        this.combo = 0;
        this.doubleUsed = false;
        this.dashUsed = false;
      }
      this.stepWind(dt, p);
      for (const ev of evs) {
        if (["jump", "land", "hardland", "skid", "start", "spring"].includes(ev)) this.emit(ev);
        if (ev === "respawn") this.hurt(100);
      }
      if (!this.won) {
        if (input.shoot && this.shot === 0 && this.boss.state !== "dead") {
          this.shot = 0.25;
          this.shootPose = 0.24;
          this.bullets.push({
            x: p.x + p.face * 26,
            y: p.y - (p.crouch > 0.5 ? 52 : 81),
            vx: p.face * 760,
            life: 1.2,
            damage: this.power.cacao > 0 ? 20 : 10,
            cacao: this.power.cacao > 0,
          });
          this.emit("shoot", p.x, p.y - 80);
        }
        for (const i of this.items) if (!i.taken && near(p.x, i.x, 39) && i.y > p.y - 145 && i.y < p.y + 12) this.collect(i);
        for (const f of this.flags) {
          if (!f.active && near(p.x, f.x, 45) && p.y > 450) {
            f.active = true;
            this.checkpointIndex = f.index;
            this.hp = 100;
            this.power.cortado = 0;
            this.saved = this.snapshot();
            this.emit("checkpoint", f.x, FLOOR, { snapshot: this.saved, index: f.index });
          }
        }
        for (const v of this.vents) {
          const c = (this.time + v.offset) % 3.4;
          v.warn = c > 1.6 && c < 2.2;
          v.on = c >= 2.2 && c < 3.2;
          if (v.on && near(p.x, v.x, 30) && p.y > 330 && this.hurt(5, v.x)) p.vy = -420;
        }
        this.stepCat(dt, p);
      }
      this.bossStep(dt);
      // Proyectiles de leche.
      for (const b of this.bullets) {
        const old = b.x;
        b.x += b.vx * dt;
        b.life -= dt;
        for (const box of this.platforms) {
          if (box.breakable && !box.gone && b.y > box.y && b.y < box.y + box.h && Math.max(old, b.x) > box.x && Math.min(old, b.x) < box.x + box.w) {
            box.gone = true;
            b.life = 0;
            this.emit("crate", box.x, box.y);
            this.items.push({ id: "box" + box.id, x: box.x + box.w / 2, y: box.y - 20, kind: "coin", taken: false });
            break;
          }
        }
        if (b.life <= 0) continue;
        for (const e of this.enemies) {
          if (e.hp > 0 && !(e.kind === "rat" && e.state === "hidden") && b.y > e.y - e.h - 6 && b.y < e.y + 6 && Math.max(old, b.x) > e.x - e.w / 2 && Math.min(old, b.x) < e.x + e.w / 2) {
            this.damageEnemy(e, b.damage);
            b.life = 0;
            break;
          }
        }
        if (b.life <= 0) continue;
        const c = this.cat;
        if (c.active && c.state === "run" && near(b.x, c.x, 40) && b.y > FLOOR - 70) {
          c.slow = 0.8;
          b.life = 0;
          this.emit("catstun", c.x, FLOOR - 60);
          continue;
        }
        const boss = this.boss;
        if (boss.hp > 0 && boss.state !== "waiting") {
          const box = this.cowBox();
          if (b.y > box.top && b.y < box.bottom && Math.max(old, b.x) > box.x0 && Math.min(old, b.x) < box.x1) {
            // La leche le quita 2 % (4 % con chocolatada).
            if (!this.bossHit(b.cacao ? COW.milkDamage * 2 : COW.milkDamage)) this.emit("armor", b.x, b.y);
            b.life = 0;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      // Bola de energía de la vaca: arco, impacto y salpicadura.
      for (const h of this.hazards) {
        if (h.kind !== "cowball") continue;
        h.life -= dt;
        h.vy += COW.gravity * dt;
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.ang = Math.atan2(h.vy, h.vx);
        const ph = p.crouch > 0.5 ? 96 : 142;
        if (!h.hit && !p.dead && near(p.x, h.x, h.r + 18) && h.y + h.r > p.y - ph && h.y - h.r < p.y) {
          h.hit = true;
          this.hurt(COW.shotDamage, h.x);
        }
        if (h.y >= FLOOR - 24) {
          h.life = 0;
          this.emit("cowblast", h.x, FLOOR);
          if (!h.hit && !p.dead && near(p.x, h.x, 110) && p.y > FLOOR - 70) {
            h.hit = true;
            this.hurt(COW.shotDamage, h.x);
          }
        }
      }
      this.hazards = this.hazards.filter((h) => h.life > 0);
      return this.events;
    }
  }
  root.MilkLevel3Core = { Level3, FLOOR, STRIDE, WIDTH, ARENA_X, ARENA_RIGHT, ARENA_CENTER, CAM_MAX, TRUCK_STOP, NAMES, SECTIONS, COW, POWER_TIME, WIND_ZONES, RAIN_ZONES, CHASES, DAWN_SECONDS, build };
  if (typeof module !== "undefined") module.exports = root.MilkLevel3Core;
})(typeof window !== "undefined" ? window : globalThis);
