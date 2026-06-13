export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-IQ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("en");
}

export const ORDER_STATUSES = [
  { value: "new", label: "جديد", color: "bg-blue-100 text-blue-700" },
  { value: "confirmed", label: "مؤكد", color: "bg-amber-100 text-amber-700" },
  { value: "shipping", label: "قيد الشحن", color: "bg-purple-100 text-purple-700" },
  { value: "delivered", label: "تم التوصيل", color: "bg-green-100 text-green-700" },
  { value: "cancelled", label: "ملغي", color: "bg-red-100 text-red-700" },
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number]["value"];

export function statusMeta(value: string) {
  return ORDER_STATUSES.find((s) => s.value === value) ?? ORDER_STATUSES[0];
}
