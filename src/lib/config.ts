import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/**
 * Defaults point at the live noelapp database (iclose-academy-db). The Supabase
 * anon key is a publishable client key — protected by row-level security — so it
 * ships in the app the same way it does on the web. Override any value via .env
 * (EXPO_PUBLIC_*) for a different environment.
 */
const DEFAULT_SUPABASE_URL = 'https://nnkicmfsdbfpucfcnutn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ua2ljbWZzZGJmcHVjZmNudXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2ODkyMDcsImV4cCI6MjA5NDI2NTIwN30.liASHVfCZQsB4OFwhY6uBYuv99IWXaMBbGGgbuFiKTs';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || 'https://iclose.ae';
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || DEFAULT_SUPABASE_URL;
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;

/** Contact channels for listing enquiries (WhatsApp / call). */
export const CONTACT_WHATSAPP = process.env.EXPO_PUBLIC_WHATSAPP_NUMBER || '971585530429';
export const CONTACT_PHONE = process.env.EXPO_PUBLIC_CONTACT_PHONE || '+971585530429';

/** Public web URL for a listing, so shared/WhatsApp messages are referable. */
export function listingUrl(reference: string): string {
  return `${API_BASE_URL.replace(/\/$/, '')}/property/${reference}`;
}
