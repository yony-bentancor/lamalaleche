/* V3: world geometry, checkpoints and combat are independent of presentation. */
(function (root) {
  "use strict";
  const Boss = root.MilkBoss || (typeof require !== "undefined" ? require("./boss.js") : null);
  const WIDTH = 14150,
    FLOOR = 520,
    STRIDE = 1170;
  const FLAG_X = [2600, 5700, 8500, 11700];
  class Adventure {
    constructor() {
      this.platforms = [];
      for (let zone = 0; zone < 11; zone++) {
        const theme = zone < 4 ? "steel" : zone < 7 ? "wood" : zone < 10 ? "forest" : "ice";
        for (const [dx, w, y] of [
          [400, 170, 435],
          [690, 210, 350],
          [970, 140, 430],
        ])
          this.platforms.push({ x: zone * STRIDE + dx, w, y, theme });
      }
      this.platforms.push({ x: 13010, w: 150, y: 435, theme: "ice" }, { x: 13710, w: 180, y: 430, theme: "ice" });
      this.pits = [
        { x: 3270, w: 175 },
        { x: 6360, w: 180 },
        { x: 9960, w: 170 },
      ];
      this.ground = [];
      let x = 0;
      for (const p of this.pits) {
        this.ground.push({ x, w: p.x - x, y: FLOOR });
        x = p.x + p.w;
      }
      this.ground.push({ x, w: WIDTH - x, y: FLOOR });
      this.obstacles = [{ x: 1132, w: 64, y: 472, h: 48, theme: "crate" }];
      this.vents = [900, 2120, 3540, 12050, 13200];
      this.poolBeds = this.pits.map((g) => ({ x: g.x, w: g.w, y: 595, pool: true }));
      this.surfaces = [...this.platforms, ...this.obstacles, ...this.poolBeds, ...this.ground].sort((a, b) => a.y - b.y);
      this.reset(200);
    }
    reset(x = 200, saved = null) {
      this.hp = 100;
      this.intoxicated = false;
      this.elapsed = 0;
      this.flags = FLAG_X.map((x, i) => ({
        x,
        index: i,
        inside: false,
        active: saved ? (Array.isArray(saved.flags) ? saved.flags.includes(i) : i === saved.flag) : false,
      }));
      this.checkpoint = saved ? { x: saved.x, flag: saved.flag } : { x, flag: -1 };
      this.bullets = [];
      this.sparks = [];
      this.shotCD = 0;
      this.shootTime = 0;
      this.toxic = 0;
      this.arena = false;
      this.won = false;
      this.zoom = 1;
      this.enemies = [1850, 4550, 7500, 10620, 13650].map((x, i) => ({
        id: i,
        type: "shooter",
        height: 142,
        x,
        home: x,
        y: FLOOR,
        face: -1,
        v: 58,
        hp: 100,
        cooldown: 0.7,
        phase: 0,
        fire: 0,
        death: 0,
        hit: 0,
        state: "patrol",
        final: i === 4,
        min: x - (i === 4 ? 200 : 130),
        max: x + (i === 4 ? 190 : 180),
      }));
      for (const [i, x] of [1380, 5200, 9030, 12350].entries())
        this.enemies.splice(this.enemies.length - 1, 0, {
          id: 10 + i,
          type: "blocker",
          height: 112,
          x,
          home: x,
          y: FLOOR,
          face: -1,
          v: 55,
          hp: 100,
          cooldown: 0,
          phase: 0,
          fire: 0,
          death: 0,
          hit: 0,
          state: "patrol",
          final: false,
          min: x - 105,
          max: x + 105,
        });
      Boss.configure(this.enemies.find(e => e.final));
    }
    crackStage() {
      return this.hp <= 0 ? 4 : this.hp <= 20 ? 3 : this.hp <= 40 ? 2 : this.hp <= 60 ? 1 : 0;
    }
    damagePlayer(p, amount) {
      if (p.dead || p.invuln > 0) return false;
      this.hp = Math.max(0, this.hp - amount);
      if (!this.hp) p.kill();
      else {
        p.damage();
        p.invuln = 0.32;
      }
      return true;
    }
    damageEnemy(e, amount) {
      if (e.hp <= 0) return false;
      e.hp = Math.max(0, e.hp - amount);
      e.hit = 0.13;
      if (!e.hp) {
        e.state = "dead";
        e.ray = null;
        e.death = 0;
      }
      return true;
    }
    respawn(p) {
      p.reset(this.checkpoint.x, FLOOR);
      p.invuln = 1.5;
      this.hp = 100;
      this.intoxicated = false;
      this.toxic = 0;
      this.bullets = [];
      this.arena = false;
      this.zoom = 1;
      for (const e of this.enemies) {
        if (e.hp > 0) {
          e.x = e.home;
          e.cooldown = 1.1;
          e.state = "patrol";
          e.fire = 0;
          if (e.final) Boss.configure(e);
        }
      }
    }
    step(dt, p, input, notify) {
      let result = [];
      this.elapsed += dt;
      if (this.won) { this.arena = false; return result; }
      this.shootTime = Math.max(0, this.shootTime - dt);
      this.shotCD = Math.max(0, this.shotCD - dt);
      this.toxic = Math.max(0, this.toxic - dt);
      this.sparks = this.sparks.filter((s) => (s.life -= dt) > 0);
      for (const s of this.sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 180 * dt;
      }
      if (!p.dead) {
        for (const f of this.flags) {
          const inside = Math.abs(p.x - f.x) < 40 && p.grounded && Math.abs(p.y - FLOOR) < 3;
          if (inside && !f.inside) {
            const needs = this.intoxicated || this.hp < 100 || !f.active;
            f.active = true;
            this.intoxicated = false;
            this.hp = 100;
            if (f.index > this.checkpoint.flag) this.checkpoint = { x: f.x, flag: f.index };
            if (needs) notify("Recarga " + (f.index + 1) + "/4 · energía completa · leche sana");
            result.push("checkpoint");
          }
          f.inside = inside;
        }

        if (p.x > WIDTH - 1090 && !this.arena) {
          this.arena = true;
          notify("Cámara de contención · derrotá al guardián");
          result.push("arena");
        }
        if (this.arena && this.won && p.x < WIDTH - 1090) this.arena = false;
        if (this.arena && !this.won) p.x = Math.max(WIDTH - 1090 + 25, Math.min(WIDTH - 95, p.x));
        if (input.shoot && this.shotCD <= 0) {
          this.shotCD = 0.28;
          this.shootTime = 0.24;
          this.bullets.push({
            owner: "milk",
            toxic: this.intoxicated,
            cacao: !!this.shotPower?.(),
            x: p.x + p.face * 33,
            y: p.y - (p.crouch > 0.5 ? 48 : 82),
            vx: p.face * 820,
            vy: 0,
            life: 1.5,
            r: 8,
          });
          result.push("milkshot");
        }
        const pit = this.pits.find((g) => p.x > g.x && p.x < g.x + g.w && p.y >= 580);
        if (pit && !this.intoxicated) {
          this.intoxicated = true;
          this.toxic = 0.8;
          this.splash(p.x, 580, "#a4ff49", 24);
          notify("Intoxicada · saltá para salir · una bandera te cura");
          result.push("toxic");
        }
        // Pool walls prevent walking through the bank below ground level; jumping clears them.
        if (p.y > 526) {
          for (const g of this.pits) {
            if (p.px >= g.x && p.px <= g.x + g.w) {
              if (p.x < g.x + 21) {
                p.x = g.x + 21;
                p.vx = 0;
              }
              if (p.x > g.x + g.w - 21) {
                p.x = g.x + g.w - 21;
                p.vx = 0;
              }
            }
          }
        }
      }
      for (const e of this.enemies) {
        e.hit = Math.max(0, e.hit - dt);
        e.fire = Math.max(0, e.fire - dt);
        if (e.hp <= 0) {
          e.death += dt;
          continue;
        }
        if (e.final) { Boss.step(e, dt, p, this, result); continue; }
        if (p.dead) continue;
        if (e.type === "blocker") {
          const dx = p.x - e.x,
            near = Math.abs(dx) < 170 && p.y > e.y - e.height;
          e.state = near ? "block" : "patrol";
          if (near) e.face = dx < 0 ? -1 : 1;
          else {
            e.x += e.face * e.v * dt;
            if (e.x < e.min) {
              e.x = e.min;
              e.face = 1;
            }
            if (e.x > e.max) {
              e.x = e.max;
              e.face = -1;
            }
            e.phase += dt * 7;
          }
          const separation = 43;
          if (Math.abs(p.x - e.x) < separation && p.y > e.y - e.height + 3 && p.y - 140 < e.y) {
            const side = p.px < e.x ? -1 : 1;
            p.x = e.x + side * separation;
            if (p.vx * side < 0) p.vx = 0;
          }
          continue;
        }
        const dx = p.x - e.x,
          dy = p.y - 75 - (e.y - 80);
        const sees = Math.abs(dx) < 610 && Math.abs(dy) < 270 && (dx * e.face > -65 || e.state === "attack");
        e.cooldown -= dt;
        if (sees) {
          e.state = "attack";
          e.face = dx < 0 ? -1 : 1;
          if (e.cooldown <= 0) {
            e.cooldown = 1.05;
            e.fire = 0.38;
            const length = Math.hypot(dx, dy) || 1;
            this.bullets.push({
              owner: "enemy",
              x: e.x + e.face * 42,
              y: e.y - 85,
              vx: (dx / length) * 480,
              vy: (dy / length) * 480,
              life: 2.4,
              r: 6,
            });
            result.push("enemyshot");
          }
        } else {
          e.state = "patrol";
          e.x += e.face * e.v * dt;
          if (e.x < e.min) {
            e.x = e.min;
            e.face = 1;
          }
          if (e.x > e.max) {
            e.x = e.max;
            e.face = -1;
          }
          e.phase += dt * 8;
        }
      }
      for (const b of this.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if ([...this.platforms, ...this.obstacles].some((s) => b.x > s.x && b.x < s.x + s.w && b.y >= s.y && b.y <= s.y + (s.h || 25))) {
          b.life = 0;
          this.splash(b.x, b.y, b.owner === "milk" ? "#fff4d6" : "#ffb164", 4);
          continue;
        }
        if (b.owner === "milk") {
          for (const e of this.enemies) {
            if (e.hp > 0 && Math.abs(b.x - e.x) < (e.halfWidth || 30) + b.r && b.y > e.y - e.height && b.y < e.y) {
              this.damageEnemy(e, b.cacao ? 20 : 10, true);
              this.splash(b.x, b.y, "#fff4d6", 8);
              b.life = 0;
              result.push(e.hp <= 0 ? "enemydeath" : "enemyhit");
              break;
            }
          }
        } else if (!p.dead && Math.abs(b.x - p.x) < 21 + b.r && b.y > p.y - (p.crouch > 0.5 ? 90 : 140) && b.y < p.y) {
          if (this.damagePlayer(p, 5)) {
            this.splash(b.x, b.y, "#b3e8ff", 7);
            result.push("playerhit");
          }
          b.life = 0;
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0 && b.x > 0 && b.x < WIDTH);
      const final = this.enemies[this.enemies.length - 1];
      const target = this.arena ? 1.18 : 1;
      this.zoom += (target - this.zoom) * (1 - Math.exp(-dt * 2));
      if (this.arena && final.hp <= 0 && final.death > 1.2 && !this.won) {
        this.won = true;
        this.bullets = [];
        this.enemies.forEach(e => { e.ray = null; });
        result.push("victory");
      }
      return result;
    }
    splash(x, y, color, n) {
      for (let i = 0; i < n; i++)
        this.sparks.push({ x, y, color, vx: (Math.random() - 0.5) * 170, vy: -Math.random() * 130, life: 0.25 + Math.random() * 0.4 });
    }
  }
  root.MilkAdventure = { Adventure, FLAG_X, WIDTH };
  if (typeof module !== "undefined") module.exports = root.MilkAdventure;
})(typeof window !== "undefined" ? window : globalThis);
