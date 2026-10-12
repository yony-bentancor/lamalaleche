/* Final de campaña: reutiliza arte del juego, sin descargas externas. */
(function () {
  'use strict';
  var active = false;
  window.MilkEnding = {play: function (done) {
    if (active) return;
    active = true;
    var host = document.createElement('section'), step = 0, elapsed = 0, last = performance.now(), raf;
    var scenes = [
      ['DESPUÉS DEL ABISMO', 'Todavía quedaba luz.', 'El mar devolvió a la orilla una botella golpeada, pero entera. Esta vez, el viento olía a casa.'],
      ['GRANJA LA ESPERANZA', 'Fuera del molde.', 'Había cruzado fábricas, góndolas, ciudades, tormentas y el fondo del mar. Volvía al lugar donde todo empezó, pero ya no era la misma.'],
      ['LA MALA LECHE · FIN', 'Nacida para ser libre.', 'No regresó para entrar en otra caja. Regresó para abrir la puerta. Y desde aquel día, ninguna botella volvió a salir sola.']
    ];
    host.id = 'milkEnding'; host.setAttribute('role','dialog'); host.setAttribute('aria-modal','true'); host.setAttribute('aria-label','Final de La Mala Leche');
    host.innerHTML = '<div class="ending-bg"></div><div class="ending-stars"></div><div class="ending-content"><img class="ending-bottle" src="assets/sprites/walk-0.webp" alt="La botella vuelve a casa"><small></small><h2></h2><p></p><small class="credits"></small><button id="endingNext">Continuar →</button><button id="endingSkip">Saltar final</button></div>';
    document.body.appendChild(host);
    for(var i=0;i<36;i++){var star=document.createElement('i');star.style.cssText='left:'+((i*47)%100)+'%;top:'+((i*31)%100)+'%;animation-delay:'+(i%7)*.3+'s';host.querySelector('.ending-stars').appendChild(star);}
    function paint(){host.querySelector('.ending-bg').style.backgroundImage='linear-gradient(90deg,#091925ed,#09192544),url("'+['assets/level5/bg-12.webp','assets/backgrounds/05.webp','assets/backgrounds/03.webp'][step]+'")';host.querySelector('small').textContent=scenes[step][0];host.querySelector('h2').textContent=scenes[step][1];host.querySelector('p').textContent=scenes[step][2];host.querySelector('.credits').textContent=step===2?'UN JUEGO DE YONY BENTANCOR · QR ESTUDIO · GRACIAS POR JUGAR':'';host.querySelector('#endingNext').textContent=step===2?'Ver resultados →':'Continuar →';}
    function close(){cancelAnimationFrame(raf);window.removeEventListener('keydown',key,true);host.remove();active=false;if(done)done();}
    function next(){if(step===2)return close();step++;elapsed=0;paint();}
    function key(e){if(['Escape','Space','Enter'].indexOf(e.code)<0)return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.code==='Escape')close();else next();}
    function tick(now){if(!document.hidden){elapsed+=Math.min(now-last,100);if(elapsed>=8000&&step<2){step++;elapsed=0;paint();}}last=now;raf=requestAnimationFrame(tick);}
    host.querySelector('#endingNext').onclick=next;host.querySelector('#endingSkip').onclick=close;window.addEventListener('keydown',key,true);paint();host.querySelector('#endingNext').focus();raf=requestAnimationFrame(tick);
  }};
}());
