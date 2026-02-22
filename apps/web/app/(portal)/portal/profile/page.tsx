"use client";

import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
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
} from "@timeo/ui/web";
import {
  User,
  Mail,
  Building2,
  Shield,
  ExternalLink,
} from "lucide-react";

export default function ProfilePage() {
  const { user, activeRole } = useTimeoWebAuthContext();
  const { activeTenant } = useTimeoWebTenantContext();
  const { tenant } = useTenantId();

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
              <AvatarImage
                src={user?.imageUrl ?? undefined}
                alt={displayName}
              />
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
              <p className="text-sm text-white">{displayName}</p>
            </div>
          </div>
          <Separator className="bg-white/[0.06]" />
          <div className="flex items-center gap-3 py-3">
            <Mail className="h-4 w-4 text-white/40" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Email</p>
              <p className="text-sm text-white">{user?.email ?? "Not set"}</p>
            </div>
          </div>
          <Separator className="bg-white/[0.06]" />
          <div className="flex items-center gap-3 py-3">
            <Shield className="h-4 w-4 text-white/40" />
            <div className="flex-1">
              <p className="text-xs text-white/40">Role</p>
              <p className="text-sm text-white">
                {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
              </p>
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
                  <ExternalLink className="h-4 w-4 text-white/40" />
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

      {/* Manage Account Link */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-5">
          <a
            href="/user-profile"
            className="flex items-center justify-between rounded-lg px-1 py-1 text-sm text-white/60 transition-colors hover:text-white"
          >
            <div className="flex items-center gap-3">
              <User className="h-4 w-4" />
              <span>Manage Account Settings</span>
            </div>
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-2 pl-7 text-xs text-white/30">
            Update your password, connected accounts, and more via your account
            settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
