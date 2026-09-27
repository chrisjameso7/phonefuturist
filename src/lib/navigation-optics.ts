/** Static, bounded rounded-lens displacement; no animation or scene capture. */
export function lensPixel(x:number,y:number,width:number,height:number):[number,number,number] {
  const radius=Math.min(28,height/2);
  const sx=x-width/2,sy=y-height/2;
  const qx=Math.abs(sx)-(width/2-radius),qy=Math.abs(sy)-(height/2-radius);
  const ax=Math.max(qx,0),ay=Math.max(qy,0),length=Math.hypot(ax,ay);
  const distance=-(length+Math.min(Math.max(qx,qy),0)-radius);
  if(distance<=0||distance>=12)return [128,128,0];
  const weight=Math.sin(Math.PI*distance/12);
  const nx=length?ax/length:qx>qy?1:0;
  const ny=length?ay/length:qy>=qx?1:0;
  return [Math.round(128+85*weight*nx*Math.sign(sx)),Math.round(128+85*weight*ny*Math.sign(sy)),Math.round(weight*255)];
}

export function installNavigationOptics(header:HTMLElement,rail:HTMLElement,desktop:MediaQueryList) {
  // Parsing url() does not establish SVG backdrop support. Be conservative:
  // WebKit 245510 and Mozilla 2018607 track missing displacement support.
  if(!/(Chrome|Chromium|Edg)\//.test(navigator.userAgent)||!CSS.supports('backdrop-filter','url("#pf-navigation-lens")'))return;
  const preferences=matchMedia('(prefers-reduced-motion:reduce), (prefers-reduced-transparency:reduce), (forced-colors:active)');
  const ns='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(ns,'svg');
  svg.setAttribute('width','0');svg.setAttribute('height','0');svg.setAttribute('aria-hidden','true');
  svg.style.position='absolute';
  svg.innerHTML=`<defs><filter id="pf-navigation-lens" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feImage result="map" preserveAspectRatio="none"/><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="clear"/><feDisplacementMap in="clear" in2="map" scale="12" xChannelSelector="R" yChannelSelector="G" result="lens"/><feGaussianBlur in="lens" stdDeviation="1.6" result="diffused"/><feColorMatrix in="map" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0" result="edge"/><feComposite in="diffused" in2="edge" operator="in" result="rim"/><feComposite in="lens" in2="edge" operator="out" result="center"/><feMerge><feMergeNode in="center"/><feMergeNode in="rim"/></feMerge></filter></defs>`;
  document.body.append(svg);
  const map=svg.querySelector('feImage')!;
  const cache=new Map<string,string>();
  const update=()=>{
    if(!desktop.matches||preferences.matches){delete header.dataset.optics;return;}
    const compact=header.dataset.scrolled==='true';
    const width=Math.min(2048,Math.round(compact?rail.offsetWidth:header.offsetWidth));
    const height=compact?56:84;
    if(width<1)return;
    const key=`${width}:${height}`;
    let url=cache.get(key);
    if(!url){
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d');if(!context)return;
      const pixels=context.createImageData(width,height);
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const index=(y*width+x)*4;
        pixels.data.set([...lensPixel(x+.5,y+.5,width,height),255],index);
      }
      context.putImageData(pixels,0,0);url=canvas.toDataURL();
      if(cache.size>=4)cache.clear();cache.set(key,url);
    }
    map.setAttribute('href',url);header.dataset.optics='refractive';
  };
  new ResizeObserver(update).observe(header);
  new ResizeObserver(update).observe(rail);
  new MutationObserver(update).observe(header,{attributes:true,attributeFilter:['data-scrolled']});
  desktop.addEventListener('change',update);preferences.addEventListener('change',update);
  update();
}
