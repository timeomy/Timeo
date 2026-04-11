"use client";

import { useState, useEffect, useRef } from "react";
import {
  useTenant,
  useUpdateTenantSettings,
  useUpdateTenantBranding,
  useUploadFile,
} from "@timeo/api-client";
import { authClient } from "@timeo/auth/web";
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
  Shield,
  AlertCircle,
  Clock,
  Plus,
  Trash2,
  CreditCard,
  FileText,
  Bell,
  Smartphone,
  Building,
  Key,
  MessageSquare,
  ToggleRight,
} from "lucide-react";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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

function PasswordChangeCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = newPassword === confirmPassword;
  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    passwordsMatch;

  async function handleChangePassword() {
    if (!isValid) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (res.error) {
        setError(res.error.message || "Failed to change password.");
        return;
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 5000);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Change Password</CardTitle>
        <CardDescription>
          Update your account password. Use a strong password with at least 8
          characters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Password</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCurrentPassword(e.target.value)
            }
            placeholder="Enter current password"
          />
        </div>

        <Separator className="bg-white/[0.06]" />

        <div className="space-y-2">
          <label className="text-sm font-medium">New Password</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setNewPassword(e.target.value)
            }
            placeholder="Enter new password (min 8 characters)"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm New Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(e.target.value)
            }
            placeholder="Confirm new password"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              Passwords do not match
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
        {success ? (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Password changed successfully
          </div>
        ) : (
          <div />
        )}
        <Button
          onClick={handleChangePassword}
          disabled={saving || !isValid}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Shield className="h-4 w-4" />
          )}
          {saving ? "Changing..." : "Change Password"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function SettingsPage() {
  const { tenantId } = useTenantId();

  const { data: tenant, isLoading } = useTenant(tenantId ?? "");

  const { mutateAsync: updateTenant } = useUpdateTenantSettings(tenantId ?? "");
  const { mutateAsync: updateBranding } = useUpdateTenantBranding(tenantId ?? "");
  const { mutateAsync: uploadFile, isPending: logoUploading } = useUploadFile(
    tenantId ?? "",
  );
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // General form state
  const [businessName, setBusinessName] = useState("");
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);

  // Branding form state
  const [primaryColor, setPrimaryColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoValidationError, setLogoValidationError] = useState("");
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  // Locale settings state
  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState("");

  const displayedLogoUrl = logoPreviewUrl ?? logoUrl;

  useEffect(
    () => () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    },
    [logoPreviewUrl],
  );

  useEffect(() => {
    setLogoLoadError(false);
  }, [displayedLogoUrl]);

  // Populate form when tenant data loads
  useEffect(() => {
    if (tenant) {
      const branding = (tenant.branding ?? {}) as Record<string, unknown>;
      const nestedBranding = (branding.branding ?? {}) as Record<
        string,
        unknown
      >;

      setBusinessName(tenant.name || "");
      setPrimaryColor(
        (branding.primaryColor as string | undefined) ??
          (nestedBranding.primaryColor as string | undefined) ??
          "",
      );
      setLogoUrl(
        (branding.logoUrl as string | undefined) ??
          (nestedBranding.logoUrl as string | undefined) ??
          tenant.logoUrl ??
          tenant.logo ??
          "",
      );
      setTimezone((tenant as unknown as { timezone?: string }).timezone || "");
      setCurrency(
        (branding.currency as string | undefined) ??
          (nestedBranding.currency as string | undefined) ??
          "",
      );
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoValidationError("");
    }
  }, [tenant]);

  function handleSelectLogoClick() {
    logoInputRef.current?.click();
  }

  function handleLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setLogoValidationError("");
      return;
    }

    const validMimeTypes = ["image/jpeg", "image/png", "image/svg+xml"];
    if (!validMimeTypes.includes(file.type)) {
      setLogoValidationError("Please upload a JPG, PNG, or SVG file.");
      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      event.currentTarget.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedLogoFile(file);
    setLogoPreviewUrl(preview);
    setLogoValidationError("");
    setLogoLoadError(false);
    event.currentTarget.value = "";
  }

  async function handleSaveGeneral() {
    if (!tenantId) return;
    setGeneralSaving(true);
    setGeneralSuccess(false);
    try {
      await updateTenant({
        name: businessName,
        timezone: timezone || undefined,
      });
      if (primaryColor || logoUrl || currency) {
        await updateBranding({
          primaryColor: primaryColor || undefined,
          logoUrl: logoUrl.trim() ? logoUrl : null,
          currency: currency || undefined,
        });
      }
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
      let nextLogoUrl = logoUrl;

      if (selectedLogoFile) {
        const uploadResult = await uploadFile(selectedLogoFile);
        nextLogoUrl = uploadResult.url;
        setLogoUrl(nextLogoUrl);
      }

      await updateBranding({
        primaryColor: primaryColor || undefined,
        logoUrl: nextLogoUrl.trim() ? nextLogoUrl : null,
      });

      setSelectedLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoValidationError("");
      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update branding.");
    } finally {
      setBrandingSaving(false);
    }
  }

  const { activeRole } = useTimeoWebAuthContext();
  const isCoach = activeRole === "coach";
  const queryClient = useQueryClient();

  const { data: availability = [], isLoading: availLoading } = useQuery({
    queryKey: ["coach", tenantId, "availability"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : [];
    },
    enabled: !!tenantId && isCoach,
  });

  const saveAvailability = useMutation({
    mutationFn: async (slot: { day_of_week: number; start_time: string; end_time: string }) => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify(slot),
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "availability"] }),
  });

  const deleteAvailability = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/availability/${id}`, { method: "DELETE", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "availability"] }),
  });

  const [newSlotDay, setNewSlotDay] = useState(1);
  const [newSlotStart, setNewSlotStart] = useState("09:00");
  const [newSlotEnd, setNewSlotEnd] = useState("17:00");

  const loading = isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          {isCoach ? "Manage your availability and profile." : "Manage your business settings and branding."}
        </p>
      </div>

      <Tabs defaultValue={isCoach ? "availability" : "general"} className="space-y-6">
        <TabsList>
          {!isCoach && (
            <>
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="branding" className="gap-2">
                <Palette className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="einvoicing" className="gap-2">
                <FileText className="h-4 w-4" />
                E-Invoicing
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Notifications
              </TabsTrigger>
            </>
          )}
          {isCoach && (
            <TabsTrigger value="availability" className="gap-2">
              <Clock className="h-4 w-4" />
              Availability
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Tab */}
        {!isCoach && <TabsContent value="general" className="space-y-6">
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

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">Select timezone...</option>
                        <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (GMT+8)</option>
                        <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                        <option value="Asia/Jakarta">Asia/Jakarta (GMT+7)</option>
                        <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="Asia/Hong_Kong">Asia/Hong_Kong (GMT+8)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                        <option value="Asia/Seoul">Asia/Seoul (GMT+9)</option>
                        <option value="Australia/Sydney">Australia/Sydney</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="Europe/Berlin">Europe/Berlin</option>
                        <option value="America/New_York">America/New_York</option>
                        <option value="America/Los_Angeles">America/Los_Angeles</option>
                        <option value="America/Chicago">America/Chicago</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">Select currency...</option>
                        <option value="MYR">MYR — Malaysian Ringgit</option>
                        <option value="SGD">SGD — Singapore Dollar</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="GBP">GBP — British Pound</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="AUD">AUD — Australian Dollar</option>
                        <option value="IDR">IDR — Indonesian Rupiah</option>
                        <option value="THB">THB — Thai Baht</option>
                        <option value="PHP">PHP — Philippine Peso</option>
                        <option value="JPY">JPY — Japanese Yen</option>
                      </select>
                    </div>
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
        </TabsContent>}

        {!isCoach && <TabsContent value="security" className="space-y-6">
          <PasswordChangeCard />
        </TabsContent>}

        {!isCoach && <TabsContent value="branding" className="space-y-6">
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

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Business Logo</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                        {displayedLogoUrl && !logoLoadError ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={displayedLogoUrl}
                            alt="Business logo preview"
                            className="h-full w-full object-contain p-2"
                            onError={() => setLogoLoadError(true)}
                          />
                        ) : (
                          <Image className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSelectLogoClick}
                        >
                          Upload Logo
                        </Button>
                        {(selectedLogoFile || logoUrl) && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLogoFile(null);
                              setLogoPreviewUrl(null);
                              setLogoUrl("");
                              setLogoValidationError("");
                            }}
                          >
                            Remove Logo
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Accepted formats: JPG, PNG, SVG.
                        </p>
                        {selectedLogoFile && (
                          <p className="text-xs text-emerald-400">
                            Previewing: {selectedLogoFile.name}
                          </p>
                        )}
                        {logoValidationError && (
                          <p className="text-xs text-red-400">
                            {logoValidationError}
                          </p>
                        )}
                      </div>
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
                  disabled={brandingSaving || logoUploading || !!logoValidationError}
                  className="gap-2"
                >
                  {brandingSaving || logoUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {brandingSaving || logoUploading ? "Saving..." : "Save Branding"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>}
        {isCoach && (
          <TabsContent value="availability" className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  My Availability
                </CardTitle>
                <CardDescription>
                  Set your available hours so clients can book sessions with you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border/40 bg-card p-4 space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Add Available Slot</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Day</label>
                      <select value={newSlotDay} onChange={(e) => setNewSlotDay(Number(e.target.value))}
                        className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm">
                        {DAYS.map((d, i) => (<option key={i} value={i} className="bg-background">{d}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
                      <input type="time" value={newSlotStart} onChange={(e) => setNewSlotStart(e.target.value)}
                        className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
                      <input type="time" value={newSlotEnd} onChange={(e) => setNewSlotEnd(e.target.value)}
                        className="w-full rounded-md border border-border/40 bg-background px-3 py-2 text-sm" />
                    </div>
                    <Button onClick={() => saveAvailability.mutate({ day_of_week: newSlotDay, start_time: newSlotStart, end_time: newSlotEnd })}
                      disabled={saveAvailability.isPending} className="gap-2">
                      <Plus className="h-4 w-4" /> Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Current Schedule</h3>
                  {availLoading ? (
                    <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : availability.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-muted-foreground">
                      <Clock className="mx-auto h-8 w-8 mb-2 opacity-40" />
                      <p>No availability set yet. Add your first slot above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {DAYS.map((dayName, dayIdx) => {
                        const daySlots = availability.filter((s: any) => s.day_of_week === dayIdx);
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={dayIdx} className="flex items-center gap-3 rounded-lg border border-border/40 bg-card p-3">
                            <span className="w-24 text-sm font-medium">{dayName}</span>
                            <div className="flex flex-wrap gap-2 flex-1">
                              {daySlots.map((slot: any) => (
                                <Badge key={slot.id} variant="outline" className="gap-2 px-3 py-1.5 text-sm">
                                  {slot.start_time?.slice(0,5)} — {slot.end_time?.slice(0,5)}
                                  <button onClick={() => deleteAvailability.mutate(slot.id)} className="ml-1 hover:text-red-400 transition-colors">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {/* Payments Tab */}
        {!isCoach && <PaymentsTab tenantId={tenantId ?? ""} />}

        {/* E-Invoicing Tab */}
        {!isCoach && <EInvoicingTab tenantId={tenantId ?? ""} />}

        {/* Notifications Tab */}
        {!isCoach && <NotificationsTab tenantId={tenantId ?? ""} />}
      </Tabs>
    </div>
  );
}

// ─── Payments Tab ────────────────────────────────────────────────────────────

function PaymentsTab({ tenantId }: { tenantId: string }) {
  const [methods, setMethods] = useState<Record<string, boolean>>({
    fpx: true, duitnow: true, card: false, cash: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`${API_URL}/api/tenants/${tenantId}/settings/payments`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setMethods(d.data.paymentMethods ?? methods); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/tenants/${tenantId}/settings/payments`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethods: methods }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  const PAYMENT_METHODS = [
    { key: "fpx", label: "FPX (Online Banking)", desc: "Direct debit from Malaysian bank accounts" },
    { key: "duitnow", label: "DuitNow QR", desc: "Scan-and-pay via DuitNow QR code" },
    { key: "card", label: "Credit / Debit Card", desc: "Visa, Mastercard, and Amex cards" },
    { key: "cash", label: "Cash", desc: "Accept payment in cash at the front desk" },
  ];

  return (
    <TabsContent value="payments" className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Payment Methods
          </CardTitle>
          <CardDescription>
            Choose which payment methods are available to your customers at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PAYMENT_METHODS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <button
                onClick={() => setMethods(m => ({ ...m, [key]: !m[key] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${methods[key] ? "bg-primary" : "bg-white/10"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${methods[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          {saved && <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Saved</div>}
          {!saved && <div />}
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Payment Settings"}
          </Button>
        </CardFooter>
      </Card>
    </TabsContent>
  );
}

// ─── E-Invoicing Tab ─────────────────────────────────────────────────────────

function EInvoicingTab({ tenantId }: { tenantId: string }) {
  const [invoices, setInvoices] = useState<Array<{ id: string; invoice_number: string; amount: number; currency: string; status: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    fetch(`${API_URL}/api/tenants/${tenantId}/invoices`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.success) setInvoices(d.data ?? []); })
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <TabsContent value="einvoicing" className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            E-Invoices
          </CardTitle>
          <CardDescription>
            View and manage all e-invoices generated for your business.
            Invoice numbers follow the format INV-YYYYMM-NNNN.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.08] p-12 text-center">
              <FileText className="mx-auto h-10 w-10 mb-3 text-white/20" />
              <p className="text-white/50 text-sm">No e-invoices yet</p>
              <p className="text-white/30 text-xs mt-1">Invoices will appear here once generated</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                  <div>
                    <p className="text-sm font-mono font-medium">{inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString("en-MY")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{inv.currency} {(inv.amount / 100).toFixed(2)}</p>
                    <Badge variant="outline" className={`text-xs ${inv.status === "paid" ? "border-emerald-500/30 text-emerald-400" : "border-yellow-500/30 text-yellow-400"}`}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ tenantId }: { tenantId: string }) {
  const [templates, setTemplates] = useState<Array<{ id: string; type: string; channel: string; template: string; is_active: boolean }>>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([
      fetch(`${API_URL}/api/tenants/${tenantId}/notification-templates`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API_URL}/api/tenants/${tenantId}/notification-settings`, { credentials: "include" }).then(r => r.json()),
    ]).then(([tmplData, settData]) => {
      if (tmplData.success) setTemplates(tmplData.data ?? []);
      if (settData.success) setSettings(settData.data ?? {});
    }).finally(() => setLoading(false));
  }, [tenantId]);

  async function toggleTemplate(id: string, isActive: boolean) {
    await fetch(`${API_URL}/api/tenants/${tenantId}/notification-templates/${id}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    setTemplates(t => t.map(x => x.id === id ? { ...x, is_active: isActive } : x));
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/tenants/${tenantId}/notification-settings`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  return (
    <TabsContent value="notifications" className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            WhatsApp Notifications
          </CardTitle>
          <CardDescription>
            Configure WhatsApp notification templates for booking confirmations, reminders, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Global toggle */}
          <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <div>
              <p className="font-medium text-sm">Enable WhatsApp Notifications</p>
              <p className="text-xs text-muted-foreground">Send automated messages via WhatsApp</p>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enabled ? "bg-primary" : "bg-white/10"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.08] p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 mb-2 text-white/20" />
              <p className="text-white/50 text-sm">No notification templates</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">{tmpl.channel}</Badge>
                      <p className="text-sm font-medium capitalize">{tmpl.type.replace(/_/g, " ")}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tmpl.template}</p>
                  </div>
                  <button
                    onClick={() => toggleTemplate(tmpl.id, !tmpl.is_active)}
                    className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${tmpl.is_active ? "bg-primary" : "bg-white/10"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${tmpl.is_active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t border-white/[0.06] px-6 py-4">
          {saved && <div className="flex items-center gap-2 text-sm text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Saved</div>}
          {!saved && <div />}
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Notification Settings"}
          </Button>
        </CardFooter>
      </Card>
    </TabsContent>
  );
}
