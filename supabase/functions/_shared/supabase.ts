import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.1";

export function getSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, key);
}
