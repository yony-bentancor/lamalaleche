/* V8: illustrated city epilogue, with animated protagonist; not a playable level. */
(() => {
  "use strict";
  const W = 1280,
    H = 720,
    DURATION = 22,
    clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let bridge,
    active = null,
    city = null,
    loading = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function load() {
    return city
      ? Promise.resolve(city)
      : loading ||
          (loading = new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve((city = im));
            im.onerror = () => {
              loading = null;
              reject(Error("No se pudo cargar la ciudad del nivel 3."));
            };
            im.src = "assets/cinema/ciudad-nivel-3.webp";
          }));
  }
  function caption(t) {
    return t < 2
      ? ""
      : t < 6
        ? "Por primera vez, está libre."
        : t < 10
          ? "Sola. De noche. En una ciudad enorme."
          : t < 14
            ? "Ya no huye de un lugar."
            : t < 18
              ? "Ahora tiene que encontrar adónde ir."
              : "";
  }
  async function play(opts = {}) {
    if (active) return active.promise;
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    const state = { promise, time: 0, paused: false, ended: false };
    active = state;
    const host = document.createElement("section");
    host.className = "city-cinema";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", "Transición al nivel 3: Sin destino");
    host.innerHTML = `<canvas width="1280" height="720" aria-label="La botella camina sola por una ciudad de noche"></canvas><div class="city-controls"><span>LA MALA LECHE / EL CAMINO CONTINÚA</span><div><button data-city="pause">Pausar</button><button data-city="sound">Sonido</button><button data-city="skip">Saltar transición →</button></div></div><p class="city-caption" role="status" aria-live="polite">Preparando la ciudad…</p><div class="city-paused" hidden>EN PAUSA</div>`;
    document.body.append(host);
    const canvas = host.querySelector("canvas"),
      g = canvas.getContext("2d"),
      cap = host.querySelector(".city-caption"),
      pauseBtn = host.querySelector("[data-city=pause]"),
      soundBtn = host.querySelector("[data-city=sound]"),
      skipBtn = host.querySelector("[data-city=skip]");
    let raf = 0,
      last = 0,
      master = null,
      oscillators = [],
      outgoing = null,
      ready = false;
    if (opts.outgoingCanvas) {
      outgoing = document.createElement("canvas");
      outgoing.width = W;
      outgoing.height = H;
      outgoing.getContext("2d").drawImage(opts.outgoingCanvas, 0, 0, W, H);
    }
    function sync() {
      pauseBtn.textContent = state.paused ? "Continuar" : "Pausar";
      pauseBtn.setAttribute("aria-pressed", String(state.paused));
      soundBtn.textContent = bridge.settings.sound ? "Sonido: sí" : "Sonido: no";
      soundBtn.setAttribute("aria-pressed", String(!bridge.settings.sound));
      host.querySelector(".city-paused").hidden = !state.paused;
      if (master) {
        const ctx = bridge.audio();
        master.gain.setTargetAtTime(
          bridge.settings.sound && bridge.settings.ambient !== false && !state.paused ? (bridge.settings.volume / 100) * 0.025 : 0,
          ctx.currentTime,
          0.1,
        );
      }
    }
    function pause() {
      state.paused = !state.paused;
      sync();
    }
    function sound() {
      bridge.toggleSound();
      sync();
    }
    function finish(skipped = false) {
      if (state.ended) return;
      state.ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", keys, true);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      for (const o of oscillators) {
        try {
          o.stop();
          o.disconnect();
        } catch {}
      }
      master?.disconnect();
      host.remove();
      active = null;
      resolve({ skipped, elapsed: state.time });
    }
    function keys(e) {
      if (e.code === "Tab") {
        const buttons = [pauseBtn, soundBtn, skipBtn];
        if (e.shiftKey && document.activeElement === buttons[0]) {
          e.preventDefault();
          buttons.at(-1).focus();
        } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
          e.preventDefault();
          buttons[0].focus();
        }
        return;
      }
      if (["Escape", "KeyP", "KeyM"].includes(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        if (e.code === "KeyM") sound();
        else pause();
      }
    }
    function blur() {
      state.paused = true;
      sync();
    }
    function visibility() {
      if (document.hidden) blur();
    }
    pauseBtn.onclick = pause;
    soundBtn.onclick = sound;
    skipBtn.onclick = () => finish(true);
    window.addEventListener("keydown", keys, true);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    skipBtn.focus();
    sync();
    try {
      await load();
    } catch (e) {
      cap.textContent = e.message + " Podés saltar la transición para continuar.";
      return promise;
    }
    if (state.ended) return promise;
    ready = true;
    bridge.activate();
    try {
      const ctx = bridge.audio();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      for (const f of [110, 164.81]) {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(master);
        o.start();
        oscillators.push(o);
      }
      sync();
    } catch {}
    function draw() {
      const t = state.time,
        walk = t < 9 || (t >= 14 && t < 18);
      g.fillStyle = "#030b17";
      g.fillRect(0, 0, W, H);
      if (t < 1.4 && outgoing) {
        g.drawImage(outgoing, 0, 0);
        g.fillStyle = `rgba(3,9,18,${t / 1.4})`;
        g.fillRect(0, 0, W, H);
        return;
      }
      const enter = clamp((t - 1.4) / 1.0, 0, 1);
      g.save();
      g.globalAlpha = enter;
      const z = reduced ? 1 : 1.13 - 0.13 * clamp((t - 2) / 9, 0, 1);
      g.translate(W / 2, 524);
      g.scale(z, z);
      g.translate(-W / 2, -524);
      g.drawImage(city, 0, 0, W, H);
      const x = 245 + clamp(t - 2, 0, 7) * 40 + clamp(t - 14, 0, 4) * 31,
        y = 524;
      let face = t >= 10 && t < 12 ? -1 : 1;
      const list = bridge.sprites.walk,
        im = list[walk ? Math.floor(t * 8) % list.length : 0];
      if (im) {
        const h = 112,
          w = (im.width / im.height) * h;
        g.save();
        g.translate(x, y);
        g.scale(face, 1);
        g.fillStyle = "#07152888";
        g.beginPath();
        g.ellipse(0, 3, 27, 5, 0, 0, 7);
        g.fill();
        g.drawImage(im, -w / 2, -h, w, h);
        g.save();
        g.translate(0, 6);
        g.scale(1, -0.25);
        g.globalAlpha = enter * 0.15;
        g.drawImage(im, -w / 2, -h, w, h);
        g.restore();
        g.restore();
      }
      g.restore();
      if (!reduced && bridge.settings.effects) {
        for (let i = 0; i < 15; i++) {
          const px = (i * 101 + t * 9) % W,
            py = 555 + (i % 4) * 9;
          g.fillStyle = "#8ba3c808";
          g.beginPath();
          g.ellipse(px, py, 65, 10, 0, 0, 7);
          g.fill();
        }
      }
      const shade = g.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, "#02091660");
      shade.addColorStop(0.6, "transparent");
      shade.addColorStop(1, "#020815bb");
      g.fillStyle = shade;
      g.fillRect(0, 0, W, H);
      if (t >= 18) {
        const a = clamp((t - 18) / 1.0, 0, 1);
        g.fillStyle = `rgba(3,10,21,${a * 0.56})`;
        g.fillRect(0, 0, W, H);
        g.globalAlpha = a;
        g.textAlign = "center";
        g.fillStyle = "#abbed5";
        g.font = "700 14px Arial";
        g.fillText("N I V E L   3", W / 2, 265);
        g.fillStyle = "#f0e4cf";
        g.font = "800 66px Arial";
        g.fillText("SIN DESTINO", W / 2, 343);
        g.font = "19px Arial";
        g.fillStyle = "#c3d2df";
        g.fillText("Libre. Ahora tiene que encontrar adónde ir.", W / 2, 386);
        g.globalAlpha = 1;
      }
      g.fillStyle = "#afc9dd70";
      g.fillRect(0, H - 3, (W * t) / DURATION, 3);
    }
    function frame(ts) {
      if (state.ended) return;
      const dt = Math.min(0.1, (ts - last) / 1000 || 0);
      last = ts;
      if (!state.paused && ready) state.time += dt;
      const text = caption(state.time);
      if (cap.textContent !== text) cap.textContent = text;
      cap.hidden = !text;
      draw();
      if (state.time >= DURATION) {
        finish(false);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    last = performance.now();
    raf = requestAnimationFrame(frame);
    return promise;
  }
  window.MilkCityCinema = {
    configure(b) {
      bridge = b;
    },
    play,
    load,
    duration: DURATION,
    get state() {
      return active ? { elapsed: active.time, paused: active.paused } : null;
    },
  };
})();
