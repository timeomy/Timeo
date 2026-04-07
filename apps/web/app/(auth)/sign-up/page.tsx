"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@timeo/auth/web";
import { Button, Input } from "@timeo/ui/web";
import { Loader2, Mail, Lock, User, Sparkles } from "lucide-react";
import { TimeoLogo } from "@/timeo-logo";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("All fields are required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account");
        setLoading(false);
        return;
      }

      router.push("/post-login");
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div
        className="rounded-2xl border border-white/[0.08] p-8"
        style={{
          background: "rgba(15, 20, 40, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.1), 0 25px 50px -12px rgba(0,0,0,0.8)",
        }}
      >
        {/* Logo + branding */}
        <div className="mb-2 flex flex-col items-center gap-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.2) 100%)",
              border: "1px solid rgba(99,102,241,0.3)",
              boxShadow: "0 0 30px rgba(99,102,241,0.2)",
            }}
          >
            <TimeoLogo size="md" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-400">Create your account</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Get started</h1>
          <p className="mt-1.5 text-sm text-white/40">
            Join Timeo and manage your fitness business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white/70">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                disabled={loading}
                autoComplete="name"
                className="pl-9 transition-colors focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={loading}
                autoComplete="email"
                className="pl-9 transition-colors focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-white/70">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={loading}
                autoComplete="new-password"
                className="pl-9 transition-colors focus-visible:ring-indigo-500/50"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full text-white transition-all"
            style={{
              background: loading ? undefined : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
            }}
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-xs text-white/20">or</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <p className="mt-5 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-white/20">
        Powered by Timeo · Multi-tenant fitness management
      </p>
    </div>
  );
}
