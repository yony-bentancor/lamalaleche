const assert = require("node:assert/strict");
const L = require("../js/level4-core.js");
const { Level4, FLOOR, STRIDE, ARENA_X, ARENA_RIGHT, GAPS, UPDRAFTS, UMB, DMG, BOSS, GUST_ZONE } = L;
let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log("✓ L4 " + name);
  } catch (e) {
    console.error("✗ L4 " + name);
    throw e;
  }
};
const dt = 1 / 120;
const advance = (m, s, input = {}) => {
  const out = [];
  for (let n = 0; n < Math.round(s * 120); n++) out.push(...m.step(dt, typeof input === "function" ? input(m) : input));
  return out;
};
const clean = () => {
  const m = new Level4();
  m.enemies = [];
  m.rope.state = "done";
  m.strikeIn = 1e9;
  return m;
};
/* Corre hacia el hueco, salta en el borde y mantiene SALTAR (paraguas) hasta pasar al otro lado. */
function cross(g, { time, umbrella = true } = {}) {
  const m = clean();
  if (time !== undefined) m.time = time;
  const prev = GAPS.filter((q) => q.x < g.x).pop();
  const sx = Math.max(prev ? prev.x + prev.w + 20 : 150, g.x - 260);
  m.player.reset(sx, FLOOR);
  m.safe = { x: sx, y: FLOOR };
  let jumped = false;
  for (let i = 0; i < 120 * 6; i++) {
    const p = m.player;
    const atEdge = p.grounded && p.x > g.x - 28 && p.x < g.x + 5;
    const inp = { right: true, run: true, jump: (jumped || atEdge) && p.x < g.x + g.w, jumpPressed: atEdge && !jumped };
    if (atEdge) jumped = true;
    if (!umbrella && jumped && !p.grounded && p.vy > -50) inp.jump = false;
    m.hp = 100;
    const ev = m.step(dt, inp);
    if (ev.some((e) => e.type === "fall")) return false;
    if (p.grounded && p.x > g.x + g.w + 5) return true;
    if (p.grounded && p.ground && p.ground.kind !== "floor" && p.x > g.x) jumped = false;
  }
  return false;
}

