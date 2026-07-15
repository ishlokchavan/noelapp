import { supabase } from './supabase';

/**
 * Account-identity helpers for keeping user email + phone unique.
 *
 * The hard guarantee is the DB unique index (see
 * supabase/migrations/20260715000000_unique_user_email_phone.sql). These helpers
 * are the friendly pre-checks so users get a clear message before we hit a
 * constraint error. Email uniqueness is enforced natively by Supabase Auth.
 */

/** Normalize a phone to digits + optional leading '+', matching the SQL migration. */
export function normalizePhone(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const plus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return plus ? `+${digits}` : digits;
}

/** Basic sanity check (7–15 digits, optional +). */
export function isValidPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  return /^\+?\d{7,15}$/.test(n);
}

/**
 * Best-effort check that no OTHER user profile already uses this phone. Returns
 * true when the number looks free (or when RLS hides other rows — the DB unique
 * index is the real backstop). Pass the current user's id to allow their own.
 */
export async function isPhoneAvailable(rawPhone: string, selfId?: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone);
  if (!phone) return true;
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .limit(2);
  if (error || !data) return true; // don't block on a read failure; the DB constraint still guards
  return data.every((r: { id: string }) => r.id === selfId);
}
