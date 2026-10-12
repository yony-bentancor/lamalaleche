/* V11.1: fondo atmosférico para los precipicios, precalculado durante la carga.
   No copia escenas a otra altura: evita el salto de horizonte y los rectángulos.
   La fila superior se conserva pixel a pixel y se disuelve hacia bruma profunda. */
(function(root){
  function build(tile,index,W,H,floor){
    const safe=floor-112;
    const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H+400;
    const g=canvas.getContext('2d');
    const band=document.createElement('canvas');band.width=1;band.height=1;
    const b=band.getContext('2d');b.drawImage(tile,0,safe-32,W,24,0,0,1,1);
    // Paleta local suavizada horizontalmente, sin duplicar edificios ni sol.
    g.imageSmoothingEnabled=true;g.drawImage(band,0,0,1,1,0,safe,W,canvas.height-safe);
    const mist=g.createLinearGradient(0,safe,0,canvas.height);
    mist.addColorStop(0,'rgba(122,157,181,0)');
    mist.addColorStop(.22,'rgba(132,167,187,.6)');
    mist.addColorStop(.6,'rgba(172,192,205,.92)');
    mist.addColorStop(1,'rgb(183,201,214)');
    g.fillStyle=mist;g.fillRect(0,safe,W,canvas.height-safe);
    // Misma imagen y altura en la unión. Un fundido vertical quita la baranda.
    const cap=document.createElement('canvas');cap.width=W;cap.height=floor;
    const c=cap.getContext('2d');c.drawImage(tile,0,0);
    c.globalCompositeOperation='destination-in';
    const fade=c.createLinearGradient(0,safe,0,safe+44);
    fade.addColorStop(0,'black');fade.addColorStop(1,'transparent');
    c.fillStyle=fade;c.fillRect(0,0,W,floor);g.drawImage(cap,0,0);
    if(index>0){g.globalCompositeOperation='destination-in';const edge=g.createLinearGradient(0,0,235,0);edge.addColorStop(0,'transparent');edge.addColorStop(1,'black');g.fillStyle=edge;g.fillRect(0,0,W,canvas.height);}
    return canvas;
  }
  root.MilkGapBackdrop={build};
  if(typeof module!=='undefined')module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
