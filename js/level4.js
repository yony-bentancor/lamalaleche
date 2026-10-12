/* Nivel 4 · «Por las nubes». Presentación, ciclo de vida, HUD, cámara, luces y efectos.
   Toda la lógica (paraguas, viento, corrientes, rayos, enemigos y el Capitán Cúmulo) vive en level4-core.js. */
(() => {
  "use strict";
  const C = MilkLevel4Core,
    { FLOOR, STRIDE, WIDTH, NAMES, SECTIONS, ARENA_X, ARENA_RIGHT, ARENA_CENTER, CAM_MAX, GAPS, UPDRAFTS, GUST_ZONE, SUCTION_ZONE, STORM_ZONES, RAIN_ZONES, UMB } = C,
    W = 1280,
    H = 720,
    SAVE_KEY = "milk-v10-level4",
    PROGRESS_KEY = "milk-v10-progress",
    ARENA_ZOOM = 0.7,
    META = window.MilkLevel4Meta,
    FLOORS = window.MilkLevel4Floors,
    BOSS_SCALE = 0.86,
    UMB_SCALE = 142 / META.umbRef;
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
    flash = 0,
    noticeTime = 0,
    zone = -1,
    zoneTime = 0,
    hudTime = 0,
    trail = [],
    trailTick = 0,
    flyers = [],
    debris = [],
    rainDrops = [],
    hpFlash = 0,
    lastSkid = 0,
    deathIris = false,
    seen = new Set(),
    musicName = "",
    airship = { x: 1250, y: -30, v: 0 };
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
  const shakeOn = () => bridge.settings.shake && !reduced;
  const visible = (x, w = 100) => x + w > view.l && x - w < view.r;
  const toScreen = (x, y) => ({ x: (x - camera.x - 640) * camera.zoom + 640, y: (y - camera.y - FLOOR) * camera.zoom + FLOOR });
  function clear() {
    held.clear();
    touch.clear();
    jump = false;
    shot = false;
    host?.querySelectorAll(".pressed").forEach((b) => b.classList.remove("pressed"));
  }
  /* ---------- Carga: 13 fondos, paraguas y Capitán ---------- */
  function makeTile(img, row, first) {
    const tile = document.createElement("canvas");
    tile.width = W;
    tile.height = H;
    const t = tile.getContext("2d");
    // La fila del piso de cada ilustración cae en el piso del juego.
    t.drawImage(img, 0, 0, img.width, row, 0, 0, W, FLOOR);
    t.drawImage(img, 0, row, img.width, img.height - row, 0, FLOOR, W, H - FLOOR);
    const ground = document.createElement("canvas");
    ground.width = W;
    ground.height = 196;
    const gg = ground.getContext("2d");
    gg.drawImage(tile, 0, -FLOOR + 96);
    gg.globalCompositeOperation = "destination-in";
    let f = gg.createLinearGradient(0, 0, 0, ground.height);
    f.addColorStop(0, "transparent");
    f.addColorStop(0.22, "black");
    f.addColorStop(0.85, "black");
    f.addColorStop(1, "transparent");
    gg.fillStyle = f;
    gg.fillRect(0, 0, W, ground.height);
    if (!first) {
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
    // Color del cielo bajo el piso: se usa para pintar los huecos.
    let sky = "rgb(150,180,220)",
      deep = "rgb(60,80,130)";
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const x = c.getContext("2d");
      x.drawImage(img, 200, 150, 1200, 200, 0, 0, 1, 1);
      const d = x.getImageData(0, 0, 1, 1).data;
      sky = `rgb(${d[0]},${d[1]},${d[2]})`;
      deep = `rgb(${(d[0] * 0.45) | 0},${(d[1] * 0.5) | 0},${(d[2] * 0.7) | 0})`;
    } catch {}
    return { tile, ground, sky, deep };
  }
  function load() {
    if (assets) return Promise.resolve(assets);
    if (loading) return loading;
    loading = (async () => {
      const a = { bg: [], art: {}, tiles: [], ground: [], sky: [], deep: [], abyss: [] };
      let count = 0;
      const total = 13 + Object.values(MilkLevel4Assets).reduce((s, v) => s + v.length, 0);
      const im = (src) =>
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => {
            count++;
            if ($("l4loadProgress")) $("l4loadProgress").value = count / total;
            resolve(i);
          };
          i.onerror = () => reject(Error("No se pudo cargar " + src));
          i.src = src;
        });
      const names = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).concat(["12b"]);
      await Promise.all([
        ...names.map((n, i) => im(`assets/level4/bg-${n}.webp`).then((v) => (a.bg[i] = v))),
        ...Object.entries(MilkLevel4Assets).map(async ([k, files]) => (a.art[k] = await Promise.all(files.map((f) => im("assets/level4/" + f))))),
      ]);
      for (let i = 0; i < 13; i++) {
        const r = makeTile(a.bg[i], FLOORS[i], i === 0);
        a.tiles.push(r.tile);
        a.abyss.push(MilkGapBackdrop.build(r.tile, i, W, H, FLOOR));
        a.ground.push(r.ground);
        a.sky.push(r.sky);
        a.deep.push(r.deep);
      }
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
    if ($("l4notice") && t) {
      $("l4notice").textContent = t;
      noticeTime = 4.2;
    }
  }
  /* ---------- DOM ---------- */
  function mount() {
    host = document.createElement("section");
    host.id = "level4";
    host.setAttribute("aria-label", "Nivel 4: Por las nubes");
    const marks = C.build()
      .flags.map((f) => `<b style="left:${((f.x / WIDTH) * 100).toFixed(1)}%"></b>`)
      .join("");
    host.innerHTML = `<div class="l4stage"><canvas id="l4canvas" width="1280" height="720" tabindex="0" aria-label="Juego de plataformas: cruzá el cielo con el paraguas"></canvas>
 <header class="l4hud"><div class="l4identity"><span id="l4section">POR LAS NUBES / NIVEL 04</span><strong id="l4place">El último techo</strong><div class="l4track"><i id="l4trackFill"></i>${marks}<em>⚙</em></div></div>
 <div class="l4status"><div class="l4health"><span id="l4condition">LECHE ENTERA</span><strong id="l4hp">100%</strong><div><i id="l4hpFill"></i></div></div><div class="l4alt" id="l4alt"><span>ALTITUD</span><strong id="l4altValue">180 m</strong><div><i id="l4windFill"></i></div><small id="l4windText">CALMA</small></div><button id="l4mute" aria-label="Silenciar sonido">♫</button><button id="l4pause" aria-label="Pausar juego">Ⅱ</button></div></header>
 <div class="l4sub"><span>◈ <b id="l4coins">0</b></span><span>⚑ <b id="l4flags">0/4</b></span><span id="l4score">000000</span><span id="l4powers"></span></div>
 <div id="l4fly" hidden><span>☂ VUELO</span><div><i id="l4flyFill"></i></div><small>Mantené ↑ con el paraguas abierto</small></div>
 <div id="l4bossHud" hidden><span><em>CAPITÁN CÚMULO</em> <b id="l4bossPct">100%</b></span><div><i id="l4bossFill"></i></div><small id="l4bossTip"></small><div class="l4phases"><b id="l4ph1">I</b><b id="l4ph2">II</b><b id="l4ph3">III</b></div></div>
 <div id="l4windWarn" hidden>≋ ¡RÁFAGA! <b>Agachate</b></div>
 <div id="l4notice" role="status" aria-live="polite"></div><div class="l4controlsHint">← → MOVER <span>SHIFT CORRER</span><span>ESPACIO SALTAR · MANTENÉ: PARAGUAS</span><span>↑ VOLAR (ARENA)</span><span>↓ AGACHARSE</span><span>X LECHE</span><span>ESC PAUSA</span></div>
 <div id="l4touch"><div><button data-k="ArrowLeft" aria-label="Izquierda">◀</button><button data-k="ArrowRight" aria-label="Derecha">▶</button><button data-k="ArrowDown" aria-label="Agacharse">↓</button></div><div><button data-k="ArrowUp" aria-label="Volar">↑</button><button data-k="ShiftLeft">CORRER</button><button data-k="KeyX">LECHE</button><button data-k="Space">SALTAR</button></div></div>
 <div id="l4overlay" class="l4overlay"><div class="l4panel"><span class="l4eyebrow">NIVEL 04 · POR ENCIMA DE LOS TECHOS</span><h2>Por las<br>nubes<span>.</span></h2><p id="l4loadText">Inflando el paraguas…</p><progress id="l4loadProgress" max="1" value="0"></progress></div></div></div>`;
    document.body.append(host);
    canvas = $("l4canvas");
    g = canvas.getContext("2d", { alpha: false });
    $("l4pause").onclick = () => pause();
    $("l4mute").onclick = toggleSound;
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
  function fit() {
    if (!host) return;
    host.querySelector(".l4stage").style.setProperty("--s", Math.min(innerWidth / W, innerHeight / H));
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
  const KEYS = ["Escape", "KeyP", "KeyM", "KeyF", "Space", "KeyZ", "KeyX", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyD", "KeyS", "KeyW", "ShiftLeft", "ShiftRight"];
  function keydown(e) {
    if (mode === "off" || mode === "cinematic") return;
    if (e.code === "Tab" && (mode === "pause" || mode === "complete")) {
      const btns = [...$("l4overlay").querySelectorAll("button,input")];
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
    shake = 0;
    flash = 0;
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
    const o = $("l4overlay");
    o.hidden = false;
    o.innerHTML = `<div class="l4panel" role="dialog" aria-modal="true" aria-labelledby="l4pauseTitle"><span class="l4eyebrow">EL VIENTO TAMBIÉN DESCANSA</span><h2 id="l4pauseTitle">En pausa<span>.</span></h2><p>Mantené SALTAR en el aire para abrir el paraguas. Las corrientes te suben; las ráfagas se resisten agachada.</p><button class="l4primary" id="l4resume">SEGUIR JUGANDO →</button><button id="l4retry">Volver al último checkpoint</button><label>Sonido <input type="checkbox" id="l4soundOpt" ${bridge.settings.sound ? "checked" : ""}></label><label>Efectos ambientales <input type="checkbox" id="l4fxOpt" ${bridge.settings.effects ? "checked" : ""}></label><label>Música de fondo <input type="checkbox" id="l4musicOpt" ${bridge.settings.ambient !== false ? "checked" : ""}></label><label>Lluvia, rayos y nubes <input type="checkbox" id="l4weatherOpt" ${weatherOn() ? "checked" : ""}></label><label>Temblor de pantalla <input type="checkbox" id="l4shakeOpt" ${bridge.settings.shake ? "checked" : ""}></label><label>Volumen <input id="l4volume" type="range" min="0" max="100" value="${bridge.settings.volume}"></label><button id="l4home">Volver al inicio</button></div>`;
    $("l4resume").onclick = resume;
    $("l4retry").onclick = () => {
      model.reset(model.saved);
      resetView();
      resume();
    };
    $("l4home").onclick = stop;
    $("l4soundOpt").onchange = toggleSound;
    const opt = (id, key) =>
      ($(id).onchange = (e) => {
        bridge.settings[key] = e.target.checked;
        bridge.saveSettings();
      });
    opt("l4fxOpt", "effects");
    opt("l4musicOpt", "ambient");
    opt("l4weatherOpt", "weather");
    opt("l4shakeOpt", "shake");
    $("l4volume").oninput = (e) => {
      bridge.settings.volume = +e.target.value;
      bridge.saveSettings();
    };
    $("l4resume").focus();
  }
  function resume() {
    if (mode !== "pause") return;
    clear();
    mode = "play";
    $("l4overlay").hidden = true;
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
      $("l4loadText").textContent = e.message + " · Volvé a descomprimir el ZIP completo.";
      const b = document.createElement("button");
      b.textContent = "Volver al inicio";
      b.onclick = stop;
      $("l4overlay").querySelector(".l4panel").append(b);
      return;
    }
    if (!host) return;
    const save = payload.resume ? saved() : null;
    model = new C.Level4(save);
    if (!save && payload.score) {
      model.score = payload.score;
      model.saved = model.snapshot();
    }
    fx2 = new MilkFX();
    resetView();
    airship = { x: 1250, y: -30, v: 0 };
    fx2.iris.r = 0;
    fx2.irisTo(model.player.x - camera.x, model.player.y - 70, 2000);
    noticeTime = 0;
    acc = 0;
    seen = new Set();
    bridge.activate();
    mode = "play";
    $("l4overlay").hidden = true;
    canvas.focus();
    notice(save ? "Retomás desde tu última bandera." : "Un dirigible de reparto baja una cuerda… ¡Saltá para engancharte! O mantené SALTAR en el aire: tu etiqueta se vuelve paraguas.");
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
  /* ---------- Eventos: sonido, partículas y avisos ---------- */
  const fxOpts = () => ({ effects: fx(), impact: bridge.settings.impact !== false && !reduced });
  const ITEM_TEXT = {
    refill: "RECARGA COMPLETA · Energía, vuelo y paraguas como nuevos",
    shield: "TAPA ESCUDO",
    cacao: "CHOCOLATADA · Tu leche pega el doble, también al Capitán",
    uht: "UHT · INVENCIBLE",
    cookie: "GALLETITA · Doble salto: saltá otra vez en el aire",
    straw: "PAJITA · En el aire, CORRER te da un impulso",
  };
  function hudPoint(id) {
    const el = $(id),
      st = host?.querySelector(".l4stage");
    if (!el || !st) return { x: 640, y: 40 };
    const a = el.getBoundingClientRect(),
      b = st.getBoundingClientRect(),
      k = W / b.width;
    return { x: (a.left + a.width / 2 - b.left) * k, y: (a.top + a.height / 2 - b.top) * k };
  }
  function fly(wx, wy, target) {
    if (!fx()) return;
    const to = hudPoint(target),
      from = toScreen(wx, wy);
    flyers.push({ x: from.x, y: from.y, tx: to.x, ty: to.y, t: 0, dur: 0.75 });
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
        fx2.burst(e.x, e.y, e.type === "hardland" ? 14 : 5, "#e8eef5", 70, "dot", { grav: 300 });
        bridge.sound(e.type);
        break;
      case "skid":
        if (model.time - lastSkid > 0.6) bridge.play("skid");
        lastSkid = model.time;
        break;
      case "shoot":
        bridge.play("shoot", { cacao: model.power.cacao > 0 });
        fx2.burst(e.x + p.face * 35, e.y + (e.glide ? 16 : 0), 4, model.power.cacao > 0 ? "#b87c47" : "#fff4d9", 70);
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
      case "fall":
        bridge.play("whoosh", { down: true });
        fx2.burst(e.x, FLOOR + 40, 18, "#ffffff", 160, "dot", { grav: -40 });
        hint("fall", "¡Cuidado con los huecos! Cada caída quita 15%. Mantené SALTAR para planear.");
        break;
      case "recover":
        fx2.ring(e.x, e.y - 70, "#bfe6ff", 70, 3);
        break;
      case "collect":
        if (e.kind === "coin") {
          bridge.play("drop");
          fx2.event({ type: "drop", x: e.x, y: e.y }, o);
          fly(e.x, e.y, "l4coins");
        } else {
          bridge.play(e.kind === "refill" ? "refill" : "power");
          notice(ITEM_TEXT[e.kind] || "");
          if (e.kind === "refill") {
            fx2.flash = { a: 0.4, color: "#e6fff2" };
            fx2.ring(p.x, p.y - 70, "#9ff0c6", 110, 4);
            fx2.text(p.x, p.y - 170, "ENERGÍA 100%", "#bff7d9", 26);
            hpFlash = 1;
          } else if (["cacao", "uht", "shield"].includes(e.kind)) fx2.event({ type: "power", kind: e.kind, x: p.x, y: p.y - 80 }, o);
          else {
            const col = { cookie: "#e3b06a", straw: "#ff7fa8" }[e.kind] || "#ffffff";
            fx2.flash = { a: 0.3, color: col };
            fx2.confetti(p.x, p.y - 80, 20);
            fx2.ring(p.x, p.y - 70, col, 100, 4);
          }
        }
        break;
      case "checkpoint":
        safeSave(e.snapshot);
        bridge.play("checkpoint");
        fx2.event({ type: "checkpoint", x: e.x, y: FLOOR }, o);
        notice("Boya " + (e.index + 1) + "/4 · Partida guardada, energía y paraguas recargados.");
        break;
      case "points":
        fx2.event({ type: "points", x: e.x, y: e.y, value: e.value, label: e.label }, o);
        break;
      case "stomp":
        bridge.play(e.kind === "cloud" ? "spring" : "stomp");
        fx2.event({ type: "stomp", x: e.x, y: e.y, combo: e.combo || 1 }, o);
        if (e.kind === "cloud") hint("cloudbounce", "¡El nubarrón rebota! Usalo como trampolín.");
        break;
      case "hit":
        bridge.play("enemyhit");
        fx2.event({ type: "enemyhit", x: e.x, y: e.y }, o);
        break;
      case "pop":
        bridge.play(e.kind === "balloon" ? "pop" : e.kind === "drone" ? "robotdown" : "enemydeath", { soft: false });
        if (e.kind === "balloon") {
          fx2.burst(e.x, e.y, 22, "#e46d4a", 240, "shard");
          fx2.ring(e.x, e.y, "#ffd2a0", 70, 3);
        } else if (e.kind === "spark") fx2.burst(e.x, e.y, 18, "#fff6a8", 220, "star");
        else if (e.kind === "cloud") fx2.burst(e.x, e.y, 22, "#c9cfde", 140, "dot", { grav: -30 });
        else fx2.event({ type: "enemydeath", x: e.x, y: e.y, type2: e.kind }, o);
        if (o.impact) fx2.hitstop = Math.max(fx2.hitstop, 0.05);
        break;
      case "shield":
        bridge.play("shieldbreak");
        fx2.event({ type: "shieldbreak", x: p.x, y: p.y - 80 }, o);
        break;
      case "powerend":
        if (e.kind !== "torn") {
          bridge.play("powerend");
          fx2.event({ type: "powerend", x: e.x, y: e.y }, o);
        } else notice("El paraguas se volvió a tensar.");
        break;
      case "doublejump":
        bridge.play("doublejump");
        fx2.ring(e.x, e.y, "#f3c98a", 55, 3);
        break;
      case "dash":
        bridge.play("dash");
        fx2.ring(e.x, e.y, "#ff9fc0", 70, 4);
        break;
      case "umbopen":
        bridge.play("umbopen");
        fx2.burst(e.x, e.y, 8, "#bfe0ff", 120, "dot", { grav: 200 });
        hint("umb", "¡PARAGUAS! Mientras mantengas SALTAR, planeás. Soltá para caer rápido.");
        break;
      case "umbclose":
        bridge.play("umbclose");
        break;
      case "umbtorn":
        bridge.play("crumble");
        fx2.burst(e.x, e.y, 16, "#9ccfff", 200, "shard");
        notice("¡El rayo rompió el paraguas! Frena menos durante unos segundos.");
        break;
      case "updraft":
        bridge.play("updraft");
        notice(e.kind === "fan" ? "HÉLICES · Abrí el paraguas sobre el hueco: el aire te sube." : "CORRIENTE ASCENDENTE · Abrí el paraguas encima y subís.");
        break;
      case "windwarn":
        bridge.play("wind");
        hint("gust" + model.zone, model.zone === SUCTION_ZONE ? "La tormenta aspira hacia adelante: frená antes de los huecos." : "¡Ráfaga! Mirá las mangas de viento. Agachate en el piso; en el aire, el paraguas te empuja hacia atrás.");
        break;
      case "strikewarn":
        bridge.play("strikewarn");
        break;
      case "lightning":
        bridge.play("crack");
        flash = Math.max(flash, 0.55);
        if (shakeOn()) shake = Math.max(shake, 0.22);
        fx2.burst(e.x, FLOOR - 6, 20, "#e6dcff", 260, "star", { grav: 600 });
        hint("storm", "RAYOS · Un círculo marca dónde cae. Escondete bajo los techitos de madera.");
        break;
      case "ropegrab":
        bridge.play("rope");
        fx2.ring(e.x, e.y, "#ffffff", 60, 3);
        break;
      case "ropedrop":
        notice("¡A bordo! La pasarela cuelga del dirigible. Las cargas se mecen: medí el salto.");
        break;
      case "puff":
        bridge.play("puff");
        fx2.burst(e.x, e.y, 22, "#ffffff", 120, "dot", { grav: -60 });
        hint("sink", "Algunas nubes se hunden y se deshacen al pisarlas. No te quedes quieta.");
        break;
      case "crumble":
        bridge.play("crumble");
        fx2.burst(e.x, e.y, 14, "#7a5a3a", 160, "shard", { grav: 900 });
        hint("crumble", "Los tablones viejos ceden después de pisarlos.");
        break;
      case "raindrop":
        if (Math.random() < 0.4) bridge.play("block");
        break;
      case "block":
        bridge.play("block");
        fx2.burst(e.x, e.y, 5, "#bfe6ff", 90, "dot");
        break;
      case "zap":
        bridge.play("zap");
        break;
      case "caw":
        bridge.play("caw");
        break;
      case "hail":
        bridge.play("hail");
        notice("¡GRANIZO! El paraguas abierto te protege.");
        break;
      case "hailhit":
        fx2.burst(e.x, FLOOR - 4, 5, "#e8f6ff", 100, "shard", { grav: 700 });
        break;
      case "splash":
        fx2.burst(e.x, FLOOR - 4, 6, "#9fd2ff", 80, "dot", { grav: 500 });
        break;
      case "bossintro":
        bridge.play("alarm");
        notice("La tormenta gira… ¡EL CAPITÁN CÚMULO!");
        break;
      case "bosscharge":
        bridge.play("beamcharge");
        if (!e.quick) hint("beam", "RAYO CARGANDO · Te apunta a tu altura. Cuando destelle, cambiá de altura: saltá o volá.");
        break;
      case "beamlock":
        bridge.play("warn");
        break;
      case "beam":
        bridge.play("beamfire");
        flash = Math.max(flash, 0.25);
        if (shakeOn()) shake = Math.max(shake, 0.35);
        break;
      case "bosshot":
        bridge.play("popitem");
        fx2.text(e.x, e.y - 160, "¡CAÑONES RECALENTADOS! ×2", "#ffb08a", 24);
        break;
      case "bossgust":
        bridge.play("propeller");
        bridge.play("wind");
        hint("bossgust", "¡La hélice del Capitán sopla! Agachate o abrí el paraguas contra el viento.");
        break;
      case "bossphase":
        bridge.play("alarm");
        if (shakeOn()) shake = Math.max(shake, 0.4);
        notice(e.phase === 2 ? "FASE II · Granizo y ráfagas. El rayo cambia de color." : "FASE III · ¡Rayos de la tormenta y doble descarga!");
        break;
      case "bosshit":
        bridge.play("enemyhit");
        fx2.burst(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, e.hot ? 12 : 7, e.hot ? "#ffb08a" : "#fff4d9", 160);
        break;
      case "armor":
        bridge.play("armor");
        break;
      case "bossdeath":
        bridge.play("robotdown");
        fx2.flash = { a: 0.55, color: "#ffffff" };
        fx2.slow = 1.2;
        if (shakeOn()) shake = Math.max(shake, 0.8);
        break;
      case "victory":
        bridge.play("victory");
        fx2.event({ type: "victory", x: e.x, y: e.y }, o);
        notice("¡GANASTE! La tormenta se disipa… allá abajo está Granja La Esperanza.");
        try {
          localStorage.setItem(PROGRESS_KEY, JSON.stringify({ completedLevel: 4, nextLevel: 5, score: model.score }));
          localStorage.removeItem(SAVE_KEY);
        } catch {}
        break;
      case "firework":
        bridge.play("pop", { soft: true });
        fx2.burst(e.x, e.y, 40, ["#ffd23f", "#9fe8ff", "#ffffff"][Math.floor(model.time * 7) % 3], 260, "star", { grav: 120 });
        break;
    }
  }
  /* ---------- HUD ---------- */
  function updateHUD() {
    if (!model || !host) return;
    const m = model,
      p = m.player,
      P = m.power,
      T = C.POWER_TIME;
    $("l4place").textContent = NAMES[m.zone];
    $("l4section").textContent = SECTIONS[Math.min(3, Math.floor(m.zone / 3))] + " · NIVEL 04";
    $("l4hp").textContent = Math.ceil(m.hp) + "%";
    $("l4hpFill").style.width = m.hp + "%";
    $("l4condition").textContent = m.hp <= 30 ? "A PUNTO DE ROMPERSE" : m.hp <= 60 ? "VIDRIO ASTILLADO" : "LECHE ENTERA";
    $("l4hpFill").style.background = m.hp <= 30 ? "#ef8675" : "#ecdbb6";
    $("l4altValue").textContent = m.altitude.toLocaleString("es") + " m";
    const w = m.wind;
    $("l4windFill").style.width = Math.min(100, Math.abs(w) * 100) + "%";
    $("l4windFill").style.marginLeft = w < 0 ? "auto" : "0";
    $("l4windText").textContent = m.windWarn ? "¡RÁFAGA EN CAMINO!" : Math.abs(w) < 0.08 ? "CALMA" : (w < 0 ? "← VIENTO EN CONTRA " : "VIENTO A FAVOR → ") + Math.round(Math.abs(w) * 100) + "%";
    $("l4alt").classList.toggle("warn", m.windWarn || Math.abs(w) > 0.5);
    $("l4trackFill").style.width = (p.x / WIDTH) * 100 + "%";
    $("l4coins").textContent = m.coins;
    $("l4flags").textContent = m.flags.filter((f) => f.active).length + "/4";
    $("l4score").textContent = String(m.score).padStart(6, "0");
    const chips = [];
    if (m.umb.active) chips.push(["umb", "☂ PLANEANDO", 1]);
    if (P.torn > 0) chips.push(["torn", "☂ PARAGUAS ROTO · " + Math.ceil(P.torn) + "s", P.torn / T.torn]);
    if (m.shield) chips.push(["shield", "◉ ESCUDO", 1]);
    if (P.cookie > 0) chips.push(["cookie", "🍪 DOBLE SALTO · " + Math.ceil(P.cookie) + "s", P.cookie / T.cookie]);
    if (P.straw > 0) chips.push(["straw", "≫ IMPULSO · " + Math.ceil(P.straw) + "s", P.straw / T.straw]);
    if (P.cacao > 0) chips.push(["cacao", "🍫 CHOCOLATADA · " + Math.ceil(P.cacao) + "s", P.cacao / T.cacao]);
    if (P.uht > 0) chips.push(["uht", "★ UHT · " + Math.ceil(P.uht) + "s", P.uht / T.uht]);
    if (m.combo > 1) chips.push(["combo", "COMBO x" + m.combo, 1]);
    const html = chips.map(([k, t, v]) => `<span class="l4chip ${k}"><b>${t}</b><i style="width:${Math.round(v * 100)}%"></i></span>`).join("");
    if ($("l4powers").innerHTML !== html) $("l4powers").innerHTML = html;
    $("l4hpFill").parentElement.parentElement.classList.toggle("flash", hpFlash > 0);
    $("l4mute").textContent = bridge.settings.sound ? "♫" : "♪";
    const b = m.boss,
      fight = b.state !== "waiting" && !m.won;
    $("l4bossHud").hidden = !fight;
    $("l4fly").hidden = !fight;
    host.querySelector(".l4stage").classList.toggle("bossfight", fight || m.won);
    $("l4windWarn").hidden = !(m.windWarn && m.zone === GUST_ZONE) && !(b.gust > 0 && fight);
    if (fight) {
      $("l4flyFill").style.width = m.umb.flight + "%";
      $("l4fly").classList.toggle("active", m.umb.flying);
      $("l4bossFill").style.width = b.hp + "%";
      $("l4bossPct").textContent = Math.ceil(b.hp) + "%";
      $("l4bossHud").dataset.phase = b.phase;
      for (let i = 1; i <= 3; i++) $("l4ph" + i).classList.toggle("on", b.phase >= i);
      $("l4bossHud").classList.toggle("hot", b.hot > 0);
      $("l4bossTip").textContent =
        b.state === "intro"
          ? "Baja de la tormenta…"
          : b.state === "dead"
            ? "¡Se apaga la tormenta!"
            : b.state === "charge"
              ? "¡RAYO CARGANDO! Cambiá de altura cuando destelle"
              : b.state === "beam"
                ? "¡DESCARGA!"
                : b.hot > 0
                  ? "¡CAÑONES RECALENTADOS! La leche pega doble"
                  : "Volá con ↑ y el paraguas abierto · disparale leche";
    }
  }
  /* ---------- Final ---------- */
  function complete() {
    mode = "complete";
    clear();
    $("l4overlay").hidden = false;
    $("l4overlay").innerHTML = `<div class="l4panel l4final" role="dialog" aria-modal="true" aria-labelledby="l4winTitle"><span class="l4eyebrow">NIVEL 4 COMPLETO · EL VIAJE CONTINÚA</span><h2 id="l4winTitle">La granja<br>a la vista<span>.</span></h2><p>La tormenta se abrió y el sol volvió a salir.<br>Con el paraguas abierto, la botella baja planeando.</p><p>Una ráfaga la desvía hacia el agua, antes de alcanzar la granja.</p><div class="l4results"><span>PUNTAJE <b>${model.score}</b></span><span>MONEDAS <b>${model.coins}</b></span><span>CAÍDAS <b>${model.falls}</b></span></div><p class="l4muted">Tu victoria está guardada. Próximo: Nivel 5 · Bajo la superficie.</p><button class="l4primary" id="l4next">ENTRAR AL NIVEL 5 →</button><button id="l4winHome">Volver al inicio</button><button id="l4again">Jugar el nivel 4 otra vez</button></div>`;
    $("l4next").onclick = () => { const score = model.score; stop(); window.MilkLevel5.start({score}); };
    $("l4winHome").onclick = stop;
    $("l4again").onclick = () => {
      model = new C.Level4();
      resetView();
      airship = { x: 1250, y: -30, v: 0 };
      mode = "play";
      $("l4overlay").hidden = true;
      canvas.focus();
    };
    $("l4next").focus();
    window.dispatchEvent(new CustomEvent("milk:level-transition", { detail: { from: 4, to: 5, score: model.score, hp: model.hp } }));
  }
  /* ---------- Bucle ---------- */
  function music() {
    const mu = bridge.music?.();
    if (!mu || !model) return;
    const b = model.boss;
    const name = mode !== "play" && mode !== "complete" ? "pause" : model.won || mode === "complete" ? "victory" : b.state !== "waiting" ? "boss4" : STORM_ZONES.includes(model.zone) || model.zone === 8 || model.zone === 10 ? "storm4" : "level4";
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
          up: has("ArrowUp", "KeyW"),
          run: has("ShiftLeft", "ShiftRight"),
          jump: has("Space", "KeyZ") || (model.arena && has("ArrowUp", "KeyW") && !model.player.grounded),
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
    $("l4notice").classList.toggle("visible", noticeTime > 0);
    render();
    raf = requestAnimationFrame(frame);
  }
  function update(dt) {
    const p = model.player,
      b = model.boss,
      arena = b.state !== "waiting";
    let target = camera.x;
    if (arena) target = ARENA_CENTER - 640;
    else {
      const look = Math.abs(p.vx) > 20 ? p.face * 85 : 0;
      const rel = p.x - camera.x,
        center = W * 0.42 - look;
      if (rel > center + 70) target = p.x - center - 70;
      else if (rel < center - 70) target = p.x - center + 70;
      target = clamp(target, 0, CAM_MAX);
    }
    camera.x += (target - camera.x) * (1 - Math.exp(-dt * (arena ? 2.2 : 5)));
    // La cámara acompaña cuando una corriente te sube alto.
    const wantY = arena ? 0 : clamp(p.y - 330, -230, 0);
    camera.y += (wantY - camera.y) * (1 - Math.exp(-dt * 3));
    camera.zoom += ((arena ? ARENA_ZOOM : 1) - camera.zoom) * (1 - Math.exp(-dt * 2));
    const half = 640 / camera.zoom;
    view = { l: camera.x + 640 - half - 80, r: camera.x + 640 + half + 80 };
    shake = Math.max(0, shake - dt);
    flash = Math.max(0, flash - dt * 2.2);
    noticeTime = Math.max(0, noticeTime - dt);
    zoneTime = Math.max(0, zoneTime - dt);
    hpFlash = Math.max(0, hpFlash - dt * 1.5);
    if (zone !== model.zone) {
      zone = model.zone;
      zoneTime = 3.4;
      const hints = {
        1: "LA PASARELA DE CARGA · El viento sopla a favor. Las cajas colgantes se mecen.",
        2: "LA PRIMERA CORRIENTE · El vapor sube: abrí el paraguas encima del hueco.",
        3: "EL MAR DE NUBES · Hay huecos entre las nubes y algunas se hunden.",
        4: "LOS MOLINOS DEL AIRE · Ruta baja sencilla o ruta alta con recompensas.",
        5: "EL CORREDOR DE LAS RÁFAGAS · Las mangas avisan. Agachate durante la ráfaga.",
        6: "LA FRONTERA OSCURA · Rayos: mirá el círculo y escondete bajo los techitos.",
        7: "EL CEMENTERIO DE LOS DIRIGIBLES · Tablones que ceden y rayos.",
        8: "EL OJO DE LA TORMENTA · Calma. Bandera y recarga.",
        9: "EL PUERTO SUSPENDIDO · Las hélices soplan hacia arriba por los huecos.",
        10: "EL ÚLTIMO AMARRE · La tormenta aspira hacia adelante. Última bandera.",
      };
      if (hints[zone]) notice(hints[zone]);
    }
    hudTime += dt;
    if (hudTime > 0.1) {
      hudTime = 0;
      updateHUD();
    }
    // Dirigible: espera con la cuerda, luego avanza delante de la pasarela y se aleja sobre el mar de nubes.
    const r = model.rope;
    let ax = r.state === "hang" ? 1250 : r.state === "lift" ? 1250 + clamp(r.t / 1.5, 0, 1) * 260 : clamp(p.x + 520, 1510, 3600);
    if (p.x > 3400) ax = airship.x + 160 * dt;
    airship.x += (ax - airship.x) * (1 - Math.exp(-dt * 1.5));
    airship.y = -30 + Math.sin(model.time * 0.7) * 8 - (p.x > 3400 ? Math.min(160, (p.x - 3400) * 0.2) : 0);
    // Estelas.
    trailTick -= dt;
    if (fx() && trailTick <= 0 && !p.dead && (model.power.uht > 0 || model.dash > 0 || model.umb.flying)) {
      trailTick = 0.05;
      const f = bottleFrame(p);
      if (f) trail.push({ ...f, x: p.x, y: p.y, face: f.face, life: 0.24 });
    }
    for (const a of trail) a.life -= dt;
    trail = trail.filter((a) => a.life > 0);
    for (const f of flyers) f.t += dt;
    flyers = flyers.filter((f) => f.t < f.dur);
    if (p.dead && p.death > 1.05 && !deathIris) {
      deathIris = true;
      const sp = toScreen(p.x, p.y - 70);
      fx2.irisTo(sp.x, sp.y, 0);
    }
    // Viento: hojas, papeles y volantes que cruzan la pantalla.
    const ws = model.wind;
    if (fx() && weatherOn() && Math.abs(ws) > 0.25 && Math.random() < Math.abs(ws) * 0.3)
      debris.push({ kind: ["leaf", "paper", "leaf", "feather"][Math.floor(Math.random() * 4)], x: ws < 0 ? W + 40 : -40, y: 80 + Math.random() * 420, vx: Math.sign(ws) * (380 + Math.random() * 380), vy: (Math.random() - 0.5) * 60, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10, t: Math.random() * 6 });
    for (const d of debris) {
      d.t += dt;
      d.x += d.vx * dt * (0.4 + Math.abs(ws) * 0.8);
      d.y += (d.vy + Math.sin(d.t * 5) * 70) * dt;
      d.rot += d.spin * dt;
    }
    debris = debris.filter((d) => d.x > -80 && d.x < W + 80).slice(-40);
    // Partículas del paraguas y los poderes.
    if (fx() && !p.dead) {
      if (model.umb.active && Math.random() < 0.25) fx2.add({ x: p.x + (Math.random() - 0.5) * 60, y: p.y - 150, vx: model.wind * 120, vy: 40, life: 0.6, max: 0.6, kind: "dot", color: "rgba(220,240,255,.8)", size: 2, grav: 0 });
      if (model.umb.flying && Math.random() < 0.8) fx2.add({ x: p.x + (Math.random() - 0.5) * 24, y: p.y + 4, vx: (Math.random() - 0.5) * 40, vy: 160, life: 0.4, max: 0.4, kind: "dot", color: "#e8f4ff", size: 4, grav: 0 });
      if (model.power.cacao > 0 && Math.random() < 0.3) fx2.add({ x: p.x + (Math.random() - 0.5) * 40, y: p.y - Math.random() * 130, vx: 0, vy: -40, life: 0.6, max: 0.6, kind: "dot", color: "#8b5a34", size: 3, grav: 0 });
      if (model.power.uht > 0 && Math.random() < 0.6) fx2.add({ x: p.x + (Math.random() - 0.5) * 60, y: p.y - Math.random() * 140, vx: 0, vy: -60, life: 0.5, max: 0.5, kind: "star", color: `hsl(${Math.random() * 360},90%,70%)`, size: 3, grav: 0, rot: 0, spin: 6 });
    }
    // Lluvia que golpea el paraguas.
    if (fx() && weatherOn() && (RAIN_ZONES.includes(model.zone) || (arena && b.phase >= 2 && !model.won))) {
      for (let i = 0; i < 3; i++) rainDrops.push({ x: camera.x + 640 + (Math.random() - 0.5) * (1400 / camera.zoom), y: camera.y - 260 + Math.random() * 40, vy: 900 + Math.random() * 200, vx: model.wind * 300 - 60 });
    }
    for (const d of rainDrops) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (model.umb.active && Math.abs(d.x - p.x) < 52 && d.y > p.y - 165 && d.y < p.y - 120) {
        d.y = 9999;
        if (Math.random() < 0.3) fx2.add({ x: d.x, y: p.y - 160, vx: (d.x - p.x) * 3, vy: -60, life: 0.3, max: 0.3, kind: "dot", color: "#cfe8ff", size: 2, grav: 600 });
      }
    }
    rainDrops = rainDrops.filter((d) => d.y < FLOOR + 30).slice(-260);
    // Humo del Capitán dañado.
    if (fx() && arena && b.hp > 0 && b.hp < 70 && Math.random() < (70 - b.hp) / 140) fx2.add({ x: b.x + (Math.random() - 0.5) * 120, y: b.y - 60, vx: (Math.random() - 0.5) * 30, vy: -80, life: 1.3, max: 1.3, kind: "dot", color: "rgba(60,60,70,.5)", size: 9 + Math.random() * 10, grav: -20 });
    if (fx() && b.state === "charge") {
      const m = model.muzzle();
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * TAU,
          rr = 110 + Math.random() * 60;
        fx2.add({ x: m.x + Math.cos(a) * rr, y: m.y + Math.sin(a) * rr, vx: -Math.cos(a) * rr * 2.4, vy: -Math.sin(a) * rr * 2.4, life: 0.4, max: 0.4, kind: "dot", color: ["#9fefff", "#c9a8ff", "#ff9f7a"][b.phase - 1], size: 3, grav: 0 });
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
  function lighter(fn) {
    g.save();
    g.globalCompositeOperation = "lighter";
    fn();
    g.restore();
  }
  const clearK = () => (model.won ? clamp((model.winTime - 0.3) / 3, 0, 1) : model.boss.state === "dead" ? clamp(model.boss.t / 6, 0, 0.4) : 0);
  function background() {
    const bx = Math.min(camera.x, CAM_MAX),
      cy = camera.y;
    g.fillStyle = "#6f8fc8";
    g.fillRect(0, 0, W, H);
    const first = Math.max(0, Math.floor(bx / STRIDE) - 1),
      end = Math.min(11, Math.floor((bx + W) / STRIDE) + 1),
      k = clearK();
    for (let i = first; i <= end; i++) {
      const tx = (i * STRIDE - bx) * 0.9;
      g.drawImage(assets.abyss[i], tx, -cy * 0.25);
      if (cy < 0) g.drawImage(assets.tiles[i], 0, 0, W, 1, tx, 0, W, -cy * 0.25 + 1);
      if (i === 11 && k > 0) {
        g.globalAlpha = k;
        g.drawImage(assets.abyss[12], tx, -cy * 0.25);
        g.globalAlpha = 1;
      }
    }
    MilkLevel4Sky.draw(g, { t: model.time, fx: fx() && weatherOn(), wind: model.wind, boss: model.boss, won: model.won, clear: k, tiles: assets.tiles, floors: FLOORS, bgCamX: bx, camY: cy }, first, end);
    // El paisaje profundo es continuo; solo el suelo se recorta en los huecos.
    g.save();
    g.beginPath();
    g.rect(-W, -H, W * 3, H * 3);
    for (const gap of GAPS) g.rect(gap.x - bx, -H, gap.w, H * 3);
    g.clip("evenodd");
    for (let i = first; i <= end; i++) {
      g.drawImage(assets.ground[i], i * STRIDE - bx, FLOOR - 96 - cy);
      if (i === 11 && k > 0) {
        g.globalAlpha = k;
        g.drawImage(assets.ground[12], i * STRIDE - bx, FLOOR - 96 - cy);
        g.globalAlpha = 1;
      }
    }
    g.restore();
  }
  /* V11.1: profundidad continua; nunca repetir un recorte de ciudad desplazado.
     Los fondos de abismo conservan la posición horizontal del paisaje y se
     funden por arriba con la escena original. */
  const GAP_TOP = [8, 80, 80, 10, 10, 10, 10, 44, 10, 8, 8, 8];
  function gaps() {
    for (const gp of GAPS) {
      if (!visible(gp.x, gp.w)) continue;
      const tile = clamp(Math.floor((gp.x + gp.w / 2) / STRIDE), 0, 11),
        x = gp.x,
        w = gp.w,
        t = model.time;
      const top = FLOOR - GAP_TOP[tile],
        bottom = H + 40 - camera.y;
      g.save();
      g.beginPath();
      g.rect(x, top, w, bottom - top);
      g.clip();
      // El abismo ya está dibujado detrás del suelo, sin pegar recortes.
      const up = UPDRAFTS.find((u) => Math.abs(u.x - x) < 5);
      if (up && up.kind === "fan") {
        const fx0 = x + w / 2,
          fy = FLOOR + 110;
        rect(fx0 - 16, fy, 32, 60, "#4a4f58", 6, "#1d2028");
        const a = Math.abs(Math.sin(t * 30));
        ellipse(fx0, fy - 4, (w / 2 - 24) * a + 8, 9, "rgba(70,75,85,.85)");
        ellipse(fx0, fy - 4, 11, 7, "#b0723a");
      }
      g.restore();
      // Caras laterales y bordes según el material del piso.
      const edge = (side) => {
        const ex = side < 0 ? x : x + w;
        if (tile === 0 || tile >= 8) {
          const fw = 16,
            fx1 = side < 0 ? ex : ex - fw;
          const fg = g.createLinearGradient(0, FLOOR - 4, 0, FLOOR + 90);
          fg.addColorStop(0, tile === 0 ? "#3a3646" : "#5a606c");
          fg.addColorStop(1, "rgba(20,20,30,0)");
          g.fillStyle = fg;
          g.fillRect(fx1, FLOOR - 4, fw, 94);
          rect(fx1 - 2, FLOOR - 6, fw + 4, 7, tile === 0 ? "#8b8492" : "#c47b39", 2);
          if (tile >= 8) for (let k = 0; k < 3; k++) rect(fx1, FLOOR + 6 + k * 12, fw, 5, k % 2 ? "#1d1d1d" : "#e8b84a");
        } else if ([1, 2, 7].includes(tile)) {
          // Tablones partidos y una cuerda suelta.
          g.fillStyle = "#6b4426";
          for (let k = 0; k < 3; k++) {
            const bx2 = ex - side * 2,
              y0 = FLOOR - 2 + k * 11;
            g.beginPath();
            g.moveTo(bx2, y0);
            g.lineTo(bx2 + side * (20 + ((k * 7) % 13)), y0 + 3 + k);
            g.lineTo(bx2, y0 + 9);
            g.fill();
          }
          g.strokeStyle = "#5a3a1e";
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(ex - side * 4, FLOOR - 60);
          g.quadraticCurveTo(ex + side * 26, FLOOR - 14 + Math.sin(t * 2 + ex) * 6, ex + side * 12, FLOOR + 50);
          g.stroke();
          rect(ex - (side < 0 ? 8 : 2), FLOOR - 66, 10, 66, "#6b4426", 2, "#2a170b");
        } else {
          // Borde de nube esponjoso y brillante.
          for (let k = 0; k < 5; k++) ellipse(ex + side * (2 + k * 5), FLOOR + 2 + k * 14, 26 - k * 3, 15 - k * 2, `rgba(255,255,255,${0.97 - k * 0.14})`);
          ellipse(ex - side * 6, FLOOR - 4, 30, 12, "rgba(255,255,255,.95)");
        }
      };
      edge(-1);
      edge(1);
      if (fx()) {
        g.save();
        g.globalAlpha = 0.3 + 0.15 * Math.sin(t * 4);
        g.strokeStyle = "#ffffff";
        g.setLineDash([6, 8]);
        g.beginPath();
        g.moveTo(x + 10, FLOOR + 1);
        g.lineTo(x + w - 10, FLOOR + 1);
        g.stroke();
        g.restore();
      }
    }
    // Columnas de aire sobre las corrientes.
    if (fx())
      for (const u of UPDRAFTS) {
        if (!visible(u.x, u.w)) continue;
        lighter(() => {
          const gr = g.createLinearGradient(0, u.top, 0, FLOOR);
          gr.addColorStop(0, "rgba(220,240,255,0)");
          gr.addColorStop(1, u.kind === "steam" ? "rgba(255,240,220,.16)" : "rgba(200,235,255,.14)");
          g.fillStyle = gr;
          g.fillRect(u.x, u.top, u.w, FLOOR - u.top);
        });
        g.strokeStyle = "rgba(255,255,255,.35)";
        g.lineWidth = 1.5;
        for (let i = 0; i < 10; i++) {
          const q = (model.time * 0.7 + i / 10) % 1,
            xx = u.x + 14 + ((i * 61) % (u.w - 28)),
            yy = FLOOR - q * (FLOOR - u.top);
          g.globalAlpha = Math.sin(q * Math.PI) * 0.8;
          g.beginPath();
          g.moveTo(xx, yy);
          g.lineTo(xx + Math.sin(yy * 0.05) * 5, yy - 24);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
  }
  /* Mangas de viento: anuncian las ráfagas un segundo antes. */
  function windsocks() {
    const list = [5900, 6290, 6820, 6960, 11500, 11880, 12300];
    for (const x of list) {
      if (!visible(x)) continue;
      const z = Math.floor(x / STRIDE),
        local = z === model.zone;
      const s = local ? model.wind : 0,
        warn = local && model.windWarn;
      rect(x - 2, FLOOR - 120, 4, 120, "#6a6f78", 1);
      ellipse(x, FLOOR - 122, 4, 4, "#d8d8d8");
      const len = 18 + Math.min(1, Math.abs(s) + (warn ? 0.4 : 0)) * 46,
        dirAngle = s > 0.05 ? 0 : Math.PI,
        droop = 1 - Math.min(1, Math.abs(s) * 1.4 + (warn ? 0.3 : 0));
      g.save();
      g.translate(x, FLOOR - 118);
      // Apunta hacia donde sopla; sin viento cuelga.
      g.rotate(dirAngle + (Math.PI / 2 - dirAngle) * droop * 0.9 + Math.sin(model.time * (warn ? 20 : 6)) * 0.08);
      for (let k = 0; k < 4; k++) {
        g.fillStyle = k % 2 ? "#ffffff" : "#ff6a3d";
        g.beginPath();
        const a = (k * len) / 4,
          b2 = ((k + 1) * len) / 4,
          r1 = 10 - k * 1.6,
          r2 = 10 - (k + 1) * 1.6;
        g.moveTo(a, -r1);
        g.lineTo(b2, -r2);
        g.lineTo(b2, r2);
        g.lineTo(a, r1);
        g.fill();
      }
      g.restore();
      if (warn && fx()) lighter(() => glow(x, FLOOR - 118, 40, "rgba(255,120,60,.5)"));
    }
  }
  function platform(b) {
    if (!visible(b.x, b.w)) return;
    const x = b.x,
      w = b.w,
      t = model.time;
    if (b.gone) {
      if (b.crumble && b.fallY < 400) {
        g.save();
        g.globalAlpha = Math.max(0, 1 - b.fallY / 400);
        g.translate(x + w / 2, b.y + b.fallY);
        g.rotate(b.fallY * 0.004);
        rect(-w / 2, 0, w, 14, "#6b4426", 2, "#2a170b");
        g.restore();
      }
      return;
    }
    const y = b.y;
    const shakeX = b.crumble && b.ct > 0 ? Math.sin(t * 60) * 2.5 : 0;
    g.save();
    g.translate(shakeX, 0);
    if (b.kind === "cargo" || b.kind === "crane") {
      // Cuerdas al cielo (o cable de grúa).
      g.strokeStyle = b.kind === "crane" ? "#2c2f36" : "#7a5a36";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + 10, y);
      g.lineTo(x + w / 2 - b.dx * 0 - (b.x - b.baseX) * 0.4, y - 360);
      g.lineTo(x + w - 10, y);
      g.stroke();
      if (b.kind === "crane") {
        rect(x + w / 2 - 6, y - 40, 12, 18, "#d0a040", 3, "#5a3a10");
        rect(x, y, w, 20, "#4d5560", 3, "#1d2028");
        for (let i = 10; i < w; i += 24) rect(x + i, y + 4, 12, 12, "#c47b39", 2, "#5a3214");
      } else {
        rect(x, y, w, 22, "#8a5a32", 3, "#3a2410");
        g.strokeStyle = "#5a3a1e";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x + 4, y + 4);
        g.lineTo(x + w - 4, y + 18);
        g.moveTo(x + w - 4, y + 4);
        g.lineTo(x + 4, y + 18);
        g.stroke();
        rect(x - 2, y - 2, w + 4, 5, "#c79a5a", 2);
      }
    } else if (b.kind === "cloud" || b.kind === "stormcloud") {
      const fade = b.sink ? 1 - clamp((b.st || 0) / 1.5, 0, 0.75) : 1,
        dark = b.kind === "stormcloud";
      g.globalAlpha = fade;
      for (let i = 0; i < 6; i++) {
        const cx = x + 14 + ((w - 28) * i) / 5,
          r = 15 + ((i * 7) % 9);
        ellipse(cx, y + 10 - (i % 2) * 6, r, r * 0.8, dark ? "#5c5a7a" : "#ffffff");
      }
      ellipse(x + w / 2, y + 14, w / 2, 12, dark ? "#4a4868" : "#e6eefc");
      if (b.sink && b.st > 0 && fx()) lighter(() => glow(x + w / 2, y + 10, w * 0.5, "rgba(255,255,255,.2)"));
      if (dark && Math.sin(t * 5 + x) > 0.93) lighter(() => glow(x + w * 0.3, y + 8, 30, "rgba(200,180,255,.8)"));
      g.globalAlpha = 1;
    } else if (b.kind === "island") {
      g.fillStyle = "#6b4a2e";
      g.beginPath();
      g.moveTo(x, y + 8);
      g.lineTo(x + w, y + 8);
      g.lineTo(x + w * 0.62, y + 54);
      g.lineTo(x + w * 0.4, y + 62);
      g.closePath();
      g.fill();
      g.strokeStyle = "#3a5a2a";
      g.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(x + w * (0.3 + i * 0.12), y + 30);
        g.quadraticCurveTo(x + w * (0.3 + i * 0.12) + Math.sin(t * 2 + i) * 6, y + 60, x + w * (0.32 + i * 0.12), y + 80 + i * 6);
        g.stroke();
      }
      rect(x - 2, y, w + 4, 12, "#5fae3e", 6, "#2f6a20");
      for (let i = 6; i < w; i += 9) rect(x + i, y - 4 + Math.sin(t * 3 + i) * 1.5, 2, 6, "#7fd04e");
    } else if (b.kind === "buoy") {
      rect(x, y, w, 18, "#c9cfd6", 8, "#4a5058");
      rect(x, y + 6, w, 5, "#ff6a3d");
      rect(x + w / 2 - 3, y - 26, 6, 26, "#4a5058", 2);
      ellipse(x + w / 2, y - 30, 8, 8, "#ffd680");
      if (fx()) lighter(() => glow(x + w / 2, y - 30, 34, `rgba(255,210,120,${0.4 + 0.3 * Math.sin(t * 3 + x)})`));
    } else if (b.kind === "wreck") {
      rect(x, y, w, 14, "#6b4426", 2, "#2a170b");
      for (let i = 8; i < w; i += 26) rect(x + i, y + 2, 2, 10, "#3a2410");
      g.strokeStyle = "#3a2410";
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(x + 6, y);
      g.lineTo(x + 6, y - 320);
      g.moveTo(x + w - 6, y);
      g.lineTo(x + w - 6, y - 320);
      g.stroke();
      if (b.ct > 0) label("!", x + w / 2, y - 10, 20, "#ffcf6a");
    } else if (b.kind === "shelter") {
      // Techito de madera: debajo, los rayos no llegan.
      g.fillStyle = "#7a4a28";
      g.beginPath();
      g.moveTo(x - 8, y + 16);
      g.lineTo(x + w / 2, y - 22);
      g.lineTo(x + w + 8, y + 16);
      g.closePath();
      g.fill();
      g.strokeStyle = "#2e1a0c";
      g.lineWidth = 2.5;
      g.stroke();
      rect(x + 4, y + 10, 8, FLOOR - y - 10, "#5a361c", 2);
      rect(x + w - 12, y + 10, 8, FLOOR - y - 10, "#5a361c", 2);
      ellipse(x + w / 2, y + 22, 7, 7, "#ffd680");
      if (fx()) lighter(() => glow(x + w / 2, y + 40, 70, "rgba(255,200,120,.25)"));
    } else if (b.kind === "roof") {
      rect(x, y, w, 26, "#4a4652", 3, "#24212b");
      rect(x, y, w, 5, "#8b8492");
      for (let i = 10; i < w - 20; i += 30) rect(x + i, y + 10, 18, 10, "#2e2a35", 2);
    } else {
      // Muelle / viga metálica (puerto, amarre y arena).
      const grad = g.createLinearGradient(0, y, 0, y + 22);
      grad.addColorStop(0, "#b8bec8");
      grad.addColorStop(0.3, "#6a707c");
      grad.addColorStop(1, "#30343c");
      rect(x, y, w, 22, grad, 3, "#16181e");
      for (let i = 10; i < w; i += 24) ellipse(x + i, y + 13, 2.2, 2.2, "#1a1c22");
      rect(x, y + 18, w, 4, "#c47b39");
      if (b.arena) {
        g.strokeStyle = "#20242c";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(x + 18, y + 22);
        g.lineTo(x + 18, FLOOR);
        g.moveTo(x + w - 18, y + 22);
        g.lineTo(x + w - 18, FLOOR);
        g.stroke();
        if (fx()) lighter(() => glow(x + w / 2, y + 30, 40, "rgba(255,190,110,.35)"));
      }
    }
    // Borde de luz para leer dónde se aterriza.
    g.strokeStyle = "rgba(255,255,255,.4)";
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x + 6, y + 0.75);
    g.lineTo(x + w - 6, y + 0.75);
    g.stroke();
    g.restore();
  }
  function flags() {
    for (const f of model.flags) {
      if (!visible(f.x)) continue;
      // Boya de amarre con bandera.
      ellipse(f.x, FLOOR + 3, 35, 7, "rgba(3,6,20,.35)");
      rect(f.x - 3, FLOOR - 153, 6, 153, "#a5b4bb", 2);
      ellipse(f.x, FLOOR - 158, 8, 8, f.active ? "#9ff0c6" : "#ffd680");
      if (fx()) lighter(() => glow(f.x, FLOOR - 158, 44, f.active ? "rgba(160,240,200,.5)" : `rgba(255,214,128,${0.3 + 0.2 * Math.sin(model.time * 4)})`));
      const col = f.active ? "#c5e9d6" : "#5fb3ff";
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(f.x + 3, FLOOR - 148);
      g.bezierCurveTo(f.x + 24, FLOOR - 158 + Math.sin(model.time * 3) * 6, f.x + 34, FLOOR - 138, f.x + 70, FLOOR - 151);
      g.lineTo(f.x + 64, FLOOR - 107);
      g.bezierCurveTo(f.x + 35, FLOOR - 94, f.x + 25, FLOOR - 118, f.x + 3, FLOOR - 107);
      g.fill();
      label(f.active ? "✓" : String(f.index + 1), f.x + 34, FLOOR - 121, 20, "#12304a");
    }
  }
  const ITEM_DESIGN = { refill: "recarga", cacao: "cacao", uht: "uht", shield: "escudo", cookie: "galletita", straw: "pajita" };
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
      const key = ITEM_DESIGN[i.kind];
      if (fx()) glow(0, 0, 46 + Math.sin(model.time * 4 + i.x) * 6, i.kind === "uht" ? `hsla(${(model.time * 200) % 360},90%,70%,.35)` : "rgba(255,255,255,.28)");
      if (window.MilkDesigns && MilkDesigns.list[key]) MilkDesigns.draw(g, key, model.time + i.x * 0.01, 0, key === "recarga" ? 28 : 22, { w: key === "recarga" ? 40 : 44, h: key === "recarga" ? 60 : 44 });
    }
    g.restore();
  }
  const ENEMY_DESIGN = { gull: "gaviota", cloud: "nubarron", drone: "dron", balloon: "globo_pinchos", spark: "chispa" };
  function enemy(e) {
    if ((e.hp <= 0 && e.dead <= 0) || !visible(e.x, 120)) return;
    const key = ENEMY_DESIGN[e.kind],
      bottom = e.kind === "cloud" ? e.y + 104 : e.kind === "spark" ? e.y : e.y + e.h / 2;
    if (e.hp <= 0) {
      const k = 1 - e.dead / (e.deadMax || 1);
      g.save();
      g.globalAlpha = Math.max(0, 1 - k);
      if (e.kind === "balloon") {
        g.restore();
        return;
      }
      MilkDesigns.draw(g, key, model.time, e.x, bottom, { face: e.face, rot: k * 6 * -e.face, squash: e.how === "stomp", state: "dead" });
      g.restore();
      return;
    }
    if (e.kind === "spark" || e.y > FLOOR - 200) ellipse(e.x, FLOOR + 2, e.w * 0.4, 5, "rgba(4,4,16,.25)");
    g.save();
    if (e.flash > 0) g.filter = "brightness(1.9)";
    MilkDesigns.draw(g, key, model.time + e.phase, e.x, bottom, { face: e.face, state: e.state, attack: e.kind === "cloud" && e.cool > 1.15 });
    g.restore();
    if (e.kind === "drone" && e.cool < 0.5 && fx()) lighter(() => glow(e.x + e.face * 26, e.y, 24, "rgba(80,240,255,.7)"));
    if (e.kind === "spark" && fx()) lighter(() => glow(e.x, e.y - 18, 60, "rgba(160,200,255,.3)"));
    if (e.kind === "gull" && e.state === "patrol" && e.cool <= 0 && Math.abs(model.player.x - e.x) < 300) label("!", e.x, e.y - 34, 20, "#ffd27a");
  }
  /* ---------- Dirigible y cuerda ---------- */
  function drawAirship() {
    if (!visible(airship.x, 600) || model.player.x > 5200) return;
    const x = airship.x,
      y = airship.y;
    g.save();
    // Envoltura con franjas y parches.
    const gr = g.createLinearGradient(0, y - 90, 0, y + 90);
    gr.addColorStop(0, "#f3ead6");
    gr.addColorStop(0.6, "#d8c6a0");
    gr.addColorStop(1, "#8f7a58");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y, 330, 92, 0, 0, TAU);
    g.fill();
    g.strokeStyle = "#3a2a18";
    g.lineWidth = 3;
    g.stroke();
    g.save();
    g.beginPath();
    g.ellipse(x, y, 330, 92, 0, 0, TAU);
    g.clip();
    for (let i = -4; i <= 4; i++) rect(x + i * 70 - 14, y - 100, 28, 200, i % 2 ? "rgba(70,130,190,.55)" : "rgba(255,255,255,.12)");
    rect(x - 120, y - 30, 240, 42, "rgba(255,248,230,.9)", 6);
    g.restore();
    label("CORREO AÉREO", x, y + 2, 22, "#2e5f8a");
    label("REPARTO SOBRE LAS NUBES", x, y + 18, 10, "#5a4630");
    // Timón y hélice.
    g.fillStyle = "#2e5f8a";
    g.beginPath();
    g.moveTo(x - 300, y - 20);
    g.lineTo(x - 380, y - 70);
    g.lineTo(x - 360, y);
    g.lineTo(x - 380, y + 60);
    g.lineTo(x - 300, y + 20);
    g.fill();
    const a = Math.abs(Math.sin(model.time * 26));
    ellipse(x - 392, y, 8, 46 * a + 4, "rgba(60,50,40,.8)");
    // Góndola.
    rect(x - 80, y + 82, 160, 38, "#6b4426", 8, "#2a170b");
    for (let i = 0; i < 4; i++) rect(x - 64 + i * 36, y + 90, 22, 14, "#ffe2a0", 3);
    g.restore();
    // Cuerda con lazo.
    const r = model.rope;
    if (r.state !== "done" || r.t < 3) {
      const p = model.player,
        topX = x - 220,
        topY = y + 70;
      let endX = r.x,
        endY = r.state === "hang" ? 330 : r.state === "lift" ? p.y - 150 : Math.max(-200, 330 - r.t * 300);
      if (r.state === "lift") endX = p.x;
      g.strokeStyle = "#8a6a3a";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(topX, topY);
      g.quadraticCurveTo((topX + endX) / 2 + Math.sin(model.time * 1.6) * 30, (topY + endY) / 2 + 30, endX, endY);
      g.stroke();
      g.strokeStyle = "#5a4020";
      g.lineWidth = 3;
      g.beginPath();
      g.ellipse(endX, endY + 10, 12, 16, 0, 0, TAU);
      g.stroke();
      if (r.state === "hang" && fx()) {
        lighter(() => glow(endX, endY + 10, 40, `rgba(255,240,180,${0.3 + 0.2 * Math.sin(model.time * 5)})`));
        label("¡SALTÁ!", endX, endY - 22, 16, "#fff6d8");
      }
    }
  }
  /* ---------- Rayos de la tormenta ---------- */
  function strikes() {
    for (const s of model.strikes) {
      if (!visible(s.x)) continue;
      if (!s.hit) {
        const k = s.t / s.warn;
        g.save();
        g.strokeStyle = `rgba(255,${200 - k * 150},120,${0.5 + 0.5 * Math.sin(model.time * (12 + k * 30))})`;
        g.lineWidth = 3;
        g.setLineDash([10, 8]);
        g.beginPath();
        g.ellipse(s.x, FLOOR + 2, 48, 11, 0, 0, TAU);
        g.stroke();
        g.setLineDash([]);
        g.globalAlpha = 0.15 + k * 0.25;
        g.fillStyle = "#c9b8ff";
        g.fillRect(s.x - 46, -400, 92, FLOOR + 400);
        g.restore();
        if (k > 0.6 && fx()) lighter(() => glow(s.x, FLOOR - 4, 60 * k, "rgba(220,200,255,.6)"));
      } else {
        const k = (s.t - s.warn) / 0.5;
        if (k > 1) continue;
        g.save();
        g.globalAlpha = 1 - k;
        g.strokeStyle = "#f4efff";
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(s.x + 30, -500);
        let xx = s.x + 30;
        for (let yy = -500; yy < FLOOR; yy += 60) {
          xx = s.x + ((yy * 13 + s.x) % 50) - 25;
          g.lineTo(xx, yy);
        }
        g.lineTo(s.x, FLOOR);
        g.stroke();
        g.globalAlpha = (1 - k) * 0.35;
        g.lineWidth = 22;
        g.strokeStyle = "#b9a4ff";
        g.stroke();
        g.restore();
        lighter(() => glow(s.x, FLOOR - 10, 140 * (1 - k), "rgba(220,210,255,.8)"));
      }
    }
  }
  function hazards() {
    for (const h of model.hazards) {
      if (!visible(h.x)) continue;
      if (h.kind === "drop") {
        g.fillStyle = "#7fc4ff";
        g.beginPath();
        g.moveTo(h.x, h.y - 16);
        g.quadraticCurveTo(h.x + 9, h.y, h.x, h.y + 8);
        g.quadraticCurveTo(h.x - 9, h.y, h.x, h.y - 16);
        g.fill();
        g.strokeStyle = "#2a5a8a";
        g.lineWidth = 1.5;
        g.stroke();
      } else if (h.kind === "bolt") {
        lighter(() => glow(h.x, h.y, 26, "rgba(80,240,255,.9)"));
        ellipse(h.x, h.y, 7, 7, "#e9ffff");
      } else if (h.kind === "hail") {
        if (h.y < FLOOR - 40) ellipse(h.x, FLOOR + 2, 14 * (1 - Math.max(0, -h.y) / 600), 4, "rgba(30,30,60,.35)");
        g.save();
        g.translate(h.x, h.y);
        g.rotate(model.time * 4 + h.x);
        g.fillStyle = "#e8f6ff";
        g.beginPath();
        for (let k = 0; k < 6; k++) g.lineTo(Math.cos((k / 6) * TAU) * (h.r + (k % 2) * 3), Math.sin((k / 6) * TAU) * (h.r + (k % 2) * 3));
        g.closePath();
        g.fill();
        g.strokeStyle = "#6a8aaa";
        g.lineWidth = 1.5;
        g.stroke();
        g.restore();
      }
    }
  }
  /* ---------- El Capitán Cúmulo (tus láminas) ---------- */
  function bossFrame() {
    const b = model.boss,
      A = assets.art,
      M = META.boss;
    const pick = (key, i) => ({ im: A[key][i], m: M[key][i] });
    switch (b.state) {
      case "charge":
        return pick("bossAttack", Math.min(3, Math.floor((b.t / (b.second ? 0.75 : 1.25)) * 4)));
      case "beam":
        return pick("bossAttack", b.t < 0.5 ? 4 : b.t < 0.75 ? 5 : 6);
      case "recover":
        return pick("bossAttack", 7);
      case "dead":
        return pick("bossDeath", Math.min(6, Math.floor((b.t / 2.6) * 7)));
    }
    return pick("bossFly", Math.floor(b.anim * 14) % 8);
  }
  function boss() {
    const b = model.boss;
    if (b.state === "waiting" || !visible(b.x, 500)) return;
    const t = model.time,
      f = bossFrame();
    // Sombra en la plataforma.
    const alt = clamp((FLOOR - b.y) / 700, 0, 1);
    ellipse(b.x, FLOOR + 4, 160 * (1 - alt * 0.5), 18 * (1 - alt * 0.5), `rgba(10,5,30,${0.45 - alt * 0.25})`);
    if (b.hot > 0 && fx()) lighter(() => glow(b.x - b.face * 0, b.y + 20, 220, `rgba(255,110,60,${0.25 + 0.1 * Math.sin(t * 20)})`));
    g.save();
    g.translate(b.x, b.y);
    g.scale(b.face === 1 ? -BOSS_SCALE : BOSS_SCALE, BOSS_SCALE);
    if (b.flash > 0) g.filter = "brightness(2) saturate(.5)";
    else if (b.hot > 0) g.filter = "sepia(.4) saturate(1.6) hue-rotate(-15deg)";
    if (b.state === "dead" && b.t > 2.6) g.globalAlpha = Math.max(0, 1 - (b.t - 2.6) / 0.5);
    g.drawImage(f.im, f.m.dx, f.m.dy, f.m.w, f.m.h);
    g.restore();
    // Carga del rayo: anillo en la boca y línea de puntería.
    if (b.state === "charge") {
      const m = model.muzzle(),
        k = b.t / (b.second ? 0.75 : 1.25),
        col = ["150,240,255", "200,160,255", "255,150,110"][b.phase - 1];
      lighter(() => {
        glow(m.x, m.y, 30 + k * 90, `rgba(${col},${0.3 + k * 0.5})`);
        glow(m.x, m.y, 14 + k * 20, "rgba(255,255,255,.9)");
      });
      const endX = b.face < 0 ? ARENA_X - 300 : ARENA_RIGHT + 300;
      g.save();
      g.strokeStyle = k > 0.75 && Math.floor(t * 20) % 2 ? "rgba(255,80,80,.95)" : `rgba(${col},.55)`;
      g.lineWidth = k > 0.75 ? 4 : 2;
      g.setLineDash([18, 12]);
      g.beginPath();
      g.moveTo(m.x, m.y);
      g.lineTo(endX, m.y);
      g.stroke();
      g.setLineDash([]);
      g.restore();
      if (k > 0.75) label("¡CAMBIÁ DE ALTURA!", b.x, b.y - 210, 26, "#ffe0e0");
    }
    if (b.state === "beam") beam(b);
  }
  function beam(b) {
    const A = assets.art.bossBeam,
      M = META.boss.bossBeam,
      t = b.t;
    const idx = b.phase === 1 ? (t < 0.04 ? 0 : t < 0.08 ? 1 : t < 0.12 ? 2 : 3) : b.phase === 2 ? 4 + (Math.floor(t * 14) % 2) : 6 + (Math.floor(t * 14) % 2);
    const im = A[idx],
      m = M[idx];
    const len = b.beamDir < 0 ? b.beamX - (ARENA_X - 300) : ARENA_RIGHT + 300 - b.beamX;
    const grow = clamp(t / 0.12, 0, 1),
      fade = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.15) : 1,
      hh = (110 + (b.phase - 1) * 25) * (0.7 + 0.3 * Math.sin(t * 40)) * fade;
    g.save();
    g.translate(b.beamX, b.beamY);
    g.scale(b.beamDir < 0 ? 1 : -1, 1);
    // El arte del rayo tiene la boca a la derecha: se estira hacia la izquierda.
    g.drawImage(im, -len * grow, -hh / 2, len * grow, hh);
    g.globalCompositeOperation = "lighter";
    const core = g.createLinearGradient(0, -hh * 0.18, 0, hh * 0.18);
    core.addColorStop(0, "rgba(255,255,255,0)");
    core.addColorStop(0.5, `rgba(255,255,255,${0.8 * fade})`);
    core.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = core;
    g.fillRect(-len * grow, -hh * 0.18, len * grow, hh * 0.36);
    g.restore();
  }
  /* ---------- La botella con paraguas (tus 5 láminas) ---------- */
  function standardPose(p) {
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
    } else idx = p.state === "walk" ? Math.floor(p.phase) % 8 : 0;
    const im = imgs[kind]?.[idx] || imgs.walk?.[0];
    return im ? { im, std: true, h, face: p.face || 1, kind } : null;
  }
  function umbPose(key, i, face) {
    const im = assets.art[key][i],
      m = META.umb[key][i];
    return { im, std: false, h: m.h * UMB_SCALE, w: m.w * UMB_SCALE, ax: m.bodyX * UMB_SCALE, face, kind: key };
  }
  function bottleFrame(p) {
    const u = model.umb,
      t = model.time,
      w = model.wind;
    if (p.dead || model.rope.state === "lift") return standardPose(p);
    if (!p.grounded && u.open > 0.05) {
      if (model.power.torn > 0) return umbPose("umbTorn", 1 + (Math.floor(t * 8) % 2), p.face);
      if (u.open < 1 && u.opened < 0.35) return umbPose("umbOpen", Math.min(4, Math.floor(u.open * 4.99)), p.face);
      if (Math.abs(w) > 0.45) return umbPose("umbTorn", 0, w < 0 ? 1 : -1);
      return umbPose("umbGlide", Math.floor(t * 5) % 4, p.face);
    }
    if (p.grounded && u.closing > 0 && model.shootPose <= 0) return umbPose("umbClose", Math.min(3, Math.floor(((0.45 - u.closing) / 0.45) * 4)), p.face);
    if (p.grounded && Math.abs(w) > 0.4 && (p.crouch > 0.3 || Math.sign(p.vx) === -Math.sign(w))) return umbPose("umbWind", Math.floor(t * 7) % 3, w < 0 ? 1 : -1);
    return standardPose(p);
  }
  function playerLook() {
    if (model.power.uht > 0) return `hue-rotate(${(model.time * 400) % 360}deg) saturate(1.6) brightness(1.15)`;
    if (model.power.cacao > 0) return "sepia(.75) saturate(1.5) hue-rotate(-12deg) brightness(.82)";
    return "none";
  }
  function drawPose(f, x, y, alpha = 1, filter = "none") {
    g.save();
    g.translate(x, y);
    g.scale(f.face, 1);
    g.globalAlpha *= alpha;
    g.filter = filter;
    if (f.std) {
      const w = (f.im.width / f.im.height) * f.h;
      g.drawImage(f.im, -w / 2, -f.h, w, f.h);
    } else g.drawImage(f.im, -f.ax, -f.h, f.w, f.h);
    g.restore();
  }
  function bottle(p) {
    if (p.dead && p.death > 1.2) return;
    if (p.invuln > 0 && !p.dead && Math.floor(p.invuln * 12) % 2 === 0 && !model.won) return;
    const f = bottleFrame(p);
    if (!f) return;
    g.save();
    if (!reduced && f.std) {
      g.translate(p.x, p.y);
      if (p.state === "rise") g.scale(0.97, 1.035);
      if (p.state === "land") g.scale(1.08, 0.94);
      if (model.wind && p.crouch < 0.5) g.rotate(model.wind * 0.07);
      g.translate(-p.x, -p.y);
    }
    if (!f.std && model.umb.active && !reduced) {
      // El paraguas se balancea con el viento y la velocidad.
      g.translate(p.x, p.y - 140);
      g.rotate(clamp(model.wind * 0.18 + p.vx * -0.0003 * p.face, -0.25, 0.25) + Math.sin(model.time * 2.4) * 0.03);
      g.translate(-p.x, -(p.y - 140));
    }
    drawPose(f, p.x, p.y, 1, playerLook());
    if (model.hp <= 60 && !p.dead && f.std) {
      g.translate(p.x, p.y);
      g.scale(f.face, 1);
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
  function shadow(p) {
    if (p.dead) return;
    let y = null;
    const surfaces = model.platforms.filter((b) => !b.gone).concat(model.floorSegments());
    for (const s of surfaces) if (s.y >= p.y - 2 && p.x > s.x && p.x < s.x + s.w && (y === null || s.y < y)) y = s.y;
    if (y === null) return;
    const gap = Math.max(0, y - p.y),
      k = Math.exp(-gap / 160);
    ellipse(p.x, y + 2, 14 + k * 15, 4 + k * 2, `rgba(8,10,30,${0.1 + 0.3 * k})`);
  }
  function auras(p) {
    if (p.dead) return;
    const x = p.x,
      y = p.y - 70;
    lighter(() => {
      if (model.power.uht > 0) glow(x, y, 120, `hsla(${(model.time * 400) % 360},100%,70%,.4)`);
      if (model.power.cacao > 0) glow(x, y, 90, "rgba(185,119,61,.2)");
      if (model.umb.flying) glow(x, p.y, 70, "rgba(200,235,255,.35)");
    });
    if (model.shield) {
      const r = 86 + Math.sin(model.time * 4) * 3;
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
  }
  /* Luz de la escena: la tormenta oscurece, los relámpagos encienden; en la arena el tono cambia por fase. */
  function lighting() {
    if (!weatherOn()) return;
    const z = model.zone,
      b = model.boss,
      p = model.player;
    let dark = z === 6 ? 0.22 : z === 7 ? 0.32 : z === 10 ? 0.16 : 0;
    let tint = "12,6,40";
    if (b.state !== "waiting" && !model.won) {
      dark = [0, 0.12, 0.2, 0.3][b.phase];
      tint = b.phase === 3 ? "50,6,30" : "18,8,50";
    }
    if (dark > 0) {
      const s = toScreen(p.x, p.y - 80);
      const gr = g.createRadialGradient(s.x, s.y, 80, s.x, s.y, 760);
      gr.addColorStop(0, `rgba(${tint},${dark * 0.3})`);
      gr.addColorStop(1, `rgba(${tint},${dark})`);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
    }
    if (flash > 0) {
      g.fillStyle = `rgba(225,220,255,${flash * 0.5})`;
      g.fillRect(0, 0, W, H);
    }
    // Rayos de sol al ganar.
    const k = clearK();
    if (k > 0 && fx()) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const s = toScreen(ARENA_CENTER - 120, 120);
      for (let i = 0; i < 7; i++) {
        const a = -1.9 + i * 0.25 + Math.sin(model.time * 0.3 + i) * 0.04;
        g.fillStyle = `rgba(255,220,150,${0.06 * k})`;
        g.beginPath();
        g.moveTo(s.x, s.y);
        g.lineTo(s.x + Math.cos(a) * 1600, s.y - Math.sin(a) * 1600);
        g.lineTo(s.x + Math.cos(a + 0.1) * 1600, s.y - Math.sin(a + 0.1) * 1600);
        g.fill();
      }
      g.restore();
    }
  }
  function weatherFront() {
    if (!weatherOn() || !fx()) return;
    const ws = model.wind;
    if (Math.abs(ws) > 0.05) {
      g.save();
      g.strokeStyle = `rgba(235,245,255,${0.28 * Math.abs(ws)})`;
      g.lineWidth = 1.5;
      const dir = Math.sign(ws);
      for (let i = 0; i < 20; i++) {
        const y = 80 + ((i * 47) % 460),
          x = ((((i * 211 + dir * model.time * 1400) % 1500) + 1500) % 1500) - 100,
          len = 60 + (i % 4) * 30;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x - (dir * len) / 2, y - 6, x - dir * len, y + Math.sin(i) * 4);
        g.stroke();
      }
      g.restore();
    }
    for (const d of debris) {
      g.save();
      g.translate(d.x, d.y);
      g.rotate(d.rot);
      if (d.kind === "paper") {
        g.scale(Math.abs(Math.sin(d.t * 4)) + 0.2, 1);
        g.fillStyle = "rgba(240,232,210,.9)";
        g.fillRect(-7, -9, 14, 18);
      } else if (d.kind === "feather") {
        g.fillStyle = "rgba(255,255,255,.9)";
        g.beginPath();
        g.ellipse(0, 0, 9, 2.5, 0, 0, TAU);
        g.fill();
      } else {
        g.fillStyle = ["#7fbf4a", "#9ccf5a", "#b8642c"][Math.floor(d.t) % 3];
        g.beginPath();
        g.ellipse(0, 0, 7, 3.5, 0, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  }
  function rain() {
    if (!rainDrops.length) return;
    g.strokeStyle = "rgba(200,215,255,.45)";
    g.lineWidth = 1.2;
    g.beginPath();
    for (const d of rainDrops) {
      if (d.y > 2000 || !visible(d.x, 10)) continue;
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + d.vx * 0.02, d.y + 22);
    }
    g.stroke();
  }
  function drawFlyers() {
    for (const f of flyers) {
      const k = f.t / f.dur,
        e = 1 - Math.pow(1 - k, 3),
        x = f.x + (f.tx - f.x) * e,
        y = f.y + (f.ty - f.y) * e - Math.sin(k * Math.PI) * 90;
      g.save();
      g.translate(x, y);
      g.scale(1 - k * 0.5, 1 - k * 0.5);
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
    if (shake > 0 && shakeOn()) g.translate(Math.sin(model.time * 80) * shake * 20, Math.cos(model.time * 71) * shake * 14);
    background();
    g.save();
    const zp = fx2 && fxOpts().impact ? fx2.zoomPunch : 0,
      z = camera.zoom + zp;
    g.translate(640, FLOOR);
    g.scale(z, z);
    g.translate(-640, -FLOOR);
    g.save();
    g.translate(-camera.x, -camera.y);
    gaps();
    drawAirship();
    windsocks();
    for (const b of model.platforms) platform(b);
    flags();
    for (const i of model.items) item(i);
    strikes();
    for (const e of model.enemies) enemy(e);
    boss();
    shadow(p);
    for (const a of trail) drawPose(a, a.x, a.y, (a.life / 0.24) * 0.4, "brightness(1.6)");
    auras(p);
    bottle(p);
    for (const b of model.bullets) {
      ellipse(b.x, b.y, b.cacao ? 13 : 11, 7, b.cacao ? "#ad7547" : "#fff4dc");
      ellipse(b.x - Math.sign(b.vx) * 9, b.y, 7, 4, b.cacao ? "#654328" : "#dceae7");
    }
    hazards();
    rain();
    g.restore();
    if (fx2) fx2.drawWorld(g, camera.x, camera.y);
    g.restore();
    lighting();
    weatherFront();
    g.restore();
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
      rect(W / 2 - 240, 196, 480, 74, "rgba(10,20,50,.6)", 10, "rgba(160,210,255,.5)");
      label(SECTIONS[Math.min(3, Math.floor(model.zone / 3))] + " · " + (model.zone + 1) + "/12", W / 2, 222, 11, "#a8d4ff");
      label(NAMES[model.zone], W / 2, 254, 26, "#ffffff");
      g.restore();
    }
    const b = model.boss;
    if (b.state === "intro" && b.t > 1.2 && b.t < 3.4) {
      const a = Math.min(1, (b.t - 1.2) * 3, (3.4 - b.t) * 3);
      g.save();
      g.globalAlpha = a;
      rect(0, 270, W, 140, "rgba(10,0,30,.6)");
      const pim = assets.art.bossPortrait[0];
      g.drawImage(pim, 140, 262, (pim.width / pim.height) * 156, 156);
      label("JEFE DEL NIVEL 4 · DUEÑO DE LA TORMENTA", W / 2 + 60, 312, 16, "#a8d4ff");
      g.font = "900 64px Arial";
      g.textAlign = "center";
      g.fillStyle = "#fff";
      g.fillText("CAPITÁN CÚMULO", W / 2 + 60 + (1 - a) * 80, 376);
      g.restore();
    }
  }
  window.MilkLevel4 = {
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
            player: { ...model.player, ground: null },
            camera: { ...camera },
            score: model.score,
            coins: model.coins,
            checkpoint: model.checkpointIndex,
            boss: { ...model.boss },
            umb: { ...model.umb },
            rope: { ...model.rope },
            won: model.won,
            falls: model.falls,
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
              model.rope.state = "done";
              model.player.reset(x, y);
              model.safe = { x, y };
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
  window.MilkLevels[4] = { start };
})();
