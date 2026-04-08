"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@timeo/auth/web";
import { Button, Input } from "@timeo/ui/web";
import { Loader2 } from "lucide-react";
import { TimeoIcon } from "@/timeo-logo";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/post-login";
  const redirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/post-login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(redirect);
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-8 flex justify-center">
        <TimeoIcon size={72} />
      </div>

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold text-white">Sign in to Timeo</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm text-white/60">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            disabled={loading}
            autoComplete="email"
            className="h-11 bg-white/[0.06] border-white/[0.1] focus-visible:ring-[#0066FF]/50"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm text-white/60">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-white/40 hover:text-white/60">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            disabled={loading}
            autoComplete="current-password"
            className="h-11 bg-white/[0.06] border-white/[0.1] focus-visible:ring-[#0066FF]/50"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        <Button
          type="submit"
          className="w-full h-11 bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/30">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up-business" className="text-[#0066FF] hover:text-[#3388FF]">
          Start your business
        </Link>
      </p>
    </div>
  );
}
