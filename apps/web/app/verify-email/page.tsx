"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@timeo/auth/web";
import { Loader2, Mail, RefreshCw } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"idle" | "verifying" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend() {
    if (!email || resendStatus === "sending") return;
    setResendStatus("sending");
    await authClient.sendVerificationEmail({ email, callbackURL: "/" }).catch(() => null);
    setResendStatus("sent");
    setTimeout(() => setResendStatus("idle"), 5000);
  }

  useEffect(() => {
    if (!token) return;

    setStatus("verifying");

    authClient
      .verifyEmail({ query: { token } })
      .then((result) => {
        if (result.error) {
          setErrorMessage(result.error.message ?? "Verification failed. The link may have expired.");
          setStatus("error");
          return;
        }
        setStatus("done");
        setTimeout(() => router.push("/post-login"), 1500);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Verification failed. Please try again.";
        setErrorMessage(message);
        setStatus("error");
      });
  }, [token, router]);

  // Auto-verify flow: token is present in URL
  if (token) {
    if (status === "idle" || status === "verifying") {
      return (
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <h1 className="text-2xl font-bold">Verifying your email…</h1>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your email address.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (status === "done") {
      return (
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold">Email verified!</h1>
              <p className="text-sm text-muted-foreground">
                Your email has been verified. Redirecting you now…
              </p>
            </div>
          </div>
        </div>
      );
    }

    // status === "error"
    return (
      <div className="w-full max-w-md">
        <div className="rounded-xl border bg-card p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Mail className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold">Verification failed</h1>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground">
              Please go back to sign in and request a new verification link.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No token in URL — "check your email" confirmation page
  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We&apos;ve sent a verification link to your email. Click it to activate your account.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isDev && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-center text-xs text-yellow-600 dark:text-yellow-400">
              <strong>Dev mode:</strong> Check the API server terminal for the verification link.
            </div>
          )}

          {email ? (
            <button
              onClick={handleResend}
              disabled={resendStatus === "sending" || resendStatus === "sent"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              {resendStatus === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {resendStatus === "sent" ? "Email sent — check your terminal" : "Resend verification email"}
            </button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Didn&apos;t receive it? Check your spam folder.
            </p>
          )}

          <div className="border-t pt-4 text-center">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
