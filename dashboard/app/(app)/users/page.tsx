import { supabaseAdmin } from "@/lib/supabase";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  phone: string;
  created_at: string;
  last_sign_in_at: string | null;
}

async function getUsers(): Promise<UserRow[]> {
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    return (data?.users ?? []).map((u) => ({
      id: u.id,
      phone:
        (u.user_metadata?.phone as string) ??
        u.phone ??
        u.email?.replace("@phone.boxglobal.app", "") ??
        "—",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }));
  } catch {
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink">المستخدمون</h1>
        <span className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-ink shadow-sm">
          {formatNumber(users.length)} مستخدم
        </span>
      </div>

      {users.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          لا يوجد مستخدمون
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-3 font-semibold">رقم الهاتف</th>
                <th className="px-5 py-3 font-semibold">تاريخ التسجيل</th>
                <th className="px-5 py-3 font-semibold">آخر دخول</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-semibold text-ink" dir="ltr">
                    {u.phone}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {formatDate(u.last_sign_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
