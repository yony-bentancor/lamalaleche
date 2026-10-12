/* La Mala Leche NEW. No network requests, dependencies or build process. */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id),
    canvas = $("game"),
    ctx = canvas.getContext("2d", { alpha: false });
  const W = 1280,
    H = 720,
    FLOOR = 520,
    TILE = 1280,
    OVERLAP = 110,
    STRIDE = TILE - OVERLAP,
    WORLD = STRIDE * 11 + TILE;
  const names = [
    "Planta embotelladora",
    "Procesamiento lácteo",
    "La puerta de salida",
    "El muelle de carga",
    "Camino al campo",
    "Llegada a la granja",
    "El último rayo de sol",
    "Huerto en penumbra",
    "Bosque helado",
    "Almacén abandonado",
    "El umbral del frío",
    "Cámara refrigerada",
  ];
  const groundRows = [685, 685, 685, 686, 700, 697, 697, 695, 695, 707, 702, 700];
  const { Player, CONFIG, approach } = MilkPhysics;
  const adventure = new MilkAdventure.Adventure();
  // V4: contenido nuevo, efectos y sonidos. Se suman a lo existente sin reemplazarlo.
  const extras = new MilkExtras.Extras(adventure);
  const fx = new MilkFX();
  const levelFlow = new MilkLevelFlow();
  let music = null,
    lastSkidSound = 0;
  let sfx = null,
    playerFilter = "none",
    trailTick = 0,
    deathSeen = false,
    flagsSeen = new Set(),
    tips = new Set(),
    surfCache = null,
    v4save = { caps: [], best: 0 };
  try {
    Object.assign(v4save, JSON.parse(localStorage.getItem("milk-v4-extras") || "{}"));
    for (const id of v4save.caps || []) extras.found.add(id);
  } catch {}
  let settings = { sound: true, effects: true, shake: true, volume: 25, ambient: true, impact: true, weather: true };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem("milk-v3-settings") || "{}"));
  } catch {}
  const save = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  };
  let mode = "loading",
    modalBack = "home",
    lab = false,
    startPoint = 0,
    completed = false,
    player = new Player(200, FLOOR),
    cam = { x: 0, y: 0, px: 0, py: 0, look: 0 },
    time = 0,
    accumulator = 0,
    last = 0,
    shake = 0,
    uiTick = 0,
    toastUntil = 0,
    currentZone = -1;
  const keys = new Set(),
    touchKeys = new Set();
  let jumpQueued = false,
    shotQueued = false,
    debug = false,
    audio = null,
    ambience = null,
    particles = [],
    tiles = [],
    farTiles = [],
    groundTiles = [],
    images = {},
    spriteImgs = {},
    lastCheckpoint = -1;
  const platforms = [
    { x: 0, w: 750, y: FLOOR },
    { x: 940, w: 740, y: FLOOR },
    { x: 1830, w: 1700, y: FLOOR },
    { x: 450, w: 160, y: 425 },
    { x: 1020, w: 185, y: 420 },
    { x: 1310, w: 170, y: 325 },
    { x: 1550, w: 180, y: 235 },
    { x: 2040, w: 210, y: 420 },
    { x: 2320, w: 230, y: 325 },
    { x: 2640, w: 220, y: 230 },
    { x: 2930, w: 270, y: 135 },
  ];
  const world = {
    width: WORLD,
    height: H,
    get solids() {
      return lab ? [] : [...adventure.obstacles, ...extras.solids];
    },
    get ceilings() {
      return lab ? [] : extras.ceilings;
    },
    surfaces(x) {
      if (lab) return platforms;
      if (!surfCache) surfCache = [...adventure.surfaces, ...extras.surfaces].sort((a, b) => a.y - b.y);
      return surfCache;
    },
    modifiers(p) {
      return lab ? {} : extras.modifiers(p);
    },
  };
  function fit() {
    const d = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * d);
    canvas.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const s = Math.min(innerWidth / W, innerHeight / H);
    canvas.style.width = W * s + "px";
    canvas.style.height = H * s + "px";
    canvas.style.position = "absolute";
    canvas.style.left = (innerWidth - W * s) / 2 + "px";
    canvas.style.top = (innerHeight - H * s) / 2 + "px";
  }
  window.addEventListener("resize", fit);
  fit();
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => {
        $("loading").value++;
        resolve(im);
      };
      im.onerror = () => reject(new Error("No se pudo cargar " + src));
      im.src = src;
    });
  }
  function normalizeBackground(im, index, feather = OVERLAP) {
    const c = document.createElement("canvas");
    c.width = TILE;
    c.height = H;
    const g = c.getContext("2d");
    const row = groundRows[index];
    g.drawImage(im, 0, 0, im.width, row, 0, 0, TILE, FLOOR);
    g.drawImage(im, 0, row, im.width, im.height - row, 0, FLOOR, TILE, H - FLOOR);
    if (index > 0) {
      g.globalCompositeOperation = "destination-in";
      const fade = g.createLinearGradient(0, 0, feather, 0);
      fade.addColorStop(0, "transparent");
      fade.addColorStop(1, "black");
      g.fillStyle = fade;
      g.fillRect(0, 0, TILE, H);
    }
    return c;
  }
  function sound(type) {
    if (!settings.sound || !audio || Number(settings.volume) <= 0) return;
    // V7 Premium: la frenada era un zumbido grave y repetido; ahora es un roce corto, como máximo cada 0,6 s.
    if (type === "skid") {
      const now = audio.currentTime;
      if (now - lastSkidSound > 0.6) play("skid");
      lastSkidSound = now;
      return;
    }
    const t = audio.currentTime;
    const g = audio.createGain();
    g.connect(audio.destination);
    const vol = (settings.volume / 100) * 0.15;
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    const o = audio.createOscillator();
    o.type = type === "skid" ? "sawtooth" : "sine";
    const f = type === "jump" ? 350 : type === "damage" ? 170 : type === "break" ? 110 : 80;
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(type === "jump" ? 700 : 35, t + 0.13);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.15);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  function play(type, opts) {
    if (!settings.sound || !sfx) return;
    try {
      sfx.play(type, settings.volume, opts);
    } catch {}
  }
  function activateAudio() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      ambience ||= new MilkAudio(audio);
      sfx ||= new MilkSfx(audio);
      if (!music && window.MilkMusic) music = new MilkMusic(audio);
      if (audio.state === "suspended") audio.resume();
    } catch {}
  }
  function toast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("visible");
    toastUntil = performance.now() + 3300;
  }
  function hideModals() {
    ["home", "routes", "settings", "paused", "finish", "catalog"].forEach((id) => $(id).classList.add("hidden"));
  }
  const EXTERNAL_LEVEL = /^level[2345]$/;
  function syncHUD() {
    const playing = mode === "playing" || mode === "paused" || mode === "finish";
    $("hud").classList.toggle("hidden", !playing);
    $("hud4").classList.toggle("hidden", !playing || lab);
    $("hint").classList.toggle("hidden", !playing || lab);
    $("touch").classList.toggle("hidden", mode !== "playing" || !matchMedia("(pointer:coarse)").matches);
  }
  function clearInput() {
    keys.clear();
    touchKeys.clear();
    jumpQueued = false;
    shotQueued = false;
    document.querySelectorAll("#touch .down").forEach((e) => e.classList.remove("down"));
  }
  function home() {
    clearInput();
    hideModals();
    $("toast").classList.remove("visible");
    toastUntil = 0;
    mode = "home";
    $("home").classList.remove("hidden");
    syncHUD();
    checkContinue();
    try {
      $("continueLevel2").classList.toggle("hidden", !localStorage.getItem("milk-v7-level2"));
      $("continueLevel3").classList.toggle("hidden", !localStorage.getItem("milk-v9-level3"));
      $("continueLevel4").classList.toggle("hidden", !localStorage.getItem("milk-v10-level4"));
      $("continueLevel5")?.classList.toggle("hidden", !localStorage.getItem("milk-v12-level5"));
    } catch {}
    homeStats();
    cam.x = 0;
    cam.y = 0;
    particles = [];
  }
  function checkContinue() {
    try {
      $("continue").classList.toggle("hidden", !JSON.parse(localStorage.getItem("milk-v3-checkpoint") || "null"));
    } catch {}
  }
  function start(index = 0, isLab = false, checkpoint = null) {
    activateAudio();
    hideModals();
    clearInput();
    lab = isLab;
    world.width = lab ? 3400 : WORLD;
    startPoint = index;
    completed = false;
    lastCheckpoint = -1;
    const saved = checkpoint && typeof checkpoint === "object" ? checkpoint : null;
    const x = saved ? saved.x : typeof checkpoint === "number" ? checkpoint : index * STRIDE + 200;
    adventure.reset(x, saved);
    extras.reset();
    fx.reset();
    levelFlow.reset();
    fx.iris.r = 0;
    fx.irisTo(W * 0.43, H * 0.55, 2000);
    deathSeen = false;
    flagsSeen = new Set(adventure.flags.filter((f) => f.active).map((f) => f.index));
    if (!lab && !saved) save("milk-v3-checkpoint", { x, flag: -1, flags: [], index });
    player.reset(x, FLOOR);
    cam = { x: Math.max(0, Math.min(world.width - W, x - 350)), y: 0, px: 0, py: 0, look: 0 };
    cam.px = cam.x;
    particles = [];
    currentZone = -1;
    mode = "playing";
    syncHUD();
    canvas.focus();
    toast(lab ? "Taller · Bordes, plataformas, daño y rotura" : "X dispara leche · activá las cuatro banderas");
  }
  function pause() {
    if (mode !== "playing") return;
    mode = "paused";
    clearInput();
    $("paused").classList.remove("hidden");
    syncHUD();
  }
  function resume() {
    hideModals();
    mode = "playing";
    clearInput();
    syncHUD();
    canvas.focus();
  }
  function openModal(id) {
    modalBack = mode === "playing" || mode === "paused" ? "paused" : "home";
    if (mode === "playing") pause();
    hideModals();
    $(id).classList.remove("hidden");
    mode = id;
    clearInput();
    syncHUD();
  }
  async function runCinema() {
    activateAudio();
    hideModals();
    clearInput();
    mode = "cinematic";
    syncHUD();
    return MilkCinema.play({
      soundEnabled: () => settings.sound,
      volume: () => settings.volume,
      audioContext: () => audio,
      toggleSound,
      onError: (e) => toast(e.message),
    });
  }
  $("cityCinemaPreview").onclick = async () => {
    activateAudio();
    hideModals();
    clearInput();
    mode = "cinematic";
    syncHUD();
    await MilkCityCinema.play();
    home();
  };
  $("cinemaPreview").onclick = () => runCinema().then(home);
  $("replayCinema").onclick = () =>
    runCinema().then(() => {
      mode = "finish";
      $("finish").classList.remove("hidden");
      syncHUD();
    });
  $("play").onclick = () => start();
  $("continue").onclick = () => {
    let c;
    try {
      c = JSON.parse(localStorage.getItem("milk-v3-checkpoint"));
    } catch {}
    start(c?.index || 0, false, c);
  };
  document.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openModal(b.dataset.open)));
  document.querySelectorAll("[data-close]").forEach(
    (b) =>
      (b.onclick = () => {
        hideModals();
        mode = modalBack;
        $(mode).classList.remove("hidden");
        syncHUD();
      }),
  );
  document.querySelectorAll("[data-start]").forEach((b) => (b.onclick = () => start(+b.dataset.start)));
  $("lab").onclick = () => start(0, true);
  document.querySelectorAll("[data-catalog]").forEach((b) => (b.onclick = openCatalog));
  $("pause").onclick = pause;
  $("resume").onclick = resume;
  $("restart").onclick = () => start(startPoint, lab);
  $("exit").onclick = home;
  $("finishHome").onclick = home;
  $("explore").onclick = () => start();
  function syncSound() {
    const b = $("mute");
    b.textContent = settings.sound ? "♫" : "♪";
    b.title = settings.sound ? "Sonido activado · M para silenciar" : "Sonido apagado · M para activar";
    b.setAttribute("aria-label", b.title);
    b.setAttribute("aria-pressed", String(!settings.sound));
    $("sound").checked = settings.sound;
  }
  function toggleSound() {
    settings.sound = !settings.sound;
    activateAudio();
    save("milk-v3-settings", settings);
    syncSound();
  }
  $("mute").onclick = toggleSound;
  syncSound();
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast("Pantalla completa no disponible en este navegador.");
    }
  }
  $("fullscreen").onclick = fullscreen;
  for (const id of ["sound", "effects", "shake", "volume", "ambient", "impact", "weather"]) {
    const el = $(id);
    if (id === "volume") el.value = settings[id];
    else el.checked = settings[id];
    el.oninput = () => {
      settings[id] = id === "volume" ? +el.value : el.checked;
      save("milk-v3-settings", settings);
      activateAudio();
      syncSound();
    };
  }
  const jumpCodes = ["Space", "KeyZ"];
  window.addEventListener("keydown", (e) => {
    if (e.target.matches("input,button") && mode !== "playing" && e.code !== "Escape") return;
    if (["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "Escape" || e.code === "KeyP") {
      if (mode === "playing") pause();
      else if (mode === "paused") resume();
      else if (mode === "settings" || mode === "routes" || mode === "catalog") {
        hideModals();
        mode = modalBack;
        $(mode).classList.remove("hidden");
        syncHUD();
      }
      return;
    }
    if (e.code === "KeyM") {
      toggleSound();
      return;
    }
    if (e.code === "KeyF") {
      fullscreen();
      return;
    }
    if (e.code === "Enter" && mode === "home") {
      start();
      return;
    }
    if (mode !== "playing") return;
    keys.add(e.code);
    if (jumpCodes.includes(e.code)) jumpQueued = true;
    if (e.code === "KeyX") shotQueued = true;
    if (e.code === "F3") {
      e.preventDefault();
      debug = !debug;
      $("debug").classList.toggle("hidden", !debug);
    }
    if (lab && e.code === "KeyH" && player.damage()) {
      sound("damage");
      toast("Impacto · 2 segundos de invulnerabilidad");
    }
    if (lab && e.code === "KeyK") {
      player.kill();
      sound("break");
    }
    if (lab && e.code === "KeyR") start(0, true);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    clearInput();
    pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearInput();
      pause();
    }
  });
  document.querySelectorAll("[data-key]").forEach((b) => {
    b.onpointerdown = (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      touchKeys.add(b.dataset.key);
      b.classList.add("down");
      if (jumpCodes.includes(b.dataset.key)) jumpQueued = true;
      if (b.dataset.key === "KeyX") shotQueued = true;
      activateAudio();
    };
    const release = () => {
      touchKeys.delete(b.dataset.key);
      b.classList.remove("down");
    };
    b.onpointerup = release;
    b.onpointercancel = release;
    b.onlostpointercapture = release;
  });
  const held = (...codes) => codes.some((c) => keys.has(c) || touchKeys.has(c));
  function dust(type) {
    if (!settings.effects) return;
    const count = type === "hardland" ? 18 : type === "land" ? 10 : 7;
    for (let i = 0; i < count; i++)
      particles.push({
        x: player.x + (Math.random() - 0.5) * 22,
        y: player.y - 3,
        vx: (Math.random() - 0.5) * 110 - player.vx * 0.15,
        vy: -Math.random() * 60 - 10,
        life: 0.35 + Math.random() * 0.3,
        max: 0.65,
        r: 2 + Math.random() * 5,
        dark: player.x > STRIDE * 6,
      });
  }
  function update(dt) {
    time += dt;
    const escort = !lab && adventure.won;
    const input = {
      left: held("ArrowLeft", "KeyA"),
      right: held("ArrowRight", "KeyD"),
      run: held("ShiftLeft", "ShiftRight"),
      down: held("ArrowDown", "KeyS"),
      jump: held("Space", "KeyZ"),
      jumpPressed: jumpQueued,
      shoot: held("KeyX") || shotQueued,
      speed: lab ? 1 : extras.power.frutilla > 0 ? 1.3 : extras.power.uht > 0 ? 1.15 : 1,
    };
    if (escort)
      Object.assign(input, {
        left: false,
        right: levelFlow.state === "walk",
        run: false,
        down: false,
        jump: false,
        jumpPressed: false,
        shoot: false,
        speed: 1,
      });
    jumpQueued = false;
    shotQueued = false;
    surfCache = null;
    const events = player.step(dt, input, world);
    for (const ev of events) {
      if (ev === "bump" && !lab) play(player.bumped && player.bumped.used ? "bumpused" : "bump");
      if (ev === "spring") {
        play("spring");
        fx.event({ type: "spring", x: player.x, y: player.y }, fxOpts());
        if (!tips.has("spring")) {
          tips.add("spring");
          toast("¡Resorte! Mantené salto para llegar más alto");
        }
      }
      if (["start", "skid", "land", "hardland"].includes(ev)) dust(ev);
      if (["jump", "skid", "land", "hardland"].includes(ev)) sound(ev);
      if (ev === "hardland" && settings.shake) shake = 0.18;
      if (ev === "respawn") {
        respawnV2();
      }
    }
    if (player.dead && player.death > 1.6) {
      respawnV2();
    }
    if (!lab) {
      if (!escort) for (const e of extras.step(dt, player, input, world)) onExtra(e);
      for (const ev of escort ? [] : adventure.step(dt, player, input, toast)) {
        if (ev === "checkpoint") {
          const f = adventure.flags.find((k) => k.inside);
          if (f && !flagsSeen.has(f.index)) {
            flagsSeen.add(f.index);
            extras.addPoints(500, f.x, 360, "CHECKPOINT");
            fx.event({ type: "checkpoint", x: f.x, y: FLOOR }, fxOpts());
            play("checkpoint");
          }
        }
        if (ev === "victory") {
          play("victory");
          fx.event({ type: "victory", x: player.x, y: player.y }, fxOpts());
          saveV4();
        }
        if (ev === "toxic") fx.event({ type: "splash", x: player.x, y: 580, color: "#a4ff49" }, fxOpts());
        if (ev === "checkpoint")
          save("milk-v3-checkpoint", {
            ...adventure.checkpoint,
            flags: adventure.flags.filter((f) => f.active).map((f) => f.index),
            index: Math.floor(adventure.checkpoint.x / STRIDE),
          });
        if (ev === "toxic") sound("damage");
        if (ev === "bossbeam") play("alarm");
        if (["playerhit", "enemyhit", "enemydeath", "milkshot", "enemyshot"].includes(ev))
          sound(ev === "playerhit" ? "damage" : ev === "enemydeath" ? "break" : "land");
        if (ev === "playerhit" && settings.shake) shake = 0.08;
        if (ev === "victory" && !completed) {
          completed = true;
          levelFlow.begin();
          adventure.arena = false;
          player.invuln = 0;
          player.dead = false;
          clearInput();
          toast("¡GANASTE! · El camino al nivel 2 está abierto");
          save("milk-v5-progress", { completedLevel: 1, nextLevel: 2, score: extras.score, caps: [...extras.found] });
        }
      }
      $("condition").textContent = adventure.intoxicated ? "INTOXICADA" : "LECHE";
      $("condition").classList.toggle("poison", adventure.intoxicated);
      $("healthFill").style.background = adventure.intoxicated ? "#b4dc59" : "#fff1cd";
      $("healthFill").style.width = adventure.hp + "%";
      $("healthValue").textContent = adventure.hp + "%";
      $("flagCount").textContent = adventure.flags.filter((f) => f.active).length + "/4";
      if (!escort) for (const e of extras.post(player)) onExtra(e);
      if (player.dead && !deathSeen) {
        deathSeen = true;
        fx.event({ type: "death", x: player.x, y: player.y - 70 }, fxOpts());
        play("break");
      }
      if (player.dead && player.death > 1.05) fx.irisTo(player.x - cam.x, player.y - 70 - cam.y, 0);
      // Estelas de velocidad (corriendo, frutilla o UHT).
      trailTick -= dt;
      if (
        settings.effects &&
        trailTick <= 0 &&
        !player.dead &&
        (extras.power.frutilla > 0 || extras.power.uht > 0 || Math.abs(player.vx) > 400)
      ) {
        trailTick = 0.045;
        const f = pose();
        fx.trail.push({
          ...f,
          x: player.x,
          y: player.y,
          face: player.face,
          life: 0.22,
          kind2: extras.power.uht > 0 ? "uht" : extras.power.frutilla > 0 ? "frutilla" : "run",
        });
      }
      updateHUD4(dt);
      if (adventure.won) {
        adventure.zoom += (1 - adventure.zoom) * Math.min(1, dt * 2);
        for (const ev of levelFlow.step(dt, player, WORLD)) {
          if (ev === "firework") {
            const x = cam.x + 220 + Math.random() * 840,
              y = 80 + Math.random() * 190;
            if (settings.effects) {
              fx.burst(x, y, 50, ["#ffd15a", "#74e9ff", "#f987c8"][Math.floor(Math.random() * 3)], 240, "star");
              fx.ring(x, y, "#ffedbd", 95, 3);
            }
            sound("land");
          }
          if (ev === "nextlevel") {
            finishStats();
            clearInput();
            mode = "finish";
            syncHUD();
            const payload = { from: 1, to: 2, hp: adventure.hp, score: extras.score, caps: [...extras.found] };
            save("milk-v5-progress", { completedLevel: 1, nextLevel: 2, ...payload });
            runCinema().then(() => {
              mode = "finish";
              syncHUD();
              window.dispatchEvent(new CustomEvent("milk:level-transition", { detail: payload }));
              if (typeof window.MilkLevels?.[2]?.start === "function") window.MilkLevels[2].start(payload);
              else $("finish").classList.remove("hidden");
            });
          }
        }
      }
    }
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 35 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    shake = Math.max(0, shake - dt);
    if (fx.kick > 0 && settings.shake) shake = Math.max(shake, fx.kick);
    cam.px = cam.x;
    cam.py = cam.y;
    const moving = Math.abs(player.vx) > 20;
    cam.look += (moving ? player.face * 125 - cam.look : -cam.look) * (1 - Math.exp(-dt * 3.5));
    let target = cam.x;
    const rel = player.x - cam.x,
      center = W * 0.43 - cam.look,
      dead = 75;
    if (rel > center + dead) target = player.x - center - dead;
    else if (rel < center - dead) target = player.x - center + dead;
    if (!lab && adventure.arena) target = WORLD - W / 2 - W / (2 * adventure.zoom);
    else target = Math.max(0, Math.min(world.width - W, target));
    cam.x += (target - cam.x) * (1 - Math.exp(-dt * 6));
    // Follow platform elevation only; normal jumps do not pull the camera vertically.
    if (player.grounded) {
      const ty = Math.max(-100, Math.min(0, player.y - FLOOR));
      cam.y += (ty - cam.y) * (1 - Math.exp(-dt * 3));
    }
    const zone = lab ? 0 : Math.max(0, Math.min(11, Math.floor((player.x + OVERLAP * 0.5) / STRIDE)));
    if (currentZone !== zone) {
      currentZone = zone;
      $("chapter").textContent = lab ? "TALLER / MOVIMIENTO" : zone < 6 ? "01 / DE ACERO Y SOL" : "02 / LA PENUMBRA";
      $("location").textContent = lab ? "Pruebas de precisión" : names[zone];
      if (zone > 0 && !lab) toast(names[zone]);
    }
    uiTick += dt;
    if (uiTick > 0.15) {
      uiTick = 0;
      const pct = Math.round((player.x / world.width) * 100);
      $("distance").textContent = pct + "%";
      $("progress").style.width = pct + "%";
      if (debug)
        $("debug").textContent =
          `${player.state.toUpperCase()}\nx ${player.x.toFixed(1)} · y ${player.y.toFixed(1)}\nvx ${player.vx.toFixed(1)} · vy ${player.vy.toFixed(1)}\nsuelo ${player.grounded} · coyote ${player.coyote.toFixed(3)}\nbuffer ${player.buffer.toFixed(3)} · simulación 120 Hz`;
    }
  }
  /* ---------- V4: eventos, HUD y guardado ---------- */
  const fxOpts = () => ({ effects: settings.effects, impact: settings.impact });
  const POWER_TIPS = {
    cacao: "Chocolatada · disparos de chocolate con doble daño",
    frutilla: "Frutilla · 30% más rápida por 12 segundos",
    shield: "Tapa escudo · aguanta el próximo golpe",
    uht: "Leche UHT · ¡invencible! Aplastá todo lo que toques",
  };
  function tip(key, text) {
    if (tips.has(key)) return;
    tips.add(key);
    toast(text);
  }
  function onExtra(e) {
    if (settings.effects || ["points", "hurt", "power", "cap", "death"].includes(e.type)) fx.event(e, fxOpts());
    const sounds = {
      drop: "drop",
      cap: "cap",
      break: "break",
      popitem: "popitem",
      power: "power",
      powerend: "powerend",
      stomp: "stomp",
      slam: "slam",
      warn: "warn",
      alarm: "alarm",
      shieldbreak: "shieldbreak",
      enemydeath: "enemydeath",
      enemyhit: "enemyhit",
      lemon: "lemon",
      crumble: "crumble",
      fridge: "fridge",
      hot: "hot",
      sour: "sour",
      secret: "secret",
      bonus: "bonus",
      cratebreak: "cratebreak",
      icebreak: "icebreak",
    };
    if (sounds[e.type] && Math.abs(e.x - player.x) < 900) play(sounds[e.type], e);
    if (e.type === "hurt") {
      sound("damage");
      if (settings.shake) shake = Math.max(shake, 0.1);
    }
    if (e.type === "slam" && settings.shake && Math.abs(e.x - player.x) < 500) shake = Math.max(shake, 0.12);
    if (e.type === "power") toast(POWER_TIPS[e.kind]);
    if (e.type === "powerend")
      toast("Se terminó el efecto de " + { cacao: "la chocolatada", frutilla: "la frutilla", uht: "la leche UHT" }[e.kind]);
    if (e.type === "cap") {
      toast("¡Tapita dorada! " + extras.capCount + "/8");
      saveV4();
    }
    if (e.type === "secret") toast("¡Encontraste una caja escondida!");
    if (e.type === "fridge") tip("fridge", "Heladera · acá baja la temperatura de la leche");
    if (e.type === "hot") toast("¡Mucho sol! Buscá sombra o una heladera antes de agriarte");
    if (e.type === "sour") tip("sour", "¡Te estás agriando! Salí del sol");
    if (e.type === "alarm") tip("alarm", "¡Te vio el robot! Agachate para que no te detecte");
    if (e.type === "stomp" && e.combo >= 3) tip("combo", "¡Combo! Encadená pisotones sin tocar el suelo");
    if (e.type === "drop" && extras.dropCount === 1) tip("drop", "Gotas de leche · cada 50 recuperás 25% de energía");
  }
  function saveV4() {
    v4save.caps = [...extras.found];
    v4save.best = Math.max(v4save.best || 0, extras.score);
    save("milk-v4-extras", v4save);
  }
  let hudTick = 0;
  function updateHUD4(dt) {
    hudTick += dt;
    if (hudTick < 0.08) return;
    hudTick = 0;
    $("score").textContent = String(extras.score).padStart(6, "0");
    $("dropCount").textContent = extras.dropCount;
    $("capCount").textContent = extras.capCount + "/8";
    const t = Math.round(extras.temp);
    $("tempFill").style.height = t + "%";
    $("tempFill").style.background = t > 75 ? "#ff6b3d" : t > 50 ? "#ffc14d" : t < 15 ? "#8fd8ff" : "#7fe0b0";
    $("thermo").classList.toggle("hot", t > 75);
    $("tempValue").textContent = Math.round(2 + extras.temp * 0.36) + "°";
    const P = extras.power,
      chips = [];
    if (P.cacao > 0) chips.push(["cacao", "🍫 CHOCOLATADA", P.cacao / 20]);
    if (P.frutilla > 0) chips.push(["frutilla", "🍓 FRUTILLA", P.frutilla / 12]);
    if (P.uht > 0) chips.push(["uht", "★ UHT", P.uht / 9]);
    if (P.shield) chips.push(["shield", "◉ ESCUDO", 1]);
    if (extras.combo > 1) chips.push(["combo", "COMBO x" + extras.combo, 1]);
    const html = chips
      .map(([k, label, v]) => `<span class="chip ${k}"><b>${label}</b><i style="width:${Math.round(v * 100)}%"></i></span>`)
      .join("");
    if ($("powers").innerHTML !== html) $("powers").innerHTML = html;
    if (extras.score > (v4save.best || 0) && extras.score % 1000 < 20) saveV4();
  }
  function homeStats() {
    const el = $("homeStats");
    if (!el) return;
    el.innerHTML = `<span>TAPITAS <b>${extras.found.size}/8</b></span><span>MEJOR PUNTAJE <b>${String(v4save.best || 0).padStart(6, "0")}</b></span>`;
  }
  function finishStats() {
    $("finishStats").innerHTML = [
      ["Puntaje", extras.score],
      ["Gotas", extras.dropCount + "/" + extras.dropTotal],
      ["Tapitas", extras.capCount + "/8"],
      ["Enemigos", extras.kills + adventure.enemies.filter((e) => e.hp <= 0).length],
      ["Mejor combo", Math.max(extras.bestCombo, extras.combo) > 1 ? "x" + Math.max(extras.bestCombo, extras.combo) : "—"],
    ]
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
      .join("");
  }
  /* Catálogo de diseños: muestra cada enemigo y objeto con el nombre de archivo para reemplazarlo. */
  let catalogRaf = 0;
  function openCatalog() {
    openModal("catalog");
    const grid = $("catalogGrid");
    const D = MilkDesigns.list;
    grid.innerHTML = Object.entries(D)
      .map(
        ([k, d]) =>
          `<figure class="design"><canvas data-k="${k}" width="180" height="150"></canvas><figcaption><b>${d.name}</b><code>${k}-0.png</code><span class="${MilkDesigns.isCustom(k) ? "ok" : ""}">${
            MilkDesigns.isCustom(k) ? "✓ Imagen propia · " + MilkDesigns.frames(k) + " cuadros" : "Diseño por defecto"
          }</span><small>${d.group} · ${d.size[0]}×${d.size[1]} px · ${d.hint}</small></figcaption></figure>`,
      )
      .join("");
    const canvases = [...grid.querySelectorAll("canvas")];
    cancelAnimationFrame(catalogRaf);
    const loop = (ts) => {
      if (mode !== "catalog") return;
      const t = ts / 1000;
      for (const c of canvases) {
        const g = c.getContext("2d"),
          k = c.dataset.k,
          d = D[k];
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, c.width, c.height);
        const scale = Math.min(1.8, 110 / Math.max(d.size[0], d.size[1] * 0.9));
        g.translate(90, 128);
        g.scale(scale, scale);
        const o = {
          face: 1,
          theme: "steel",
          open: (Math.sin(t) + 1) / 2,
          boing: t % 1.5 < 0.35 ? 0.35 - (t % 1.5) : 0,
          warn: t % 3 > 2,
          state: k === "robot" && t % 4 > 3 ? "alarm" : "patrol",
          rot: k === "limon" ? t * 3 : 0,
          cold: false,
          on: true,
        };
        MilkDesigns.draw(g, k, t, 0, 0, o);
        if (k === "cartel") {
          g.font = "bold 11px Arial";
          g.textAlign = "center";
          g.fillStyle = "#f2f6f2";
          g.fillText("CONSEJO", 0, -70);
        }
      }
      catalogRaf = requestAnimationFrame(loop);
    };
    catalogRaf = requestAnimationFrame(loop);
  }
  function respawnV2() {
    if (lab) player.reset(200, FLOOR);
    else {
      adventure.respawn(player);
      extras.respawn();
      deathSeen = false;
      fx.iris.r = 0;
      fx.irisTo(W * 0.43, H * 0.55, 2000);
    }
    cam.x = Math.max(0, Math.min(world.width - W, player.x - 350));
    cam.y = 0;
    cam.px = cam.x;
    cam.py = 0;
    clearInput();
    toast(
      lab
        ? "Otra prueba."
        : "De vuelta en " + (adventure.checkpoint.flag >= 0 ? "checkpoint " + (adventure.checkpoint.flag + 1) : "el inicio"),
    );
  }
  function background(cameraX, cameraY) {
    ctx.fillStyle = "#112637";
    ctx.fillRect(0, 0, W, H);
    const first = Math.max(0, Math.floor(cameraX / STRIDE) - 1),
      end = Math.min(11, Math.ceil((cameraX + W) / STRIDE));
    const depth = settings.effects && !lab,
      ratio = depth ? 0.88 : 1,
      arr = depth ? farTiles : tiles;
    const drift = depth ? Math.sin(time * 0.14) * 1.2 : 0;
    for (let i = first; i <= end; i++) ctx.drawImage(arr[i], i * STRIDE * ratio - cameraX * ratio + drift, -cameraY);
    if (cameraY < 0) {
      for (let i = first; i <= end; i++)
        ctx.drawImage(arr[i], 0, 0, TILE, 1, i * STRIDE * ratio - cameraX * ratio + drift, 0, TILE, -cameraY);
    }
    if (depth) for (let i = first; i <= end; i++) ctx.drawImage(groundTiles[i], i * STRIDE - cameraX, -cameraY);
  }

  function ambient(cx, cy, front = false) {
    if (!settings.effects) return;
    const dark = !lab && cx > STRIDE * 5.7;
    ctx.save();
    if (!front) {
      // Independent atmosphere layer, 0.18 camera ratio.
      if (dark) {
        for (let i = 0; i < 5; i++) {
          let x = ((((i * 397 - cx * 0.18 + time * 8) % 1700) + 1700) % 1700) - 200;
          const g = ctx.createRadialGradient(x, 410 - cy * 0.25, 10, x, 410 - cy * 0.25, 210);
          g.addColorStop(0, "#9bdcff12");
          g.addColorStop(1, "#9bdcff00");
          ctx.fillStyle = g;
          ctx.fillRect(x - 210, 200, 420, 420);
        }
      } else if (cx < STRIDE * 3) {
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 4; i++) {
          const x = ((((i * 520 - cx * 0.35) % 1900) + 1900) % 1900) - 200;
          const g = ctx.createLinearGradient(x, 0, x + 110, 530);
          g.addColorStop(0, "#fff4bd12");
          g.addColorStop(1, "#fff4bd00");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + 120, 0);
          ctx.lineTo(x + 340, 520);
          ctx.lineTo(x + 120, 520);
          ctx.fill();
        }
      }
      // Airborne motes drift independently, 0.55 camera ratio.
      for (let i = 0; i < 28; i++) {
        const x = ((((i * 149.3 - cx * 0.55 + time * (dark ? 9 : 15)) % 1400) + 1400) % 1400) - 50,
          y = 90 + ((i * 83) % 415) + Math.sin(time * 0.65 + i) * 15 - cy * 0.3;
        ctx.fillStyle = dark ? "#c0e8ff77" : "#fff9cc70";
        ctx.beginPath();
        ctx.arc(x, y, dark ? 1.1 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Soft foreground silhouettes, 1.12 camera ratio, below the walk plane.
      if (cx > STRIDE * 3 && cx < STRIDE * 9.5 && !lab) {
        ctx.strokeStyle = dark ? "#071d28aa" : "#173f3280";
        ctx.lineWidth = 3;
        for (let i = 0; i < 24; i++) {
          const x = ((((i * 111 - cx * 1.12) % 1500) + 1500) % 1500) - 80;
          const y = H + 5;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x - 9, y - 50, x - 25 + Math.sin(time * 1.2 + i) * 8, y - 75 - (i % 4) * 13);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + 15, y - 40, x + 24 + Math.sin(time + i) * 6, y - 56);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  function laboratory(cx, cy) {
    ctx.save();
    ctx.fillStyle = "#0a2035d9";
    ctx.fillRect(0, 0, W, H);
    const grid = 40;
    ctx.strokeStyle = "#84cee410";
    ctx.lineWidth = 1;
    for (let x = -cx % grid; x < W; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = -cy % grid; y < H; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    for (const p of platforms) {
      const x = p.x - cx,
        y = p.y - cy;
      if (x > W || x + p.w < 0) continue;
      ctx.fillStyle = p.y === FLOOR ? "#264d65" : "#326079";
      ctx.fillRect(x, y, p.w, p.y === FLOOR ? H : 24);
      ctx.fillStyle = "#a1d8e4";
      ctx.fillRect(x, y, p.w, 4);
      ctx.strokeStyle = "#132f45";
      for (let j = 12; j < p.w; j += 36) {
        ctx.beginPath();
        ctx.moveTo(x + j, y + 8);
        ctx.lineTo(x + j + 12, y + 20);
        ctx.stroke();
      }
    }
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#d1e7e9";
    ctx.fillText("01 / ACELERAR Y FRENAR", 80 - cx, 320 - cy);
    ctx.fillText("02 / COYOTE TIME", 675 - cx, 390 - cy);
    ctx.fillText("03 / SALTO VARIABLE", 1020 - cx, 220 - cy);
    ctx.fillText("04 / ALTURA Y ATERRIZAJE", 2040 - cx, 155 - cy);
    ctx.font = "13px Arial";
    ctx.fillStyle = "#90b2c4";
    ctx.fillText("H · Daño     K · Rotura     R · Reiniciar", 80 - cx, 350 - cy);
    ctx.restore();
  }
  function pose() {
    const p = player,
      s = p.state;
    let kind = "walk",
      index = 0,
      scale = 142 / 507;
    if (s === "dead") {
      kind = "damage";
      index = Math.min(7, Math.floor(p.death * 7));
      scale = 142 / 484;
    } else if (!lab && adventure.shootTime > 0 && p.grounded && Math.abs(p.vx) < 80 && p.crouch < 0.2) {
      kind = "shoot";
      index = adventure.shootTime > 0.17 ? 0 : adventure.shootTime > 0.07 ? 1 : 2;
      scale = 142 / 380;
    } else if (s === "crouch") {
      kind = "crouch";
      index = p.crouch < 0.45 ? 1 : 2;
      scale = 142 / 588;
    } else if (s === "rise" || s === "apex" || s === "fall" || s === "land") {
      kind = "jump";
      index = s === "rise" ? (p.vy < -350 ? 3 : 4) : s === "apex" ? 4 : s === "fall" ? 5 : 6;
      scale = 142 / 448;
    } else if (s === "skid") {
      kind = "skid";
      index = 4 + Math.min(2, Math.floor((1 - Math.min(1, Math.abs(p.vx) / 420)) * 4));
      scale = 142 / 454;
    } else if (s === "run") {
      kind = "run";
      index = [2, 3, 4, 5, 6, 7][Math.floor(p.phase) % 6];
      scale = 142 / 459;
    } else if (s === "walk") index = Math.floor(p.phase) % 8;
    else if (s === "idle") {
      kind = "skid";
      index = 7;
      scale = 142 / 454;
    }
    if (!lab && adventure.intoxicated && !p.dead) {
      if (s === "crouch" || s === "skid") {
        kind = "toxicCrouch";
        index = p.crouch > 0.5 ? 4 : 3;
        scale = 142 / 498;
      } else if (adventure.shootTime > 0 && p.grounded && Math.abs(p.vx) < 80) {
        kind = "toxicShoot";
        index = adventure.shootTime > 0.17 ? 1 : adventure.shootTime > 0.07 ? 3 : 4;
        scale = 142 / 396;
      } else if (["rise", "fall", "apex", "land"].includes(s)) {
        kind = "toxicRun";
        index = s === "rise" ? 3 : s === "fall" ? 5 : 4;
        scale = 142 / 463;
      } else if (s === "run") {
        kind = "toxicRun";
        index = [3, 4, 5, 7][Math.floor(p.phase) % 4];
        scale = 142 / 463;
      } else {
        kind = "toxicWalk";
        index = s === "walk" ? Math.floor(p.phase) % 8 : 0;
        scale = 142 / 484;
      }
    } else if (!lab && !p.dead && adventure.hp <= 60 && s === "idle") {
      kind = "damage";
      index = adventure.hp > 40 ? 1 : adventure.hp > 20 ? 2 : 4;
      scale = 142 / 484;
    }
    if (!lab && !p.dead && extras.power.cacao > 0 && !adventure.intoxicated && adventure.shootTime > 0 && p.crouch < 0.2) {
      kind = "chocoShoot";
      index = adventure.shootTime > 0.16 ? 0 : adventure.shootTime > 0.07 ? 1 : 2;
      scale = 142 / 400;
    }
    return { im: spriteImgs[kind][index], scale, kind, index };
  }
  function drawPlayer(cx, cy, alpha) {
    const p = player;
    const x = p.px + (p.x - p.px) * alpha - cx,
      y = p.py + (p.y - p.py) * alpha - cy;
    const ground =
      world
        .surfaces(p.x)
        .filter((s) => p.x > s.x && p.x < s.x + s.w && s.y >= p.y - 2)
        .sort((a, b) => a.y - b.y)[0]?.y ?? FLOOR;
    const above = Math.max(0, ground - p.y);
    ctx.save();
    ctx.globalAlpha = Math.max(0.08, 0.27 - above / 1500);
    ctx.fillStyle = "#071829";
    ctx.beginPath();
    ctx.ellipse(x, ground - cy + 1, Math.max(13, 31 - above * 0.025), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (p.dead && p.death > 1.22) return;
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) return;
    const f = pose(),
      im = f.im;
    let sx = 1,
      sy = 1;
    if (p.state === "rise") {
      sx = 0.965;
      sy = 1.045;
    } else if (p.state === "land") {
      const force = p.land / 0.15;
      sx = 1 + force * 0.1;
      sy = 1 - force * 0.09;
    } else if (p.state === "idle") {
      sy = 1 + Math.sin(time * 2.6) * 0.007;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.face * sx, sy);
    if (p.state === "run") ctx.rotate(0.018);
    const dw = im.width * f.scale,
      dh = im.height * f.scale;
    ctx.globalAlpha = p.dead ? Math.min(1, (1.5 - p.death) * 3) : 1;
    ctx.filter = f.kind === "chocoShoot" ? "none" : playerFilter;
    ctx.drawImage(im, -dw / 2, f.kind === "damage" ? -ASSET_META.damage[f.index].anchorY * f.scale : -dh, dw, dh);
    ctx.filter = "none";
    if (!lab && !p.dead && adventure.hp <= 60) {
      ctx.strokeStyle = "#435969";
      ctx.lineWidth = 1.2;
      const cracks = adventure.crackStage();
      for (let k = 0; k < cracks; k++) {
        const q = -14 + k * 12;
        ctx.beginPath();
        ctx.moveTo(q, -90 + k * 4);
        ctx.lineTo(q + 6, -82 + k * 3);
        ctx.lineTo(q + 1, -73 + k * 2);
        ctx.lineTo(q + 9, -62 + k * 2);
        ctx.moveTo(q + 6, -82 + k * 3);
        ctx.lineTo(q + 13, -85 + k * 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function render(alpha) {
    let cx = cam.px + (cam.x - cam.px) * alpha,
      cy = cam.py + (cam.y - cam.py) * alpha;
    if (mode === "home" || mode === "routes" || (mode === "settings" && modalBack === "home")) {
      cx = 160 + Math.sin(time * 0.1) * 50;
      cy = 0;
    }
    ctx.save();
    const zoom = (!lab && mode !== "home" && mode !== "routes" ? adventure.zoom : 1) + (settings.impact ? fx.zoomPunch : 0);
    if (!lab && adventure.arena) cx = Math.min(cx, WORLD - W / 2 - W / (2 * zoom));
    ctx.translate(W / 2, H * 0.65);
    ctx.scale(zoom, zoom);
    ctx.translate(-W / 2, -H * 0.65);
    if (shake > 0) ctx.translate(Math.sin(time * 95) * shake * 15, Math.cos(time * 82) * shake * 10);
    background(cx, cy);
    ambient(cx, cy);
    const inGame = !lab && ["playing", "paused", "finish"].includes(mode);
    const zoneNow = Math.max(0, Math.min(11, Math.floor((cx + W / 2) / STRIDE)));
    if (inGame && settings.weather) fx.weather(ctx, zoneNow, cx, cy, time, false);
    if (inGame) {
      MilkScenery.terrain(ctx, adventure, cx, cy, time);
      MilkExtrasDraw.back(ctx, extras, adventure, cx, cy, time, player);
      if (settings.effects) MilkScenery.environment(ctx, adventure, cx, cy, time);
      MilkExtrasDraw.mid(ctx, extras, adventure, cx, cy, time);
      MilkScenery.actors(ctx, adventure, spriteImgs, cx, cy, time);
    }
    if (lab && mode !== "home") laboratory(cx, cy);
    const showPlayer =
      mode !== "home" &&
      mode !== "routes" &&
      !(mode === "settings" && modalBack === "home") &&
      !(mode === "catalog" && modalBack === "home");
    if (showPlayer) {
      if (inGame) {
        reflection(cx, cy, alpha, zoneNow);
        drawTrail(cx, cy);
        auraBack(cx, cy);
      }
      playerFilter = lab ? "none" : playerLook();
      drawPlayer(cx, cy, alpha);
      playerFilter = "none";
      if (inGame) auraFront(cx, cy);
    }
    if (!lab && mode === "playing") MilkScenery.waterSurface(ctx, adventure, cx, cy, time);
    if (inGame) {
      fx.drawWorld(ctx, cx, cy);
      if (settings.effects) MilkExtrasDraw.front(ctx, extras, cx, cy, time);
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.5;
      ctx.fillStyle = p.dark ? "#b4cbd8" : "#fff1d7";
      ctx.beginPath();
      ctx.arc(p.x - cx, p.y - cy, p.r * (1.7 - p.life), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ambient(cx, cy, true);
    if (!lab && settings.effects) MilkScenery.leaves(ctx, cx, cy, time);
    if (inGame && settings.weather) {
      fx.weather(ctx, zoneNow, cx, cy, time, true);
      fx.darkness(ctx, zoneNow, player.x - cx, player.y - cy, time, extras.power.uht > 0 ? 0.3 : 1);
    }
    if (inGame && settings.effects) fx.foreground(ctx, zoneNow, cx, time);
    const vignette = ctx.createLinearGradient(0, H - 100, 0, H);
    vignette.addColorStop(0, "#00152600");
    vignette.addColorStop(1, "#00152650");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, H - 100, W, 100);
    ctx.restore();
    if (inGame || (lab && mode === "playing")) {
      if (fx.iris.target > 1000) {
        fx.iris.x = player.x - cx;
        fx.iris.y = player.y - 70 - cy;
      }
      fx.screen(ctx, {
        temp: lab ? 0 : extras.temp,
        cold: !lab && settings.weather && zoneNow >= 10,
        hp: adventure.hp,
        dead: player.dead,
        uht: !lab && extras.power.uht > 0,
        t: time,
      });
    }
  }
  function drawLevelFlow() {
    if (levelFlow.state === "idle" || levelFlow.state === "done") return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffedb8";
    ctx.font = "900 45px Arial";
    ctx.fillText("¡GANASTE!", W / 2, 140);
    ctx.font = "19px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(levelFlow.state === "celebrate" ? "GUARDIÁN DERROTADO" : "RUMBO AL NIVEL 2", W / 2, 178);
    ctx.shadowBlur = 0;
    if (levelFlow.fade > 0) {
      ctx.fillStyle = `rgba(5,14,25,${levelFlow.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  /* ---------- V4: aspecto de la botella según su estado ---------- */
  function playerLook() {
    const P = extras.power;
    if (P.uht > 0) return `hue-rotate(${(time * 400) % 360}deg) saturate(1.6) brightness(1.15)`;
    if (P.cacao > 0) return "sepia(.75) saturate(1.5) hue-rotate(-12deg) brightness(.82)";
    if (extras.temp > 80) return `sepia(${((extras.temp - 80) / 40).toFixed(2)}) saturate(1.3)`;
    return "none";
  }
  function reflection(cx, cy, alpha, zone) {
    if (!settings.effects || player.dead) return;
    const shiny = zone <= 3 || zone >= 9;
    const ground = Math.abs(player.y - FLOOR) < 160 && player.x > 0;
    if (!shiny || !ground || adventure.pits.some((g) => player.x > g.x && player.x < g.x + g.w)) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, FLOOR - cy + 1, W, 110);
    ctx.clip();
    ctx.translate(0, 2 * (FLOOR - cy));
    ctx.scale(1, -1);
    ctx.globalAlpha = 0.16;
    const fade = ctx.globalAlpha;
    const was = playerFilter;
    playerFilter = "none";
    drawPlayerBody(cx, cy, alpha, fade);
    playerFilter = was;
    ctx.restore();
  }
  function drawPlayerBody(cx, cy, alpha, fade) {
    const p = player;
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) return;
    const f = pose(),
      im = f.im;
    const x = p.px + (p.x - p.px) * alpha - cx,
      y = p.py + (p.y - p.py) * alpha - cy;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(p.face, 1);
    const dw = im.width * f.scale,
      dh = im.height * f.scale;
    ctx.globalAlpha = fade;
    ctx.filter = playerFilter;
    ctx.drawImage(im, -dw / 2, f.kind === "damage" ? -ASSET_META.damage[f.index].anchorY * f.scale : -dh, dw, dh);
    ctx.filter = "none";
    ctx.restore();
  }
  function drawTrail(cx, cy) {
    if (!settings.effects) return;
    for (const a of fx.trail) {
      const im = a.im,
        dw = im.width * a.scale,
        dh = im.height * a.scale;
      ctx.save();
      ctx.translate(a.x - cx, a.y - cy);
      ctx.scale(a.face, 1);
      ctx.globalAlpha = (a.life / 0.22) * 0.45;
      ctx.filter =
        a.kind2 === "uht"
          ? `hue-rotate(${(a.life * 2000) % 360}deg) saturate(3) brightness(1.4)`
          : a.kind2 === "frutilla"
            ? "sepia(1) saturate(4) hue-rotate(300deg) brightness(1.1)"
            : "brightness(1.6) opacity(.8)";
      ctx.drawImage(im, -dw / 2, a.kind === "damage" ? -ASSET_META.damage[a.index].anchorY * a.scale : -dh, dw, dh);
      ctx.restore();
    }
  }
  function auraBack(cx, cy) {
    const P = extras.power,
      x = player.x - cx,
      y = player.y - 70 - cy;
    if (player.dead) return;
    if (P.uht > 0) {
      const r = ctx.createRadialGradient(x, y, 10, x, y, 120);
      r.addColorStop(0, `hsla(${(time * 400) % 360},100%,70%,.45)`);
      r.addColorStop(1, "hsla(0,100%,70%,0)");
      ctx.fillStyle = r;
      ctx.fillRect(x - 120, y - 120, 240, 240);
    }
    if (P.cacao > 0 && settings.effects && Math.random() < 0.3)
      fx.add({
        x: player.x + (Math.random() - 0.5) * 40,
        y: player.y - Math.random() * 130,
        vx: 0,
        vy: -40,
        life: 0.6,
        max: 0.6,
        kind: "dot",
        color: "#8b5a34",
        size: 3,
        grav: 0,
      });
    if (P.frutilla > 0 && settings.effects && Math.random() < 0.35)
      fx.add({
        x: player.x - player.face * 20,
        y: player.y - Math.random() * 120,
        vx: -player.face * 60,
        vy: 0,
        life: 0.5,
        max: 0.5,
        kind: "star",
        color: "#ff9fb2",
        size: 3,
        grav: 0,
        rot: 0,
        spin: 5,
      });
    if (P.uht > 0 && settings.effects && Math.random() < 0.6)
      fx.add({
        x: player.x + (Math.random() - 0.5) * 60,
        y: player.y - Math.random() * 140,
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
    // Vapor de aliento en las zonas frías y gotas de sudor con calor.
    const zone = Math.floor(player.x / STRIDE);
    if (settings.effects && zone >= 8 && Math.random() < 0.025)
      fx.add({
        x: player.x + player.face * 18,
        y: player.y - 120,
        vx: player.face * 30,
        vy: -20,
        life: 0.9,
        max: 0.9,
        kind: "dot",
        color: "rgba(235,248,255,.7)",
        size: 7,
        grav: -10,
      });
    if (settings.effects && extras.temp > 75 && Math.random() < 0.06)
      fx.add({
        x: player.x + (Math.random() - 0.5) * 30,
        y: player.y - 125,
        vx: (Math.random() - 0.5) * 80,
        vy: -120,
        life: 0.6,
        max: 0.6,
        kind: "dot",
        color: "#bfe6ff",
        size: 3,
        grav: 600,
      });
  }
  function auraFront(cx, cy) {
    if (player.dead) return;
    const x = player.x - cx,
      y = player.y - 70 - cy;
    if (extras.power.shield) {
      ctx.save();
      const r = 86 + Math.sin(time * 4) * 3;
      const g = ctx.createRadialGradient(x, y, r * 0.7, x, y, r);
      g.addColorStop(0, "rgba(120,200,255,0)");
      g.addColorStop(0.85, "rgba(120,200,255,.22)");
      g.addColorStop(1, "rgba(170,225,255,.6)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.62, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(220,245,255,.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.62, r, 0, -2.4 + Math.sin(time) * 0.2, -1.6);
      ctx.stroke();
      ctx.restore();
    }
  }
  function frame(ts) {
    // V7 Premium: el nivel 1 usa la música nueva; el acompañamiento anterior queda como respaldo si no hay MilkMusic.
    if (music) {
      if (!EXTERNAL_LEVEL.test(mode))
        music.set(
          mode === "playing"
            ? adventure.arena && !adventure.won
              ? "boss"
              : levelFlow && levelFlow.state !== "idle"
                ? "victory"
                : "level1"
            : mode === "paused"
              ? "pause"
              : "off",
          settings,
        );
      if (ambience) ambience.update(settings, false);
    } else if (ambience) ambience.update(settings, mode === "playing");
    const dt = Math.min((ts - last) / 1000 || 0, 0.08);
    last = ts;
    if (sfx && !EXTERNAL_LEVEL.test(mode)) sfx.update(mode === "playing" && extras.power.uht > 0, settings.volume, settings.sound);
    if (mode === "playing") fx.update(dt * (settings.impact ? fx.timeScale : 1));
    if (mode === "playing" && fx.hitstop > 0 && settings.impact) {
      accumulator = 0;
    } else if (mode === "playing") {
      accumulator += dt * (settings.impact ? fx.timeScale : 1);
      while (accumulator >= 1 / 120) {
        update(1 / 120);
        accumulator -= 1 / 120;
        if (mode !== "playing") {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
      if (mode === "home" || mode === "routes") time += dt;
    }
    if (!EXTERNAL_LEVEL.test(mode)) render(mode === "playing" ? accumulator / (1 / 120) : 1);
    if (mode === "playing" || mode === "paused") drawLevelFlow();
    if (ts > toastUntil) $("toast").classList.remove("visible");
    requestAnimationFrame(frame);
  }
  async function boot() {
    try {
      const jobs = [];
      for (let i = 1; i <= 12; i++)
        jobs.push(loadImage(`assets/backgrounds/${String(i).padStart(2, "0")}.webp`).then((im) => (images[i] = im)));
      for (const [kind, frames] of Object.entries(ASSET_META)) {
        spriteImgs[kind] = [];
        frames.forEach((_, i) => jobs.push(loadImage(`assets/sprites/${kind}-${i}.webp`).then((im) => (spriteImgs[kind][i] = im))));
      }
      $("loading").max = jobs.length;
      jobs.push(MilkDesigns.load().catch(() => []));
      await Promise.all(jobs);
      tiles = Array.from({ length: 12 }, (_, i) => normalizeBackground(images[i + 1], i));
      farTiles = Array.from({ length: 12 }, (_, i) => normalizeBackground(images[i + 1], i, 90));
      groundTiles = tiles.map((im) => {
        const c = document.createElement("canvas");
        c.width = TILE;
        c.height = H;
        const g = c.getContext("2d");
        g.drawImage(im, 0, 0);
        g.globalCompositeOperation = "destination-in";
        const fade = g.createLinearGradient(0, FLOOR - 38, 0, FLOOR - 3);
        fade.addColorStop(0, "transparent");
        fade.addColorStop(1, "black");
        g.fillStyle = fade;
        g.fillRect(0, 0, TILE, H);
        return c;
      });
      $("load").classList.add("hidden");
      home();
      requestAnimationFrame(frame);
    } catch (e) {
      $("loadText").textContent = e.message + ". Descomprimí el ZIP completo y volvé a abrir index.html.";
      console.error(e);
    }
  }
  // Read-only instrumentation for reproducible QA. No gameplay cheats in the normal routes.
  window.MilkGame = {
    get state() {
      return {
        mode,
        lab,
        player: { ...player },
        camera: { ...cam },
        zone: currentZone,
        width: world.width,
        version: "12.4.0",
        cinematic: MilkCinema.state,
        transition: { state: levelFlow.state, fade: levelFlow.fade },
        audio: { sound: settings.sound, ambient: settings.ambient, volume: settings.volume, enabled: ambience?.enabled || false },
        assets: tiles.length,
        hp: adventure.hp,
        cracks: adventure.crackStage(),
        intoxicated: adventure.intoxicated,
        checkpoint: { ...adventure.checkpoint },
        enemies: adventure.enemies.map((e) => ({ ...e })),
        arena: adventure.arena,
        zoom: adventure.zoom,
        bullets: adventure.bullets.map((b) => ({ ...b })),
        v4: {
          score: extras.score,
          drops: extras.dropCount,
          caps: extras.capCount,
          temp: extras.temp,
          power: { ...extras.power },
          combo: extras.combo,
          custom: Object.keys(MilkDesigns.list).filter((k) => MilkDesigns.isCustom(k)),
        },
      };
    },
    // Solo para pruebas: se habilita abriendo el juego con ?dev en la dirección.
    dev: /[?&]dev\b/.test(location.search)
      ? {
          warp(x) {
            player.reset(x, FLOOR);
            cam.x = cam.px = Math.max(0, Math.min(world.width - W, x - 350));
            cam.y = cam.py = 0;
          },
          power(k) {
            extras.activate(k, player);
          },
          set(k, v) {
            if (k === "temp") extras.temp = v;
            if (k === "hp") adventure.hp = v;
          },
          extras,
          flow: levelFlow,
        }
      : null,
    start,
    pause,
    resume,
  };
  const levelBridge = (name) => ({
    settings,
    sprites: spriteImgs,
    activate: activateAudio,
    audio: () => audio,
    music: () => music,
    uht: (on) => sfx && sfx.update(on, settings.volume, settings.sound),
    play,
    sound,
    toggleSound,
    saveSettings() {
      save("milk-v3-settings", settings);
      $("effects").checked = settings.effects;
      $("volume").value = settings.volume;
      if ($("ambient")) $("ambient").checked = settings.ambient !== false;
      if ($("weather")) $("weather").checked = settings.weather !== false;
      syncSound();
    },
    enter() {
      activateAudio();
      hideModals();
      clearInput();
      mode = name;
      syncHUD();
      $("toast").classList.remove("visible");
    },
    home,
  });
  MilkLevel2.configure(levelBridge("level2"));
  // V9: el nivel 3 usa el mismo puente (ajustes, sprites de la botella, audio y música).
  MilkLevel3.configure(levelBridge("level3"));
  // V10: el nivel 4 usa el mismo puente.
  MilkLevel4.configure(levelBridge("level4"));
  $("playLevel2").onclick = () => MilkLevel2.start();
  $("routeLevel2").onclick = () => MilkLevel2.start();
  $("continueLevel2").onclick = () => MilkLevel2.start({ resume: true });
  $("playLevel3").onclick = () => MilkLevel3.start();
  $("routeLevel3").onclick = () => MilkLevel3.start();
  $("continueLevel3").onclick = () => MilkLevel3.start({ resume: true });
  // Al terminar el nivel 2 (después de la transición a la ciudad) se puede pasar directo al nivel 3.
  window.addEventListener("milk:play-level3", (e) => MilkLevel3.start({ score: e.detail?.score || 0 }));
  $("playLevel4").onclick = () => MilkLevel4.start();
  $("routeLevel4").onclick = () => MilkLevel4.start();
  $("continueLevel4").onclick = () => MilkLevel4.start({ resume: true });
  // Al terminar el nivel 3 se puede pasar directo al nivel 4.
  window.addEventListener("milk:play-level4", (e) => MilkLevel4.start({ score: e.detail?.score || 0 }));
  MilkLevel5.configure(levelBridge("level5"));
  $("playLevel5").onclick = () => MilkLevel5.start();
  $("routeLevel5").onclick = () => MilkLevel5.start({ skipIntro: true });
  $("continueLevel5").onclick = () => MilkLevel5.start({ resume: true });
  window.addEventListener("milk:play-level5", (e) => MilkLevel5.start(e.detail || {}));
  boot();
})();
