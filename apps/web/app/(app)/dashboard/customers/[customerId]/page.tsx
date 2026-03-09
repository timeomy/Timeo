"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Calendar,
  ShoppingBag,
  Star,
  Clock,
  Tag,
  X,
  Plus,
  Save,
  Loader2,
} from "lucide-react";

import { useCustomer, useUpdateCustomer, useLoyaltyBalance } from "@timeo/api-client";

type TabMode = "bookings" | "orders" | "activity";

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRelative(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) !== 1 ? "s" : ""} ago`;
  return formatDate(isoString);
}

const BOOKING_STATUS: Record<string, string> = {
  confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  no_show: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: "bg-[#cd7f32]/15", text: "text-[#cd7f32]", border: "border-[#cd7f32]/30" },
  silver: { bg: "bg-[#c0c0c0]/15", text: "text-[#c0c0c0]", border: "border-[#c0c0c0]/30" },
  gold: { bg: "bg-[#ffd700]/15", text: "text-[#ffd700]", border: "border-[#ffd700]/30" },
  platinum: { bg: "bg-[#e5e4e2]/15", text: "text-[#e5e4e2]", border: "border-[#e5e4e2]/30" },
};

const TAG_COLORS: Record<string, string> = {
  vip: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  regular: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  inactive: "bg-red-500/15 text-red-400 border-red-500/30",
  loyal: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag.toLowerCase()] ?? "bg-white/[0.06] text-white/60 border-white/[0.08]";
}

export default function CustomerDetailPage() {
  const params = useParams()!;
  const customerId = params.customerId as string;
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState<TabMode>("bookings");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [newTag, setNewTag] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { data: customer, isLoading } = useCustomer(tenantId ?? "", customerId);
  const { mutateAsync: updateCustomer } = useUpdateCustomer(tenantId ?? "");
  const { data: loyaltyData } = useLoyaltyBalance(tenantId ?? "", customerId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.06]" />
          ))}
        </div>
        <Skeleton className="h-[300px] rounded-xl bg-white/[0.06]" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-white/50">Customer not found</p>
        <Link href="/dashboard/customers">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = customer.name ?? "Unknown";
  const initial = (customer.name?.[0] ?? customer.email?.[0] ?? "?").toUpperCase();
  const tags: string[] = customer.tags ?? [];

  function startEditNotes() {
    setNotesValue(customer?.notes ?? "");
    setEditingNotes(true);
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await updateCustomer({ customerId, notes: notesValue });
      setEditingNotes(false);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setSavingNotes(false);
    }
  }

  async function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    try {
      await updateCustomer({ customerId, tags: [...tags, tag] });
      setNewTag("");
    } catch (err) {
      console.error("Failed to add tag:", err);
    }
  }

  async function removeTag(tagToRemove: string) {
    try {
      await updateCustomer({
        customerId,
        tags: tags.filter((t) => t !== tagToRemove),
      });
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  }

  const tierColor = loyaltyData?.tier
    ? TIER_COLORS[loyaltyData.tier.toLowerCase()] ?? TIER_COLORS.bronze
    : null;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="sm" className="gap-1.5 text-white/50 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      {/* Customer Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {initial}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{displayName}</h1>
          <p className="text-sm text-white/50">{customer.email ?? "\u2014"}</p>
          {customer.joinedAt && (
            <p className="text-xs text-white/30">
              Customer since {formatDate(customer.joinedAt)}
            </p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-blue-400" />
              <p className="text-xs text-white/40">Total Bookings</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {customer.bookingCount ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              <p className="text-xs text-white/40">Total Spend</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatPrice(customer.totalSpend ?? 0, "MYR")}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-400" />
              <p className="text-xs text-white/40">Loyalty Points</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {loyaltyData?.balance ?? 0}
            </p>
            {tierColor && loyaltyData?.tier && (
              <Badge
                variant="outline"
                className={cn("mt-1 text-xs", tierColor.bg, tierColor.text, tierColor.border)}
              >
                {loyaltyData.tier}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-400" />
              <p className="text-xs text-white/40">Last Visit</p>
            </div>
            <p className="text-2xl font-bold text-white">
              {customer.lastVisit
                ? formatRelative(customer.lastVisit)
                : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tags Section */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-white/40" />
              <p className="text-sm font-medium text-white/70">Tags</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={cn("gap-1 text-xs", getTagColor(tag))}
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <div className="flex items-center gap-1">
              <Input
                placeholder="Add tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTag();
                }}
                className="h-7 w-28 text-xs"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/70">Notes</p>
            {!editingNotes && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-white/40 hover:text-white"
                onClick={startEditNotes}
              >
                Edit
              </Button>
            )}
          </div>
          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={4}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                placeholder="Add notes about this customer..."
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={saveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNotes(false)}
                  disabled={savingNotes}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              {customer.notes || "No notes yet. Click Edit to add notes."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 w-fit">
        {(["bookings", "orders", "activity"] as TabMode[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "bg-primary text-primary-foreground"
                : "text-white/50 hover:text-white"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="glass-card">
        <CardContent className="p-4">
          {activeTab === "bookings" && (
            <BookingsTab bookings={customer.recentBookings ?? []} />
          )}
          {activeTab === "orders" && (
            <OrdersTab orders={customer.recentOrders ?? []} />
          )}
          {activeTab === "activity" && (
            <ActivityTab />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: any[] }) {
  if (bookings.length === 0) {
    return (
      <div className="py-8 text-center">
        <Calendar className="mx-auto h-8 w-8 text-white/20 mb-2" />
        <p className="text-sm text-white/40">No bookings yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking: any) => (
        <div
          key={booking.id}
          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-white/40" />
            <div>
              <p className="text-sm font-medium text-white">
                {booking.serviceName ?? "Service"}
              </p>
              <p className="text-xs text-white/40">
                {booking.date ? formatDate(booking.date) : "\u2014"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              BOOKING_STATUS[booking.status] ?? BOOKING_STATUS.pending
            )}
          >
            {booking.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  if (orders.length === 0) {
    return (
      <div className="py-8 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-white/20 mb-2" />
        <p className="text-sm text-white/40">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order: any) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
        >
          <div>
            <p className="text-sm font-medium text-white">
              Order #{order.id?.slice(-6) ?? ""}
            </p>
            <p className="text-xs text-white/40">
              {order.createdAt ? formatDate(order.createdAt) : "\u2014"}
            </p>
          </div>
          <p className="text-sm font-medium text-white">
            {formatPrice(order.totalAmount ?? 0, "MYR")}
          </p>
        </div>
      ))}
    </div>
  );
}

function ActivityTab() {
  return (
    <div className="py-8 text-center">
      <Clock className="mx-auto h-8 w-8 text-white/20 mb-2" />
      <p className="text-sm text-white/40">Activity timeline coming soon</p>
    </div>
  );
}
