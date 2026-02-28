"use client";

import { useState } from "react";
import { useOrders, useUpdateOrderStatus } from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import { formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from "@timeo/ui/web";
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  AlertCircle,
} from "lucide-react";

type OrderStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "secondary" | "default" | "outline" | "destructive"; className?: string }
> = {
  pending: { label: "Pending", variant: "secondary", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  awaiting_payment: { label: "Awaiting Payment", variant: "secondary", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  confirmed: { label: "Confirmed", variant: "default", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  preparing: { label: "Preparing", variant: "default", className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  ready: { label: "Ready", variant: "outline", className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  completed: { label: "Completed", variant: "outline", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  cancelled: { label: "Cancelled", variant: "destructive", className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

// Valid next statuses for each current status
const STATUS_TRANSITIONS: Record<OrderStatus, { status: OrderStatus; label: string; icon: typeof CheckCircle2; color: string }[]> = {
  pending: [
    { status: "confirmed", label: "Confirm", icon: CheckCircle2, color: "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" },
    { status: "cancelled", label: "Cancel", icon: XCircle, color: "text-red-400 hover:bg-red-500/10 hover:text-red-300" },
  ],
  awaiting_payment: [
    { status: "confirmed", label: "Confirm", icon: CheckCircle2, color: "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" },
    { status: "cancelled", label: "Cancel", icon: XCircle, color: "text-red-400 hover:bg-red-500/10 hover:text-red-300" },
  ],
  confirmed: [
    { status: "preparing", label: "Prepare", icon: ChefHat, color: "text-purple-400 hover:bg-purple-500/10 hover:text-purple-300" },
    { status: "cancelled", label: "Cancel", icon: XCircle, color: "text-red-400 hover:bg-red-500/10 hover:text-red-300" },
  ],
  preparing: [
    { status: "ready", label: "Ready", icon: PackageCheck, color: "text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300" },
  ],
  ready: [
    { status: "completed", label: "Complete", icon: CheckCircle2, color: "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" },
  ],
  completed: [],
  cancelled: [],
};

const TABS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function OrdersPage() {
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState("all");

  const { data: orders, isLoading } = useOrders(tenantId ?? "");
  const { mutateAsync: updateStatus } = useUpdateOrderStatus(tenantId ?? "");

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredOrders =
    orders?.filter((o) =>
      activeTab === "all" ? true : o.status === activeTab,
    ) ?? [];

  const counts = {
    all: orders?.length ?? 0,
    pending: orders?.filter((o) => o.status === "pending").length ?? 0,
    confirmed: orders?.filter((o) => o.status === "confirmed").length ?? 0,
    preparing: orders?.filter((o) => o.status === "preparing").length ?? 0,
    completed: orders?.filter((o) => o.status === "completed").length ?? 0,
    cancelled: orders?.filter((o) => o.status === "cancelled").length ?? 0,
  };

  async function handleUpdateStatus(orderId: string, status: OrderStatus) {
    if (!tenantId) return;
    const key = `${status}-${orderId}`;
    setLoadingAction(key);
    try {
      await updateStatus({ orderId, status });
    } catch (err) {
      console.error(`Failed to update order status:`, err);
    } finally {
      setLoadingAction(null);
    }
  }

  function isActionLoading(status: string, id: string) {
    return loadingAction === `${status}-${id}`;
  }

  function shortId(id: string) {
    return `#${id.slice(-6).toUpperCase()}`;
  }

  function formatDate(timestamp: string | number) {
    return new Date(timestamp).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Orders
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${orders?.length ?? 0} total orders`}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
          <ShoppingBag className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-white/70">
            {counts.pending} pending
          </span>
        </div>
      </div>

      {/* Filter Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-yellow-500/15 data-[state=active]:text-yellow-400"
            >
              {tab.label}
              {counts[tab.value as keyof typeof counts] > 0 && (
                <span className="ml-1.5 text-xs text-white/40">
                  {counts[tab.value as keyof typeof counts]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredOrders.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Order</TableHead>
                      <TableHead className="text-white/50">Customer</TableHead>
                      <TableHead className="text-white/50">Items</TableHead>
                      <TableHead className="text-white/50">Total</TableHead>
                      <TableHead className="text-white/50">Status</TableHead>
                      <TableHead className="text-right text-white/50">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const transitions =
                        STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
                      return (
                        <TableRow
                          key={order.id}
                          className="border-white/[0.06] hover:bg-white/[0.02]"
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-mono text-sm font-medium text-white">
                                {shortId(order.id)}
                              </span>
                              <span className="text-xs text-white/30">
                                {formatDate(order.createdAt)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {order.customerName ?? "Guest"}
                          </TableCell>
                          <TableCell className="text-white/70">
                            {(order.itemCount ?? 0) > 0 ? (
                              <span className="text-sm">
                                {order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-white/40">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            {formatPrice(order.totalAmount, order.currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status as OrderStatus} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {transitions.map((t) => (
                                <Button
                                  key={t.status}
                                  size="sm"
                                  variant="ghost"
                                  className={cn("h-7 gap-1", t.color)}
                                  disabled={isActionLoading(t.status, order.id)}
                                  onClick={() =>
                                    handleUpdateStatus(order.id, t.status)
                                  }
                                >
                                  <t.icon className="h-3.5 w-3.5" />
                                  {t.label}
                                </Button>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <Badge variant={config.variant} className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-24 bg-white/[0.06]" />
          <Skeleton className="h-4 w-32 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-7 w-20 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab }: { tab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No orders found</p>
      <p className="text-xs text-white/30 mt-1">
        {tab === "all"
          ? "Orders will appear here when customers place them."
          : `No ${tab} orders at the moment.`}
      </p>
    </div>
  );
}
