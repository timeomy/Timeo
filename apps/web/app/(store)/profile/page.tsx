"use client";

import Link from "next/link";
import { useLoyaltyBalance, useLoyaltyHistory } from "@timeo/api-client";
import { useTimeoWebAuthContext, useTimeoWebTenantContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Separator,
  Skeleton,
} from "@timeo/ui/web";
import {
  User,
  Mail,
  Building2,
  LogOut,
  Calendar,
  ShoppingBag,
  Settings,
  Shield,
  Star,
} from "lucide-react";

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn, signOut, activeRole } =
    useTimeoWebAuthContext();
  const { tenants, activeTenant, switchTenant } = useTimeoWebTenantContext();

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <User className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Sign in required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Please sign in to view your profile.
        </p>
        <Link href="/sign-in">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  const displayName = user.name || "User";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={user.imageUrl ?? undefined}
                alt={displayName}
              />
              <AvatarFallback className="text-xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="mt-4 sm:ml-6 sm:mt-0">
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {user.email && (
                <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
              )}
              {activeRole && (
                <div className="mt-2">
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Organization */}
      {activeTenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5" />
              Active Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{activeTenant.name}</p>
                {activeTenant.slug && (
                  <p className="text-sm text-muted-foreground">
                    @{activeTenant.slug}
                  </p>
                )}
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tenant Switcher */}
      {tenants.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Businesses</CardTitle>
            <CardDescription>
              Switch between businesses you are a member of.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => switchTenant(tenant.id)}
                  className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent ${
                    activeTenant?.id === tenant.id
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    {tenant.slug && (
                      <p className="text-sm text-muted-foreground">
                        @{tenant.slug}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {tenant.role}
                    </Badge>
                    {activeTenant?.id === tenant.id && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loyalty Points */}
      {activeTenant && (
        <LoyaltySection tenantId={activeTenant.id} userId={user.id} />
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/bookings"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">My Bookings</p>
                <p className="text-xs text-muted-foreground">
                  View your appointments
                </p>
              </div>
            </Link>
            <Link
              href="/orders"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">My Orders</p>
                <p className="text-xs text-muted-foreground">
                  View your order history
                </p>
              </div>
            </Link>
            <Link
              href="/services"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Services</p>
                <p className="text-xs text-muted-foreground">
                  Browse available services
                </p>
              </div>
            </Link>
            <Link
              href="/products"
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
            >
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Products</p>
                <p className="text-xs text-muted-foreground">
                  Browse product catalog
                </p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const TIER_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  bronze: { bg: "bg-[#cd7f32]/15", text: "text-[#cd7f32]", hex: "#cd7f32" },
  silver: { bg: "bg-[#c0c0c0]/15", text: "text-[#c0c0c0]", hex: "#c0c0c0" },
  gold: { bg: "bg-[#ffd700]/15", text: "text-[#ffd700]", hex: "#ffd700" },
  platinum: { bg: "bg-[#e5e4e2]/15", text: "text-[#e5e4e2]", hex: "#e5e4e2" },
};

function LoyaltySection({ tenantId, userId }: { tenantId: string; userId: string }) {
  const { data: loyaltyData, isLoading: balanceLoading } = useLoyaltyBalance(tenantId, userId);
  const { data: history } = useLoyaltyHistory(tenantId, userId);

  if (balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-yellow-400" />
            Loyalty Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const balance = loyaltyData?.balance ?? 0;
  const tier = loyaltyData?.tier?.toLowerCase() ?? "bronze";
  const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  const transactions = history?.slice(0, 10) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-5 w-5 text-yellow-400" />
          Loyalty Points
        </CardTitle>
        <CardDescription>
          Earn points with every purchase. 1 point = RM0.01 redemption value.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance + Tier */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{balance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">points available</p>
          </div>
          <Badge
            className={`${tierColor.bg} ${tierColor.text} border text-sm px-3 py-1`}
            style={{ borderColor: `${tierColor.hex}40` }}
          >
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </Badge>
        </div>

        {/* History */}
        {transactions.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recent Activity</p>
            <div className="space-y-2">
              {transactions.map((tx: any, i: number) => (
                <div
                  key={tx.id ?? i}
                  className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{tx.description ?? tx.type ?? "Transaction"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.createdAt
                        ? new Date(tx.createdAt).toLocaleDateString("en-MY", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "\u2014"}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      (tx.points ?? tx.amount ?? 0) >= 0
                        ? "text-emerald-500"
                        : "text-red-500"
                    }`}
                  >
                    {(tx.points ?? tx.amount ?? 0) >= 0 ? "+" : ""}
                    {tx.points ?? tx.amount ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
