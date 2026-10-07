const assert=require('node:assert/strict');
const {Adventure,WIDTH}=require('../js/adventure');
const {Player}=require('../js/physics');
const {Extras}=require('../js/extras');
const Boss=require('../js/boss');
const Flow=require('../js/level-flow');
let count=0;function test(n,f){f();count++;console.log('PASS',n)}
function setup(){const a=new Adventure(),p=new Player(13300,520),e=a.enemies.at(-1);a.arena=true;return {a,p,e}}
test('Jefe mide dos veces la botella',()=>{assert.equal(setup().e.height,284)});
test('No dispara antes de entrar a la arena',()=>{const {a,p,e}=setup();a.arena=false;for(let i=0;i<600;i++)Boss.step(e,1/120,p,a,[]);assert.equal(e.bossPhase,'patrol');assert.equal(e.ray,null)});
test('Carga visible de 0.95 segundos antes del rayo',()=>{const {a,p,e}=setup();Boss.step(e,1.1,p,a,[]);assert.equal(e.bossPhase,'charge');Boss.step(e,.94,p,a,[]);assert.equal(e.bossPhase,'charge');Boss.step(e,.02,p,a,[]);assert.equal(e.bossPhase,'beam');assert.equal(a.hp,100)});
test('Rayo resta exactamente 5 una sola vez por descarga',()=>{const {a,p,e}=setup();Boss.step(e,1.1,p,a,[]);Boss.step(e,.96,p,a,[]);for(let i=0;i<30;i++){p.invuln=0;Boss.step(e,1/120,p,a,[]);}assert.equal(a.hp,95)});
test('Cambiar altura después de cargar esquiva el rayo',()=>{const {a,p,e}=setup();Boss.step(e,1.1,p,a,[]);p.y=310;Boss.step(e,.96,p,a,[]);Boss.step(e,.1,p,a,[]);assert.equal(a.hp,100)});
test('Escudo absorbe rayo sin impactos repetidos',()=>{const {a,p,e}=setup(),x=new Extras(a);x.power.shield=true;Boss.step(e,1.1,p,a,[]);Boss.step(e,.96,p,a,[]);Boss.step(e,.01,p,a,[]);assert.equal(a.hp,100);assert(!x.power.shield);p.invuln=0;Boss.step(e,.02,p,a,[]);assert.equal(a.hp,100)});
test('Derrota cancela el rayo inmediatamente',()=>{const {a,p,e}=setup();Boss.step(e,1.1,p,a,[]);a.damageEnemy(e,100);assert.equal(e.ray,null)});
test('Reaparición reinicia ataque sin rayo pendiente',()=>{const {a,p,e}=setup();Boss.step(e,1.1,p,a,[]);a.respawn(p);assert.equal(e.bossPhase,'patrol');assert.equal(e.ray,null)});
test('Chocolatada identifica la bala y causa 20 de daño',()=>{const {a,p,e}=setup(),x=new Extras(a);x.power.cacao=20;p.x=e.x-200;p.face=1;a.step(1/120,p,{shoot:true},()=>{});assert(a.bullets.some(b=>b.cacao));for(let i=0;i<40;i++)a.step(1/120,p,{},()=>{});assert.equal(e.hp,80)});
test('Celebración, caminata, fundido y una sola transición',()=>{const f=new Flow(),p={x:13000};f.begin();assert(f.step(2.8,p,WIDTH).includes('firework'));assert.equal(f.state,'walk');p.x=WIDTH-64;f.step(.01,p,WIDTH);assert.equal(f.state,'fade');assert(f.step(1.2,p,WIDTH).includes('nextlevel'));assert.equal(f.fade,1);assert.deepEqual(f.step(3,p,WIDTH),[])});
test('Segmento detecta impacto intermedio y descarta objetivos fuera del rayo',()=>{assert.equal(Boss.segmentBox(0,0,100,0,{x:40,y:-5,w:10,h:10}),.4);assert.equal(Boss.segmentBox(0,0,100,0,{x:40,y:30,w:10,h:10}),null)});
test('Chocolate en vuelo mantiene daño al vencer cacao',()=>{const {a,p,e}=setup(),x=new Extras(a);x.power.cacao=20;p.x=e.x-200;p.face=1;a.step(1/120,p,{shoot:true},()=>{});x.power.cacao=0;for(let i=0;i<40;i++)a.step(1/120,p,{},()=>{});assert.equal(e.hp,80)});
console.log(count+' pruebas V5 completas.');
