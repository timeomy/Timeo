import React, { useState, useCallback } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, Star } from "lucide-react-native";
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
import { useTimeoAuth } from "@timeo/auth";
import { useMemberships, useSubscribeToMembership } from "@timeo/api-client";

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

  const { data: memberships, isLoading } = useMemberships(tenantId);
  const subscribeMutation = useSubscribeToMembership(tenantId ?? "");

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
        await subscribeMutation.mutateAsync(membershipId);
        setToast({ message: "Subscription started!", type: "success", visible: true });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to subscribe";
        setToast({ message, type: "error", visible: true });
      } finally {
        setSubscribingId(null);
      }
    },
    [subscribeMutation]
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

  if (isLoading) {
    return <LoadingScreen message="Loading memberships..." />;
  }

  const activeMemberships = memberships?.filter((m) => m.isActive) ?? [];

  return (
    <Screen scroll={false}>
      <Header title="Memberships" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
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
            {activeMemberships.map((membership) => (
              <Card key={membership.id} className="mb-4">
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
                        /{membership.billingInterval === "yearly" ? "year" : "month"}
                      </Text>
                    </View>
                  </Row>

                  {membership.benefits && membership.benefits.length > 0 && (
                    <View className="mt-3">
                      <Separator className="mb-3" />
                      {membership.benefits.map(
                        (benefit: string, idx: number) => (
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
                              {benefit}
                            </Text>
                          </Row>
                        )
                      )}
                    </View>
                  )}

                  <Spacer size={12} />

                  <Button
                    onPress={() => handleSubscribe(membership.id)}
                    loading={subscribingId === membership.id}
                    disabled={!!subscribingId}
                  >
                    Subscribe
                  </Button>
                </View>
              </Card>
            ))}
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
