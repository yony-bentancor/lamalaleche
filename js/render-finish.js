/* V9.1 · Acabado compartido. Canvas nativo, sin texturas externas ni dependencias. */
(() => {
  'use strict';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const haze = new Map();
  function contact(g, p, surfaces, floor) {
    if (p.dead) return;
    // Buscar el apoyo inmediatamente debajo, también durante el salto.
    let surface = { x: p.x - 70, y: floor, w: 140 };
    for (const b of surfaces) {
      if (!b.gone && b.y >= p.y - 2 && b.y < surface.y && p.x >= b.x - 18 && p.x <= b.x + b.w + 18) surface = b;
    }
    const gap = Math.max(0, surface.y - p.y), near = Math.exp(-gap / 150);
    const radius = 14 + near * 15;
    g.save();
    g.beginPath(); g.rect(surface.x, surface.y - 2, surface.w, 16); g.clip();
    const gr = g.createRadialGradient(p.x, surface.y + 3, 0, p.x, surface.y + 3, radius);
    gr.addColorStop(0, `rgba(5,9,23,${0.38 * near + 0.05})`); gr.addColorStop(1, 'rgba(5,9,23,0)');
    g.translate(p.x, surface.y + 3); g.scale(1, 0.22); g.translate(-p.x, -surface.y - 3);
    g.fillStyle = gr; g.fillRect(p.x-radius, surface.y+3-radius, radius*2, radius*2);
    g.restore();
  }
  function reflection(g, im, p, h, floor, alpha, filter = 'none') {
    if (p.dead) return;
    const gap = Math.max(0, floor - p.y), opacity = alpha * Math.exp(-gap / 140);
    if (opacity < 0.012) return;
    const w = im.width / im.height * h, base = floor + 5 + gap * 0.32;
    g.save(); g.filter = filter;
    // Bandas suaves: el reflejo se desvanece con la distancia al apoyo.
    for (let n = 0; n < 12; n++) {
      const f = n / 12, sh = im.height / 12;
      g.globalAlpha = opacity * (1-f) * (1-f);
      g.save(); g.translate(p.x, base + f*h*0.32); g.scale(p.face || 1, -1);
      g.drawImage(im, 0, im.height-(n+1)*sh, im.width, sh, -w/2, -h*0.32/12, w, h*0.32/12);
      g.restore();
    }
    g.restore();
  }
  function atmosphere(g, zone, t, camera, city) {
    const color = city ? (zone < 3 ? '102,163,194' : zone < 6 ? '197,105,150' : zone < 9 ? '137,152,207' : '243,186,115') : (zone < 6 ? '125,168,188' : '220,191,145');
    let tile = haze.get(color);
    if (!tile) {
      tile = document.createElement('canvas'); tile.width=512; tile.height=96;
      const c=tile.getContext('2d'), gr=c.createRadialGradient(256,48,0,256,48,256);
      gr.addColorStop(0,`rgba(${color},.065)`); gr.addColorStop(1,`rgba(${color},0)`);
      c.scale(1,0.1875); c.fillStyle=gr; c.fillRect(0,0,512,512); haze.set(color,tile);
    }
    g.save(); g.globalCompositeOperation='screen';
    for (let i=0;i<3;i++) {
      const x=((i*560-camera*.15+t*7)%1680+1680)%1680-350;
      g.drawImage(tile,x,480+Math.sin(t*.3+i)*8,680,100);
    }
    g.restore();
  }
  function edge(g,b,color) {
    if (b.gone) return;
    // Volumen sobre la superficie original, manteniendo la silueta y colisión.
    g.save();
    const cloth = ['awning','redAwning','table'].includes(b.kind);
    const height = cloth ? 14 : b.kind === 'roof' || b.kind === 'girder' ? 20 : 0;
    if (height) {
      const shade = g.createLinearGradient(0,b.y,0,b.y+height);
      shade.addColorStop(0,'rgba(255,243,217,.22)');
      shade.addColorStop(.35,'rgba(255,243,217,.02)');
      shade.addColorStop(1,'rgba(6,9,24,.4)');
      g.fillStyle=shade;g.fillRect(b.x,b.y,b.w,height);
      g.strokeStyle='rgba(12,15,28,.24)';g.lineWidth=.8;
      for(let x=b.x+10;x<b.x+b.w-8;x+=cloth?20:32){
        g.beginPath();g.moveTo(x,b.y+4);g.lineTo(x+(cloth?0:9),b.y+height-3);g.stroke();
      }
    }
    // Un borde de luz ayuda a reconocer exactamente dónde aterrizar.
    g.strokeStyle=color; g.lineWidth=1.5;
    g.beginPath(); g.moveTo(b.x+5,b.y+.75); g.lineTo(b.x+b.w-5,b.y+.75); g.stroke(); g.restore();
  }
  window.MilkRenderFinish = { contact, reflection, atmosphere, edge };
})();
