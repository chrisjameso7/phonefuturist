/* Resolve appearance before first paint; keep both selectors in sync. */
(() => {
 const root=document.documentElement,key='phonefuturist-theme';
 const valid=value=>['dark','light','system'].includes(value);
 let preference='dark';
 try {const saved=localStorage.getItem(key);if(valid(saved))preference=saved;} catch {}
 const media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: light)'):null;
 function apply() {
  root.dataset.themePreference=preference;
  root.dataset.theme=preference==='system'?(media?.matches?'light':'dark'):preference;
  document.querySelectorAll('[data-appearance]').forEach(control=>{control.value=preference;});
  window.dispatchEvent(new Event('pf:theme-change'));
 }
 apply();
 document.addEventListener('DOMContentLoaded',apply,{once:true});
 document.addEventListener('change',event=>{
  const control=event.target;
  if(!control?.matches?.('[data-appearance]')||!valid(control.value))return;
  preference=control.value;
  try {localStorage.setItem(key,preference);} catch {}
  apply();
 });
 media?.addEventListener('change',()=>{if(preference==='system')apply();});
 window.addEventListener('storage',event=>{if(event.key===key){preference=valid(event.newValue)?event.newValue:'dark';apply();}});
})();
