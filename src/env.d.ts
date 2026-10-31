/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
    adAudience?: 'free'|'pro'|'unknown';
    user: import('@supabase/supabase-js').User | null;
    access: { active: boolean; verified: boolean; roles: string[]; aal: string; mfa_required: boolean; mfa_exception?: boolean; can_manage_mfa_exceptions?: boolean } | null;
  }
}


declare module 'cloudflare:workers' {
  export const env: Record<string, unknown>;
}
