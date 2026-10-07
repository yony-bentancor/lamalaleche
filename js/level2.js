/* Level 2 presentation and lifecycle. All gameplay lives in level2-core.js. */
(() => {
  "use strict";
  const C = MilkLevel2Core,
    { FLOOR, STRIDE, WIDTH, NAMES } = C,
    W = 1280,
    H = 720;
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
    particles = [],
    texts = [],
    shake = 0,
    noticeTime = 0,
    zone = -1,
    zoneTime = 0,
    hudTime = 0,
    bed = null,
    // V7 Premium: mismos efectos que el nivel 1, viento, rayos, estelas y elementos que vuelan al HUD.
    fx2 = null,
    trail = [],
    trailTick = 0,
    flyers = [],
    debris = [],
    lightning = 0,
    lightningNext = 7,
    thunderAt = -1,
    hpFlash = 0,
    lastSkid = 0,
    deathIris = false,
    windNotices = 0;
  const held = new Set(),
    touch = new Set();
  let jump = false,
    shot = false;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => host?.querySelector("#" + id),
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fx = () => bridge.settings.effects && !reduced;
  const visible = (x, w = 100) => x + w > camera.x - 160 && x - w < camera.x + 1400;
  function clear() {
    held.clear();
    touch.clear();
    jump = false;
    shot = false;
    host?.querySelectorAll(".pressed").forEach((b) => b.classList.remove("pressed"));
  }
  function load() {
    if (assets) return Promise.resolve(assets);
    if (loading) return loading;
    loading = (async () => {
      const a = { bg: [], enemy: {}, tiles: [], ground: [] };
      let count = 0;
      const total = 12 + Object.values(MilkLevel2Assets).reduce((s, v) => s + v.length, 0);
      const im = (src) =>
        new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => {
            count++;
            if ($("l2loadProgress")) $("l2loadProgress").value = count / total;
            resolve(i);
          };
          i.onerror = () => reject(Error("No se pudo cargar " + src));
          i.src = src;
        });
      await Promise.all([
        ...Array.from({ length: 12 }, (_, i) => im(`assets/level2/bg-${String(i + 1).padStart(2, "0")}.webp`).then((v) => (a.bg[i] = v))),
        ...Object.entries(MilkLevel2Assets).map(
          async ([k, files]) => (a.enemy[k] = await Promise.all(files.map((f) => im("assets/level2/" + f)))),
        ),
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
        if (i !== 3) a.bg[i] = null;
      }
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
      localStorage.setItem("milk-v7-level2", JSON.stringify(s));
    } catch {
      notice("No se pudo guardar en este navegador. Las banderas siguen funcionando durante la partida.");
    }
  }
  function saved() {
    try {
      return JSON.parse(localStorage.getItem("milk-v7-level2") || "null");
    } catch {
      return null;
    }
  }
  function notice(t) {
    if ($("l2notice")) {
      $("l2notice").textContent = t;
      noticeTime = 4;
    }
  }
  function mount() {
    host = document.createElement("section");
    host.id = "level2";
    host.setAttribute("aria-label", "Nivel 2: Fecha de vencimiento");
    host.innerHTML = `<div class="l2stage"><canvas id="l2canvas" width="1280" height="720" tabindex="0" aria-label="Juego de plataformas: escapá del supermercado El Molde"></canvas>
 <header class="l2hud"><div class="l2identity"><span>EL MOLDE / NIVEL 02</span><strong id="l2place">Fecha de vencimiento</strong><div class="l2track"><i id="l2trackFill"></i><b style="left:19%"></b><b style="left:39%"></b><b style="left:59%"></b><b style="left:89%"></b></div></div>
 <div class="l2status"><div class="l2health"><span id="l2condition">LECHE ENTERA</span><strong id="l2hp">100%</strong><div><i id="l2hpFill"></i></div></div><div class="l2date" id="l2date"><span>VENCE EN</span><strong id="l2days">12 <small>DÍAS</small></strong></div><button id="l2mute" aria-label="Silenciar sonido">♫</button><button id="l2pause" aria-label="Pausar juego">Ⅱ</button></div></header>
 <div class="l2sub"><span>◈ <b id="l2coins">0</b></span><span>⚑ <b id="l2flags">0/4</b></span><span id="l2score">000000</span><span id="l2temp">12°</span><span id="l2powers"></span></div>
 <div id="l2bossHud" hidden><span>LA CAJA REGISTRADORA <b id="l2bossPct">100%</b></span><div><i id="l2bossFill"></i></div><small id="l2bossTip"></small></div>
 <div id="l2notice" role="status" aria-live="polite"></div><div class="l2controlsHint">← → MOVER <span>SHIFT CORRER</span><span>ESPACIO SALTAR</span><span>↓ AGACHARSE</span><span>X DISPARAR</span><span>ESC PAUSA</span></div>
 <div id="l2touch"><div><button data-k="ArrowLeft" aria-label="Izquierda">◀</button><button data-k="ArrowRight" aria-label="Derecha">▶</button><button data-k="ArrowDown" aria-label="Agacharse">↓</button></div><div><button data-k="ShiftLeft">CORRER</button><button data-k="KeyX">LECHE</button><button data-k="Space">SALTAR</button></div></div>
 <div id="l2overlay" class="l2overlay"><div class="l2panel"><span class="l2eyebrow">UN PASO MÁS HACIA LA LIBERTAD</span><h2>Fecha de<br>vencimiento<span>.</span></h2><p id="l2loadText">Preparando El Molde…</p><progress id="l2loadProgress" max="1" value="0"></progress></div></div></div>`;
    document.body.append(host);
    canvas = $("l2canvas");
    g = canvas.getContext("2d", { alpha: false });
    $("l2pause").onclick = () => pause();
    $("l2mute").onclick = toggleSound;
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
    const s = Math.min(innerWidth / W, innerHeight / H);
    host.querySelector(".l2stage").style.cssText = `width:${W}px;height:${H}px;transform:translate(-50%,-50%) scale(${s})`;
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
  function keydown(e) {
    if (mode === "off" || mode === "cinematic") return;
    if (e.code === "Tab" && mode === "pause") {
      const btns = [...$("l2overlay").querySelectorAll("button,input")];
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
    if (
      [
        "Escape",
        "KeyP",
        "KeyM",
        "KeyF",
        "Space",
        "KeyZ",
        "KeyX",
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        "KeyA",
        "KeyD",
        "KeyS",
        "ShiftLeft",
        "ShiftRight",
      ].includes(e.code)
    ) {
      if (e.target.matches("input") && !["Escape", "KeyP", "KeyM"].includes(e.code)) return;
      e.stopImmediatePropagation();
      if (!e.target.matches("button,input")) e.preventDefault();
    }
    if (e.repeat) return;
    if (e.code === "KeyM") {
      toggleSound();
      return;
    }
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
  function pause() {
    if (mode !== "play") return;
    mode = "pause";
    clear();
    const o = $("l2overlay");
    o.hidden = false;
    o.innerHTML = `<div class="l2panel" role="dialog" aria-modal="true" aria-labelledby="l2pauseTitle"><span class="l2eyebrow">EL RELOJ TAMBIÉN DESCANSA</span><h2 id="l2pauseTitle">En pausa<span>.</span></h2><p>Tu próxima salida está un poco más cerca.</p><button class="l2primary" id="l2resume">SEGUIR JUGANDO →</button><button id="l2retry">Volver al último checkpoint</button><label>Sonido <input type="checkbox" id="l2soundOpt" ${bridge.settings.sound ? "checked" : ""}></label><label>Efectos ambientales <input type="checkbox" id="l2fxOpt" ${bridge.settings.effects ? "checked" : ""}></label><label>Música de fondo <input type="checkbox" id="l2musicOpt" ${bridge.settings.ambient !== false ? "checked" : ""}></label><label>Clima, viento y luces <input type="checkbox" id="l2weatherOpt" ${bridge.settings.weather !== false ? "checked" : ""}></label><label>Volumen <input id="l2volume" type="range" min="0" max="100" value="${bridge.settings.volume}"></label><button id="l2home">Volver al inicio</button></div>`;
    $("l2resume").onclick = resume;
    $("l2retry").onclick = () => {
      model.reset(model.saved);
      particles = [];
      texts = [];
      fx2?.reset();
      trail = [];
      flyers = [];
      debris = [];
      camera.x = clamp(model.player.x - 330, 0, WIDTH - W);
      camera.y = 0;
      camera.zoom = 1;
      zone = -1;
      resume();
    };
    $("l2home").onclick = stop;
    $("l2soundOpt").onchange = toggleSound;
    $("l2fxOpt").onchange = (e) => {
      bridge.settings.effects = e.target.checked;
      bridge.saveSettings();
    };
    $("l2musicOpt").onchange = (e) => {
      bridge.settings.ambient = e.target.checked;
      bridge.saveSettings();
    };
    $("l2weatherOpt").onchange = (e) => {
      bridge.settings.weather = e.target.checked;
      bridge.saveSettings();
    };
    $("l2volume").oninput = (e) => {
      bridge.settings.volume = +e.target.value;
      bridge.saveSettings();
    };
    $("l2resume").focus();
  }
  function resume() {
    if (mode !== "pause") return;
    clear();
    mode = "play";
    $("l2overlay").hidden = true;
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
      $("l2loadText").textContent = e.message + " · Volvé a descomprimir el ZIP completo.";
      const b = document.createElement("button");
      b.textContent = "Volver al inicio";
      b.onclick = stop;
      $("l2overlay").querySelector(".l2panel").append(b);
      return;
    }
    if (!host) return;
    const save = payload.resume ? saved() : null;
    model = new C.Level2(save);
    model.inheritedScore = payload.score || 0;
    camera = { x: clamp(model.player.x - 330, 0, WIDTH - W), y: 0, zoom: 1 };
    particles = [];
    texts = [];
    zone = -1;
    noticeTime = 0;
    shake = 0;
    acc = 0;
    fx2 = new MilkFX();
    fx2.iris.r = 0;
    fx2.irisTo(model.player.x - camera.x, model.player.y - 70, 2000);
    trail = [];
    flyers = [];
    debris = [];
    bridge.activate();
    // V7 Premium: música propia del supermercado (MilkMusic). El acompañamiento suave anterior queda como respaldo.
    if (!bridge.music?.()) {
      try {
        bed = new MilkAudio(bridge.audio());
      } catch {}
    }
    mode = "play";
    $("l2overlay").hidden = true;
    canvas.focus();
    notice(save ? "Retomás desde tu última bandera." : "Escapá antes de vencer · Los stickers +3 DÍAS te dan más tiempo.");
    updateHUD();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    mode = "off";
    cancelAnimationFrame(raf);
    clear();
    bridge.music?.()?.set("off");
    bed?.update(bridge.settings, false);
    if (bed) {
      const old = bed;
      setTimeout(() => old.master.disconnect(), 300);
      bed = null;
    }
    window.removeEventListener("keydown", keydown, true);
    window.removeEventListener("keyup", keyup, true);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("resize", fit);
    host?.remove();
    host = null;
    model = null;
    bridge.home();
  }
  function burst(x, y, n, color, speed = 100) {
    if (!fx()) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * speed * (0.4 + Math.random()),
        vy: Math.sin(a) * speed * (0.4 + Math.random()),
        life: 0.45 + Math.random() * 0.7,
        max: 1.2,
        r: 2 + Math.random() * 4,
        color,
      });
    }
    if (particles.length > 400) particles.splice(0, particles.length - 400);
  }
  function text(t, x, y, color = "#fff3cd") {
    texts.push({ t, x, y, life: 1.2, color });
    if (texts.length > 25) texts.shift();
  }
  const itemNames = {
    days: "+3 DÍAS",
    refill: "RECARGA COMPLETA",
    shield: "ESCUDO",
    clone: "2×1 · 14 SEGUNDOS",
    cacao: "CHOCOLATADA",
    uht: "UHT · INVENCIBLE",
  };
  function event(e) {
    const p = model.player;
    if (["jump", "land", "hardland", "skid", "start"].includes(e.type)) {
      burst(e.x, e.y, e.type === "hardland" ? 18 : 7, "#d8d5c3", 60);
      if (e.type === "skid") {
        // La frenada sonaba como un zumbido: ahora es un roce corto de zapatilla, como máximo cada 0,6 s.
        if (model.time - lastSkid > 0.6) bridge.play("skid");
        lastSkid = model.time;
      } else if (e.type !== "start") bridge.sound(e.type);
    }
    if (e.type === "shoot") {
      bridge.play("shoot", { cacao: model.cacao > 0 });
      burst(e.x + p.face * 35, e.y, 4, model.cacao > 0 ? "#b87c47" : "#fff4d9", 70);
    }
    if (e.type === "hurt") {
      bridge.sound("damage");
      burst(e.x, e.y, 14, "#c6e8e9", 140);
      text("−" + e.amount + "%", e.x, e.y - 40, "#ff998b");
      if (bridge.settings.shake && !reduced) shake = 0.16;
    }
    if (e.type === "death") {
      bridge.sound("break");
      burst(e.x, e.y - 60, 30, "#c7e6ef", 210);
      notice("El vidrio cedió. Volvés a la última bandera.");
    }
    if (e.type === "respawn") {
      camera.x = clamp(p.x - 330, 0, WIDTH - W);
      camera.y = 0;
      camera.zoom = 1;
      particles = [];
      texts = [];
      zone = -1;
      notice("Checkpoint recuperado · Energía y leche restauradas.");
    }
    if (e.type === "collect") {
      bridge.play(
        { coin: "drop", days: "days", refill: "refill", shield: "power", clone: "clone", cacao: "power", uht: "power" }[e.kind] || "drop",
      );
      burst(e.x, e.y, 12, e.kind === "days" ? "#b4e2bb" : "#f3ce78", 90);
      if (e.kind !== "coin") {
        text(itemNames[e.kind], e.x, e.y - 20);
        notice(
          itemNames[e.kind] +
            (e.kind === "refill" ? " · Sin intoxicación." : e.kind === "clone" ? " · Tu clon repite el recorrido y pisa enemigos." : ""),
        );
      }
    }
    if (e.type === "checkpoint") {
      safeSave(e.snapshot);
      bridge.play("checkpoint");
      burst(e.x, e.y - 75, 30, "#aee0cb", 150);
      notice("Bandera " + (e.index + 1) + "/4 · Partida guardada, energía recargada y etiqueta retirada.");
    }
    if (["hit", "pop", "stomp", "crate", "shield"].includes(e.type)) {
      burst(e.x, e.y, e.type === "pop" ? 24 : 12, e.type === "crate" ? "#bf8856" : e.type === "shield" ? "#8bdfff" : "#f0dfa9", 130);
      if (e.type === "pop")
        bridge.play(["yogurt", "mold", "cheese"].includes(e.kind) ? "splat" : e.kind === "robot" ? "robotdown" : "enemydeath");
      else
        bridge.play(e.type === "stomp" ? "stomp" : e.type === "shield" ? "shieldbreak" : e.type === "crate" ? "cratebreak" : "enemyhit", e);
    }
    if (e.type === "armor") {
      burst(e.x, e.y, 3, "#a5d4e7", 65);
    }
    if (e.type === "enemywarn") burst(e.x, e.y, 4, "#a7cf4a", 30);
    if (e.type === "caught") notice("¡A la góndola! Agachate cerca de cajas para ocultarte del repositor.");
    if (e.type === "cool") notice("Puerta de heladera · La leche se enfría. Cuidado con el empujón.");
    if (e.type === "blackout") notice("La corriente está fallando… seguí la luz de la botella.");
    if (e.type === "bossintro") {
      notice("LA CAJA REGISTRADORA · Esquivá el lector y atacá el cajón abierto.");
      bridge.play("alarm");
    }
    if (e.type === "laserwarn") bridge.play("warn");
    if (e.type === "bossopen") {
      notice("¡Cajón abierto! X para disparar o saltá encima.");
    }
    if (e.type === "victory") {
      bridge.play("victory");
      notice("¡GANASTE! · El último obstáculo se desarma.");
      try {
        localStorage.setItem("milk-v7-progress", JSON.stringify({ completedLevel: 2, nextLevel: 3, score: model.score }));
      } catch {}
    }
    if (e.type === "firework") {
      burst(e.x, e.y, 45, ["#e8c679", "#a2dcff", "#ef89c0"][Math.floor(model.time * 7) % 3], 230);
    }
    premiumEvent(e);
  }
  /* ---------- V7 Premium: reacciones visuales iguales a las del nivel 1 ---------- */
  const fxOpts = () => ({ effects: fx(), impact: bridge.settings.impact !== false && !reduced });
  const POWER_TEXT = { cacao: "¡CHOCOLATADA!", uht: "¡LECHE UHT!", shield: "¡TAPA ESCUDO!", clone: "¡OFERTA 2×1!" };
  function hudPoint(id) {
    const el = $(id),
      st = host?.querySelector(".l2stage");
    if (!el || !st) return { x: 640, y: 40 };
    const a = el.getBoundingClientRect(),
      b = st.getBoundingClientRect(),
      k = W / b.width;
    return { x: (a.left + a.width / 2 - b.left) * k, y: (a.top + a.height / 2 - b.top) * k };
  }
  function fly(kind, wx, wy, target) {
    if (!fx()) return;
    const to = hudPoint(target);
    flyers.push({ kind, x: (wx - camera.x) * camera.zoom, y: (wy - camera.y) * camera.zoom, tx: to.x, ty: to.y, t: 0, dur: 0.75 });
  }
  function premiumEvent(e) {
    if (!fx2) return;
    const o = fxOpts(),
      p = model.player;
    switch (e.type) {
      case "stomp":
        fx2.event({ type: "stomp", x: e.x, y: e.y, combo: e.combo || 1 }, o);
        break;
      case "points":
        fx2.event({ type: "points", x: e.x, y: e.y, value: e.value, label: e.label }, o);
        break;
      case "pop":
        if (["yogurt", "mold", "cheese"].includes(e.kind)) {
          const col = { yogurt: "#f0c4c8", mold: "#a9cf4a", cheese: "#f3c544" }[e.kind];
          fx2.burst(e.x, e.y + 20, 16, col, 180, "dot", { grav: 900 });
          fx2.ring(e.x, FLOOR - 2, col, 70, 3);
        } else fx2.event({ type: "enemydeath", x: e.x, y: e.y, type2: e.kind }, o);
        if (o.impact) fx2.hitstop = Math.max(fx2.hitstop, 0.05);
        break;
      case "hit":
        fx2.event({ type: "enemyhit", x: e.x, y: e.y }, o);
        break;
      case "hurt":
        fx2.event({ type: "hurt", x: e.x, y: e.y }, o);
        break;
      case "death":
        fx2.event({ type: "death", x: p.x, y: p.y - 70 }, o);
        deathIris = false;
        break;
      case "respawn":
        fx2.reset();
        fx2.iris.r = 0;
        fx2.irisTo(p.x - camera.x, p.y - 70 - camera.y, 2000);
        trail = [];
        break;
      case "shield":
        fx2.event({ type: "shieldbreak", x: p.x, y: p.y - 80 }, o);
        break;
      case "crate":
        fx2.event({ type: "cratebreak", x: e.x + 44, y: e.y + 50 }, o);
        break;
      case "checkpoint":
        fx2.event({ type: "checkpoint", x: e.x, y: FLOOR }, o);
        break;
      case "victory":
        fx2.event({ type: "victory", x: e.x, y: e.y }, o);
        break;
      case "collect":
        if (e.kind === "coin") {
          fx2.event({ type: "drop", x: e.x, y: e.y }, o);
          fly("coin", e.x, e.y, "l2coins");
        } else if (e.kind === "days") {
          fx2.ring(e.x, e.y, "#b4e2bb", 60, 3);
          fx2.burst(e.x, e.y, 10, "#d9f2c8", 140, "star");
          fx2.text(e.x, e.y - 30, "+3 DÍAS", "#c9f0c0", 22);
          fly("days", e.x, e.y, "l2date");
        } else if (e.kind === "refill") {
          // Botella de energía: destello, burbujas de leche que suben y anillos, igual de festivo que en el nivel 1.
          fx2.flash = { a: 0.4, color: "#e6fff2" };
          fx2.ring(p.x, p.y - 70, "#9ff0c6", 110, 4);
          fx2.ring(p.x, p.y - 70, "#ffffff", 70, 3);
          for (let i = 0; i < 26; i++)
            fx2.add({
              x: p.x + (Math.random() - 0.5) * 70,
              y: p.y - Math.random() * 120,
              vx: (Math.random() - 0.5) * 40,
              vy: -120 - Math.random() * 160,
              life: 0.9,
              max: 0.9,
              kind: "dot",
              color: i % 3 ? "#ffffff" : "#aef3cf",
              size: 3 + Math.random() * 4,
              grav: -40,
            });
          fx2.burst(p.x, p.y - 80, 14, "#d7ffe9", 200, "star");
          fx2.text(p.x, p.y - 170, "ENERGÍA 100%", "#bff7d9", 26);
          fx2.zoomPunch = 0.05;
          hpFlash = 1;
        } else if (POWER_TEXT[e.kind]) {
          if (e.kind === "clone") {
            fx2.flash = { a: 0.4, color: "#ffc3d4" };
            fx2.confetti(p.x, p.y - 80, 30);
            fx2.text(p.x, p.y - 140, POWER_TEXT.clone, "#ffffff", 26);
            fx2.ring(p.x, p.y - 70, "#ff9fb8", 90, 4);
            fx2.zoomPunch = 0.06;
          } else fx2.event({ type: "power", kind: e.kind, x: p.x, y: p.y - 80 }, o);
        }
        break;
      case "powerend":
        fx2.event({ type: "powerend", x: e.x, y: e.y }, o);
        bridge.play("powerend");
        notice({ cacao: "Terminó la chocolatada.", uht: "Terminó la leche UHT.", clone: "Terminó la oferta 2×1." }[e.kind] || "");
        break;
      case "throw":
        bridge.play("throw");
        break;
      case "cheesebounce":
        fx2.burst(e.x, e.y - 4, 4, "#f3c544", 80, "dot");
        break;
      case "cheesesplat":
        fx2.burst(e.x, e.y - 6, 10, "#f3c544", 150, "dot", { grav: 900 });
        bridge.play("splat", { soft: true });
        break;
      case "windwarn":
        windNotices = (windNotices || 0) + 1;
        if (windNotices <= 2) notice("¡Ráfaga de viento! Agachate para que no te arrastre.");
        bridge.play("wind");
        break;
      case "cool":
        fx2.ring(p.x, p.y - 60, "#cfefff", 90, 3);
        fx2.burst(p.x, p.y - 80, 16, "#e9f8ff", 160, "star");
        bridge.play("fridge");
        break;
      case "blackout":
        bridge.play("powerdown");
        break;
      case "laser":
        bridge.play("laser");
        if (bridge.settings.shake && !reduced) shake = Math.max(shake, 0.12);
        break;
      case "bossopen":
        bridge.play("popitem");
        fx2.burst(model.boss.x - 20, model.boss.y - 80, 18, "#ffe39a", 200, "star");
        break;
      case "enemywarn":
        bridge.play("enemywarn");
        break;
    }
  }
  function updateHUD() {
    if (!model || !host) return;
    const m = model;
    $("l2place").textContent = NAMES[m.zone];
    $("l2hp").textContent = Math.ceil(m.hp) + "%";
    $("l2hpFill").style.width = m.hp + "%";
    $("l2condition").textContent = m.toxic ? "INTOXICADA" : m.seconds === 0 ? "VENCIDA" : m.hp <= 60 ? "VIDRIO ASTILLADO" : "LECHE ENTERA";
    $("l2hpFill").style.background = m.toxic ? "#aed574" : m.hp <= 30 ? "#ef8675" : "#ecdbb6";
    $("l2days").innerHTML = m.days + " <small>DÍAS</small>";
    $("l2date").classList.toggle("urgent", m.days <= 3);
    $("l2trackFill").style.width = (m.player.x / WIDTH) * 100 + "%";
    $("l2temp").textContent = Math.round(m.temp) + "°C";
    $("l2coins").textContent = m.coins;
    $("l2flags").textContent = m.flags.filter((f) => f.active).length + "/4";
    $("l2score").textContent = String(m.score).padStart(6, "0");
    // Fichas con barra de tiempo, como en el nivel 1.
    const chips = [];
    if (m.tagged) chips.push(["tag", "🏷 A LA VENTA", 1]);
    if (m.toxic) chips.push(["toxic", "☣ INTOXICADA", 1]);
    if (m.shield) chips.push(["shield", "◉ ESCUDO", 1]);
    if (m.cloneTime > 0) chips.push(["clone", "2×1 · " + Math.ceil(m.cloneTime) + "s", m.cloneTime / 14]);
    if (m.cacao > 0) chips.push(["cacao", "🍫 CHOCOLATADA · " + Math.ceil(m.cacao) + "s", m.cacao / 20]);
    if (m.uht > 0) chips.push(["uht", "★ UHT · " + Math.ceil(m.uht) + "s", m.uht / 9]);
    if (m.combo > 1) chips.push(["combo", "COMBO x" + m.combo, 1]);
    if (m.wind < -0.3) chips.push(["wind", "≋ VIENTO", -m.wind]);
    const html = chips
      .map(([k, t, v]) => `<span class="l2chip ${k}"><b>${t}</b><i style="width:${Math.round(v * 100)}%"></i></span>`)
      .join("");
    if ($("l2powers").innerHTML !== html) $("l2powers").innerHTML = html;
    $("l2hpFill").parentElement.parentElement.classList.toggle("flash", hpFlash > 0);
    $("l2mute").textContent = bridge.settings.sound ? "♫" : "♪";
    $("l2mute").setAttribute("aria-label", bridge.settings.sound ? "Silenciar sonido" : "Activar sonido");
    $("l2mute").setAttribute("aria-pressed", String(!bridge.settings.sound));
    const b = m.boss;
    $("l2bossHud").hidden = !b.active || m.won;
    $("l2bossFill").style.width = b.hp + "%";
    $("l2bossPct").textContent = b.hp + "%";
    $("l2bossTip").textContent = {
      waiting: "",
      intro: "Prepará la salida.",
      laserWarn: b.laserY > 450 ? "LÁSER BAJO · SALTÁ" : "LÁSER ALTO · AGACHATE",
      laser: b.laserY > 450 ? "SALTÁ" : "AGACHATE",
      coins: "MONEDAS · Buscá un hueco para esquivar",
      open: "CAJÓN ABIERTO · Dispará o pisalo",
      closed: "Blindada · Esperá la apertura",
    }[b.state];
  }
  async function complete() {
    mode = "cinematic";
    clear();
    await MilkCityCinema.play({ outgoingCanvas: canvas });
    if (!host) return;
    finishScreen(true);
  }
  function finishScreen(notify = false) {
    mode = "complete";
    clear();
    $("l2overlay").hidden = false;
    $("l2overlay").innerHTML =
      `<div class="l2panel" role="dialog" aria-modal="true" aria-labelledby="l2winTitle"><span class="l2eyebrow">PRÓXIMO CAPÍTULO / NIVEL 3</span><h2 id="l2winTitle">Sin destino<span>.</span></h2><p>Por primera vez está libre.<br>Sola, de noche, en una ciudad enorme.</p><p>Ya no huye de un lugar.<br>Ahora tiene que encontrar adónde ir.</p><div class="l2results"><span>PUNTAJE <b>${model.score}</b></span><span>DÍAS RESTANTES <b>${model.days}</b></span><span>MONEDAS <b>${model.coins}</b></span></div><p class="l2muted">Tu victoria está guardada.</p><button class="l2primary" id="l2toLevel3">JUGAR NIVEL 3 · SIN DESTINO →</button><button id="l2winHome">Volver al inicio</button><button id="l2replayCity">Repetir la transición</button></div>`;
    $("l2winHome").onclick = stop;
    // V9: el nivel 3 ya es jugable. Se cierra el nivel 2 y arranca la ciudad con el puntaje acumulado.
    $("l2toLevel3").onclick = () => {
      const score = model.score;
      stop();
      window.dispatchEvent(new CustomEvent("milk:play-level3", { detail: { score } }));
    };
    $("l2toLevel3").focus();
    $("l2replayCity").onclick = async () => {
      $("l2overlay").hidden = true;
      mode = "cinematic";
      await MilkCityCinema.play();
      if (host) finishScreen(false);
    };
    if (notify)
      window.dispatchEvent(new CustomEvent("milk:level-transition", { detail: { from: 2, to: 3, score: model.score, hp: model.hp } }));
  }
  function frame(ts) {
    if (!host) return;
    const dt = Math.min(0.065, (ts - last) / 1000 || 0);
    last = ts;
    bed?.update(bridge.settings, mode === "play");
    const music = bridge.music?.();
    if (music && model)
      music.set(
        mode !== "play" && mode !== "complete"
          ? "pause"
          : model.won
            ? "victory"
            : model.boss.active
              ? "boss"
              : model.blackout > 0.2
                ? "blackout"
                : "level2",
        bridge.settings,
      );
    bridge.uht?.(mode === "play" && model && model.uht > 0);
    // Las puertas de heladera siguen a las heladeras pintadas del fondo, que se mueven en parallax.
    if (model) for (const d of model.doors) if (d.xt != null) d.x = C.doorWorldX(d.xt, camera.x);
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
      premiumUpdate(dt);
      const p = model.player;
      let target = camera.x;
      const look = Math.abs(p.vx) > 20 ? p.face * 85 : 0;
      const rel = p.x - camera.x,
        center = W * 0.43 - look;
      if (rel > center + 70) target = p.x - center - 70;
      else if (rel < center - 70) target = p.x - center + 70;
      if (model.boss.active) target = WIDTH - W - 15;
      target = clamp(target, 0, WIDTH - W);
      camera.x += (target - camera.x) * (1 - Math.exp(-dt * 5));
      if (p.grounded) camera.y += (clamp(p.y - FLOOR, -150, 0) - camera.y) * (1 - Math.exp(-dt * 3));
      const zoom = model.boss.active && !model.won ? 1.035 : 1;
      camera.zoom += (zoom - camera.zoom) * (1 - Math.exp(-dt * 2));
      for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 140 * dt;
        p.life -= dt;
      }
      particles = particles.filter((p) => p.life > 0);
      for (const t of texts) {
        t.y -= 28 * dt;
        t.life -= dt;
      }
      texts = texts.filter((t) => t.life > 0);
      shake = Math.max(0, shake - dt);
      noticeTime = Math.max(0, noticeTime - dt);
      zoneTime = Math.max(0, zoneTime - dt);
      if (zone !== model.zone) {
        zone = model.zone;
        zoneTime = 3.4;
        const hints = {
          0: "STICKERS +3 DÍAS · Buscalos arriba de las plataformas. Ojo con las ráfagas de viento.",
          1: "CARRITO · Viajá encima o rompelo con tres disparos de leche.",
          2: "QUESO · Lanza bolas en arco: esquivalas y pisalo. El disparo rebota.",
          3: "DEPÓSITO · Explorá los estantes. Cuidado con las esporas.",
          4: "REPOSITOR · Agachate junto a una caja para esconderte.",
          6: "SALÓN DE VENTAS · Las monedas y recargas te ayudan.",
          8: "OFERTA 2×1 · Un clon repite tus movimientos.",
          9: "HELADERAS · Las puertas enfrían, pero también empujan.",
          10: "CINTAS RÁPIDAS · Corré y saltá contra la corriente.",
        };
        if (hints[zone]) notice(hints[zone]);
      }
      hudTime += dt;
      if (hudTime > 0.1) {
        hudTime = 0;
        updateHUD();
      }
      if (model.complete) complete();
    } else if (!frozen) acc = 0;
    $("l2notice").classList.toggle("visible", noticeTime > 0);
    render();
    raf = requestAnimationFrame(frame);
  }
  /* Drawing helpers use world coordinates after the camera transform. */
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
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
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
    grad.addColorStop(1, "transparent");
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function background() {
    const cx = camera.x,
      cy = camera.y;
    g.fillStyle = "#111e2c";
    g.fillRect(0, 0, W, H);
    const first = Math.max(0, Math.floor(cx / STRIDE) - 1),
      end = Math.min(11, Math.floor((cx + W) / STRIDE) + 1);
    for (let i = first; i <= end; i++) {
      const tx = (i * STRIDE - cx) * 0.9;
      g.drawImage(assets.tiles[i], tx, -cy * 0.25);
      if (cy < 0) g.drawImage(assets.tiles[i], 0, 0, W, 1, tx, 0, W, -cy * 0.25 + 1);
    }
    fridgeDoors();
    zoneLife();
    for (let i = first; i <= end; i++) g.drawImage(assets.ground[i], i * STRIDE - cx, FLOOR - 40 - cy);
    // Painted foreground stays anchored to the floor. Distant dust and lights drift independently.
    if (bridge.settings.weather) {
      const z = model.zone;
      if (z < 3 && fx()) {
        g.strokeStyle = "#b5d9ec42";
        g.lineWidth = 1;
        for (let i = 0; i < 95; i++) {
          const x = (((i * 97.7 - cx * 0.28 - model.time * (80 + -model.wind * 520)) % W) + W) % W,
            y = (i * 71 + model.time * (300 + (i % 4) * 36)) % H;
          if (z !== 1 && x < W * 0.78) continue;
          const slant = 7 + -model.wind * 30;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x - slant, y + 22);
          g.stroke();
        }
        for (let i = 0; i < 18; i++) {
          const x = (((i * 179 - cx * 0.92) % W) + W) % W,
            y = FLOOR + 18 + (i % 4) * 12,
            r = (model.time * 24 + i * 7) % 28;
          g.globalAlpha = (1 - r / 28) * 0.2;
          g.strokeStyle = "#eeb76e";
          g.beginPath();
          g.ellipse(x, y, r, r * 0.16, 0, 0, 7);
          g.stroke();
        }
        g.globalAlpha = 1;
      }
      if (fx())
        for (let i = 0; i < 28; i++) {
          const x = (((i * 131 - cx * 0.55 + Math.sin(model.time + i) * 12) % W) + W) % W,
            y = 90 + ((i * 57 + model.time * 8) % 370);
          ellipse(x, y, 1 + (i % 3) * 0.4, 1.3, z < 6 ? "#fbd58a48" : "#fffbe741");
        }
    }
  }
  function platform(b) {
    if (b.gone || !visible(b.x, b.w)) return;
    const x = b.x,
      y = b.y,
      w = b.w;
    ellipse(x + w / 2, FLOOR + 4, w * 0.46, 8, "#020a124d");
    if (b.kind === "box") {
      g.drawImage(assets.bg[3], 330, 310, 180, 180, x, y, w, b.h);
      rect(x, y, w, b.h, "#38200e22", 3, "#352314");
      rect(x + w * 0.43, y, 10, b.h, "#b6966080");
      label("↑ ↑", x + w / 2, y + 32, 17, "#392616");
      g.strokeStyle = "#f1bf706e";
      g.strokeRect(x + 4, y + 4, w - 8, b.h - 8);
      return;
    }
    if (b.kind === "pallet" || b.kind === "produce") {
      rect(x, y + 3, w, 22, "#352214", 3, "#1f1715");
      g.drawImage(assets.bg[3], 240, 490, 400, 25, x, y, w, 19);
      rect(x, y, w, 4, "#d9ad71");
      for (let i = 12; i < w; i += 40) {
        rect(x + i, y + 8, 8, 15, "#271912");
        ellipse(x + i + 3, y + 3, 1.3, 1.3, "#40312a");
      }
      if (b.kind === "produce") {
        rect(x, y + 10, w, 15, "#69522c");
        for (let i = 12; i < w - 8; i += 23) rect(x + i, y + 12, 15, 9, "#151c12");
        rect(x, y, w, 3, "#aaa06c");
      }
    } else if (b.kind === "coin") {
      g.globalAlpha = b.life < 1 ? 0.45 + Math.sin(model.time * 16) * 0.25 : 1;
      rect(x, y, w, 15, "#bb8533", 6, "#ffdf91");
      rect(x + 5, y + 2, w - 10, 3, "#f8d892");
      g.globalAlpha = 1;
    } else {
      const grad = g.createLinearGradient(0, y, 0, y + 22);
      grad.addColorStop(0, "#9aabb0");
      grad.addColorStop(0.23, "#3a5263");
      grad.addColorStop(1, "#192b38");
      rect(x, y, w, 22, grad, 3, "#0f1b24");
      rect(x + 2, y, w - 4, 3, "#e0c49d");
      rect(x + 10, y + 8, w - 20, 4, "#162733");
      for (let i = 10; i < w; i += 32) {
        ellipse(x + i, y + 17, 1.5, 1.5, "#8f9d9f");
      }
      if (b.kind === "lift") {
        rect(x, y + 6, w, 6, "#d5aa47");
        for (let i = 0; i < w - 10; i += 22) {
          g.fillStyle = "#18232a";
          g.beginPath();
          g.moveTo(x + i, y + 6);
          g.lineTo(x + i + 7, y + 6);
          g.lineTo(x + i + 13, y + 12);
          g.lineTo(x + i + 6, y + 12);
          g.fill();
        }
      }
      if (b.kind === "shelf") {
        rect(x + 8, y + 22, 14, 6, "#172a37");
        rect(x + w - 22, y + 22, 14, 6, "#172a37");
      }
    }
  }
  function scenery() {
    for (const b of model.belts) {
      if (!visible(b.x, b.w)) continue;
      rect(b.x, FLOOR - 1, b.w, 17, "#162128", 4, "#5a676a");
      g.save();
      g.beginPath();
      g.rect(b.x, FLOOR, b.w, 13);
      g.clip();
      for (let i = -35; i < b.w + 40; i += 26) {
        const x = b.x + i + ((model.time * b.speed) % 26);
        g.strokeStyle = "#7c8a89";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(x, FLOOR + 2);
        g.lineTo(x - 8, FLOOR + 12);
        g.stroke();
      }
      g.restore();
      for (let x = b.x + 12; x < b.x + b.w; x += 45) ellipse(x, FLOOR + 19, 6, 6, "#b1a680");
    }
    // Las puertas se dibujan sobre las heladeras del fondo (fridgeDoors); acá solo la ola de frío sobre el piso de juego.
    for (const d of model.doors) {
      if (!visible(d.x, 150) || d.open <= 0.05) continue;
      g.save();
      g.globalAlpha = d.open;
      const fog = g.createRadialGradient(d.x, FLOOR - 8, 10, d.x, FLOOR - 8, 150);
      fog.addColorStop(0, "rgba(220,244,255,.45)");
      fog.addColorStop(1, "rgba(220,244,255,0)");
      g.fillStyle = fog;
      g.fillRect(d.x - 150, FLOOR - 120, 300, 140);
      if (fx())
        for (let k = 0; k < 10; k++) {
          const q = (model.time * 0.9 + k / 10) % 1;
          ellipse(d.x - 120 + k * 26 + q * 20, FLOOR - 6 - q * 40, 2, 2, `rgba(255,255,255,${0.8 * (1 - q)})`);
        }
      g.restore();
    }
    for (const m of model.moldCeilings) {
      if (!visible(m.x)) continue;
      ellipse(m.x, m.y, 56, 16, "#243525");
      for (let i = 0; i < 8; i++) {
        ellipse(m.x - 43 + i * 12, m.y + Math.sin(i) * 5, 12, 10, i % 2 ? "#84974b" : "#60783f");
      }
      if (m.cool < 0.5) glow(m.x, m.y + 5, 35, "#b9d47040");
    }
    for (const b of model.platforms) platform(b);
    for (const f of model.flags) {
      if (!visible(f.x)) continue;
      ellipse(f.x, FLOOR + 3, 35, 7, "#03101766");
      rect(f.x - 3, FLOOR - 153, 6, 153, "#a5b4bb", 2);
      ellipse(f.x, FLOOR - 155, 5, 5, "#efe2c3");
      const col = f.active ? "#c5e9d6" : "#e1aa5b";
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(f.x + 3, FLOOR - 150);
      g.bezierCurveTo(f.x + 24, FLOOR - 160 + Math.sin(model.time * 3) * 6, f.x + 34, FLOOR - 140, f.x + 70, FLOOR - 153);
      g.lineTo(f.x + 64, FLOOR - 109);
      g.bezierCurveTo(f.x + 35, FLOOR - 96, f.x + 25, FLOOR - 120, f.x + 3, FLOOR - 109);
      g.fill();
      label(f.active ? "✓" : String(f.index + 1), f.x + 34, FLOOR - 123, 20, "#234337");
      if (f.active) glow(f.x + 5, FLOOR - 75, 100, "#b7dfac13");
    }
  }
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
    } else if (i.kind === "days" || i.kind === "clone") {
      g.rotate(-0.075);
      rect(-34, -20, 68, 39, i.kind === "days" ? "#d3e5c6" : "#d33e65", 3, "#fff0c8");
      label(i.kind === "days" ? "+3" : "2×1", 0, 1, 23, i.kind === "days" ? "#203d36" : "#fff1dd");
      label(i.kind === "days" ? "DÍAS" : "OFERTA", 0, 13, 8, i.kind === "days" ? "#203d36" : "#fff1dd");
      if (fx()) {
        const k = ((model.time * 0.6 + i.x * 0.001) % 1.6) - 0.3;
        if (k > 0 && k < 1) {
          g.save();
          g.beginPath();
          g.rect(-34, -20, 68, 39);
          g.clip();
          g.fillStyle = "rgba(255,255,255,.45)";
          g.beginPath();
          g.moveTo(-40 + k * 90, -22);
          g.lineTo(-28 + k * 90, -22);
          g.lineTo(-40 + k * 90, 22);
          g.lineTo(-52 + k * 90, 22);
          g.fill();
          g.restore();
        }
      }
      g.fillStyle = "#fff4ce";
      g.beginPath();
      g.moveTo(24, 19);
      g.lineTo(34, 9);
      g.lineTo(34, 19);
      g.fill();
    } else {
      // Mismos diseños que el nivel 1 (reemplazables desde el Catálogo de diseños), con halo pulsante.
      const key = { refill: "recarga", cacao: "cacao", uht: "uht", shield: "escudo" }[i.kind];
      const tint = { refill: "#9ff0c655", cacao: "#e0a06a55", uht: `hsla(${(model.time * 200) % 360},90%,70%,.35)`, shield: "#7cc4ff55" }[
        i.kind
      ];
      if (fx()) glow(0, 0, 46 + Math.sin(model.time * 4 + i.x) * 6, tint || "#ffffff33");
      if (key && window.MilkDesigns)
        MilkDesigns.draw(g, key, model.time + i.x * 0.01, 0, key === "recarga" ? 28 : 22, {
          w: key === "recarga" ? 40 : 46,
          h: key === "recarga" ? 60 : 46,
        });
      else {
        ellipse(0, 0, 24, 24, "#477a8e");
        label("◉", 0, 6, 22);
      }
      if (fx() && Math.floor(model.time * 3 + i.x) % 4 === 0) {
        const a = model.time * 2 + i.x;
        ellipse(Math.cos(a) * 28, Math.sin(a) * 28, 2, 2, "#ffffffcc");
      }
    }
    g.restore();
  }
  function actorSprite(list, index, x, y, h, face = 1, alpha = 1, rot = 0) {
    const im = list?.[index % list.length];
    if (!im) return;
    const w = (im.width / im.height) * h;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(face, 1);
    g.globalAlpha = alpha;
    g.drawImage(im, -w / 2, -h, w, h);
    g.restore();
  }
  function robot(e) {
    g.save();
    g.translate(e.x, e.y);
    g.scale(e.face, 1);
    const bob = Math.sin(e.phase * 7) * 3;
    const metal = g.createLinearGradient(-31, 0, 31, 0);
    metal.addColorStop(0, "#344853");
    metal.addColorStop(0.45, "#a3b3b1");
    metal.addColorStop(1, "#526774");
    rect(-31, -147 + bob, 62, 86, metal, 9, "#162734");
    g.save();
    g.globalAlpha = 0.23;
    g.drawImage(assets.bg[3], 75, 40, 68, 120, -28, -144 + bob, 56, 79);
    g.restore();
    for (const xx of [-24, 24])
      for (const yy of [-140, -68]) {
        ellipse(xx, yy + bob, 2.5, 2.5, "#283d49");
        ellipse(xx - 0.5, yy - 0.5 + bob, 1.1, 1.1, "#c0c5b6");
      }
    rect(-26, -139 + bob, 52, 33, "#152c34", 5);
    rect(2, -128 + bob, 18, 5, model.tagged ? "#ef8471" : "#d3b774", 2);
    rect(-24, -103 + bob, 48, 26, "#a7a895", 3);
    g.save();
    g.scale(e.face, 1);
    label("EL MOLDE", 0, -87 + bob, 8, "#253b45");
    g.restore();
    rect(-40, -123 + bob, 11, 52, "#4b6470", 4);
    rect(30, -117 + bob, 12, 48, "#5d7680", 4);
    for (let i = -1; i <= 1; i += 2) {
      rect(i * 17 - 7, -60, 14, 40, "#384f5d", 3);
      ellipse(i * 18, -13 + Math.sin(e.phase * 8 + i) * 3, 18, 12, "#112831");
      ellipse(i * 18, -13, 8, 8, "#738c95");
    }
    g.restore();
  }
  /* V7 Premium: cada enemigo pierde a su manera. Yogur, moho y queso se derriten con tus láminas;
     el repositor cae hacia atrás echando chispas; la cucaracha queda patas arriba; la mosca cae en espiral. */
  function enemyDeath(e) {
    const total = e.deadMax || 0.5,
      t = total - e.dead,
      k = t / total;
    if (e.kind === "cart" && assets.enemy.cartDeath) {
      const frames = assets.enemy.cartDeath,
        idx = Math.min(frames.length - 1, Math.floor((t / 1.35) * frames.length));
      const im = frames[idx];
      g.save();
      g.translate(e.x, e.deathY || FLOOR);
      g.scale(e.face, 1);
      g.globalAlpha = t > 1.35 ? Math.max(0, (total - t) / 0.3) : 1;
      g.drawImage(im, (-95 * e.h) / 300, -e.h, (190 * e.h) / 300, e.h);
      g.restore();
      return;
    }
    const melt = assets.enemy[e.kind + "Death"];
    if (melt && melt.length) {
      // Cuadros 1 a 7 durante 1,1 s; el charco final se desvanece.
      const idx = Math.min(melt.length - 1, 1 + Math.floor((t / 1.1) * (melt.length - 1)));
      const im = melt[idx],
        scale = e.h / 300,
        w = im.width * scale,
        h = im.height * scale,
        fade = t > 1.15 ? Math.max(0, 1 - (t - 1.15) / (total - 1.15)) : 1;
      g.save();
      g.translate(e.x, FLOOR + 2);
      g.scale(e.face, 1);
      g.globalAlpha = fade;
      g.drawImage(im, -w / 2, -h, w, h);
      g.restore();
      if (fx() && Math.random() < 0.25 && t < 1.1) {
        const col = { yogurt: "#f2c9cc", mold: "#b3d65a", cheese: "#f5c94a" }[e.kind];
        particles.push({
          x: e.x + (Math.random() - 0.5) * 40,
          y: FLOOR - Math.random() * 60,
          vx: (Math.random() - 0.5) * 30,
          vy: 40,
          life: 0.5,
          max: 0.6,
          r: 2 + Math.random() * 2,
          color: col,
        });
      }
      return;
    }
    g.save();
    g.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.55) / 0.45);
    if (e.kind === "robot") {
      // Cae hacia atrás, tiembla y echa humo.
      const fall = Math.min(1, t / 0.55);
      g.translate(e.x - e.face * 40 * fall, e.y);
      g.rotate(-e.face * fall * fall * 1.45);
      g.translate(-e.x, -e.y);
      robot({ ...e, phase: e.phase + Math.sin(t * 60) * 0.02 });
      g.restore();
      if (fx() && Math.random() < 0.35) {
        particles.push({
          x: e.x - e.face * 60 + (Math.random() - 0.5) * 40,
          y: e.y - 40,
          vx: (Math.random() - 0.5) * 30,
          vy: -60,
          life: 0.9,
          max: 1.2,
          r: 6 + Math.random() * 6,
          color: "rgba(80,90,100,.35)",
        });
        if (t < 0.7)
          particles.push({
            x: e.x,
            y: e.y - 90,
            vx: (Math.random() - 0.5) * 220,
            vy: -120 - Math.random() * 120,
            life: 0.4,
            max: 0.5,
            r: 1.6,
            color: "#ffd77a",
          });
      }
      return;
    }
    if (e.kind === "roach") {
      g.translate(e.x, FLOOR - 10);
      g.scale(e.face, -1);
      ellipse(0, 0, 25, 12, "#513b29");
      ellipse(15, -5, 11, 10, "#6b5a3a");
      g.strokeStyle = "#253621";
      g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.moveTo(-15 + i * 10, 7);
        g.lineTo(-22 + i * 15, 18 + Math.sin(t * 40 + i) * 6 * (1 - k));
        g.stroke();
      }
      g.restore();
      return;
    }
    if (e.kind === "fly") {
      g.translate(e.x + Math.sin(t * 14) * 14 * (1 - k), e.y - e.h / 2);
      g.rotate(t * 12);
      ellipse(0, 0, 19, 16, "#6d7340");
      ellipse(15, -5, 11, 10, "#798b55");
      g.restore();
      return;
    }
    g.translate(e.x, e.y);
    g.scale(1 + k * 0.4, 1 - k);
    g.translate(-e.x, -e.y);
    actorSprite(assets.enemy[e.kind], 0, e.x, e.y, e.h, e.face);
    g.restore();
  }
  function enemy(e) {
    if ((e.hp <= 0 && e.dead <= 0) || !visible(e.x, 200)) return;
    const dying = e.hp <= 0;
    if (!dying || !assets.enemy[e.kind + "Death"])
      ellipse(e.x, FLOOR + 2, e.w * 0.42 * (dying ? e.dead / (e.deadMax || 0.5) : 1), 6, "#06122155");
    if (dying) {
      enemyDeath(e);
      return;
    }
    g.save();
    if (e.flash > 0) g.filter = "brightness(1.8)";
    if (e.kind === "robot") robot(e);
    else if (e.kind === "roach" || e.kind === "fly") {
      const isFly = e.kind === "fly";
      g.save();
      g.translate(e.x, e.y - e.h / 2);
      g.scale(e.face, 1);
      if (isFly) {
        ellipse(-12, -16, 18, fx() ? 6 + Math.abs(Math.sin(model.time * 35)) * 12 : 12, "#cfdddf88");
        ellipse(13, -19, 20, fx() ? 6 + Math.abs(Math.cos(model.time * 35)) * 12 : 12, "#e3e7dc77");
      }
      ellipse(0, 0, isFly ? 19 : 25, isFly ? 16 : 12, isFly ? "#6d7340" : "#513b29");
      ellipse(15, -5, 11, 10, "#798b55");
      ellipse(20, -8, 5, 6, "#edc98a");
      ellipse(22, -8, 2, 3, "#20180f");
      g.strokeStyle = "#253621";
      g.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo(-15 + k * 10, 7);
        g.lineTo(-22 + k * 15, 18 + Math.sin(e.phase * 14 + k) * 3);
        g.stroke();
      }
      g.restore();
    } else {
      const attacking = e.attack > 0 && assets.enemy[e.kind + "Attack"];
      let list = attacking ? assets.enemy[e.kind + "Attack"] : assets.enemy[e.kind];
      const dur = e.kind === "cheese" ? 0.9 : 0.8;
      let index = attacking
        ? Math.min(list.length - 1, Math.floor(((dur - e.attack) / dur) * list.length))
        : Math.floor(e.phase * (e.kind === "cart" ? 10 : 7));
      // El queso camina derecho: sin rebotes ni balanceo.
      actorSprite(list, index, e.x, e.y, e.h, e.face, 1, 0);
    }
    g.restore();
    if (e.attack > 0.35) label("!", e.x, e.y - e.h - 15, 22, "#ecd589");
    if (e.hp < 20 && e.kind !== "cart" && e.kind !== "cheese") {
      rect(e.x - 20, e.y - e.h - 10, 40, 4, "#23342e", 2);
      rect(e.x - 20, e.y - e.h - 10, (e.hp / 20) * 40, 4, "#d8bc75", 2);
    }
  }
  function bottle(p, clone = false, reflection = false) {
    if (p.dead && p.death > 1.2) return;
    if (!clone && !reflection && p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0) return;
    const f = pose(p, clone);
    if (!f) return;
    const { im, kind, h } = f;
    const w = (im.width / im.height) * h;
    if (reflection) {
      MilkRenderFinish.reflection(g, im, p, h, FLOOR, model.zone >= 6 ? 0.18 : 0.1, playerLook(kind));
      return;
    }
    g.save();
    g.translate(p.x, p.y);
    if (reflection) {
      g.translate(0, (FLOOR - p.y) * 2 + 6);
      g.scale(1, -0.32);
      g.globalAlpha = 0.12;
    } else if (clone) g.globalAlpha = 0.42;
    if (!reduced && !clone) {
      if (p.state === "rise") g.scale(0.97, 1.035);
      if (p.state === "land") g.scale(1.08, 0.94);
      // Con viento la botella se inclina contra la ráfaga.
      if (model.wind && !reflection && p.crouch < 0.5) g.rotate(model.wind * 0.07 * (p.grounded ? 1 : 0.5));
    }
    g.scale(p.face || 1, 1);
    g.filter = clone ? "sepia(1) saturate(3) hue-rotate(300deg) brightness(1.15)" : playerLook(kind);
    g.drawImage(im, -w / 2, -h, w, h);
    g.filter = "none";
    if (model.hp <= 60 && !p.dead && !clone) {
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
    if (model.tagged && !p.dead && !clone) {
      rect(-12, -h - 4, 26, 13, "#efdab2", 2);
      for (let k = -8; k < 10; k += 3) rect(k, -h - 1, 1, 6, "#493829");
    }
    g.restore();
    if (clone && !reflection) {
      label("2×1", p.x, p.y - 152, 13, "#ffb3c6");
    }
  }
  function boss() {
    const b = model.boss;
    if (!visible(b.x, 250)) return;
    const x = b.x,
      y = b.y,
      open = b.state === "open" || model.won;
    ellipse(x, y + 3, 120, 15, "#080e2455");
    g.save();
    if (b.flash > 0) g.filter = "brightness(1.8)";
    if (model.won && assets.enemy.registerDeath) {
      const idx = Math.min(11, Math.floor(model.winTime / 0.275));
      const im = assets.enemy.registerDeath[idx];
      g.drawImage(im, x - 114, y - 284, 228, 284);
      if (fx() && model.winTime < 3.1) {
        glow(x, y - 85, 90, "#efb57918");
      }
    } else {
      const frame = open ? 2 : b.state === "laserWarn" || b.state === "laser" ? 1 : 0;
      actorSprite(assets.enemy.register, frame, x, y, 284, 1);
    }
    if (open && !model.won) {
      glow(x - 27, y - 75, 76, "#e5d18835");
      label("PUNTO DÉBIL", x - 20, y - 102, 10, "#fff0b8");
    }
    if (b.state === "laserWarn") glow(x - 30, y - 236, 40, "#f2866055");

    g.restore();
    if (b.state === "laserWarn" || b.state === "laser") {
      const active = b.state === "laser";
      g.save();
      g.globalAlpha = active ? 0.9 : 0.55;
      g.strokeStyle = active ? "#ff525e" : "#ffc092";
      g.lineWidth = active ? 9 : 2;
      if (!active) g.setLineDash([16, 12]);
      g.beginPath();
      g.moveTo(b.x - 38, b.y - 240);
      g.lineTo(b.x - 133, b.laserY);
      g.lineTo(12920, b.laserY);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      if (active) {
        g.strokeStyle = "#ffefda";
        g.lineWidth = 3;
        g.stroke();
      }
      g.restore();
    }
    // The illustrated exit is at the right of the last background. These glass leaves physically open after victory.
    const doorX = WIDTH - 170,
      slide = model.won ? clamp((model.winTime - 3.2) / 1.5, 0, 1) : 0;
    if (slide < 1) {
      rect(doorX + slide * 95, FLOOR - 275, 92 * (1 - slide), 275, "#788bbd33", 2, "#c6a7b8");
      rect(doorX + 45 + slide * 80, FLOOR - 150, 5, 60, "#ebc8a2", 2);
    }
    if (model.won) {
      glow(WIDTH - 100, FLOOR - 145, 180, "#ffd9af44");
      label("SALIDA →", WIDTH - 170, FLOOR - 294, 17, "#e9e5c7");
    }
  }
  function hazards() {
    for (const h of model.hazards) {
      if (!visible(h.x)) continue;
      if (h.kind === "puddle") {
        ellipse(h.x, h.y + 2, h.r, 6, "#415622cc");
        ellipse(h.x - 3, h.y, h.r * 0.8, 3, "#b5ce5477");
        if (fx()) ellipse(h.x + Math.sin(model.time * 2 + h.x) * h.r, h.y - 8, 3, 4, "#c0d57277");
      } else if (h.kind === "cheeseball") {
        g.save();
        g.translate(h.x, h.y);
        g.rotate(h.spin);
        const gr = g.createRadialGradient(-4, -4, 2, 0, 0, h.r + 2);
        gr.addColorStop(0, "#fff0a8");
        gr.addColorStop(0.6, "#f3c544");
        gr.addColorStop(1, "#c98f1a");
        g.fillStyle = gr;
        g.beginPath();
        g.arc(0, 0, h.r, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#7a5414";
        g.lineWidth = 2;
        g.stroke();
        for (const [x, y, r] of [
          [-4, -3, 3],
          [5, 2, 2.4],
          [-1, 6, 1.8],
        ])
          ellipse(x, y, r, r, "#d59d24");
        g.restore();
        ellipse(h.x, FLOOR + 2, 10, 3, "#0613214d");
      } else if (h.kind === "cheesepuddle") {
        g.globalAlpha = Math.min(1, h.life);
        ellipse(h.x, h.y + 2, h.r, 5, "#e7b636cc");
        ellipse(h.x - 4, h.y, h.r * 0.6, 2.5, "#fff1a0aa");
        g.globalAlpha = 1;
      } else if (h.kind === "coin") {
        ellipse(h.x, h.y, 15, 17, "#a77831");
        ellipse(h.x, h.y, 12, 15, "#f0ca76");
        label("$", h.x, h.y + 6, 20, "#95632a");
      } else {
        ellipse(h.x, h.y, 11, 10, "#a2b653");
        ellipse(h.x - 3, h.y - 3, 4, 3, "#d4d58a");
      }
    }
  }
  function lighting() {
    if (!bridge.settings.weather) return;
    if (model.blackout > 0) {
      g.save();
      const p = model.player,
        x = p.x - camera.x,
        y = p.y - 80 - camera.y;
      const grad = g.createRadialGradient(x, y, 40, x, y, 300);
      grad.addColorStop(0, "rgba(1,7,16,0)");
      grad.addColorStop(0.45, `rgba(1,7,16,${model.blackout * 0.38})`);
      grad.addColorStop(1, `rgba(1,7,16,${model.blackout * 0.94})`);
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    const vignette = g.createRadialGradient(W / 2, H * 0.44, 220, W / 2, H * 0.5, 790);
    vignette.addColorStop(0, "transparent");
    vignette.addColorStop(1, model.zone < 6 ? "#020b2455" : "#211b292e");
    g.fillStyle = vignette;
    g.fillRect(0, 0, W, H);
  }

  /* ---------- V7 Premium: actualización de efectos ---------- */
  function premiumUpdate(dt) {
    const p = model.player;
    // Estelas: UHT (arcoíris), 2×1 (rosa) y carrera rápida.
    trailTick -= dt;
    if (fx() && trailTick <= 0 && !p.dead && (model.uht > 0 || model.cloneTime > 0 || Math.abs(p.vx) > 400)) {
      trailTick = 0.05;
      const f = pose(p);
      if (f)
        trail.push({
          ...f,
          x: p.x,
          y: p.y,
          face: p.face,
          life: 0.24,
          kind2: model.uht > 0 ? "uht" : model.cloneTime > 0 ? "clone" : "run",
        });
    }
    for (const a of trail) a.life -= dt;
    trail = trail.filter((a) => a.life > 0);
    for (const f of flyers) f.t += dt;
    flyers = flyers.filter((f) => f.t < f.dur);
    hpFlash = Math.max(0, hpFlash - dt * 1.5);
    // Partículas de los poderes, igual que en el nivel 1.
    if (fx() && !p.dead) {
      if (model.cacao > 0 && Math.random() < 0.3)
        fx2.add({
          x: p.x + (Math.random() - 0.5) * 40,
          y: p.y - Math.random() * 130,
          vx: 0,
          vy: -40,
          life: 0.6,
          max: 0.6,
          kind: "dot",
          color: "#8b5a34",
          size: 3,
          grav: 0,
        });
      if (model.uht > 0 && Math.random() < 0.6)
        fx2.add({
          x: p.x + (Math.random() - 0.5) * 60,
          y: p.y - Math.random() * 140,
          vx: 0,
          vy: -60,
          life: 0.5,
          max: 0.5,
          kind: "star",
          color: `hsl(${Math.random() * 360},90%,70%)`,
          size: 3,
          grav: 0,
          rot: 0,
          spin: 6,
        });
      if (model.toxic && Math.random() < 0.12)
        fx2.add({
          x: p.x + (Math.random() - 0.5) * 34,
          y: p.y - 40 - Math.random() * 80,
          vx: 0,
          vy: -50,
          life: 0.8,
          max: 0.8,
          kind: "dot",
          color: "#b9e36a",
          size: 2.5,
          grav: -20,
        });
      if (model.zone === 9 && Math.random() < 0.03)
        fx2.add({
          x: p.x + p.face * 18,
          y: p.y - 122,
          vx: p.face * 30,
          vy: -20,
          life: 0.9,
          max: 0.9,
          kind: "dot",
          color: "rgba(235,248,255,.7)",
          size: 7,
          grav: -10,
        });
    }
    if (p.dead && p.death > 1.05 && !deathIris) {
      deathIris = true;
      fx2.irisTo(p.x - camera.x, p.y - 70 - camera.y, 0);
    }
    // Viento: restos que vuelan con la ráfaga.
    const ws = -model.wind;
    if (fx() && bridge.settings.weather && ws > 0.25 && Math.random() < ws * 0.35)
      debris.push({
        kind: ["bag", "paper", "leaf", "leaf", "paper"][Math.floor(Math.random() * 5)],
        x: W + 40,
        y: 120 + Math.random() * 380,
        vx: -(380 + Math.random() * 380),
        vy: (Math.random() - 0.5) * 60,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 10,
        t: Math.random() * 6,
      });
    for (const d of debris) {
      d.t += dt;
      d.x += d.vx * dt * (0.4 + ws * 0.8);
      d.y += (d.vy + Math.sin(d.t * 5) * 70) * dt;
      d.rot += d.spin * dt;
    }
    debris = debris.filter((d) => d.x > -80).slice(-40);
    // Tormenta: relámpagos ocasionales en la playa de descarga.
    lightning = Math.max(0, lightning - dt);
    if (model.zone < 2 && bridge.settings.weather && !reduced) {
      lightningNext -= dt;
      if (lightningNext <= 0) {
        lightningNext = 9 + Math.random() * 8;
        lightning = 0.45;
        thunderAt = 0.5 + Math.random() * 0.6;
      }
    }
    if (thunderAt > 0) {
      thunderAt -= dt;
      if (thunderAt <= 0) bridge.play("thunder");
    }
  }
  /* Pose de la botella, compartida por el dibujo, el reflejo y las estelas. */
  function pose(p, clone = false) {
    const imgs = bridge.sprites;
    let kind = "walk",
      idx = 0,
      h = 142;
    if (p.dead) {
      kind = "break";
      idx = Math.min(7, Math.floor(p.death / 0.15));
    } else if (model.shootPose > 0 && !clone && p.crouch < 0.5) {
      kind = model.toxic ? "toxicShoot" : model.cacao > 0 ? "chocoShoot" : "shoot";
      idx = kind === "toxicShoot" ? 3 : Math.min(2, Math.floor((0.24 - model.shootPose) * 13));
    } else if (p.state === "crouch") {
      kind = model.toxic ? "toxicCrouch" : "crouch";
      idx = model.toxic ? 4 : 2;
      h = 96;
    } else if (["rise", "fall", "apex", "land"].includes(p.state)) {
      kind = model.toxic ? "toxicRun" : "jump";
      idx = p.state === "rise" ? 3 : p.state === "fall" ? 5 : 4;
    } else if (p.state === "run") {
      kind = model.toxic ? "toxicRun" : "run";
      idx = Math.floor(p.phase) % 8;
    } else if (p.state === "skid") {
      kind = model.toxic ? "toxicCrouch" : "skid";
      idx = model.toxic ? 3 : 5;
    } else {
      kind = model.toxic ? "toxicWalk" : "walk";
      idx = p.state === "walk" ? Math.floor(p.phase) % 8 : 0;
    }
    const im = imgs[kind]?.[idx];
    return im ? { im, kind, h } : null;
  }
  function playerLook(kind) {
    if (model.uht > 0) return `hue-rotate(${(model.time * 400) % 360}deg) saturate(1.6) brightness(1.15)`;
    if (model.cacao > 0 && kind !== "chocoShoot") return "sepia(.75) saturate(1.5) hue-rotate(-12deg) brightness(.82)";
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
      g.filter =
        a.kind2 === "uht"
          ? `hue-rotate(${(a.life * 2000) % 360}deg) saturate(3) brightness(1.4)`
          : a.kind2 === "clone"
            ? "sepia(1) saturate(4) hue-rotate(300deg) brightness(1.1)"
            : "brightness(1.6) opacity(.8)";
      g.drawImage(a.im, -w / 2, -a.h, w, a.h);
      g.restore();
    }
  }
  function aura(p) {
    if (p.dead) return;
    const x = p.x,
      y = p.y - 70;
    if (model.uht > 0) {
      const r = g.createRadialGradient(x, y, 10, x, y, 120);
      r.addColorStop(0, `hsla(${(model.time * 400) % 360},100%,70%,.45)`);
      r.addColorStop(1, "hsla(0,100%,70%,0)");
      g.fillStyle = r;
      g.fillRect(x - 120, y - 120, 240, 240);
    }
    if (model.cacao > 0) glow(x, y, 90, "#b9773d2e");
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
    g.ellipse(x, y, r * 0.62, r, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(220,245,255,.7)";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(x, y, r * 0.62, r, 0, -2.4 + Math.sin(model.time) * 0.2, -1.6);
    g.stroke();
    g.restore();
  }
  /* Coordenadas de los fondos (que se mueven a 0,9): permiten animar objetos pintados en la ilustración. */
  const bgX = (tile, xt) => (tile * STRIDE - camera.x) * 0.9 + xt;
  const bgY = (yt) => yt - camera.y * 0.25;
  function fridgeDoors() {
    for (const d of model.doors) {
      if (d.xt == null) continue;
      const cx = bgX(9, d.xt),
        w = d.w,
        x0 = cx - w / 2,
        top = bgY(d.top),
        bot = bgY(d.bottom),
        h = bot - top,
        o = d.open;
      if (cx < -200 || cx > W + 200) continue;
      // Aviso: la luz interior titila antes de abrir.
      const phase = d.t % 6;
      if (phase > 2.3 && phase < 3) glow(cx, top + h / 2, 70, `rgba(200,240,255,${0.18 + Math.sin(model.time * 30) * 0.08})`);
      if (o <= 0.01) continue;
      g.save();
      // Interior iluminado y frío detrás de la puerta.
      g.globalAlpha = Math.min(1, o * 1.4);
      const inside = g.createLinearGradient(0, top, 0, bot);
      inside.addColorStop(0, "#f4fbff");
      inside.addColorStop(1, "#bfe8ff");
      g.fillStyle = inside;
      g.fillRect(x0 + 3, top + 3, w - 6, h - 6);
      g.fillStyle = "rgba(160,200,230,.55)";
      for (let k = 1; k < 4; k++) g.fillRect(x0 + 6, top + (h * k) / 4, w - 12, 3);
      // La hoja de vidrio gira hacia la cámara desde la bisagra izquierda.
      const swing = w * (1 - o * 0.82),
        lean = o * 26;
      g.globalAlpha = 0.92;
      g.fillStyle = "rgba(225,240,255,.35)";
      g.strokeStyle = "#cfd9e6";
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(x0, top);
      g.lineTo(x0 - lean, top - lean * 0.35);
      g.lineTo(x0 - lean - swing * 0.15, bot + lean * 0.5);
      g.lineTo(x0, bot);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = "#e9eef5";
      g.fillRect(x0 - lean * 0.9 - 3, top + h * 0.42, 5, h * 0.18);
      g.restore();
      // Niebla fría que cae y avanza por el piso hasta la línea de juego.
      if (fx()) {
        for (let k = 0; k < 16; k++) {
          const q = (model.time * 0.7 + k / 16) % 1,
            mx = cx + (k % 2 ? 1 : -1) * q * (40 + k * 6),
            my = bot + q * (FLOOR - camera.y - bot + 30),
            r = 18 + q * 46;
          const fog = g.createRadialGradient(mx, my, 0, mx, my, r);
          fog.addColorStop(0, `rgba(225,245,255,${0.32 * o * (1 - q)})`);
          fog.addColorStop(1, "rgba(225,245,255,0)");
          g.fillStyle = fog;
          g.fillRect(mx - r, my - r, r * 2, r * 2);
        }
      }
    }
  }
  /* Detalles animados sobre objetos pintados en cada fondo. */
  function zoneLife() {
    if (!fx() || !bridge.settings.weather) return;
    const t = model.time;
    // Fondo 6: tablero eléctrico que larga chispas.
    {
      const x = bgX(5, 432),
        y = bgY(262);
      if (x > -100 && x < W + 100 && t % 2.3 < 0.5) {
        glow(x, y, 40, "rgba(255,220,140,.35)");
        for (let k = 0; k < 6; k++) {
          const q = ((t * 3 + k * 0.17) % 1) * 1;
          ellipse(x + Math.sin(k * 7) * 20 * q, y + q * q * 110, 1.6, 1.6, `rgba(255,${200 + k * 8},120,${1 - q})`);
        }
      }
    }
    // Fondo 7: horno que respira calor y harina en el aire.
    {
      const x = bgX(6, 640),
        y = bgY(255);
      if (x > -300 && x < W + 300) {
        glow(x, y, 150 + Math.sin(t * 2.2) * 12, `rgba(255,170,70,${0.13 + Math.sin(t * 3.1) * 0.04})`);
        for (let k = 0; k < 18; k++) {
          const px = bgX(6, (k * 83 + t * 14) % 1280),
            py = bgY(140 + ((k * 47 + t * 10) % 260));
          ellipse(px, py, 1.4, 1.4, "rgba(255,248,232,.55)");
        }
      }
    }
    // Fondo 8: rociadores de las verduras.
    for (const xt of [905, 965, 1025]) {
      const x = bgX(7, xt),
        y = bgY(208);
      if (x < -100 || x > W + 100) continue;
      const on = (t + xt * 0.01) % 5 < 2;
      if (!on) continue;
      for (let k = 0; k < 8; k++) {
        const q = (t * 1.3 + k / 8) % 1;
        const fog = g.createRadialGradient(x + (k - 4) * 6 * q, y + q * 90, 0, x + (k - 4) * 6 * q, y + q * 90, 10 + q * 26);
        fog.addColorStop(0, `rgba(235,250,255,${0.22 * (1 - q)})`);
        fog.addColorStop(1, "rgba(235,250,255,0)");
        g.fillStyle = fog;
        g.fillRect(x - 60, y - 20, 120, 160);
      }
    }
    // Fondo 9: papelitos de oferta que caen de los carteles.
    if (model.zone >= 7 && model.zone <= 9)
      for (let k = 0; k < 10; k++) {
        const x = ((((k * 151 + t * 20) % 1400) + 1400) % 1400) - 60,
          y = ((k * 97 + t * 45) % 520) - 20;
        g.save();
        g.translate(x, y);
        g.rotate(t * 2 + k);
        g.scale(Math.abs(Math.sin(t * 3 + k)) + 0.2, 1);
        g.fillStyle = ["#ff5f8f", "#ffd23f", "#ffffff"][k % 3];
        g.globalAlpha = 0.5;
        g.fillRect(-3, -2, 6, 4);
        g.restore();
      }
    // Fondo 11: lectores láser rojos que barren en cada caja.
    for (const xt of [240, 520, 770, 1040]) {
      const x = bgX(10, xt),
        y = bgY(285);
      if (x < -80 || x > W + 80) continue;
      const a = 0.35 + Math.sin(t * 9 + xt) * 0.25;
      g.strokeStyle = `rgba(255,60,60,${a})`;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x - 14, y + Math.sin(t * 6 + xt) * 6);
      g.lineTo(x + 14, y - Math.sin(t * 6 + xt) * 6);
      g.stroke();
      glow(x, y, 16, `rgba(255,60,60,${a * 0.4})`);
    }
    // Fondo 12: neones que respiran y titilan.
    {
      const x = bgX(11, 900),
        y = bgY(150);
      if (x > -400 && x < W + 400) {
        const flick = Math.sin(t * 40) > 0.97 ? 0.05 : 0.18 + Math.sin(t * 1.7) * 0.05;
        glow(x, y, 260, `rgba(255,62,165,${flick})`);
        glow(bgX(11, 400), bgY(260), 220, `rgba(62,230,255,${0.12 + Math.sin(t * 1.3) * 0.04})`);
      }
    }
  }
  /* Viento y lluvia de la playa de descarga. */
  function weatherFront() {
    if (!bridge.settings.weather || !fx()) return;
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
        g.beginPath();
        g.moveTo(-12, -10);
        g.lineTo(12, -10);
        g.lineTo(9, 12);
        g.lineTo(-9, 12);
        g.closePath();
        g.fill();
        g.fillStyle = "#d62839";
        g.fillRect(-6, -2, 12, 5);
      } else if (d.kind === "paper") {
        g.scale(Math.abs(Math.sin(d.t * 4)) + 0.2, 1);
        g.fillStyle = "rgba(240,232,210,.9)";
        g.fillRect(-7, -9, 14, 18);
        g.fillStyle = "rgba(120,110,90,.6)";
        g.fillRect(-4, -5, 8, 1.5);
        g.fillRect(-4, -1, 8, 1.5);
      } else {
        g.fillStyle = ["#a07a3a", "#7f8f3c", "#b8642c"][Math.floor(d.t) % 3];
        g.beginPath();
        g.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    if (lightning > 0) {
      const a = lightning > 0.3 ? 0.5 : lightning > 0.22 ? 0.08 : lightning > 0.12 ? 0.35 : lightning * 1.5;
      g.fillStyle = `rgba(215,230,255,${a})`;
      g.fillRect(0, 0, W, H);
    }
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
      if (f.kind === "coin") {
        ellipse(0, 0, 10, 13, "#7e5624");
        ellipse(0, -1, 8, 11, "#f3cf7a");
      } else {
        g.rotate(-0.08);
        rect(-26, -15, 52, 30, "#d3e5c6", 3, "#fff0c8");
        label("+3", 0, 6, 18, "#203d36");
      }
      g.restore();
    }
  }
  function render() {
    if (!assets || !model) return;
    g.save();
    if (fx2 && fx2.kick > 0 && bridge.settings.shake && !reduced) shake = Math.max(shake, fx2.kick);
    if (shake > 0 && bridge.settings.shake) {
      g.translate(Math.sin(model.time * 80) * shake * 18, Math.cos(model.time * 71) * shake * 12);
    }
    g.translate(W / 2, H * 0.66);
    const zp = fx2 && fxOpts().impact ? fx2.zoomPunch : 0;
    g.scale(camera.zoom + zp, camera.zoom + zp);
    g.translate(-W / 2, -H * 0.66);
    background();
    g.save();
    g.translate(-camera.x, -camera.y);
    scenery();
    for (const i of model.items) item(i);
    hazards();
    for (const e of model.enemies) enemy(e);
    boss();
    const p = model.player;
    MilkRenderFinish.contact(g, p, model.platformsNow, FLOOR);
    bottle(p, false, true);
    if (model.clone) bottle(model.clone, true);
    drawTrail();
    aura(p);
    bottle(p);
    shieldBubble(p);
    for (const b of model.bullets) {
      ellipse(b.x, b.y, b.cacao ? 13 : 11, 7, b.cacao ? "#ad7547" : "#fff4dc");
      ellipse(b.x - Math.sign(b.vx) * 9, b.y, 7, 4, b.cacao ? "#654328" : "#dceae7");
    }
    if (fx())
      for (const q of particles) {
        g.globalAlpha = clamp(q.life / q.max, 0, 1);
        ellipse(q.x, q.y, q.r, q.r, q.color);
      }
    g.globalAlpha = 1;
    for (const t of texts) {
      g.globalAlpha = Math.min(1, t.life * 2);
      label(t.t, t.x, t.y, 15, t.color);
    }
    g.globalAlpha = 1;
    g.restore();
    if (fx2) fx2.drawWorld(g, camera.x, camera.y);
    weatherFront();
    g.restore();
    lighting();
    if (fx2) {
      if (fx2.iris.target > 1000) {
        fx2.iris.x = (p.x - camera.x) * camera.zoom;
        fx2.iris.y = (p.y - 70 - camera.y) * camera.zoom;
      }
      fx2.screen(g, {
        temp: 0,
        cold: model.zone === 9 && model.doors.some((d) => d.open > 0.4 && Math.abs(d.x - p.x) < 200),
        hp: model.hp,
        dead: p.dead,
        uht: model.uht > 0,
        t: model.time,
      });
    }
    drawFlyers();
    if (zoneTime > 0 && !model.boss.active) {
      const a = Math.min(1, zoneTime, (3.4 - zoneTime) * 2);
      g.save();
      g.globalAlpha = a;
      rect(42, 178, 300, 70, "#071623c9", 7, "#ffffff26");
      label(["01 / DESCARGA", "02 / DEPÓSITO", "03 / SALÓN", "04 / SALIDA"][Math.floor(model.zone / 3)], 61, 202, 10, "#dcbf90", "left");
      label(NAMES[model.zone], 61, 229, 22, "#f1e3c8", "left");
      g.restore();
    }
    // Foreground motes move faster than the scenery, subtle enough to preserve hazards' readability.
    if (fx() && bridge.settings.weather && model.zone < 6) {
      for (let i = 0; i < 7; i++) {
        const x = (((i * 293 - camera.x * 1.12 + Math.sin(model.time * 0.4 + i) * 18) % W) + W) % W;
        ellipse(x, 660 + (i % 3) * 12, 45, 9, "#829faf09");
      }
    }
  }
  window.MilkLevel2 = {
    configure(b) {
      bridge = b;
      MilkCityCinema.configure(b);
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
            days: model.days,
            seconds: model.seconds,
            player: { ...model.player },
            camera: { ...camera },
            score: model.score,
            coins: model.coins,
            checkpoint: model.checkpointIndex,
            tagged: model.tagged,
            toxic: model.toxic,
            clone: !!model.clone,
            blackout: model.blackout,
            boss: { ...model.boss },
            won: model.won,
            enemies: model.enemies.map((e) => ({ ...e })),
            bullets: model.bullets.length,
            assets: assets?.bg.length || 0,
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
              if (x < 12900) {
                model.boss.active = false;
                model.boss.state = "waiting";
                model.boss.timer = 0;
              }
              model.player.reset(x, y);
              camera.x = clamp(x - 330, 0, WIDTH - W);
              camera.y = 0;
            },
            set(k, v) {
              model[k] = v;
            },
            bossOpen() {
              model.boss.active = true;
              model.boss.state = "open";
              model.boss.timer = 100;
            },
            collect(kind) {
              const i = model.items.find((i) => i.kind === kind && !i.taken);
              if (i) model.collect(i);
            },
          }
        : null;
    },
  };
  window.MilkLevels = window.MilkLevels || {};
  window.MilkLevels[2] = { start };
})();
