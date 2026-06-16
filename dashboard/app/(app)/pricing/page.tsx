import { supabaseAdmin } from "@/lib/supabase";
import PricingForm, { SettingRow } from "./PricingForm";

export const dynamic = "force-dynamic";

async function getSettings(): Promise<SettingRow[]> {
  const { data } = await supabaseAdmin
    .from("settings")
    .select("key, value, description")
    .order("key");
  return (data ?? []) as SettingRow[];
}

export default async function PricingPage() {
  const settings = await getSettings();

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-extrabold text-ink">الأسعار</h1>
      <p className="mb-6 text-sm text-gray-500">
        تحكّم بأسعار الصرف وهوامش الربح وأسعار الشحن المستخدمة في حساب السعر
        النهائي.
      </p>
      {settings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          لم يتم العثور على إعدادات. تأكد من تشغيل سكربت قاعدة البيانات.
        </div>
      ) : (
        <PricingForm settings={settings} />
      )}
    </div>
  );
}
