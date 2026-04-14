"use client";

import { useState } from "react";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { authClient } from "@timeo/auth/web";
import { useTenantId } from "@/hooks/use-tenant-id";
import { getInitials } from "@timeo/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
  Button,
  Input,
} from "@timeo/ui/web";
import {
  User,
  Mail,
  Building2,
  Shield,
  Lock,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function ProfilePage() {
  const { user, activeRole } = useTimeoWebAuthContext();
  const { activeTenant } = useTimeoWebTenantContext();
  const { tenant } = useTenantId();

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  const passwordsMatch = newPassword === confirmPassword;
  const isValid = newPassword.length >= 8 && passwordsMatch;

  async function handleChangePassword() {
    if (!isValid) return;
    setSaving(true);
    setPwError("");
    setPwSuccess(false);
    try {
      const res = await authClient.changePassword({
        currentPassword: undefined,
        newPassword,
      });
      if (res.error) {
        setPwError(res.error.message ?? "Failed to change password");
      } else {
        setPwSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwSuccess(false), 3000);
      }
    } catch {
      setPwError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const displayName = user
    ? user.name ||
      user.email ||
      "User"
    : "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Profile
        </h1>
        <p className="text-sm text-white/50">
          Your account and membership info
        </p>
      </div>

      {/* User Info Card */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20">
              {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={displayName} />}
              <AvatarFallback className="text-xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-semibold text-white">
                {displayName}
              </h2>
              {user?.email && (
                <p className="mt-1 text-sm text-white/50">{user.email}</p>
              )}
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Shield className="h-3 w-3" />
                {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      <Card className="glass border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-center gap-3 py-3">
            <User className="h-4 w-4 text-white/40" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Full Name</p>
              <p className="text-sm text-white">{user?.name ?? "—"}</p>
            </div>
          </div>
          <Separator className="bg-white/[0.06]" />
          <div className="flex items-center gap-3 py-3">
            <Mail className="h-4 w-4 text-white/40" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Email Address</p>
              <p className="text-sm text-white">{user?.email ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Business */}
      {(activeTenant || tenant) && (
        <Card className="glass border-white/[0.08]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">
              Active Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0">
            <div className="flex items-center gap-3 py-3">
              <Building2 className="h-4 w-4 text-white/40" />
              <div className="flex-1">
                <p className="text-xs text-white/40">Business Name</p>
                <p className="text-sm text-white">
                  {activeTenant?.name ?? tenant?.name ?? "Unknown"}
                </p>
              </div>
            </div>
            {(activeTenant?.slug || tenant?.slug) && (
              <>
                <Separator className="bg-white/[0.06]" />
                <div className="flex items-center gap-3 py-3">
                  <Building2 className="h-4 w-4 text-white/40" />
                  <div className="flex-1">
                    <p className="text-xs text-white/40">Business Slug</p>
                    <p className="text-sm text-white">
                      @{activeTenant?.slug ?? tenant?.slug}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card className="glass border-white/[0.08]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-white/60" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-white/50">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwError(""); }}
              placeholder="Min. 8 characters"
              className="bg-white/[0.04] border-white/[0.08]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-white/50">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwError(""); }}
              placeholder="Repeat new password"
              className="bg-white/[0.04] border-white/[0.08]"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {pwError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {pwError}
            </p>
          )}

          {pwSuccess && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Password changed successfully!
            </p>
          )}

          <Button
            onClick={handleChangePassword}
            disabled={!isValid || saving}
            className="w-full bg-primary hover:bg-primary/90"
            size="sm"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
