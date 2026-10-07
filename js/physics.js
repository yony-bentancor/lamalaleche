/* Deterministic 120 Hz character motor. Units: logical pixels and seconds. */
(function (root) {
  "use strict";
  const CONFIG = {
    walk: 235,
    run: 420,
    groundAccel: 1700,
    airAccel: 820,
    brake: 1550,
    friction: 1450,
    crouchFriction: 540,
    jump: 650,
    riseGravity: 1680,
    fallGravity: 2450,
    maxFall: 1050,
    coyote: 0.105,
    buffer: 0.13,
    jumpCut: 0.44,
    width: 42,
    height: 142,
    crouchHeight: 96,
  };
  const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  class Player {
    constructor(x = 180, y = 520) {
      this.reset(x, y);
    }
    reset(x, y) {
      Object.assign(this, {
        x,
        y,
        px: x,
        py: y,
        vx: 0,
        vy: 0,
        face: 1,
        grounded: true,
        coyote: 0,
        buffer: 0,
        crouch: 0,
        skid: false,
        land: 0,
        invuln: 0,
        death: 0,
        dead: false,
        phase: 0,
        state: "idle",
        jumpHeld: false,
        ground: null,
        bumped: null,
        boost: 0,
      });
    }
    step(dt, input, world) {
      const C = CONFIG;
      this.px = this.x;
      this.py = this.y;
      let events = [];
      this.land = Math.max(0, this.land - dt);
      this.invuln = Math.max(0, this.invuln - dt);
      if (this.dead) {
        this.death += dt;
        this.state = "dead";
        return events;
      }
      // V4: moving platforms carry the bottle, belts push it, ice and milk puddles reduce grip.
      if (this.grounded && this.ground && this.ground.moving) {
        this.x += this.ground.dx || 0;
        this.y = this.ground.y;
      }
      const mods = (world.modifiers && world.modifiers(this)) || {};
      if (this.grounded && mods.belt) this.x += mods.belt * dt;
      const grip = this.grounded && mods.slip ? mods.slip : 1;
      this.bumped = null;
      this.coyote = this.grounded ? C.coyote : Math.max(0, this.coyote - dt);
      this.buffer = input.jumpPressed ? C.buffer : Math.max(0, this.buffer - dt);
      const wasGround = this.grounded,
        dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      this.crouch = approach(this.crouch, input.down && this.grounded ? 1 : 0, dt * 10);
      this.skid = !!(
        wasGround &&
        !input.down &&
        ((dir && Math.abs(this.vx) > 110 && Math.sign(this.vx) !== dir) || (!dir && Math.abs(this.vx) > 180))
      );
      let target = dir * (input.run ? C.run : C.walk) * (input.speed || 1),
        acc = wasGround ? C.groundAccel * grip : C.airAccel;
      if (input.down && wasGround) {
        target = 0;
        acc = C.crouchFriction * grip;
      } else if (!dir) {
        target = 0;
        acc = wasGround ? C.friction * grip * grip : C.airAccel * 0.12;
      } else if (this.skid) acc = C.brake * grip;
      if (this.skid && this.state !== "skid") events.push("skid");
      if (input.run && dir && wasGround && Math.abs(this.vx) < 30 && !input.down) events.push("start");
      this.vx = approach(this.vx, target, acc * dt);
      if (dir && !this.skid && Math.abs(this.vx) > 10) this.face = dir;
      if (this.buffer > 0 && this.coyote > 0) {
        this.vy = -C.jump;
        this.grounded = false;
        this.coyote = 0;
        this.buffer = 0;
        this.crouch = 0;
        this.jumpHeld = !!input.jump;
        events.push("jump");
      }
      if (!input.jump && this.jumpHeld && this.vy < 0) {
        this.vy *= C.jumpCut;
        this.jumpHeld = false;
      }
      this.x = Math.max(C.width / 2, Math.min(world.width - C.width / 2, this.x + this.vx * dt));
      for (const b of world.solids || []) {
        const ph = this.crouch > 0.5 ? C.crouchHeight : C.height;
        if (this.y > b.y + 2 && this.y - ph < b.y + b.h && this.x + C.width / 2 > b.x && this.x - C.width / 2 < b.x + b.w) {
          if (this.px <= b.x + b.w / 2) this.x = b.x - C.width / 2;
          else this.x = b.x + b.w + C.width / 2;
          this.vx = 0;
        }
      }
      if (this.x <= C.width / 2 || this.x >= world.width - C.width / 2) this.vx = 0;
      const oldY = this.y,
        fallSpeed = this.vy;
      this.vy = Math.min(C.maxFall, this.vy + (this.vy < 0 ? C.riseGravity : C.fallGravity) * dt);
      this.y += this.vy * dt;
      // V4: blocks hit from below. Small edge contacts slide around the corner instead of stopping the jump.
      if (this.vy < 0 && world.ceilings) {
        const ph = this.crouch > 0.5 ? C.crouchHeight : C.height,
          hw = C.width / 2;
        let best = null,
          bestOverlap = 0;
        for (const c of world.ceilings) {
          if (c.gone) continue;
          const bottom = c.y + c.h;
          if (oldY - ph >= bottom - 1 && this.y - ph < bottom) {
            const overlap = Math.min(this.x + hw, c.x + c.w) - Math.max(this.x - hw, c.x);
            if (overlap > bestOverlap) {
              best = c;
              bestOverlap = overlap;
            }
          }
        }
        if (best) {
          if (bestOverlap < 11) this.x = this.x < best.x + best.w / 2 ? best.x - hw : best.x + best.w + hw;
          else {
            this.y = best.y + best.h + ph;
            this.vy = 60;
            this.jumpHeld = false;
            this.bumped = best;
            events.push("bump");
          }
        }
      }
      this.grounded = false;
      this.ground = null;
      const surfaces = world.surfaces(this.x);
      for (const s of surfaces) {
        if (this.x + C.width / 2 > s.x && this.x - C.width / 2 < s.x + s.w && this.vy >= 0 && oldY <= s.y + 2 && this.y >= s.y) {
          this.y = s.y;
          this.vy = 0;
          this.grounded = true;
          this.ground = s;
          break;
        }
      }
      if (this.grounded && this.ground && this.ground.spring) {
        // V4: springs launch higher when jump is held.
        const s = this.ground;
        s.boing = 0.35;
        this.vy = -s.spring * (input.jump ? 1.14 : 1);
        this.grounded = false;
        this.ground = null;
        this.coyote = 0;
        this.buffer = 0;
        this.jumpHeld = false;
        this.land = 0;
        events.push("spring");
      } else if (this.grounded && !wasGround) {
        this.land = 0.15;
        events.push(fallSpeed > 820 ? "hardland" : "land");
        if (this.buffer > 0) {
          this.vy = -C.jump;
          this.grounded = false;
          this.buffer = 0;
          this.coyote = 0;
          this.jumpHeld = !!input.jump;
          events.push("jump");
        }
      }
      if (this.y > world.height + 400) events.push("respawn");
      this.phase += (Math.abs(this.vx) * dt) / 23;
      this.state = !this.grounded
        ? this.vy < -70
          ? "rise"
          : this.vy > 70
            ? "fall"
            : "apex"
        : this.land > 0
          ? "land"
          : this.crouch > 0.1
            ? "crouch"
            : this.skid
              ? "skid"
              : Math.abs(this.vx) > 280
                ? "run"
                : Math.abs(this.vx) > 8
                  ? "walk"
                  : "idle";
      return events;
    }
    damage() {
      if (this.dead || this.invuln > 0) return false;
      this.invuln = 2;
      this.vx = -this.face * 170;
      this.vy = -220;
      this.grounded = false;
      return true;
    }
    kill() {
      this.dead = true;
      this.death = 0;
      this.vx = this.vy = 0;
      this.state = "dead";
    }
  }
  root.MilkPhysics = { Player, CONFIG, approach };
  if (typeof module !== "undefined") module.exports = root.MilkPhysics;
})(typeof window !== "undefined" ? window : globalThis);
