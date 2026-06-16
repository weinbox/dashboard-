import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { ORDER_STATUSES } from "@/lib/format";
import OrderCard, { Order } from "./OrderCard";

export const dynamic = "force-dynamic";

async function getOrders(status?: string): Promise<Order[]> {
  let q = supabaseAdmin
    .from("orders")
    .select(
      "id, customer_phone, status, total_items, note, created_at, order_items(*)"
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as unknown as Order[];
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const active = searchParams.status ?? "all";
  const orders = await getOrders(active);

  const tabs = [{ value: "all", label: "الكل" }, ...ORDER_STATUSES];

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">الطلبات</h1>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={t.value === "all" ? "/orders" : `/orders?status=${t.value}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === t.value
                ? "bg-brand text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          لا توجد طلبات
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
