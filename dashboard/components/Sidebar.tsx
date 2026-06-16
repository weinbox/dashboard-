"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "نظرة عامة", icon: "📊" },
  { href: "/orders", label: "الطلبات", icon: "🛍" },
  { href: "/pricing", label: "الأسعار", icon: "💰" },
  { href: "/users", label: "المستخدمون", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="flex w-60 flex-col border-l border-gray-200 bg-ink text-white">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-black">
          B
        </div>
        <div>
          <p className="text-sm font-extrabold leading-tight">Box Global</p>
          <p className="text-xs text-gray-400">لوحة التحكم</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-brand text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="m-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:bg-red-500/80 hover:text-white"
      >
        تسجيل الخروج
      </button>
    </aside>
  );
}
