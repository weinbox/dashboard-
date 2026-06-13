import { NextResponse } from "next/server";
import { SESSION_COOKIE, getAdminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };

  if (!password || password !== getAdminPassword()) {
    return NextResponse.json(
      { error: "كلمة المرور غير صحيحة" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