test("12 fondos, 4 banderas ordenadas fuera de los huecos y la arena al final", () => {
  const m = new Level4();
  assert.equal(m.flags.length, 4);
  assert(m.flags.every((f, i) => (i === 0 || f.x > m.flags[i - 1].x) && !L.inGap(f.x, 50)));
  assert(ARENA_X > 11 * STRIDE);
});
test("el paraguas se abre al mantener SALTAR en el aire y frena la caída", () => {
  const m = clean();
  m.player.reset(600, 200);
  m.player.grounded = false;
  let opened = false;
  for (let i = 0; i < 90; i++) if (m.step(dt, { jump: true }).some((e) => e.type === "umbopen")) opened = true;
  assert(opened && m.umb.active);
  assert(m.player.vy <= UMB.glideFall + 1);
  advance(m, 0.3, {});
  assert(!m.umb.active, "al soltar se cierra");
});
test("los 18 huecos se cruzan con el paraguas (con viento en calma)", () => {
  for (const g of GAPS) assert(cross(g), "hueco en x=" + g.x);
});
test("el primer hueco exige el paraguas o la cuerda del dirigible", () => {
  assert(!cross(GAPS[0], { umbrella: false }));
  assert(cross(GAPS[0]));
});
test("en el corredor, la ráfaga plena empuja y el paraguas igual permite cruzar", () => {
  for (const g of GAPS.filter((q) => Math.floor(q.x / STRIDE) === GUST_ZONE)) {
    assert(!cross(g, { time: 5.3, umbrella: false }), "sin paraguas no debería pasar en ráfaga " + g.x);
    assert(cross(g, { time: 5.3 }), "con paraguas sí " + g.x);
  }
});
test("agachada en el piso, la ráfaga casi no te mueve", () => {
  const push = (down) => {
    const m = clean();
    m.player.reset(GUST_ZONE * STRIDE + 110, FLOOR);
    m.safe = { x: m.player.x, y: FLOOR };
    m.time = 5.3;
    const x0 = m.player.x;
    advance(m, 1, { down });
    return x0 - m.player.x;
  };
  assert(push(false) > 40 && push(true) < push(false) * 0.4);
});
test("las corrientes ascendentes suben con el paraguas abierto", () => {
  const u = UPDRAFTS[3];
  const m = clean();
  m.player.reset(u.x + u.w / 2, 430);
  m.player.grounded = false;
  m.player.vy = 50;
  let minY = 999;
  for (let i = 0; i < 160; i++) {
    m.step(dt, { jump: true });
    minY = Math.min(minY, m.player.y);
  }
  assert(minY < 330, "subió hasta " + minY);
});
test("caer en un hueco quita 15 % y te devuelve al último apoyo seguro", () => {
  const m = clean();
  const g = GAPS[1];
  m.player.reset(g.x - 100, FLOOR);
  advance(m, 0.3, { right: true });
  m.player.reset(g.x + 40, FLOOR - 10);
  m.player.grounded = false;
  const ev = advance(m, 1);
  assert(ev.some((e) => e.type === "fall"));
  assert.equal(m.hp, 100 - DMG.fall);
  assert(m.player.x < g.x && m.player.y === FLOOR);
});
test("la cuerda del dirigible levanta a la botella y la deja en la pasarela", () => {
  const m = new Level4();
  m.enemies = [];
  m.player.reset(m.rope.x, FLOOR);
  let grabbed = false,
    dropped = false;
  for (let i = 0; i < 120 * 4; i++) {
    const p = m.player;
    const ev = m.step(dt, { jump: i < 40, jumpPressed: i === 0 });
    if (ev.some((e) => e.type === "ropegrab")) grabbed = true;
    if (ev.some((e) => e.type === "ropedrop")) dropped = true;
    if (dropped && p.grounded) break;
  }
  assert(grabbed && dropped);
  assert(m.player.x > GAPS[0].x + GAPS[0].w && m.player.y === FLOOR);
});
test("las nubes que se hunden desaparecen y vuelven", () => {
  const m = clean();
  const c = m.platforms.find((b) => b.sink);
  m.player.reset(c.x + c.w / 2, c.y);
  m.player.grounded = true;
  m.player.ground = c;
  const ev = advance(m, 2.2);
  assert(ev.some((e) => e.type === "puff"));
  advance(m, 4.5);
  assert(!c.gone && c.y === c.baseY);
});
test("los rayos avisan, dañan 12 % y no llegan debajo de un refugio", () => {
  const m = clean();
  m.strikeIn = 9999;
  const s = m.shelters[0];
  m.player.reset(s.x + s.w / 2, FLOOR);
  m.spawnStrike(m.player.x);
  advance(m, 1.3);
  assert.equal(m.hp, 100);
  m.player.reset(s.x - 200, FLOOR);
  m.spawnStrike(m.player.x);
  advance(m, 1.3);
  assert.equal(m.hp, 100 - DMG.lightning);
});
test("el paraguas abierto ataja gotas y granizo", () => {
  const m = clean();
  m.player.reset(3000, 300);
  m.player.grounded = false;
  advance(m, 0.3, { jump: true });
  m.hazards.push({ kind: "hail", x: m.player.x, y: m.player.y - 220, vx: 0, vy: 420, r: 12, life: 3 });
  const hp = m.hp;
  const ev = advance(m, 0.5, { jump: true });
  assert(ev.some((e) => e.type === "block") && m.hp === hp);
});
test("el Capitán: la leche le quita 1 % y el doble con los cañones recalentados", () => {
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  advance(m, 4);
  assert.equal(m.boss.state, "fly");
  m.bossHit(BOSS.milk);
  assert.equal(m.boss.hp, 99);
  m.boss.hot = 1;
  m.bossHit(BOSS.milk);
  assert.equal(m.boss.hp, 97);
});
test("el rayo del Capitán apunta a tu altura y se esquiva volando con el paraguas", () => {
  const run = (dodge) => {
    const m = clean();
    m.player.reset(ARENA_X + 100, FLOOR);
    advance(m, 4);
    m.boss.beamIn = 0;
    const hp0 = m.hp;
    for (let i = 0; i < 120 * 3; i++) {
      const b = m.boss,
        p = m.player;
      // Esquive: al destellar, saltar y volar hacia arriba con el paraguas (↑).
      const go = dodge && b.state === "charge" && b.t > 0.95;
      m.step(dt, { jump: go || (dodge && !p.grounded), jumpPressed: go && p.grounded, up: dodge && !p.grounded });
      if (b.state === "recover") break;
    }
    return hp0 - m.hp;
  };
  assert.equal(run(false), DMG.beam);
  assert.equal(run(true), 0);
});
test("en la arena se vuela con ↑ y la barra de vuelo se gasta y se recarga", () => {
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  advance(m, 4);
  m.boss.beamIn = 999;
  m.step(dt, { jump: true, jumpPressed: true });
  advance(m, 0.5, { jump: true });
  const y0 = m.player.y;
  advance(m, 1, { jump: true, up: true });
  assert(m.player.y < y0 - 150, "subió " + (y0 - m.player.y));
  assert(m.umb.flight < 80);
  advance(m, 3, {});
  assert(m.umb.flight > 95);
});
test("fases del Capitán: granizo en la II y rayos de tormenta en la III", () => {
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  advance(m, 4);
  m.boss.hp = 60;
  m.boss.hailIn = 0.1;
  m.boss.beamIn = 99;
  let hail = false,
    strike = false;
  for (let i = 0; i < 120 * 3; i++) {
    m.hp = 100;
    if (m.step(dt, {}).some((e) => e.type === "hail")) hail = true;
  }
  m.boss.hp = 30;
  m.strikeIn = 0.5;
  for (let i = 0; i < 120 * 5; i++) {
    m.hp = 100;
    if (m.step(dt, {}).some((e) => e.type === "strikewarn")) strike = true;
  }
  assert(hail && strike);
});
test("al vencerlo se despeja el cielo y la botella baja planeando hacia la granja", () => {
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  advance(m, 4);
  m.boss.hp = 1;
  m.bossHit(1);
  let victory = false;
  for (let i = 0; i < 120 * 20 && !m.complete; i++) if (m.step(dt, {}).some((e) => e.type === "victory")) victory = true;
  assert(victory && m.won && m.complete);
  assert(m.player.x > ARENA_RIGHT - 40 && m.player.y > FLOOR);
});
test("guardar en una boya y continuar con lo recolectado", () => {
  const m = clean();
  m.collect(m.items[0]);
  m.player.reset(m.flags[1].x, FLOOR);
  const ev = advance(m, 0.05);
  const cp = ev.find((e) => e.type === "checkpoint");
  assert(cp && cp.snapshot.version === 4);
  const again = new Level4(JSON.parse(JSON.stringify(cp.snapshot)));
  assert.equal(again.checkpointIndex, 1);
  assert(again.items[0].taken && again.rope.state === "done");
});
test("una partida automática cruza el cielo hasta la arena", () => {
  const m = new Level4();
  let stuck = 0,
    last = 0,
    hold = 0;
  for (let i = 0; i < 120 * 300; i++) {
    const p = m.player;
    stuck = Math.abs(p.x - last) < 0.3 ? stuck + dt : 0;
    last = p.x;
    const g = GAPS.find((q) => p.x > q.x - 60 && p.x < q.x + q.w);
    const gust = m.zone === GUST_ZONE && (m.windWarn || m.wind < -0.2);
    const inp = { right: !gust || !p.grounded, run: true, shoot: i % 30 === 0, down: gust && p.grounded };
    if (p.grounded && ((g && p.x > g.x - 34 && !gust) || stuck > 0.25 || (m.rope.state === "hang" && p.x > 960 && p.x < 1000))) {
      inp.jump = inp.jumpPressed = true;
      hold = g ? 1 : 0.3;
    }
    if (!p.grounded && (hold > 0 || GAPS.some((q) => p.x > q.x - 20 && p.x < q.x + q.w + 10))) inp.jump = true;
    hold -= dt;
    m.hp = 100;
    m.step(dt, inp);
    if (p.x > ARENA_X + 70) return;
    assert(stuck < 10, "trabada en x=" + Math.round(p.x));
  }
  assert.fail("no llegó a la arena");
});
console.log(`Nivel 4: ${passed} pruebas superadas`);
