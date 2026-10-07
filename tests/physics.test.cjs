const assert=require('node:assert/strict');
const {Player,CONFIG:C}=require('../js/physics.js');
const dt=1/120,flat={width:10000,height:720,surfaces:()=>[{x:0,w:10000,y:520}]};
const step=(p,n,input={},world=flat)=>{let ev=[];for(let i=0;i<n;i++)ev.push(...p.step(dt,typeof input==='function'?input(i):input,world));return ev};
let results=[];function test(name,fn){fn();results.push(name);console.log('PASS',name)}
test('Aceleración gradual y velocidad máxima',()=>{let p=new Player(200,520);step(p,1,{right:true,run:true});assert(p.vx>0&&p.vx<C.run);step(p,120,{right:true,run:true});assert.equal(p.vx,C.run)});
test('Frenado progresivo sin movimiento residual',()=>{let p=new Player(200,520);step(p,60,{right:true,run:true});const x=p.x;step(p,1);assert(p.vx>0&&p.vx<C.run);step(p,100);assert.equal(p.vx,0);assert(p.x>x)});
test('Derrape mantiene orientación antes de invertirla',()=>{let p=new Player(600,520);step(p,60,{right:true,run:true});step(p,1,{left:true,run:true});assert(p.skid);assert.equal(p.face,1);step(p,90,{left:true,run:true});assert.equal(p.face,-1);assert.equal(p.vx,-C.run)});
function jumpHeight(release){let p=new Player(400,520),min=520;for(let i=0;i<150;i++){p.step(dt,{jumpPressed:i===0,jump:i<release},flat);min=Math.min(min,p.y)}return 520-min}
test('Mantener salto supera claramente al toque corto',()=>{const short=jumpHeight(5),long=jumpHeight(100);assert(long>short*1.6);assert(long>110);console.log('  alturas:',short.toFixed(1),long.toFixed(1))});
test('Coyote time salta tras abandonar un borde',()=>{const ledge={...flat,surfaces:()=>[{x:0,w:300,y:520}]};let p=new Player(315,520);p.vx=235;step(p,6,{right:true},ledge);assert(!p.grounded);const e=step(p,1,{jump:true,jumpPressed:true},ledge);assert(e.includes('jump'));assert(p.vy<0)});
test('No permite saltar fuera del coyote time',()=>{const ledge={...flat,surfaces:()=>[]};let p=new Player(400,520);step(p,20,{},ledge);assert(!step(p,1,{jump:true,jumpPressed:true},ledge).includes('jump'))});
test('Jump buffer ejecuta salto al aterrizar',()=>{let p=new Player(400,502);p.grounded=false;p.vy=300;let e=step(p,1,{jump:true,jumpPressed:true});e.push(...step(p,10,{jump:true}));assert(e.includes('jump'));assert(p.vy<0)});
test('Buffer vencido no produce salto automático',()=>{let p=new Player(400,100);p.grounded=false;p.vy=0;let e=step(p,1,{jump:true,jumpPressed:true});e.push(...step(p,180,{jump:true}));assert(!e.includes('jump'));assert(p.grounded)});
test('Agacharse desliza y se detiene',()=>{let p=new Player(400,520);p.vx=420;step(p,12,{down:true});assert(p.vx>300);assert.equal(p.state,'crouch');step(p,150,{down:true});assert.equal(p.vx,0)});
test('Caída limitada y aterrizaje sin atravesar el piso',()=>{let p=new Player(400,-1000);p.grounded=false;for(let i=0;i<500;i++){step(p,1);assert(p.vy<=C.maxFall);assert(p.y<=520)}assert(p.grounded)});
test('Control aéreo y límites del mundo',()=>{let p=new Player(400,200);p.grounded=false;step(p,15,{right:true});assert(p.vx>0);assert(p.vx<235);p.x=9990;step(p,60,{right:true,run:true});assert(p.x<=10000-C.width/2)});
test('Daño protegido durante dos segundos y muerte reiniciable',()=>{let p=new Player(400,520);assert(p.damage());assert(!p.damage());step(p,245);assert(p.damage());p.kill();step(p,60);assert(p.dead&&p.death>.4);p.reset(200,520);assert(!p.dead&&p.grounded)});
console.log(`${results.length} pruebas completas.`);
