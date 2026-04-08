import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

type MinePayload = {
  platformRole: "platform_admin" | "user";
};

async function getPlatformRole(): Promise<"platform_admin" | "user" | null> {
  const cookieStore = cookies();
  const sessionToken =
    cookieStore.get("better-auth.session_token")?.value ??
    cookieStore.get("__Secure-better-auth.session_token")?.value;

  if (!sessionToken) return null;

  const requestHeaders = headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const proto = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!host) return null;

  try {
    const response = await fetch(`${proto}://${host}/api/tenants/mine`, {
      headers: {
        cookie: cookieStore.toString(),
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as
      | { success: true; data: MinePayload }
      | { success: false; error: { code: string; message: string } };

    if (!payload || payload.success !== true) return null;
    return payload.data.platformRole;
  } catch {
    return null;
  }
}

export default async function AdminGuardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const platformRole = await getPlatformRole();

  if (!platformRole) {
    redirect("/sign-in?redirect=/admin");
  }

  if (platformRole !== "platform_admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
