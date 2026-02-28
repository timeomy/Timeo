"use client";

import { useState, useEffect } from "react";
import { useTenant, useUpdateTenantSettings, useUpdateTenantBranding } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Button,
  Input,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Skeleton,
  Separator,
} from "@timeo/ui/web";
import {
  Building2,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  Image,
} from "lucide-react";

const PLAN_BADGE_VARIANTS: Record<string, string> = {
  free: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-primary/20 text-primary border-primary/30",
  enterprise: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  trial: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function SettingsPage() {
  const { tenantId } = useTenantId();

  const { data: tenant, isLoading } = useTenant(tenantId ?? "");

  const { mutateAsync: updateTenant } = useUpdateTenantSettings(tenantId ?? "");
  const { mutateAsync: updateBranding } = useUpdateTenantBranding(tenantId ?? "");

  // General form state
  const [businessName, setBusinessName] = useState("");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // Branding form state
  const [primaryColor, setPrimaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.name || "");
      setPrimaryColor(tenant.branding?.primaryColor || "");
      setLogoUrl(tenant.branding?.logoUrl || "");
    }
  }, [tenant]);

  async function handleSaveGeneral() {
    if (!tenantId) return;
    setGeneralSaving(true);
    setGeneralSuccess(false);
    try {
      await updateTenant({
        name: businessName,
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update settings.");
    } finally {
      setGeneralSaving(false);
    }
  }

  async function handleSaveBranding() {
    if (!tenantId) return;
    setBrandingSaving(true);
    setBrandingSuccess(false);
    try {
      await updateBranding({
        branding: {
          primaryColor: primaryColor || undefined,
          logoUrl: logoUrl || undefined,
        },
      });
      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  const loading = isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your business settings and branding.
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
              <CardDescription>
                Basic details about your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Business Name</label>
                    <Input
                      value={businessName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBusinessName(e.target.value)
                      }
                      placeholder="Your business name"
                    />
                  </div>

                  <Separator className="bg-white/[0.06]" />

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Plan
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          PLAN_BADGE_VARIANTS[tenant?.plan || "free"] ||
                          PLAN_BADGE_VARIANTS.free
                        }
                      >
                        {(tenant?.plan || "free").charAt(0).toUpperCase() +
                          (tenant?.plan || "free").slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Status
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_VARIANTS[tenant?.status || "active"] ||
                          STATUS_BADGE_VARIANTS.active
                        }
                      >
                        {(tenant?.status || "active").charAt(0).toUpperCase() +
                          (tenant?.status || "active").slice(1)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Slug
                      </p>
                      <p className="text-sm font-mono text-muted-foreground">
                        {tenant?.slug || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">
                        Created
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tenant?.createdAt
                          ? new Date(tenant.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            {!loading && (
              <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
                {generalSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Settings saved
                  </div>
                )}
                {!generalSuccess && <div />}
                <Button
                  onClick={handleSaveGeneral}
                  disabled={generalSaving || !businessName.trim()}
                  className="gap-2"
                >
                  {generalSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {generalSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Brand Appearance</CardTitle>
              <CardDescription>
                Customize how your storefront looks to customers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={primaryColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPrimaryColor(e.target.value)
                        }
                        placeholder="#FACC15"
                        className="font-mono"
                      />
                      {primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) && (
                        <div
                          className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.06]"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter a hex color code (e.g. #FACC15)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo URL</label>
                    <div className="flex items-center gap-3">
                      <Input
                        value={logoUrl}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLogoUrl(e.target.value)
                        }
                        placeholder="https://example.com/logo.png"
                      />
                      {logoUrl && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03]">
                          <Image className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>

                </>
              )}
            </CardContent>
            {!loading && (
              <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
                {brandingSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Branding saved
                  </div>
                )}
                {!brandingSuccess && <div />}
                <Button
                  onClick={handleSaveBranding}
                  disabled={brandingSaving}
                  className="gap-2"
                >
                  {brandingSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {brandingSaving ? "Saving..." : "Save Branding"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
