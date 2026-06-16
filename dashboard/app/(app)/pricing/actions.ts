"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";

export async function updateSettings(values: Record<string, number>) {
  const rows = Object.entries(values)
    .filter(([, v]) => typeof v === "number" && !isNaN(v))
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));

  if (rows.length === 0) return { error: "لا توجد قيم صالحة" };

  const { error } = await supabaseAdmin
    .from("settings")
    .upsert(rows, { onConflict: "key" });

  if (error) return { error: error.message };
  revalidatePath("/pricing");
  return { ok: true };
}
