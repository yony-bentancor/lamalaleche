/* Nivel 5 · «Bajo la superficie». Transición desde el cielo, presentación, HUD, cámara y todos los efectos
   del agua: capas con profundidad, haces de luz, cáusticas, nieve marina, burbujas, arena, niebla, color por
   zona, corrientes visibles y los eventos de la bestia. La lógica vive en level5-core.js. */
(() => {
  "use strict";
  const C = MilkLevel5Core,
    { W, WIDTH, ARENA_X, ARENA_RIGHT, NAMES, SECTIONS, FLAGS, CHASM, JETS } = C,
    H = 720,
    SAVE_KEY = "milk-v12-level5",
    PROGRESS_KEY = "milk-v12-progress",
    META = window.MilkLevel5Assets,
    TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp = (a, b, k) => a + (b - a) * k,
    ease = (x) => {
      x = clamp(x, 0, 1);
      return x * x * (3 - 2 * x);
    },
    rnd = (a, b) => a + Math.random() * (b - a);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Luz por fondo: cuánto llega del sol, oscuridad con luz propia, cáusticas y tinte de color.
     Se interpola con la cámara, así el ascenso se siente dentro de cada pantalla. */
  const ZONE = {
    light: [0.55, 0.28, 0.32, 0.26, 0.1, 0.36, 0.42, 0.56, 0.82, 0.74, 0.62, 1],
    dark: [0.04, 0.42, 0.36, 0.42, 0.6, 0.22, 0.14, 0.03, 0, 0.02, 0.16, 0],
    caustic: [0.22, 0.04, 0.07, 0.05, 0, 0.1, 0.12, 0.3, 0.55, 0.5, 0.4, 0.95],
    tint: [
      [31, 93, 99],
      [12, 40, 54],
      [16, 52, 64],
      [12, 40, 54],
      [4, 14, 26],
      [18, 62, 62],
      [24, 74, 72],
      [30, 92, 92],
      [44, 128, 132],
      [52, 136, 140],
      [40, 104, 108],
      [255, 214, 150],
    ],
  };
  /* Puntos lógicos de donde salen burbujas: grietas, cascos, valijas. */
  const VENTS = [
    [180, 470], [700, 440], [1060, 470], [1500, 455], [1900, 420], [2320, 470], [2700, 450], [3080, 300], [3450, 470], [3900, 445],
    [4300, 470], [5160, 370], [5700, 690], [6250, 370], [6600, 490], [7100, 460], [7600, 480], [8150, 490], [8600, 470], [9000, 480],
    [9500, 470], [10000, 480], [10400, 480], [10800, 475], [11300, 480], [11900, 470], [12600, 450], [13300, 440], [13900, 455], [14600, 500], [15100, 495],
  ];
  /* Algas propias (plano medio) y siluetas de primer plano. */
  const WEEDS = [];
  for (let i = 0; i < 12; i++) {
    const xs = i === 4 ? [60, 160, 1120, 1220] : [90 + ((i * 337) % 300), 520 + ((i * 211) % 260), 980 + ((i * 97) % 200)];
    for (const x of xs) WEEDS.push({ x: i * W + x, n: 3 + ((x + i) % 3), h: 70 + ((x * 7 + i * 13) % 90), hue: i });
  }
  const FRONT = [];
  for (let x = 900; x < WIDTH; x += 1150 + ((x / 7) % 420)) FRONT.push({ x, kind: ["alga", "cadena", "roca", "alga"][Math.floor(x / 1150) % 4], h: 170 + ((x / 3) % 120) });

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
    fx2 = null,
    cam = { x: 0, y: 0 },
    shake = 0,
    noticeTime = 0,
    zone = -1,
    zoneTime = 0,
    introT = 0,
    musicName = "",
    seen = new Set(),
    darkCanvas = null,
    vignette = null,
    quality = 2, // calidad automática: 2 completa, 1 media, 0 liviana
    emaDt = 1 / 60,
    slowT = 0,
    fastT = 0,
    raised = false,
    dg = null,
    causticTile = null,
    payloadScore = 0,
    hpFlash = 0,
    deathIris = false,
    bubbleT = 0,
    eyesT = -1,
    turnT = 0,
    bossTurnFace = 1,
    playTime = 0,
    wakeClock = 0;
  const parts = { bubbles: [], sand: [], streaks: [], fall: [], ink: [], wake: [], pulses: [] };
  let snowBack = [],
    snowFront = [],
    dust = [];
  const held = new Set(),
    touch = new Set();
  let jump = false,
    shot = false,
    whirlKey = false;
  const $ = (id) => host?.querySelector("#" + id);
  const fx = () => bridge.settings.effects !== false && !reduced;
  const weatherOn = () => bridge.settings.weather !== false;
  const shakeOn = () => bridge.settings.shake !== false && !reduced;

  function clear() {
    held.clear();
    touch.clear();
    jump = shot = whirlKey = false;
    host?.querySelectorAll("[data-k].pressed").forEach((b) => b.classList.remove("pressed"));
  }

  /* ---------- Carga ---------- */
  function im(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Falta " + src));
      i.src = src;
    });
  }
  function load() {
    if (assets) return Promise.resolve(assets);
    if (loading) return loading;
    const a = { bg: [], seam: [], art: {}, umb: {} };
    const sheets = Object.entries(META);
    const total = 12 + 11 + sheets.reduce((s, [, v]) => s + v.length, 0) + 8;
    let done = 0;
    const tick = (p) =>
      p.then((x) => {
        done++;
        if (host) {
          $("l5loadProgress").value = done / total;
          $("l5loadText").textContent = "Llenando el mar… " + Math.round((done / total) * 100) + "%";
        }
        return x;
      });
    const L4 = window.MilkLevel4Meta?.umb || {};
    loading = Promise.all([
      Promise.all(Array.from({ length: 12 }, (_, i) => tick(im(`assets/level5/bg-${String(i + 1).padStart(2, "0")}.webp`)))).then((v) => (a.bg = v)),
      // V12.4: franjas que funden cada fondo con el siguiente (tools/seams_v12_4.py).
      Promise.all(Array.from({ length: 11 }, (_, i) => tick(im(`assets/level5/seam-${String(i + 1).padStart(2, "0")}.webp`)))).then((v) => (a.seam = v)),
      ...sheets.map(async ([k, list]) => (a.art[k] = await Promise.all(list.map((_, i) => tick(im(`assets/level5/${k}-${i}.webp`)))))),
      // La transición usa el paraguas real del nivel 4 (antes era un semicírculo plano).
      ...["umbGlide", "umbClose"].map(async (k) => (a.umb[k] = await Promise.all((L4[k] || []).map((_, i) => tick(im(`assets/level4/${k}-${i}.webp`)))))),
    ]).then(() => {
      assets = a;
      buildCaustics();
      return a;
    });
    loading.catch(() => (loading = null));
    return loading;
  }
  /* Textura de cáusticas: una red de luz que se genera una sola vez. */
  function buildCaustics() {
    try {
      const S = 256,
        c = document.createElement("canvas");
      c.width = c.height = S;
      const cg = c.getContext("2d"),
        d = cg.createImageData(S, S);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const u = (x / S) * TAU,
            v = (y / S) * TAU;
          const a = Math.sin(u * 3 + Math.sin(v * 2) * 1.6) + Math.sin(v * 3 + Math.sin(u * 2 + 1) * 1.7) + Math.sin((u + v) * 2 + Math.sin(u - v) * 1.2) * 0.8;
          const k = Math.pow(Math.max(0, 1 - Math.abs(a) * 0.9), 3);
          const o = (y * S + x) * 4;
          d.data[o] = 210;
          d.data[o + 1] = 255;
          d.data[o + 2] = 240;
          d.data[o + 3] = Math.round(k * 255);
        }
      cg.putImageData(d, 0, 0);
      causticTile = c;
    } catch {
      causticTile = null;
    }
  }
  function safeSave(snap) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
      localStorage.setItem("milk-v11-level5", JSON.stringify({ unlocked: true, score: snap.score }));
    } catch {}
  }
  function saved() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      return s && typeof s.flag === "number" ? s : null;
    } catch {
      return null;
    }
  }
  function notice(t, time = 4.2) {
    if (!host) return;
    $("l5notice").textContent = t;
    noticeTime = time;
  }
  function hint(key, text) {
    if (seen.has(key)) return;
    seen.add(key);
    notice(text, 5);
  }

  /* ---------- Montaje ---------- */
  function mount() {
    host = document.createElement("section");
    host.id = "level5";
    host.setAttribute("aria-label", "Nivel 5: Bajo la superficie");
    const marks = FLAGS.map((f) => `<b style="left:${((f.x / WIDTH) * 100).toFixed(1)}%"></b>`).join("");
    host.innerHTML = `<div class="l5stage"><canvas id="l5canvas" width="1280" height="720" tabindex="0" aria-label="Juego de plataformas bajo el agua: caminá por la arena, nadá y llegá a la superficie"></canvas>
 <header class="l5hud" hidden><div class="l5identity"><span id="l5section">BAJO LA SUPERFICIE / NIVEL 05</span><strong id="l5place">El fondo del naufragio</strong><div class="l5track"><i id="l5trackFill"></i>${marks}<em>☀</em></div></div>
 <div class="l5status"><div class="l5health"><span id="l5condition">LECHE ENTERA</span><strong id="l5hp">100%</strong><div><i id="l5hpFill"></i></div></div><div class="l5whirl" id="l5whirlBox"><span>TORBELLINO</span><strong id="l5whirlState">LISTO · C</strong><div><i id="l5whirlFill"></i></div></div><button id="l5mute" aria-label="Sonido">♫</button><button id="l5pause" aria-label="Pausar">Ⅱ</button></div></header>
 <div class="l5sub" hidden><span>◉ <b id="l5pearls">0</b></span><span>⚑ <b id="l5flags">0/4</b></span><span id="l5score">000000</span><span id="l5powers"></span></div>
 <div id="l5bossHud" hidden><span><em>EL TRAGABARCOS</em> <b id="l5bossPct">100%</b></span><div><i id="l5bossFill"></i></div><small id="l5bossTip">Apuntá al farolito o a la boca abierta</small><div class="l5phases"><b id="l5ph1">I</b><b id="l5ph2">II</b></div></div>
 <div id="l5notice" role="status" aria-live="polite"></div>
 <div class="l5controlsHint" hidden>← → CAMINAR <span>SHIFT RÁPIDO</span><span>ESPACIO SALTAR · BRAZADA</span><span>↓ BUCEAR</span><span>X LECHE</span><span>C TORBELLINO</span><span>ESC PAUSA</span></div>
 <div id="l5touch" hidden><div><button data-k="ArrowLeft" aria-label="Izquierda">◀</button><button data-k="ArrowRight" aria-label="Derecha">▶</button><button data-k="ArrowDown" aria-label="Bucear">↓</button></div><div><button data-k="KeyC" aria-label="Torbellino">🌀</button><button data-k="ShiftLeft">RÁPIDO</button><button data-k="KeyX">LECHE</button><button data-k="Space">NADAR</button></div></div>
 <div class="l5caption" id="l5caption" aria-live="polite"></div>
 <button id="l5skip" class="l5skip" hidden>Saltar transición ▸</button>
 <div id="l5overlay" class="l5overlay"><div class="l5panel"><span class="l5eyebrow">NIVEL 05 · BAJO LA SUPERFICIE</span><h2>Bajo la<br>superficie<span>.</span></h2><p id="l5loadText">Llenando el mar…</p><progress id="l5loadProgress" max="1" value="0"></progress></div></div></div>`;
    document.body.append(host);
    canvas = $("l5canvas");
    g = canvas.getContext("2d", { alpha: false });
    $("l5pause").onclick = () => pause();
    $("l5mute").onclick = toggleSound;
    $("l5skip").onclick = skipIntro;
    host.querySelectorAll("[data-k]").forEach((b) => {
      b.onpointerdown = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        touch.add(b.dataset.k);
        b.classList.add("pressed");
        if (b.dataset.k === "Space") jump = true;
        if (b.dataset.k === "KeyX") shot = true;
        if (b.dataset.k === "KeyC") whirlKey = true;
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
    host.querySelector(".l5stage").style.setProperty("--s", Math.min(innerWidth / W, innerHeight / H));
    // Touch UI is a sibling of the scaled stage: CSS pixels stay finger-sized.
    const controls = $("l5touch");
    if (controls && controls.parentNode !== host) host.append(controls);
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
  const KEYS = ["Escape", "KeyP", "KeyM", "KeyF", "Space", "KeyZ", "KeyX", "KeyC", "KeyV", "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "KeyA", "KeyD", "KeyS", "KeyW", "ShiftLeft", "ShiftRight", "Enter"];
  function keydown(e) {
    if (mode === "off" || mode === "load") return;
    if (e.code === "Tab" && (mode === "pause" || mode === "complete")) {
      const btns = [...$("l5overlay").querySelectorAll("button,input")];
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
    if (mode === "intro") {
      if (["Space", "Enter", "Escape", "KeyX", "KeyZ"].includes(e.code)) skipIntro();
      if (e.code === "KeyM") toggleSound();
      return;
    }
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
    if (e.code === "KeyC" || e.code === "KeyV") whirlKey = true;
  }
  function keyup(e) {
    if (mode === "off" || mode === "load") return;
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

  /* ---------- Pausa, inicio y fin ---------- */
  function pause() {
    if (mode !== "play") return;
    mode = "pause";
    clear();
    const o = $("l5overlay"),
      s = bridge.settings;
    o.hidden = false;
    o.innerHTML = `<div class="l5panel" role="dialog" aria-modal="true" aria-labelledby="l5pauseTitle"><span class="l5eyebrow">UNA BURBUJA DE AIRE</span><h2 id="l5pauseTitle">En pausa<span>.</span></h2><p>Cada salto en el agua es una brazada. Bucear con ↓ te hunde rápido. El torbellino (C) se usa una sola vez en todo el nivel.</p><button class="l5primary" id="l5resume">SEGUIR NADANDO <span>→</span></button><button id="l5retry">Volver a la última bandera</button><button id="l5home">Volver al menú</button>
 <label><input type="checkbox" id="l5soundOpt" ${s.sound ? "checked" : ""}> Sonido</label><label><input type="checkbox" id="l5musicOpt" ${s.ambient !== false ? "checked" : ""}> Música</label><label><input type="checkbox" id="l5fxOpt" ${s.effects !== false ? "checked" : ""}> Partículas y efectos de agua</label><label><input type="checkbox" id="l5weatherOpt" ${s.weather !== false ? "checked" : ""}> Penumbra y luz propia</label><label><input type="checkbox" id="l5shakeOpt" ${s.shake !== false ? "checked" : ""}> Temblores de cámara</label><label>Volumen <input type="range" id="l5volume" min="0" max="100" value="${s.volume}"></label></div>`;
    $("l5resume").onclick = resume;
    $("l5retry").onclick = () => {
      model.respawn([]);
      resetView();
      resume();
    };
    $("l5home").onclick = stop;
    $("l5soundOpt").onchange = toggleSound;
    const opt = (id, key) =>
      ($(id).onchange = (e) => {
        bridge.settings[key] = e.target.checked;
        bridge.saveSettings();
      });
    opt("l5fxOpt", "effects");
    opt("l5musicOpt", "ambient");
    opt("l5weatherOpt", "weather");
    opt("l5shakeOpt", "shake");
    $("l5volume").oninput = (e) => {
      bridge.settings.volume = +e.target.value;
      bridge.saveSettings();
    };
    $("l5resume").focus();
  }
  function resume() {
    if (mode !== "pause") return;
    clear();
    mode = "play";
    $("l5overlay").hidden = true;
    canvas.focus();
    last = performance.now();
  }
  function resetView() {
    fx2?.reset();
    for (const k in parts) parts[k] = [];
    shake = 0;
    wakeClock = 0;
    const p = model.player;
    cam.x = model.arena ? ARENA_X : clamp(p.x - 420, 0, WIDTH - W);
    cam.y = 0;
    zone = -1;
  }
  async function start(payload = {}) {
    if (mode !== "off") return;
    bridge.enter();
    mode = "load";
    payloadScore = Number(payload.score) || 0;
    mount();
    try {
      await load();
    } catch (e) {
      $("l5loadText").textContent = e.message + " · Volvé a descomprimir el ZIP completo.";
      const b = document.createElement("button");
      b.textContent = "Volver al inicio";
      b.onclick = stop;
      $("l5overlay").querySelector(".l5panel").append(b);
      return;
    }
    if (!host) return;
    const save = payload.resume ? saved() : null;
    model = new C.Level5(save);
    if (!save && payloadScore) {
      model.score = payloadScore;
      model.saved = model.snapshot();
    }
    fx2 = new MilkFX();
    seeds();
    resetView();
    seen = new Set();
    playTime = 0;
    wakeClock = 0;
    eyesT = -1;
    bridge.activate();
    $("l5overlay").hidden = true;
    if (save || payload.skipIntro) beginPlay(save);
    else {
      mode = "intro";
      introT = 0;
      $("l5skip").hidden = false;
      $("l5skip").focus();
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function skipIntro() {
    if (mode !== "intro") return;
    beginPlay(null);
  }
  function beginPlay(save) {
    mode = "play";
    $("l5skip").hidden = true;
    $("l5caption").textContent = "";
    host.querySelectorAll(".l5hud,.l5sub,.l5controlsHint,#l5touch").forEach((el) => (el.hidden = false));
    fx2.iris.r = save ? 0 : 2000;
    if (save) fx2.irisTo(model.player.x - cam.x, model.player.y - 70, 2000);
    canvas.focus();
    acc = 0;
    notice(save ? "Retomás desde tu última bandera." : "Bajo el agua cada salto es una brazada: tocá SALTAR varias veces para nadar. C: torbellino (una sola vez).", 6);
    updateHUD();
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
  function complete() {
    if (mode === "complete") return;
    mode = "complete";
    clear();
    let best = 0;
    try {
      const prog = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      best = Math.max(prog.best5 || 0, model.score);
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...prog, level5: true, best5: best }));
      localStorage.removeItem(SAVE_KEY);
    } catch {}
    const st = model.stats,
      min = Math.floor(playTime / 60),
      sec = String(Math.floor(playTime % 60)).padStart(2, "0");
    const o = $("l5overlay");
    o.hidden = false;
    o.innerHTML = `<div class="l5panel wide" role="dialog" aria-modal="true" aria-labelledby="l5doneTitle"><span class="l5eyebrow">NIVEL 05 COMPLETADO</span><h2 id="l5doneTitle">¡A la<br>superficie<span>!</span></h2><p>El Tragabarcos se hundió en el abismo y la luz te llevó de vuelta arriba. La botella llegó a casa. Su viaje ya tiene un final.</p>
 <div class="l5stats"><div><span>Puntaje</span><b>${String(model.score).padStart(6, "0")}</b></div><div><span>Perlas</span><b>${model.pearls}</b></div><div><span>Enemigos</span><b>${st.kills}</b></div><div><span>Tiempo</span><b>${min}:${sec}</b></div><div><span>Torbellino</span><b>${model.whirl.charges ? "Sin usar" : "Usado"}</b></div><div><span>Mejor puntaje</span><b>${String(best).padStart(6, "0")}</b></div></div>
 <button class="l5primary" id="l5again">VOLVER A JUGAR <span>↺</span></button><button id="l5ending">Volver a ver el final</button><button id="l5intro">Ver la transición otra vez</button><button id="l5home">Volver al menú</button></div>`;
    $("l5again").onclick = () => {
      stop();
      window.MilkLevel5.start({ skipIntro: true });
    };
    $("l5intro").onclick = () => {
      stop();
      window.MilkLevel5.start({});
    };
    $("l5home").onclick = stop;
    $("l5ending").onclick = () => window.MilkEnding.play(() => $("l5again").focus());
    $("l5again").focus();
    window.MilkEnding.play(() => $("l5again").focus());
  }

  /* ---------- Eventos del modelo: sonido, partículas y avisos ---------- */
  const fxOpts = () => ({ effects: fx(), impact: bridge.settings.impact !== false && !reduced });
  const ITEM_TEXT = { leche: "LECHE FRESCA · Energía al 100%", tapa: "TAPA ESCUDO · Te protege de un golpe" };
  function bubbles(x, y, n, spread = 14, speed = 60) {
    if (!fx() && n > 2) n = 2;
    for (let i = 0; i < n; i++) parts.bubbles.push({ x: x + rnd(-spread, spread), y: y + rnd(-spread, spread), vx: rnd(-20, 20), vy: -rnd(speed * 0.6, speed * 1.4), r: rnd(2, 6), life: rnd(1.2, 2.6), t: Math.random() * 6 });
    if (parts.bubbles.length > 160) parts.bubbles.splice(0, parts.bubbles.length - 160);
  }
  function sand(x, y, n, big = false) {
    if (!fx()) return;
    for (let i = 0; i < n; i++) parts.sand.push({ x: x + rnd(-10, 10), y: y - rnd(0, 8), vx: rnd(-40, 40) * (big ? 1.8 : 1), vy: -rnd(10, big ? 70 : 35), r: rnd(6, big ? 22 : 13), life: rnd(0.7, 1.1), max: 1.1 });
    if (parts.sand.length > 90) parts.sand.splice(0, parts.sand.length - 90);
  }
  function event(e) {
    const p = model.player,
      o = fxOpts();
    switch (e.type) {
      case "jump":
        bridge.sound("jump");
        bubbles(p.x, p.y - 30, 4);
        sand(p.x, p.y, 5);
        break;
      case "stroke":
        bridge.play("puff");
        bubbles(p.x - p.face * 20, p.y - 60, 3, 10, 80);
        hint("stroke", "¡Eso es! Seguí tocando SALTAR para nadar hacia arriba.");
        break;
      case "land":
      case "hardland":
        bridge.sound("land");
        sand(e.x, e.y, e.type === "hardland" ? 12 : 6, e.type === "hardland");
        break;
      case "sand":
        sand(e.x, e.y, e.big ? 3 : 2, e.big);
        break;
      case "sandSmall":
        sand(e.x, e.y, e.big ? 8 : 1, e.big);
        break;
      case "shoot":
        bridge.play("shoot", {});
        bubbles(e.x + p.face * 40, e.y, 2, 6, 40);
        break;
      case "hurt":
        bridge.sound("damage");
        fx2.event({ type: "hurt", x: e.x, y: e.y }, o);
        fx2.hurtPulse = 1;
        fx2.text(e.x, e.y - 30, "−" + e.amount + "%", "#ff998b", 20);
        bubbles(p.x, p.y - 70, 14, 26, 90);
        hpFlash = 0.6;
        if (shakeOn()) shake = Math.max(shake, 0.18);
        if (e.kind === "tinta") hint("tinta", "Tinta del pulpo: no ves bien por unos segundos. ¡Salí de la nube!");
        break;
      case "death":
        bridge.sound("break");
        deathIris = false;
        bubbles(p.x, p.y - 70, 26, 30, 120);
        notice("Te quedaste sin leche. Volvés a la última bandera.");
        break;
      case "respawn":
        resetView();
        fx2.iris.r = 0;
        fx2.irisTo(model.player.x - cam.x, model.player.y - 70, 2000);
        notice("Bandera recuperada · Energía al 100%.");
        updateHUD();
        break;
      case "fall":
        bridge.play("whoosh", { down: true });
        break;
      case "recover":
        fx2.ring(e.x, e.y - 70, "#bfe6ff", 70, 3);
        notice("El abismo te escupió de vuelta a la orilla. −15%");
        break;
      case "collect":
        if (e.kind === "perla") {
          bridge.play("drop");
          fx2.burst(e.x, e.y, 8, "#f3fbff", 90, "star", { grav: -40 });
        } else {
          bridge.play(e.kind === "leche" ? "refill" : "shieldup");
          notice(ITEM_TEXT[e.kind]);
          fx2.ring(p.x, p.y - 70, e.kind === "leche" ? "#e6fff2" : "#9bd4ff", 100, 4);
          if (e.kind === "leche") hpFlash = 1;
        }
        break;
      case "checkpoint":
        safeSave(e.snapshot);
        bridge.play("checkpoint");
        fx2.ring(e.x, model.floorAt(e.x) - 90, "#ffe9a8", 120, 4);
        bubbles(e.x, model.floorAt(e.x) - 60, 18, 30, 110);
        notice("Bandera " + (e.index + 1) + "/4 · Partida guardada y energía al 100%.");
        break;
      case "points":
        fx2.text(e.x, e.y, "+" + e.value, "#fff2c4", 18);
        break;
      case "stomp":
        bridge.play("stomp");
        bubbles(e.x, e.y, 6);
        if (e.hide && e.kind === "cangrejo") hint("crab", "¡Se escondió en la tetera! Esperá a que asome para dispararle.");
        break;
      case "hit":
        bridge.play("enemyhit");
        fx2.burst(e.x, e.y, 6, "#fff4dc", 120);
        break;
      case "tink":
        bridge.play("clang");
        fx2.burst(e.x, e.y, 5, "#e8f4ff", 140, "star");
        if (e.kind === "almeja") hint("almeja", "Cerrada es de piedra. Disparale cuando abra la boca.");
        break;
      case "pop":
        bridge.play(e.kind === "globo" ? "pop" : "enemydeath");
        fx2.burst(e.x, e.y, 16, e.kind === "medusa" ? "#d7ffd9" : "#e9f3ee", 180, e.kind === "globo" ? "shard" : "dot", { grav: -60 });
        bubbles(e.x, e.y, 10, 30, 90);
        if (o.impact) fx2.hitstop = Math.max(fx2.hitstop, 0.045);
        break;
      case "shield":
        bridge.play("shieldbreak");
        fx2.ring(p.x, p.y - 70, "#9bd4ff", 90, 4);
        break;
      case "pinch":
        bridge.play("squeak");
        break;
      case "snapWarn":
        bridge.play("enemywarn");
        break;
      case "snap":
        bridge.play("slam");
        sand(e.x, e.y + 30, 6, true);
        if (shakeOn()) shake = Math.max(shake, 0.08);
        break;
      case "morena":
        bridge.play("dash");
        hint("morena", "¡Morena! Sale de los ojos de buey: pasá por arriba nadando.");
        break;
      case "inflate":
        bridge.play("puff");
        hint("globo", "El pez globo se infla y dispara cubiertos. Aplastalo cuando está desinflado.");
        break;
      case "cubiertos":
        bridge.play("throw");
        break;
      case "ink":
        bridge.play("splat");
        break;
      case "inkHit":
        bridge.play("splat");
        for (let i = 0; i < 8; i++) parts.ink.push({ x: e.x + rnd(-80, 80), y: e.y + rnd(-60, 60), r: rnd(40, 90), life: 3.2, max: 3.2, vx: rnd(-10, 10), vy: rnd(-12, 4) });
        break;
      case "swing":
        bridge.play("whoosh");
        break;
      case "criaSees":
        if (model.time - (event.criaT || -9) > 4) {
          bridge.play("enemywarn");
          event.criaT = model.time;
        }
        hint("cria", "Las crías persiguen tu luz. Un disparo alcanza para cada una.");
        break;
      case "whirlOn":
        safeSave(model.saved);
        if (fx()) parts.pulses.push({ x: p.x, y: p.y - 70, life: 1.1 });
        bridge.play("updraft");
        bridge.play("power");
        fx2.ring(p.x, p.y - 70, "#8fe6ff", 140, 5);
        fx2.flash = { a: 0.25, color: "#bff3ff" };
        notice("¡TORBELLINO! Invencible por unos segundos: arrasá con todo. ↑ ↓ para moverte.", 4);
        break;
      case "whirlOff":
        bridge.play("powerend");
        bubbles(p.x, p.y - 70, 16, 30, 100);
        break;
      case "whirlEmpty":
        bridge.play("block");
        notice("El torbellino ya se usó en este nivel.", 2.4);
        break;
      case "tremor":
        bridge.play("crumble");
        if (shakeOn()) shake = Math.max(shake, 0.12 + e.strength * 0.08);
        for (let i = 0; i < 40; i++) parts.fall.push({ x: rnd(0, W), y: rnd(-200, 0), vy: rnd(40, 110), vx: rnd(-10, 10), r: rnd(1, 2.6), life: rnd(2.5, 4) });
        bubbles(p.x + rnd(-300, 300), model.floorAt(p.x) || 600, 12, 200, 120);
        hint("tremor", "Algo enorme se mueve en el fondo…");
        break;
      case "eyes":
        eyesT = 0;
        bridge.play("enemywarn");
        break;
      case "gust":
        bridge.play("wind");
        hint("gust", "¡Corriente! Te arrastra: corré con SHIFT o agachate para resistirla.");
        break;
      case "bossIntro":
        bridge.play("alarm");
        notice("El agua se oscurece. Del abismo sube algo enorme…", 3.4);
        break;
      case "roar":
        bridge.play("horn");
        if (shakeOn()) shake = Math.max(shake, 0.35);
        bubbles(model.mouthPos().x, model.mouthPos().y, 30, 50, 160);
        break;
      case "chargeWarn":
        bridge.play("strikewarn");
        break;
      case "suction":
        bridge.play("updraft");
        hint("suction", "¡Aspira! Nadá en contra y disparale a la boca abierta: duele el triple.");
        break;
      case "spit":
        bridge.play("pop");
        break;
      case "crias":
        bridge.play("squeak");
        break;
      case "bite":
        bridge.play("slam");
        if (shakeOn()) shake = Math.max(shake, 0.3);
        bubbles(e.x, e.y, 20, 30, 140);
        break;
      case "turn":
        turnT = 0.5;
        break;
      case "bossHit":
        bridge.play("enemyhit");
        fx2.burst(e.spot === "farol" ? model.lantern().x : e.x, e.spot === "farol" ? model.lantern().y : e.y, e.spot === "farol" ? 12 : 6, e.spot === "farol" ? "#ffd27a" : "#e9f3ee", 160, "star");
        if (e.spot === "farol" || e.spot === "boca") fx2.text(e.x, e.y - 160, "¡" + e.spot.toUpperCase() + "! ×3", "#ffe0a0", 22);
        break;
      case "bossPhase":
        bridge.play("alarm");
        notice("¡El Tragabarcos se enfurece! Más rápido y con crías.", 3);
        if (shakeOn()) shake = Math.max(shake, 0.3);
        break;
      case "bossDown":
        bridge.play("blast");
        fx2.flash = { a: 0.5, color: "#fff2c8" };
        if (shakeOn()) shake = Math.max(shake, 0.5);
        bubbles(e.x, e.y, 40, 120, 180);
        notice("¡El Tragabarcos se hunde en el abismo!", 4);
        break;
      case "bossGone":
        safeSave(e.snapshot);
        bridge.play("victory");
        notice("El camino está libre. Nadá hacia la luz →", 6);
        break;
      case "complete":
        bridge.play("victory");
        break;
    }
  }

  /* ---------- HUD ---------- */
  function updateHUD() {
    if (!host || !model) return;
    const hp = Math.round(model.hp),
      b = model.boss;
    $("l5hp").textContent = hp + "%";
    $("l5hpFill").style.width = hp + "%";
    $("l5hpFill").style.background = hp > 60 ? "#ecdbb6" : hp > 30 ? "#f0c27a" : "#f08a76";
    $("l5condition").textContent = hp > 60 ? "LECHE ENTERA" : hp > 30 ? "MEDIO VASO" : "ÚLTIMAS GOTAS";
    $("l5pearls").textContent = model.pearls;
    $("l5flags").textContent = model.flag + 1 + "/4";
    $("l5score").textContent = String(model.score).padStart(6, "0");
    $("l5trackFill").style.width = ((model.player.x / WIDTH) * 100).toFixed(1) + "%";
    const wl = model.whirl;
    $("l5whirlState").textContent = wl.t > 0 ? "¡GIRANDO!" : wl.charges > 0 ? "LISTO · C" : "USADO";
    $("l5whirlFill").style.width = (wl.t > 0 ? (wl.t / C.WHIRL_TIME) * 100 : wl.charges > 0 ? 100 : 0) + "%";
    $("l5whirlBox").classList.toggle("used", wl.charges <= 0 && wl.t <= 0);
    $("l5whirlBox").classList.toggle("active", wl.t > 0);
    $("l5powers").textContent = model.shield ? "◍ TAPA ESCUDO" : "";
    $("l5mute").textContent = bridge.settings.sound ? "♫" : "×";
    const showBoss = b.state === "fight" || b.state === "intro" || b.state === "dying";
    $("l5bossHud").hidden = !showBoss;
    if (showBoss) {
      const pct = Math.round((b.hp / C.BOSS.hp) * 100);
      $("l5bossPct").textContent = pct + "%";
      $("l5bossFill").style.width = pct + "%";
      $("l5ph2").classList.toggle("on", b.phase === 2);
      $("l5ph1").classList.toggle("on", b.phase === 1);
      $("l5bossTip").textContent = b.attack === "suction" ? "¡Aspira! Nadá en contra · disparale a la boca" : b.attack === "charge" ? "¡Embestida! Subí o bajá nadando" : "Apuntá al farolito: duele el triple";
    }
    const z = model.zone;
    $("l5section").textContent = SECTIONS[Math.min(3, Math.floor(z / 3))];
    $("l5place").textContent = NAMES[z];
  }
  function music() {
    const mu = bridge.music?.();
    if (!mu || !model) return;
    const b = model.boss;
    const name = mode === "intro" ? "off" : mode === "pause" ? "pause" : mode === "complete" || model.won ? "victory" : model.arena ? "boss5" : model.zone === 4 ? "abyss5" : "level5";
    if (name === "off") {
      if (musicName !== "off") mu.set("off");
    } else mu.set(name, bridge.settings);
    musicName = name;
  }

  /* ---------- Bucle ---------- */
  function frame(ts) {
    if (!host) return;
    const dt = clamp((ts - last) / 1000 || 0, 0, 0.065);
    last = ts;
    music();
    if (mode === "intro") {
      introT += dt;
      drawIntro(introT);
      if (introT > 10.4) beginPlay(null);
      raf = requestAnimationFrame(frame);
      return;
    }
    if (mode === "play") adaptQuality(dt);
    if (fx2 && mode === "play") fx2.update(dt * (fxOpts().impact ? fx2.timeScale : 1));
    const frozen = mode === "play" && fx2 && fx2.hitstop > 0 && fxOpts().impact;
    if (mode === "play" && !frozen) {
      playTime += dt;
      acc += dt * (fx2 && fxOpts().impact ? fx2.timeScale : 1);
      while (acc >= 1 / 120) {
        const has = (...ks) => ks.some((k) => held.has(k) || touch.has(k));
        for (const e of model.step(1 / 120, {
          left: has("ArrowLeft", "KeyA"),
          right: has("ArrowRight", "KeyD"),
          down: has("ArrowDown", "KeyS"),
          up: has("ArrowUp", "KeyW"),
          run: has("ShiftLeft", "ShiftRight"),
          jump: has("Space", "KeyZ", "ArrowUp", "KeyW"),
          jumpPressed: jump,
          shoot: has("KeyX") || shot,
          whirlPressed: whirlKey,
        }))
          event(e);
        jump = shot = whirlKey = false;
        acc -= 1 / 120;
      }
      update(dt);
      if (model.complete) complete();
    } else if (!frozen) acc = 0;
    if (mode === "play" || mode === "pause" || mode === "complete") render(mode === "play" && !frozen ? dt : 0);
    $("l5notice").classList.toggle("visible", noticeTime > 0);
    raf = requestAnimationFrame(frame);
  }
  /* Si el equipo no llega a mover todos los efectos, se apagan los más costosos sin tocar el juego. */
  function adaptQuality(dt) {
    if (dt <= 0) return;
    emaDt = emaDt * 0.94 + dt * 0.06;
    const fps = 1 / emaDt;
    slowT = fps < 44 ? slowT + dt : 0;
    fastT = fps > 58 ? fastT + dt : 0;
    if (slowT > 2 && quality > 0) {
      quality--;
      slowT = 0;
      emaDt = 1 / 60;
    } else if (fastT > 10 && quality < 2 && !raised) {
      quality++;
      raised = true;
      fastT = 0;
    }
  }
  function update(dt) {
    const p = model.player;
    // Cámara: mira un poco hacia adelante; en la arena queda fija.
    let tx;
    if (model.arena) tx = ARENA_X;
    else {
      const look = Math.abs(p.vx) > 30 ? p.face * 90 : 0;
      tx = clamp(p.x - W * 0.4 - look, 0, WIDTH - W);
    }
    cam.x += (tx - cam.x) * Math.min(1, dt * (model.arena ? 2.5 : 4.5));
    const ty = p.y > 620 ? clamp(p.y - 600, 0, 240) : 0;
    cam.y += (ty - cam.y) * Math.min(1, dt * 4);
    shake = Math.max(0, shake - dt * 0.6);
    noticeTime = Math.max(0, noticeTime - dt);
    hpFlash = Math.max(0, hpFlash - dt);
    if (turnT > 0) turnT -= dt;
    if (eyesT >= 0) eyesT += dt;
    if (model.zone !== zone) {
      zone = model.zone;
      zoneTime = 3.4;
    }
    zoneTime = Math.max(0, zoneTime - dt);
    if (p.dead && p.death > 1.6 && !deathIris) {
      deathIris = true;
      fx2.irisTo(p.x - cam.x, p.y - 70 - cam.y, 0);
    }
    updateParts(dt);
    updateHUD();
  }
  function seeds() {
    snowBack = Array.from({ length: 90 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.4, 1.4), p: rnd(0.3, 0.7), w: rnd(0, 6) }));
    snowFront = Array.from({ length: 14 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(2.5, 4.5), p: rnd(1.2, 1.5), w: rnd(0, 6) }));
    dust = Array.from({ length: 60 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.8, 1.8), w: rnd(0, 6) }));
  }
  function updateParts(dt) {
    const p = model.player,
      t = model.time,
      on = fx();
    // Burbujas que suben con zigzag, aceleran y estallan.
    for (const b of parts.bubbles) {
      b.life -= dt;
      b.t += dt;
      b.vy -= 40 * dt;
      b.x += (b.vx + Math.sin(b.t * 5) * 18) * dt;
      b.y += b.vy * dt;
      if (b.y < 40) b.life = Math.min(b.life, 0.05);
    }
    parts.bubbles = parts.bubbles.filter((b) => b.life > 0);
    for (const s of parts.sand) {
      s.life -= dt;
      s.vx *= 1 - dt * 2;
      s.vy *= 1 - dt * 2;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += dt * 10;
    }
    parts.sand = parts.sand.filter((s) => s.life > 0);
    for (const f of parts.fall) {
      f.life -= dt;
      f.y += f.vy * dt;
      f.x += f.vx * dt;
    }
    parts.fall = parts.fall.filter((f) => f.life > 0 && f.y < H);
    for (const k of parts.ink) {
      k.life -= dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.r += dt * 8;
    }
    parts.ink = parts.ink.filter((k) => k.life > 0);
    for (const w of parts.wake) { w.life -= dt; w.x += w.vx * dt; w.y -= dt * 15; }
    parts.wake = parts.wake.filter(w => w.life > 0);
    for (const pulse of parts.pulses) pulse.life -= dt;
    parts.pulses = parts.pulses.filter(pulse => pulse.life > 0);
    if (!on) { parts.wake = []; parts.pulses = []; return; }
    wakeClock -= dt;
    if (quality > 0 && !p.dead && !p.grounded && Math.hypot(p.vx, p.vy) > 90 && wakeClock <= 0) {
      wakeClock = quality === 2 ? 0.045 : 0.09;
      parts.wake.push({ x: p.x - p.face * 17, y: p.y - 65 + rnd(-12, 12), vx: -p.vx * 0.12, life: 0.8, r: rnd(3, 6) });
      if (parts.wake.length > 24) parts.wake.shift();
    }
    // Burbujas ambientales desde puntos lógicos cercanos a la cámara.
    bubbleT -= dt;
    if (bubbleT <= 0) {
      bubbleT = 0.18;
      for (const [vx, vy] of VENTS) if (vx > cam.x - 40 && vx < cam.x + W + 40 && Math.random() < 0.18) bubbles(vx, vy, 1 + (Math.random() < 0.3 ? 2 : 0), 6, 50);
      for (const j of JETS) if (model.jetOn(j) && Math.abs(j.x - cam.x - 640) < 900) bubbles(j.x, model.floorAt(j.x) - 5, 4, 30, 260);
    }
    // Burbujas de la botella: al caer rápido y durante el torbellino.
    if (!p.dead && !p.grounded && p.vy > 170 && Math.random() < dt * 8) bubbles(p.x, p.y - 120, 1, 8, 40);
    if (model.whirl.t > 0 && Math.random() < dt * 30) {
      const a = t * 9;
      parts.bubbles.push({ x: p.x + Math.cos(a) * 50, y: p.y - 70 + Math.sin(a * 0.7) * 60, vx: -Math.sin(a) * 120, vy: -60, r: rnd(2, 5), life: 0.8, t: 0 });
      if (p.grounded || model.floorAt(p.x) - p.y < 60) sand(p.x, model.floorAt(p.x) || p.y, 1, true);
    }
    // Corrientes visibles: líneas que cruzan la pantalla.
    const gustDir = model.gustActive(p.x)?.fx || 0;
    if (model.gust > 0.2 && Math.random() < dt * 26 * model.gust) parts.streaks.push({ x: gustDir > 0 ? -80 : W + 80, y: rnd(80, 640), vx: Math.sign(gustDir || 1) * rnd(700, 1000), vy: rnd(-60, 30), len: rnd(60, 180), life: 2 });
    const b = model.boss;
    if (b.state === "fight" && b.suction && Math.random() < dt * 30) {
      const m = model.mouthPos(),
        a = rnd(0, TAU),
        r = rnd(300, 600);
      parts.streaks.push({ x: m.x - cam.x + Math.cos(a) * r, y: m.y + Math.sin(a) * r * 0.6, tx: m.x - cam.x, ty: m.y, len: rnd(30, 70), life: 1, suck: true });
    }
    for (const s of parts.streaks) {
      s.life -= dt;
      if (s.suck) {
        s.x += (s.tx - s.x) * dt * 3;
        s.y += (s.ty - s.y) * dt * 3;
      } else {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      }
    }
    parts.streaks = parts.streaks.filter((s) => s.life > 0 && s.x > -300 && s.x < W + 300);
  }

  /* ---------- Dibujo: utilidades ---------- */
  function ellipse(x, y, rx, ry, color) {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
    g.fill();
  }
  const glowCache = new Map();
  function glowSprite(color) {
    let c = glowCache.get(color);
    if (c) return c;
    c = document.createElement("canvas");
    c.width = c.height = 128;
    const cg = c.getContext("2d"),
      gr = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, color);
    gr.addColorStop(1, "rgba(0,0,0,0)");
    cg.fillStyle = gr;
    cg.fillRect(0, 0, 128, 128);
    glowCache.set(color, c);
    return c;
  }
  function glow(x, y, r, color, a = 1) {
    if (a <= 0.01) return;
    const prev = g.globalAlpha,
      op = g.globalCompositeOperation;
    g.globalAlpha = prev * Math.min(1, a);
    g.globalCompositeOperation = "lighter";
    g.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    g.globalAlpha = prev;
    g.globalCompositeOperation = op;
  }
  function rect(x, y, w, h, color, r = 0, stroke) {
    g.fillStyle = color;
    g.beginPath();
    g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h);
    g.fill();
    if (stroke) {
      g.strokeStyle = stroke;
      g.lineWidth = 1;
      g.stroke();
    }
  }
  function label(t, x, y, size = 14, color = "#f3e5c7", align = "center", weight = 900) {
    g.font = `${weight} ${size}px Arial`;
    g.textAlign = align;
    g.fillStyle = color;
    g.fillText(t, x, y);
  }
  /* Dibuja un cuadro de una hoja. anchor: center (cuerpo), bottom (pies) o ring (ojo de buey). */
  function sprite(name, i, x, y, scale, face = 1, opt = {}) {
    const list = assets.art[name];
    if (!list) return;
    const idx = ((i % list.length) + list.length) % list.length,
      img = list[idx],
      m = META[name][idx];
    const w = m.w * scale,
      h = m.h * scale;
    let ax = m.cx * scale,
      ay = m.cy * scale;
    if (opt.anchor === "bottom") ay = h;
    if (opt.anchor === "ring") {
      ax = m.rx * scale;
      ay = m.ry * scale;
    }
    g.save();
    g.translate(x, y);
    if (opt.rot) g.rotate(opt.rot);
    g.scale(face, opt.flipY ? -1 : 1);
    if (opt.alpha !== undefined) g.globalAlpha *= opt.alpha;
    if (opt.filter) g.filter = opt.filter;
    g.drawImage(img, -ax, -ay, w, h);
    g.restore();
    return { w, h, ax, ay, m };
  }
  const zoneVal = (key) => {
    const f = clamp((cam.x + W / 2) / W - 0.5, 0, 11),
      i = Math.floor(f),
      k = f - i,
      arr = ZONE[key];
    return lerp(arr[i], arr[Math.min(11, i + 1)], k);
  };
  const zoneTint = () => {
    const f = clamp((cam.x + W / 2) / W - 0.5, 0, 11),
      i = Math.floor(f),
      k = f - i,
      a = ZONE.tint[i],
      b = ZONE.tint[Math.min(11, i + 1)];
    return a.map((v, j) => Math.round(lerp(v, b[j], k)));
  };

  /* ---------- Escenario ---------- */
  // Altura donde termina la distorsión del agua en cada fondo (el piso no ondula).
  const cutOf = (i) => (i === 4 ? 360 : (C.SEGMENTS.find((s) => s.x >= i * W && s.x < (i + 1) * W) || { y: 500 }).y - 24);
  // Misma fase en todos los fondos: así las uniones no se desfasan al ondular.
  const waveDx = (y, cut, t) => Math.sin(y * 0.035 + t * 1.3) * (1.8 - (Math.min(y, 480) / 480) * 0.9);
  function background(t) {
    const first = Math.floor(cam.x / W),
      wave = fx() && quality === 2 ? 1 : 0;
    for (let i = first; i <= first + 1 && i < 12; i++) {
      const img = assets.bg[i],
        x0 = Math.round(i * W - cam.x);
      if (x0 >= W || x0 + W <= 0) continue;
      const
        floorY = (C.SEGMENTS.find((s) => s.x >= i * W && s.x < (i + 1) * W) || { y: 500 }).y;
      const cut = cutOf(i);
      // Distorsión suave del agua en los planos lejanos (franjas desplazadas 1–2 px).
      if (wave) {
        for (let y = 0; y < cut; y += 16) {
          const hh = Math.min(16, cut - y),
            dx = waveDx(y, cut, t);
          g.drawImage(img, 0, y, W, hh, x0 + dx, y, W, hh);
        }
      } else g.drawImage(img, 0, 0, W, cut, x0, 0, W, cut);
      // Respiración del lomo: en el fondo 10 el suelo sube y baja apenas.
      const breathe = i === 9 && wave ? Math.sin(t * 0.9) * 1.6 : 0;
      g.drawImage(img, 0, cut, W, H - cut, x0, cut + breathe, W, H - cut);
      if (breathe) g.drawImage(img, 0, cut, W, 2, x0, cut - 1, W, 2);
    }
    // Uniones: cada franja tapa el corte entre dos fondos con una transición suave.
    for (let i = Math.max(0, first - 1); i <= first + 1 && i < 11; i++) {
      const img = assets.seam[i];
      if (!img) continue;
      const sx = Math.round((i + 1) * W - cam.x - img.width / 2);
      if (sx >= W || sx + img.width <= 0) continue;
      const cut = Math.min(cutOf(i), cutOf(i + 1));
      if (wave) {
        for (let y = 0; y < cut; y += 16) {
          const hh = Math.min(16, cut - y);
          g.drawImage(img, 0, y, img.width, hh, sx + waveDx(y, cut, t), y, img.width, hh);
        }
      } else g.drawImage(img, 0, 0, img.width, cut, sx, 0, img.width, cut);
      g.drawImage(img, 0, cut, img.width, H - cut, sx, cut, img.width, H - cut);
    }
    // Debajo del borde del abismo (cuando la cámara baja) solo hay oscuridad.
    if (cam.y > 0) {
      const gr = g.createLinearGradient(0, H - cam.y, 0, H);
      gr.addColorStop(0, "#071722");
      gr.addColorStop(1, "#010508");
      g.fillStyle = gr;
      g.fillRect(0, H - cam.y, W, cam.y + 2);
    }
  }
  /* Niebla en franjas que se desplazan a distintas velocidades. */
  let fogBlob = null;
  function fog(t, front) {
    if (!fx() || quality < (front ? 2 : 1)) return;
    if (!fogBlob) {
      fogBlob = document.createElement("canvas");
      fogBlob.width = 256;
      fogBlob.height = 64;
      const fg = fogBlob.getContext("2d");
      fg.translate(128, 32);
      fg.scale(1, 0.25);
      const gr = fg.createRadialGradient(0, 0, 4, 0, 0, 128);
      gr.addColorStop(0, "rgba(200,240,235,1)");
      gr.addColorStop(1, "rgba(200,240,235,0)");
      fg.fillStyle = gr;
      fg.fillRect(-128, -128, 256, 256);
    }
    const light = zoneVal("light");
    const bands = front ? [{ y: 560, sp: 0.6, a: 0.06, h: 180 }] : [{ y: 250, sp: 0.18, a: 0.1, h: 240 }, { y: 400, sp: 0.32, a: 0.08, h: 180 }];
    const prev = g.globalAlpha;
    for (const band of bands) {
      g.globalAlpha = band.a * (0.6 + light * 0.6);
      for (let k = 0; k < 3; k++) {
        const x = ((((k * 900 - cam.x * band.sp - t * 12 * band.sp) % 1800) + 1800) % 1800) - 300;
        g.drawImage(fogBlob, x - 520, band.y - band.h / 2, 1040, band.h);
      }
    }
    g.globalAlpha = prev;
  }
  /* Haces de luz animados: oscilan en opacidad y se mecen sin sincronizarse. */
  function shafts(t) {
    const light = zoneVal("light");
    if (light < 0.06 || !weatherOn()) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    const surface = light > 0.95;
    for (let i = 0; i < (quality === 2 ? 7 : quality === 1 ? 5 : 3); i++) {
      const wx = i * 420 + 130,
        x = ((wx - cam.x * 0.35) % 2940 + 2940) % 2940 - 300;
      const period = 6 + (i % 5);
      const a = (0.3 + 0.3 * (0.5 + 0.5 * Math.sin((t / period) * TAU + i * 1.7))) * light * 0.22;
      const sway = Math.sin(t / (period + 1) + i) * 8;
      const w0 = 30 + (i % 3) * 22,
        w1 = w0 * 4.2;
      const gr = g.createLinearGradient(0, 0, 0, H * 0.85);
      gr.addColorStop(0, surface ? `rgba(255,240,190,${a * 1.4})` : `rgba(190,255,235,${a})`);
      gr.addColorStop(1, "rgba(190,255,235,0)");
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x + sway, 0);
      g.lineTo(x + sway + w0, 0);
      g.lineTo(x + sway * 3 + w1 + 160, H * 0.85);
      g.lineTo(x + sway * 3 + 140, H * 0.85);
      g.closePath();
      g.fill();
    }
    g.restore();
  }
  const shaftLight = (sx, sy, t) => {
    let k = 0;
    for (let i = 0; i < 7; i++) {
      const wx = i * 420 + 130,
        x = ((wx - cam.x * 0.35) % 2940 + 2940) % 2940 - 300,
        sway = Math.sin(t / (7 + (i % 5)) + i) * 8,
        w0 = 30 + (i % 3) * 22,
        f = sy / (H * 0.85);
      const left = x + sway + f * (sway * 2 + 140),
        right = left + w0 + f * (w0 * 3.2 + 20);
      if (sx > left && sx < right) k = Math.max(k, 1 - f);
    }
    return k;
  };
  /* Cáusticas: la red de luz de la superficie sobre la arena y los barcos. */
  let causticSmall = null,
    csg = null;
  const CQ = 4; // las cáusticas se calculan a 1/4 de resolución: son suaves igual
  function caustics(t) {
    const k = zoneVal("caustic");
    if (!causticTile || k < 0.02 || !fx() || quality < 1) return;
    if (!causticSmall) {
      causticSmall = document.createElement("canvas");
      causticSmall.width = W / CQ;
      causticSmall.height = (H - 130) / CQ;
      csg = causticSmall.getContext("2d");
    }
    const cw = causticSmall.width,
      ch = causticSmall.height;
    csg.globalCompositeOperation = "source-over";
    csg.clearRect(0, 0, cw, ch);
    for (let layer = 0; layer < (quality === 2 ? 2 : 1); layer++) {
      const size = (layer ? 2.4 : 1.7) * (256 / CQ);
      const ox = -(((cam.x * 0.9 + t * (layer ? 14 : -10)) / CQ) % size) - size,
        oy = (((t * (layer ? 6 : 9)) / CQ) % size) - size;
      csg.globalAlpha = layer ? 0.7 : 1;
      csg.globalCompositeOperation = layer ? "lighter" : "source-over";
      for (let y = oy; y < ch; y += size) for (let x = ox; x < cw; x += size) csg.drawImage(causticTile, x, y, size + 0.5, size + 0.5);
    }
    const prev = g.globalAlpha,
      op = g.globalCompositeOperation;
    g.globalAlpha = Math.min(1, k * 0.2);
    g.globalCompositeOperation = "lighter";
    g.drawImage(causticSmall, 0, 130, W, H - 130);
    g.globalAlpha = prev;
    g.globalCompositeOperation = op;
  }
  function snow(list, front, t) {
    if (!fx() || (front && quality < 2)) return;
    const count = front ? list.length : quality === 2 ? list.length : quality === 1 ? 45 : 22;
    const light = zoneVal("light");
    g.save();
    g.fillStyle = front ? "rgba(225,245,240,.22)" : `rgba(215,240,235,${0.25 + light * 0.25})`;
    for (let n = 0; n < count; n++) {
      const s = list[n];
      const x = (((s.x - cam.x * s.p + Math.sin(t * 0.4 + s.w) * 14) % (W + 40)) + W + 40) % (W + 40) - 20,
        y = ((s.y + t * (front ? 14 : 9) * s.s) % (H + 20)) - 10;
      if (front) {
        g.globalAlpha = 0.45;
        g.beginPath();
        g.arc(x, y, s.s, 0, TAU);
        g.fill();
      } else g.fillRect(x, y, s.s, s.s);
    }
    g.restore();
  }
  /* Polvo que solo brilla dentro de los haces de luz. */
  function shaftDust(t) {
    const light = zoneVal("light");
    if (!fx() || light < 0.3 || quality < 2) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    const gold = light > 0.9;
    for (const d of dust) {
      const x = (((d.x - cam.x * 0.5 + Math.sin(t * 0.3 + d.w) * 20) % W) + W) % W,
        y = (d.y + t * 6 * d.s) % H;
      const k = shaftLight(x, y, t);
      if (k <= 0.02) continue;
      g.fillStyle = gold ? `rgba(255,224,150,${k * 0.8})` : `rgba(220,255,240,${k * 0.6})`;
      g.fillRect(x, y, d.s * 1.6, d.s * 1.6);
    }
    g.restore();
  }
  /* Algas propias en el plano medio: base fija, la punta se mueve más, todas con la misma corriente. */
  function weeds(t, front = false) {
    const gustDir = (model.gustActive(model.player.x)?.fx || 0) > 0 ? 1 : -1;
    const lean = model.gust * gustDir * 0.9 + (model.tremor.on ? Math.sin(t * 20) * 0.25 : 0);
    const b = model.boss,
      suck = b.state === "fight" && b.suction ? model.mouthPos() : null;
    g.save();
    g.lineCap = "round";
    for (const w of WEEDS) {
      const sx = w.x - cam.x;
      if (sx < -100 || sx > W + 100) continue;
      const fy = model.floorAt(w.x) ?? 400;
      for (let k = 0; k < w.n; k++) {
        const x = sx + k * 9 - w.n * 4,
          h = w.h * (0.7 + ((k * 37) % 30) / 100);
        let bend = Math.sin(t * 0.9 + w.x * 0.01 + k) * 0.18 + lean;
        if (suck) bend += Math.sign(suck.x - w.x) * 0.6;
        g.strokeStyle = ["#0f3a3c", "#164d47", "#1f5f52", "#29705c"][(k + w.hue) % 4];
        g.lineWidth = 6 - k * 0.6;
        g.beginPath();
        g.moveTo(x, fy + 4);
        g.quadraticCurveTo(x + bend * h * 0.3, fy - h * 0.5, x + bend * h * 0.9 + Math.sin(t * 1.7 + k) * 5, fy - h);
        g.stroke();
      }
    }
    g.restore();
  }
  /* Silueta de primer plano: pasa delante de la cámara de vez en cuando, oscura y algo desenfocada. */
  function foreground(t) {
    if (!fx() || quality < 1) return;
    g.save();
    for (const f of FRONT) {
      const sx = f.x - cam.x * 1.35;
      if (sx < -260 || sx > W + 260) continue;
      g.fillStyle = "rgba(2,9,13,.92)";
      g.strokeStyle = "rgba(2,9,13,.9)";
      if (f.kind === "roca") {
        g.beginPath();
        g.moveTo(sx - 160, H + 10);
        g.quadraticCurveTo(sx - 120, H - f.h * 0.55, sx - 30, H - f.h * 0.62);
        g.quadraticCurveTo(sx + 60, H - f.h * 0.7, sx + 150, H + 10);
        g.fill();
      } else if (f.kind === "cadena") {
        g.lineWidth = 7;
        const sway = Math.sin(t * 0.7 + f.x) * 10;
        for (let k = 0; k < 9; k++) {
          const y = -10 + k * 24,
            x = sx + sway * (k / 9);
          g.beginPath();
          g.ellipse(x, y, k % 2 ? 6 : 10, k % 2 ? 13 : 9, 0, 0, TAU);
          g.stroke();
        }
      } else {
        g.lineCap = "round";
        for (let k = 0; k < 4; k++) {
          const x = sx + k * 18 - 30,
            h = f.h * (0.6 + k * 0.12),
            bend = Math.sin(t * 0.8 + k + f.x) * 0.2 + model.gust * 0.5;
          g.lineWidth = 14 - k * 2;
          g.beginPath();
          g.moveTo(x, H + 10);
          g.quadraticCurveTo(x + bend * h * 0.4, H - h * 0.5, x + bend * h, H - h);
          g.stroke();
        }
      }
    }
    g.restore();
  }
  /* La bestia: ojos en el abismo, brillo ámbar que respira, mástil que cae y barco que se desliza lejos. */
  function beast(t) {
    const cx = CHASM.x + CHASM.w / 2 - cam.x;
    if (cx > -800 && cx < W + 800) {
      const breath = 0.5 + 0.5 * Math.sin(t * 0.55);
      glow(cx, H - 20 - cam.y * 0.2, 380, "rgba(255,150,40,.32)", 0.35 + breath * 0.45);
      if (eyesT >= 0 && eyesT < 1.6) {
        const open = eyesT < 0.3 ? eyesT / 0.3 : eyesT > 1.3 ? (1.6 - eyesT) / 0.3 : 1;
        for (const dx of [-70, 70]) {
          glow(cx + dx, 640 - cam.y, 60, "rgba(255,170,40,.8)", open);
          ellipse(cx + dx, 640 - cam.y, 22, 14 * open, "#ffcf6a");
          ellipse(cx + dx, 640 - cam.y, 5, 13 * open, "#2a1200");
        }
      }
    }
    if (!fx()) return;
    // Mástil que se desprende y cae en el plano lejano (fondo 3).
    const mx = 2 * W + 700 - cam.x * 0.7 + cam.x * 0 - (2 * W + 700) * 0.3;
    const ft = (model.player.x - (2 * W + 200)) / 260;
    if (ft > 0 && ft < 4 && mx > -200 && mx < W + 200) {
      const a = ease(ft / 2.2) * 1.25;
      g.save();
      g.globalAlpha = 0.32 * (1 - ease((ft - 3) / 1));
      g.translate(mx, 420);
      g.rotate(-a);
      g.fillStyle = "#08202a";
      g.fillRect(-6, -300, 12, 300);
      g.fillRect(-60, -250, 120, 7);
      g.fillRect(-45, -180, 90, 6);
      g.restore();
    }
    // Barco que se desliza en el plano lejano (fondo 6).
    const bx = 5 * W + 300 - cam.x * 0.4 - 5 * W * 0.6 + ((t * 9) % 900);
    if (bx > -400 && bx < W + 400 && cam.x > 4.5 * W && cam.x < 6.5 * W) {
      g.save();
      g.globalAlpha = 0.2;
      g.fillStyle = "#0b2a32";
      g.translate(bx, 300 + Math.sin(t * 0.3) * 6);
      g.rotate(0.12);
      g.beginPath();
      g.moveTo(-160, 0);
      g.lineTo(160, 0);
      g.lineTo(120, 50);
      g.lineTo(-130, 50);
      g.fill();
      g.fillRect(-10, -160, 8, 160);
      g.fillRect(70, -120, 7, 120);
      g.restore();
    }
  }
  /* Toques de humor: un paraguas que gira solo, una burbuja gigante con un zapato y peces haciendo cola. */
  function humor(t) {
    if (!fx() || quality < 1) return;
    const ux = 3 * W + 560 + Math.sin(t * 0.3) * 120 - cam.x,
      uy = 250 + Math.sin(t * 0.7) * 30;
    if (ux > -100 && ux < W + 100) {
      g.save();
      g.translate(ux, uy);
      g.rotate(t * 0.9);
      for (let k = 0; k < 8; k++) {
        g.fillStyle = k % 2 ? "#c9b48a" : "#8e3d34";
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 34, (k / 8) * TAU, ((k + 1) / 8) * TAU);
        g.fill();
      }
      g.strokeStyle = "#2a2a2a";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, 40);
      g.arc(-5, 40, 5, 0, Math.PI);
      g.stroke();
      g.restore();
    }
    const cyc = t % 16,
      sx = 7 * W + 900 - cam.x + Math.sin(cyc) * 16,
      sy = 560 - cyc * 40;
    if (sx > -100 && sx < W + 100 && sy > 30) {
      g.save();
      g.strokeStyle = "rgba(220,255,250,.6)";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(sx, sy, 34, 0, TAU);
      g.stroke();
      ellipse(sx - 12, sy - 14, 6, 4, "rgba(255,255,255,.55)");
      // El zapato adentro (una zapatilla azul como las de la botella).
      g.translate(sx, sy + 4);
      g.rotate(Math.sin(t) * 0.3);
      rect(-17, -6, 30, 13, "#2f5e93", 6);
      rect(-17, 4, 34, 5, "#e9ece4", 2);
      g.restore();
    }
    // Peces en fila hacia un ojo de buey; uno se cuela.
    const mo = model.enemies.find((e) => e.kind === "morena" && e.id === 21);
    if (mo && !mo.gone && mo.state === "idle") {
      const hx = mo.x - cam.x,
        hy = mo.y;
      if (hx > -300 && hx < W + 300) {
        for (let k = 0; k < 6; k++) {
          const pos = ((t * 0.18 + k / 6) % 1),
            cut = k === 2 ? Math.min(1, pos * 1.3) : pos;
          const x = hx - 260 + cut * 250,
            y = hy - 70 + Math.sin(t * 3 + k) * 4 + k * 3;
          if (cut > 0.97) continue;
          g.fillStyle = k === 2 ? "#e0b24a" : "#9fc6c0";
          ellipse(x, y, 9, 4.5, g.fillStyle);
          g.beginPath();
          g.moveTo(x - 8, y);
          g.lineTo(x - 15, y - 5);
          g.lineTo(x - 15, y + 5);
          g.fill();
        }
      }
    }
  }
  function jets(t) {
    for (const j of JETS) {
      const sx = j.x - cam.x;
      if (sx < -100 || sx > W + 100) continue;
      const on = model.jetOn(j),
        fy = model.floorAt(j.x);
      ellipse(sx, fy + 2, 30, 7, "rgba(10,25,28,.6)");
      if (on) {
        g.save();
        g.globalCompositeOperation = "lighter";
        const gr = g.createLinearGradient(0, fy, 0, fy - 420);
        gr.addColorStop(0, "rgba(200,255,250,.35)");
        gr.addColorStop(1, "rgba(200,255,250,0)");
        g.fillStyle = gr;
        g.fillRect(sx - 30, fy - 420, 60, 420);
        g.restore();
      }
    }
  }

  /* ---------- Objetos y enemigos ---------- */
  function flags(t) {
    for (const f of FLAGS) {
      const sx = f.x - cam.x;
      if (sx < -120 || sx > W + 120) continue;
      const fy = model.floorAt(f.x),
        got = f.i <= model.flag;
      // Una boya hundida, atada al fondo: se enciende al tocarla.
      g.strokeStyle = "#2b3b3d";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(sx, fy);
      for (let k = 1; k <= 6; k++) g.lineTo(sx + Math.sin(t * 1.2 + k) * 4, fy - k * 18);
      g.stroke();
      const by = fy - 128 + Math.sin(t * 1.4 + f.i) * 6;
      if (got) glow(sx, by, 90, "rgba(255,220,130,.5)", 0.7 + Math.sin(t * 3) * 0.2);
      ellipse(sx, by, 26, 30, got ? "#e9b24a" : "#a54b3b");
      rect(sx - 26, by - 6, 52, 11, "#f1eadb", 2);
      ellipse(sx, by - 30, 8, 5, "#3a3f42");
      label(String(f.i + 1), sx, by + 26, 12, got ? "#3a2400" : "#f7e2d6");
    }
  }
  function items(t) {
    for (const it of model.items) {
      if (it.taken) continue;
      const sx = it.x - cam.x,
        y = it.y + Math.sin(it.t * 2) * 6;
      if (sx < -60 || sx > W + 60) continue;
      if (it.kind === "perla") {
        glow(sx, y, 26, "rgba(220,240,255,.5)", 0.6 + Math.sin(it.t * 4) * 0.2);
        ellipse(sx, y, 10, 10, "#eef4f6");
        ellipse(sx + 3, y + 3, 6, 6, "#c7d3dd");
        ellipse(sx - 3, y - 4, 3, 2.5, "#ffffff");
      } else if (it.kind === "leche") {
        glow(sx, y, 50, "rgba(230,255,240,.55)");
        rect(sx - 13, y - 22, 26, 40, "#f6f3ea", 8, "#9fb3a8");
        rect(sx - 8, y - 32, 16, 12, "#4d86c6", 3);
        rect(sx - 13, y - 4, 26, 12, "#4d86c6", 2);
      } else {
        glow(sx, y, 46, "rgba(160,210,255,.55)");
        ellipse(sx, y, 19, 19, "#3d78c2");
        ellipse(sx, y, 13, 13, "#5e98e0");
        label("◍", sx, y + 5, 14, "#e7f2ff");
      }
    }
  }
  const SCALE = { medusa: 0.72, cangrejo: 0.62, almeja: 0.74, morena: 0.82, globo: 0.5, pulpo: 0.72, cria: 0.42 };
  function hullPlate(sx, y) {
    // Trozo de casco oxidado que sostiene el ojo de buey.
    const fy = y + 112;
    g.save();
    const gr = g.createLinearGradient(sx - 50, 0, sx + 50, 0);
    gr.addColorStop(0, "#1c2b2c");
    gr.addColorStop(0.5, "#2c3d3a");
    gr.addColorStop(1, "#162222");
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(sx - 58, fy + 4);
    g.lineTo(sx - 52, y - 70);
    g.lineTo(sx - 18, y - 92);
    g.lineTo(sx + 40, y - 78);
    g.lineTo(sx + 54, fy + 4);
    g.fill();
    g.fillStyle = "#6b4a2e";
    for (let k = 0; k < 6; k++) ellipse(sx - 44 + (k % 2) * 88, y - 50 + Math.floor(k / 2) * 50, 3, 3, "#5d4a35");
    g.strokeStyle = "rgba(120,160,120,.35)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(sx + 20, y - 80);
    g.quadraticCurveTo(sx + 32, y - 30, sx + 26, y + 10);
    g.stroke();
    g.restore();
  }
  function enemy(e, t) {
    if (e.gone) return;
    const sx = e.x - cam.x;
    if (sx < -260 || sx > W + 260) return;
    const dead = !e.alive,
      a = dead ? Math.max(0, 1 - e.death / 1.2) : 1,
      filter = e.flash > 0 ? "brightness(2.2)" : "none",
      sc = SCALE[e.kind],
      fr = Math.floor(t * 8 + e.id);
    const opt = { alpha: a, filter, rot: dead ? e.death * 2 : 0, flipY: false };
    g.save();
    g.translate(-cam.x, 0);
    switch (e.kind) {
      case "medusa": {
        sprite("medusa", fr, e.x, e.y, sc, 1, opt);
        if (!dead) glow(e.x, e.y - 28, 70, "rgba(190,255,170,.55)", 0.6 + Math.sin(t * 3 + e.id) * 0.25);
        break;
      }
      case "cangrejo": {
        if (e.state === "hide") {
          // Escondido en la tetera: las patas quedan bajo la arena, la tetera tiembla.
          g.save();
          g.beginPath();
          g.rect(e.x - 120, e.y - 200, 240, 190);
          g.clip();
          sprite("cangrejo", 4, e.x + Math.sin(t * 40) * 1.5, e.y + 22, sc, e.face, { ...opt, anchor: "bottom" });
          g.restore();
          if (Math.random() < 0.05) bubbles(e.x + e.face * 30, e.y - 80, 1, 3, 40);
        } else {
          const walk = [0, 1, 2, 4, 5, 6, 7];
          sprite("cangrejo", e.state === "pinch" ? 3 : walk[Math.floor(t * 9 + e.id) % 7], e.x, e.y + 4, sc, e.face, { ...opt, anchor: "bottom" });
        }
        break;
      }
      case "almeja": {
        let f = 0;
        if (e.state === "idle") f = [0, 1, 1, 0][Math.floor(t * 1.6 + e.id) % 4];
        else if (e.state === "closed") f = 7;
        else if (e.state === "snap") f = e.st < 0.32 ? (e.st < 0.16 ? 2 : 3) : [4, 5, 6, 7][Math.min(3, Math.floor((e.st - 0.32) / 0.12))];
        if (dead) f = 3;
        sprite("almeja", f, e.x, e.y + 6, sc, 1, { ...opt, anchor: "bottom", rot: 0 });
        if (e.state === "snap" && e.st < 0.32) glow(e.x, e.y - 50, 80, "rgba(255,90,60,.4)");
        break;
      }
      case "morena": {
        hullPlate(e.x, e.y);
        let f = 7;
        if (e.state === "strike") f = e.st < 0.12 ? 1 : e.st < 0.25 ? 2 : e.st < 0.45 ? 3 : e.st < 0.75 ? [4, 5][Math.floor(t * 10) % 2] : e.st < 0.95 ? 6 : 0;
        else f = Math.floor(t * 0.5 + e.id) % 4 === 0 ? 0 : 7;
        if (dead) f = 6;
        sprite("morena", f, e.x - e.face * 4, e.y, sc, e.face, { ...opt, anchor: "ring", rot: 0 });
        break;
      }
      case "globo": {
        const puffed = e.state === "inflate" || e.state === "puffed";
        const k = e.state === "inflate" ? ease(e.st / 0.6) : e.state === "puffed" ? 1 : 0;
        const f = puffed ? 4 + (Math.floor(t * 8) % 4) : Math.floor(t * 5 + e.id) % 4;
        // La segunda fila mira hacia el otro lado: se compensa para que mire a la botella.
        sprite("globo", f, e.x, e.y, sc * (1 + k * 0.42), e.face * (puffed ? -1 : 1), opt);
        break;
      }
      case "pulpo": {
        let f = Math.floor(t * 5 + e.id) % 8,
          lunge = 0;
        if (e.state === "swing") {
          f = e.st < 0.25 ? 5 : 6;
          lunge = Math.sin(clamp(e.st / 0.5, 0, 1) * Math.PI) * 26;
        }
        if (e.state === "ink") f = 2;
        sprite("pulpo", f, e.x + e.face * lunge, e.y + 6, sc, e.face, { ...opt, anchor: "bottom", rot: e.state === "swing" ? e.face * 0.12 : 0 });
        break;
      }
      case "cria": {
        const info = sprite("cria", fr, e.x, e.y, sc, e.face, opt);
        if (info && !dead && info.m.lx) glow(e.x + (info.m.lx * sc - info.ax) * e.face, e.y + info.m.ly * sc - info.ay, 34, "rgba(255,190,90,.7)", 0.7 + Math.sin(t * 6 + e.id) * 0.3);
        break;
      }
    }
    g.restore();
  }
  function shotsDraw(t) {
    for (const s of model.shots) {
      const x = s.x - cam.x,
        y = s.y;
      if (x < -40 || x > W + 40) continue;
      g.save();
      g.translate(x, y);
      if (s.kind === "cubierto") {
        g.rotate(Math.atan2(s.vy, s.vx));
        g.fillStyle = "#b9bdbd";
        g.strokeStyle = "#6d5847";
        g.lineWidth = 1;
        rect(-18, -2, 22, 4, "#9a8b7c", 2);
        if (s.tool === 0) {
          for (let k = -1; k <= 1; k++) rect(4, k * 3 - 1, 12, 2, "#c4c8c8");
        } else if (s.tool === 1) ellipse(10, 0, 8, 5, "#c4c8c8");
        else {
          g.fillStyle = "#c4c8c8";
          g.beginPath();
          g.moveTo(4, -3);
          g.lineTo(20, 0);
          g.lineTo(4, 3);
          g.fill();
        }
      } else if (s.kind === "tinta") {
        ellipse(0, 0, 16, 13, "#1a1024");
        ellipse(-5, -4, 5, 4, "#3b2a4a");
      } else {
        g.strokeStyle = "rgba(210,255,250,.85)";
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(0, 0, 16, 0, TAU);
        g.stroke();
        ellipse(-5, -6, 5, 3, "rgba(255,255,255,.7)");
        glow(0, 0, 30, "rgba(150,230,255,.3)");
      }
      g.restore();
    }
    for (const b of model.bullets) {
      const x = b.x - cam.x;
      ellipse(x, b.y, 11, 8, "#fff4dc");
      ellipse(x - Math.sign(b.vx) * 9, b.y, 7, 5, "#dceae7");
      if (fx() && Math.random() < 0.3) bubbles(b.x, b.y, 1, 3, 20);
    }
  }
  /* ---------- El jefe ---------- */
  const BOSS_SCALE = 1.2;
  function bossDraw(t) {
    const b = model.boss;
    if (b.state === "waiting" || b.state === "dead") return;
    const x = b.x - cam.x;
    let f;
    if (b.state === "dying") f = 8;
    else if (turnT > 0) f = [1, 2, 8][Math.floor((0.5 - turnT) * 6) % 3];
    else if (b.attack === "spit" && b.mouth > 0.2) f = 6 + (Math.floor(t * 6) % 2);
    else if (b.mouth > 0.6) f = 4 + (Math.floor(t * 4) % 2);
    else f = [0, 9, 10, 11, 3][Math.floor(t * 7) % 5];
    // Aviso de embestida: el farol parpadea.
    const warn = b.attack === "charge" && b.at < 0.9;
    const dim = b.state === "dying" ? clamp(1 - b.t / 3.4, 0.15, 1) : 1;
    g.save();
    if (b.state === "intro") g.globalAlpha = clamp(b.t / 1.2, 0, 1);
    const info = sprite("jefe", f, x, b.y + Math.sin(t * 2) * 6, BOSS_SCALE, b.face, { filter: b.hitFlash > 0 ? "brightness(1.8)" : dim < 1 ? `brightness(${0.4 + dim * 0.6})` : "none", rot: b.state === "dying" ? Math.min(Math.PI * 0.9, b.t * 0.9) * b.face : 0 });
    if (info && info.m.lx && dim > 0.2) {
      const lx = x + (info.m.lx * BOSS_SCALE - info.ax) * b.face,
        ly = b.y + Math.sin(t * 2) * 6 + info.m.ly * BOSS_SCALE - info.ay;
      const pulse = warn ? (Math.floor(t * 12) % 2 ? 1.4 : 0.4) : 0.8 + Math.sin(t * 4) * 0.2;
      glow(lx, ly, 120, "rgba(255,190,80,.75)", pulse * dim);
    }
    g.restore();
  }

  /* El borde del piso de la arena se vuelve a dibujar delante del jefe: nada por detrás del muelle. */
  function arenaFloor() {
    const b = model.boss;
    if (b.state === "waiting" || b.state === "dead") return;
    const i = 10,
      img = assets.bg[i],
      x0 = Math.round(i * W - cam.x),
      fy = C.SEGMENTS.find((s) => s.x === i * W).y + 4;
    g.drawImage(img, 0, fy, W, H - fy, x0, fy, W, H - fy);
  }
  /* ---------- La botella ---------- */
  function groundPose(p) {
    const imgs = bridge.sprites;
    let kind = "walk",
      idx = 0,
      h = 142;
    if (model.shootPose > 0 && p.crouch < 0.5) {
      kind = "shoot";
      idx = Math.min(2, Math.floor((0.24 - model.shootPose) * 13));
    } else if (p.state === "crouch") {
      kind = "crouch";
      idx = 2;
      h = 96;
    } else if (p.state === "run") {
      kind = "run";
      idx = Math.floor(p.phase) % 8;
    } else idx = p.state === "walk" ? Math.floor(p.phase) % 8 : 0;
    return { im: imgs[kind]?.[idx] || imgs.walk?.[0], h };
  }
  function bottle(p, t) {
    if (p.dead) {
      if (p.death > 2) return;
      const f = Math.min(7, Math.floor(p.death / 0.2));
      sprite("ahoga", f, p.x - cam.x, p.y - 70, 0.7, p.face, { alpha: clamp(2.2 - p.death, 0, 1) });
      return;
    }
    if (p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0 && model.whirl.t <= 0) return;
    const x = p.x - cam.x,
      wl = model.whirl;
    if (wl.t > 0) {
      const el = C.WHIRL_TIME - wl.t;
      const f = el < 0.45 ? Math.floor(el / 0.15) : wl.t < 0.45 ? 5 + Math.floor((0.45 - wl.t) / 0.15) : 3 + (Math.floor(t * 14) % 3);
      glow(x, p.y - 70, 150, "rgba(120,220,255,.45)");
      sprite("torbellino", Math.min(7, f), x, p.y - 72, 0.86, p.face, {});
      return;
    }
    const lowHp = model.hp <= 30 ? "saturate(.8) brightness(.95)" : "none";
    if (p.grounded) {
      const f = groundPose(p);
      if (!f.im) return;
      const w = (f.im.width / f.im.height) * f.h;
      g.save();
      g.translate(x, p.y);
      g.scale(p.face, 1);
      g.rotate(Math.sin(t * 1.6) * 0.015);
      g.filter = lowHp;
      g.drawImage(f.im, -w / 2, -f.h, w, f.h);
      g.restore();
      return;
    }
    if (p.state === "swim") {
      // Nadando: la botella se inclina hacia donde va.
      const ang = clamp(Math.atan2(p.vy, Math.abs(p.vx) + 60) * 0.6, -0.5, 0.45);
      sprite("nada", Math.floor(p.phase), x, p.y - 64, 0.92, p.face, { rot: ang * p.face, filter: lowHp });
    } else {
      // Subiendo o hundiéndose: brazos arriba, como en la caída al agua.
      const f = p.state === "rise" ? Math.floor(p.phase * 0.7) % 4 : 4 + (Math.floor(p.phase * 0.5) % 4);
      sprite("cae", f, x, p.y - 74, 0.74, p.face, { filter: lowHp });
    }
  }
  function playerShadow(p) {
    if (p.dead) return;
    const fy = model.floorAt(p.x);
    if (fy === null) return;
    const gap = Math.max(0, fy - p.y),
      k = Math.exp(-gap / 200);
    ellipse(p.x - cam.x, fy + 3, 16 + k * 14, 4 + k * 2, `rgba(4,10,16,${0.1 + 0.28 * k})`);
  }

  /* ---------- Capas de pantalla ---------- */
  function darkness(t) {
    const amount = zoneVal("dark") + (model.arena ? 0.12 : 0);
    if (amount < 0.03 || !weatherOn()) return;
    if (!darkCanvas) {
      // Media resolución: la penumbra es difusa y así cuesta la cuarta parte.
      darkCanvas = document.createElement("canvas");
      darkCanvas.width = W / 2;
      darkCanvas.height = H / 2;
      dg = darkCanvas.getContext("2d");
      dg.scale(0.5, 0.5);
    }
    dg.globalCompositeOperation = "source-over";
    dg.clearRect(0, 0, W, H);
    dg.fillStyle = `rgba(1,7,13,${amount})`;
    dg.fillRect(0, 0, W, H);
    dg.globalCompositeOperation = "destination-out";
    const hole = (x, y, r, k = 1) => {
      if (x < -r || x > W + r) return;
      dg.globalAlpha = k;
      dg.drawImage(glowSprite("rgba(0,0,0,1)"), x - r, y - r, r * 2, r * 2);
      dg.globalAlpha = 1;
    };
    const p = model.player;
    // La luz propia de la botella: los enemigos aparecen al entrar en su radio.
    hole(p.x - cam.x, p.y - 75, model.whirl.t > 0 ? 330 : 250 + Math.sin(t * 2) * 6, 0.95);
    for (const e of model.enemies) {
      if (e.gone || !e.alive) continue;
      if (e.kind === "cria") hole(e.x - cam.x + e.face * 30, e.y - 20, 70, 0.7);
      if (e.kind === "medusa") hole(e.x - cam.x, e.y - 25, 110, 0.6);
    }
    for (const it of model.items) if (!it.taken && it.kind !== "perla") hole(it.x - cam.x, it.y, 60, 0.6);
    for (const f of FLAGS) if (f.i <= model.flag) hole(f.x - cam.x, model.floorAt(f.x) - 128, 120, 0.7);
    if (model.boss.state !== "waiting" && model.boss.state !== "dead") hole(model.lantern().x - cam.x, model.lantern().y, 200, 0.8);
    g.drawImage(darkCanvas, 0, 0, W, H);
  }
  function grade() {
    const [r, gg, b] = zoneTint(),
      light = zoneVal("light");
    // Tinte por tramo (azul casi negro en el abismo, petróleo, turquesa, luz cálida arriba).
    if (quality > 0) {
      g.fillStyle = `rgba(${r},${gg},${b},${light > 0.9 ? 0.1 : 0.16})`;
      g.fillRect(0, 0, W, H);
    }
    // Viñeta: fuerte en lo hondo, casi nula cerca de la superficie.
    if (!vignette) {
      vignette = document.createElement("canvas");
      vignette.width = 320;
      vignette.height = 180;
      const vg = vignette.getContext("2d"),
        v = vg.createRadialGradient(160, 90, 80, 160, 90, 185);
      v.addColorStop(0, "rgba(0,6,12,0)");
      v.addColorStop(1, "rgba(0,6,12,1)");
      vg.fillStyle = v;
      vg.fillRect(0, 0, 320, 180);
    }
    const prev = g.globalAlpha;
    g.globalAlpha = Math.max(0.05, 0.62 - light * 0.5);
    g.drawImage(vignette, 0, 0, W, H);
    g.globalAlpha = prev;
  }
  function surfaceShimmer(t) {
    const k = clamp((cam.x - 10.4 * W) / (0.6 * W), 0, 1);
    if (k <= 0 || !fx()) return;
    g.save();
    g.globalCompositeOperation = "lighter";
    g.globalAlpha = k;
    for (let row = 0; row < 4; row++) {
      g.strokeStyle = `rgba(255,250,215,${0.25 - row * 0.05})`;
      g.lineWidth = 2;
      g.beginPath();
      for (let x = 0; x <= W; x += 16) {
        const y = 12 + row * 14 + Math.sin(x * 0.02 + t * 2 + row) * 4 + Math.sin(x * 0.007 - t) * 3;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  function streaks() {
    if (!parts.streaks.length) return;
    g.save();
    g.lineCap = "round";
    for (const s of parts.streaks) {
      const a = Math.min(1, s.life) * (s.suck ? 0.6 : 0.35);
      g.strokeStyle = `rgba(210,250,245,${a})`;
      g.lineWidth = s.suck ? 2 : 1.6;
      g.beginPath();
      if (s.suck) {
        const d = Math.hypot(s.tx - s.x, s.ty - s.y) || 1;
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - ((s.tx - s.x) / d) * s.len, s.y - ((s.ty - s.y) / d) * s.len);
      } else {
        g.moveTo(s.x, s.y);
        g.lineTo(s.x - Math.sign(s.vx) * s.len, s.y - s.vy * 0.05);
      }
      g.stroke();
    }
    g.restore();
  }
  function drawBubbles(list, t) {
    g.save();
    for (const b of list) {
      const x = b.x - cam.x;
      if (x < -20 || x > W + 20) continue;
      const a = Math.min(1, b.life * 2);
      if (b.life < 0.06) {
        // Estalla con un destello mínimo.
        ellipse(x, b.y, b.r * 1.8, b.r * 1.8, "rgba(230,255,255,.35)");
        continue;
      }
      g.strokeStyle = `rgba(200,250,245,${0.6 * a})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(x, b.y, b.r, 0, TAU);
      g.stroke();
      ellipse(x - b.r * 0.3, b.y - b.r * 0.35, b.r * 0.28, b.r * 0.22, `rgba(255,255,255,${0.7 * a})`);
    }
    g.restore();
  }
  function drawSand() {
    for (const s of parts.sand) {
      const k = s.life / s.max;
      ellipse(s.x - cam.x, s.y, s.r, s.r * 0.55, `rgba(176,162,128,${0.32 * k})`);
    }
    for (const f of parts.fall) ellipse(f.x, f.y, f.r, f.r, "rgba(190,175,140,.55)");
  }
  function inkDraw() {
    for (const k of parts.ink) {
      const a = Math.min(1, k.life / 0.8) * 0.8;
      const prev = g.globalAlpha;
      g.globalAlpha = a;
      g.drawImage(glowSprite("rgba(18,8,30,1)"), k.x - cam.x - k.r * 1.3, k.y - k.r * 1.1, k.r * 2.6, k.r * 2.2);
      g.globalAlpha = prev;
    }
    const p = model.player;
    for (const ink of model.inks) {
      const prev = g.globalAlpha;
      g.globalAlpha = Math.min(1, ink.life / 0.8) * 0.7;
      g.drawImage(glowSprite("rgba(10,6,18,1)"), ink.x - cam.x - ink.r * 1.4, ink.y - ink.r * 1.4, ink.r * 2.8, ink.r * 2.8);
      g.globalAlpha = prev;
    }
    if (model.inks.length) {
      g.fillStyle = `rgba(8,4,14,${Math.min(0.35, model.inks.reduce((s, i) => s + i.life / i.max, 0) * 0.18)})`;
      g.fillRect(0, 0, W, H);
    }
  }
  // V12.3 PLUS: bioluminescent wake and a soft pressure ring, never a full-screen flash.
  function luminousWake() {
    if (!fx()) return;
    g.save();
    for (const w of parts.wake) {
      const a = Math.max(0, w.life / 0.8);
      glow(w.x - cam.x, w.y, w.r * 3, "rgba(115,225,235,.6)", a * 0.5);
      ellipse(w.x - cam.x, w.y, w.r * a, w.r * a * 0.5, `rgba(180,245,240,${a * 0.55})`);
    }
    for (const pulse of parts.pulses) {
      const a = Math.max(0, pulse.life / 1.1), radius = 45 + (1 - a) * 210;
      g.strokeStyle = `rgba(150,232,242,${a * 0.45})`; g.lineWidth = 2 * a + 0.5;
      g.beginPath(); g.ellipse(pulse.x - cam.x, pulse.y, radius, radius * 0.78, 0, 0, TAU); g.stroke();
    }
    g.restore();
  }

  function render(dt) {
    if (!assets || !model) return;
    const t = model.time,
      p = model.player;
    g.save();
    if (shake > 0 && shakeOn()) {
      // Temblor lento, no violento.
      g.translate(Math.sin(t * 23) * shake * 22, Math.cos(t * 17) * shake * 14);
    }
    g.save();
    g.translate(0, -cam.y);
    background(t);
    fog(t, false);
    beast(t);
    shafts(t);
    caustics(t);
    snow(snowBack, false, t);
    shaftDust(t);
    jets(t);
    humor(t);
    weeds(t);
    flags(t);
    items(t);
    for (const e of model.enemies) if (e.kind === "morena") enemy(e, t);
    for (const e of model.enemies) if (e.kind !== "morena") enemy(e, t);
    bossDraw(t);
    arenaFloor();
    drawSand();
    playerShadow(p);
    luminousWake();
    bottle(p, t);
    shotsDraw(t);
    drawBubbles(parts.bubbles, t);
    g.restore();
    if (fx2) fx2.drawWorld(g, cam.x, cam.y);
    inkDraw();
    darkness(t);
    streaks();
    fog(t, true);
    snow(snowFront, true, t);
    foreground(t);
    grade();
    surfaceShimmer(t);
    g.restore();
    if (fx2) {
      if (fx2.iris.target > 1000) {
        fx2.iris.x = p.x - cam.x;
        fx2.iris.y = p.y - 70 - cam.y;
      }
      fx2.screen(g, { temp: 0, cold: false, hp: model.hp, dead: p.dead, uht: false, t });
    }
    // Cartel de cada zona.
    if (zoneTime > 0 && !model.arena && mode === "play") {
      const a = Math.min(1, zoneTime, (3.4 - zoneTime) * 2);
      g.save();
      g.globalAlpha = a;
      rect(W / 2 - 250, 190, 500, 76, "rgba(4,22,30,.62)", 10, "rgba(160,230,220,.45)");
      label(SECTIONS[Math.min(3, Math.floor(model.zone / 3))] + " · " + (model.zone + 1) + "/12", W / 2, 217, 11, "#9fe3d6");
      label(NAMES[model.zone], W / 2, 250, 26, "#ffffff");
      g.restore();
    }
    const b = model.boss;
    if (b.state === "intro" && b.t > 1.4 && b.t < 3.6) {
      const a = Math.min(1, (b.t - 1.4) * 3, (3.6 - b.t) * 3);
      g.save();
      g.globalAlpha = a;
      rect(0, 270, W, 140, "rgba(2,10,16,.62)");
      label("JEFE DEL NIVEL 5 · DUEÑO DEL CEMENTERIO DE BARCOS", W / 2, 312, 16, "#9fe3d6");
      g.font = "900 64px Arial";
      g.textAlign = "center";
      g.fillStyle = "#fff";
      g.fillText("EL TRAGABARCOS", W / 2 + (1 - a) * 80, 376);
      g.restore();
    }
  }

  /* ---------- Transición: del cielo al mar (corregida) ---------- */
  const UMB_SCALE = 142 / (window.MilkLevel4Meta?.umbRef || 557);
  function umbrellaBottle(x, y, t, closing) {
    // Botella real con su paraguas abierto (mismo arte que el nivel 4), pies en (x, y).
    const key = closing >= 0 ? "umbClose" : "umbGlide",
      list = assets.umb[key],
      meta = window.MilkLevel4Meta?.umb?.[key];
    if (!list?.length || !meta) return false;
    const i = closing >= 0 ? clamp(Math.floor(closing * list.length), 0, list.length - 1) : Math.floor(Math.max(0, t) * 5) % list.length;
    const m = meta[i],
      img = list[i];
    g.save();
    g.translate(x, y);
    g.rotate(Math.sin(t * 1.4) * 0.06);
    g.drawImage(img, -m.bodyX * UMB_SCALE, -m.h * UMB_SCALE, m.w * UMB_SCALE, m.h * UMB_SCALE);
    g.restore();
    return true;
  }
  function introSky(t) {
    const sky = g.createLinearGradient(0, 0, 0, 440);
    sky.addColorStop(0, "#5aa7cb");
    sky.addColorStop(0.7, "#a9d4df");
    sky.addColorStop(1, "#e7ecdc");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, 440);
    glow(1015, 140, 190, "rgba(255,240,190,.55)");
    ellipse(1015, 140, 70, 70, "#fff3c4");
    for (let i = 0; i < 7; i++) {
      const x = ((i * 249 - t * 13) % 1600) - 150,
        y = 175 + (i % 3) * 46;
      ellipse(x, y, 170, 34, "rgba(255,255,255,.55)");
      ellipse(x + 60, y - 14, 90, 26, "rgba(255,255,255,.45)");
    }
    // Costa lejana con la granja, del otro lado del agua.
    g.fillStyle = "#6aa3a2";
    g.beginPath();
    g.moveTo(0, 424);
    [[160, 398], [290, 412], [430, 376], [570, 414], [760, 398], [950, 430], [1280, 420]].forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(W, 440);
    g.lineTo(0, 440);
    g.fill();
    rect(222, 382, 48, 30, "#f1dfae");
    g.fillStyle = "#9a5d4b";
    g.beginPath();
    g.moveTo(214, 383);
    g.lineTo(246, 362);
    g.lineTo(278, 383);
    g.fill();
    rect(300, 390, 22, 22, "#b8433a");
    const sea = g.createLinearGradient(0, 432, 0, H);
    sea.addColorStop(0, "#47bfcc");
    sea.addColorStop(1, "#08506f");
    g.fillStyle = sea;
    g.fillRect(0, 432, W, H - 432);
    g.save();
    g.globalCompositeOperation = "lighter";
    for (let i = 0; i < 22; i++) {
      g.strokeStyle = `rgba(212,255,245,${0.12 + (i % 3) * 0.05})`;
      g.lineWidth = 2;
      g.beginPath();
      const y = 444 + i * 13;
      for (let x = 0; x <= W; x += 14) {
        const yy = y + Math.sin(x * 0.018 + t * 1.6 + i) * 3;
        x ? g.lineTo(x, yy) : g.moveTo(x, yy);
      }
      g.stroke();
    }
    g.restore();
  }
  function introUnder(t, k) {
    // El mismo primer fondo del nivel, con la luz entrando desde la superficie.
    const img = assets.bg[0];
    g.save();
    g.globalAlpha = k;
    for (let y = 0; y < H; y += 12) g.drawImage(img, 0, y, W, 12, Math.sin(y * 0.035 + t * 1.3) * 2, y, W, 12);
    g.restore();
    g.save();
    g.globalAlpha = k;
    cam.x = 0;
    shafts(t);
    g.restore();
    const surf = g.createLinearGradient(0, 0, 0, 120);
    surf.addColorStop(0, `rgba(190,255,245,${0.35 * k})`);
    surf.addColorStop(1, "rgba(190,255,245,0)");
    g.fillStyle = surf;
    g.fillRect(0, 0, W, 120);
  }
  const introBubbles = [];
  function drawIntro(t) {
    const motion = reduced ? 0 : t,
      FALL_X = C.floorAt(300) ? 300 : 300;
    const sub = ease((t - 5.2) / 1.1);
    if (sub < 1) introSky(motion);
    if (sub > 0) introUnder(motion, sub);
    // 1) Desciende con el paraguas hasta el agua.
    if (t < 4.95) {
      const x = 640 + Math.sin(t * 0.8) * 18,
        y = t < 4.2 ? 150 + ease(t / 4.4) * 240 : 150 + ease(4.2 / 4.4) * 240 + Math.pow((t - 4.2) / 0.75, 2) * 130;
      const closing = t > 3.75 ? (t - 3.75) / 0.45 : -1;
      // Cierra el paraguas todavía en el aire y se zambulle de cabeza al agua.
      if (t > 4.2 || !umbrellaBottle(x, y, motion, closing)) {
        const im = bridge.sprites.jump?.[5];
        if (im) {
          const w = (im.width / im.height) * 142;
          g.save();
          g.beginPath();
          g.rect(0, 0, W, 438); // lo que ya entró al agua no se ve
          g.clip();
          g.translate(x, y - 71);
          g.rotate(Math.min(Math.PI, (t - 4.2) * 4));
          g.drawImage(im, -w / 2, -71, w, 142);
          g.restore();
        }
      }
    }
    // 2) Salpicadura.
    if (t > 4.85 && t < 6.4) {
      const a = (t - 4.85) / 1.55;
      g.strokeStyle = `rgba(230,255,255,${1 - a})`;
      g.lineWidth = 4;
      g.beginPath();
      g.ellipse(640, 440, 20 + a * 170, 8 + a * 22, 0, 0, TAU);
      g.stroke();
      for (let i = 0; i < 14; i++) ellipse(640 + Math.cos(i * 0.9) * a * 150, 436 - Math.sin((i / 14) * Math.PI) * Math.sin(a * Math.PI) * 110, 4, 7, `rgba(230,255,255,${1 - a})`);
    }
    // 3) Bajo el agua: se hunde con los brazos arriba hasta la arena.
    if (t >= 5.2) {
      const k = ease((t - 5.3) / 3.4),
        x = lerp(640, FALL_X, ease((t - 5.4) / 3.2)),
        y = lerp(-60, C.floorAt(300) - 74, k);
      if (Math.random() < 0.5) introBubbles.push({ x: x + rnd(-20, 20), y: y - 40, vy: -rnd(60, 140), r: rnd(2, 6), life: 1.6 });
      for (const b of introBubbles) {
        b.life -= 1 / 60;
        b.y += b.vy / 60;
        b.x += Math.sin(b.y * 0.05) * 0.6;
      }
      while (introBubbles.length && introBubbles[0].life <= 0) introBubbles.shift();
      g.save();
      for (const b of introBubbles) {
        g.strokeStyle = `rgba(210,255,250,${Math.min(1, b.life)})`;
        g.lineWidth = 1.3;
        g.beginPath();
        g.arc(b.x, b.y, b.r, 0, TAU);
        g.stroke();
      }
      g.restore();
      if (t < 9.1) sprite("cae", Math.floor(t * 7) % 8, x, y, 0.74, 1, { rot: Math.sin(t * 2) * 0.08 });
      else {
        const f = groundPose({ state: "idle", phase: 0, crouch: 0 });
        if (f.im) g.drawImage(f.im, x - ((f.im.width / f.im.height) * 142) / 2, y + 74 - 142, (f.im.width / f.im.height) * 142, 142);
        if (t < 9.3) ellipse(x, y + 76, 50 * (1 - (t - 9.1) / 0.2), 8, "rgba(180,165,130,.5)");
      }
    }
    // Título de la sección.
    if (t > 8.6) {
      const a = Math.min(1, (t - 8.6) * 2, (10.4 - t) * 2);
      g.save();
      g.globalAlpha = Math.max(0, a);
      label("NIVEL 05", W / 2, 300, 14, "#9fe3d6", "center", 700);
      g.font = "900 70px Arial";
      g.textAlign = "center";
      g.fillStyle = "#ffffff";
      g.fillText("Bajo la superficie", W / 2, 370);
      label("Caminá por la arena · Nadá con cada salto · Llegá a la luz", W / 2, 410, 15, "#d9ece6", "center", 400);
      g.restore();
    }
    const black = 1 - ease(t / 1.1);
    if (black > 0) {
      g.fillStyle = `rgba(0,12,25,${black})`;
      g.fillRect(0, 0, W, H);
    }
    // Barras de cine.
    g.fillStyle = "rgba(4,19,29,.72)";
    g.fillRect(0, 0, W, 50);
    g.fillRect(0, H - 50, W, 50);
    const caption = t < 1.1 ? "" : t < 4.8 ? "La granja estaba cerca. Pero el viento tenía otros planes." : t < 8.4 ? "Del cielo… a un mundo bajo el agua." : "";
    const c = $("l5caption");
    if (c && c.textContent !== caption) c.textContent = caption;
  }

  window.MilkLevel5 = {
    configure(b) {
      bridge = b;
    },
    start,
    stop,
    hasSave: () => !!saved(),
    get state() {
      return model ? { mode, time: model.time, score: model.score, hp: model.hp, x: model.player.x, zone: model.zone, boss: model.boss.state, enemies: model.enemies.filter((e) => e.alive && !e.gone).length, whirl: model.whirl.charges, interactive: mode === "play" } : { mode, interactive: false };
    },
    get model() {
      return model;
    },
    get quality() {
      return quality;
    },
    set quality(q) {
      quality = clamp(Math.round(q), 0, 2);
      raised = true;
    },
  };
  window.MilkLevels = window.MilkLevels || {};
  window.MilkLevels[5] = { start };
})();
