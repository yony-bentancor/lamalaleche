const assert = require("node:assert/strict");
const { Level2, FLOOR, STRIDE, WIDTH, DEATH, WIND_ZONE, doorWorldX } = require("../js/level2-core.js");
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log("✓ Premium " + name); };
const advance = (m, seconds, input = {}) => { const out = []; for (let n = 0; n < Math.round(seconds * 120); n++) out.push(...m.step(1 / 120, input)); return out; };
const clean = () => { const m = new Level2(); m.enemies = []; m.hazards = []; return m; };

test("el queso ya no salta: camina siempre sobre el piso", () => {
  const m = new Level2(), e = m.enemies.find((e) => e.kind === "cheese");
  m.player.reset(e.x - 900, FLOOR); m.player.invuln = 99;
  for (let i = 0; i < 600; i++) { m.step(1 / 120, {}); assert.equal(e.y, FLOOR); }
});
test("el queso lanza bolas en arco que rebotan una vez y se deshacen", () => {
  const m = new Level2(), e = m.enemies.find((e) => e.kind === "cheese");
  m.player.reset(e.x - 300, FLOOR); m.player.invuln = 99;
  const ev = advance(m, 5);
  assert(ev.some((x) => x.type === "throw"));
  assert(ev.some((x) => x.type === "cheesebounce"));
  assert(ev.some((x) => x.type === "cheesesplat"));
});
test("una bola de queso resta 5 y no intoxica", () => {
  const m = clean();
  m.player.reset(3000, FLOOR);
  m.hazards.push({ kind: "cheeseball", x: 3000, y: FLOOR - 60, vx: 0, vy: 0, r: 12, life: 3, bounces: 0, spin: 0 });
  advance(m, 0.02);
  assert.equal(m.hp, 95);
  assert(!m.toxic);
});
test("el queso sigue blindado contra disparos y cae con un pisotón", () => {
  const m = new Level2(), e = m.enemies.find((e) => e.kind === "cheese");
  m.damageEnemy(e, 10); assert.equal(e.hp, 10);
  m.damageEnemy(e, 20, true); assert.equal(e.hp, 0);
});
test("cada enemigo tiene una derrota con duración propia (derretido más largo)", () => {
  const m = new Level2();
  for (const kind of ["yogurt", "mold", "cheese", "robot", "roach", "fly"]) {
    const e = m.enemies.find((e) => e.kind === kind);
    m.killEnemy(e, true);
    assert.equal(e.dead, DEATH[kind]);
    assert(e.deadMax >= 1.2, kind);
  }
});
test("pisotones encadenados suben el combo y los puntos", () => {
  const m = new Level2();
  const ys = m.enemies.filter((e) => e.kind === "yogurt").slice(0, 2);
  m.combo = 2;
  const before = m.score;
  m.killEnemy(ys[0], true);
  assert.equal(m.score - before, 300);
});
test("la ráfaga empuja a la botella en el aire y agacharse la frena", () => {
  const air = clean(), crouch = clean(), calm = clean();
  for (const m of [air, crouch, calm]) m.time = 6.2;
  air.player.reset(1500, FLOOR - 200); air.player.grounded = false;
  crouch.player.reset(1500, FLOOR);
  calm.player.reset(5000, FLOOR - 200); calm.player.grounded = false;
  const x0 = air.player.x, c0 = crouch.player.x, k0 = calm.player.x;
  advance(air, 0.4); advance(crouch, 0.4, { down: true }); advance(calm, 0.4);
  assert(air.player.x < x0 - 30, "el aire empuja");
  assert(Math.abs(crouch.player.x - c0) < Math.abs(air.player.x - x0) * 0.3, "agachada casi no se mueve");
  assert(Math.abs(calm.player.x - k0) < 1, "sin viento fuera de la playa de descarga");
});
test("el aviso de viento llega antes de la ráfaga", () => {
  const m = clean();
  m.player.reset(800, FLOOR);
  m.time = 4.9;
  const ev = advance(m, 0.3);
  assert(ev.some((e) => e.type === "windwarn"));
  assert.equal(m.wind, -m.windAt().strength);
});
test("las puertas de heladera quedan sobre las heladeras pintadas del fondo 10", () => {
  const m = new Level2();
  for (const d of m.doors) {
    assert(d.x > 10 * STRIDE - 1170 && d.x < 11 * STRIDE, "dentro de la escena 10");
    const cam = d.x - 550;
    assert(Math.abs(doorWorldX(d.xt, cam) - d.x) < 1, "alineada con la cámara en reposo");
  }
});
test("las esporas y monedas caen con gravedad real (no instantánea)", () => {
  const m = clean();
  m.player.reset(200, FLOOR);
  m.hazards.push({ kind: "spore", x: 3000, y: 200, vx: 0, vy: 0, r: 10, life: 3 });
  advance(m, 0.25);
  assert(m.hazards[0] && m.hazards[0].y < 260);
});
test("al terminar un poder se avisa con powerend", () => {
  const m = clean();
  m.player.reset(200, FLOOR);
  m.cacao = 0.05;
  const ev = advance(m, 0.1);
  assert(ev.some((e) => e.type === "powerend" && e.kind === "cacao"));
});
console.log("Premium: " + passed + " checks passed.");
