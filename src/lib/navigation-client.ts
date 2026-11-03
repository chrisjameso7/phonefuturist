
export function compactNavigationState(top:number,bottom:number,previous:boolean):boolean {
  return bottom<=0?true:top>=0?false:previous;
}

/** Progressive enhancement: native details navigation works without JavaScript. */
export function enhanceNavigation() {
  const header=document.querySelector<HTMLElement>('.site-header');
  const appbar=document.querySelector<HTMLElement>('.mobile-appbar');
  const tabbar=document.querySelector<HTMLElement>('.mobile-tabbar');
  let lastY=window.scrollY;
  let ticking=false;

  const syncMobileChrome=()=>{
    const y=window.scrollY;
    const compact=y>52;
    header?.setAttribute('data-scroll-blur',String(y>8));
    const direction=y>lastY?'down':'up';
    appbar?.setAttribute('data-compact',String(compact));
    appbar?.setAttribute('data-direction',direction);
    tabbar?.setAttribute('data-compact',String(compact));
    tabbar?.setAttribute('data-direction',direction);
    lastY=y;
    ticking=false;
  };

  const onScroll=()=>{
    if(ticking)return;
    ticking=true;
    requestAnimationFrame(syncMobileChrome);
  };

  syncMobileChrome();
  window.addEventListener('scroll',onScroll,{passive:true});


  const sentinel=document.querySelector<HTMLElement>('.header-scroll-sentinel');
  const menu=header?.querySelector<HTMLDetailsElement>('.mobile-nav');
  const toggle=menu?.querySelector<HTMLElement>('summary');
  if(!header||!menu||!toggle||header.dataset.enhanced)return;
  header.dataset.enhanced='true';
  const desktop=matchMedia('(min-width: 1280px)');
  const rail=header.querySelector<HTMLElement>('.desktop-nav');
  const hiddenControls=[...header.querySelectorAll<HTMLElement>('.header-brand-row,.header-actions')];
  let scrolled=false;
  const update=()=>{
    // Full-width PhoneFuturist headers stay intact while scrolling. Capsule mode is opt-in.
    const compact=desktop.matches&&scrolled&&header.dataset.compactNavigation==='true';
    if(compact&&hiddenControls.some(control=>control.contains(document.activeElement))) {
      rail?.querySelector<HTMLElement>('a[aria-current],a')?.focus({preventScroll:true});
    }
    hiddenControls.forEach(control=>{control.inert=compact;});
    header.dataset.scrolled=String(compact);
  };
  if(rail&&'ResizeObserver' in window){
    new ResizeObserver(()=>{
      header.style.setProperty('--capsule-width',`${rail.offsetWidth}px`);
    }).observe(rail);
  }
  // A 40px hysteresis band prevents repeated transitions around one threshold.
  if(sentinel&&'IntersectionObserver' in window){
    new IntersectionObserver(([entry])=>{
      scrolled=compactNavigationState(entry.boundingClientRect.top,entry.boundingClientRect.bottom,scrolled);
      update();
    },{threshold:[0,1]}).observe(sentinel);
  }
  desktop.addEventListener('change',()=>{if(desktop.matches)menu.open=false;update();});
  const sync=()=>toggle.setAttribute('aria-expanded',String(menu.open));
  sync();
  menu.addEventListener('toggle',sync);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.open){menu.open=false;toggle.focus();}
  });
  document.addEventListener('pointerdown',event=>{
    if(event.target instanceof Node&&!menu.contains(event.target))menu.open=false;
  },{passive:true});
  menu.addEventListener('focusout',event=>{
    if(event.relatedTarget instanceof Node&&!menu.contains(event.relatedTarget))menu.open=false;
  });
  menu.addEventListener('click',event=>{
    if(event.target instanceof Element&&event.target.closest('a'))menu.open=false;
  });
}
