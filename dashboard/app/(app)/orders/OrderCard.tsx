"use client";

import { useState, useTransition } from "react";
import { ORDER_STATUSES, statusMeta, formatDate } from "@/lib/format";
import { updateOrderStatus, deleteOrder } from "./actions";

export interface OrderItem {
  id: string;
  title: string;
  price_text: string | null;
  quantity: number;
  url: string | null;
  image: string | null;
  platform: string | null;
  variant_title: string | null;
}

export interface Order {
  id: string;
  customer_phone: string | null;
  status: string;
  total_items: number;
  note: string | null;
  created_at: string;
  order_items: OrderItem[];
}

export default function OrderCard({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const meta = statusMeta(status);

  const handleStatusChange = (next: string) => {
    setStatus(next);
    startTransition(async () => {
      await updateOrderStatus(order.id, next);
    });
  };

  const handleDelete = () => {
    if (!confirm("هل تريد حذف هذا الطلب نهائياً؟")) return;
    startTransition(async () => {
      await deleteOrder(order.id);
    });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${meta.color}`}
            >
              {meta.label}
            </span>
            <span className="text-xs text-gray-400">
              #{order.id.slice(0, 8)}
            </span>
          </div>
          <p className="mt-2 text-sm font-semibold text-ink">
            {order.customer_phone ?? "زبون غير مسجّل"}
          </p>
          <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-bold text-ink">
            {order.total_items} قطعة
          </span>
          <select
            value={status}
            disabled={pending}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-brand"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2 text-right text-sm font-semibold text-brand"
      >
        {expanded ? "إخفاء المنتجات ▲" : `عرض المنتجات (${order.order_items.length}) ▼`}
      </button>

      {expanded ? (
        <div className="space-y-3 px-4 pb-4">
          {order.order_items.map((item) => (
            <div
              key={item.id}
              className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-16 w-16 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-200 text-2xl">
                  🛍
                </div>
              )}
              <div className="flex-1">
                <p className="line-clamp-2 text-sm font-medium text-ink">
                  {item.title}
                </p>
                {item.variant_title ? (
                  <p className="text-xs text-gray-500">{item.variant_title}</p>
                ) : null}
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span className="font-bold text-brand">
                    {item.price_text ?? "—"}
                  </span>
                  <span className="text-gray-500">×{item.quantity}</span>
                  {item.platform ? (
                    <span className="text-gray-400">{item.platform}</span>
                  ) : null}
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      الرابط
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleDelete}
            disabled={pending}
            className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
          >
            حذف الطلب
          </button>
        </div>
      ) : null}
    </div>
  );
}
