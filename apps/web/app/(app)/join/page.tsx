"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useEnsureUser } from "@/hooks/use-ensure-user";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@timeo/ui/web";
import { Zap, UserPlus, ArrowRight, Loader2, Check, Building2 } from "lucide-react";

export default function JoinBusinessPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useTimeoWebAuthContext();
  useEnsureUser(!!isSignedIn);
  const joinAsCustomer = useMutation(api.tenants.joinAsCustomer);

  const [slug, setSlug] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Skeleton className="h-96 w-full max-w-lg rounded-2xl" />
      </div>
    );
  }

  if (!isSignedIn) {
    router.push("/sign-in");
    return null;
  }

  const handleJoin = async () => {
    if (!slug.trim()) {
      setError("Business code is required");
      return;
    }

    setJoining(true);
    setError("");

    try {
      const result = await joinAsCustomer({ tenantSlug: slug.trim().toLowerCase() });

      if (result.alreadyMember) {
        setSuccess(true);
        setTimeout(() => router.push("/portal"), 1500);
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/portal"), 1500);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to join business. Check the code and try again.";
      setError(msg);
      setJoining(false);
    }
  };

  if (success) {
    return (
      <div className="mesh-gradient grid-pattern flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-yellow-sm">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Timeo</span>
          </div>
          <Card className="glass border-white/[0.08]">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Welcome aboard!</h2>
              <p className="mt-2 text-muted-foreground">
                You&apos;ve joined successfully. Redirecting...
              </p>
              <div className="mt-6">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-gradient grid-pattern flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary glow-yellow-sm">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">Timeo</span>
        </div>

        <Card className="glass border-white/[0.08]">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              Join a Business
            </CardTitle>
            <p className="mt-2 text-muted-foreground">
              Enter the business code provided by your gym, studio, or service provider.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Business Code
              </label>
              <div className="flex items-center gap-0 rounded-md border border-input bg-background">
                <span className="flex-shrink-0 border-r border-input px-3 py-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </span>
                <input
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  placeholder="e.g. ws-fitness"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  disabled={joining}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask your business for their Timeo code.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleJoin}
              disabled={joining || !slug.trim()}
            >
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  Join Business
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Are you a business owner?{" "}
              <button
                onClick={() => router.push("/onboarding")}
                className="text-primary underline-offset-4 hover:underline"
              >
                Create your business instead
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
