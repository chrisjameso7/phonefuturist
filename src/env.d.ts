/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    supabase: import('@supabase/supabase-js').SupabaseClient | null;
    user: import('@supabase/supabase-js').User | null;
    access: { active: boolean; verified: boolean; roles: string[]; aal: string; mfa_required: boolean } | null;
  }
}
