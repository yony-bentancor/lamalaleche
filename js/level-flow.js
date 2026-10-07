/* Level 1 celebration and handoff into the story and Level 2. */
(function (root) {
  class LevelFlow {
    constructor() {
      this.reset();
    }
    reset() {
      this.state = "idle";
      this.time = 0;
      this.firework = 0;
      this.fade = 0;
    }
    begin() {
      if (this.state !== "idle") return;
      this.state = "celebrate";
      this.time = 0;
      this.firework = 0;
    }
    step(dt, p, width) {
      if (this.state === "idle" || this.state === "done") return [];
      this.time += dt;
      this.firework -= dt;
      const events = [];
      if (this.state === "celebrate" || this.state === "walk") {
        if (this.firework <= 0) {
          events.push("firework");
          this.firework = 0.55;
        }
        if (this.state === "celebrate" && this.time >= 2.8) {
          this.state = "walk";
          this.time = 0;
        }
        if (this.state === "walk" && p.x >= width - 65) {
          this.state = "fade";
          this.time = 0;
        }
      } else if (this.state === "fade") {
        this.fade = Math.min(1, this.time / 1.2);
        if (this.fade >= 1) {
          this.state = "done";
          events.push("nextlevel");
        }
      }
      return events;
    }
  }
  root.MilkLevelFlow = LevelFlow;
  if (typeof module !== "undefined") module.exports = LevelFlow;
})(typeof window !== "undefined" ? window : globalThis);
