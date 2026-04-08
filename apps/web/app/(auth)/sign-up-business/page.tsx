"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError, useCreateTenant } from "@timeo/api-client";
import { authClient, useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { Button, Input, Skeleton } from "@timeo/ui/web";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  User,
} from "lucide-react";
import { TimeoLogo } from "@/timeo-logo";

type TenantIndustry =
  | "fitness"
  | "salon_beauty"
  | "wellness_spa"
  | "sports_recreation"
  | "clinic"
  | "retail"
  | "food_beverage"
  | "education"
  | "professional_services"
  | "other";

type TenantPlan = "free" | "starter" | "pro" | "enterprise";

const INDUSTRY_OPTIONS: Array<{
  value: TenantIndustry;
  label: string;
  description: string;
}> = [
  {
    value: "fitness",
    label: "Gym & Fitness",
    description: "Studios, gyms, PT, classes",
  },
  {
    value: "salon_beauty",
    label: "Salon & Beauty",
    description: "Hair, nails, beauty services",
  },
  {
    value: "wellness_spa",
    label: "Wellness & Spa",
    description: "Massage, therapy, recovery",
  },
  {
    value: "sports_recreation",
    label: "Sports & Recreation",
    description: "Courts, training centers, clubs",
  },
  {
    value: "clinic",
    label: "Clinic",
    description: "Consultation-led businesses",
  },
  {
    value: "retail",
    label: "Retail",
    description: "Products-first storefronts",
  },
  {
    value: "food_beverage",
    label: "Food & Beverage",
    description: "Cafes and F&B operators",
  },
  {
    value: "education",
    label: "Education",
    description: "Coaching, courses, workshops",
  },
  {
    value: "professional_services",
    label: "Professional Services",
    description: "Consulting and client services",
  },
  {
    value: "other",
    label: "Other",
    description: "A different business model",
  },
];

