import type {Plan} from './billing/entitlements';
export const ADSENSE_CLIENT='ca-pub-1048772235239044';

/**
 * Manual AdSense placements. Paste each ad unit's numeric `data-ad-slot` ID from
 * AdSense → Ads → By ad unit. An empty ID renders nothing (Auto ads still run).
 */
export const AD_SLOTS = {
  /** In-article ad shown part-way through a story. Create as an "In-article" unit. */
  inArticle: '',
  /** Display ad after the story body. Create as a responsive "Display" unit. */
  articleEnd: '',
  /** In-feed/display ad between homepage and newsroom story lists. */
  feed: '',
} as const satisfies Record<string,string>;
export type AdPlacement = keyof typeof AD_SLOTS;

/** Plan must come from trusted server billing state, never a browser cookie or user_metadata. */
export function canShowAds(path:string,privatePage:boolean,plan:Plan|'unknown'='free'){
 const privateRoutes = ['/account','/auth','/studio','/api','/login','/join','/forgot-password','/reset-password','/editorial-preview'];
 const restricted = privateRoutes.some(route=>path===route||path.startsWith(route+'/'));
 return !privatePage&&!restricted&&plan==='free';
}
