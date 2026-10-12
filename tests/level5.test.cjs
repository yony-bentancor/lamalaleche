/* V12 · Nivel 5 «Bajo la superficie»: física bajo el agua, enemigos, torbellino y Tragabarcos. */
const assert = require("node:assert/strict");
const C = require("../js/level5-core.js");
const { Level5, W, floorAt, CHASM, ARENA_X, ARENA_RIGHT, EXIT_X, FLAGS } = C;
let passed = 0;
const DT = 1 / 120;
const none = () => ({ left: false, right: false, up: false, down: false, run: false, jump: false, jumpPressed: false, shoot: false, whirlPressed: false });
function run(m, secs, input = {}, each) {
  const ev = [];
  for (let i = 0; i < secs / DT; i++) {
    const inp = { ...none(), ...(typeof input === "function" ? input(m, i) : input) };
    ev.push(...m.step(DT, inp));
    if (each) each(m, i);
  }
  return ev;
}
function test(name, fn) {
  fn();
  passed++;
  console.log("✓ L5 " + name);
}
function only(m, ...kinds) {
  // Deja solo los enemigos pedidos (para aislar cada prueba).
  for (const e of m.enemies) if (!kinds.includes(e.kind)) e.gone = true;
}

test("hay piso en los 12 fondos salvo el abismo", () => {
  for (let x = 10; x < 12 * W; x += 40) {
    const f = floorAt(x);
    if (x > CHASM.x + 2 && x < CHASM.x + CHASM.w - 2) assert.equal(f, null, "abismo en " + x);
    else assert.ok(f > 300 && f < 560, "piso en " + x);
  }
});

test("bajo el agua se cae lento y cada salto en el aire es una brazada", () => {
  const m = new Level5();
  only(m);
  run(m, 0.05, { jumpPressed: true });
  run(m, 0.6);
  const vyFree = m.player.vy;
  assert.ok(vyFree <= C.PHY.sinkMax + 1, "la caída está limitada por el agua");
  const y0 = m.player.y;
  const ev = run(m, 0.02, { jumpPressed: true });
  assert.ok(ev.some((e) => e.type === "stroke"));
  run(m, 0.3);
  assert.ok(m.player.y < y0, "la brazada sube");
});

test("el escalón alto del abismo se sube nadando, no caminando", () => {
  const m = new Level5();
  only(m);
  m.player.x = 4 * W - 160;
  m.player.y = floorAt(m.player.x);
  run(m, 2, { right: true });
  assert.ok(m.player.x < 4 * W + 5, "la pared frena");
  run(m, 0.9, (mm, i) => ({ right: true, jumpPressed: i % 30 === 0 }));
  run(m, 1.5);
  assert.ok(m.player.x > 4 * W + 20 && m.player.grounded && m.player.y < 390, "subió a la orilla nadando");
});

test("caer al fondo del abismo quita 15 % y te devuelve a la orilla", () => {
  const m = new Level5();
  only(m);
  m.player.x = CHASM.x + 300;
  m.player.y = 500;
  m.player.grounded = false;
  const ev = run(m, 4, { down: true });
  assert.ok(ev.some((e) => e.type === "recover"));
  assert.equal(m.hp, 85);
  assert.ok(!C.inChasm(m.player.x));
});

test("el torbellino se usa una sola vez por nivel, es invencible y arrasa enemigos", () => {
  const m = new Level5();
  only(m, "medusa");
  const med = m.enemies.find((e) => e.kind === "medusa" && !e.gone);
  m.player.x = med.x - 200;
  let ev = run(m, 0.02, { whirlPressed: true });
  assert.ok(ev.some((e) => e.type === "whirlOn"));
  assert.equal(m.whirl.charges, 0);
  m.hp = 50;
  ev = run(m, 3, { right: true, up: true });
  assert.equal(med.alive, false, "la medusa cayó");
  assert.equal(m.hp, 50, "sin daño durante el torbellino");
  run(m, 2);
  ev = run(m, 0.02, { whirlPressed: true });
  assert.ok(ev.some((e) => e.type === "whirlEmpty"));
  assert.equal(m.whirl.t, 0);
});

test("aplastar una medusa la elimina; al cangrejo lo esconde en la tetera", () => {
  const m = new Level5();
  only(m, "medusa", "cangrejo");
  const med = m.enemies.find((e) => e.kind === "medusa" && !e.gone);
  run(m, 0.01);
  m.player.x = med.x;
  m.player.y = med.y - 75;
  m.player.vy = 200;
  m.player.grounded = false;
  run(m, 0.3);
  assert.equal(med.alive, false);
  const crab = m.enemies.find((e) => e.kind === "cangrejo" && !e.gone);
  m.player.x = crab.x;
  m.player.y = crab.y - 95;
  m.player.vy = 200;
  m.player.grounded = false;
  run(m, 0.2);
  assert.equal(crab.state, "hide");
  assert.ok(crab.alive);
  assert.ok(m.shielded(crab), "escondido la leche rebota");
});

test("la almeja se cierra de golpe si pasás por encima", () => {
  const m = new Level5();
  only(m, "almeja");
  const a = m.enemies.find((e) => e.kind === "almeja" && !e.gone);
  a.t = 0;
  m.flag = 3; // sin banderas en el medio
  m.player.x = a.x;
  m.player.y = a.y - 60;
  m.player.vy = 0;
  m.player.grounded = false;
  const ev = run(m, 0.5, (mm) => {
    mm.player.vy = 0;
    mm.player.y = a.y - 60;
    return {};
  });
  assert.ok(ev.some((e) => e.type === "snap"));
  assert.equal(m.hp, 100 - C.DMG.almeja);
});

