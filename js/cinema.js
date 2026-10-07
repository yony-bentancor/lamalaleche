/* Illustrated cutscene: uses the supplied six-panel artwork, unmodified.
   World simulation is paused by game.js. No external libraries or services. */
(function (root) {
  "use strict";
  const lengths = [2.6, 2, 2.4, 3, 2.6, 3, 2.6];
  const captions = [
    "La salida parecía estar cerca.",
    "Pero alguien más tenía otros planes.",
    "Una botella más. Un destino impuesto.",
    "El viaje no fue una elección.",
    "SUPERMERCADO EL MOLDE",
    "Una oportunidad. Antes de que sea demasiado tarde.",
    "",
  ];
  const rects = [
    [6, 5, 756, 338],
    [775, 5, 754, 338],
    [6, 357, 756, 309],
    [775, 357, 754, 309],
    [6, 679, 756, 337],
    [775, 679, 754, 337],
  ];
  const total = lengths.reduce((a, b) => a + b, 0);
  let active = null,
    loaded = null;
  const load = () =>
    loaded ||
    (loaded = new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => {
        loaded = null;
        reject(Error("No se pudo cargar la historia del viaje."));
      };
      i.src = "assets/cinema/entrada-nivel-2.webp";
    }));
  function locate(elapsed) {
    let start = 0;
    for (let i = 0; i < lengths.length; i++) {
      if (elapsed < start + lengths[i]) return { index: i, local: elapsed - start, duration: lengths[i] };
      start += lengths[i];
    }
    return { index: 6, local: lengths[6], duration: lengths[6] };
  }
  function play(opts = {}) {
    if (active) return active.promise;
    let resolveDone;
    const promise = new Promise((r) => (resolveDone = r));
    const prevFocus = document.activeElement;
    const host = document.createElement("section");
    host.className = "milk-cinema";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", "Historia: Fecha de vencimiento");
    host.innerHTML =
      '<canvas aria-label="Secuencia ilustrada del viaje al supermercado"></canvas><div class="cinema-controls"><span>LA MALA LECHE · EL VIAJE</span><div><button data-pause>Pausar</button><button data-sound>Sonido</button><button data-skip>Saltar historia →</button></div></div><p class="cinema-caption" aria-live="polite"></p><div class="cinema-paused" hidden>EN PAUSA</div>';
    document.body.append(host);
    const canvas = host.querySelector("canvas"),
      g = canvas.getContext("2d"),
      caption = host.querySelector(".cinema-caption"),
      pauseBtn = host.querySelector("[data-pause]"),
      soundBtn = host.querySelector("[data-sound]");
    let elapsed = 0,
      paused = false,
      last = 0,
      raf = 0,
      finished = false,
      im = null,
      scene = -1,
      soundGraph = null,
      localMute = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function fit() {
      const d = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(1280 * d);
      canvas.height = Math.round(720 * d);
      g.setTransform(d, 0, 0, d, 0, 0);
    }
    fit();
    function enabled() {
      return !localMute && (!opts.soundEnabled || opts.soundEnabled()) && (opts.volume?.() ?? 25) > 0;
    }
    function audioStart() {
      if (soundGraph) return;
      try {
        const c = opts.audioContext?.();
        if (!c) return;
        const master = c.createGain();
        master.gain.value = 0;
        master.connect(c.destination);
        const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
          data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;
        const src = c.createBufferSource(),
          filter = c.createBiquadFilter();
        src.buffer = noise;
        src.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = 440;
        src.connect(filter);
        filter.connect(master);
        src.start();
        soundGraph = { c, master, src, filter, nodes: new Set() };
      } catch {}
    }
    function cue(i) {
      if (!soundGraph || !enabled()) return;
      const { c, master, nodes } = soundGraph,
        o = c.createOscillator(),
        v = c.createGain(),
        t = c.currentTime;
      o.type = "sine";
      o.frequency.setValueAtTime([100, 72, 58, 95, 150, 220, 260][i], t);
      o.frequency.exponentialRampToValueAtTime(i === 5 ? 70 : 40, t + 0.3);
      v.gain.setValueAtTime(0.7, t);
      v.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(v);
      v.connect(master);
      nodes.add(o);
      o.onended = () => {
        o.disconnect();
        v.disconnect();
        nodes.delete(o);
      };
      o.start();
      o.stop(t + 0.48);
    }
    function togglePause(force) {
      paused = typeof force === "boolean" ? force : !paused;
      last = 0;
      pauseBtn.textContent = paused ? "Continuar" : "Pausar";
      host.querySelector(".cinema-paused").hidden = !paused;
    }
    function finish(skipped = false) {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      removeEventListener("resize", fit);
      removeEventListener("keydown", key, true);
      removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      if (soundGraph) {
        const { src, filter, master, nodes } = soundGraph;
        src.stop();
        src.disconnect();
        filter.disconnect();
        master.disconnect();
        for (const n of nodes) {
          try {
            n.stop();
          } catch {}
        }
      }
      host.remove();
      active = null;
      if (prevFocus?.isConnected) prevFocus.focus();
      resolveDone({ skipped });
    }
    function key(e) {
      if (["Escape", "KeyP", "KeyM"].includes(e.code)) {
        e.stopImmediatePropagation();
      }
      if (e.code === "KeyM" && !e.repeat) {
        if (opts.toggleSound) opts.toggleSound();
        else localMute = !localMute;
      }
      if (["Escape", "KeyP"].includes(e.code)) {
        e.preventDefault();
        if (!e.repeat) togglePause();
      }
      if (e.code === "Enter" && e.target === canvas) {
        e.preventDefault();
        finish(true);
      }
      if (e.code === "Tab") {
        const bs = [...host.querySelectorAll("button")],
          idx = bs.indexOf(document.activeElement);
        if (e.shiftKey && idx <= 0) {
          e.preventDefault();
          bs.at(-1).focus();
        } else if (!e.shiftKey && idx === bs.length - 1) {
          e.preventDefault();
          bs[0].focus();
        }
      }
    }
    const blur = () => togglePause(true),
      visibility = () => {
        if (document.hidden) togglePause(true);
      };
    pauseBtn.onclick = () => togglePause();
    host.querySelector("[data-skip]").onclick = () => finish(true);
    soundBtn.onclick = () => {
      if (opts.toggleSound) opts.toggleSound();
      else localMute = !localMute;
    };
    addEventListener("keydown", key, true);
    addEventListener("resize", fit);
    addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    pauseBtn.focus();
    function draw(info) {
      const i = Math.min(info.index, 5),
        r = rects[i],
        k = Math.min(1, info.local / info.duration),
        ease = k * k * (3 - 2 * k);
      g.fillStyle = "#030910";
      g.fillRect(0, 0, 1280, 720);
      if (im) {
        const sx = im.width / 1536,
          sy = im.height / 1024,
          base = 1280 / r[2],
          w = 1280,
          h = r[3] * base,
          y = (720 - h) / 2;
        g.save();
        g.beginPath();
        g.rect(0, y, w, h);
        g.clip();
        const z = reduced ? 1 : 1.015 + ease * 0.035;
        g.translate(640, 360);
        g.scale(z, z);
        g.translate(-640, -360);
        g.drawImage(im, r[0] * sx, r[1] * sy, r[2] * sx, r[3] * sy, -(reduced ? 0 : (ease - 0.5) * 12), y, w, h);
        if (!reduced && [0, 3, 4, 5].includes(i)) {
          g.strokeStyle = "#b9dcf740";
          g.lineWidth = 1;
          g.beginPath();
          for (let n = 0; n < 54; n++) {
            const x = ((n * 197 + elapsed * 65) % 1380) - 50,
              yy = y + ((n * 67 + elapsed * 300) % h);
            g.moveTo(x, yy);
            g.lineTo(x - 8, yy + 24);
          }
          g.stroke();
          if (i === 3 || i === 4) {
            g.globalAlpha = 0.08 + 0.04 * Math.sin(elapsed * 3);
            g.fillStyle = "#ffb04b";
            g.fillRect(0, y, w, h);
            g.globalAlpha = 1;
          }
        }
        g.restore();
        const fade = Math.max(0, 1 - info.local / 0.22);
        if (fade) {
          g.fillStyle = `rgba(3,9,16,${fade})`;
          g.fillRect(0, 0, 1280, 720);
        }
        if (info.index === 6) {
          g.fillStyle = "#030b16b8";
          g.fillRect(0, 0, 1280, 720);
          g.textAlign = "center";
          g.fillStyle = "#f8ca6b";
          g.font = "bold 17px Arial";
          g.fillText("PANTALLA 2", 640, 287);
          g.font = "900 62px Arial";
          g.fillStyle = "#fff2d8";
          g.fillText("FECHA DE VENCIMIENTO", 640, 370);
          g.font = "21px Arial";
          g.fillStyle = "#bccbd7";
          g.fillText("Escapá de El Molde antes de que sea tarde.", 640, 421);
        }
      }
      g.fillStyle = "#243747";
      g.fillRect(44, 700, 1192, 3);
      g.fillStyle = "#e2b261";
      g.fillRect(44, 700, 1192 * Math.min(1, elapsed / total), 3);
    }
    function frame(ts) {
      if (finished) return;
      const dt = last ? Math.min(0.08, (ts - last) / 1000) : 0;
      last = ts;
      if (!paused && im) elapsed += dt;
      const info = locate(elapsed);
      if (info.index !== scene) {
        scene = info.index;
        caption.textContent = captions[scene];
        cue(scene);
      }
      if (soundGraph)
        soundGraph.master.gain.setTargetAtTime(
          enabled() && !paused ? ((opts.volume?.() ?? 25) / 100) * 0.1 : 0,
          soundGraph.c.currentTime,
          0.06,
        );
      soundBtn.textContent = enabled() ? "Sonido: sí" : "Sonido: no";
      soundBtn.setAttribute("aria-pressed", String(enabled()));
      draw(info);
      if (elapsed >= total) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    active = {
      promise,
      get state() {
        return { elapsed, paused, scene };
      },
      skip: () => finish(true),
    };
    load()
      .then((image) => {
        if (finished) return;
        im = image;
        audioStart();
        raf = requestAnimationFrame(frame);
      })
      .catch((e) => {
        if (!finished) {
          finish(true);
          opts.onError?.(e);
        }
      });
    return promise;
  }
  root.MilkCinema = {
    play,
    load,
    get state() {
      return active?.state || null;
    },
    get duration() {
      return total;
    },
    locate,
  };
})(window);
