"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePlatformTenant } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
} from "@timeo/ui/web";
import { ArrowLeft, Building2, Check } from "lucide-react";

const PLAN_OPTIONS = [
  { label: "Free", value: "free" },
  { label: "Starter", value: "starter" },
  { label: "Pro", value: "pro" },
  { label: "Enterprise", value: "enterprise" },
];

export default function OnboardTenantPage() {
  const router = useRouter();
  const createTenant = useCreatePlatformTenant();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim() || !ownerEmail.trim()) {
      setError("All fields are required.");
      return;
    }

    try {
      await createTenant.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        ownerEmail: ownerEmail.trim(),
        plan,
      });
      router.push("/admin/tenants");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create tenant.";
      setError(message);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push("/admin/tenants")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Onboard New Tenant</h1>
        <p className="mt-1 text-muted-foreground">
          Register a new business on the Timeo platform.
        </p>
      </div>

      <Card className="glass border-white/[0.08] max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Details
          </CardTitle>
          <CardDescription>
            Fill in the details to create a new tenant account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Name</label>
              <Input
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleNameChange(e.target.value)
                }
                placeholder="e.g. FitZone Gym KL"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug</label>
              <Input
                value={slug}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSlug(e.target.value)
                }
                placeholder="e.g. fitzone-gym-kl"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: {slug || "your-slug"}.timeo.my
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Admin Email</label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setOwnerEmail(e.target.value)
                }
                placeholder="admin@fitzone.my"
              />
            </div>

            <Select
              label="Plan"
              options={PLAN_OPTIONS}
              value={plan}
              onChange={setPlan}
            />

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={createTenant.isPending}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              {createTenant.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
