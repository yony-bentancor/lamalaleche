/* Quiet, generated ambient notes. No downloads or autoplay before user interaction. */
class MilkAudio {
  constructor(context) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0;
    this.master.connect(context.destination);
    this.next = 0;
    this.step = 0;
    this.enabled = false;
    this.target = -1;
  }
  update(settings, playing) {
    const c = this.context,
      t = c.currentTime,
      on = !!(playing && settings.sound && settings.ambient),
      target = on ? (settings.volume / 100) * 0.15 : 0;
    this.enabled = on;
    if (target !== this.target) {
      this.master.gain.setTargetAtTime(target, t, 0.09);
      this.target = target;
    }
    if (!on) {
      this.next = t + 0.6;
      return;
    }
    if (t < this.next) return;
    this.next = t + 3.3;
    const notes = [164.81, 196, 246.94, 196, 146.83, 196, 220, 196],
      frequency = notes[this.step++ % notes.length];
    const osc = c.createOscillator(),
      gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + 2.6);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
window.MilkAudio = MilkAudio;
