import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../public/theme-init.js',import.meta.url),'utf8');
function appearance(saved:string|null=null,light=false,blocked=false){
 const dataset:Record<string,string>={},controls=[{value:''},{value:''}],events:Record<string,Function>={},mediaEvents:Record<string,Function>={};let stored=saved;
 const media={matches:light,addEventListener:(name:string,fn:Function)=>{mediaEvents[name]=fn;}};
 runInNewContext(script,{document:{documentElement:{dataset},querySelectorAll:()=>controls,addEventListener:(name:string,fn:Function)=>{events[name]=fn;}},window:{dispatchEvent:()=>{},addEventListener:()=>{}},Event:class{constructor(public type:string){}},matchMedia:()=>media,localStorage:{getItem:()=>{if(blocked)throw Error('blocked');return stored;},setItem:(_key:string,value:string)=>{if(blocked)throw Error('blocked');stored=value;}}});
 return {dataset,controls,media,mediaEvents,get stored(){return stored;},choose(value:string){events.change({target:{value,matches:()=>true}});}};
}
describe('Publication appearance',()=>{
 it('defaults to dark without overwriting a saved preference',()=>{const a=appearance();expect(a.dataset.theme).toBe('dark');expect(a.stored).toBeNull();expect(appearance('light').dataset.theme).toBe('light');});
 it('synchronizes selectors and persists explicit choices',()=>{const a=appearance();a.choose('light');expect(a.controls.map(c=>c.value)).toEqual(['light','light']);expect(a.stored).toBe('light');expect(a.dataset.theme).toBe('light');a.choose('invalid');expect(a.stored).toBe('light');});
 it('follows OS appearance only for System',()=>{const a=appearance('system',true);expect(a.dataset.theme).toBe('light');a.media.matches=false;a.mediaEvents.change();expect(a.dataset.theme).toBe('dark');a.choose('light');a.mediaEvents.change();expect(a.dataset.theme).toBe('light');});
 it('works when local storage is unavailable',()=>{const a=appearance(null,false,true);a.choose('light');expect(a.dataset.theme).toBe('light');expect(a.controls[0].value).toBe('light');});
});
