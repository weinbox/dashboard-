import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

/**
 * Service-role Supabase client used ONLY by the /admin dashboard.
 * Bypasses RLS, so it must never be exposed to public API routes.
 * Created lazily; returns null if the service role key is not configured.
 */
let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return null;
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

export function isAdminConfigured(): boolean {
  return !!env.SUPABASE_SERVICE_ROLE_KEY && !!env.ADMIN_PASSWORD;
}