const PLAN_OPTIONS: Array<{
  value: TenantPlan;
  label: string;
  price: string;
  description: string;
}> = [
  {
    value: "free",
    label: "Free",
    price: "RM0",
    description: "Get started with core features",
  },
  {
    value: "starter",
    label: "Starter",
    price: "RM99/mo",
    description: "Best for growing local businesses",
  },
  {
    value: "pro",
    label: "Pro",
    price: "RM299/mo",
    description: "Advanced workflows and analytics",
  },
  {
    value: "enterprise",
    label: "Enterprise",
    price: "Custom",
    description: "Scale with custom operations support",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export default function SignUpBusinessPage() {
  const router = useRouter();
  const { mutateAsync: createTenant } = useCreateTenant();
  const { isLoaded, isSignedIn, user } = useTimeoWebAuthContext();
  const { tenants, isLoading: tenantsLoading } = useTimeoWebTenantContext();

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");

  const [industry, setIndustry] = useState<TenantIndustry>("fitness");
  const [plan, setPlan] = useState<TenantPlan>("starter");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const detectedTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur";
    } catch {
      return "Asia/Kuala_Lumpur";
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || tenantsLoading) return;

    if (isSignedIn && tenants.length > 0) {
      router.replace("/dashboard");
      return;
    }

    if (isSignedIn && user?.name && !ownerName) {
      setOwnerName(user.name);
    }

    if (isSignedIn && user?.email && !ownerEmail) {
      setOwnerEmail(user.email);
    }
  }, [
    isLoaded,
    isSignedIn,
    ownerEmail,
    ownerName,
    router,
    tenants,
    tenantsLoading,
    user?.email,
    user?.name,
  ]);

  if (!isLoaded || tenantsLoading) {
    return (
      <div className="w-full max-w-3xl">
        <Skeleton className="h-[620px] w-full rounded-2xl" />
      </div>
    );
  }

  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1) {
      if (!businessName.trim()) {
        setError("Business name is required");
        return false;
      }

      if (!slug.trim()) {
        setError("Business URL is required");
        return false;
      }

      if (slug.length < 3 || slug.length > 50 || !/^[a-z0-9-]+$/.test(slug)) {
        setError("Business URL must be 3-50 chars and use a-z, 0-9, or -");
        return false;
      }

      if (!isSignedIn) {
        if (!ownerName.trim() || !ownerEmail.trim() || !password) {
          setError("Owner name, email, and password are required");
          return false;
        }

        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          return false;
        }
      }
    }

    if (targetStep === 2 && !industry) {
      setError("Please select your industry");
      return false;
    }

    if (targetStep === 3 && !plan) {
      setError("Please select a plan");
      return false;
    }

    setError("");
    return true;
  };

  const handleContinue = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, 3));
  };

  const handleBack = () => {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleFinish = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (!isSignedIn) {
        const signUpResult = await authClient.signUp.email({
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          password,
        });

        if (signUpResult.error) {
          setError(signUpResult.error.message || "Failed to create owner account");
          setSubmitting(false);
          return;
        }
      }

      await createTenant({
        name: businessName.trim(),
        slug: slug.trim(),
        industry,
        plan,
        currency: "MYR",
        timezone: detectedTimezone,
      });

      window.location.assign("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setStep(1);
        setError("This business URL is already taken. Try another one.");
        setSubmitting(false);
        return;
      }

      if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
        setError("Account created. Please sign in to complete onboarding.");
        setSubmitting(false);
        router.push("/sign-in?redirect=/sign-up-business");
        return;
      }

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unable to complete setup. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl">
      <div
        className="rounded-2xl border border-white/[0.08] p-8"
        style={{
          background: "rgba(15, 20, 40, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 0 0 1px rgba(99,102,241,0.1), 0 25px 50px -12px rgba(0,0,0,0.8)",
        }}
      >
        <div className="mb-3 flex flex-col items-center gap-3">
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
            <span className="text-xs font-semibold text-indigo-400">Business onboarding</span>
          </div>
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Create your business on Timeo</h1>
          <p className="mt-1.5 text-sm text-white/40">
            Set up your owner account, business profile, and plan in minutes.
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((currentStep) => (
            <div
              key={currentStep}
              className={`h-2 rounded-full transition-all ${
                currentStep === step
                  ? "w-10 bg-indigo-500"
                  : currentStep < step
                    ? "w-6 bg-indigo-400/70"
                    : "w-6 bg-white/15"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            {!isSignedIn ? (
              <>
                <div>
                  <label htmlFor="owner-name" className="mb-1.5 block text-sm font-medium text-white/70">
                    Owner name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="owner-name"
                      type="text"
                      placeholder="Jane Founder"
                      value={ownerName}
                      onChange={(e) => {
                        setOwnerName(e.target.value);
                        setError("");
                      }}
                      disabled={submitting}
                      autoComplete="name"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="owner-email" className="mb-1.5 block text-sm font-medium text-white/70">
                    Owner email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="owner-email"
                      type="email"
                      placeholder="you@business.com"
                      value={ownerEmail}
                      onChange={(e) => {
                        setOwnerEmail(e.target.value);
                        setError("");
                      }}
                      disabled={submitting}
                      autoComplete="email"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="owner-password" className="mb-1.5 block text-sm font-medium text-white/70">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="owner-password"
                      type="password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      disabled={submitting}
                      autoComplete="new-password"
                      className="pl-9"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                Signed in as <span className="font-semibold">{user?.email}</span>. We&apos;ll attach this business to your account.
              </div>
            )}

            <div>
              <label htmlFor="business-name" className="mb-1.5 block text-sm font-medium text-white/70">
                Business name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <Input
                  id="business-name"
                  type="text"
                  placeholder="Iron Paradise Gym"
                  value={businessName}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setBusinessName(nextName);
                    if (!slugEdited) {
                      setSlug(slugify(nextName));
                    }
                    setError("");
                  }}
                  disabled={submitting}
                  autoComplete="organization"
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="business-slug" className="mb-1.5 block text-sm font-medium text-white/70">
                Business URL
              </label>
              <div className="flex items-center overflow-hidden rounded-md border border-input bg-background">
                <span className="border-r border-input px-3 py-2 text-sm text-white/45">timeo.my/</span>
                <input
                  id="business-slug"
                  className="w-full bg-transparent px-3 py-2 text-sm text-white outline-none"
                  placeholder="iron-paradise"
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50));
                    setError("");
                  }}
                  disabled={submitting}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {INDUSTRY_OPTIONS.map((option) => {
              const selected = industry === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setIndustry(option.value);
                    setError("");
                  }}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-semibold text-white">{option.label}</p>
                    {selected && <Check className="h-4 w-4 text-indigo-400" />}
                  </div>
                  <p className="text-sm text-white/55">{option.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {PLAN_OPTIONS.map((option) => {
              const selected = plan === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setPlan(option.value);
                    setError("");
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition-all ${
                    selected
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{option.label}</p>
                      <p className="text-sm text-white/55">{option.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-indigo-300">{option.price}</p>
                      {selected && (
                        <p className="mt-1 text-xs text-emerald-300">Selected</p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/55">
              <div className="mb-1 flex items-center gap-2 text-white/70">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">What happens next</span>
              </div>
              <p>
                We&apos;ll create your owner account, provision your tenant, seed default settings, and take you straight to the dashboard.
              </p>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <Link href="/sign-in" className="text-sm text-white/45 hover:text-white/70">
              Already have an account? Sign in
            </Link>
          )}

          {step < 3 ? (
            <Button
              type="button"
              onClick={handleContinue}
              disabled={submitting}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              className="gap-2 bg-indigo-600 hover:bg-indigo-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Launch dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