test("el pez globo se infla y dispara un cubierto en cada dirección", () => {
  const m = new Level5();
  only(m, "globo");
  const gl = m.enemies.find((e) => e.kind === "globo" && !e.gone);
  gl.cd = 0;
  m.player.x = gl.x - 200;
  m.player.y = floorAt(m.player.x);
  const ev = run(m, 1);
  assert.ok(ev.some((e) => e.type === "cubiertos"));
  assert.equal(m.shots.filter((s) => s.kind === "cubierto").length, 8);
});

test("la morena sale del ojo de buey y vuelve a esconderse", () => {
  const m = new Level5();
  only(m, "morena");
  const mo = m.enemies.find((e) => e.kind === "morena" && !e.gone);
  mo.cd = 0;
  m.player.x = mo.x + 240;
  m.player.y = floorAt(m.player.x);
  let maxOut = 0;
  run(m, 1.6, {}, () => (maxOut = Math.max(maxOut, mo.out)));
  assert.equal(maxOut, 1);
  assert.ok(mo.out < 0.2);
});

test("el pulpo lanza tinta que tapa la vista", () => {
  const m = new Level5();
  only(m, "pulpo");
  const pu = m.enemies.find((e) => e.kind === "pulpo" && !e.gone);
  pu.cd = 0;
  m.player.x = pu.x - 300;
  m.player.y = floorAt(m.player.x);
  const ev = run(m, 2);
  assert.ok(ev.some((e) => e.type === "ink"));
  assert.ok(ev.some((e) => e.type === "inkHit") && m.inks.length > 0);
});

test("las crías persiguen tu luz en lo oscuro", () => {
  const m = new Level5();
  only(m, "cria");
  const c = m.enemies.find((e) => e.kind === "cria" && !e.gone && e.x > 3 * W);
  m.player.x = c.x - 250;
  m.player.y = floorAt(m.player.x);
  const d0 = Math.abs(c.x - m.player.x);
  run(m, 0.8);
  assert.ok(Math.abs(c.x - m.player.x) < d0 - 60);
  assert.equal(c.state, "chase");
});

test("las banderas guardan y al morir se vuelve a la última", () => {
  const m = new Level5();
  only(m);
  m.player.x = FLAGS[1].x + 5;
  m.player.y = floorAt(m.player.x);
  let ev = run(m, 0.05);
  assert.ok(ev.some((e) => e.type === "checkpoint"));
  m.player.x += 600;
  m.hp = 5;
  m.damage(10, ev = [], "test");
  assert.ok(m.player.dead);
  ev = run(m, 2.5);
  assert.ok(ev.some((e) => e.type === "respawn"));
  assert.ok(Math.abs(m.player.x - (FLAGS[1].x + 60)) < 2);
  assert.equal(m.hp, 100);
});

test("el Tragabarcos: aparece, el farol duele triple, cambia de fase y se hunde", () => {
  const m = new Level5();
  only(m);
  m.player.x = ARENA_X + 260;
  m.player.y = floorAt(m.player.x);
  let ev = run(m, 0.05);
  assert.ok(ev.some((e) => e.type === "bossIntro"));
  ev = run(m, 4);
  assert.equal(m.boss.state, "fight");
  const b = m.boss;
  const l = m.lantern();
  m.bullets.push({ x: l.x, y: l.y, vx: 0, vy: 0, life: 1 });
  run(m, 0.01);
  assert.equal(b.hp, C.BOSS.hp - C.BOSS.weak);
  m.bullets.push({ x: b.x, y: b.y + 40, vx: 0, vy: 0, life: 1 });
  run(m, 0.01);
  assert.equal(b.hp, C.BOSS.hp - C.BOSS.weak - C.BOSS.body);
  b.hp = 31;
  ev = [];
  m.hurtBoss(3, ev, "farol");
  assert.equal(b.phase, 2);
  m.hurtBoss(40, ev, "farol");
  assert.equal(b.state, "dying");
  run(m, 4);
  assert.equal(b.state, "dead");
  m.player.x = EXIT_X - 40;
  m.player.y = floorAt(m.player.x);
  ev = run(m, 1, { right: true });
  assert.ok(ev.some((e) => e.type === "complete") && m.complete);
});

test("la succión del jefe arrastra hacia la boca y muerde", () => {
  const m = new Level5();
  only(m);
  m.player.x = ARENA_X + 260;
  m.player.y = floorAt(m.player.x);
  run(m, 4.2);
  const b = m.boss;
  b.attack = "suction";
  b.at = 0;
  b.x = ARENA_RIGHT - 300;
  b.y = 380;
  m.player.x = ARENA_X + 500;
  const x0 = m.player.x;
  const ev = run(m, 3.5);
  assert.ok(m.player.x > x0 + 100 || ev.some((e) => e.type === "bite"), "lo arrastra");
});

test("una partida automática cruza el fondo del mar hasta la arena", () => {
  const m = new Level5();
  let t = 0;
  run(m, 160, (mm, i) => {
    t = i * DT;
    if (mm.arena || mm.boss.state !== "waiting") return {};
    mm.hp = 100; // el bot no pelea: solo comprueba que el recorrido es transitable
    const p = mm.player;
    const ahead = floorAt(p.x + 60);
    const wall = ahead !== null && ahead < p.y - 20;
    return { right: true, run: true, jumpPressed: i % (wall || C.inChasm(p.x + 120) || C.inChasm(p.x) ? 24 : 70) === 0, jump: true, shoot: i % 40 === 0 };
  });
  assert.ok(m.boss.state !== "waiting", "llegó a la arena del jefe (x=" + Math.round(m.player.x) + ")");
});

console.log("Nivel 5: " + passed + " pruebas superadas");
