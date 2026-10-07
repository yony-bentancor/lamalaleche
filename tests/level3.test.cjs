const assert = require("node:assert/strict");
const { Level3, FLOOR, STRIDE, WIDTH, ARENA_X, COW, POWER_TIME, CHASES, DAWN_SECONDS, TRUCK_STOP } = require("../js/level3-core.js");
let passed = 0;
const test = (name, fn) => {
  try {
    fn();
    passed++;
    console.log("✓ L3 " + name);
  } catch (e) {
    console.error("✗ L3 " + name);
    throw e;
  }
};
const dt = 1 / 120;
const advance = (m, seconds, input = {}) => {
  const out = [];
  for (let n = 0; n < Math.round(seconds * 120); n++) out.push(...m.step(dt, typeof input === "function" ? input(m) : input));
  return out;
};
const clean = () => {
  const m = new Level3();
  m.enemies = [];
  m.vents = [];
  m.chases.forEach((c) => (c.done = true));
  return m;
};
/* Arena lista: la vaca despierta y la botella espera a un costado. */
function arena() {
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  advance(m, 0.05);
  assert.equal(m.boss.state, "intro");
  return m;
}

test("12 barrios, 4 banderas ordenadas y una azotea final", () => {
  const m = new Level3();
  assert.equal(m.flags.length, 4);
  assert(m.flags.every((f, i) => i === 0 || f.x > m.flags[i - 1].x));
  assert(ARENA_X > 11 * STRIDE && ARENA_X < WIDTH);
});
test("la vaca mide 5 botellas (142 px × 5)", () => assert.equal(COW.height, 142 * 5));
test("reglas pedidas: salta cada 15 s, dispara cada 30 s, −5 %, −10 % y la leche le quita 2 %", () => {
  assert.equal(COW.jumpEvery, 15);
  assert.equal(COW.shootEvery, 30);
  assert.equal(COW.jumpDamage, 5);
  assert.equal(COW.shotDamage, 10);
  assert.equal(COW.milkDamage, 2);
});
test("las 33 plataformas de los barrios se alcanzan con el mismo motor de salto", () => {
  for (let z = 0; z < 11; z++) {
    const m = clean();
    const stairs = m.platforms.filter((b) => b.x >= z * STRIDE + 380 && b.x <= z * STRIDE + 920 && [425, 330, 235].includes(b.y)).sort((a, b) => a.x - b.x);
    assert.equal(stairs.length, 3);
    let previous = { x: z * STRIDE + 180, y: FLOOR, w: 160 };
    for (const b of stairs) {
      m.time = 0.05; // neón encendido durante la prueba
      if (b.kind === "neon") b.offset = 0;
      m.player.reset(previous.x + previous.w - 12, previous.y);
      m.player.vx = 235;
      let landed = false;
      for (let n = 0; n < 150; n++) {
        m.time = 0.05;
        m.step(dt, { right: m.player.x < b.x + b.w * 0.65, jump: true, jumpPressed: n === 0 });
        if (m.player.grounded && m.player.ground?.id === b.id) {
          landed = true;
          break;
        }
      }
      assert(landed, `zona ${z + 1}, ${b.kind} x=${b.x}`);
      previous = b;
    }
  }
});
test("las plataformas de neón se apagan 1,2 s cada 4 y avisan antes", () => {
  const m = clean(),
    n = m.platforms.find((b) => b.kind === "neon");
  let off = 0,
    warn = 0;
  for (let t = 0; t < 4; t += 0.01) {
    if (!m.neonOn(n, t)) off += 0.01;
    if (m.neonWarn(n, t)) warn += 0.01;
  }
  assert(Math.abs(off - 1.2) < 0.03 && Math.abs(warn - 0.6) < 0.03);
});
test("la vaca está blindada al despertar hasta que se abre el escudo, y la leche le quita 2 %", () => {
  const m = arena();
  assert.equal(m.bossHit(2), false);
  advance(m, 4);
  assert(m.boss.vuln > 0);
  assert.equal(m.bossHit(COW.milkDamage), true);
  assert.equal(m.boss.hp, 98);
});
test("el escudo se cierra y los disparos rebotan sin daño", () => {
  const m = arena();
  advance(m, 4 + COW.window + 0.2);
  assert.equal(m.boss.vuln, 0);
  const hp = m.boss.hp;
  m.boss.x = m.player.x + 400;
  m.player.face = 1;
  const ev = advance(m, 0.8, { shoot: true });
  assert.equal(m.boss.hp, hp);
  assert(ev.some((e) => e.type === "armor"));
});
test("la chocolatada duplica el daño a la vaca (4 %)", () => {
  const m = arena();
  advance(m, 4);
  m.power.cacao = POWER_TIME.cacao;
  m.player.reset(m.boss.x - 520, FLOOR);
  m.player.face = 1;
  m.step(dt, { shoot: true });
  advance(m, 0.9);
  assert.equal(m.boss.hp, 96);
});
test("cada 15 s la vaca salta: si la botella está en el piso pierde 5 %", () => {
  const m = arena();
  advance(m, 3.95);
  let landed = null;
  for (let i = 0; i < 120 * 25 && !landed; i++) {
    m.hp = 100;
    const ev = m.step(dt, {});
    landed = ev.find((e) => e.type === "cowland" && !e.intro);
  }
  assert(landed, "la vaca no aterrizó");
  assert.equal(m.hp, 95);
});
test("estar en el aire cuando la vaca aterriza evita el daño", () => {
  const m = arena();
  m.player.reset(ARENA_X + 20, FLOOR);
  advance(m, 3.95);
  m.boss.jumpIn = 0.01;
  let dmg = false,
    landed = false;
  for (let i = 0; i < 120 * 4; i++) {
    const b = m.boss,
      p = m.player;
    const jump = b.state === "fall" && p.grounded;
    const hp = m.hp;
    const ev = m.step(dt, { jump: true, jumpPressed: jump });
    if (ev.some((e) => e.type === "cowland")) landed = true;
    if (ev.some((e) => e.type === "cowland") && m.hp < hp) dmg = true;
    if (b.state === "idle" && i > 200) break;
  }
  assert(landed && !dmg);
});
test("cada 30 s la vaca dispara una bola de energía que quita 10 %", () => {
  const m = arena();
  advance(m, 3.95);
  m.boss.jumpIn = 999;
  let hit = false,
    fired = false;
  for (let i = 0; i < 120 * 35 && !hit; i++) {
    const hp = m.hp;
    const ev = m.step(dt, {});
    if (ev.some((e) => e.type === "cowfire")) fired = true;
    if (fired && m.hp === hp - 10) hit = true;
    if (fired && m.hp < hp && !hit) assert.fail("daño distinto de 10 %: " + (hp - m.hp));
  }
  assert(fired && hit);
});
test("la pelea termina y aparece el dirigible que lleva al nivel 4", () => {
  const m = arena();
  advance(m, 4);
  m.boss.hp = 2;
  m.bossHit(2);
  assert.equal(m.boss.state, "dead");
  let airship = false;
  for (let i = 0; i < 120 * 25 && !m.complete; i++) if (m.step(dt, {}).some((e) => e.type === "airship")) airship = true;
  assert(m.won && airship && m.complete);
});
test("el gato persigue en el callejón y desaparece al escapar", () => {
  const m = new Level3();
  m.enemies = [];
  m.vents = [];
  m.player.reset(CHASES[0].x0 + 20, FLOOR);
  const ev = advance(m, 0.05);
  assert(ev.some((e) => e.type === "catchase") && m.cat.active);
  m.player.reset(CHASES[0].x1 + 10, FLOOR);
  const ev2 = advance(m, 0.05);
  assert(ev2.some((e) => e.type === "catgone"));
  assert(m.chases[0].done);
});
test("la galletita da doble salto y la pajita un impulso en el aire", () => {
  const m = clean();
  m.player.reset(400, FLOOR);
  m.power.cookie = 10;
  m.step(dt, { jump: true, jumpPressed: true });
  advance(m, 0.25, { jump: true });
  const ev = m.step(dt, { jump: true, jumpPressed: true });
  assert(ev.some((e) => e.type === "doublejump"));
  const m2 = clean();
  m2.player.reset(400, FLOOR);
  m2.power.straw = 10;
  m2.step(dt, { jump: true, jumpPressed: true });
  advance(m2, 0.15, { jump: true });
  const x0 = m2.player.x;
  const ev2 = m2.step(dt, { run: true });
  advance(m2, 0.2);
  assert(ev2.some((e) => e.type === "dash") && m2.player.x - x0 > 120);
});
test("el barista hace un cortado: más lenta y se limpia con la recarga", () => {
  const m = new Level3();
  const b = m.enemies.find((e) => e.kind === "barista");
  m.enemies = [b];
  m.player.reset(b.x - 60, FLOOR);
  b.face = -1;
  advance(m, 0.5);
  assert(m.power.cortado > 0);
  m.collect({ kind: "refill" });
  assert.equal(m.power.cortado, 0);
});
test("la tapa reflectora espanta ratas: no salen de la alcantarilla", () => {
  const m = new Level3(),
    r = m.enemies.find((e) => e.kind === "rat");
  m.enemies = [r];
  m.power.reflector = 10;
  m.player.reset(r.x - 120, FLOOR);
  advance(m, 0.5);
  assert.equal(r.state, "hidden");
});
test("el reloj del amanecer llega a 06:00 a los 5 minutos y da bonus si llegás antes", () => {
  assert.equal(DAWN_SECONDS, 300);
  const m = clean();
  m.player.reset(ARENA_X + 100, FLOOR);
  const ev = advance(m, 0.05);
  assert(ev.some((e) => e.type === "points" && e.value === 3000));
});
test("guardar en bandera y reaparecer con lo recolectado", () => {
  const m = clean();
  m.collect(m.items[0]);
  m.player.reset(m.flags[1].x, FLOOR);
  const ev = advance(m, 0.05);
  const cp = ev.find((e) => e.type === "checkpoint");
  assert(cp && cp.snapshot.version === 3);
  const again = new Level3(JSON.parse(JSON.stringify(cp.snapshot)));
  assert.equal(again.checkpointIndex, 1);
  assert(again.items[0].taken);
  assert(Math.abs(again.player.x - (m.flags[1].x + 45)) < 1);
});
test("una partida automática cruza la ciudad sin quedarse trabada", () => {
  const m = new Level3();
  let stuck = 0,
    last = 0,
    jt = 0;
  for (let i = 0; i < 120 * 300; i++) {
    const p = m.player;
    stuck = Math.abs(p.x - last) < 0.3 ? stuck + dt : 0;
    last = p.x;
    const inp = { right: true, run: true, shoot: i % 40 === 0, jump: jt > 0, jumpPressed: false };
    if (stuck > 0.2 && p.grounded) {
      inp.jumpPressed = inp.jump = true;
      jt = 0.35;
    }
    jt -= dt;
    m.hp = 100;
    m.step(dt, inp);
    if (p.x > ARENA_X + 50) return;
    assert(stuck < 8, "trabada en x=" + Math.round(p.x));
  }
  assert.fail("no llegó a la azotea");
});
console.log(`Nivel 3: ${passed} pruebas superadas`);
