/* Shared adapter: all five levels retain their keyboard input and save formats. */
(function () {
  'use strict';
  var held={}, previous=[], padIndex=null, lastRoot=null, lastDirection=0, repeatAt=0, suspended=false;
  var status=document.getElementById('gamepadStatus');
  function event(code,down){document.body.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code:code,key:code,bubbles:true,cancelable:true}));}
  function release(){Object.keys(held).forEach(function(k){event(k,false);});held={};}
  function visible(el){return !!el&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
  function root(){
    var ending=document.getElementById('milkEnding');if(ending)return ending;
    var cinema=document.querySelector('.milk-cinema, .city-cinema');if(visible(cinema))return cinema;
    for(var i=5;i>=2;i--){var level=document.getElementById('level'+i);if(visible(level)){var overlay=document.getElementById('l'+i+'overlay');return visible(overlay)?overlay:null;}}
    var modals=document.querySelectorAll('#app .modal');for(var j=modals.length-1;j>=0;j--)if(visible(modals[j]))return modals[j];
    var home=document.getElementById('home');return visible(home)?home:null;
  }
  function focus(el){document.querySelectorAll('.pad-focus').forEach(function(x){x.classList.remove('pad-focus');});if(el){el.classList.add('pad-focus');el.focus({preventScroll:true});el.scrollIntoView({block:'nearest'});}}
  function pressed(p,n){var b=p.buttons[n];return !!b&&(typeof b==='number'?b>.5:b.pressed||b.value>.5);}
  function tick(now){
    requestAnimationFrame(tick);if(suspended||document.hidden)return;
    var pads=[],error=false;
    try{var get=navigator.getGamepads||navigator.webkitGetGamepads;if(get)pads=get.call(navigator)||[];}catch(e){error=true;}
    var p=padIndex!==null?pads[padIndex]:null;
    if(!p||p.connected===false){p=null;for(var i=0;i<pads.length;i++)if(pads[i]&&pads[i].connected!==false){p=pads[i];break;}}
    if(!p){if(padIndex!==null){release();if(!root()){event('Escape',true);event('Escape',false);}}padIndex=null;previous=[];status.textContent=error?'Joystick: el navegador bloqueó el acceso al mando.':!(navigator.getGamepads||navigator.webkitGetGamepads)?'Este navegador no ofrece acceso al joystick. Probá desde una computadora con el mando conectado.':'Joystick: presioná un botón para detectarlo.';return;}
    padIndex=p.index;status.textContent='Joystick conectado · ✕ saltar / aceptar · □ disparar · OPTIONS pausa';
    var b=[];for(var n=0;n<17;n++)b[n]=pressed(p,n);
    var edge=function(n){return b[n]&&!previous[n];}, r=root(), ax=p.axes[0]||0, ay=p.axes[1]||0;
    if(r!==lastRoot){release();lastRoot=r;lastDirection=0;}
    if(r){
      release();var items=Array.prototype.filter.call(r.querySelectorAll('button,input,a[href]'),function(x){return visible(x)&&!x.disabled;});
      var index=items.indexOf(document.activeElement);if(index<0&&items.length){index=0;focus(items[0]);}
      var dir=b[13]||ay>.5?1:b[12]||ay<-.5?-1:0;
      if(dir&&(dir!==lastDirection||now>=repeatAt)){index=(index+dir+items.length)%items.length;focus(items[index]);repeatAt=now+(dir!==lastDirection?350:140);}lastDirection=dir;
      var selected=items[index];
      if(selected&&selected.type==='range'&&(edge(14)||edge(15))){selected.value=Number(selected.value)+(edge(15)?5:-5);selected.dispatchEvent(new Event('input',{bubbles:true}));}
      else if(!dir&&(edge(14)||edge(15))&&items.length){focus(items[(index+(edge(15)?1:-1)+items.length)%items.length]);}
      if(edge(0)&&selected)selected.click();
      if(edge(1)||edge(9)){var back=r.querySelector('[data-close],.back');if(back)back.click();else{event('Escape',true);event('Escape',false);}}
    }else{
      var desired={ArrowLeft:b[14]||ax<-.22,ArrowRight:b[15]||ax>.22,ArrowDown:b[13]||ay>.5,ArrowUp:b[12]||ay<-.5,Space:b[0],KeyX:b[2],ShiftLeft:b[5]||b[7],KeyC:b[3]};
      Object.keys(desired).forEach(function(k){if(desired[k]&&!held[k]){event(k,true);held[k]=true;}else if(!desired[k]&&held[k]){event(k,false);delete held[k];}});
      if(edge(9)){release();event('Escape',true);event('Escape',false);}
    }
    previous=b;
  }
  window.addEventListener('blur',function(){suspended=true;release();previous=[];});window.addEventListener('focus',function(){suspended=false;});document.addEventListener('visibilitychange',function(){if(document.hidden)release();});requestAnimationFrame(tick);
}());
