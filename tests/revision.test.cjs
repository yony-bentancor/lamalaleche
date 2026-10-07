const assert=require('node:assert/strict');
const {Level3,FLOOR}=require('../js/level3-core.js');
const {Level2}=require('../js/level2-core.js');
let passed=0;function test(name,fn){fn();console.log('✓ V9.1 '+name);passed++}
const dt=1/120;
test('El gato recibe el pisotón antes del contacto lateral',()=>{
 const m=new Level3(),p=m.player,ch=m.chases[0];ch.active=true;
 Object.assign(m.cat,{active:true,state:'run',x:2700,y:FLOOR,t:0,slow:0,chase:ch});
 Object.assign(p,{x:2702,y:FLOOR-61,py:FLOOR-65,vy:200,grounded:false});
 m.stepCat(dt,p);assert.equal(m.hp,100);assert(p.vy<0);assert(m.events.some(e=>e.type==='stomp'));assert(!p.grounded);
});
test('El contacto lateral del gato sigue causando 10 puntos',()=>{
 const m=new Level3(),p=m.player,ch=m.chases[0];ch.active=true;
 Object.assign(m.cat,{active:true,state:'run',x:2700,y:FLOOR,t:0,slow:0,chase:ch});p.reset(2702,FLOOR);
 m.stepCat(dt,p);assert.equal(m.hp,90);
});
test('Las monedas pendientes de cajas rotas sobreviven al checkpoint V9',()=>{
 const m=new Level3(),box=m.platforms.find(b=>b.breakable);box.gone=true;
 const restored=new Level3(m.snapshot());const loot=restored.items.find(i=>i.id==='box'+box.id);
 assert(loot&&!loot.taken);restored.collect(loot);
 const again=new Level3(restored.snapshot());assert(again.items.find(i=>i.id===loot.id).taken);
 assert.equal(again.items.filter(i=>i.id===loot.id).length,1);
});
test('Las palomas respetan el descanso tras regresar',()=>{
 const m=new Level3(),bird=m.enemies.find(e=>e.kind==='pigeon');m.enemies=[bird];bird.cool=2;bird.state='perch';
 m.player.reset(bird.x-60,bird.y);m.player.vx=420;m.stepEnemies(dt,m.player,{});assert.equal(bird.state,'perch');
 bird.cool=0;m.stepEnemies(dt,m.player,{});assert.equal(bird.state,'dive');
});
test('El impulso externo no atraviesa cajas desde ningún lado',()=>{
 const m=new Level3(),b=m.platforms.find(b=>b.breakable),p=m.player;
 p.reset(b.x-30,FLOOR);m.moveExternal(130);assert(p.x<=b.x-21);
 p.reset(b.x+b.w+30,FLOOR);m.moveExternal(-130);assert(p.x>=b.x+b.w+21);
 p.reset(b.x-30,b.y);m.moveExternal(130);assert(p.x>b.x+b.w);
});
test('Un golpe letal no permite disparar después de morir',()=>{
 const m=new Level3(),e=m.enemies.find(e=>e.kind==='can');m.enemies=[e];m.hp=5;m.player.reset(e.x,FLOOR);
 m.step(dt,{shoot:true});assert(m.player.dead);assert.equal(m.bullets.length,0);assert(!m.events.some(e=>e.type==='shoot'));
});
test('UHT protege también del agarre del barista',()=>{
 const m=new Level3(),e=m.enemies.find(e=>e.kind==='barista');m.enemies=[e];m.power.uht=5;m.player.reset(e.x-5,FLOOR);
 m.stepEnemies(dt,m.player,{});assert.equal(m.power.cortado,0);assert.equal(m.hp,100);
});
for(const [Class,version] of [[Level2,7],[Level3,3]]) test('Guardado irregular nivel '+version+' no bloquea inicio',()=>{
 const m=new Class({version,flag:1.5,taken:{},defeated:42,broken:false,chases:{},loot:[null],flags:{},score:Infinity});
 assert.equal(m.checkpointIndex,-1);assert.equal(m.score,0);assert(Number.isFinite(m.player.x));
});
console.log(passed+' regresiones V9.1 verificadas.');
