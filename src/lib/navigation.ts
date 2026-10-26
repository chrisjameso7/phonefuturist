type Access={active:boolean;verified:boolean;roles:string[]};
/** Route-aware active section shared by desktop and mobile navigation. */
export function activeNavigation(url: URL): string | undefined {
 const path=url.pathname.replace(/\/+$/, '') || '/';
 if(path==='/')return 'home';
 if(path==='/community'||path.startsWith('/community/')||path==='/interactive-leaks/explore'||path.startsWith('/creator/')||path.startsWith('/interactive-leaks/simulation/')||path.startsWith('/interactive-leaks/profile/'))return 'community';
 if(path==='/interactive-leaks'||path.startsWith('/interactive-leaks/'))return 'lab';
 if(path==='/studio'||path.startsWith('/studio/'))return 'studio';
 if(path==='/articles' && !url.searchParams.get('section')) return 'newsroom';
 const section=path==='/articles'?url.searchParams.get('section'):path.split('/')[1];
 return ['news','reports','leaks','analysis'].includes(section??'')?section!:undefined;
}
export function navigationFor(user:unknown,access:Access|null){
 return {signedIn:!!user,showStudio:!!user&&!!access?.active&&!!access.verified&&access.roles.includes('admin')};
}
