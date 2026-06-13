"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "فشل تسجيل الدخول");
        return;
      }
      const redirect = params.get("redirect") || "/";
      router.replace(redirect);
      router.refresh();
    } catch {
      setError("حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-white">
            B
          </div>
          <h1 className="text-xl font-extrabold text-ink">لوحة تحكم Box Global</h1>
          <p className="mt-1 text-sm text-gray-500">أدخل كلمة المرور للمتابعة</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="كلمة المرور"
          autoFocus
          className="mb-3 w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
        />

        {error ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-xl bg-brand py-3 font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
        >
          {loading ? "جاري الدخول..." : "دخول"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
