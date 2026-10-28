import {useEffect,useRef} from 'react';
type Props={label:string;unit:string;maximum:number;color:string;points:Array<{second:number;value:number}>;threshold?:number};
export default function CanvasChart({label,unit,maximum,color,points,threshold}:Props){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current,ctx=canvas?.getContext('2d');if(!canvas||!ctx)return;const scale=Math.min(window.devicePixelRatio||1,2);canvas.width=800*scale;canvas.height=280*scale;ctx.scale(scale,scale);ctx.clearRect(0,0,800,280);ctx.font='16px system-ui';ctx.fillStyle='#aebbc9';ctx.strokeStyle='#435165';ctx.beginPath();ctx.moveTo(50,30);ctx.lineTo(50,230);ctx.lineTo(750,230);ctx.stroke();ctx.fillText(maximum+' '+unit,0,22);ctx.fillText('0',15,232);ctx.fillText('0 min',50,260);ctx.fillText('15 min',690,260);
 const y=(value:number)=>230-value/maximum*190;
 if(threshold!==undefined){ctx.strokeStyle='#fbbf70';ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(50,y(threshold));ctx.lineTo(750,y(threshold));ctx.stroke();ctx.setLineDash([]);ctx.fillText('Throttle '+threshold+' '+unit,560,y(threshold)-10);}
 ctx.strokeStyle=color;ctx.lineWidth=3;ctx.lineJoin='round';ctx.beginPath();points.forEach((point,index)=>{const x=50+point.second/900*700;if(index===0)ctx.moveTo(x,y(point.value));else ctx.lineTo(x,y(point.value));});ctx.stroke();},[points,maximum,unit,color,threshold]);
 return <canvas ref={ref} role="img" aria-label={label} style={{width:'100%',height:'auto',aspectRatio:'800 / 280'}}>Time-series chart. Current values appear in the metrics above.</canvas>;
}
