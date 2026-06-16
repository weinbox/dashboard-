"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { ORDER_STATUSES } from "@/lib/format";

export async function updateOrderStatus(orderId: string, status: string) {
  if (!ORDER_STATUSES.some((s) => s.value === status)) {
    return { error: "حالة غير صحيحة" };
  }
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteOrder(orderId: string) {
  const { error } = await supabaseAdmin
    .from("orders")
    .delete()
    .eq("id", orderId);
  if (error) return { error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { ok: true };
}
