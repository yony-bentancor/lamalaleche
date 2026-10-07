/* Fecha de vencimiento — deterministic simulation, independent of rendering. */
(function (root) {
  "use strict";
  const P = root.MilkPhysics || (typeof require === "function" ? require("./physics.js") : null);
  const FLOOR = 520,
    STRIDE = 1170,
    WIDTH = 14150,
    DAY = 16;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const near = (a, b, d) => Math.abs(a - b) < d;
  // V7 Premium: duración de cada derrota (derretido, caída del repositor, cucaracha patas arriba, mosca en espiral).
  const DEATH = { yogurt: 1.7, mold: 1.7, cheese: 1.7, robot: 1.5, roach: 1.2, fly: 1.3, cart: 1.65 };
  // Ráfagas en la playa de descarga: 5 s de calma, 1 s de aviso, 2,2 s de viento y 0,8 s de calma progresiva.
  const WIND_ZONE = 3 * STRIDE,
    WIND_CYCLE = 9,
    WIND_PUSH = 150;
  // Las puertas de heladera se dibujan sobre las heladeras pintadas del fondo 10 (parallax 0,9).
  const DOOR_TILE = 9,
    doorWorldX = (xt, camX) => 0.9 * DOOR_TILE * STRIDE + 0.1 * camX + xt,
    // Posición de reposo: la cámara deja a la botella al 43% de la pantalla (550 px).
    doorRestX = (xt) => (0.9 * DOOR_TILE * STRIDE - 55 + xt) / 0.9;
  const NAMES = [
    "Playa de descarga",
    "Bajo la lluvia",
    "Cortinas de carga",
    "El depósito",
    "Entre las estanterías",
    "Salida de emergencia",
    "Panadería",
    "Frutas y verduras",
    "Pasillo de ofertas",
    "Cadena de frío",
    "La línea de cajas",
    "La última compra",
  ];
  function build() {
    const platforms = [],
      items = [],
      enemies = [],
      belts = [],
      doors = [],
      moldCeilings = [],
      flags = [2700, 5500, 8300, 12640].map((x, i) => ({ x, index: i, active: false }));
    let seq = 0;
    const add = (x, y, w, kind, opts = {}) => {
      const b = { id: "p" + seq++, x, y, w, h: kind === "box" ? FLOOR - y : 22, kind, ...opts };
      platforms.push(b);
      return b;
    };
    const item = (x, y, kind) => items.push({ id: "i" + items.length, x, y, kind, taken: false });
    const enemy = (kind, x, min, max) =>
      enemies.push({
        id: "e" + enemies.length,
        kind,
        x,
        y: FLOOR,
        min,
        max,
        face: 1,
        vx: 0,
        vy: 0,
        h: kind === "cart" ? 110 : kind === "roach" ? 35 : kind === "fly" ? 45 : kind === "robot" ? 165 : 118,
        w: kind === "cart" ? 115 : kind === "robot" ? 72 : kind === "roach" ? 44 : 70,
        hp: kind === "cart" ? 30 : kind === "robot" ? 40 : kind === "cheese" ? 10 : 20,
        phase: 0,
        cool: 1.8,
        attack: 0,
        flash: 0,
        dead: 0,
        drip: 0,
      });
    // Every rise <=105 px (held jump reaches 126px); clear alternative routes on the floor.
    for (let z = 0; z < 11; z++) {
      const x = z * STRIDE,
        kind = z < 3 ? "pallet" : z < 6 ? "shelf" : z < 8 ? "produce" : z < 10 ? "shelf" : "belt";
      const sizes = [
        [190, 225, 185],
        [235, 170, 210],
        [165, 250, 160],
        [230, 200, 190],
        [180, 265, 175],
        [210, 180, 240],
        [240, 195, 160],
        [190, 230, 200],
        [200, 255, 170],
        [160, 235, 205],
        [215, 190, 230],
      ][z];
      add(x + 380, 425, sizes[0], kind);
      add(x + 660, 330, sizes[1], kind);
      add(x + 920, 235, sizes[2], kind);
      if (z >= 3 && z <= 5) {
        add(x + 485, 235, 160, "shelf");
        add(x + 250, 330, 135, "lift", { moving: true, baseY: 330, baseX: x + 250, dy: 0, dx: 0 });
      }
      if (z === 0 || z === 2 || z === 4 || z === 7) add(x + 770, 448, 88, "box", { breakable: true, h: 72 });
      for (let k = 0; k < 4; k++) item(x + 405 + k * 40, 397, "coin");
      item(x + 750, 297, z % 3 === 0 ? "days" : z % 3 === 1 ? "refill" : "shield");
      item(x + 990, 201, z === 8 ? "clone" : z === 9 ? "cacao" : z === 5 ? "uht" : "days");
      if (z % 2 === 0) item(x + 190, 474, "coin");
    }
    item(260, 474, "days");
    item(8150, 472, "clone");
    item(11450, 472, "refill");
    item(12950, 474, "refill");
    enemy("cart", 1040, 940, 1410);
    enemy("yogurt", 1710, 1600, 2130);
    enemy("cheese", 2460, 2360, 2580);
    enemy("mold", 3270, 3160, 3430);
    enemy("robot", 4270, 4070, 4530);
    enemy("yogurt", 5190, 4970, 5360);
    enemy("cart", 6120, 5960, 6560);
    enemy("mold", 6750, 6610, 6900);
    enemy("roach", 7390, 7220, 7670);
    enemy("cheese", 8240, 8080, 8460);
    enemy("fly", 8990, 8770, 9200);
    enemy("fly", 9140, 8850, 9420);
    enemy("yogurt", 9790, 9620, 10020);
    enemy("robot", 10700, 10560, 10940);
    enemy("cart", 11640, 11550, 12100);
    enemy("mold", 12300, 12170, 12490);
    belts.push(
      { x: 3690, w: 430, speed: 95 },
      { x: 5650, w: 420, speed: -100 },
      { x: 11800, w: 600, speed: 155 },
      { x: 13000, w: 1010, speed: -75 },
    );
    // xt = centro de la puerta pintada dentro del fondo; x se recalcula con la cámara real al dibujar.
    doors.push(
      { xt: 508, x: doorRestX(508), w: 86, t: 0, open: 0, hit: false, top: 163, bottom: 396 },
      { xt: 700, x: doorRestX(700), w: 90, t: 2.5, open: 0, hit: false, top: 163, bottom: 396 },
    );
    moldCeilings.push({ x: 3390, y: 170, cool: 1.2 }, { x: 6470, y: 175, cool: 0.7 });
    return { platforms, items, enemies, belts, doors, moldCeilings, flags };
  }
  class Level2 {
    constructor(saved = null) {
      this.reset(saved);
    }
    reset(saved = null) {
      Object.assign(this, build());
      this.time = 0;
      this.hp = 100;
      this.seconds = 12 * DAY;
      this.temp = 12;
      this.toxic = false;
      this.tagged = true;
      this.score = 0;
      this.coins = 0;
      this.shield = false;
      this.cloneTime = 0;
      this.cacao = 0;
      this.uht = 0;
      this.shot = 0;
      this.shootPose = 0;
      this.bullets = [];
      this.hazards = [];
      this.events = [];
      this.history = [];
      this.clone = null;
      this.checkpointIndex = -1;
      this.won = false;
      this.complete = false;
      this.winTime = 0;
      this.firework = 0;
      this.expiryTick = 0;
      this.toxicTick = 0;
      this.blackout = 0;
      this.blackoutWarn = false;
      this.wind = 0;
      this.windWarn = false;
      this.combo = 0;
      this.boss = {
        x: 13745,
        y: FLOOR,
        w: 180,
        h: 235,
        hp: 100,
        active: false,
        state: "waiting",
        timer: 0,
        cycle: 0,
        flash: 0,
        laserY: 410,
        hit: false,
        coinTick: 0,
      };
      this.player = new P.Player(150, FLOOR);
      if (saved && saved.version === 7) {
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
        this.seconds = clamp(Number(saved.seconds) || 12 * DAY, DAY * 4, DAY * 40);
        for (const i of saved.loot || []) {
          if (i && i.kind === "coin" && String(i.id).startsWith("box") && Number.isFinite(i.x) && Number.isFinite(i.y))
            this.items.push({ ...i });
        }
        const taken = new Set(saved.taken || []),
          defeated = new Set(saved.defeated || []);
        this.items.forEach((i) => (i.taken = taken.has(i.id)));
        this.enemies.forEach((e) => {
          if (defeated.has(e.id)) e.hp = 0;
        });
        this.platforms.forEach((p) => (p.gone = (saved.broken || []).includes(p.id)));
        this.flags.forEach(
          (f) => (f.active = Array.isArray(saved.flags) ? saved.flags.includes(f.index) : f.index <= this.checkpointIndex),
        );
        this.player.reset(this.checkpointIndex < 0 ? 150 : this.flags[this.checkpointIndex].x + 45, FLOOR);
        this.tagged = this.checkpointIndex < 0;
      }
      this.saved = this.snapshot();
    }
    snapshot() {
      return {
        version: 7,
        flag: this.checkpointIndex,
        score: this.score,
        coins: this.coins,
        seconds: this.seconds,
        flags: this.flags.filter((f) => f.active).map((f) => f.index),
        loot: this.items.filter((i) => i.id.startsWith("box")).map((i) => ({ ...i })),
        taken: this.items.filter((i) => i.taken).map((i) => i.id),
        defeated: this.enemies.filter((e) => e.hp <= 0).map((e) => e.id),
        broken: this.platforms.filter((p) => p.gone).map((p) => p.id),
      };
    }
    emit(type, x = this.player.x, y = this.player.y, extra = {}) {
      this.events.push({ type, x, y, ...extra });
    }
    get zone() {
      return clamp(Math.floor(this.player.x / STRIDE), 0, 11);
    }
    get days() {
      return Math.max(0, Math.ceil(this.seconds / DAY));
    }
    get platformsNow() {
      return this.platforms
        .filter((b) => !b.gone)
        .concat(
          this.enemies
            .filter((e) => e.kind === "cart" && e.hp > 0)
            .map((e) => ({ x: e.x - e.w / 2, y: e.y - e.h + 10, w: e.w, moving: true, dx: e.vx / 120, cart: e })),
        );
    }
    world() {
      const a = this;
      return {
        width: WIDTH,
        height: 720,
        solids: this.platforms.filter((p) => p.kind === "box" && !p.gone),
        ceilings: [],
        surfaces() {
          return a.platformsNow.concat([{ x: 0, y: FLOOR, w: WIDTH, kind: "floor" }]).sort((a, b) => a.y - b.y);
        },
        modifiers(p) {
          const belt = a.belts.find((b) => p.x > b.x && p.x < b.x + b.w && p.y > FLOOR - 3);
          return { belt: a.won ? 0 : belt?.speed || 0, slip: a.zone < 3 ? 0.87 : 1 };
        },
      };
    }
    hurt(amount, toxic = false, sourceX = this.player.x) {
      const p = this.player;
      if (p.dead || this.won || p.invuln > 0 || this.uht > 0) return false;
      if (this.shield) {
        this.shield = false;
        p.invuln = 0.75;
        this.emit("shield");
        return false;
      }
      this.hp = Math.max(0, this.hp - amount);
      if (toxic) this.toxic = true;
      p.damage();
      p.vx = (p.x < sourceX ? -1 : 1) * 170;
      p.invuln = 1.1;
      this.emit("hurt", p.x, p.y - 65, { amount });
      if (this.hp <= 0) {
        p.kill();
        this.emit("death");
      }
      return true;
    }
    drain(amount) {
      if (this.player.dead || this.won || this.uht > 0) return;
      this.hp = Math.max(0, this.hp - amount);
      if (this.hp <= 0) {
        this.player.kill();
        this.emit("death");
      }
    }
    killEnemy(e, stomp = false) {
      if (e.hp <= 0) return;
      e.hp = 0;
      e.dead = DEATH[e.kind] || 0.5;
      e.deadMax = e.dead;
      e.stomped = stomp;
      e.attack = 0;
      // La mosca y la cucaracha caen desde donde estaban; el repositor cae hacia atrás.
      e.deathY = e.y;
      const points = stomp ? 150 * Math.max(1, this.combo) : 100;
      this.score += points;
      this.emit("pop", e.x, e.y - e.h / 2, { color: "#e7d895", kind: e.kind, stomp });
      this.emit("points", e.x, e.y - e.h - 18, { value: points, label: stomp && this.combo > 1 ? "COMBO x" + this.combo : "" });
    }
    damageEnemy(e, amount, stomp = false) {
      if (e.hp <= 0 || (e.kind === "cart" && stomp)) return false;
      if (e.kind === "cheese" && !stomp) {
        e.flash = 0.14;
        this.emit("armor", e.x, e.y - 70);
        return false;
      }
      e.hp -= amount;
      e.flash = 0.15;
      this.emit("hit", e.x, e.y - e.h / 2);
      if (e.hp <= 0) {
        e.hp = 1;
        this.killEnemy(e, stomp);
      }
      return true;
    }
    collect(i) {
      i.taken = true;
      this.score += i.kind === "coin" ? 25 : 100;
      this.emit("collect", i.x, i.y, { kind: i.kind });
      if (i && i.kind === "coin") {
        this.coins++;
        if (this.coins % 20 === 0) this.hp = Math.min(100, this.hp + 20);
      }
      if (i.kind === "days") this.seconds = Math.min(40 * DAY, this.seconds + 3 * DAY);
      if (i.kind === "refill") {
        this.hp = 100;
        this.toxic = false;
        this.temp = 8;
      }
      if (i.kind === "shield") this.shield = true;
      if (i.kind === "clone") {
        this.cloneTime = 14;
        this.history = [];
      }
      if (i.kind === "cacao") this.cacao = 20;
      if (i.kind === "uht") this.uht = 9;
    }
    bossStep(dt) {
      const b = this.boss,
        p = this.player;
      b.flash = Math.max(0, b.flash - dt);
      if (b.hp <= 0) return;
      if (!b.active && p.x > 12960) {
        b.active = true;
        b.state = "intro";
        b.timer = 2;
        this.emit("bossintro", b.x, b.y);
      }
      if (!b.active) return;
      p.x = clamp(p.x, 12920, WIDTH - 120);
      b.timer -= dt;
      if (b.timer <= 0) {
        if (b.state === "intro" || b.state === "closed") {
          b.state = "laserWarn";
          b.timer = 1.4;
          b.laserY = b.cycle % 2 ? FLOOR - 40 : FLOOR - 115;
          b.hit = false;
          this.emit("laserwarn", b.x, b.laserY);
        } else if (b.state === "laserWarn") {
          b.state = "laser";
          b.timer = 0.75;
          this.emit("laser", b.x, b.laserY);
        } else if (b.state === "laser") {
          b.state = "coins";
          b.timer = 3.2;
          b.coinTick = 0;
        } else if (b.state === "coins") {
          b.state = "open";
          b.timer = 4.3;
          this.emit("bossopen", b.x, b.y);
        } else if (b.state === "open") {
          b.state = "closed";
          b.timer = 1.1;
          b.cycle++;
        }
      }
      const ph = p.crouch > 0.5 ? 96 : 142;
      if (b.state === "laser" && !b.hit && p.x < b.x && p.y > b.laserY - 5 && p.y - ph < b.laserY + 5) {
        if (this.hurt(5, false, b.x)) b.hit = true;
      }
      if (b.state === "coins") {
        b.coinTick -= dt;
        if (b.coinTick <= 0) {
          b.coinTick = 0.6;
          const x = 13030 + ((b.cycle * 177 + Math.floor(b.timer * 3) * 163) % 620);
          this.hazards.push({ kind: "coin", x, y: 70, vx: 0, vy: 60, r: 17, life: 4, bounces: 0 });
          this.emit("coinwarn", x, 100);
        }
      }
      if (b.state === "open" && p.vy > 0 && p.py <= b.y - 100 && p.y >= b.y - 100 && near(p.x, b.x, 105)) {
        this.bossHit(20);
        p.y = b.y - 101;
        p.vy = -540;
        p.grounded = false;
      } else if (near(p.x, b.x, 90) && p.y > b.y - 200) this.hurt(5, false, b.x);
    }
    bossHit(amount) {
      const b = this.boss;
      if (b.state !== "open" || b.hp <= 0) return false;
      b.hp = Math.max(0, b.hp - amount);
      b.flash = 0.14;
      this.emit("hit", b.x, b.y - 120);
      if (b.hp === 0) {
        this.won = true;
        this.winTime = 0;
        b.state = "destroyed";
        this.player.vx = 0;
        this.player.invuln = 0;
        this.score += 2000;
        this.bullets = [];
        this.hazards = [];
        this.emit("victory", b.x, b.y - 100);
      }
      return true;
    }
    /* Ráfagas en los tres fondos exteriores: avisan con la lluvia, empujan hacia la izquierda y agacharse reduce el empuje. */
    windAt(t = this.time) {
      const c = t % WIND_CYCLE;
      if (c < 5) return { strength: 0, warn: false };
      if (c < 6) return { strength: (c - 5) * 0.25, warn: true };
      if (c < 8.2) return { strength: 1, warn: false };
      return { strength: Math.max(0, 1 - (c - 8.2) / 0.8), warn: false };
    }
    stepWind(dt, p) {
      const outside = p.x < WIND_ZONE && !this.won && !p.dead;
      const w = outside ? this.windAt() : { strength: 0, warn: false };
      this.wind = -w.strength;
      if (w.warn && !this.windWarn) this.emit("windwarn", p.x, p.y - 140);
      this.windWarn = w.warn;
      if (!this.wind) return;
      const grip = p.grounded ? (p.crouch > 0.5 ? 0.12 : 0.42) : 1;
      p.x = clamp(p.x + this.wind * WIND_PUSH * grip * dt, 20, WIDTH - 20);
    }
    step(dt, input = {}) {
      this.events = [];
      const p = this.player;
      this.time += dt;
      if (p.dead) {
        p.step(dt, {}, this.world());
        if (p.death > 1.6) {
          const save = this.saved;
          this.reset(save);
          this.emit("respawn");
        }
        return this.events;
      }
      this.shot = Math.max(0, this.shot - dt);
      this.shootPose = Math.max(0, this.shootPose - dt);
      for (const key of ["cloneTime", "cacao", "uht"]) {
        const before = this[key];
        this[key] = Math.max(0, this[key] - dt);
        if (before > 0 && this[key] === 0) this.emit("powerend", p.x, p.y - 80, { kind: key === "cloneTime" ? "clone" : key });
      }
      for (const b of this.platforms) {
        if (b.moving) {
          const old = b.x;
          b.x = b.baseX + Math.sin(this.time * 0.8) * 48;
          b.dx = b.x - old;
          b.y = b.baseY + Math.sin(this.time * 0.65) * 40;
        }
        if (b.life != null) {
          b.life -= dt;
          if (b.life <= 0) b.gone = true;
        }
      }
      this.platforms = this.platforms.filter((b) => !(b.life != null && b.gone));
      if (this.won) {
        this.winTime += dt;
        this.firework -= dt;
        if (this.winTime >= 3.2 && this.firework <= 0) {
          this.firework = 0.45;
          this.emit("firework", 12980 + ((this.winTime * 371) % 1000), 130 + ((this.winTime * 99) % 120));
        }
        input = { right: this.winTime > 5.6 };
        if (this.winTime > 5.6 && p.x > WIDTH - 90) {
          this.complete = true;
        }
      } else {
        this.temp = clamp(this.temp + dt * (this.zone >= 6 ? 0.08 : 0.02), 2, 38);
        this.seconds = Math.max(0, this.seconds - dt);
        if (this.seconds === 0) {
          this.expiryTick += dt;
          if (this.expiryTick >= 1) {
            this.expiryTick = 0;
            this.drain(1);
          }
        }
        if (this.toxic) {
          this.toxicTick += dt;
          if (this.toxicTick >= 5) {
            this.toxicTick = 0;
            this.drain(1);
          }
        }
      }
      // Patrols advance before physics, allowing carts to carry their passenger.
      for (const e of this.enemies) {
        e.flash = Math.max(0, e.flash - dt);
        e.dead = Math.max(0, e.dead - dt);
        if (e.hp <= 0 && e.dead > 0 && e.kind === "fly") e.y = Math.min(FLOOR - 8, e.y + dt * (160 + (e.deadMax - e.dead) * 420));
        if (e.hp <= 0 || this.won || Math.abs(e.x - p.x) > 1600) continue;
        e.phase += dt;
        e.cool -= dt;
        e.attack = Math.max(0, e.attack - dt);
        let speed = { cart: 175, yogurt: 38, cheese: 74, mold: 30, robot: 75, roach: 195, fly: 85 }[e.kind];
        const hidden = input.down && this.platforms.some((b) => b.kind === "box" && !b.gone && near(b.x + b.w / 2, p.x, 115));
        if (e.kind === "robot" && near(e.x, p.x, this.tagged ? 650 : 420) && !hidden) {
          e.face = Math.sign(p.x - e.x) || 1;
          speed = this.tagged ? 170 : 120;
        } else if (e.x <= e.min) e.face = 1;
        else if (e.x >= e.max) e.face = -1;
        e.vx = e.face * speed;
        e.x = clamp(e.x + e.vx * dt, e.min - 80, e.max + 80);
        // El queso solo camina y lanza bolas de queso en arco; se detiene mientras lanza.
        if (e.kind === "cheese") {
          e.y = FLOOR;
          e.vy = 0;
          if (e.attack > 0) e.x = clamp(e.x - e.vx * dt, e.min - 80, e.max + 80);
          if (near(e.x, p.x, 540) && Math.abs(p.y - FLOOR) < 260 && e.cool <= 0 && e.attack <= 0) {
            e.cool = 2.7;
            e.attack = 0.9;
            e.fired = false;
            e.face = Math.sign(p.x - e.x) || 1;
            this.emit("enemywarn", e.x, e.y - e.h);
          }
          if (e.attack > 0 && e.attack < 0.5 && !e.fired) {
            e.fired = true;
            const dist = clamp(Math.abs(p.x - e.x), 120, 520);
            this.hazards.push({
              kind: "cheeseball",
              x: e.x + e.face * 30,
              y: e.y - 108,
              vx: e.face * dist * 0.85,
              vy: -430,
              r: 12,
              life: 4,
              bounces: 0,
              spin: 0,
            });
            this.emit("throw", e.x, e.y - 100);
          }
        }
        if (e.kind === "fly") e.y = FLOOR - 80 + Math.sin(e.phase * 2) * 70;
        if (e.kind === "roach") {
          const wall = e.phase % 6;
          e.y = wall > 4 ? FLOOR - Math.sin(((wall - 4) / 2) * Math.PI) * 150 : FLOOR;
        }
        if (e.kind === "yogurt") {
          e.drip -= dt;
          if (e.drip <= 0) {
            e.drip = 2.4;
            this.hazards.push({ kind: "puddle", x: e.x, y: FLOOR, w: 66, r: 30, life: 5 });
          }
        }
        if ((e.kind === "yogurt" || e.kind === "mold") && near(e.x, p.x, 500) && e.cool <= 0) {
          e.cool = 3.5;
          e.attack = 0.8;
          e.fired = false;
          e.face = Math.sign(p.x - e.x) || 1;
          this.emit("enemywarn", e.x, e.y - e.h);
        }
        if (e.attack > 0 && e.attack < 0.35 && !e.fired) {
          e.fired = true;
          this.hazards.push({ kind: "spore", x: e.x + e.face * 35, y: e.y - 80, vx: e.face * 225, vy: -80, r: 10, life: 3 });
        }
      }
      const events = p.step(dt, input, this.world());
      if (p.grounded) this.combo = 0;
      this.stepWind(dt, p);
      for (const ev of events) {
        if (["jump", "land", "hardland", "skid", "start"].includes(ev)) this.emit(ev);
        if (ev === "respawn") this.hurt(100);
      }
      if (!this.won) {
        if (input.shoot && this.shot === 0) {
          this.shot = 0.25;
          this.shootPose = 0.24;
          this.bullets.push({
            x: p.x + p.face * 26,
            y: p.y - (p.crouch > 0.5 ? 52 : 81),
            vx: p.face * 750,
            life: 1.15,
            damage: this.cacao > 0 ? 20 : 10,
            cacao: this.cacao > 0,
          });
          this.emit("shoot", p.x, p.y - 80);
        }
        for (const e of this.enemies) {
          if (e.hp <= 0 || Math.abs(e.x - p.x) > 140) continue;
          const ph = p.crouch > 0.5 ? 96 : 142,
            top = e.y - e.h;
          if (e.kind === "cart") {
            if (p.y > top + 20 && p.y - ph < e.y && near(p.x, e.x, e.w / 2 + 17)) this.hurt(5, false, e.x);
          } else if (near(p.x, e.x, e.w / 2 + 18) && p.y > top && p.y - ph < e.y) {
            if (this.uht > 0) this.killEnemy(e, true);
            else if (p.vy > 50 && p.py <= top + 15 && e.kind !== "roach" && e.kind !== "mold" && e.kind !== "robot") {
              this.combo++;
              this.damageEnemy(e, 20, true);
              p.y = top;
              p.vy = input.jump ? -610 : -480;
              p.grounded = false;
              this.emit("stomp", e.x, top, { combo: this.combo });
            } else if (e.kind === "robot") {
              if (this.hurt(5, false, e.x)) {
                p.x = Math.max(this.flags[this.checkpointIndex]?.x || 150, p.x - 300);
                p.y = FLOOR;
                this.tagged = true;
                this.emit("caught");
              }
            } else this.hurt(5, e.kind === "mold" || e.kind === "yogurt", e.x);
          }
        }
        for (const i of this.items) {
          if (!i.taken && near(p.x, i.x, 39) && i.y > p.y - 145 && i.y < p.y + 12) this.collect(i);
        }
        for (const f of this.flags) {
          if (!f.active && near(p.x, f.x, 45) && p.y > 450) {
            f.active = true;
            this.checkpointIndex = f.index;
            this.hp = 100;
            this.toxic = false;
            this.tagged = false;
            this.seconds = Math.max(this.seconds, 4 * DAY);
            this.saved = this.snapshot();
            this.emit("checkpoint", f.x, FLOOR, { snapshot: this.saved, index: f.index });
          }
        }
        for (const d of this.doors) {
          d.t += dt;
          const phase = d.t % 6;
          d.open = phase > 3 && phase < 5 ? Math.sin(((phase - 3) / 2) * Math.PI) : 0;
          if (phase < 3) d.hit = false;
          if (d.open > 0.45 && near(p.x, d.x, 120) && p.y > 400) {
            this.temp = Math.max(2, this.temp - dt * 18);
            if (!d.hit) {
              d.hit = true;
              p.vx = -250;
              p.x -= 25;
              this.emit("cool", d.x, FLOOR - 60);
            }
          }
        }
        for (const m of this.moldCeilings) {
          m.cool -= dt;
          if (near(p.x, m.x, 180) && m.cool <= 0) {
            m.cool = 1.8;
            this.hazards.push({ kind: "spore", x: m.x, y: m.y, vx: 0, vy: 40, r: 11, life: 3 });
            this.emit("enemywarn", m.x, m.y);
          }
        }
        this.bossStep(dt);
      }
      for (const b of this.bullets) {
        const old = b.x;
        b.x += b.vx * dt;
        b.life -= dt;
        for (const box of this.platforms) {
          if (
            box.breakable &&
            !box.gone &&
            b.y > box.y &&
            b.y < box.y + box.h &&
            Math.max(old, b.x) > box.x &&
            Math.min(old, b.x) < box.x + box.w
          ) {
            box.gone = true;
            b.life = 0;
            this.emit("crate", box.x, box.y);
            this.items.push({ id: "box" + box.id, x: box.x + box.w / 2, y: box.y - 20, kind: "coin", taken: false });
            break;
          }
        }
        if (b.life <= 0) continue;
        for (const e of this.enemies) {
          if (e.hp > 0 && b.y > e.y - e.h && b.y < e.y && Math.max(old, b.x) > e.x - e.w / 2 && Math.min(old, b.x) < e.x + e.w / 2) {
            this.damageEnemy(e, b.damage);
            b.life = 0;
            break;
          }
        }
        const boss = this.boss;
        if (
          b.life > 0 &&
          boss.active &&
          boss.hp > 0 &&
          b.y > boss.y - 180 &&
          b.y < boss.y &&
          Math.max(old, b.x) > boss.x - 90 &&
          Math.min(old, b.x) < boss.x + 90
        ) {
          if (!this.bossHit(b.damage)) this.emit("armor", boss.x - 90, b.y);
          b.life = 0;
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      for (const h of this.hazards) {
        h.life -= dt;
        if (h.kind !== "puddle" && h.kind !== "cheesepuddle") {
          h.x += h.vx * dt;
          // V7 Premium: la gravedad ahora depende del tiempo (antes caían casi al instante).
          h.vy += (h.kind === "coin" || h.kind === "cheeseball" ? 1100 : 330) * dt;
          h.y += h.vy * dt;
          if (h.kind === "cheeseball") h.spin += (h.vx / h.r) * dt;
          if (h.y >= FLOOR - h.r) {
            if (h.kind === "cheeseball") {
              h.y = FLOOR - h.r;
              if (h.bounces < 1) {
                h.vy = -260;
                h.vx *= 0.65;
                h.bounces++;
                this.emit("cheesebounce", h.x, FLOOR);
              } else {
                h.life = 0;
                this.hazards.push({ kind: "cheesepuddle", x: h.x, y: FLOOR, w: 40, r: 20, life: 1.6 });
                this.emit("cheesesplat", h.x, FLOOR);
              }
            } else if (h.kind === "coin" && h.bounces === 0) {
              h.y = FLOOR - h.r;
              h.vy = -370;
              h.bounces++;
            } else if (h.kind === "coin") {
              h.life = 0;
              this.platforms.push({ id: "coin" + this.time, x: h.x - 40, y: 420, w: 80, h: 16, kind: "coin", life: 3.5 });
            } else {
              h.life = 0;
              this.hazards.push({ kind: "puddle", x: h.x, y: FLOOR, w: 50, r: 25, life: 3 });
            }
          }
        }
        const ph = p.crouch > 0.5 ? 96 : 142;
        if (h.kind !== "cheesepuddle" && h.life > 0 && near(p.x, h.x, h.r + 18) && h.y + h.r > p.y - ph && h.y - h.r < p.y) {
          const solid = h.kind === "coin" || h.kind === "cheeseball";
          if (this.hurt(solid ? 5 : 3, !solid, h.x) && h.kind !== "puddle") {
            if (h.kind === "cheeseball") this.emit("cheesesplat", h.x, h.y);
            h.life = 0;
          }
        }
      }
      this.hazards = this.hazards.filter((h) => h.life > 0).slice(-70);
      if (this.cloneTime > 0) {
        this.history.push({ t: this.time, x: p.x, y: p.y, py: p.py, vy: p.vy, face: p.face, state: p.state, phase: p.phase });
        while (this.history.length && this.history[0].t < this.time - 0.55) this.clone = this.history.shift();
        if (this.clone) {
          for (const e of this.enemies) {
            if (
              e.hp > 0 &&
              this.clone.vy > 0 &&
              near(e.x, this.clone.x, 50) &&
              this.clone.py <= e.y - e.h + 15 &&
              this.clone.y >= e.y - e.h
            )
              this.damageEnemy(e, 20, true);
          }
        }
      } else {
        this.clone = null;
        this.history = [];
      }
      const cycle = this.time % 17;
      this.blackout = this.zone >= 3 && this.zone <= 5 && cycle > 13 ? Math.min(1, (cycle - 13) * 2, (17 - cycle) * 2) : 0;
      const warning = this.zone >= 3 && this.zone <= 5 && cycle > 11 && cycle < 13;
      if (warning && !this.blackoutWarn) this.emit("blackout");
      this.blackoutWarn = warning;
      return this.events;
    }
  }
  root.MilkLevel2Core = { Level2, FLOOR, STRIDE, WIDTH, DAY, NAMES, build, DEATH, WIND_ZONE, doorWorldX, DOOR_TILE };
  if (typeof module !== "undefined") module.exports = root.MilkLevel2Core;
})(typeof window !== "undefined" ? window : globalThis);
