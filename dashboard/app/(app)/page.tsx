import { supabaseAdmin } from "@/lib/supabase";
import { formatNumber, statusMeta, ORDER_STATUSES } from "@/lib/format";

export const dynamic = "force-dynamic";

async function countRows(table: string, filter?: { col: string; val: string }) {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter.col, filter.val);
  const { count } = await q;
  return count ?? 0;
}

async function getStats() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalOrders, totalSearches, recentSearches] = await Promise.all([
    countRows("orders"),
    countRows("search_events"),
    supabaseAdmin
      .from("search_events")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since)
      .then((r) => r.count ?? 0),
  ]);

  const statusCounts: Record<string, number> = {};
  await Promise.all(
    ORDER_STATUSES.map(async (s) => {
      statusCounts[s.value] = await countRows("orders", {
        col: "status",
        val: s.value,
      });
    })
  );

  // Users (auth) — fetch a page to estimate total
  let usersCount = 0;
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    usersCount = data?.users?.length ?? 0;
  } catch {
    usersCount = 0;
  }

  return { totalOrders, totalSearches, recentSearches, statusCounts, usersCount };
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

export default async function OverviewPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-extrabold text-ink">نظرة عامة</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={formatNumber(stats.totalOrders)} />
        <StatCard
          label="طلبات جديدة"
          value={formatNumber(stats.statusCounts["new"])}
          hint="بانتظار المراجعة"
        />
        <StatCard label="المستخدمون" value={formatNumber(stats.usersCount)} />
        <StatCard
          label="عمليات البحث"
          value={formatNumber(stats.totalSearches)}
          hint={`${formatNumber(stats.recentSearches)} خلال 7 أيام`}
        />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-ink">الطلبات حسب الحالة</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {ORDER_STATUSES.map((s) => {
          const meta = statusMeta(s.value);
          return (
            <div
              key={s.value}
              className="rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm"
            >
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${meta.color}`}
              >
                {s.label}
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink">
                {formatNumber(stats.statusCounts[s.value])}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
