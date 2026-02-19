"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { formatDate, formatPrice } from "@timeo/shared";
import {
  Card,
  CardContent,
  Badge,
  Button,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@timeo/ui/web";
import { Package, ShoppingBag, Calendar } from "lucide-react";

function getOrderStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "confirmed":
    case "preparing":
      return "default";
    case "pending":
      return "secondary";
    case "ready":
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

function getOrderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function OrdersPage() {
  const { activeTenantId, isSignedIn } = useTimeoWebAuthContext();

  const orders = useQuery(
    api.orders.listByCustomer,
    activeTenantId ? { tenantId: activeTenantId as any } : "skip"
  );

  const isLoading = orders === undefined;

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Package className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Sign in to view orders</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You need to be signed in to see your orders.
        </p>
        <Link href="/sign-in">
          <Button className="mt-4">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="mt-2 text-muted-foreground">
          Track and manage your orders.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && orders?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No orders yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your order history will appear here after your first purchase.
          </p>
          <Link href="/products">
            <Button className="mt-4 gap-2">
              Browse Products
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}

      {/* No tenant */}
      {!activeTenantId && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Package className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No business selected</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in and select a business to view your orders.
          </p>
        </div>
      )}

      {/* Orders */}
      {orders && orders.length > 0 && (
        <>
          {/* Desktop Table */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono text-sm">
                      #{order._id.slice(-8).toUpperCase()}
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-sm text-muted-foreground"
                          >
                            {item.quantity}x {item.snapshotName}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.totalAmount, order.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getOrderStatusVariant(order.status)}
                      >
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((order) => (
              <Card key={order._id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <Badge
                          variant={getOrderStatusVariant(order.status)}
                        >
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(order.createdAt)}
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-sm text-muted-foreground"
                          >
                            {item.quantity}x {item.snapshotName}
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="flex-shrink-0 font-semibold text-primary">
                      {formatPrice(order.totalAmount, order.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
