const assert = require("node:assert/strict");
const { Adventure, WIDTH } = require("../js/adventure.js");
const { Player, CONFIG } = require("../js/physics.js");
const { Extras, layout, ENEMY_SPEC } = require("../js/extras.js");
let count = 0;
const test = (name, f) => { f(); console.log("PASS", name); count++; };
const dt = 1 / 120;
function setup(x = 200, y = 520) {
  const a = new Adventure(), x4 = new Extras(a), p = new Player(x, y);
  const world = {
    width: WIDTH, height: 720,
    get solids() { return [...a.obstacles, ...x4.solids]; },
    get ceilings() { return x4.ceilings; },
    surfaces() { return [...a.surfaces, ...x4.surfaces].sort((m, n) => m.y - n.y); },
    modifiers: (pl) => x4.modifiers(pl),
  };
  const run = (n, input = {}) => { let ev = []; for (let i = 0; i < n; i++) { const inp = typeof input === "function" ? input(i) : input; p.step(dt, inp, world); ev.push(...x4.step(dt, p, inp, world)); a.step(dt, p, inp, () => {}); ev.push(...x4.post(p)); } return ev; };
  return { a, x4, p, world, run };
}
test("Golpear una caja ? desde abajo da gotas y la caja rebota", () => {
  const { x4, p, run } = setup(316);
  const b = x4.blocks.find((k) => k.x === 294);
  const ev = run(40, (i) => ({ jumpPressed: i === 0, jump: true }));
  assert(ev.some((e) => e.type === "drop"), "debería dar una gota");
  assert.equal(b.hits, 1);
  assert(p.y - CONFIG.height >= b.y + b.h - 0.5, "la cabeza no atraviesa la caja");
});
test("Ladrillo vacío se rompe en cuatro pedazos", () => {
  const { x4, run } = setup(272);
  const b = x4.blocks.find((k) => k.x === 250);
  const ev = run(40, (i) => ({ jumpPressed: i === 0, jump: true }));
  assert(b.gone);
  assert(ev.some((e) => e.type === "break"));
  assert.equal(x4.debris.length, 4);
});
test("La caja con cacao suelta el power-up y al tocarlo se activa", () => {
  const { x4, p, run } = setup(485, 435);
  run(40, (i) => ({ jumpPressed: i === 0, jump: true }));
  assert.equal(x4.items.length, 1);
  const it = x4.items[0];
  it.rise = 0; p.x = it.x; p.y = it.y; x4.collect(p);
  assert(x4.power.cacao > 0);
});
test("Pisar una bacteria la aplasta, rebota y suma combo", () => {
  const { x4, p, run } = setup();
  const e = x4.enemies.find((k) => k.type === "bacteria");
  p.x = e.x; p.y = e.y - e.h - 20; p.py = p.y; p.grounded = false; p.vy = 200; e.min = e.max = e.x;
  const ev = run(30);
  assert(e.dead && e.squash);
  assert(p.vy < 0);
  assert(ev.some((k) => k.type === "stomp"));
});
test("Tocar una bacteria de costado daña 10 y da invulnerabilidad", () => {
  const { a, x4, p, run } = setup();
  const e = x4.enemies.find((k) => k.type === "bacteria");
  e.min = e.max = e.x; p.x = e.x - 30; p.y = 520;
  run(2);
  assert.equal(a.hp, 90);
  assert(p.invuln > 0.9);
});
test("El escudo absorbe un impacto, incluso de balas originales", () => {
  const { a, x4, p } = setup();
  x4.power.shield = true;
  assert(!a.damagePlayer(p, 5));
  assert.equal(a.hp, 100);
  assert(!x4.power.shield);
});
test("Cacao duplica el daño de la leche", () => {
  const { a, x4 } = setup();
  x4.power.cacao = 5;
  a.damageEnemy(a.enemies[0], 10);
  assert.equal(a.enemies[0].hp, 80);
});
test("Pisotón sobre el enemigo 1 original resta 50 y rebota", () => {
  const { a, p, run } = setup();
  const e = a.enemies[0];
  p.x = e.x; p.y = e.y - 150; p.py = p.y; p.grounded = false; p.vy = 300;
  run(10);
  assert.equal(e.hp, 50);
  assert(p.vy < 0);
});
test("Resorte lanza mucho más alto que el salto normal", () => {
  const { x4, p, run } = setup();
  const s = x4.springs[0];
  p.x = s.x + 20; p.y = s.y - 60; p.grounded = false; p.vy = 100;
  let min = p.y, sprung = false;
  run(150, () => ({ jump: true })).forEach(() => {});
  // recorrer de nuevo midiendo
  const q = setup(); q.p.x = s.x + 20; q.p.y = s.y - 60; q.p.grounded = false; q.p.vy = 100;
  for (let i = 0; i < 150; i++) { const ev = q.p.step(dt, { jump: true }, q.world); if (ev.includes("spring")) sprung = true; min = Math.min(min, q.p.y); }
  assert(sprung);
  assert(s.y - min > 250, "altura " + (s.y - min));
});
test("Plataforma móvil transporta a la botella", () => {
  const { x4, p, run } = setup();
  const m = x4.movers[1];
  run(1);
  p.x = m.x + m.w / 2; p.y = m.y; p.grounded = true; p.ground = m;
  const off = p.x - m.x;
  run(60);
  assert(p.grounded);
  assert(Math.abs(p.x - m.x - off) < 3);
});
test("Plataforma de espuma tiembla, cae y vuelve", () => {
  const { x4, p, run } = setup();
  const f = x4.fallers[0];
  p.x = f.x + 40; p.y = f.y; p.grounded = true; p.ground = f;
  run(1); assert.equal(f.state, "shake");
  p.x = 200; p.y = 520; p.ground = null;
  run(240); assert.equal(f.state, "gone");
  run(500); assert.equal(f.state, "idle");
});
test("Cinta transportadora empuja a la botella quieta", () => {
  const { p, run } = setup(800);
  run(120);
  assert(p.x > 860);
});
test("Hielo: cuesta frenar", () => {
  const { x4 } = setup();
  const coast = (x) => {
    const p = new Player(x, 520), w = { width: WIDTH, height: 720, surfaces: () => [{ x: 0, w: WIDTH, y: 520 }], modifiers: (q) => x4.modifiers(q) };
    p.vx = 300; p.ground = w.surfaces()[0];
    for (let i = 0; i < 40; i++) p.step(dt, {}, w);
    return p.x - x;
  };
  assert(coast(9550) > coast(9200) * 2);
});
test("Selladora golpea a quien está debajo", () => {
  const { a, x4, p, run } = setup(3762);
  x4.time = 2.0;
  run(40);
  assert(a.hp < 100);
});
test("Temperatura sube al sol, baja en heladera y agria al 100%", () => {
  const { a, x4, p, run } = setup(200);
  x4.temp = 99.9; run(80);
  assert(x4.temp >= 99.9 && a.hp < 100);
  p.x = 3560; run(60);
  assert(x4.temp < 80);
});
test("Robot detecta de pie pero no agachada", () => {
  const { x4, p, run } = setup();
  const r = x4.enemies.find((e) => e.type === "robot");
  r.face = 1; r.min = r.x - 1; r.max = r.x + 999; p.x = r.x + 200;
  p.crouch = 1; run(30, { down: true });
  assert.equal(r.alarm, 0);
  run(30);
  assert(r.alarm > 0 || r.state === "alarm");
});
test("Escaneo: todo coleccionable queda al alcance de un salto", () => {
  const { a, x4 } = setup();
  const surfaces = [...a.surfaces, ...x4.surfaces];
  const reach = 142 + 126 + 10;
  for (const d of [...x4.drops, ...x4.caps]) {
    const ok = surfaces.some((s) => d.x > s.x - 70 && d.x < s.x + s.w + 70 && s.y >= d.y - 5 && s.y - d.y < reach + (x4.springs.includes(s) ? 260 : 0));
    assert(ok, "fuera de alcance: " + d.x + "," + d.y);
  }
});
test("Nada nuevo dentro de los pozos ni de la arena", () => {
  const { a, x4 } = setup();
  for (const e of x4.enemies) assert(!a.pits.some((g) => e.min < g.x + g.w && e.max > g.x) || e.type === "mosca", "enemigo " + e.type + " " + e.x);
  for (const e of x4.enemies) assert(e.max < WIDTH - 1090);
});
test("Se puede caminar debajo de cada caja sin chocarla", () => {
  const { a, x4 } = setup();
  for (const b of x4.blocks) {
    const below = [...a.surfaces, ...x4.platforms].filter((s) => s.y > b.y && b.x + b.w > s.x && b.x < s.x + s.w);
    for (const s of below) assert(s.y - (b.y + b.h) >= CONFIG.height + 2 || s.y - (b.y + b.h) < 0, "caja " + b.x + " sobre superficie " + s.y);
  }
});
test("50 gotas devuelven 25% de energía", () => {
  const { a, x4, p } = setup();
  a.hp = 50;
  for (let i = 0; i < 50; i++) x4.give("drop", 0, 0);
  assert.equal(a.hp, 75);
});
console.log(count + " pruebas V4 completas.");
