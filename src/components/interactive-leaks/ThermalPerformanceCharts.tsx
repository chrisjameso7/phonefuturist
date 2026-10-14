import type { CSSProperties } from 'react';

export type ThermalChartPoint = { second: number; temperatureC: number; performancePercent: number; powerW: number };

function ThermalPlot({ points, metric, unit, label, color }: {
  points: ThermalChartPoint[]; metric: 'temperatureC' | 'performancePercent'; unit: string; label: string; color: string;
}) {
  const clean = points.filter(p => Number.isFinite(p.second) && Number.isFinite(p[metric])).sort((a,b) => a.second-b.second);
  if (clean.length < 2) return null;
  const width=640, height=206, left=54, right=18, top=17, bottom=34;
  const values=clean.map(p=>p[metric]);
  const minValue=Math.floor(Math.min(...values)-Math.max(2,(Math.max(...values)-Math.min(...values))*0.12));
  const maxValue=Math.ceil(Math.max(...values)+Math.max(2,(Math.max(...values)-Math.min(...values))*0.12));
  const maxSeconds=Math.max(1,clean[clean.length-1].second);
  const x=(s:number)=>left+(s/maxSeconds)*(width-left-right);
  const y=(v:number)=>top+(1-(v-minValue)/Math.max(1,maxValue-minValue))*(height-top-bottom);
  const poly=clean.map(p=>`${x(p.second).toFixed(1)},${y(p[metric]).toFixed(1)}`).join(' ');
  const ticks=[0,1,2,3,4];
  const last=clean[clean.length-1];
  return <div className="il-thermal-plot">
    <div className="il-thermal-plot-heading"><strong>{label}</strong><span>{last[metric].toFixed(1)} {unit} at {(maxSeconds/60).toFixed(1)} min</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} over ${(maxSeconds/60).toFixed(1)} minutes. Starts at ${clean[0][metric].toFixed(1)} and ends at ${last[metric].toFixed(1)} ${unit}.`} style={{display:'block',width:'100%',height:'auto',overflow:'visible'}}>
      {ticks.map(t=>{const val=minValue+(maxValue-minValue)*t/4;return <g key={t}><line x1={left} y1={y(val)} x2={width-right} y2={y(val)} stroke="currentColor" strokeOpacity="0.13"/><text x={left-10} y={y(val)+4} textAnchor="end" fill="currentColor" opacity=".65" fontSize="13">{val.toFixed(0)}</text></g>})}
      <polyline points={poly} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={x(last.second)} cy={y(last[metric])} r="4.5" fill={color}/>
      {[0,0.25,0.5,0.75,1].map(t=><text key={t} x={x(maxSeconds*t)} y={height-9} fontSize="13" textAnchor="middle" fill="currentColor" opacity=".65">{(maxSeconds*t/60).toFixed(0)}m</text>)}
    </svg>
  </div>;
}

export default function ThermalPerformanceCharts({points}:{points:ThermalChartPoint[]}) {
  const containerStyle:CSSProperties={display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 310px), 1fr))',gap:'1rem',minWidth:0};
  return <div style={containerStyle} aria-label="Thermal performance charts">
    <ThermalPlot points={points} metric="performancePercent" unit="%" label="Performance stability" color="#38bdf8"/>
    <ThermalPlot points={points} metric="temperatureC" unit="°C" label="Device temperature" color="#fb923c"/>
  </div>;
}
