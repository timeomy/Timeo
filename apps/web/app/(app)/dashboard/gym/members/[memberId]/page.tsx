"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  api,
  useCoaches,
  useMemberDetail,
  useResetPlatformUserPassword,
  useSessionLogs,
  useUpdateMember,
  type MemberDetail,
  type UpdateMemberPayload,
} from "@timeo/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Select,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@timeo/ui/web";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  CalendarClock,
  Coins,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  ReceiptText,
  Save,
  User,
  X,
} from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  suspended: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PAYMENT_BADGE: Record<string, string> = {
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending_verification: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function getInitial(name: string, email: string): string {
  return (name?.[0] ?? email?.[0] ?? "?").toUpperCase();
}

type EditableMemberStatus = "active" | "suspended" | "inactive";

type MemberEditState = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  role: "customer" | "coach" | "staff" | "admin";
  status: EditableMemberStatus;
  coachId: string;
  memberId: string;
  notes: string;
  tags: string[];
};

function normalizeEditableStatus(status: string | null | undefined): EditableMemberStatus {
  if (status === "active" || status === "suspended") {
    return status;
  }

  return "inactive";
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function buildEditState(data: MemberDetail): MemberEditState {
  return {
    name: data.user.name,
    email: data.user.email,
    phone: data.user.phone ?? "",
    avatarUrl: data.user.avatarUrl ?? "",
    role: (data.membership.role as MemberEditState["role"]) ?? "customer",
    status: normalizeEditableStatus(data.membership.status),
    coachId: data.membership.coachId ?? "",
    memberId: data.membership.memberId ?? "",
    notes: data.membership.notes ?? "",
    tags: Array.isArray(data.membership.tags) ? data.membership.tags : [],
  };
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full bg-white/[0.06]" />
      <Skeleton className="h-12 w-full bg-white/[0.06]" />
      <Skeleton className="h-72 w-full bg-white/[0.06]" />
    </div>
  );
}

