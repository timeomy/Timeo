"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateTenant } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Skeleton,
} from "@timeo/ui/web";
import { Zap, Building2, ArrowRight, Loader2, Check } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useTimeoWebAuthContext();
  const { mutateAsync: createTenant } = useCreateTenant();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 48)
    );
    setError("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Business name is required");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await createTenant({
        name: name.trim(),
        slug: slug.trim(),
      });

      setStep(3);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      const msg = err?.message || "Failed to create business";
      setError(msg);
      setCreating(false);
    }
  };

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

        {/* Step Indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                    ? "w-2 bg-primary/60"
                    : "w-2 bg-white/10"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card className="glass border-white/[0.08]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">
                Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
              </CardTitle>
              <p className="mt-2 text-muted-foreground">
                Let&apos;s set up your business on Timeo.
              </p>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => setStep(2)}
              >
                <Building2 className="h-4 w-4" />
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create business */}
        {step === 2 && (
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-xl">Create Your Business</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your business details to get started.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Business Name
                </label>
                <Input
                  placeholder="e.g. Bella Hair Studio"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={creating}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  URL Slug
                </label>
                <div className="flex items-center gap-0 rounded-md border border-input bg-background">
                  <span className="flex-shrink-0 border-r border-input px-3 py-2 text-sm text-muted-foreground">
                    timeo.my/
                  </span>
                  <input
                    className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                    placeholder="bella-hair-studio"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      setError("");
                    }}
                    disabled={creating}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  This will be your public storefront URL.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setStep(1); setError(""); }}
                  disabled={creating}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 gap-2"
                  size="lg"
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Business
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <Card className="glass border-white/[0.08]">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
              <p className="mt-2 text-muted-foreground">
                Your business is ready. Redirecting to your dashboard...
              </p>
              <div className="mt-6">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
