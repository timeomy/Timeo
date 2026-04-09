import { useMemo } from "react";
import { useRouter } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import {
  Calendar,
  Clock3,
  CreditCard,
  History,
  Package,
  WalletCards,
} from "lucide-react-native";
import {
  useMemberships,
  useMyMembershipSubscriptions,
  useMyPaymentRequests,
  useSessionCredits,
} from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";
import { Card, Header, Screen, Spacer, useTheme } from "@timeo/ui";

type SubscriptionRow = {
  subscription?: {
    status?: string;
    currentPeriodStart?: string;
    current_period_start?: string;
    currentPeriodEnd?: string;
    current_period_end?: string;
  };
  plan?: {
    name?: string | null;
    price?: number | null;
  };
};

function getSubscriptionStartDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodStart ?? row?.subscription?.current_period_start ?? null;
}

function getSubscriptionEndDate(row: SubscriptionRow | null) {
  return row?.subscription?.currentPeriodEnd ?? row?.subscription?.current_period_end ?? null;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number, currency = "MYR") {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function getStatusTone(status?: string) {
  if (!status) {
    return { label: "pending", color: "#88878F" };
  }

  if (status === "active") {
    return { label: "active", color: "#10B981" };
  }

  if (status === "past_due" || status === "incomplete") {
    return { label: status.replace("_", " "), color: "#F59E0B" };
  }

  if (status === "canceled") {
    return { label: "canceled", color: "#EF4444" };
  }

  return { label: status.replace("_", " "), color: "#88878F" };
}

function getPaymentStatusTone(status: string) {
  if (status === "approved") {
    return "#10B981";
  }

  if (status === "pending_verification") {
    return "#F59E0B";
  }

  if (status === "rejected") {
    return "#EF4444";
  }

  return "#88878F";
}

export default function MembershipScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();

  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useMyMembershipSubscriptions(activeTenantId);
  const { data: sessionCredits = [], isLoading: creditsLoading } =
    useSessionCredits(activeTenantId);
  const { data: paymentRequests = [], isLoading: paymentsLoading } =
    useMyPaymentRequests(activeTenantId);
  const { data: plans = [], isLoading: plansLoading } = useMemberships(activeTenantId);

  const sortedSubscriptions = useMemo(
    () =>
      [...(subscriptions as SubscriptionRow[])].sort((left, right) => {
        const leftDate = new Date(getSubscriptionEndDate(left) ?? 0).getTime();
        const rightDate = new Date(getSubscriptionEndDate(right) ?? 0).getTime();
        return rightDate - leftDate;
      }),
    [subscriptions],
  );

  const latestSubscription = sortedSubscriptions[0] ?? null;
  const periodStart = getSubscriptionStartDate(latestSubscription);
  const periodEnd = getSubscriptionEndDate(latestSubscription);
  const planName = latestSubscription?.plan?.name ?? "No active plan";
  const planStatus = latestSubscription?.subscription?.status;

  const daysRemaining = useMemo(() => {
    if (!periodEnd) return null;
    const dayMs = 86_400_000;
    return Math.ceil((new Date(periodEnd).getTime() - Date.now()) / dayMs);
  }, [periodEnd]);

  const totalSessions = sessionCredits.reduce(
    (total, credit) => total + Math.max(0, credit.totalSessions ?? 0),
    0,
  );
  const usedSessions = sessionCredits.reduce(
    (total, credit) => total + Math.max(0, credit.usedSessions ?? 0),
    0,
  );
  const remainingSessions = sessionCredits.reduce(
    (total, credit) => total + Math.max(0, credit.remaining ?? 0),
    0,
  );

  const activePlans = plans.filter((plan) => {
    if (plan.isActive !== undefined) {
      return plan.isActive;
    }

    if (plan.is_active !== undefined) {
      return plan.is_active;
    }

    return true;
  });

  const statusTone = getStatusTone(planStatus);

  return (
    <Screen scroll>
      <Header title="My Plan" />

      <Spacer size={16} />

      <Card>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
            Current Plan
          </Text>
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: statusTone.color + "20" }}
          >
            <Text className="text-xs font-semibold capitalize" style={{ color: statusTone.color }}>
              {statusTone.label}
            </Text>
          </View>
        </View>

        <Text className="mt-2 text-xl font-bold" style={{ color: theme.colors.text }}>
          {subscriptionsLoading ? "Loading..." : planName}
        </Text>

        <View className="mt-3 flex-row">
          <View className="mr-2 flex-1 rounded-xl border px-3 py-2" style={{ borderColor: theme.colors.border }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              Start
            </Text>
            <Text className="mt-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
              {formatDate(periodStart)}
            </Text>
          </View>

          <View className="flex-1 rounded-xl border px-3 py-2" style={{ borderColor: theme.colors.border }}>
            <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
              End
            </Text>
            <Text className="mt-1 text-sm font-semibold" style={{ color: theme.colors.text }}>
              {formatDate(periodEnd)}
            </Text>
          </View>
        </View>

        <View
          className="mt-3 rounded-xl px-3 py-2"
          style={{ backgroundColor: theme.colors.background + "80" }}
        >
          <Text className="text-sm" style={{ color: theme.colors.text }}>
            {daysRemaining === null
              ? "Your plan status appears here once subscribed."
              : `${Math.max(daysRemaining, 0)} day${daysRemaining === 1 ? "" : "s"} remaining`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/(main)/(customer)/memberships" as never)}
          className="mt-4 rounded-xl px-4 py-3"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="text-center text-sm font-semibold" style={{ color: "#0B0B0F" }}>
            Renew / Top-up
          </Text>
        </TouchableOpacity>
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center">
          <CreditCard size={16} color={theme.colors.textSecondary} />
          <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
            Session Credits
          </Text>
        </View>

        {creditsLoading ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading credits...
          </Text>
        ) : totalSessions === 0 ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            No session package yet. Top up credits to book more classes.
          </Text>
        ) : (
          <>
            <View
              className="rounded-2xl px-4 py-4"
              style={{ backgroundColor: theme.colors.background + "80" }}
            >
              <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                Remaining Credits
              </Text>
              <Text className="mt-1 text-3xl font-bold" style={{ color: theme.colors.text }}>
                {remainingSessions}
              </Text>
              <Text className="mt-1 text-xs" style={{ color: theme.colors.textSecondary }}>
                {usedSessions} used out of {totalSessions}
              </Text>
            </View>

            {sessionCredits.map((credit, index) => (
              <View
                key={credit.id}
                className={`mt-3 flex-row items-center justify-between rounded-xl px-3 py-2 ${
                  index < sessionCredits.length - 1 ? "" : ""
                }`}
                style={{ backgroundColor: theme.colors.background + "60" }}
              >
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                    {credit.packageName ?? "Session package"}
                  </Text>
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    Expires {formatDate(credit.expiresAt)}
                  </Text>
                </View>
                <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
                  {credit.remaining}/{credit.totalSessions}
                </Text>
              </View>
            ))}
          </>
        )}
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <History size={16} color={theme.colors.textSecondary} />
            <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
              Payment History
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(main)/(customer)/memberships" as never)}
          >
            <Text className="text-xs font-semibold" style={{ color: theme.colors.primary }}>
              Full history
            </Text>
          </TouchableOpacity>
        </View>

        {paymentsLoading ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading payments...
          </Text>
        ) : paymentRequests.length === 0 ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            No payments yet.
          </Text>
        ) : (
          paymentRequests.slice(0, 6).map((payment, index) => {
            const tone = getPaymentStatusTone(payment.status);

            return (
              <View
                key={payment.id}
                className={`rounded-xl px-3 py-3 ${index > 0 ? "mt-2" : ""}`}
                style={{ backgroundColor: theme.colors.background + "60" }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                      {payment.planName}
                    </Text>
                    <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                      {new Date(payment.createdAt).toLocaleDateString("en-MY")}
                    </Text>
                  </View>

                  <View
                    className="rounded-full px-2 py-0.5"
                    style={{ backgroundColor: tone + "20" }}
                  >
                    <Text className="text-[11px] font-semibold" style={{ color: tone }}>
                      {payment.status.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                <Text className="mt-2 text-sm font-bold" style={{ color: theme.colors.primary }}>
                  {formatMoney(payment.amount, payment.currency)}
                </Text>
              </View>
            );
          })
        )}
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center">
          <WalletCards size={16} color={theme.colors.textSecondary} />
          <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
            Available Plans
          </Text>
        </View>

        {plansLoading ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading plans...
          </Text>
        ) : activePlans.length === 0 ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            No plans published yet.
          </Text>
        ) : (
          activePlans.slice(0, 4).map((plan, index) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => router.push("/(main)/(customer)/memberships" as never)}
              className={`rounded-xl px-3 py-3 ${index > 0 ? "mt-2" : ""}`}
              style={{ backgroundColor: theme.colors.background + "60" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center">
                    <Package size={14} color={theme.colors.textSecondary} />
                    <Text className="ml-1.5 text-sm font-semibold" style={{ color: theme.colors.text }}>
                      {plan.name}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-xs" style={{ color: theme.colors.textSecondary }}>
                    {plan.description ?? "Membership package"}
                  </Text>
                </View>

                <View className="items-end">
                  <Text className="text-sm font-bold" style={{ color: theme.colors.primary }}>
                    {formatMoney(plan.price, plan.currency)}
                  </Text>
                  <View className="mt-1 flex-row items-center">
                    <Calendar size={11} color={theme.colors.textSecondary} />
                    <Text className="ml-1 text-[11px]" style={{ color: theme.colors.textSecondary }}>
                      {plan.billingInterval === "yearly" ? "Yearly" : "Monthly"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </Card>

      <Spacer size={16} />

      <TouchableOpacity
        onPress={() => router.push("/(main)/(customer)/checkin-history" as never)}
        className="flex-row items-center justify-center rounded-xl border px-4 py-3"
        style={{ borderColor: theme.colors.border }}
      >
        <Clock3 size={16} color={theme.colors.primary} />
        <Text className="ml-2 text-sm font-semibold" style={{ color: theme.colors.primary }}>
          View Check-in History
        </Text>
      </TouchableOpacity>
    </Screen>
  );
}