export default function GymMemberDetailPage() {
  const params = useParams();
  const memberIdParam = params?.memberId;
  const memberId = Array.isArray(memberIdParam)
    ? memberIdParam[0]
    : (memberIdParam ?? "");

  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useMemberDetail(tenantId, memberId);
  const { data: coaches = [] } = useCoaches(tenantId);
  const { data: sessionLogs = [], isLoading: isSessionLogsLoading } = useSessionLogs(tenantId, {
    scope: "coach",
    clientId: memberId,
  });

  const updateMemberMutation = useUpdateMember(tenantId);
  const resetPasswordMutation = useResetPlatformUserPassword();
  const updateSubscriptionMutation = useMutation({
    mutationFn: async (endDate: string) => {
      if (!tenantId) {
        throw new Error("Tenant ID is required");
      }

      return api.patch<MemberDetail["subscription"]>(
        `/api/tenants/${tenantId}/members/${encodeURIComponent(memberId)}/subscription`,
        { endDate },
      );
    },
    onSuccess: () => {
      if (!tenantId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["gym", tenantId, "member-detail", memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gym", tenantId, "members"],
      });
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSubscriptionEditing, setIsSubscriptionEditing] = useState(false);
  const [editState, setEditState] = useState<MemberEditState | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [subscriptionEndDateInput, setSubscriptionEndDateInput] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!data || isEditing) {
      return;
    }

    setEditState(buildEditState(data));
  }, [data, isEditing]);

  useEffect(() => {
    if (!data || isSubscriptionEditing) {
      return;
    }

    setSubscriptionEndDateInput(toDateInputValue(data.subscription?.endDate));
  }, [data, isSubscriptionEditing]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const coachOptions = useMemo(
    () => [
      { label: "No coach assigned", value: "" },
      ...coaches.map((coach) => ({
        label: `${coach.name} (${coach.role})`,
        value: coach.id,
      })),
    ],
    [coaches],
  );

  const activeAvatarUrl = isEditing
    ? (editState?.avatarUrl.trim() || null)
    : (data?.user.avatarUrl ?? null);

  const canSaveMember =
    !!editState?.name.trim() && !!editState?.email.trim() && !updateMemberMutation.isPending;

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
  }

  function addTag(rawTag: string) {
    if (!editState) {
      return;
    }

    const normalized = rawTag.trim();
    if (!normalized) {
      return;
    }

    const exists = editState.tags.some(
      (tag) => tag.toLowerCase() === normalized.toLowerCase(),
    );

    if (exists) {
      setTagInput("");
      return;
    }

    setEditState({
      ...editState,
      tags: [...editState.tags, normalized],
    });
    setTagInput("");
  }

  function removeTag(tagToRemove: string) {
    if (!editState) {
      return;
    }

    setEditState({
      ...editState,
      tags: editState.tags.filter((tag) => tag !== tagToRemove),
    });
  }

  function startEditing() {
    if (!data) {
      return;
    }

    setEditState(buildEditState(data));
    setTagInput("");
    setIsEditing(true);
  }

  function cancelEditing() {
    if (data) {
      setEditState(buildEditState(data));
    }

    setTagInput("");
    setIsEditing(false);
  }

  async function saveMemberChanges() {
    if (!editState) {
      return;
    }

    const payload: UpdateMemberPayload = {
      name: editState.name.trim(),
      email: editState.email.trim().toLowerCase(),
      phone: editState.phone.trim() || null,
      avatar_url: editState.avatarUrl.trim() || null,
      role: editState.role,
      status: editState.status,
      notes: editState.notes.trim() || null,
      tags: editState.tags,
      coach_id: editState.coachId || null,
      member_id: editState.memberId.trim() ? editState.memberId.trim().toUpperCase() : null,
    };

    try {
      await updateMemberMutation.mutateAsync({ memberId, payload });
      setIsEditing(false);
      setTagInput("");
      showToast("success", "Member details updated.");
    } catch (err) {
      showToast(
        "error",
        (err as Error | undefined)?.message ?? "Failed to update member details.",
      );
    }
  }

  async function saveSubscriptionChanges() {
    if (!subscriptionEndDateInput) {
      showToast("error", "Please select a subscription end date.");
      return;
    }

    const parsed = new Date(`${subscriptionEndDateInput}T23:59:59`);
    if (Number.isNaN(parsed.getTime())) {
      showToast("error", "Invalid subscription end date.");
      return;
    }

    try {
      await updateSubscriptionMutation.mutateAsync(parsed.toISOString());
      setIsSubscriptionEditing(false);
      showToast("success", "Subscription updated.");
    } catch (err) {
      showToast(
        "error",
        (err as Error | undefined)?.message ?? "Failed to update subscription.",
      );
    }
  }

  async function resetMemberPassword() {
    if (!data?.user.id) {
      return;
    }

    try {
      const response = await resetPasswordMutation.mutateAsync({
        userId: data.user.id,
      });
      setTemporaryPassword(response.temporaryPassword);
      showToast("success", "Temporary password generated.");
    } catch (err) {
      showToast(
        "error",
        (err as Error | undefined)?.message ?? "Failed to reset password.",
      );
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/gym/members">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/60">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-sm text-white/60">
            {(error as Error | undefined)?.message ?? "Unable to load member details."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={cn(
            "fixed right-4 top-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-xl",
            toast.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : "border-red-500/40 bg-red-500/15 text-red-300",
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard/gym/members">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/60">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={cancelEditing}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={saveMemberChanges}
                disabled={!canSaveMember}
              >
                {updateMemberMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={startEditing}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border border-white/10">
                {activeAvatarUrl ? (
                  <AvatarImage
                    src={activeAvatarUrl}
                    alt={isEditing ? (editState?.name ?? data.user.name) : data.user.name}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitial(
                    isEditing ? (editState?.name ?? data.user.name) : data.user.name,
                    isEditing ? (editState?.email ?? data.user.email) : data.user.email,
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold text-white">
                  {isEditing ? (editState?.name ?? data.user.name) : data.user.name}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/60">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    {isEditing ? (editState?.email ?? data.user.email) : data.user.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    {isEditing
                      ? (editState?.phone.trim() || "No phone")
                      : (data.user.phone ?? "No phone")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "capitalize",
                  STATUS_BADGE[data.membershipStatus] ?? STATUS_BADGE.expired,
                )}
              >
                {data.membershipStatus}
              </Badge>
              <Badge variant="outline" className="border-white/20 text-white/70">
                Member ID: {isEditing ? (editState?.memberId || "-") : (data.membership.memberId ?? "-")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max min-w-full justify-start bg-white/[0.03]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
            <TabsTrigger value="sessions">Session Logs</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="credits">Credits</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/40">Name</p>
                  {isEditing ? (
                    <Input
                      value={editState?.name ?? ""}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                name: event.target.value,
                              }
                            : prev,
                        )
                      }
                    />
                  ) : (
                    <p className="text-white/80">{data.user.name}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/40">Email</p>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={editState?.email ?? ""}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                email: event.target.value,
                              }
                            : prev,
                        )
                      }
                    />
                  ) : (
                    <p className="text-white/70">{data.user.email}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/40">Phone</p>
                  {isEditing ? (
                    <Input
                      value={editState?.phone ?? ""}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                phone: event.target.value,
                              }
                            : prev,
                        )
                      }
                    />
                  ) : (
                    <p className="text-white/70">{data.user.phone ?? "-"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/40">Avatar URL</p>
                  {isEditing ? (
                    <Input
                      placeholder="https://..."
                      value={editState?.avatarUrl ?? ""}
                      onChange={(event) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                avatarUrl: event.target.value,
                              }
                            : prev,
                        )
                      }
                    />
                  ) : (
                    <p className="text-white/70 break-all">{data.user.avatarUrl ?? "-"}</p>
                  )}
                </div>

                <p className="text-white/70">Joined: {formatDate(data.membership.joinedAt)}</p>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Membership Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {isEditing ? (
                  <>
                    <Select
                      label="Role"
                      value={editState?.role ?? "customer"}
                      onChange={(value) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                role: value as MemberEditState["role"],
                              }
                            : prev,
                        )
                      }
                      options={[
                        { label: "Customer", value: "customer" },
                        { label: "Coach", value: "coach" },
                        { label: "Staff", value: "staff" },
                        { label: "Admin", value: "admin" },
                      ]}
                    />

                    <Select
                      label="Status"
                      value={editState?.status ?? "active"}
                      onChange={(value) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                status: value as EditableMemberStatus,
                              }
                            : prev,
                        )
                      }
                      options={[
                        { label: "Active", value: "active" },
                        { label: "Suspended", value: "suspended" },
                        { label: "Inactive", value: "inactive" },
                      ]}
                    />

                    <Select
                      label="Assigned Coach"
                      value={editState?.coachId ?? ""}
                      onChange={(value) =>
                        setEditState((prev) =>
                          prev
                            ? {
                                ...prev,
                                coachId: value,
                              }
                            : prev,
                        )
                      }
                      options={coachOptions}
                    />

                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-white/40">Member ID</p>
                      <Input
                        value={editState?.memberId ?? ""}
                        onChange={(event) =>
                          setEditState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  memberId: event.target.value.replace(/[^0-9a-fA-F]/g, ""),
                                }
                              : prev,
                          )
                        }
                        placeholder="Hex card/member ID"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-white/80 capitalize">Role: {data.membership.role}</p>
                    <p className="text-white/70 capitalize">
                      Status: {normalizeEditableStatus(data.membership.status)}
                    </p>
                    <p className="text-white/70">Coach: {data.membership.coachId ?? "Unassigned"}</p>
                    <p className="text-white/70">Member ID: {data.membership.memberId ?? "-"}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Membership Notes & Tags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-white/40">Notes</p>
                      <textarea
                        value={editState?.notes ?? ""}
                        onChange={(event) =>
                          setEditState((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  notes: event.target.value,
                                }
                              : prev,
                          )
                        }
                        rows={4}
                        className="w-full rounded-md border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-primary/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-white/40">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {(editState?.tags ?? []).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-white/40"
                          >
                            {tag}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add tag and press Enter"
                          value={tagInput}
                          onChange={(event) => setTagInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === ",") {
                              event.preventDefault();
                              addTag(tagInput);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addTag(tagInput)}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {data.membership.tags.length > 0 ? (
                        data.membership.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-white/20 text-white/70">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-white/40">No tags</span>
                      )}
                    </div>
                    <p className="text-sm text-white/70">
                      {data.membership.notes?.trim() || "No notes"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4 text-primary" />
                Current Subscription
              </CardTitle>
              {data.subscription ? (
                isSubscriptionEditing ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setSubscriptionEndDateInput(toDateInputValue(data.subscription?.endDate));
                        setIsSubscriptionEditing(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={saveSubscriptionChanges}
                      disabled={updateSubscriptionMutation.isPending}
                    >
                      {updateSubscriptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Date
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setIsSubscriptionEditing(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit End Date
                  </Button>
                )
              ) : null}
            </CardHeader>
            <CardContent>
              {data.subscription ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  <p className="text-white/80">Status: {data.subscription.status}</p>
                  <p className="text-white/80">Plan: {data.subscription.planName ?? "-"}</p>
                  <p className="text-white/80">
                    Days Remaining: {Math.max(0, data.subscription.daysRemaining)}
                  </p>
                  <p className="text-white/70">Start: {formatDate(data.subscription.startDate)}</p>
                  <p className="text-white/70">End: {formatDate(data.subscription.endDate)}</p>
                  <p className="text-white/70">
                    Ends After Cycle: {data.subscription.cancelAtPeriodEnd ? "Yes" : "No"}
                  </p>
                  {isSubscriptionEditing ? (
                    <div className="sm:col-span-2 lg:col-span-3 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-white/40">New End Date</p>
                      <Input
                        type="date"
                        value={subscriptionEndDateInput}
                        onChange={(event) => setSubscriptionEndDateInput(event.target.value)}
                        className="max-w-xs"
                      />
                    </div>
                  ) : (
                    <></>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/50">No subscription found.</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Button
                onClick={resetMemberPassword}
                className="gap-1.5"
                disabled={resetPasswordMutation.isPending}
              >
                {resetPasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Reset Password
              </Button>
              {temporaryPassword ? (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">
                  Temporary password: <span className="font-mono">{temporaryPassword}</span>
                </div>
              ) : null}
              <p className="text-xs text-white/50">
                Uses the existing platform admin reset endpoint.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          {data.payments.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                No payment requests found.
              </CardContent>
            </Card>
          ) : (
            data.payments.map((payment) => (
              <Card key={payment.id} className="glass-card">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <ReceiptText className="h-4 w-4 text-primary" />
                      {payment.planName}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        PAYMENT_BADGE[payment.status] ?? PAYMENT_BADGE.pending_verification,
                      )}
                    >
                      {payment.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p className="text-white/80">Amount: {formatMoney(payment.amount, payment.currency)}</p>
                    <p className="text-white/70">Requested: {formatDateTime(payment.createdAt)}</p>
                  </div>
                  {payment.receiptUrl ? (
                    <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={payment.receiptUrl}
                        alt="Payment receipt"
                        className="max-h-52 w-full rounded-md border border-white/10 object-cover"
                      />
                    </a>
                  ) : (
                    <p className="text-white/40">No receipt uploaded</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="checkins">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Check-in History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Date / Time</TableHead>
                      <TableHead className="text-white/50">Method</TableHead>
                      <TableHead className="text-white/50">Gate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.checkIns.length > 0 ? (
                      data.checkIns.map((checkIn) => (
                        <TableRow key={checkIn.id} className="border-white/[0.06]">
                          <TableCell className="text-white/70">{formatDateTime(checkIn.timestamp)}</TableCell>
                          <TableCell className="text-white/70 capitalize">{checkIn.method}</TableCell>
                          <TableCell className="text-white/60">{checkIn.gate ?? checkIn.device ?? "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-white/[0.06]">
                        <TableCell colSpan={3} className="text-center text-white/50">
                          No check-ins found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-3">
          {isSessionLogsLoading ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                Loading session logs...
              </CardContent>
            </Card>
          ) : sessionLogs.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                No session logs found.
              </CardContent>
            </Card>
          ) : (
            sessionLogs.map((log) => (
              <Card key={log.id} className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-white/90">
                    {log.sessionType?.replaceAll("_", " ") || "Session"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p className="text-white/70">Date: {formatDateTime(log.createdAt)}</p>
                  <p className="text-white/70">Coach: {log.coachName ?? "-"}</p>
                  <p className="text-white/70">
                    Duration: {log.durationMinutes ?? log.duration ?? "-"} mins
                  </p>
                  <p className="text-white/70">
                    Feedback: {(log.clientFeedback ?? "-").replaceAll("_", " ")}
                  </p>
                  <p className="text-white/60 sm:col-span-2 lg:col-span-4">
                    Notes: {log.notes?.trim() || "No notes"}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="classes">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Class Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Class</TableHead>
                      <TableHead className="text-white/50">Start</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.classEnrollments.length > 0 ? (
                      data.classEnrollments.map((item) => (
                        <TableRow key={item.id} className="border-white/[0.06]">
                          <TableCell className="text-white/70">{item.className ?? item.classId}</TableCell>
                          <TableCell className="text-white/70">{formatDateTime(item.startTime)}</TableCell>
                          <TableCell className="text-white/70 capitalize">{item.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-white/[0.06]">
                        <TableCell colSpan={3} className="text-center text-white/50">
                          No class enrollments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-3">
          {data.sessionCredits.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-8 text-center text-sm text-white/50">
                No session credits found.
              </CardContent>
            </Card>
          ) : (
            data.sessionCredits.map((credit) => (
              <Card key={credit.id} className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Coins className="h-4 w-4 text-primary" />
                    {credit.packageName ?? "Session Package"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <p className="text-white/80">Remaining: {credit.remainingSessions}</p>
                  <p className="text-white/70">Total: {credit.totalSessions}</p>
                  <p className="text-white/70">Used: {credit.usedSessions}</p>
                  <p className="text-white/70">Expires: {formatDate(credit.expiresAt)}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="qr" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Member QR Code</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {data.qrCode ? (
                <>
                  <div className="rounded-xl bg-white p-4">
                    <QRCodeSVG value={data.qrCode} size={220} includeMargin level="M" />
                  </div>
                  <p className="text-center font-mono text-xs text-white/60 break-all">
                    {data.qrCode}
                  </p>
                </>
              ) : (
                <p className="text-sm text-white/50">
                  QR code unavailable. Set a member ID to generate one.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
