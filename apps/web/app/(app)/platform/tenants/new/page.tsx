"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
} from "@timeo/ui/web";
import {
  Building2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";

const planOptions = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

const countryOptions = [
  { label: "Malaysia (MY)", value: "MY" },
  { label: "Singapore (SG)", value: "SG" },
  { label: "Thailand (TH)", value: "TH" },
  { label: "Indonesia (ID)", value: "ID" },
  { label: "Philippines (PH)", value: "PH" },
];

const currencyOptions = [
  { label: "MYR — Malaysian Ringgit", value: "MYR" },
  { label: "SGD — Singapore Dollar", value: "SGD" },
  { label: "THB — Thai Baht", value: "THB" },
  { label: "IDR — Indonesian Rupiah", value: "IDR" },
  { label: "PHP — Philippine Peso", value: "PHP" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateTenantPayload {
  name: string;
  slug: string;
  plan: string;
  ownerEmail: string;
  country: string;
  currency: string;
}

export default function CreateTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutateAsync: createTenant } = useMutation({
    mutationFn: (data: CreateTenantPayload) =>
      api.post<{ id: string }>("/api/platform/tenants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "tenants"] });
    },
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [plan, setPlan] = useState("free");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [country, setCountry] = useState("MY");
  const [currency, setCurrency] = useState("MYR");
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
    setError("");
  };

  const handleSlugChange = (value: string) => {
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 48),
    );
    setSlugEdited(true);
    setError("");
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Business name is required.";
    if (!slug.trim()) return "Slug is required.";
    if (slug.length < 3) return "Slug must be at least 3 characters.";
    if (slug.length > 1 && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
      return "Slug must start and end with a letter or number.";
    }
    if (!ownerEmail.trim()) return "Owner email is required.";
    if (!EMAIL_RE.test(ownerEmail.trim())) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  const handleCreate = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    setError("");

    try {
      const result = await createTenant({
        name: name.trim(),
        slug: slug.trim(),
        plan,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        country,
        currency,
      });
      const id = (result as { id: string }).id ?? null;
      setCreatedId(id);
      setTimeout(
        () => router.push(id ? `/platform/tenants/${id}` : "/platform/tenants"),
        1500,
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to create tenant.",
      );
      setCreating(false);
    }
  };

  if (createdId !== null || (creating && !error)) {
    if (createdId !== null) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="glass w-full max-w-lg border-white/[0.08]">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Tenant Created</h2>
              <p className="mt-2 text-muted-foreground">
                Redirecting to tenant detail page...
              </p>
              <div className="mt-6">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/platform/tenants")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Tenant</h1>
          <p className="mt-1 text-muted-foreground">
            Onboard a new business onto the platform.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-lg">
        <Card className="glass border-white/[0.08]">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-center text-xl">
              Business Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input
              label="Business Name"
              placeholder="e.g. Bella Hair Studio"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={creating}
            />

            {/* Slug */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                URL Slug
              </label>
              <div className="flex items-center overflow-hidden rounded-xl border border-input bg-background">
                <span className="flex-shrink-0 border-r border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                  timeo.my/
                </span>
                <input
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="bella-hair-studio"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  disabled={creating}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Public storefront URL. Only lowercase letters, numbers, and
                hyphens.
              </p>
            </div>

            <Input
              label="Owner Email"
              type="email"
              placeholder="owner@example.com"
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setError("");
              }}
              disabled={creating}
            />
            <p className="-mt-3 text-xs text-muted-foreground">
              The owner must have an existing account. They will be assigned as
              tenant admin.
            </p>

            <Select
              label="Plan"
              options={planOptions}
              value={plan}
              onChange={setPlan}
              disabled={creating}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Country"
                options={countryOptions}
                value={country}
                onChange={setCountry}
                disabled={creating}
              />
              <Select
                label="Currency"
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
                disabled={creating}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/platform/tenants")}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCreate}
                disabled={creating || !name.trim() || !ownerEmail.trim()}
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Tenant
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
