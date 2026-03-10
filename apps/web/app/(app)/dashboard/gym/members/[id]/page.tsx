"use client";


import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Mail,
  Phone,
  QrCode,
  SmilePlus,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type GymMemberDetail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  membershipStatus: "active" | "expired" | "suspended";
  membershipPlan: string | null;
  membershipExpiry: string | null;
  faceEnrolled: boolean;
  qrValue: string;
  checkInHistory: Array<{
    id: string;
    time: string;
    method: "qr" | "face" | "manual";
    status: "granted" | "denied";
  }>;
};

// ---- Data hook ----

function useGymMemberDetail(memberId: string) {
  const { tenantId } = useTenantId();
  return useQuery<GymMemberDetail>({
    queryKey: ["gym", tenantId, "/members", memberId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members/${memberId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load member");
      return data.data as GymMemberDetail;
    },
    enabled: !!tenantId && !!memberId,
  });
}

// ---- Helpers ----

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
  suspended: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const METHOD_BADGE: Record<string, string> = {
  qr: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  face: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  manual: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

const ACCESS_BADGE: Record<string, string> = {
  granted: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name: string | null, email: string | null) {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

// ---- Page ----

export default function GymMemberDetailPage() {
  const params = useParams()!;
  const memberId = params.id as string;
  const router = useRouter();
  const { data: member, isLoading } = useGymMemberDetail(memberId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl bg-white/[0.06] lg:col-span-1" />
          <Skeleton className="h-64 rounded-xl bg-white/[0.06] lg:col-span-2" />
        </div>
        <Skeleton className="h-[300px] rounded-xl bg-white/[0.06]" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-white/50">Member not found</p>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => router.push("/dashboard/gym/members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white/50 hover:text-white"
        onClick={() => router.push("/dashboard/gym/members")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Members
      </Button>

      {/* Member Header + Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="glass-card lg:col-span-1">
          <CardContent className="flex flex-col items-center p-6">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage
                src={member.photoUrl ?? undefined}
                alt={member.name}
              />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                {getInitial(member.name, member.email)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold text-white">{member.name}</h2>
            <div className="mt-3 space-y-2 w-full">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Mail className="h-4 w-4 text-white/30" />
                {member.email}
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <Phone className="h-4 w-4 text-white/30" />
                  {member.phone}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-2 w-full"
            >
              <Upload className="h-4 w-4" />
              Upload Photo
            </Button>
          </CardContent>
        </Card>

        {/* Details Cards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Membership Info */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Membership
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-white/40 mb-1">Plan</p>
                  <p className="text-sm font-medium text-white">
                    {member.membershipPlan ?? "No plan"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Status</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      STATUS_BADGE[member.membershipStatus] ??
                        STATUS_BADGE.expired,
                    )}
                  >
                    {member.membershipStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Expiry</p>
                  <p className="text-sm font-medium text-white">
                    {member.membershipExpiry
                      ? formatDate(member.membershipExpiry)
                      : "\u2014"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-primary" />
                QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs text-white/40 mb-2">QR Value</p>
                <code className="block rounded-md bg-black/30 px-3 py-2 text-sm text-emerald-400 font-mono break-all">
                  {member.qrValue}
                </code>
                <p className="text-xs text-white/30 mt-2">
                  This QR code is scanned at the turnstile for check-in.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Face Enrollment */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SmilePlus className="h-5 w-5 text-primary" />
                Face Enrollment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {member.faceEnrolled ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          Enrolled
                        </p>
                        <p className="text-xs text-white/40">
                          Face recognition is active for this member.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-white/20" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          Not Enrolled
                        </p>
                        <p className="text-xs text-white/40">
                          Face recognition is not set up yet.
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <Link href={`/dashboard/gym/turnstile/enroll/${member.id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <SmilePlus className="h-4 w-4" />
                    {member.faceEnrolled ? "Re-Enroll" : "Enroll Now"}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Check-in History */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Check-in History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(member.checkInHistory?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-white/[0.04] p-3 mb-3">
                <Clock className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-sm font-medium text-white/50">
                No check-in history
              </p>
              <p className="text-xs text-white/30 mt-1">
                Check-ins will appear here once the member visits.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Date / Time</TableHead>
                  <TableHead className="text-white/50">Method</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.checkInHistory.map((ci) => (
                  <TableRow
                    key={ci.id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell className="text-sm text-white/70">
                      {formatDateTime(ci.time)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          METHOD_BADGE[ci.method] ?? METHOD_BADGE.manual,
                        )}
                      >
                        {ci.method}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          ACCESS_BADGE[ci.status] ?? ACCESS_BADGE.denied,
                        )}
                      >
                        {ci.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
