const assert=require('node:assert/strict');
const {Adventure}=require('../js/adventure');
const {Extras}=require('../js/extras');
const {Player}=require('../js/physics');
let failed=0,passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
function setup(){const a=new Adventure(),x=new Extras(a),p=new Player();return {a,x,p}}
test('Impacto y muerte conservan evento y especie',()=>{const {x}=setup(),e=x.enemies[0];x.hurtEnemy(e,10,1,'shot');assert(x.events.some(e=>e.type==='enemyhit'&&e.enemyType==='bacteria'));x.hurtEnemy(e,20,1,'shot');assert(x.events.some(e=>e.type==='enemydeath'&&e.enemyType==='bacteria'));});
test('Un objeto agotado no se recoge por segunda vez',()=>{const {x,p}=setup();x.items=[{kind:'cacao',x:p.x,y:p.y,rise:0,life:0}];x.collect(p);assert.equal(x.power.cacao,0);});
test('Calor respeta protección temporal',()=>{const {a,x,p}=setup();p.x=200;p.invuln=1;x.temp=100;x.sourTick=0;x.stepTemperature(1/120,p);assert.equal(a.hp,100);assert.equal(p.invuln,1);});
test('Enfriamiento del vapor depende del tiempo transcurrido',()=>{const simulate=dt=>{const {x,p}=setup();p.x=11150;p.invuln=99;x.temp=80;x.time=2.5;for(let t=0;t<0.1-1e-8;t+=dt)x.stepHazards(dt,p);return x.temp;};assert(Math.abs(simulate(1/120)-simulate(1/60))<1e-6);});
test('Gotas totales incluyen recompensas de cajas',()=>{const {x}=setup();const bonus=x.blocks.reduce((n,b)=>n+(b.content==='drops5'?5:b.content==='drop'?1:0),0);assert.equal(x.dropTotal,x.drops.length+bonus);});
test('Audio libera osciladores, filtros y ganancias al finalizar',()=>{
  const sandbox={window:{}};require('node:vm').runInNewContext(require('node:fs').readFileSync(require('node:path').join(__dirname,'../js/sfx.js'),'utf8'),sandbox);
  const nodes=[];const param={setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};
  const node=()=>{const n={gain:{...param},frequency:{...param},connect(){},disconnect(){this.released=true},start(){},stop(){}};nodes.push(n);return n;};
  const c={sampleRate:20,currentTime:0,destination:{},createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer:()=>({getChannelData:()=>new Float32Array(20)})};
  const sfx=new sandbox.window.MilkSfx(c);sfx.tone(200,0,.1);sfx.hiss(0,.1,.1);
  for(const n of nodes)if(n.onended)n.onended();
  assert(nodes.slice(1).every(n=>n.released));
});
console.log(`${passed} aprobadas, ${failed} fallidas`);if(failed)process.exitCode=1;
