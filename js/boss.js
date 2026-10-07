/* V5: telegraphed boss attack; collision follows the visible ray segment. */
(function (root) {
  "use strict";
  function segmentBox(x0, y0, x1, y1, box, pad = 0) {
    let lo = 0,
      hi = 1;
    for (const [origin, delta, min, max] of [
      [x0, x1 - x0, box.x - pad, box.x + box.w + pad],
      [y0, y1 - y0, box.y - pad, box.y + box.h + pad],
    ]) {
      if (Math.abs(delta) < 1e-9) {
        if (origin < min || origin > max) return null;
        continue;
      }
      let a = (min - origin) / delta,
        b = (max - origin) / delta;
      if (a > b) [a, b] = [b, a];
      lo = Math.max(lo, a);
      hi = Math.min(hi, b);
      if (lo > hi) return null;
    }
    return lo;
  }
  function configure(e) {
    Object.assign(e, { height: 284, halfWidth: 52, state: "patrol", bossPhase: "patrol", bossClock: 0, ray: null, cooldown: 1.1 });
  }
  function step(e, dt, p, a, result) {
    if (e.hp <= 0) {
      e.ray = null;
      return;
    }
    if (!a.arena || p.dead || a.won) {
      e.ray = null;
      e.bossPhase = "patrol";
      e.bossClock = 0;
      return;
    }
    e.bossClock += dt;
    if (e.bossPhase === "patrol") {
      e.state = "patrol";
      e.face = p.x < e.x ? -1 : 1;
      e.x += e.face * 35 * dt;
      e.x = Math.max(e.min, Math.min(e.max, e.x));
      e.phase += dt * 5;
      if (e.bossClock >= 1.1) {
        e.bossPhase = "charge";
        e.bossClock = 0;
        e.state = "charge";
        const x = e.x + e.face * 105,
          y = e.y - 151,
          dx = p.x - x,
          dy = p.y - (p.crouch > 0.5 ? 45 : 75) - y,
          len = Math.hypot(dx, dy) || 1;
        e.ray = { x, y, ex: x + (dx / len) * 1500, ey: y + (dy / len) * 1500, hit: false };
        result.push("bosscharge");
      }
    } else if (e.bossPhase === "charge") {
      e.state = "charge";
      if (e.bossClock >= 0.95) {
        e.bossPhase = "beam";
        e.bossClock = 0;
        e.state = "beam";
        result.push("bossbeam");
      }
    } else if (e.bossPhase === "beam") {
      e.state = "beam";
      const r = e.ray,
        ph = p.crouch > 0.5 ? 96 : 142;
      if (r && !r.hit && segmentBox(r.x, r.y, r.ex, r.ey, { x: p.x - 21, y: p.y - ph, w: 42, h: ph }, 10) !== null) {
        r.hit = true;
        if (a.damagePlayer(p, 5)) result.push("playerhit");
      }
      if (e.bossClock >= 0.28) {
        e.bossPhase = "recover";
        e.bossClock = 0;
        e.ray = null;
        e.state = "recover";
      }
    } else if (e.bossClock >= 1.15) {
      e.bossPhase = "patrol";
      e.bossClock = 0;
    }
  }
  root.MilkBoss = { configure, step, segmentBox };
  if (typeof module !== "undefined") module.exports = root.MilkBoss;
})(typeof window !== "undefined" ? window : globalThis);
