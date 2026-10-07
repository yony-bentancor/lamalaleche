/* Nivel 3 · «Sin destino». Presentación, ciclo de vida, HUD y efectos. Toda la lógica vive en level3-core.js. */
(() => {
  "use strict";
  const C = MilkLevel3Core,
    { FLOOR, STRIDE, WIDTH, NAMES, SECTIONS, COW, ARENA_X, ARENA_CENTER, CAM_MAX, DAWN_SECONDS, WIND_ZONES, RAIN_ZONES } = C,
    W = 1280,
    H = 720,
    SAVE_KEY = "milk-v9-level3",
    PROGRESS_KEY = "milk-v9-progress",
    ARENA_ZOOM = 0.62;
  let bridge,
    host,
    canvas,
    g,
    model,
    assets = null,
    loading = null,
    raf = 0,
    last = 0,
    acc = 0,
    mode = "off",
    camera = { x: 0, y: 0, zoom: 1 },
    view = { l: 0, r: W },
    fx2 = null,
    shake = 0,
    quake = 0,
    noticeTime = 0,
    zone = -1,
    zoneTime = 0,
    hudTime = 0,
    trail = [],
    trailTick = 0,
    flyers = [],
    debris = [],
    dust = [],
    decals = [],
    lightning = 0,
    lightningNext = 6,
    thunderAt = -1,
    hpFlash = 0,
    lastSkid = 0,
    deathIris = false,
    windNotices = 0,
    seen = new Set(),
    musicName = "";
  const held = new Set(),
    touch = new Set();
  let jump = false,
    shot = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => host?.querySelector("#" + id),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    TAU = Math.PI * 2;
  const fx = () => bridge.settings.effects && !reduced;
  const weatherOn = () => bridge.settings.weather !== false;
  const visible = (x, w = 100) => x + w > view.l && x - w < view.r;
  const toScreen = (x, y) => ({ x: (x - camera.x - 640) * camera.zoom + 640, y: (y - camera.y - FLOOR) * camera.zoom + FLOOR });
  function clear() {
    held.clear();
    touch.clear();
    jump = false;
    shot = false;
    host?.querySelectorAll(".pressed").forEach((b) => b.classList.remove("pressed"));
  }
  /* ---------- Carga de fondos y fotogramas ---------- */
  function load() {
    if (assets) return Promise.resolve(assets);
    if (loading) return loading;
    loading = (async () => {
      const a = { bg: [], cow: {}, tiles: [], ground: [] };
      let count = 0;
      const total = 12 + Object.values(MilkLevel3Assets).reduce((s, v) => s + v.length, 0);
      const im = (src) =>
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => {
            count++;
            if ($("l3loadProgress")) $("l3loadProgress").value = count / total;
            resolve(i);
          };
          i.onerror = () => reject(Error("No se pudo cargar " + src));
          i.src = src;
        });
      await Promise.all([
        ...Array.from({ length: 12 }, (_, i) => im(`assets/level3/bg-${String(i + 1).padStart(2, "0")}.webp`).then((v) => (a.bg[i] = v))),
        ...Object.entries(MilkLevel3Assets).map(async ([k, files]) => (a.cow[k] = await Promise.all(files.map((f) => im("assets/level3/" + f))))),
      ]);
      for (let i = 0; i < 12; i++) {
        const tile = document.createElement("canvas");
        tile.width = W;
        tile.height = H;
        const t = tile.getContext("2d");
        const img = a.bg[i];
        t.drawImage(img, 0, 0, img.width, 700, 0, 0, W, FLOOR);
        t.drawImage(img, 0, 700, img.width, img.height - 700, 0, FLOOR, W, H - FLOOR);
        const ground = document.createElement("canvas");
        ground.width = W;
        ground.height = H - FLOOR + 40;
        const gg = ground.getContext("2d");
        gg.drawImage(tile, 0, -FLOOR + 40);
        gg.globalCompositeOperation = "destination-in";
        let f = gg.createLinearGradient(0, 0, 0, 60);
        f.addColorStop(0, "transparent");
        f.addColorStop(1, "black");
        gg.fillStyle = f;
        gg.fillRect(0, 0, W, ground.height);
        if (i) {
          t.globalCompositeOperation = "destination-in";
          f = t.createLinearGradient(0, 0, 235, 0);
          f.addColorStop(0, "transparent");
          f.addColorStop(1, "black");
          t.fillStyle = f;
          t.fillRect(0, 0, W, H);
          gg.globalCompositeOperation = "destination-in";
          f = gg.createLinearGradient(0, 0, 110, 0);
          f.addColorStop(0, "transparent");
          f.addColorStop(1, "black");
          gg.fillStyle = f;
          gg.fillRect(0, 0, W, ground.height);
        }
        a.tiles.push(tile);
        a.ground.push(ground);
      }
      a.eyelid = MilkLevel3City.prepare(a.bg[11]);
      a.bg = null;
      assets = a;
      return a;
    })().catch((e) => {
      loading = null;
      throw e;
    });
    return loading;
  }
  function safeSave(s) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      notice("No se pudo guardar en este navegador. Las banderas siguen funcionando durante la partida.");
    }
  }
  function saved() {
    try {
      return JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    } catch {
      return null;
    }
  }
  function notice(t) {
    if ($("l3notice") && t) {
      $("l3notice").textContent = t;
      noticeTime = 4;
    }
  }
  /* ---------- DOM ---------- */
  function mount() {
    host = document.createElement("section");
    host.id = "level3";
    host.setAttribute("aria-label", "Nivel 3: Sin destino");
    const marks = C.build()
      .flags.map((f) => `<b style="left:${((f.x / WIDTH) * 100).toFixed(1)}%"></b>`)
      .join("");
    host.innerHTML = `<div class="l3stage"><canvas id="l3canvas" width="1280" height="720" tabindex="0" aria-label="Juego de plataformas: cruzá la ciudad de noche antes del amanecer"></canvas>
 <header class="l3hud"><div class="l3identity"><span id="l3section">LA CIUDAD / NIVEL 03</span><strong id="l3place">Sin destino</strong><div class="l3track"><i id="l3trackFill"></i>${marks}<em id="l3trackCow">🐄</em></div></div>
 <div class="l3status"><div class="l3health"><span id="l3condition">LECHE ENTERA</span><strong id="l3hp">100%</strong><div><i id="l3hpFill"></i></div></div><div class="l3clock" id="l3clock"><span>AMANECE 06:00</span><strong id="l3time">03:00</strong><div><i id="l3dawnFill"></i></div></div><button id="l3mute" aria-label="Silenciar sonido">♫</button><button id="l3pause" aria-label="Pausar juego">Ⅱ</button></div></header>
 <div class="l3sub"><span>◈ <b id="l3coins">0</b></span><span>⚑ <b id="l3flags">0/4</b></span><span id="l3score">000000</span><span id="l3powers"></span></div>
 <div id="l3bossHud" hidden><span><em>VACA MECÁNICA</em> <b id="l3bossPct">100%</b></span><div><i id="l3bossFill"></i><s id="l3bossShield"></s></div><small id="l3bossTip"></small><div class="l3timers"><span>SALTO <i id="l3jumpBar"></i></span><span>DISPARO <i id="l3shotBar"></i></span></div></div>
 <div id="l3catWarn" hidden>◀ ¡EL GATO! <b id="l3catDist"></b></div>
 <div id="l3notice" role="status" aria-live="polite"></div><div class="l3controlsHint">← → MOVER <span>SHIFT CORRER · IMPULSO</span><span>ESPACIO SALTAR · DOBLE SALTO</span><span>↓ AGACHARSE</span><span>X LECHE</span><span>ESC PAUSA</span></div>
 <div id="l3touch"><div><button data-k="ArrowLeft" aria-label="Izquierda">◀</button><button data-k="ArrowRight" aria-label="Derecha">▶</button><button data-k="ArrowDown" aria-label="Agacharse">↓</button></div><div><button data-k="ShiftLeft">CORRER</button><button data-k="KeyX">LECHE</button><button data-k="Space">SALTAR</button></div></div>
 <div id="l3overlay" class="l3overlay"><div class="l3panel"><span class="l3eyebrow">NIVEL 03 · LA CIUDAD DE NOCHE</span><h2>Sin<br>destino<span>.</span></h2><p id="l3loadText">Encendiendo los neones…</p><progress id="l3loadProgress" max="1" value="0"></progress></div></div></div>`;
    document.body.append(host);
    canvas = $("l3canvas");
    g = canvas.getContext("2d", { alpha: false });
    $("l3pause").onclick = () => pause();
    $("l3mute").onclick = toggleSound;
    host.querySelectorAll("[data-k]").forEach((b) => {
      b.onpointerdown = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        touch.add(b.dataset.k);
        b.classList.add("pressed");
        if (b.dataset.k === "Space") jump = true;
        if (b.dataset.k === "KeyX") shot = true;
      };
      const release = () => {
        touch.delete(b.dataset.k);
        b.classList.remove("pressed");
      };
      b.onpointerup = b.onpointercancel = b.onlostpointercapture = release;
    });
    window.addEventListener("keydown", keydown, true);
    window.addEventListener("keyup", keyup, true);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("resize", fit);
    fit();
  }
  let stageScale = 1;
  function fit() {
    if (!host) return;
    stageScale = Math.min(innerWidth / W, innerHeight / H);
    host.querySelector(".l3stage").style.setProperty("--s", stageScale);
    const d = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = W * d;
    canvas.height = H * d;
    g.setTransform(d, 0, 0, d, 0, 0);
  }
  function toggleSound() {
    bridge.toggleSound();
    updateHUD();
    if (mode === "play") canvas.focus();
  }
  const KEYS = ["Escape", "KeyP", "KeyM", "KeyF", "Space", "KeyZ", "KeyX", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyD", "KeyS", "ShiftLeft", "ShiftRight"];
  function keydown(e) {
    if (mode === "off" || mode === "cinematic") return;
    if (e.code === "Tab" && (mode === "pause" || mode === "complete")) {
      const btns = [...$("l3overlay").querySelectorAll("button,input")];
      const first = btns[0],
        end = btns[btns.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (KEYS.includes(e.code)) {
      if (e.target.matches("input") && !["Escape", "KeyP", "KeyM"].includes(e.code)) return;
      e.stopImmediatePropagation();
      if (!e.target.matches("button,input")) e.preventDefault();
    }
    if (e.repeat) return;
    if (e.code === "KeyM") return toggleSound();
    if (e.code === "KeyF") {
      try {
        const req = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        req?.catch(() => {});
      } catch {}
      return;
    }
    if (e.code === "Escape" || e.code === "KeyP") {
      if (mode === "play") pause();
      else if (mode === "pause") resume();
      return;
    }
    if (mode !== "play") return;
    held.add(e.code);
    if (e.code === "Space" || e.code === "KeyZ") jump = true;
    if (e.code === "KeyX") shot = true;
  }
  function keyup(e) {
    if (mode === "off" || mode === "cinematic") return;
    held.delete(e.code);
    e.stopImmediatePropagation();
  }
  function blur() {
    if (mode === "play") pause();
    else clear();
  }
  function visibility() {
    if (document.hidden) blur();
  }
  function resetView() {
    fx2?.reset();
    trail = [];
    flyers = [];
    debris = [];
    dust = [];
    decals = [];
    quake = 0;
    shake = 0;
    const arena = model.boss.state !== "waiting";
    camera.x = arena ? ARENA_CENTER - 640 : clamp(model.player.x - 330, 0, CAM_MAX);
    camera.y = 0;
    camera.zoom = arena ? ARENA_ZOOM : 1;
    zone = -1;
  }
  function pause() {
    if (mode !== "play") return;
    mode = "pause";
    clear();
    const o = $("l3overlay");
    o.hidden = false;
    o.innerHTML = `<div class="l3panel" role="dialog" aria-modal="true" aria-labelledby="l3pauseTitle"><span class="l3eyebrow">LA CIUDAD TAMBIÉN DUERME</span><h2 id="l3pauseTitle">En pausa<span>.</span></h2><p>El reloj del amanecer se detiene mientras descansás.</p><button class="l3primary" id="l3resume">SEGUIR JUGANDO →</button><button id="l3retry">Volver al último checkpoint</button><label>Sonido <input type="checkbox" id="l3soundOpt" ${bridge.settings.sound ? "checked" : ""}></label><label>Efectos ambientales <input type="checkbox" id="l3fxOpt" ${bridge.settings.effects ? "checked" : ""}></label><label>Música de fondo <input type="checkbox" id="l3musicOpt" ${bridge.settings.ambient !== false ? "checked" : ""}></label><label>Lluvia, viento y neones <input type="checkbox" id="l3weatherOpt" ${weatherOn() ? "checked" : ""}></label><label>Temblor de pantalla <input type="checkbox" id="l3shakeOpt" ${bridge.settings.shake ? "checked" : ""}></label><label>Volumen <input id="l3volume" type="range" min="0" max="100" value="${bridge.settings.volume}"></label><button id="l3home">Volver al inicio</button></div>`;
    $("l3resume").onclick = resume;
    $("l3retry").onclick = () => {
      model.reset(model.saved);
      resetView();
      resume();
    };
    $("l3home").onclick = stop;
    $("l3soundOpt").onchange = toggleSound;
    const opt = (id, key) =>
      ($(id).onchange = (e) => {
        bridge.settings[key] = e.target.checked;
        bridge.saveSettings();
      });
    opt("l3fxOpt", "effects");
    opt("l3musicOpt", "ambient");
    opt("l3weatherOpt", "weather");
    opt("l3shakeOpt", "shake");
    $("l3volume").oninput = (e) => {
      bridge.settings.volume = +e.target.value;
      bridge.saveSettings();
    };
    $("l3resume").focus();
  }
  function resume() {
    if (mode !== "pause") return;
    clear();
    mode = "play";
    $("l3overlay").hidden = true;
    canvas.focus();
    last = performance.now();
  }
  async function start(payload = {}) {
    if (mode !== "off") return;
    bridge.enter();
    mode = "load";
    mount();
    try {
      await load();
    } catch (e) {
      $("l3loadText").textContent = e.message + " · Volvé a descomprimir el ZIP completo.";
      const b = document.createElement("button");
      b.textContent = "Volver al inicio";
      b.onclick = stop;
      $("l3overlay").querySelector(".l3panel").append(b);
      return;
    }
    if (!host) return;
    const save = payload.resume ? saved() : null;
    model = new C.Level3(save);
    if (!save && payload.score) model.score = payload.score;
    if (!save && payload.score) model.saved = model.snapshot();
    fx2 = new MilkFX();
    resetView();
    fx2.iris.r = 0;
    fx2.irisTo(model.player.x - camera.x, model.player.y - 70, 2000);
    noticeTime = 0;
    acc = 0;
    seen = new Set();
    bridge.activate();
    mode = "play";
    $("l3overlay").hidden = true;
    canvas.focus();
    notice(save ? "Retomás desde tu última bandera." : "Libre por primera vez · Llegá a la azotea del cartel antes del amanecer.");
    updateHUD();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    mode = "off";
    cancelAnimationFrame(raf);
    clear();
    bridge.music?.()?.set("off");
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("keyup", keyup, true);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", fit);
    host?.remove();
    host = null;
    model = null;
    musicName = "";
    bridge.home();
  }
  /* ---------- Eventos del juego: sonido, partículas y avisos ---------- */
  const fxOpts = () => ({ effects: fx(), impact: bridge.settings.impact !== false && !reduced });
  const ITEM_TEXT = {
    refill: "RECARGA COMPLETA",
    shield: "TAPA ESCUDO",
    cacao: "CHOCOLATADA · LECHE x2",
    uht: "UHT · INVENCIBLE",
    cookie: "GALLETITA · DOBLE SALTO",
    straw: "PAJITA · IMPULSO EN EL AIRE",
    reflector: "TAPA REFLECTORA · LUZ PROPIA",
  };
  const ITEM_HELP = {
    cookie: "Saltá otra vez en el aire durante 15 s.",
    straw: "En el aire, tocá CORRER para un impulso horizontal.",
    reflector: "Las ratas y palomas no se animan a acercarse.",
    refill: "Energía al 100% y fuera las manchas de café.",
    cacao: "Tu leche pega el doble: también a la vaca.",
  };
  function shakeOn() {
    return bridge.settings.shake && !reduced;
  }
  function hudPoint(id) {
    const el = $(id),
      st = host?.querySelector(".l3stage");
    if (!el || !st) return { x: 640, y: 40 };
    const a = el.getBoundingClientRect(),
      b = st.getBoundingClientRect(),
      k = W / b.width;
    return { x: (a.left + a.width / 2 - b.left) * k, y: (a.top + a.height / 2 - b.top) * k };
  }
  function fly(kind, wx, wy, target) {
    if (!fx()) return;
    const to = hudPoint(target),
      from = toScreen(wx, wy);
    flyers.push({ kind, x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, dur: 0.75 });
  }
  function stageQuake(strength = 1) {
    if (!shakeOn()) return;
    shake = Math.max(shake, strength * 0.42);
  }
  function hint(key, text) {
    if (seen.has(key)) return;
    seen.add(key);
    notice(text);
  }
  function event(e) {
    const p = model.player,
      o = fxOpts();
    switch (e.type) {
      case "jump":
      case "land":
      case "hardland":
        fx2.burst(e.x, e.y, e.type === "hardland" ? 14 : 5, "#d8d5c3", 70, "dot", { grav: 300 });
        bridge.sound(e.type);
        break;
      case "skid":
        if (model.time - lastSkid > 0.6) bridge.play("skid");
        lastSkid = model.time;
        break;
      case "spring":
        bridge.play("spring");
        fx2.ring(e.x, e.y, "#ffffff", 60, 3);
        break;
      case "shoot":
        bridge.play("shoot", { cacao: model.power.cacao > 0 });
        fx2.burst(e.x + p.face * 35, e.y, 4, model.power.cacao > 0 ? "#b87c47" : "#fff4d9", 70);
        break;
      case "hurt":
        bridge.sound("damage");
        fx2.event({ type: "hurt", x: e.x, y: e.y }, o);
        fx2.text(e.x, e.y - 30, "−" + e.amount + "%", "#ff998b", 20);
        if (shakeOn()) shake = Math.max(shake, 0.18);
        break;
      case "death":
        bridge.sound("break");
        fx2.event({ type: "death", x: p.x, y: p.y - 70 }, o);
        deathIris = false;
        notice("El vidrio cedió. Volvés a la última bandera.");
        break;
      case "respawn":
        resetView();
        fx2.iris.r = 0;
        fx2.irisTo(p.x - camera.x, p.y - 70 - camera.y, 2000);
        notice("Checkpoint recuperado · Energía restaurada.");
        break;
      case "collect":
        if (e.kind === "coin") {
          bridge.play("drop");
          fx2.event({ type: "drop", x: e.x, y: e.y }, o);
          fly("coin", e.x, e.y, "l3coins");
        } else {
          bridge.play(e.kind === "refill" ? "refill" : "power");
          notice(ITEM_TEXT[e.kind] + (ITEM_HELP[e.kind] ? " · " + ITEM_HELP[e.kind] : ""));
          if (e.kind === "refill") {
            fx2.flash = { a: 0.4, color: "#e6fff2" };
            fx2.ring(p.x, p.y - 70, "#9ff0c6", 110, 4);
            fx2.ring(p.x, p.y - 70, "#ffffff", 70, 3);
            for (let i = 0; i < 26; i++)
              fx2.add({ x: p.x + (Math.random() - 0.5) * 70, y: p.y - Math.random() * 120, vx: (Math.random() - 0.5) * 40, vy: -120 - Math.random() * 160, life: 0.9, max: 0.9, kind: "dot", color: i % 3 ? "#ffffff" : "#aef3cf", size: 3 + Math.random() * 4, grav: -40 });
            fx2.text(p.x, p.y - 170, "ENERGÍA 100%", "#bff7d9", 26);
            fx2.zoomPunch = 0.05;
            hpFlash = 1;
          } else if (["cacao", "uht", "shield"].includes(e.kind)) fx2.event({ type: "power", kind: e.kind, x: p.x, y: p.y - 80 }, o);
          else {
            const col = { cookie: "#e3b06a", straw: "#ff7fa8", reflector: "#fff3a0" }[e.kind];
            fx2.flash = { a: 0.35, color: col };
            fx2.confetti(p.x, p.y - 80, 22);
            fx2.ring(p.x, p.y - 70, col, 100, 4);
            fx2.text(p.x, p.y - 150, "¡" + ITEM_TEXT[e.kind].split(" · ")[0] + "!", "#ffffff", 26);
            fx2.zoomPunch = 0.06;
          }
        }
        break;
      case "checkpoint":
        safeSave(e.snapshot);
        bridge.play("checkpoint");
        fx2.event({ type: "checkpoint", x: e.x, y: FLOOR }, o);
        notice("Bandera " + (e.index + 1) + "/4 · Partida guardada y energía recargada.");
        break;
      case "points":
        fx2.event({ type: "points", x: e.x, y: e.y, value: e.value, label: e.label }, o);
        break;
      case "stomp":
        bridge.play("stomp");
        fx2.event({ type: "stomp", x: e.x, y: e.y, combo: e.combo || 1 }, o);
        break;
      case "hit":
        bridge.play("enemyhit");
        fx2.event({ type: "enemyhit", x: e.x, y: e.y }, o);
        break;
      case "pop":
        bridge.play(e.kind === "coffee" ? "splat" : e.kind === "can" || e.kind === "lantern" ? "clang" : e.kind === "rat" ? "squeak" : "enemydeath", { soft: true });
        if (e.kind === "coffee") fx2.burst(e.x, e.y + 10, 16, "#6b3b1c", 180, "dot", { grav: 900 });
        else if (e.kind === "lantern") {
          fx2.burst(e.x, e.y, 18, "#ff5a3a", 200, "star");
          fx2.ring(e.x, e.y, "#ffb070", 70, 3);
        } else fx2.event({ type: "enemydeath", x: e.x, y: e.y, type2: e.kind }, o);
        if (o.impact) fx2.hitstop = Math.max(fx2.hitstop, 0.05);
        break;
      case "crate":
        bridge.play("cratebreak");
        fx2.event({ type: "cratebreak", x: e.x + 44, y: e.y + 36 }, o);
        break;
      case "shield":
        bridge.play("shieldbreak");
        fx2.event({ type: "shieldbreak", x: p.x, y: p.y - 80 }, o);
        break;
      case "powerend":
        bridge.play("powerend");
        fx2.event({ type: "powerend", x: e.x, y: e.y }, o);
        notice({ cacao: "Terminó la chocolatada.", uht: "Terminó la leche UHT.", cookie: "Se terminó la galletita.", straw: "Se terminó la pajita.", reflector: "La tapa reflectora dejó de brillar.", cortado: "Se secaron las manchas de café." }[e.kind] || "");
        break;
      case "doublejump":
        bridge.play("doublejump");
        fx2.ring(e.x, e.y, "#f3c98a", 55, 3);
        fx2.burst(e.x, e.y, 12, "#c98a4a", 160, "dot", { grav: 900 });
        break;
      case "dash":
        bridge.play("dash");
        fx2.ring(e.x, e.y, "#ff9fc0", 70, 4);
        for (let i = 0; i < 10; i++) fx2.add({ x: e.x - e.face * i * 12, y: e.y + (Math.random() - 0.5) * 60, vx: -e.face * 200, vy: 0, life: 0.35, max: 0.35, kind: "dot", color: "#ffd0e0", size: 3, grav: 0 });
        break;
      case "windwarn":
        windNotices++;
        if (windNotices <= 2) notice("¡Ráfaga en las alturas! Agachate para que no te arrastre.");
        bridge.play("wind");
        break;
      case "ratout":
        bridge.play("squeak");
        fx2.burst(e.x, FLOOR - 4, 6, "#6a6f78", 90, "dot", { grav: 600 });
        hint("rat", "RATAS · Salen de las alcantarillas. Pisalas o esperá que vuelvan a esconderse.");
        break;
      case "coo":
        bridge.play("coo");
        hint("pigeon", "PALOMAS · Si corrés o disparás cerca, se lanzan en picada.");
        break;
      case "bonk":
        bridge.play("clang", { soft: true });
        break;
      case "bark":
        bridge.play("bark");
        fx2.text(e.x, e.y - 30, "¡GUAU!", "#ffd27a", 22);
        hint("dog", "PERRO GUARDIÁN · No se lo puede vencer. Caminá despacio para no despertarlo.");
        if (shakeOn()) shake = Math.max(shake, 0.08);
        break;
      case "stun":
        bridge.play("enemyhit");
        fx2.burst(e.x, e.y, 8, "#ffe9a0", 120, "star");
        break;
      case "cortado":
        bridge.play("cortado");
        fx2.burst(e.x, e.y, 18, "#6b3b1c", 190, "dot", { grav: 800 });
        fx2.text(e.x, e.y - 40, "¡UN CORTADO!", "#e4b48a", 24);
        notice("¡Te hicieron un cortado! Más lenta hasta la próxima recarga o bandera.");
        break;
      case "catchase":
        bridge.play("meow");
        notice("¡EL GATO TE VIO! Corré sin parar. Un disparo o un salto encima lo frena.");
        if (shakeOn()) shake = Math.max(shake, 0.1);
        break;
      case "catpounce":
        bridge.play("hiss");
        fx2.burst(e.x, e.y, 10, "#ffffff", 160, "shard");
        break;
      case "catstun":
        bridge.play("meow", { soft: true });
        fx2.burst(e.x, e.y, 10, "#fff4d9", 140, "star");
        break;
      case "catgone":
        bridge.play("bonus");
        break;
      case "bossintro":
        bridge.play("alarm");
        notice("El cartel se apaga… ¡LA VACA MECÁNICA!");
        stageQuake(0.5);
        break;
      case "cowland": {
        // «Cuando salta, la pantalla tiembla y sacude todo»: cámara, HUD, polvo, tornillos y cartel.
        bridge.play("cowland");
        quake = 1;
        if (shakeOn()) shake = Math.max(shake, 0.7);
        stageQuake(1);
        fx2.ring(e.x, FLOOR, "#ffe3c2", 420, 10);
        fx2.ring(e.x, FLOOR, "#ffffff", 260, 6);
        for (let i = 0; i < 40; i++) {
          const side = i % 2 ? 1 : -1;
          fx2.add({ x: e.x + side * (180 + Math.random() * 120), y: FLOOR - 4, vx: side * (180 + Math.random() * 420), vy: -150 - Math.random() * 380, life: 0.8, max: 0.8, kind: "dot", color: i % 3 ? "#b9a48c" : "#6d6058", size: 4 + Math.random() * 7, grav: 1300 });
        }
        if (fx()) {
          for (let i = 0; i < 70; i++) dust.push({ x: Math.random() * W, y: -20 - Math.random() * 260, vy: 120 + Math.random() * 260, vx: (Math.random() - 0.5) * 40, r: 1 + Math.random() * 3, life: 2.2 });
          for (let i = 0; i < 8; i++) dust.push({ x: 80 + Math.random() * 1120, y: -30 - Math.random() * 120, vy: 160, vx: (Math.random() - 0.5) * 60, r: 6, bolt: true, rot: Math.random() * 6, life: 2.4 });
        }
        decals.push({ x: e.x, r: 240, life: 6, kind: "crack" });
        if (o.impact) fx2.hitstop = Math.max(fx2.hitstop, 0.08);
        if (!e.intro && e.hit) fx2.text(p.x, p.y - 160, "¡TERREMOTO! −5%", "#ffb3a0", 24);
        if (!e.intro) hint("cowjump", "Cada 15 s la vaca salta y sacude la azotea. Estar en el aire o en una viga te salva.");
        break;
      }
      case "cowcrouch":
        bridge.play("moo");
        break;
      case "cowjump":
        bridge.play("whoosh");
        fx2.burst(e.x, FLOOR, 24, "#c8b8a5", 260, "dot", { grav: 900 });
        notice("¡LA VACA SALTA! Subí a una viga o saltá en el último momento.");
        break;
      case "cowfall":
        bridge.play("whoosh", { down: true });
        break;
      case "cowcharge":
        bridge.play("charge");
        notice("¡CAÑÓN CARGANDO! La bola de energía apunta adonde vas.");
        break;
      case "cowfire":
        bridge.play("cowfire");
        fx2.flash = { a: 0.35, color: "#ff8fd0" };
        if (shakeOn()) shake = Math.max(shake, 0.3);
        fx2.ring(e.x, e.y, "#ff7fd0", 140, 6);
        break;
      case "cowblast":
        bridge.play("blast");
        if (shakeOn()) shake = Math.max(shake, 0.45);
        stageQuake(0.5);
        fx2.ring(e.x, FLOOR - 10, "#ff7fd0", 160, 8);
        fx2.burst(e.x, FLOOR - 20, 40, "#ff8fd8", 380, "star", { grav: 700 });
        decals.push({ x: e.x, r: 90, life: 5, kind: "scorch" });
        break;
      case "cowopen":
        if (model.boss.state !== "intro") {
          bridge.play("popitem");
          fx2.text(e.x, e.y - 120, "¡PUNTO DÉBIL ABIERTO!", "#ffd6f0", 22);
        }
        hint("cowopen", "La vaca abre su escudo al despertar, al aterrizar y después de disparar. ¡Leche! (2% por disparo)");
        break;
      case "cowshield":
        bridge.play("shieldup");
        break;
      case "armor":
        bridge.play("armor");
        fx2.burst(e.x, e.y, 5, "#9fe8ff", 90, "dot");
        hint("armor", "BLINDADA · El escudo rebota tu leche. Esperá el próximo aterrizaje o disparo.");
        break;
      case "bosshit":
        bridge.play("enemyhit");
        fx2.burst(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 200, 8, "#fff4d9", 160);
        break;
      case "billboardbreak":
        bridge.play("powerdown");
        stageQuake(0.5);
        notice(["", "¡El cartel empieza a fallar!", "La vaca pierde energía… ¡seguí así!", "¡Último cuarto! El cartel está por apagarse."][e.n] || "");
        break;
      case "bossdeath":
        bridge.play("robotdown");
        fx2.flash = { a: 0.45, color: "#ffffff" };
        fx2.slow = 1.2;
        if (shakeOn()) shake = Math.max(shake, 0.8);
        stageQuake(1);
        break;
      case "victory":
        bridge.play("victory");
        fx2.event({ type: "victory", x: e.x, y: e.y }, o);
        notice("¡GANASTE! El cartel vuelve a encenderse… y algo enorme se acerca entre las nubes.");
        try {
          localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completedLevel: 3, nextLevel: 4, score: model.score }));
          localStorage.removeItem(SAVE_KEY);
        } catch {}
        break;
      case "firework":
        bridge.play("pop", { soft: true });
        fx2.burst(e.x, e.y, 40, ["#ffd23f", "#ff7fd0", "#9fe8ff"][Math.floor(model.time * 7) % 3], 260, "star", { grav: 120 });
        break;
      case "airship":
        bridge.play("horn");
        notice("Un dirigible de reparto pasa sobre la azotea… ¡y baja una cuerda!");
        break;
      case "truckhorn":
        bridge.play("horn");
        notice("GRANJA LA ESPERANZA · ¡Subite al camión!");
        break;
      case "truckboard":
        bridge.play("checkpoint");
        fx2.confetti(e.x, e.y, 40);
        fx2.text(e.x, e.y - 80, "¡AL CAMPO!", "#fff3c8", 30);
        break;
    }
  }
  /* ---------- HUD ---------- */
  function clockText(c) {
    const m = Math.min(180, Math.floor((c / DAWN_SECONDS) * 180)),
      hh = 3 + Math.floor(m / 60),
      mm = m % 60;
    return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
  }
  function updateHUD() {
    if (!model || !host) return;
    const m = model,
      p = m.player;
    $("l3place").textContent = NAMES[m.zone];
    $("l3section").textContent = SECTIONS[Math.min(3, Math.floor(m.zone / 3))] + " · NIVEL 03";
    $("l3hp").textContent = Math.ceil(m.hp) + "%";
    $("l3hpFill").style.width = m.hp + "%";
    $("l3condition").textContent = m.power.cortado > 0 ? "CORTADA" : m.hp <= 30 ? "A PUNTO DE ROMPERSE" : m.hp <= 60 ? "VIDRIO ASTILLADO" : "LECHE ENTERA";
    $("l3hpFill").style.background = m.power.cortado > 0 ? "#c79a6c" : m.hp <= 30 ? "#ef8675" : "#ecdbb6";
    $("l3time").textContent = m.dawn >= 1 ? "06:00" : clockText(m.clock);
    $("l3dawnFill").style.width = m.dawn * 100 + "%";
    $("l3clock").classList.toggle("urgent", m.dawn > 0.8 && m.dawn < 1);
    $("l3clock").classList.toggle("done", m.dawn >= 1);
    $("l3trackFill").style.width = (p.x / WIDTH) * 100 + "%";
    $("l3coins").textContent = m.coins;
    $("l3flags").textContent = m.flags.filter((f) => f.active).length + "/4";
    $("l3score").textContent = String(m.score).padStart(6, "0");
    const chips = [];
    const P = m.power,
      T = C.POWER_TIME;
    if (m.shield) chips.push(["shield", "◉ ESCUDO", 1]);
    if (P.cookie > 0) chips.push(["cookie", "🍪 DOBLE SALTO · " + Math.ceil(P.cookie) + "s", P.cookie / T.cookie]);
    if (P.straw > 0) chips.push(["straw", "≫ IMPULSO · " + Math.ceil(P.straw) + "s", P.straw / T.straw]);
    if (P.reflector > 0) chips.push(["reflector", "☀ REFLECTORA · " + Math.ceil(P.reflector) + "s", P.reflector / T.reflector]);
    if (P.cacao > 0) chips.push(["cacao", "🍫 CHOCOLATADA · " + Math.ceil(P.cacao) + "s", P.cacao / T.cacao]);
    if (P.uht > 0) chips.push(["uht", "★ UHT · " + Math.ceil(P.uht) + "s", P.uht / T.uht]);
    if (P.cortado > 0) chips.push(["cortado", "☕ CORTADA · " + Math.ceil(P.cortado) + "s", P.cortado / T.cortado]);
    if (m.combo > 1) chips.push(["combo", "COMBO x" + m.combo, 1]);
    if (m.wind < -0.3) chips.push(["wind", "≋ VIENTO", -m.wind]);
    const html = chips.map(([k, t, v]) => `<span class="l3chip ${k}"><b>${t}</b><i style="width:${Math.round(v * 100)}%"></i></span>`).join("");
    if ($("l3powers").innerHTML !== html) $("l3powers").innerHTML = html;
    $("l3hpFill").parentElement.parentElement.classList.toggle("flash", hpFlash > 0);
    $("l3mute").textContent = bridge.settings.sound ? "♫" : "♪";
    $("l3mute").setAttribute("aria-label", bridge.settings.sound ? "Silenciar sonido" : "Activar sonido");
    const b = m.boss,
      fight = b.state !== "waiting" && !m.won;
    $("l3bossHud").hidden = !fight;
    host.querySelector(".l3stage").classList.toggle("bossfight", fight || m.won);
    if (fight) {
      $("l3bossFill").style.width = b.hp + "%";
      $("l3bossPct").textContent = Math.ceil(b.hp) + "%";
      $("l3bossShield").style.opacity = b.vuln > 0 ? 0 : 1;
      $("l3bossHud").classList.toggle("open", b.vuln > 0);
      const busy = ["crouch", "rise", "hang", "fall", "land"].includes(b.state);
      $("l3bossTip").textContent =
        b.state === "intro"
          ? "Despierta…"
          : b.state === "dead"
            ? "¡Se apaga!"
            : busy
              ? "¡SALTO! Subí a una viga o estate en el aire al aterrizar"
              : b.state === "charge"
                ? "¡CAÑÓN CARGANDO! Movete"
                : b.vuln > 0
                  ? "¡ESCUDO ABIERTO! Disparale leche · " + b.vuln.toFixed(1) + "s"
                  : "BLINDADA · Abre el escudo al aterrizar y al disparar";
      $("l3jumpBar").style.width = clamp(1 - b.jumpIn / COW.jumpEvery, 0, 1) * 100 + "%";
      $("l3shotBar").style.width = clamp(1 - b.shootIn / COW.shootEvery, 0, 1) * 100 + "%";
    }
    const cat = m.cat,
      catOff = cat.active && cat.state === "run" && toScreen(cat.x, 0).x < 0;
    $("l3catWarn").hidden = !catOff;
    if (catOff) $("l3catDist").textContent = Math.round((p.x - cat.x) / 10) + " m";
  }
  /* ---------- Final del nivel ---------- */
  function complete() {
    mode = "complete";
    clear();
    $("l3overlay").hidden = false;
    $("l3overlay").innerHTML = `<div class="l3panel l3final" role="dialog" aria-modal="true" aria-labelledby="l3winTitle"><span class="l3eyebrow">NIVEL 3 COMPLETO · SIGUE EN EL NIVEL 4</span><h2 id="l3winTitle">Por las<br>nubes<span>.</span></h2><p>La vaca del cartel guiñó un ojo.<br>Un dirigible de reparto pasa sobre la azotea y baja una cuerda.</p><p>Por primera vez, la botella sabe adónde va: a la granja.</p><div class="l3results"><span>PUNTAJE <b>${model.score}</b></span><span>MONEDAS <b>${model.coins}</b></span><span>AMANECER <b>${model.dawnBonus ? "A TIEMPO" : clockText(model.clock)}</b></span></div><p class="l3muted">Tu victoria está guardada.</p><button class="l3primary" id="l3toLevel4">JUGAR NIVEL 4 · POR LAS NUBES →</button><button id="l3winHome">Volver al inicio</button><button id="l3again">Jugar el nivel 3 otra vez</button></div>`;
    $("l3winHome").onclick = stop;
    $("l3again").onclick = () => {
      model = new C.Level3();
      resetView();
      mode = "play";
      $("l3overlay").hidden = true;
      canvas.focus();
    };
    $("l3toLevel4").onclick = () => {
      const score = model.score;
      stop();
      window.dispatchEvent(new CustomEvent("milk:play-level4", { detail: { score } }));
    };
    $("l3toLevel4").focus();
    window.dispatchEvent(new CustomEvent("milk:level-transition", { detail: { from: 3, to: 4, score: model.score, hp: model.hp } }));
  }
  /* ---------- Bucle ---------- */
  function music() {
    const mu = bridge.music?.();
    if (!mu || !model) return;
    const b = model.boss;
    const name =
      mode !== "play" && mode !== "complete"
        ? "pause"
        : model.won || mode === "complete"
          ? "victory"
          : b.state !== "waiting"
            ? "boss3"
            : model.cat.active && model.cat.state === "run"
              ? "chase3"
              : "level3";
    mu.set(name, bridge.settings);
    musicName = name;
  }
  function frame(ts) {
    if (!host) return;
    const dt = Math.min(0.065, (ts - last) / 1000 || 0);
    last = ts;
    music();
    bridge.uht?.(mode === "play" && model && model.power.uht > 0);
    if (fx2 && mode === "play") fx2.update(dt * (fxOpts().impact ? fx2.timeScale : 1));
    const frozen = mode === "play" && fx2 && fx2.hitstop > 0 && fxOpts().impact;
    if (mode === "play" && !frozen) {
      acc += dt * (fx2 && fxOpts().impact ? fx2.timeScale : 1);
      while (acc >= 1 / 120) {
        const has = (...ks) => ks.some((k) => held.has(k) || touch.has(k));
        for (const e of model.step(1 / 120, {
          left: has("ArrowLeft", "KeyA"),
          right: has("ArrowRight", "KeyD"),
          down: has("ArrowDown", "KeyS"),
          run: has("ShiftLeft", "ShiftRight"),
          jump: has("Space", "KeyZ"),
          jumpPressed: jump,
          shoot: has("KeyX") || shot,
        }))
          event(e);
        jump = false;
        shot = false;
        acc -= 1 / 120;
      }
      update(dt);
      if (model.complete) complete();
    } else if (!frozen) acc = 0;
    $("l3notice").classList.toggle("visible", noticeTime > 0);
    render();
    raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    const p = model.player,
      b = model.boss;
    const arena = b.state !== "waiting";
    let target = camera.x;
    if (arena) target = ARENA_CENTER - 640;
    else {
      const look = Math.abs(p.vx) > 20 ? p.face * 85 : 0;
      const rel = p.x - camera.x,
        center = W * 0.43 - look;
      if (rel > center + 70) target = p.x - center - 70;
      else if (rel < center - 70) target = p.x - center + 70;
      // Persecución del gato: la cámara se adelanta para que veas hacia dónde huir.
      if (model.cat.active && model.cat.state === "run") target += 90;
      target = clamp(target, 0, CAM_MAX);
    }
    camera.x += (target - camera.x) * (1 - Math.exp(-dt * (arena ? 2.4 : 5)));
    if (p.grounded && !arena) camera.y += (clamp(p.y - FLOOR, -150, 0) - camera.y) * (1 - Math.exp(-dt * 3));
    else if (arena) camera.y += (0 - camera.y) * (1 - Math.exp(-dt * 3));
    const zoom = arena ? ARENA_ZOOM : 1;
    camera.zoom += (zoom - camera.zoom) * (1 - Math.exp(-dt * 2.2));
    const half = 640 / camera.zoom;
    view = { l: camera.x + 640 - half - 60, r: camera.x + 640 + half + 60 };
    shake = Math.max(0, shake - dt);
    quake = Math.max(0, quake - dt * 0.9);
    noticeTime = Math.max(0, noticeTime - dt);
    zoneTime = Math.max(0, zoneTime - dt);
    hpFlash = Math.max(0, hpFlash - dt * 1.5);
    if (zone !== model.zone) {
      zone = model.zone;
      zoneTime = 3.4;
      const hints = {
        0: "Sos libre. La ciudad es enorme y el amanecer llega a las 06:00 · Llegá antes y ganás un bonus.",
        1: "AVENIDA · Las latas ruedan por la vereda. Saltalas o pisalas.",
        2: "CALLEJÓN · Algo te mira desde la oscuridad… La caja se rompe con leche.",
        3: "BARRIO CHINO · Los farolitos ruedan. La tapa reflectora espanta a ratas y palomas.",
        5: "MERCADO NOCTURNO · Un perro duerme. Pasá caminando, sin correr ni disparar.",
        6: "ESCALERAS DE INCENDIO · El viento sopla fuerte en las alturas.",
        8: "CARTELES DE NEÓN · Las plataformas de neón se apagan: mirá cuándo titilan.",
        9: "CAFÉ 24 H · Si el barista te ve, te hace un cortado. Agachate lejos de él. Las sombrillas rebotan.",
        10: "EL PUENTE · Amanece. Los faroles se apagan a tu paso.",
        11: "LA AZOTEA DEL CARTEL · Algo se mueve arriba…",
      };
      if (hints[zone]) notice(hints[zone]);
    }
    hudTime += dt;
    if (hudTime > 0.1) {
      hudTime = 0;
      updateHUD();
    }
    // Estelas (UHT, impulso de pajita, carrera).
    trailTick -= dt;
    if (fx() && trailTick <= 0 && !p.dead && (model.power.uht > 0 || model.dash > 0 || Math.abs(p.vx) > 400)) {
      trailTick = 0.045;
      const f = pose(p);
      if (f) trail.push({ ...f, x: p.x, y: p.y, face: p.face, life: 0.24, kind2: model.power.uht > 0 ? "uht" : model.dash > 0 ? "dash" : "run" });
    }
    for (const a of trail) a.life -= dt;
    trail = trail.filter((a) => a.life > 0);
    for (const f of flyers) f.t += dt;
    flyers = flyers.filter((f) => f.t < f.dur);
    for (const d of dust) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 240 * dt;
      if (d.rot !== undefined) d.rot += dt * 8;
    }
    dust = dust.filter((d) => d.life > 0 && d.y < H + 20);
    for (const d of decals) d.life -= dt;
    decals = decals.filter((d) => d.life > 0);
    if (fx() && !p.dead) {
      const pw = model.power;
      if (pw.cacao > 0 && Math.random() < 0.3) fx2.add({ x: p.x + (Math.random() - 0.5) * 40, y: p.y - Math.random() * 130, vx: 0, vy: -40, life: 0.6, max: 0.6, kind: "dot", color: "#8b5a34", size: 3, grav: 0 });
      if (pw.uht > 0 && Math.random() < 0.6) fx2.add({ x: p.x + (Math.random() - 0.5) * 60, y: p.y - Math.random() * 140, vx: 0, vy: -60, life: 0.5, max: 0.5, kind: "star", color: `hsl(${Math.random() * 360},90%,70%)`, size: 3, grav: 0, rot: 0, spin: 6 });
      if (pw.cortado > 0 && Math.random() < 0.08) fx2.add({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 30 - Math.random() * 90, vx: 0, vy: 30, life: 0.8, max: 0.8, kind: "dot", color: "#6b3b1c", size: 2.5, grav: 300 });
      if (pw.cookie > 0 && Math.random() < 0.05) fx2.add({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 20, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.7, max: 0.7, kind: "dot", color: "#c98a4a", size: 2, grav: 500 });
    }
    if (p.dead && p.death > 1.05 && !deathIris) {
      deathIris = true;
      const sp = toScreen(p.x, p.y - 70);
      fx2.irisTo(sp.x, sp.y, 0);
    }
    // Viento en techos y puente: restos que vuelan.
    const ws = -model.wind;
    if (fx() && weatherOn() && ws > 0.25 && Math.random() < ws * 0.2)
      debris.push({ kind: ["bag", "paper", "leaf", "paper", "flyer"][Math.floor(Math.random() * 5)], x: W + 40, y: 120 + Math.random() * 380, vx: -(380 + Math.random() * 380), vy: (Math.random() - 0.5) * 60, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, t: Math.random() * 6 });
    for (const d of debris) {
      d.t += dt;
      d.x += d.vx * dt * (0.4 + ws * 0.8);
      d.y += (d.vy + Math.sin(d.t * 5) * 70) * dt;
      d.rot += d.spin * dt;
    }
    debris = debris.filter((d) => d.x > -80).slice(-40);
    // Tormenta en la primera parte de la ciudad.
    lightning = Math.max(0, lightning - dt);
    if (RAIN_ZONES.includes(model.zone) && weatherOn() && !reduced) {
      lightningNext -= dt;
      if (lightningNext <= 0) {
        lightningNext = 10 + Math.random() * 8;
        lightning = 0.45;
        thunderAt = 0.5 + Math.random() * 0.6;
      }
    }
    if (thunderAt > 0) {
      thunderAt -= dt;
      if (thunderAt <= 0) bridge.play("thunder");
    }
    // Humo de la vaca cuando está dañada.
    if (fx() && b.state !== "waiting" && b.hp > 0 && b.hp < 75 && Math.random() < (75 - b.hp) / 160) {
      const side = b.face === -1 ? 1 : -1;
      fx2.add({ x: b.x + side * 120 + (Math.random() - 0.5) * 80, y: FLOOR - b.alt - 600, vx: (Math.random() - 0.5) * 30, vy: -70, life: 1.4, max: 1.4, kind: "dot", color: "rgba(70,60,70,.45)", size: 10 + Math.random() * 12, grav: -20 });
    }
    // La bola de energía deja una estela rosa.
    if (fx()) for (const h of model.hazards) if (Math.random() < 0.8) fx2.add({ x: h.x, y: h.y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.45, max: 0.45, kind: "dot", color: Math.random() < 0.5 ? "#ff8fd8" : "#ffffff", size: 4 + Math.random() * 6, grav: 0 });
    // Carga del cañón: chispas que convergen en la boca.
    if (fx() && b.state === "charge") {
      const m = model.muzzle();
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * TAU,
          r = 120 + Math.random() * 80;
        fx2.add({ x: m.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2, life: 0.4, max: 0.4, kind: "dot", color: "#ffb8ea", size: 3, grav: 0 });
      }
    }
  }
  /* ---------- Dibujo ---------- */
  function rect(x, y, w, h, color, r = 0, stroke) {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1.5;
      g.stroke();
    }
  }
  function ellipse(x, y, rx, ry, color) {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
    g.fill();
  }
  function label(t, x, y, size = 14, color = "#f3e5c7", align = "center") {
    g.font = `700 ${size}px Arial`;
    g.textAlign = align;
    g.fillStyle = color;
    g.fillText(t, x, y);
  }
  function glow(x, y, r, color) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function background() {
    const bx = Math.min(camera.x, CAM_MAX),
      cy = camera.y;
    g.fillStyle = "#0d0a1e";
    g.fillRect(0, 0, W, H);
    const first = Math.max(0, Math.floor(bx / STRIDE) - 1),
      end = Math.min(11, Math.floor((bx + W) / STRIDE) + 1);
    for (let i = first; i <= end; i++) {
      const tx = (i * STRIDE - bx) * 0.9;
      g.drawImage(assets.tiles[i], tx, -cy * 0.25);
      if (cy < 0) g.drawImage(assets.tiles[i], 0, 0, W, 1, tx, 0, W, -cy * 0.25 + 1);
    }
    const p = model.player;
    MilkLevel3City.draw(
      g,
      {
        t: model.time,
        fx: fx() && weatherOn(),
        wind: -model.wind,
        dawn: model.dawn,
        boss: model.boss,
        won: model.won,
        winTime: model.winTime,
        catOut: model.cat.active,
        playerSX: toScreen(p.x, 0).x,
        bottle: bridge.sprites.walk?.[0],
        cowIdle: assets.cow.cowWalk[6],
        eyelid: assets.eyelid,
        tiles: assets.tiles,
        bgCamX: bx,
        camY: cy,
      },
      first,
      end,
    );
    // El cartel tiembla con cada salto de la vaca.
    for (let i = first; i <= end; i++) g.drawImage(assets.ground[i], i * STRIDE - bx, FLOOR - 40 - cy);
    if (quake > 0.05 && fx()) {
      g.fillStyle = `rgba(255,235,210,${quake * 0.06})`;
      g.fillRect(0, 0, W, H);
    }
    // Lluvia en la calle.
    if (weatherOn() && fx() && RAIN_ZONES.includes(model.zone)) {
      const z = model.zone,
        k = z === 2 ? clamp(1 - (p.x - 2 * STRIDE) / STRIDE, 0.25, 1) : 1;
      g.strokeStyle = `rgba(181,217,236,${0.28 * k})`;
      g.lineWidth = 1;
      for (let i = 0; i < 110 * k; i++) {
        const x = (((i * 97.7 - bx * 0.28 - model.time * 90) % W) + W) % W,
          y = (i * 71 + model.time * (520 + (i % 4) * 46)) % H;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x - 7, y + 24);
        g.stroke();
      }
      for (let i = 0; i < 22 * k; i++) {
        const x = (((i * 179 - bx) % W) + W) % W,
          y = FLOOR + 14 + (i % 4) * 14,
          r = (model.time * 26 + i * 7) % 26;
        g.globalAlpha = (1 - r / 26) * 0.28;
        g.strokeStyle = "#cfe6ff";
        g.beginPath();
        g.ellipse(x, y, r, r * 0.18, 0, 0, TAU);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  }
  /* ---------- Plataformas: cada barrio tiene la suya ---------- */
  function platform(b) {
    if (b.gone || !visible(b.x, b.w)) return;
    const x = b.x,
      y = b.y,
      w = b.w,
      t = model.time;
    ellipse(x + w / 2, FLOOR + 4, w * 0.46, 8, "rgba(2,4,14,.35)");
    if (b.kind === "crate") {
      rect(x, y, w, b.h, "#7a4f2a", 3, "#3a2312");
      g.strokeStyle = "#4b2f17";
      g.lineWidth = 4;
      g.strokeRect(x + 5, y + 5, w - 10, b.h - 10);
      g.beginPath();
      g.moveTo(x + 6, y + 6);
      g.lineTo(x + w - 6, y + b.h - 6);
      g.moveTo(x + w - 6, y + 6);
      g.lineTo(x + 6, y + b.h - 6);
      g.stroke();
      label("FRÁGIL", x + w / 2, y + b.h / 2 + 5, 11, "#f1d39a");
      return;
    }
    if (b.kind === "umbrella") {
      const k = model.player.ground === b ? 0.85 : 1;
      rect(x + w / 2 - 3, y + 6, 6, FLOOR - y - 6, "#6b5a4a");
      ellipse(x + w / 2, FLOOR, 22, 5, "#3a2f28");
      g.save();
      g.translate(x + w / 2, y + 8);
      g.scale(1 / k, k);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = i % 2 ? "#f2e6cf" : "#c0392b";
        g.beginPath();
        g.moveTo(0, -18);
        g.lineTo(-w / 2 + (i * w) / 6, 6);
        g.lineTo(-w / 2 + ((i + 1) * w) / 6, 6);
        g.fill();
      }
      g.restore();
      label("↑", x + w / 2, y - 18, 16, "#ffe9b0");
      return;
    }
    if (b.kind === "neon") {
      const on = model.neonOn(b),
        warn = model.neonWarn(b);
      const col = b.offset < 1 ? "#ff4fb8" : b.offset < 2 ? "#4fe3ff" : "#ffd84f";
      const lit = on && !(warn && Math.floor(t * 16) % 2);
      rect(x, y + 4, w, 16, "#1b1626", 6, "#3a3350");
      if (lit) {
        g.save();
        g.globalCompositeOperation = "lighter";
        glow(x + w / 2, y + 10, w * 0.7, col + "55");
        g.restore();
        g.strokeStyle = col + "55";
        g.lineWidth = 14;
        g.beginPath();
        g.roundRect(x + 4, y + 2, w - 8, 12, 6);
        g.stroke();
      }
      g.strokeStyle = lit ? col : "#4a4458";
      g.lineWidth = 5;
      g.beginPath();
      g.roundRect(x + 4, y + 2, w - 8, 12, 6);
      g.stroke();
      if (!on) {
        g.setLineDash([6, 6]);
        g.strokeStyle = "rgba(255,255,255,.18)";
        g.strokeRect(x, y, w, 20);
        g.setLineDash([]);
      }
      // Cables que la cuelgan.
      g.strokeStyle = "rgba(20,16,30,.7)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + 12, y);
      g.lineTo(x + 12, y - 70);
      g.moveTo(x + w - 12, y);
      g.lineTo(x + w - 12, y - 70);
      g.stroke();
      return;
    }
    if (b.kind === "awning" || b.kind === "redAwning" || b.kind === "table") {
      const cols = b.kind === "awning" ? ["#2e7d5b", "#f0e6cf"] : b.kind === "redAwning" ? ["#b8262c", "#e9b949"] : ["#6b3f22", "#e8d1a6"];
      const stripes = Math.ceil(w / 20);
      for (let i = 0; i < stripes; i++) {
        g.fillStyle = cols[i % 2];
        g.beginPath();
        g.moveTo(x + i * 20, y);
        g.lineTo(x + Math.min(w, (i + 1) * 20), y);
        g.lineTo(x + Math.min(w, (i + 1) * 20), y + 14);
        g.lineTo(x + i * 20, y + 14);
        g.fill();
      }
      g.fillStyle = cols[0];
      for (let i = 0; i < w; i += 20) {
        g.beginPath();
        g.arc(x + i + 10, y + 14, 10, 0, Math.PI);
        g.fill();
      }
      rect(x - 3, y - 3, w + 6, 5, b.kind === "redAwning" ? "#e9b949" : "#2b2b33", 2);
      if (b.kind === "redAwning")
        for (let i = 14; i < w; i += 46) {
          const sw = Math.sin(t * 2 + i) * 3;
          g.strokeStyle = "#e9b949";
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(x + i, y + 22);
          g.lineTo(x + i + sw, y + 36);
          g.stroke();
          ellipse(x + i + sw, y + 38, 3, 4, "#d23a2a");
        }
      if (b.kind === "table") {
        g.strokeStyle = "#3a2414";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x + 10, y + 2);
        g.lineTo(x + 10, y - 40);
        g.moveTo(x + w - 10, y + 2);
        g.lineTo(x + w - 10, y - 40);
        g.stroke();
        label("CAFÉ 24H", x + w / 2, y + 12, 10, "#3a2414");
      }
      return;
    }
    if (b.kind === "fire") {
      rect(x, y, w, 8, "#2a2d36", 2, "#11131a");
      g.strokeStyle = "#3d4250";
      g.lineWidth = 2;
      for (let i = 6; i < w; i += 10) {
        g.beginPath();
        g.moveTo(x + i, y + 1);
        g.lineTo(x + i, y + 8);
        g.stroke();
      }
      g.strokeStyle = "#20232b";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, y - 34);
      g.lineTo(x + w, y - 34);
      for (let i = 0; i <= w; i += 30) {
        g.moveTo(x + i, y);
        g.lineTo(x + i, y - 34);
      }
      g.stroke();
      // Escalera que baja del balcón.
      g.beginPath();
      g.moveTo(x + w - 30, y + 8);
      g.lineTo(x + w - 30, y + 70);
      g.moveTo(x + w - 10, y + 8);
      g.lineTo(x + w - 10, y + 70);
      for (let k = 18; k < 70; k += 14) {
        g.moveTo(x + w - 30, y + k);
        g.lineTo(x + w - 10, y + k);
      }
      g.stroke();
      return;
    }
    if (b.kind === "roof") {
      rect(x, y, w, 20, "#4a4652", 2, "#24212b");
      rect(x, y, w, 5, "#8b8492");
      for (let i = 8; i < w - 8; i += 36) rect(x + i, y + 9, 20, 3, "#302c36");
      // Antena con lucecita.
      rect(x + w - 16, y - 46, 3, 46, "#2c2a33");
      if (Math.sin(t * 3 + x) > 0.4) {
        g.save();
        g.globalCompositeOperation = "lighter";
        glow(x + w - 14, y - 48, 14, "rgba(255,50,50,.9)");
        g.restore();
      }
      return;
    }
    // Viga de acero (puente y azotea).
    const grad = g.createLinearGradient(0, y, 0, y + 22);
    grad.addColorStop(0, "#d9823a");
    grad.addColorStop(0.3, "#a3562a");
    grad.addColorStop(1, "#5e2e18");
    rect(x, y, w, 22, grad, 2, "#2a140a");
    rect(x, y, w, 4, "#f0b070");
    for (let i = 10; i < w; i += 24) ellipse(x + i, y + 13, 2.2, 2.2, "#3a1d0e");
    if (b.arena) {
      g.strokeStyle = "#2a140a";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x + 14, y + 22);
      g.lineTo(x + 14, FLOOR);
      g.moveTo(x + w - 14, y + 22);
      g.lineTo(x + w - 14, FLOOR);
      g.stroke();
    }
  }
  function flags() {
    for (const f of model.flags) {
      if (!visible(f.x)) continue;
      ellipse(f.x, FLOOR + 3, 35, 7, "rgba(3,6,20,.4)");
      rect(f.x - 3, FLOOR - 153, 6, 153, "#a5b4bb", 2);
      ellipse(f.x, FLOOR - 155, 5, 5, "#efe2c3");
      const col = f.active ? "#c5e9d6" : "#ff7fb6";
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(f.x + 3, FLOOR - 150);
      g.bezierCurveTo(f.x + 24, FLOOR - 160 + Math.sin(model.time * 3) * 6, f.x + 34, FLOOR - 140, f.x + 70, FLOOR - 153);
      g.lineTo(f.x + 64, FLOOR - 109);
      g.bezierCurveTo(f.x + 35, FLOOR - 96, f.x + 25, FLOOR - 120, f.x + 3, FLOOR - 109);
      g.fill();
      label(f.active ? "✓" : String(f.index + 1), f.x + 34, FLOOR - 123, 20, "#2a1f3a");
      if (f.active) glow(f.x + 5, FLOOR - 75, 100, "rgba(183,223,172,.08)");
    }
  }
  function vents() {
    for (const v of model.vents) {
      if (!visible(v.x)) continue;
      rect(v.x - 30, FLOOR - 4, 60, 8, "#2d2f36", 2, "#15161b");
      for (let i = -24; i <= 24; i += 8) rect(v.x + i - 1, FLOOR - 3, 2, 6, "#0c0d11");
      if (v.warn && fx()) for (let k = 0; k < 3; k++) ellipse(v.x + Math.sin(model.time * 9 + k) * 12, FLOOR - 10 - k * 8, 5, 4, "rgba(230,235,240,.4)");
      if (v.on) {
        for (let k = 0; k < 14; k++) {
          const q = (model.time * 2.4 + k / 14) % 1;
          ellipse(v.x + Math.sin(q * 8 + k) * 14 * q, FLOOR - q * 190, 10 + q * 22, 8 + q * 16, `rgba(238,242,246,${0.55 * (1 - q)})`);
        }
      }
    }
  }
  const ITEM_DESIGN = { refill: "recarga", cacao: "cacao", uht: "uht", shield: "escudo", cookie: "galletita", straw: "pajita", reflector: "tapa_reflectora" };
  const ITEM_TINT = { refill: "#9ff0c655", cacao: "#e0a06a55", shield: "#7cc4ff55", cookie: "#f0c27a55", straw: "#ff8fb855", reflector: "#fff3a066" };
  function item(i) {
    if (i.taken || !visible(i.x)) return;
    const y = i.y + (fx() ? Math.sin(model.time * 2 + i.x) * 3 : 0);
    g.save();
    g.translate(i.x, y);
    if (i.kind === "coin") {
      const sx = reduced ? 1 : 0.3 + Math.abs(Math.cos(model.time * 2 + i.x)) * 0.7;
      g.scale(sx, 1);
      ellipse(0, 0, 10, 13, "#7e5624");
      ellipse(0, -1, 8, 11, "#e9bc65");
      label("¢", 0, 5, 14, "#835a2a");
    } else {
      const key = ITEM_DESIGN[i.kind],
        tint = i.kind === "uht" ? `hsla(${(model.time * 200) % 360},90%,70%,.35)` : ITEM_TINT[i.kind];
      if (fx()) glow(0, 0, 46 + Math.sin(model.time * 4 + i.x) * 6, tint || "#ffffff33");
      const big = key === "recarga";
      if (window.MilkDesigns && MilkDesigns.list[key]) MilkDesigns.draw(g, key, model.time + i.x * 0.01, 0, big ? 28 : 22, { w: big ? 40 : 44, h: big ? 60 : 44 });
      else {
        ellipse(0, 0, 22, 22, "#477a8e");
        label("?", 0, 6, 20);
      }
    }
    g.restore();
  }
  /* ---------- Enemigos de la ciudad (diseños reemplazables desde el Catálogo) ---------- */
  const ENEMY_DESIGN = { rat: "rata", pigeon: "paloma", can: "lata", lantern: "farol", dog: "perro", barista: "barista", coffee: "gota_cafe" };
  function enemy(e) {
    const key = ENEMY_DESIGN[e.kind],
      d = MilkDesigns.list[key];
    if (e.kind === "rat" && visible(e.home)) {
      // Tapa de alcantarilla.
      ellipse(e.home, FLOOR + 3, 30, 7, "#1d1f26");
      ellipse(e.home, FLOOR + 2, 26, 5, "#3a3d47");
      if (e.hp > 0 && e.state === "hidden" && Math.sin(model.time * 1.3 + e.phase) > 0.3) {
        ellipse(e.home - 6, FLOOR - 1, 2.2, 1.6, "#ffdf5a");
        ellipse(e.home + 6, FLOOR - 1, 2.2, 1.6, "#ffdf5a");
      }
    }
    if ((e.hp <= 0 && e.dead <= 0) || !visible(e.x, 120)) return;
    if (e.kind === "rat" && e.state === "hidden" && e.hp > 0) return;
    const [w, h] = d ? d.size : [e.w, e.h];
    const scale = e.kind === "barista" ? 1 : 1.25;
    if (e.hp <= 0) {
      const k = 1 - e.dead / (e.deadMax || 1);
      g.save();
      g.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.5) * 2);
      if (e.how === "stomp") MilkDesigns.draw(g, key, model.time, e.x, FLOOR, { w: w * scale, h: h * scale, face: e.face, squash: true, state: "dead" });
      else {
        const yy = e.kind === "pigeon" ? e.y : FLOOR - 140 * k + 380 * k * k;
        MilkDesigns.draw(g, key, model.time, e.x + e.face * -60 * k, Math.min(FLOOR + 30, yy), { w: w * scale, h: h * scale, face: e.face, rot: k * 9 * -e.face, state: "dead" });
      }
      g.restore();
      return;
    }
    ellipse(e.x, FLOOR + 2, e.w * 0.5, 5, "rgba(4,4,16,.35)");
    g.save();
    if (e.flash > 0) g.filter = "brightness(1.9)";
    const rot = e.kind === "can" || e.kind === "lantern" ? (e.state === "roll" ? (e.x / 22) % TAU : 0) : 0;
    MilkDesigns.draw(g, key, model.time + e.phase, e.x, e.y, { w: w * scale, h: h * scale, face: e.face, state: e.state, stun: e.stun > 0, rot });
    g.restore();
    if (e.kind === "dog" && e.state === "sleep") label("z", e.x + 30 + Math.sin(model.time * 2) * 4, e.y - 70 - ((model.time * 20) % 30), 16, "#e8f0ff");
    if (e.kind === "barista" && e.state === "chase") label("¡UN CORTADO!", e.x, e.y - 175, 13, "#ffd7a8");
    if (e.stun > 0) for (let k = 0; k < 3; k++) label("★", e.x + Math.cos(model.time * 6 + k * 2.1) * 22, e.y - (e.kind === "barista" ? 170 : 80) + Math.sin(model.time * 6 + k * 2.1) * 6, 12, "#ffe58a");
    if (e.kind === "lantern" && fx()) {
      g.save();
      g.globalCompositeOperation = "lighter";
      glow(e.x, e.y - 30, 60, "rgba(255,90,40,.35)");
      g.restore();
    }
  }
  function cat() {
    const c = model.cat;
    if (!c.active || !visible(c.x, 120)) return;
    ellipse(c.x, FLOOR + 2, 40, 6, "rgba(4,4,16,.4)");
    MilkDesigns.draw(g, "gato", model.time, c.x, c.y, { w: 110, h: 77, face: c.face, state: c.state, slow: c.slow > 0 });
    if (c.slow > 0) for (let k = 0; k < 3; k++) label("★", c.x + Math.cos(model.time * 7 + k * 2.1) * 26, c.y - 90, 12, "#ffe58a");
    if (fx() && c.state === "run") {
      g.save();
      g.globalCompositeOperation = "lighter";
      glow(c.x + c.face * 30, c.y - 52, 18, "rgba(255,230,80,.6)");
      g.restore();
    }
  }
  /* ---------- La Vaca Mecánica ---------- */
  const META = window.MilkLevel3Meta;
  function cowFrame() {
    const b = model.boss,
      cw = assets.cow;
    const walk = (i) => ({ im: cw.cowWalk[i], kind: "walk", i });
    switch (b.state) {
      case "intro":
        if (b.alt > 0) return walk(0);
        return walk(Math.min(5, Math.floor(clamp((b.t - 1.75) / 2.0, 0, 0.999) * 6)));
      case "idle":
        return walk(6 + (Math.floor(b.anim * 6) % 6));
      case "walk":
        return walk(12 + (Math.floor(b.anim * 11) % 12));
      case "crouch":
        return walk(b.t < 0.35 ? 1 : 0);
      case "rise":
        return walk(2);
      case "hang":
        return walk(3);
      case "fall":
        return walk(1);
      case "land":
        return walk(b.t < 0.3 ? 0 : Math.min(5, 1 + Math.floor((b.t - 0.3) * 7)));
      case "charge":
        return walk(5);
      case "fire":
        return { im: cw.cowShoot[Math.min(4, Math.floor((b.t / 0.95) * 5))], kind: "shoot", i: Math.min(4, Math.floor((b.t / 0.95) * 5)) };
      case "recover":
        return walk(b.t < 0.4 ? 5 : 6);
    }
    return walk(6);
  }
  function drawCowImage(f, x, y, face, extraScaleY = 1) {
    const ref = f.kind === "shoot" ? 335 : META.walk.ref;
    const sc = COW.height / ref,
      w = f.im.width * sc,
      h = f.im.height * sc * extraScaleY;
    g.save();
    g.translate(x, y);
    g.scale(face === 1 ? -1 : 1, 1);
    // El arte mira a la izquierda; el borde derecho (la cola) queda anclado al cuerpo.
    g.drawImage(f.im, 119 * sc - w, -h, w, h);
    g.restore();
  }
  function boss() {
    const b = model.boss;
    if (b.state === "waiting" || !visible(b.x, 700)) return;
    const t = model.time;
    // Sombra en el piso: crece mientras la vaca cae (anticipa dónde aterriza).
    const air = clamp(b.alt / 1100, 0, 1);
    ellipse(b.x, FLOOR + 4, 300 * (1 - air * 0.55), 26 * (1 - air * 0.5), `rgba(10,0,20,${0.55 - air * 0.25})`);
    if (["hang", "fall"].includes(b.state) || (b.state === "intro" && b.alt > 0)) {
      g.save();
      g.strokeStyle = `rgba(255,70,110,${0.5 + 0.4 * Math.sin(t * 20)})`;
      g.lineWidth = 6;
      g.setLineDash([22, 14]);
      g.beginPath();
      g.ellipse(b.x, FLOOR + 2, COW.halfBody + 20, 30, 0, 0, TAU);
      g.stroke();
      g.setLineDash([]);
      label("⚠", b.x, FLOOR - 40, 46, "#ff6b8a");
      g.restore();
    }
    for (const d of decals) {
      if (!visible(d.x, d.r)) continue;
      g.globalAlpha = Math.min(1, d.life / 2) * 0.7;
      if (d.kind === "scorch") ellipse(d.x, FLOOR + 6, d.r, 12, "#2a0c25");
      else {
        g.strokeStyle = "#1a1416";
        g.lineWidth = 3;
        for (let k = 0; k < 7; k++) {
          const a = (k / 7) * Math.PI;
          g.beginPath();
          g.moveTo(d.x, FLOOR + 6);
          g.lineTo(d.x + Math.cos(a) * d.r * (0.6 + (k % 3) * 0.15) * (k % 2 ? 1 : -1), FLOOR + 6 + Math.sin(a) * 10);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    const y = FLOOR - b.alt;
    if (b.state === "dead") {
      const n = META.death.frames.length,
        i = Math.min(n - 1, Math.floor((b.t / 2.6) * n)),
        m = META.death.frames[i],
        im = assets.cow.cowDeath[i],
        sc = COW.height / META.death.ref;
      g.save();
      g.globalAlpha = b.t > 2.6 ? Math.max(0, 1 - (b.t - 2.6) / 0.6) : 1;
      g.translate(b.x, FLOOR);
      g.scale(b.face === 1 ? -1 : 1, 1);
      g.drawImage(im, m.dx * sc, (m.dy - m.h) * sc, m.w * sc, m.h * sc);
      g.restore();
      if (mode === "play" && fx() && b.t < 1.6 && Math.random() < 0.5) fx2.burst(b.x + (Math.random() - 0.5) * 300, FLOOR - 200 - Math.random() * 300, 6, Math.random() < 0.5 ? "#ff8fd8" : "#ffd27a", 260, "star");
      return;
    }
    const f = cowFrame();
    if (!f.im) return;
    // Estiramiento en el salto y aplastamiento al aterrizar.
    let sy = 1;
    if (!reduced) {
      if (b.state === "rise") sy = 1.08;
      if (b.state === "fall") sy = 1.1;
      if (b.state === "land" && b.t < 0.25) sy = 0.86 + b.t * 0.56;
      if (b.state === "crouch") sy = 0.94 - Math.sin(b.t * 30) * 0.01;
    }
        // Escudo de energía: una burbuja hexagonal cian cuando está blindada; brillo rosa cuando está abierta.
    // Escudo abierto: halo rosa detrás de la vaca (sin filtros costosos).
    if (b.vuln > 0 && b.state !== "intro") {
      g.save();
      g.globalCompositeOperation = "lighter";
      glow(b.x, y - COW.height * 0.45, COW.height * 0.62, `rgba(255,70,180,${0.32 + Math.sin(t * 10) * 0.1})`);
      g.restore();
    }
    g.save();
    if (b.flash > 0) g.filter = "brightness(2) saturate(.6)";
    drawCowImage(f, b.x, y, b.face, sy);
    g.restore();
    const cx = b.x - b.face * 10,
      cy = y - COW.height * 0.48;
    if (b.vuln <= 0 && b.state !== "intro") {
      g.save();
      g.globalAlpha = 0.5 + 0.12 * Math.sin(t * 4);
      g.strokeStyle = "#8fefff";
      g.fillStyle = "rgba(120,230,255,.12)";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(cx, cy, COW.halfBody + 70, COW.height * 0.56, 0, 0, TAU);
      g.fill();
      g.globalAlpha = 0.75 + 0.15 * Math.sin(t * 4);
      g.lineWidth = 5;
      g.stroke();
      // Panal del escudo.
      g.lineWidth = 2;
      g.globalAlpha = 0.22;
      for (let yy = -300; yy < 320; yy += 52)
        for (let xx = -300; xx < 320; xx += 60) {
          const hx = cx + xx + ((yy / 52) % 2 ? 30 : 0),
            hy = cy + yy;
          if (((hx - cx) / (COW.halfBody + 70)) ** 2 + ((hy - cy) / (COW.height * 0.56)) ** 2 > 1) continue;
          g.beginPath();
          for (let k = 0; k < 6; k++) g.lineTo(hx + Math.cos((k / 6) * TAU) * 26, hy + Math.sin((k / 6) * TAU) * 26);
          g.closePath();
          g.stroke();
        }
      g.restore();
    } else if (b.vuln > 0 && b.state !== "intro") {
      // Rótulo sobre la panza, para que nunca quede tapado por el HUD.
      const ly = y - COW.height * 0.42;
      g.save();
      g.font = "900 34px Arial";
      g.textAlign = "center";
      g.lineWidth = 7;
      g.strokeStyle = "#3a0a2a";
      g.strokeText("PUNTO DÉBIL", b.x, ly);
      g.fillStyle = "#ffe6f6";
      g.fillText("PUNTO DÉBIL", b.x, ly);
      rect(b.x - 120, ly + 14, 240, 12, "#3a1030", 6);
      rect(b.x - 120, ly + 14, (240 * b.vuln) / COW.window, 12, "#ff8fd8", 6);
      g.restore();
    }
    // Cañón cargando.
    if (b.state === "charge") {
      const m = model.muzzle(),
        k = b.t / 1.3;
      g.save();
      g.globalCompositeOperation = "lighter";
      glow(m.x, m.y, 40 + k * 110, `rgba(255,120,220,${0.4 + k * 0.5})`);
      glow(m.x, m.y, 20 + k * 30, "rgba(255,255,255,.9)");
      g.restore();
      // Mira láser hacia la botella.
      const p = model.player;
      g.save();
      g.strokeStyle = `rgba(255,80,160,${0.3 + k * 0.5})`;
      g.setLineDash([14, 10]);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(m.x, m.y);
      g.quadraticCurveTo((m.x + p.x) / 2, m.y - 200, p.x, FLOOR - 20);
      g.stroke();
      g.setLineDash([]);
      g.restore();
      ellipse(p.x, FLOOR + 2, 60, 10, `rgba(255,60,140,${0.25 + 0.2 * Math.sin(t * 20)})`);
    }
  }
  function cowballs() {
    const im = assets.cow.cowBall[0];
    for (const h of model.hazards) {
      if (h.kind !== "cowball") continue;
      const hh = 150,
        ww = (im.width / im.height) * hh;
      g.save();
      g.translate(h.x, h.y);
      g.rotate(h.ang + Math.PI);
      g.globalCompositeOperation = "lighter";
      glow(0, 0, 90, "rgba(255,90,200,.45)");
      g.globalCompositeOperation = "source-over";
      // La cabeza de la bola está a la izquierda de la imagen; la cola queda detrás.
      g.drawImage(im, -ww * 0.13, -hh * 0.5, ww, hh);
      g.restore();
      ellipse(h.x, FLOOR + 3, 50 - clamp((FLOOR - h.y) / 12, 0, 40), 8, "rgba(255,60,160,.35)");
    }
  }
  /* ---------- El camión de Granja La Esperanza ----------
     Camión de reparto con caja abierta: la botella sube a la plataforma (92 px) y queda detrás de las barandas. */
  function truckBump() {
    const k = model.truck;
    return k.state === "leave" || k.state === "arrive" ? Math.sin(model.time * 22) * 1.8 : 0;
  }
  function truck() {
    const k = model.truck;
    if (k.state === "off" || !visible(k.x, 600)) return;
    const x = k.x,
      t = model.time,
      deck = FLOOR - 92;
    ellipse(x + 250, FLOOR + 6, 300, 16, "rgba(5,0,15,.5)");
    g.save();
    g.translate(0, truckBump());
    // Chasis con el cartel pintado.
    const side = g.createLinearGradient(0, deck, 0, FLOOR - 30);
    side.addColorStop(0, "#fbf3e2");
    side.addColorStop(1, "#e2d3b6");
    rect(x - 16, deck, 330, 62, side, 6, "#5a3a22");
    for (const [mx, my, r] of [[x + 6, deck + 18, 13], [x + 290, deck + 40, 11], [x + 60, deck + 46, 8], [x + 250, deck + 14, 7]]) ellipse(mx, my, r, r * 0.7, "#2b2420");
    label("GRANJA LA ESPERANZA", x + 150, deck + 30, 22, "#d6336c");
    label("LECHE DE VERDAD · KM 42", x + 150, deck + 50, 11, "#5a3a22");
    // Caja abierta: piso de madera y baranda trasera (las delanteras se dibujan después de la botella).
    rect(x - 16, deck - 8, 330, 12, "#8a5a32", 3, "#4a2c14");
    for (let i = 0; i <= 6; i++) rect(x - 12 + i * 53, deck - 120, 9, 112, "#9b6a3c", 2, "#4a2c14");
    rect(x - 16, deck - 124, 330, 10, "#b07a46", 3, "#4a2c14");
    rect(x - 16, deck - 70, 330, 9, "#a8723f", 3, "#4a2c14");
    // Cabina.
    g.fillStyle = "#d6336c";
    g.beginPath();
    g.moveTo(x + 318, FLOOR - 30);
    g.lineTo(x + 318, FLOOR - 286);
    g.lineTo(x + 432, FLOOR - 286);
    g.lineTo(x + 500, FLOOR - 190);
    g.lineTo(x + 512, FLOOR - 120);
    g.lineTo(x + 512, FLOOR - 30);
    g.closePath();
    g.fill();
    g.strokeStyle = "#5a1a30";
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = "#bfe4ff";
    g.beginPath();
    g.moveTo(x + 340, FLOOR - 268);
    g.lineTo(x + 424, FLOOR - 268);
    g.lineTo(x + 482, FLOOR - 192);
    g.lineTo(x + 340, FLOOR - 192);
    g.closePath();
    g.fill();
    g.fillStyle = "rgba(255,255,255,.45)";
    g.beginPath();
    g.moveTo(x + 360, FLOOR - 262);
    g.lineTo(x + 384, FLOOR - 262);
    g.lineTo(x + 360, FLOOR - 220);
    g.fill();
    // Logo de la vaca en la puerta.
    ellipse(x + 400, FLOOR - 130, 34, 30, "#fff4e6");
    ellipse(x + 388, FLOOR - 138, 9, 7, "#2b2420");
    ellipse(x + 400, FLOOR - 116, 16, 10, "#f7a9c4");
    ellipse(x + 392, FLOOR - 140, 3, 3, "#2b2420");
    ellipse(x + 410, FLOOR - 140, 3, 3, "#2b2420");
    rect(x + 452, FLOOR - 150, 30, 6, "#5a1a30", 3);
    // Paragolpes, faro y luz.
    rect(x + 300, FLOOR - 52, 226, 24, "#3a2a2a", 6);
    rect(x + 500, FLOOR - 110, 18, 16, "#fff3c0", 4);
    g.save();
    g.globalCompositeOperation = "lighter";
    glow(x + 512, FLOOR - 102, 90, "rgba(255,240,180,.6)");
    if (k.state === "wait" && Math.floor(t * 2) % 2) glow(x - 14, FLOOR - 60, 30, "rgba(255,140,40,.9)");
    g.restore();
    for (const wx of [x + 50, x + 230, x + 430]) {
      ellipse(wx, FLOOR - 34, 36, 36, "#1b1b22");
      ellipse(wx, FLOOR - 34, 16, 16, "#9aa0ad");
      const a = -(k.x / 36);
      g.strokeStyle = "#5a5f6b";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(wx + Math.cos(a) * 14, FLOOR - 34 + Math.sin(a) * 14);
      g.lineTo(wx - Math.cos(a) * 14, FLOOR - 34 - Math.sin(a) * 14);
      g.stroke();
    }
    g.restore();
    if (k.state === "leave" && fx() && Math.random() < 0.6) fx2.add({ x: x - 30, y: FLOOR - 40, vx: -80, vy: -30, life: 0.9, max: 0.9, kind: "dot", color: "rgba(200,200,210,.4)", size: 9, grav: -30 });
  }
  /* V10: el dirigible del correo aéreo cruza el cielo al ganar y deja colgando la cuerda del nivel 4. */
  function airship3() {
    if (!model.won || model.winTime < 2) return;
    const k = clamp((model.winTime - 2) / 5.5, 0, 1),
      x = ARENA_CENTER + 1300 - k * 1500,
      y = -330 + Math.sin(model.time * 0.8) * 10;
    g.save();
    g.globalAlpha = Math.min(1, (model.winTime - 2) * 1.5);
    const gr = g.createLinearGradient(0, y - 110, 0, y + 110);
    gr.addColorStop(0, "#f3ead6");
    gr.addColorStop(1, "#8f7a58");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, 420, 115, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#3a2a18";
    g.lineWidth = 4;
    g.stroke();
    g.save();
    g.beginPath();
    g.ellipse(x, y, 420, 115, 0, 0, Math.PI * 2);
    g.clip();
    for (let i = -5; i <= 5; i++) rect(x + i * 84 - 16, y - 130, 32, 260, i % 2 ? "rgba(70,130,190,.55)" : "rgba(255,255,255,.12)");
    g.restore();
    label("CORREO AÉREO", x, y + 8, 30, "#2e5f8a");
    rect(x - 100, y + 104, 200, 46, "#6b4426", 10, "#2a170b");
    g.strokeStyle = "#8a6a3a";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x - 260, y + 90);
    g.quadraticCurveTo(x - 300 + Math.sin(model.time * 1.6) * 30, y + 400, x - 280, FLOOR - 220);
    g.stroke();
    g.restore();
  }
  function truckFront() {
    const k = model.truck;
    if (k.state === "off" || !visible(k.x, 600)) return;
    const x = k.x,
      deck = FLOOR - 92;
    g.save();
    g.translate(0, truckBump());
    // Baranda delantera: tablas con huecos para que se vea a la botella adentro.
    for (const yy of [deck - 46, deck - 92]) rect(x - 16, yy, 330, 12, "#c58a52", 3, "#4a2c14");
    g.restore();
  }
  /* ---------- La botella ---------- */
  function pose(p) {
    const imgs = bridge.sprites;
    let kind = "walk",
      idx = 0,
      h = 142;
    if (p.dead) {
      kind = "break";
      idx = Math.min(7, Math.floor(p.death / 0.15));
    } else if (model.shootPose > 0 && p.crouch < 0.5) {
      kind = model.power.cacao > 0 ? "chocoShoot" : "shoot";
      idx = Math.min(2, Math.floor((0.24 - model.shootPose) * 13));
    } else if (p.state === "crouch") {
      kind = "crouch";
      idx = 2;
      h = 96;
    } else if (["rise", "fall", "apex", "land"].includes(p.state)) {
      kind = "jump";
      idx = p.state === "rise" ? 3 : p.state === "fall" ? 5 : 4;
    } else if (p.state === "run") {
      kind = "run";
      idx = Math.floor(p.phase) % 8;
    } else if (p.state === "skid") {
      kind = "skid";
      idx = 5;
    } else {
      kind = "walk";
      idx = p.state === "walk" ? Math.floor(p.phase) % 8 : 0;
    }
    const im = imgs[kind]?.[idx] || imgs.walk?.[0];
    return im ? { im, kind, h } : null;
  }
  function playerLook(kind) {
    if (model.power.uht > 0) return `hue-rotate(${(model.time * 400) % 360}deg) saturate(1.6) brightness(1.15)`;
    if (model.power.cacao > 0 && kind !== "chocoShoot") return "sepia(.75) saturate(1.5) hue-rotate(-12deg) brightness(.82)";
    if (model.power.cortado > 0) return "sepia(.45) saturate(1.25) brightness(.93)";
    return "none";
  }
  function drawTrail() {
    if (!fx()) return;
    for (const a of trail) {
      const w = (a.im.width / a.im.height) * a.h;
      g.save();
      g.translate(a.x, a.y);
      g.scale(a.face, 1);
      g.globalAlpha = (a.life / 0.24) * 0.42;
      g.filter = a.kind2 === "uht" ? `hue-rotate(${(a.life * 2000) % 360}deg) saturate(3) brightness(1.4)` : a.kind2 === "dash" ? "sepia(1) saturate(4) hue-rotate(290deg) brightness(1.2)" : "brightness(1.6) opacity(.8)";
      g.drawImage(a.im, -w / 2, -a.h, w, a.h);
      g.restore();
    }
  }
  function bottle(p, reflection = false) {
    if (model.truck.state === "board" || model.truck.state === "leave") {
      // Ya está en el camión: se asoma por la caja.
      if (reflection) return;
      const f = pose(p);
      if (!f) return;
      const w = (f.im.width / f.im.height) * 142;
      g.drawImage(f.im, model.truck.x + 150 - w / 2, FLOOR - 92 - 142 + truckBump(), w, 142);
      return;
    }
    if (p.dead && p.death > 1.2) return;
    if (!reflection && p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    const f = pose(p);
    if (!f) return;
    const { im, kind, h } = f;
    const w = (im.width / im.height) * h;
    if (reflection) {
      MilkRenderFinish.reflection(g, im, p, h, FLOOR, model.zone < 3 ? 0.2 : 0.10, playerLook(kind));
      return;
    }
    g.save();
    g.translate(p.x, p.y);
    if (reflection) {
      g.translate(0, (FLOOR - p.y) * 2 + 6);
      g.scale(1, -0.32);
      g.globalAlpha = 0.14;
    }
    if (!reduced && !reflection) {
      if (p.state === "rise") g.scale(0.97, 1.035);
      if (p.state === "land") g.scale(1.08, 0.94);
      if (model.wind && p.crouch < 0.5) g.rotate(model.wind * 0.07 * (p.grounded ? 1 : 0.5));
      if (model.dash > 0) g.rotate(p.face * 0.18);
    }
    g.scale(p.face || 1, 1);
    g.filter = playerLook(kind);
    g.drawImage(im, -w / 2, -h, w, h);
    g.filter = "none";
    if (model.power.cortado > 0 && !p.dead && !reflection) {
      // Manchas de café.
      for (const [x, y, r] of [[-8, -60, 7], [6, -92, 5], [-3, -34, 4]]) ellipse(x, y, r, r * 0.8, "rgba(90,50,24,.75)");
    }
    if (model.hp <= 60 && !p.dead && !reflection) {
      g.strokeStyle = "#3d5460";
      g.lineWidth = 1.7;
      for (let i = 0; i < Math.ceil((61 - model.hp) / 20); i++) {
        g.beginPath();
        g.moveTo(-15 + i * 12, -93);
        g.lineTo(-9 + i * 12, -81);
        g.lineTo(-14 + i * 12, -70);
        g.lineTo(-5 + i * 12, -58);
        g.stroke();
      }
    }
    g.restore();
  }
  function aura(p) {
    if (p.dead) return;
    const x = p.x,
      y = p.y - 70;
    g.save();
    g.globalCompositeOperation = "lighter";
    if (model.power.uht > 0) glow(x, y, 120, `hsla(${(model.time * 400) % 360},100%,70%,.4)`);
    if (model.power.cacao > 0) glow(x, y, 90, "rgba(185,119,61,.2)");
    if (model.power.reflector > 0) {
      glow(x, y, 210 + Math.sin(model.time * 3) * 10, "rgba(255,245,190,.22)");
      glow(x + p.face * 12, y - 40, 26, "rgba(255,255,230,.9)");
    }
    g.restore();
    if (model.power.cookie > 0) {
      const a = model.time * 3;
      g.save();
      g.translate(x + Math.cos(a) * 46, y + Math.sin(a) * 18);
      MilkDesigns.draw(g, "galletita", model.time, 0, 9, { w: 18, h: 18 });
      g.restore();
    }
    if (model.power.straw > 0) {
      g.save();
      g.translate(x - p.face * 26, y - 30);
      g.rotate(-p.face * 0.3);
      MilkDesigns.draw(g, "pajita", model.time, 0, 12, { w: 14, h: 26 });
      g.restore();
    }
  }
  function shieldBubble(p) {
    if (!model.shield || p.dead) return;
    const x = p.x,
      y = p.y - 70,
      r = 86 + Math.sin(model.time * 4) * 3;
    g.save();
    const gr = g.createRadialGradient(x, y, r * 0.7, x, y, r);
    gr.addColorStop(0, "rgba(120,200,255,0)");
    gr.addColorStop(0.85, "rgba(120,200,255,.22)");
    gr.addColorStop(1, "rgba(170,225,255,.6)");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, r * 0.62, r, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  /* Oscuridad de callejón y alturas: la tapa reflectora abre el círculo de luz. */
  function darkness() {
    if (!weatherOn()) return;
    const z = model.zone,
      p = model.player;
    let amount = z === 2 ? 0.55 : z === 6 ? 0.35 : z === 7 ? 0.42 : 0;
    if (z === 2) amount *= clamp((p.x - 2 * STRIDE) / 200, 0, 1);
    if (!amount || model.boss.state !== "waiting") return;
    const s = toScreen(p.x, p.y - 80),
      R = model.power.reflector > 0 ? 520 : 300;
    const grad = g.createRadialGradient(s.x, s.y, 60, s.x, s.y, R);
    grad.addColorStop(0, "rgba(3,2,12,0)");
    grad.addColorStop(0.5, `rgba(3,2,12,${amount * 0.35})`);
    grad.addColorStop(1, `rgba(3,2,12,${amount})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  function weatherFront() {
    if (!weatherOn() || !fx()) return;
    const ws = -model.wind;
    if (ws > 0.05) {
      g.save();
      g.strokeStyle = `rgba(230,240,255,${0.25 * ws})`;
      g.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        const y = 80 + ((i * 47) % 440),
          x = ((((i * 211 - model.time * 1400) % 1500) + 1500) % 1500) - 100,
          len = 60 + (i % 4) * 30;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + len / 2, y - 6, x + len, y + Math.sin(i) * 4);
        g.stroke();
      }
      g.restore();
    }
    for (const d of debris) {
      g.save();
      g.translate(d.x, d.y);
      g.rotate(d.rot);
      if (d.kind === "bag") {
        g.scale(1, 0.6 + Math.abs(Math.sin(d.t * 6)) * 0.5);
        g.fillStyle = "rgba(245,245,240,.85)";
        g.fillRect(-12, -10, 24, 22);
        g.fillStyle = "#d62839";
        g.fillRect(-6, -2, 12, 5);
      } else if (d.kind === "flyer") {
        // Volante «SE BUSCA» de la botella.
        g.scale(Math.abs(Math.sin(d.t * 3)) + 0.25, 1);
        g.fillStyle = "rgba(240,224,190,.95)";
        g.fillRect(-10, -13, 20, 26);
        g.fillStyle = "#b01d24";
        g.fillRect(-7, -10, 14, 3);
        g.fillStyle = "#e9eef5";
        g.fillRect(-3, -5, 6, 13);
      } else if (d.kind === "paper") {
        g.scale(Math.abs(Math.sin(d.t * 4)) + 0.2, 1);
        g.fillStyle = "rgba(240,232,210,.9)";
        g.fillRect(-7, -9, 14, 18);
      } else {
        g.fillStyle = ["#a07a3a", "#7f8f3c", "#b8642c"][Math.floor(d.t) % 3];
        g.beginPath();
        g.ellipse(0, 0, 7, 3.5, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }
    if (lightning > 0) {
      const a = lightning > 0.3 ? 0.3 : lightning > 0.22 ? 0.05 : lightning > 0.12 ? 0.2 : lightning;
      g.fillStyle = `rgba(215,230,255,${a})`;
      g.fillRect(0, 0, W, H);
    }
  }
  function drawDust() {
    for (const d of dust) {
      g.globalAlpha = Math.min(1, d.life);
      if (d.bolt) {
        g.save();
        g.translate(d.x, d.y);
        g.rotate(d.rot);
        rect(-7, -3, 14, 6, "#8b8f99", 2);
        rect(-3, -6, 6, 12, "#6b6f79", 1);
        g.restore();
      } else ellipse(d.x, d.y, d.r, d.r, "#d9cbb8");
    }
    g.globalAlpha = 1;
  }
  function drawFlyers() {
    for (const f of flyers) {
      const k = f.t / f.dur,
        e = 1 - Math.pow(1 - k, 3),
        x = f.x + (f.tx - f.x) * e,
        y = f.y + (f.ty - f.y) * e - Math.sin(k * Math.PI) * 90,
        s = 1 - k * 0.5;
      g.save();
      g.translate(x, y);
      g.scale(s, s);
      g.globalAlpha = Math.min(1, (1 - k) * 4);
      ellipse(0, 0, 10, 13, "#7e5624");
      ellipse(0, -1, 8, 11, "#f3cf7a");
      g.restore();
    }
  }
  function render() {
    if (!assets || !model) return;
    const p = model.player;
    g.save();
    if (fx2 && fx2.kick > 0 && shakeOn()) shake = Math.max(shake, fx2.kick);
    if (shake > 0 && shakeOn()) {
      // Temblor fuerte con rotación leve cuando aterriza la vaca.
      const amp = shake > 0.4 ? 30 : 18;
      g.translate(Math.sin(model.time * 80) * shake * amp, Math.cos(model.time * 71) * shake * amp * 0.75);
      if (quake > 0.2) {
        g.translate(640, 360);
        g.rotate(Math.sin(model.time * 60) * 0.012 * quake);
        g.translate(-640, -360);
      }
    }
    background();
    g.save();
    const zp = fx2 && fxOpts().impact ? fx2.zoomPunch : 0,
      z = camera.zoom + zp;
    g.translate(640, FLOOR);
    g.scale(z, z);
    g.translate(-640, -FLOOR);
    g.save();
    g.translate(-camera.x, -camera.y);
    vents();
    for (const b of model.platforms) {
      platform(b);
      if (visible(b.x,b.w) && model.neonOn(b)) MilkRenderFinish.edge(g,b,model.zone < 9 ? 'rgba(197,215,255,.45)' : 'rgba(255,224,174,.52)');
    }
    flags();
    for (const i of model.items) item(i);
    for (const e of model.enemies) enemy(e);
    boss();
    airship3();
    cat();
    MilkRenderFinish.contact(g, p, model.platformsNow, FLOOR);
    bottle(p, true);
    drawTrail();
    aura(p);
    bottle(p);
    shieldBubble(p);
    for (const b of model.bullets) {
      ellipse(b.x, b.y, b.cacao ? 13 : 11, 7, b.cacao ? "#ad7547" : "#fff4dc");
      ellipse(b.x - Math.sign(b.vx) * 9, b.y, 7, 4, b.cacao ? "#654328" : "#dceae7");
    }
    cowballs();
    g.restore();
    if (fx2) fx2.drawWorld(g, camera.x, camera.y);
    g.restore();
    if (fx() && weatherOn()) MilkRenderFinish.atmosphere(g, model.zone, model.time, camera.x, true);
    darkness();
    weatherFront();
    drawDust();
    g.restore();
    const vignette = g.createRadialGradient(W / 2, H * 0.44, 220, W / 2, H * 0.5, 790);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, model.zone < 9 ? "rgba(6,2,24,.4)" : "rgba(40,16,30,.2)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);
    if (fx2) {
      if (fx2.iris.target > 1000) {
        const s = toScreen(p.x, p.y - 70);
        fx2.iris.x = s.x;
        fx2.iris.y = s.y;
      }
      fx2.screen(g, { temp: 0, cold: false, hp: model.hp, dead: p.dead, uht: model.power.uht > 0, t: model.time });
    }
    drawFlyers();
    if (zoneTime > 0 && model.boss.state === "waiting") {
      const a = Math.min(1, zoneTime, (3.4 - zoneTime) * 2);
      g.save();
      g.globalAlpha = a;
      // Rótulo de barrio centrado, como un cartel de neón que se enciende.
      const wv = 460;
      rect(W / 2 - wv / 2, 196, wv, 74, "rgba(12,6,30,.72)", 10, "rgba(255,127,192,.45)");
      label(SECTIONS[Math.min(3, Math.floor(model.zone / 3))] + " · BARRIO " + (model.zone + 1) + "/12", W / 2, 222, 11, "#ff9fd0");
      label(NAMES[model.zone], W / 2, 254, 26, "#fff0fa");
      g.restore();
    }
    // Título de la pelea.
    const b = model.boss;
    if (b.state === "intro" && b.t > 1.8 && b.t < 3.9) {
      const a = Math.min(1, (b.t - 1.8) * 3, (3.9 - b.t) * 3);
      g.save();
      g.globalAlpha = a;
      rect(0, 270, W, 140, "rgba(20,0,20,.6)");
      label("JEFA DEL NIVEL 3", W / 2, 312, 16, "#ff9fd0");
      g.font = "900 64px Arial";
      g.textAlign = "center";
      g.fillStyle = "#fff";
      g.fillText("LA VACA MECÁNICA", W / 2 + (1 - a) * 80, 376);
      g.restore();
    }
  }
  window.MilkLevel3 = {
    configure(b) {
      bridge = b;
    },
    start,
    stop,
    pause,
    resume,
    get state() {
      return model
        ? {
            mode,
            zone: model.zone,
            hp: model.hp,
            clock: model.clock,
            player: { ...model.player },
            camera: { ...camera },
            score: model.score,
            coins: model.coins,
            checkpoint: model.checkpointIndex,
            boss: { ...model.boss },
            cat: { ...model.cat },
            truck: { ...model.truck },
            won: model.won,
            power: { ...model.power },
            music: musicName,
            assets: assets?.tiles.length || 0,
          }
        : null;
    },
    get dev() {
      return /[?&]dev\b/.test(location.search)
        ? {
            get model() {
              return model;
            },
            warp(x, y = FLOOR) {
              model.player.reset(x, y);
              camera.x = clamp(x - 330, 0, CAM_MAX);
              camera.y = 0;
            },
            set(k, v) {
              model[k] = v;
            },
            collect(kind) {
              const i = model.items.find((i) => i.kind === kind && !i.taken);
              if (i) model.collect(i);
            },
            event,
          }
        : null;
    },
  };
  window.MilkLevels = window.MilkLevels || {};
  window.MilkLevels[3] = { start };
})();
