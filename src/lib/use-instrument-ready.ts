import {useEffect} from 'react';
/** Astro can finish its loader before React's concurrent hydration commits. */
export function useInstrumentReady(component:string) {
 useEffect(()=>{
  for(const island of document.querySelectorAll<HTMLElement>('astro-island')) {
   if(island.getAttribute('component-url')?.includes('/'+component+'.')) island.dataset.instrumentReady='true';
  }
  document.dispatchEvent(new Event('pf:instrument-ready'));
 },[component]);
}
