(function (root) {
  "use strict";
  function terrain(g, a, cx, cy, t) {
    g.save();
    for (const pit of a.pits) {
      const x = pit.x - cx,
        y = 520 - cy;
      if (x > 1300 || x + pit.w < 0) continue;
      g.fillStyle = "#061822";
      g.fillRect(x, y - 2, pit.w, 740 - y);
      const depth = g.createLinearGradient(0, y + 55, 0, y + 200);
      depth.addColorStop(0, "#577624");
      depth.addColorStop(0.25, "#244926");
      depth.addColorStop(1, "#102d27");
      g.fillStyle = depth;
      g.fillRect(x + 7, y + 60, pit.w - 14, 200);
      g.fillStyle = "#21382f";
      g.fillRect(x, y, 8, 210);
      g.fillRect(x + pit.w - 8, y, 8, 210);
      g.strokeStyle = "#b9ed62";
      g.lineWidth = 3;
      g.beginPath();
      for (let k = 8; k < pit.w - 8; k += 3) {
        const yy = y + 60 + Math.sin(k * 0.075 + t * 3) * 3;
        k === 8 ? g.moveTo(x + k, yy) : g.lineTo(x + k, yy);
      }
      g.stroke();
      g.strokeStyle = "#a9d25888";
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const xx = x + 18 + ((k * 39) % Math.max(20, pit.w - 35)),
          yy = y + 80 + ((k * 31 - t * 24) % 85);
        g.beginPath();
        g.arc(xx, yy, 2 + (k % 3), 0, 7);
        g.stroke();
      }
      for (const xx of [x - 12, x + pit.w + 12]) {
        g.fillStyle = "#cdbb53";
        g.fillRect(xx - 3, y - 26, 6, 26);
        g.fillStyle = "#1b272c";
        g.fillRect(xx - 2, y - 23, 4, 7);
      }
    }
    for (const p of a.platforms) {
      const x = p.x - cx,
        y = p.y - cy,
        h = 520 - p.y;
      if (x > 1320 || x + p.w < -30) continue;
      const wood = p.theme === "wood" || p.theme === "forest",
        cold = p.theme === "ice" || p.theme === "forest";
      g.fillStyle = "#00182635";
      g.beginPath();
      g.ellipse(x + p.w / 2, 520 - cy + 4, p.w * 0.52, 7, 0, 0, 7);
      g.fill();
      const grad = g.createLinearGradient(0, y, 0, y + 26);
      grad.addColorStop(0, wood ? (cold ? "#62735b" : "#bd9560") : cold ? "#91c4d3" : "#b1cad6");
      grad.addColorStop(0.35, wood ? (cold ? "#3d5348" : "#89623c") : cold ? "#487583" : "#557487");
      grad.addColorStop(1, wood ? "#352e29" : "#243e55");
      g.fillStyle = grad;
      g.fillRect(x, y, p.w, 25);
      g.strokeStyle = "#182b35";
      g.lineWidth = 2;
      g.strokeRect(x, y, p.w, 25);
      g.fillStyle = wood ? "#d2b17a" : "#d6edf0";
      g.fillRect(x + 2, y + 1, p.w - 4, 3);
      for (let k = 15; k < p.w - 5; k += 32) {
        if (wood) {
          g.strokeStyle = "#46352699";
          g.beginPath();
          g.moveTo(x + k, y + 6);
          g.lineTo(x + k + 16, y + 8);
          g.moveTo(x + k - 4, y + 16);
          g.lineTo(x + k + 10, y + 18);
          g.stroke();
        } else {
          g.fillStyle = "#152e43";
          g.beginPath();
          g.arc(x + k, y + 15, 2, 0, 7);
          g.fill();
          g.fillStyle = "#e8c35a";
          g.fillRect(x + k - 7, y + 7, 12, 3);
        }
      }
      if (p.theme === "forest") {
        g.strokeStyle = "#768958";
        g.lineWidth = 3;
        for (let k = 7; k < p.w; k += 14) {
          g.beginPath();
          g.moveTo(x + k, y);
          g.lineTo(x + k + Math.sin(t * 1.5 + k) * 3, y - 5 - (k % 4));
          g.stroke();
        }
      }
      if (p.theme === "ice") {
        g.fillStyle = "#b8e5eacc";
        for (let k = 10; k < p.w - 10; k += 38) {
          g.beginPath();
          g.moveTo(x + k, y + 24);
          g.lineTo(x + k + 6, y + 40 + (k % 13));
          g.lineTo(x + k + 11, y + 24);
          g.fill();
        }
      }
    }
    for (const o of a.obstacles) {
      const x = o.x - cx,
        y = o.y - cy;
      g.fillStyle = "#18384a";
      g.fillRect(x, y, o.w, o.h);
      g.fillStyle = "#74919d";
      g.fillRect(x, y, o.w, 5);
      g.strokeStyle = "#0b2231";
      g.lineWidth = 3;
      g.strokeRect(x, y, o.w, o.h);
      g.fillStyle = "#d6bd62";
      for (let k = 4; k < o.w - 4; k += 15) {
        g.fillRect(x + k, y + 9, 8, 5);
        g.fillRect(x + k, y + o.h - 12, 8, 5);
      }
      g.fillStyle = "#e2e8dd";
      g.font = "bold 10px Arial";
      g.fillText("↑ SALTÁ", x + 5, y - 12);
    }
    for (const f of a.flags) {
      const x = f.x - cx,
        y = 520 - cy;
      if (x < -80 || x > 1360) continue;
      g.fillStyle = "#122d3c";
      g.fillRect(x - 10, y - 4, 22, 7);
      g.fillStyle = "#bacbd2";
      g.fillRect(x - 2, y - 130, 4, 130);
      g.fillStyle = f.active ? "#97e8b8" : "#ead8aa";
      g.beginPath();
      g.arc(x, y - 131, 5, 0, 7);
      g.fill();
      const flap = Math.sin(t * 4 + f.index) * 6;
      g.fillStyle = f.active ? "#59c69b" : "#cf9251";
      g.beginPath();
      g.moveTo(x + 2, y - 125);
      g.bezierCurveTo(x + 18, y - 131 + flap, x + 32, y - 118 - flap, x + 48, y - 124 + flap);
      g.lineTo(x + 44, y - 93 + flap);
      g.bezierCurveTo(x + 29, y - 87 - flap, x + 15, y - 99 + flap, x + 2, y - 92);
      g.closePath();
      g.fill();
      g.fillStyle = "#092b37";
      g.font = "bold 16px Arial";
      g.fillText(String(f.index + 1), x + 18, y - 103 + flap * 0.3);
      g.font = "bold 9px Arial";
      g.fillStyle = "#e6eee2";
      g.fillText(f.active ? "GUARDADO" : "CHECKPOINT", x - 30, y - 145);
    }
    if (a.arena) {
      g.fillStyle = "#83deed55";
      g.fillRect(14150 - 1090 - cx, 170 - cy, 5, 350);
      g.strokeStyle = "#94edff66";
      g.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(13670 - cx, 520 - cy, 290 + i * 40, 12 + i * 5, 0, 0, 7);
        g.stroke();
      }
    }
    g.restore();
  }
  function boss(g,e,s,cx,cy,t){
    const x=e.x-cx,y=e.y-cy;
    if(e.hp<=0&&e.death>1.2)return;
    let kind='bossWalk',index=e.state==='patrol'?Math.floor(e.phase)%8:0;
    if(e.bossPhase==='charge'){kind='bossCharge';index=Math.min(2,Math.floor(e.bossClock/.95*3));}
    if(e.bossPhase==='beam'){kind='bossCast';index=0;}
    const im=s[kind][index],scale=284/im.height;
    g.save();g.translate(x,y);g.scale(e.face,1);
    if(e.hp<=0){g.globalAlpha=Math.max(0,1-e.death/1.2);g.rotate(-e.death*.7);}
    const anchor=kind==='bossCast'?360:im.width/2;
    g.drawImage(im,-anchor*scale,-284,im.width*scale,284);g.restore();
    const r=e.ray;
    if(r&&(e.bossPhase==='charge'||e.bossPhase==='beam')){
      const dx=r.ex-r.x,dy=r.ey-r.y,len=Math.hypot(dx,dy);
      g.save();g.translate(r.x-cx,r.y-cy);g.rotate(Math.atan2(dy,dx));
      if(e.bossPhase==='charge'){
       g.strokeStyle='#ffbe82aa';g.lineWidth=2;g.setLineDash([10,12]);g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();g.setLineDash([]);
       g.fillStyle='#ffce96';g.beginPath();g.arc(0,0,6+e.bossClock*13,0,Math.PI*2);g.fill();
      }else{
       // Bright inner core is the damaging band; outer red halo is decorative.
       g.globalAlpha=.88;g.drawImage(s.bossRay[0],0,-32,len,64);g.globalAlpha=1;
       g.strokeStyle='#fff7dc';g.lineWidth=16;g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();
      }g.restore();
    }
    if(e.hp>0){g.fillStyle='#071522';g.fillRect(x-64,y-312,128,9);g.fillStyle='#f46b69';g.fillRect(x-62,y-310,124*e.hp/100,5);g.textAlign='center';g.font='bold 12px Arial';g.fillStyle='#fff2d4';g.fillText('GUARDIÁN · '+e.hp+'%',x,y-323);if(e.bossPhase==='charge')g.fillText('¡RAYO! · CAMBIÁ DE ALTURA',x,y-341);g.textAlign='left';}
  }
  function actors(g, a, sprites, cx, cy, t) {
    g.save();
    for (const e of a.enemies) {
      if(e.final){boss(g,e,sprites,cx,cy,t);continue;}
      if (e.x - cx < -150 || e.x - cx > 1450 || (e.hp <= 0 && e.death > 1.1)) continue;
      let im, scale;
      if (e.type === "blocker") {
        im =
          e.hp <= 0
            ? sprites.blockDeath[Math.min(9, Math.floor(e.death * 10))]
            : e.state === "block"
              ? sprites.blockPose[6]
              : sprites.blockWalk[Math.floor(e.phase) % 8];
        scale = 112 / (e.hp <= 0 ? 390 : im.height);
      } else if (e.hp <= 0) {
        im = sprites.enemyDeath[Math.min(7, Math.floor(e.death * 8))];
        scale = 0.28;
      } else if (e.fire > 0) {
        im = sprites.enemyShoot[e.fire > 0.25 ? 1 : e.fire > 0.12 ? 3 : 4];
        scale = 145 / 520;
      } else {
        im = sprites.enemyWalk[e.state === "patrol" ? Math.floor(e.phase) % 8 : 0];
        scale = 145 / 590;
      }
      const x = e.x - cx,
        y = e.y - cy;
      g.fillStyle = "#06232d55";
      g.beginPath();
      g.ellipse(x, y + 2, 30, 5, 0, 0, 7);
      g.fill();
      g.save();
      g.translate(x, y);
      g.scale(e.face, 1);
      if (e.hp <= 0) g.globalAlpha = Math.min(1, (1.15 - e.death) * 3);
      g.drawImage(
        im,
        (-im.width * scale) / 2,
        -(e.hp <= 0 && e.type !== "blocker" ? 655 * scale : im.height * scale),
        im.width * scale,
        im.height * scale,
      );
      g.restore();
      if (e.hp > 0) {
        g.fillStyle = "#061725dd";
        g.fillRect(x - 35, y - 167, 70, 6);
        g.fillStyle = e.state === "attack" ? "#ee745e" : "#dbb46c";
        g.fillRect(x - 35, y - 167, (70 * e.hp) / 100, 6);
        g.font = "bold 10px Arial";
        g.fillStyle = "#fff1dc";
        g.textAlign = "center";
        g.fillText(e.hp + "%", x, y - 174);
        if (e.state === "attack") {
          g.fillStyle = "#ffc371";
          g.font = "bold 17px Arial";
          g.fillText("!", x, y - 197);
        }
        g.textAlign = "left";
      }
    }
    for (const b of a.bullets) {
      const x = b.x - cx,
        y = b.y - cy;
      if (b.owner === "milk") {
        g.save();
        g.translate(x, y);
        g.scale(b.vx < 0 ? -1 : 1, 1);
        g.drawImage(b.toxic ? sprites.toxicBall[0] : b.cacao ? sprites.chocoBall[0] : sprites.milkBall[0], -46, -14, 56, 28);
        g.restore();
        continue;
      }
      g.strokeStyle = b.owner === "milk" ? "#fff9e28a" : "#ff674aaa";
      g.lineWidth = b.owner === "milk" ? 5 : 3;
      g.beginPath();
      g.moveTo(x - b.vx * 0.025, y - b.vy * 0.025);
      g.lineTo(x, y);
      g.stroke();
      g.fillStyle = b.owner === "milk" ? "#fff9e8" : "#ff825e";
      g.beginPath();
      g.arc(x, y, b.r, 0, 7);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(x - 2, y - 2, b.r * 0.32, 0, 7);
      g.fill();
    }
    for (const p of a.sparks) {
      g.globalAlpha = Math.min(1, p.life * 3);
      g.fillStyle = p.color;
      g.beginPath();
      g.arc(p.x - cx, p.y - cy, 3, 0, 7);
      g.fill();
    }
    g.restore();
  }
  function leaves(g, cx, cy, t) {
    if (cx < 6100 || cx > 11700) return;
    g.save();
    const wind = 70 + Math.sin(t * 0.43) * 28;
    for (let i = 0; i < 34; i++) {
      const depth = i % 3,
        ratio = 0.4 + depth * 0.35;
      const x = ((((i * 147.8 + t * wind * (0.3 + depth * 0.15) - cx * ratio) % 1470) + 1470) % 1470) - 90,
        y = 65 + ((i * 53) % 490) + Math.sin(t * 1.7 + i * 2) * 25 - cy * 0.4;
      g.save();
      g.translate(x, y);
      g.rotate(t * (0.5 + (i % 3)) + i);
      g.scale(1, Math.max(0.2, Math.abs(Math.sin(t * 2 + i))));
      g.fillStyle = ["#75906e", "#ba9058", "#567f76"][i % 3];
      g.beginPath();
      g.ellipse(0, 0, 5 + depth * 2, 2.5 + depth, 0, 0, 7);
      g.fill();
      g.strokeStyle = "#253e3580";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(-7, 0);
      g.lineTo(7, 0);
      g.stroke();
      g.restore();
    }
    g.strokeStyle = "#cee7dc19";
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const x = ((((t * 145 + i * 380 - cx * 0.2) % 1600) + 1600) % 1600) - 200,
        y = 150 + i * 100 + Math.sin(t + i) * 30;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + 70, y - 16, x + 150, y + 5);
      g.stroke();
    }
    g.restore();
  }
  function environment(g, a, cx, cy, t) {
    g.save();
    // Milk drops follow pipes in the factory, with small floor splashes.
    for (const origin of [620, 1740, 2780, 3620]) {
      const x = origin - cx;
      if (x < -100 || x > 1380) continue;
      for (let k = 0; k < 4; k++) {
        const phase = (t * 0.8 + k * 0.53) % 2,
          fall = Math.min(1, phase / 1.1),
          y = 175 + 340 * fall * fall - cy;
        if (phase < 1.1) {
          g.fillStyle = "#fff7dfcc";
          g.beginPath();
          g.ellipse(x + Math.sin(k) * 4, y, 2.5, 5 + fall * 3, 0, 0, 7);
          g.fill();
        } else if (phase < 1.35) {
          g.strokeStyle = "#fff6d68a";
          g.lineWidth = 1.5;
          g.beginPath();
          g.ellipse(x, 518 - cy, 4 + (phase - 1.1) * 38, 1 + (phase - 1.1) * 9, 0, 0, 7);
          g.stroke();
        }
      }
    }
    // Floor nozzles emit periodic low-pressure vapour; these are decorative.
    for (const origin of a.vents) {
      const x = origin - cx;
      if (x < -180 || x > 1460) continue;
      g.fillStyle = "#244756";
      g.fillRect(x - 12, 509 - cy, 25, 11);
      g.fillStyle = "#7ca8b8";
      g.fillRect(x - 9, 505 - cy, 19, 5);
      const cycle = (t + origin * 0.011) % 6.5,
        strength = Math.max(0, Math.sin(Math.min(1, cycle / 2.5) * Math.PI));
      if (cycle > 2.5) continue;
      for (let k = 0; k < 15; k++) {
        const phase = (t * 0.8 + k * 0.077) % 1,
          y = 500 - cy - phase * 180,
          xx = x + Math.sin(phase * 6 + k) * phase * 24;
        const radius = 8 + phase * 28;
        const fog = g.createRadialGradient(xx, y, 0, xx, y, radius);
        fog.addColorStop(0, "rgba(174,222,231," + strength * (1 - phase) * 0.18 + ")");
        fog.addColorStop(1, "rgba(174,222,231,0)");
        g.fillStyle = fog;
        g.fillRect(xx - radius, y - radius, radius * 2, radius * 2);
      }
    }
    for (const origin of [700, 2020, 12770, 13530]) {
      const x = origin - cx,
        y = 225 - cy;
      if (x < -80 || x > 1360) continue;
      g.save();
      g.translate(x, y);
      g.fillStyle = "#153545aa";
      g.strokeStyle = "#7698a88a";
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 0, 25, 0, 7);
      g.fill();
      g.stroke();
      g.rotate(t * 0.7);
      for (let k = 0; k < 4; k++) {
        g.rotate(Math.PI / 2);
        g.fillStyle = "#85b0be55";
        g.beginPath();
        g.moveTo(2, 2);
        g.quadraticCurveTo(24, -6, 18, -16);
        g.quadraticCurveTo(7, -19, 2, 2);
        g.fill();
      }
      g.fillStyle = "#20394c";
      g.beginPath();
      g.arc(0, 0, 5, 0, 7);
      g.fill();
      g.restore();
    }
    g.restore();
  }
  function waterSurface(g, a, cx, cy, t) {
    g.save();
    for (const pit of a.pits) {
      const x = pit.x - cx,
        y = 580 - cy;
      if (x > 1280 || x + pit.w < 0) continue;
      g.fillStyle = "#84b33533";
      g.fillRect(x + 8, y, pit.w - 16, 140);
      g.strokeStyle = "#c2f17866";
      g.lineWidth = 2;
      g.beginPath();
      for (let k = 8; k < pit.w - 8; k += 3) {
        const yy = y + Math.sin(k * 0.075 + t * 3) * 3;
        k === 8 ? g.moveTo(x + k, yy) : g.lineTo(x + k, yy);
      }
      g.stroke();
    }
    g.restore();
  }
  root.MilkScenery = { terrain, actors, leaves, environment, waterSurface };
})(window);
