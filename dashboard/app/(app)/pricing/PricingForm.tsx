"use client";

import { useState, useTransition } from "react";
import { updateSettings } from "./actions";

export interface SettingRow {
  key: string;
  value: number;
  description: string | null;
}

const GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "أسعار الصرف والهامش (أمريكا)",
    keys: ["usd_to_iqd", "iqd_markup"],
  },
  {
    title: "أسعار الصرف والشحن (الصين)",
    keys: ["cny_to_usd", "usd_to_iqd_china", "china_shipping_per_kg"],
  },
  {
    title: "أسعار الشحن (دينار)",
    keys: [
      "shipping_regular_per_lb",
      "shipping_perfume_flat",
      "shipping_hazardous_flat",
      "shipping_supplement_per_lb",
      "shipping_supplement_tax",
      "shipping_mobile_flat",
      "shipping_laptop_flat",
    ],
  },
];

export default function PricingForm({ settings }: { settings: SettingRow[] }) {
  const initial: Record<string, number> = {};
  const labels: Record<string, string> = {};
  settings.forEach((s) => {
    initial[s.key] = s.value;
    if (s.description) labels[s.key] = s.description;
  });

  const [values, setValues] = useState<Record<string, number>>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const handleChange = (key: string, raw: string) => {
    const n = parseFloat(raw);
    setValues((v) => ({ ...v, [key]: isNaN(n) ? 0 : n }));
  };

  const handleSave = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await updateSettings(values);
      setMsg(res.error ? `خطأ: ${res.error}` : "تم الحفظ بنجاح ✓");
    });
  };

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div
          key={group.title}
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-4 text-lg font-bold text-ink">{group.title}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.keys.map((key) => (
              <label key={key} className="block">
                <span className="mb-1 block text-sm text-gray-600">
                  {labels[key] ?? key}
                </span>
                <input
                  type="number"
                  step="any"
                  value={values[key] ?? 0}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-left outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  dir="ltr"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={pending}
          className="rounded-xl bg-brand px-8 py-3 font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
        {msg ? (
          <span
            className={`text-sm font-semibold ${
              msg.startsWith("خطأ") ? "text-red-600" : "text-green-600"
            }`}
          >
            {msg}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-gray-400">
        ملاحظة: تُطبّق التغييرات على الباكند خلال دقيقة واحدة كحد أقصى (بسبب
        التخزين المؤقت).
      </p>
    </div>
  );
}
