import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

export function sessionClient(cookies: AstroCookies, request: Request, config: {url:string; key:string; origin:string}) {
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('Cookie') ?? '').map(({name,value}) => ({name,value:value ?? ''})),
      setAll: values => {
        for (const {name,value,options} of values) {
          // Keep the SDK's persistent lifetime, rotation and deletion flags.
          cookies.set(name,value,{...options,path:'/',httpOnly:true,sameSite:'lax',secure:config.origin.startsWith('https:')});
        }
      },
    },
  });
}
