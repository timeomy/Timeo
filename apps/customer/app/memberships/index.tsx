import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { useQuery, useAction } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Button,
  LoadingScreen,
  Toast,
  Section,
  Row,
  Spacer,
  Separator,
  useTheme,
} from "@timeo/ui";
import {
  Crown,
  CheckCircle2,
  Star,
  ArrowLeft,
} from "lucide-react-native";
import { useRouter } from "expo-router";

function formatCents(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: currency || "MYR",
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function MembershipsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const createCheckoutSession = useAction(api.payments.createCheckoutSession);

  const memberships = useQuery(
    api.memberships.listByTenant,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const activeSubscription = useQuery(
    api.payments.getSubscription,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const [subscribingId, setSubscribingId] = useState<string | null>(null);

  const handleSubscribe = useCallback(
    async (membershipId: string) => {
      setSubscribingId(membershipId);
      try {
        const result = await createCheckoutSession({
          tenantId: tenantId as any,
          customerId: "" as any, // Server resolves from auth
          membershipId: membershipId as any,
          successUrl: "timeo://memberships?success=true",
          cancelUrl: "timeo://memberships?canceled=true",
        });

        if (result.url) {
          await Linking.openURL(result.url);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to start checkout";
        setToast({ message, type: "error", visible: true });
      } finally {
        setSubscribingId(null);
      }
    },
    [tenantId, createCheckoutSession]
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Memberships" />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (memberships === undefined) {
    return <LoadingScreen message="Loading memberships..." />;
  }

  const activeMemberships = memberships?.filter((m: any) => m.isActive) ?? [];

  return (
    <Screen scroll={false}>
      <Header
        title="Memberships"
        leftAction={{
          icon: ArrowLeft,
          onPress: () => router.back(),
        }}
      />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Active Subscription Banner */}
        {activeSubscription && (
          <Card className="mb-4">
            <View
              className="rounded-xl p-4"
              style={{ backgroundColor: theme.colors.success + "10" }}
            >
              <Row align="center" gap={12}>
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.success + "20" }}
                >
                  <Crown size={20} color={theme.colors.success} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.colors.text }}
                  >
                    Active Membership
                  </Text>
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Renews{" "}
                    {new Date(
                      activeSubscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1"
                  style={{ backgroundColor: theme.colors.success + "20" }}
                >
                  <Text
                    className="text-xs font-semibold capitalize"
                    style={{ color: theme.colors.success }}
                  >
                    {activeSubscription.status}
                  </Text>
                </View>
              </Row>
            </View>
          </Card>
        )}

        {/* Available Plans */}
        {activeMemberships.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Star size={48} color={theme.colors.textSecondary + "50"} />
            <Text
              className="mt-4 text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              No membership plans available
            </Text>
            <Text
              className="mt-1 text-center text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Membership plans will appear here when the business offers them.
            </Text>
          </View>
        ) : (
          <Section title="Available Plans">
            {activeMemberships.map((membership: any) => {
              const isCurrentPlan =
                activeSubscription?.membershipId === membership._id;

              return (
                <Card key={membership._id} className="mb-4">
                  <View className="p-1">
                    <Row justify="between" align="start">
                      <View className="flex-1">
                        <Text
                          className="text-lg font-bold"
                          style={{ color: theme.colors.text }}
                        >
                          {membership.name}
                        </Text>
                        <Text
                          className="mt-1 text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {membership.description}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-xl font-bold"
                          style={{ color: theme.colors.primary }}
                        >
                          {formatCents(membership.price, membership.currency)}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          /{membership.interval === "yearly" ? "year" : "month"}
                        </Text>
                      </View>
                    </Row>

                    {membership.features.length > 0 && (
                      <View className="mt-3">
                        <Separator className="mb-3" />
                        {membership.features.map(
                          (feature: string, idx: number) => (
                            <Row
                              key={idx}
                              align="center"
                              gap={8}
                              className="mb-1.5"
                            >
                              <CheckCircle2
                                size={14}
                                color={theme.colors.success}
                              />
                              <Text
                                className="flex-1 text-sm"
                                style={{ color: theme.colors.text }}
                              >
                                {feature}
                              </Text>
                            </Row>
                          )
                        )}
                      </View>
                    )}

                    <Spacer size={12} />

                    {isCurrentPlan ? (
                      <Button variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button
                        onPress={() => handleSubscribe(membership._id)}
                        loading={subscribingId === membership._id}
                        disabled={!!subscribingId}
                      >
                        {activeSubscription ? "Switch Plan" : "Subscribe"}
                      </Button>
                    )}
                  </View>
                </Card>
              );
            })}
          </Section>
        )}
      </ScrollView>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
