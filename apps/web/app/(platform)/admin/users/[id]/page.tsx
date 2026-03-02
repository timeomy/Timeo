"use client";

import { useParams, useRouter } from "next/navigation";
import { usePlatformUser } from "@timeo/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
} from "@timeo/ui/web";
import { ArrowLeft, Mail, Calendar, Building2, Shield } from "lucide-react";

const ROLE_VARIANTS: Record<string, string> = {
  platform_admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  business_admin: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  staff: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  customer: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { data: user, isLoading } = usePlatformUser(userId);

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
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {user.name[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
              <p className="mt-1 text-muted-foreground">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {!isLoading && user && (
        <>
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

          <Card className="glass border-white/[0.08]">
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">User ID</p>
                  <p className="font-mono text-sm">{user.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
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
                          Joined {new Date(m.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge
                          variant="outline"
                          className={ROLE_VARIANTS[m.role] ?? ROLE_VARIANTS.customer}
                        >
                          {m.role}
                        </Badge>
                        <Badge variant="outline">{m.status}</Badge>
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
