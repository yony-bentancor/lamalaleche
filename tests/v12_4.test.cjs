/* V12.4 · Uniones entre fondos del nivel 5: existen las 11 franjas y el juego las carga y dibuja. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
let n = 0;
const test = (name, fn) => {
  fn();
  n++;
  console.log("PASS V12.4 " + name);
};
// Ancho y alto de un WebP (VP8, VP8L o VP8X) leyendo la cabecera.
function webpSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString("ascii", 0, 4), "RIFF");
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}
test("hay una franja por cada una de las 11 uniones, de al menos 400×720", () => {
  for (let i = 1; i <= 11; i++) {
    const f = path.join(root, "assets", "level5", `seam-${String(i).padStart(2, "0")}.webp`);
    assert.ok(fs.existsSync(f), "falta " + f);
    const [w, h] = webpSize(f);
    assert.equal(h, 720);
    assert.ok(w >= 400, "franja angosta: " + w);
  }
});
test("el nivel 5 carga las franjas y las dibuja centradas en cada unión", () => {
  const js = fs.readFileSync(path.join(root, "js", "level5.js"), "utf8");
  assert.match(js, /assets\/level5\/seam-\$\{/);
  assert.match(js, /\(i \+ 1\) \* W - cam\.x - img\.width \/ 2/);
});
console.log(n + " regresiones V12.4 verificadas");
