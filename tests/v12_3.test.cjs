const assert = require('node:assert/strict');
const {Level5,FLAGS}=require('../js/level5-core.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS V12.3 '+name);}
function collectFirst(m){const it=m.items[0];m.player.x=it.x;m.player.y=it.y+60;m.collect([]);}
test('perlas no se duplican al morir antes de la primera bandera',()=>{let m=new Level5();collectFirst(m);const before=m.score;m.respawn([]);collectFirst(m);assert.equal(m.score,before);assert.equal(m.pearls,1);assert.equal(m.items[0].taken,true);});
test('reaparición conserva objetos posteriores a la bandera y sus puntos',()=>{let m=new Level5();m.player.x=FLAGS[0].x;m.checkFlags([]);let it=m.items.find(it=>it.x>FLAGS[0].x);m.player.x=it.x;m.player.y=it.y+60;m.collect([]);let score=m.score;m.respawn([]);assert.equal(m.player.x,FLAGS[0].x+60);assert(m.items[it.id].taken);assert.equal(m.score,score);});
test('enemigos derrotados no vuelven a dar puntos tras dos reapariciones',()=>{let m=new Level5();let e=m.enemies[0];m.killEnemy(e,[],'shot');const score=m.score;m.respawn([]);m.respawn([]);assert(!m.enemies[0].alive);assert(m.enemies[0].gone);assert.equal(m.score,score);assert.equal(m.stats.kills,1);});
test('partidas antiguas, incompletas y malformadas mantienen números y listas válidas',()=>{for(const s of [{flag:0},{flag:99,score:'oops',taken:{},cleared:null},{flag:NaN,pearls:Infinity},[],null,{flag:1,taken:[-1,0,0,90000],cleared:[0]}]){let m=new Level5(s);for(let i=0;i<10;i++)m.step(1/120,{});assert(Number.isFinite(m.score));assert(Number.isFinite(m.player.x));assert(Number.isFinite(m.player.y));assert(Number.isFinite(m.pearls));}});
test('consumo de torbellino queda en el checkpoint serializable inmediatamente',()=>{let m=new Level5();m.player.x=FLAGS[0].x;m.checkFlags([]);m.startWhirl([]);let resumed=new Level5(JSON.parse(JSON.stringify(m.saved)));assert.equal(resumed.whirl.charges,0);m.respawn([]);assert.equal(m.whirl.charges,0);});
test('guardado completo V12 mantiene coleccionables, jefe y escudo',()=>{let m=new Level5();collectFirst(m);m.shield=true;m.boss.state='dead';let n=new Level5(m.snapshot());assert.equal(n.pearls,m.pearls);assert(n.items[0].taken);assert(n.shield);assert.equal(n.boss.state,'dead');});
console.log(checks+' regresiones V12.3 verificadas');
