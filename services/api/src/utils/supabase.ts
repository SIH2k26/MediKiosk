import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

/**
 * Supabase client for use with user JWT tokens (anon key, RLS enforced).
 * Call this when you need to make requests on behalf of the authenticated user.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!_client) {
    _client = createClient(url, anonKey);
  }
  return _client;
}

/**
 * Supabase service-role client (bypasses RLS).
 * Use ONLY for trusted server-side operations (migrations, admin tasks).
 * NEVER expose to client-side code.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role configuration');
  }

  if (!_serviceClient) {
    _serviceClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _serviceClient;
}
