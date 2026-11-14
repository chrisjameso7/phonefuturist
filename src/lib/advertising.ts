import type {Plan} from './billing/entitlements';
export const ADSENSE_CLIENT='ca-pub-1048772235239044';
/** Plan must come from trusted server billing state, never a browser cookie or user_metadata. */
export function canShowAds(path:string,privatePage:boolean,plan:Plan|'unknown'='free'){
 return !privatePage&&plan==='free'&&(path==='/'||path==='/articles'||path.startsWith('/articles/'));
}
