import {useEffect,useRef} from 'react';
type Props={label:string;unit:string;maximum:number;color:string;points:Array<{second:number;value:number}>;threshold?:number};
export default function CanvasChart({label,unit,maximum,color,points,threshold}:Props){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;
  let frame=0;
  const paint=()=>{
   cancelAnimationFrame(frame);const width=Math.max(180,Math.floor(canvas.getBoundingClientRect().width)),height=260,scale=Math.min(window.devicePixelRatio||1,2);
   canvas.width=width*scale;canvas.height=height*scale;
   const styles=getComputedStyle(canvas),token=(name:string)=>styles.getPropertyValue(name).trim()||styles.color;
   const muted=token('--pf-secondary'),border=token('--pf-border'),surface=token('--pf-surface'),line=color.startsWith('--')?token(color):color;
   const left=44,right=width-16,top=32,bottom=218,domain=Math.max(1,maximum,...points.map(p=>p.value));
   const y=(value:number)=>bottom-Math.max(0,Math.min(domain,value))/domain*(bottom-top),x=(second:number)=>left+Math.max(0,Math.min(900,second))/900*(right-left);
   const started=performance.now(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   function draw(now:number){
    if(!ctx)return;ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);ctx.font='12px "IBM Plex Mono", monospace';ctx.fillStyle=muted;ctx.strokeStyle=border;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,top);ctx.lineTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();
    ctx.fillText(Number(domain.toFixed(1))+' '+unit,4,18);ctx.fillText('0',20,bottom+3);ctx.fillText('0 min',left,246);ctx.textAlign='right';ctx.fillText('15 min',right,246);ctx.textAlign='left';
    if(threshold!==undefined){const ty=y(threshold);ctx.strokeStyle=muted;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(left,ty);ctx.lineTo(right,ty);ctx.stroke();ctx.setLineDash([]);const text='Throttle '+threshold+' '+unit,tw=ctx.measureText(text).width,tx=Math.max(left+4,right-tw-4),textY=Math.max(top+15,Math.min(bottom-8,ty-8));ctx.fillStyle=surface;ctx.fillRect(tx-3,textY-13,tw+6,17);ctx.fillStyle=muted;ctx.fillText(text,tx,textY);}
    const progress=reduced?1:Math.min(1,(now-started)/220);ctx.save();ctx.beginPath();ctx.rect(left,top-1,(right-left)*progress,bottom-top+2);ctx.clip();ctx.strokeStyle=line;ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>{if(i===0)ctx.moveTo(x(p.second),y(p.value));else ctx.lineTo(x(p.second),y(p.value));});ctx.stroke();ctx.restore();if(progress<1)frame=requestAnimationFrame(draw);
   }
   frame=requestAnimationFrame(draw);
  };
  const observer=new ResizeObserver(paint);observer.observe(canvas);paint();return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[points,maximum,unit,color,threshold]);
 return <canvas ref={ref} role="img" aria-label={label} style={{display:'block',width:'100%',maxWidth:'100%',minWidth:0,height:'260px'}}>Time-series chart. Current values appear in the metrics above.</canvas>;
}
