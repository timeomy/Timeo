"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  usePlatformUser,
  useDeactivatePlatformUser,
  useActivatePlatformUser,
  useForceLogoutPlatformUser,
  useChangePlatformUserRole,
  useResetPlatformUserPassword,
} from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Skeleton,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Building2,
  Shield,
  KeyRound,
  Power,
  LogOut,
  Loader2,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

const ROLE_VARIANTS: Record<string, string> = {
  platform_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  staff: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const STATUS_VARIANTS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-red-500/20 text-red-400 border-red-500/30",
  inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const AVAILABLE_ROLES = ["platform_admin", "admin", "staff", "customer"] as const;

function RoleSelector({
  currentRole,
  onSelect,
  loading,
}: {
  currentRole: string;
  onSelect: (role: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2 py-1 text-xs transition-colors hover:bg-white/[0.06] disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Change Role
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-white/[0.08] bg-card p-1 shadow-xl">
            {AVAILABLE_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => {
                  if (role !== currentRole) onSelect(role);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/[0.06] ${
                  role === currentRole ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {role === currentRole && <Check className="h-3 w-3" />}
                <span className={role === currentRole ? "" : "ml-5"}>
                  {role}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { data: user, isLoading } = usePlatformUser(userId);

  const deactivate = useDeactivatePlatformUser();
  const activate = useActivatePlatformUser();
  const forceLogout = useForceLogoutPlatformUser();
  const changeRole = useChangePlatformUserRole();
  const resetPassword = useResetPlatformUserPassword();

  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const isAnyMembershipActive = user?.memberships?.some(
    (m) => m.status === "active",
  );

  async function handleResetPassword(customPassword?: string) {
    const password = customPassword?.trim();
    if (password && password.length < 8) return;
    const result = await resetPassword.mutateAsync({
      userId,
      newPassword: password || undefined,
    });
    setTempPassword(result.temporaryPassword);
    setShowPasswordDialog(false);
    setNewPasswordInput("");
  }

  async function handleToggleStatus() {
    if (isAnyMembershipActive) {
      if (!confirm("Deactivate this user? All memberships will be suspended."))
        return;
      await deactivate.mutateAsync(userId);
    } else {
      await activate.mutateAsync(userId);
    }
  }

  async function handleForceLogout() {
    if (!confirm("Force logout this user? All active sessions will be revoked."))
      return;
    await forceLogout.mutateAsync(userId);
  }

  async function handleRoleChange(membershipId: string, role: string) {
    await changeRole.mutateAsync({ userId, membershipId, role });
  }

  function handleCopyPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          onClick={() => router.push("/admin/users")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </button>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : !user ? (
          <h1 className="text-3xl font-bold tracking-tight">User not found</h1>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {user.name[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {user.name}
                </h1>
                <p className="mt-1 text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {!isLoading && user && (
        <>
          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="glass border-white/[0.08]">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-white/[0.08]">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tenants</p>
                  <p className="text-sm font-medium">{user.tenantCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass border-white/[0.08]">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                variant={isAnyMembershipActive ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleStatus}
                disabled={deactivate.isPending || activate.isPending}
                className="gap-2"
              >
                {deactivate.isPending || activate.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {isAnyMembershipActive ? "Deactivate" : "Activate"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordDialog(true)}
                disabled={resetPassword.isPending}
                className="gap-2"
              >
                {resetPassword.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Reset Password
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleForceLogout}
                disabled={forceLogout.isPending}
                className="gap-2"
              >
                {forceLogout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Force Logout
              </Button>
            </CardContent>
          </Card>

          {/* Reset Password Dialog */}
          {showPasswordDialog && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Reset Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter a new password or leave blank to generate a random one.
                  The user will be logged out.
                </p>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (min 8 chars) or leave blank"
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                {newPasswordInput && newPasswordInput.length < 8 && (
                  <p className="text-xs text-red-400">
                    Password must be at least 8 characters
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleResetPassword(newPasswordInput)}
                    disabled={
                      resetPassword.isPending ||
                      (newPasswordInput.length > 0 && newPasswordInput.length < 8)
                    }
                    className="gap-2"
                  >
                    {resetPassword.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    {newPasswordInput ? "Set Password" : "Generate Random"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setNewPasswordInput("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Temporary Password Display */}
          {tempPassword && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">Temporary Password</p>
                  <p className="mt-1 font-mono text-lg text-primary">
                    {tempPassword}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Share this with the user. They should change it after
                    signing in.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPassword}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Account Details */}
          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    User ID
                  </p>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Created
                  </p>
                  <p className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Memberships */}
          {user.memberships && user.memberships.length > 0 && (
            <Card className="glass border-white/[0.08]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-5 w-5" />
                  Tenant Memberships
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {user.memberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-white/[0.06] p-3"
                    >
                      <div>
                        <p className="font-mono text-sm">{m.tenantId}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            STATUS_VARIANTS[m.status] ??
                            STATUS_VARIANTS.inactive
                          }
                        >
                          {m.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            ROLE_VARIANTS[m.role] ?? ROLE_VARIANTS.customer
                          }
                        >
                          {m.role}
                        </Badge>
                        <RoleSelector
                          currentRole={m.role}
                          onSelect={(role) => handleRoleChange(m.id, role)}
                          loading={changeRole.isPending}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
