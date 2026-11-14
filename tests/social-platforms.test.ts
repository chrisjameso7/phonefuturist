import {expect,it} from 'vitest';
import {SOCIAL_PLATFORMS,socialPlatform,socialIcon} from '../src/lib/social-platforms';
it('recognises legacy labels while retaining a custom-link fallback',()=>{
 expect(socialPlatform('Twitter').id).toBe('x');
 expect(socialPlatform(' X (Twitter) ').id).toBe('x');
 expect(socialPlatform('INSTAGRAM').id).toBe('instagram');
 expect(socialPlatform('Portfolio').id).toBe('website');
 expect(socialPlatform('My professional page').id).toBe('other');
});
it('recognises a custom-labelled social URL only on exact platform hosts',()=>{
 expect(socialIcon({label:'My feed',url:'https://www.instagram.com/person'}).id).toBe('instagram');
 expect(socialIcon({label:'My feed',url:'https://instagram.com.evil.example/person'}).id).toBe('other');
 expect(socialIcon({label:'My feed',url:'https://notinstagram.com/person'}).id).toBe('other');
 expect(socialIcon({label:'My feed',url:'javascript:alert(1)'}).id).toBe('other');
});
it('keeps existing labels and URLs unchanged during icon resolution',()=>{
 const link={label:'Twitter',url:'https://twitter.com/person'};socialIcon(link);
 expect(link).toEqual({label:'Twitter',url:'https://twitter.com/person'});
 expect(SOCIAL_PLATFORMS.every(item=>item.icon.length>0 && item.placeholder.startsWith('https://'))).toBe(true);
 expect(new Set(SOCIAL_PLATFORMS.map(item=>item.id)).size).toBe(SOCIAL_PLATFORMS.length);
});
