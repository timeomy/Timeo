"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
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
import { Zap, Building2, ArrowRight, Loader2, Check, Link2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useTimeoWebAuthContext();
  const { createOrganization, setActive } = useOrganizationList();
  const { organization } = useOrganization();
  const linkTenant = useMutation(api.tenants.linkToClerkOrg);
  const createTenant = useMutation(api.tenants.createFromClerk);

  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"create" | "link">("create");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [linkSlug, setLinkSlug] = useState("");
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

  // Link existing Convex tenant to current Clerk org
  const handleLink = async () => {
    if (!linkSlug.trim()) {
      setError("Business slug is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // If user has no active org, create one first
      let orgId = organization?.id;
      if (!orgId) {
        const org = await createOrganization?.({ name: linkSlug.trim() });
        if (org) {
          await setActive?.({ organization: org.id });
          orgId = org.id;
          // Wait for token to propagate
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (!orgId) {
        setError("Failed to get organization. Please try again.");
        setCreating(false);
        return;
      }

      // Retry linkTenant until auth token propagates
      let lastError: any;
      for (let i = 0; i < 5; i++) {
        try {
          await linkTenant({ tenantSlug: linkSlug.trim().toLowerCase(), clerkOrgId: orgId });
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          if (!err?.message?.includes("Not authenticated")) throw err;
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
      if (lastError) throw lastError;

      setStep(3);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.message || "Failed to link business";
      setError(msg);
      setCreating(false);
    }
  };

  // Create brand new business
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
      const org = await createOrganization?.({ name: name.trim() });
      if (org) {
        await setActive?.({ organization: org.id });
        // Wait for Convex auth token to refresh
        let lastError: any;
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
          try {
            await createTenant({
              clerkOrgId: org.id,
              name: name.trim(),
              slug: slug.trim(),
            });
            lastError = null;
            break;
          } catch (err: any) {
            lastError = err;
            if (!err?.message?.includes("Not authenticated")) throw err;
          }
        }
        if (lastError) throw lastError;
      }
      setStep(3);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.message || "Failed to create business";
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
                Welcome{user?.firstName ? `, ${user.firstName}` : ""}!
              </CardTitle>
              <p className="mt-2 text-muted-foreground">
                Set up a business on Timeo or link to an existing one.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => { setMode("create"); setStep(2); }}
              >
                <Building2 className="h-4 w-4" />
                Create New Business
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                size="lg"
                onClick={() => { setMode("link"); setStep(2); }}
              >
                <Link2 className="h-4 w-4" />
                Link Existing Business
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Link existing business */}
        {step === 2 && mode === "link" && (
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-xl">Link Existing Business</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter the business slug to connect your account to an existing business on Timeo.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Business Slug
                </label>
                <div className="flex items-center gap-0 rounded-md border border-input bg-background">
                  <span className="flex-shrink-0 border-r border-input px-3 py-2 text-sm text-muted-foreground">
                    timeo.my/
                  </span>
                  <input
                    className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                    placeholder="ws-fitness"
                    value={linkSlug}
                    onChange={(e) => {
                      setLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                      setError("");
                    }}
                    disabled={creating}
                  />
                </div>
              </div>

              {organization && (
                <p className="text-xs text-muted-foreground">
                  This will link your organization &ldquo;{organization.name}&rdquo; to this business.
                </p>
              )}

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
                  onClick={handleLink}
                  disabled={creating || !linkSlug.trim()}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      Link Business
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Create new business */}
        {step === 2 && mode === "create" && (
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
