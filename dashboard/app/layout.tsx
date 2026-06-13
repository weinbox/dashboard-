import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة تحكم Box Global",
  description: "لوحة الإدارة الخاصة بتطبيق Box Global",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
