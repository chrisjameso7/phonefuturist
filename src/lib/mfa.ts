import type { SupabaseClient } from '@supabase/supabase-js';

export async function cancelUnfinishedTotp(client: SupabaseClient, factorId: string) {
  const { data, error } = await client.auth.mfa.listFactors();
  if (error) return { error };
  if (!data.all.some(f => f.id === factorId && f.factor_type === 'totp' && f.status === 'unverified')) {
    return { error: { code: 'unfinished_factor_not_found', status: 400 } };
  }
  // Supabase rechecks ownership and assurance. Never use the Admin API here.
  return client.auth.mfa.unenroll({ factorId });
}

export function mfaError(operation: string, error: { code?: string; status?: number }) {
  const code = error.code && /^[a-z0-9_]{1,80}$/.test(error.code) ? error.code : 'auth_request_failed';
  console.warn('mfa_request_failed', { operation, code, status: error.status });
  return `Authenticator request failed (${code}). Please retry or contact the administrator.`;
}
