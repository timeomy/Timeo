import { useState, useCallback, useEffect } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  QrCode,
  RefreshCw,
  User,
  Camera,
  History,
  ChevronRight,
  CreditCard,
  CalendarClock,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import * as Brightness from "expo-brightness";
import { useTimeoAuth } from "@timeo/auth";
import {
  useMemberQrCode,
  useGenerateQrCode,
  useMemberships,
  useFaceEnrollmentStatus,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  LoadingScreen,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";

export default function MembershipCardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [isGenerating, setIsGenerating] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(
    null,
  );

  const { data: qrCode, isLoading: qrLoading } = useMemberQrCode(tenantId);
  const { data: memberships } = useMemberships(tenantId);
  const { data: faceStatus } = useFaceEnrollmentStatus(tenantId);
  const generateQrCode = useGenerateQrCode(tenantId ?? "");

  // Auto-brighten screen when QR is displayed
  useEffect(() => {
    if (!qrCode) return;

    let mounted = true;

    const brighten = async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status !== "granted" || !mounted) return;

        const current = await Brightness.getBrightnessAsync();
        if (mounted) {
          setOriginalBrightness(current);
          await Brightness.setBrightnessAsync(1);
        }
      } catch {
        // Brightness API may not be available on all devices
      }
    };

    brighten();

    return () => {
      mounted = false;
      if (originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness).catch(() => {});
      }
    };
  }, [qrCode?.code]);

  const handleGenerate = useCallback(async () => {
    if (!tenantId) return;
    setIsGenerating(true);
    try {
      await generateQrCode.mutateAsync({});
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to generate QR code",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [tenantId, generateQrCode]);

  const displayName = user?.name || "Member";
  const activeMembership = memberships?.find((m) => m.isActive);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Membership" />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (qrLoading) {
    return <LoadingScreen message="Loading membership card..." />;
  }

  return (
    <Screen scroll>
      <Header title="Membership Card" />

      <Spacer size={16} />

      {/* Member Info Card */}
      <Card>
        <View className="items-center">
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            {user?.imageUrl ? (
              <View className="h-20 w-20 overflow-hidden rounded-full">
                <Text
                  className="text-center text-3xl font-bold"
                  style={{ color: theme.colors.primary, lineHeight: 80 }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            ) : (
              <User size={40} color={theme.colors.primary} />
            )}
          </View>

          <Spacer size={12} />

          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            {displayName}
          </Text>

          {activeMembership ? (
            <View className="mt-2 flex-row items-center">
              <CreditCard size={14} color={theme.colors.primary} />
              <Text
                className="ml-1.5 text-sm font-semibold"
                style={{ color: theme.colors.primary }}
              >
                {activeMembership.name}
              </Text>
            </View>
          ) : null}

          {user?.email ? (
            <Text
              className="mt-1 text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              {user.email}
            </Text>
          ) : null}
        </View>
      </Card>

      <Spacer size={16} />

      {/* QR Code Display */}
      {qrCode ? (
        <Card>
          <View className="items-center py-4">
            <View
              className="items-center justify-center rounded-2xl p-4"
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <QRCode value={qrCode.code} size={220} />
            </View>

            <Spacer size={12} />

            <View
              className="rounded-full px-4 py-1.5"
              style={{ backgroundColor: theme.colors.success + "15" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.success }}
              >
                Active
              </Text>
            </View>

            <Spacer size={8} />

            <Text
              className="text-center text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Show this code at the front desk to check in
            </Text>

            {qrCode.expiresAt ? (
              <View className="mt-2 flex-row items-center">
                <CalendarClock size={12} color={theme.colors.warning} />
                <Text
                  className="ml-1 text-xs"
                  style={{ color: theme.colors.warning }}
                >
                  Expires{" "}
                  {new Date(qrCode.expiresAt).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : (
        <Card>
          <View className="items-center py-8">
            <QrCode size={64} color={theme.colors.textSecondary + "50"} />
            <Spacer size={16} />
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
            >
              No Membership Card
            </Text>
            <Text
              className="mt-1 text-center text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Generate your QR code to check in at the gym
            </Text>
            <Spacer size={20} />
            <Button onPress={handleGenerate} loading={isGenerating}>
              <View className="flex-row items-center">
                <QrCode
                  size={16}
                  color={theme.dark ? "#0B0B0F" : "#FFFFFF"}
                />
                <Text
                  className="ml-2 font-semibold"
                  style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
                >
                  Generate QR Code
                </Text>
              </View>
            </Button>
          </View>
        </Card>
      )}

      {qrCode ? (
        <>
          <Spacer size={12} />
          <Button
            variant="outline"
            onPress={handleGenerate}
            loading={isGenerating}
          >
            <View className="flex-row items-center">
              <RefreshCw size={16} color={theme.colors.primary} />
              <Text
                className="ml-2 font-semibold"
                style={{ color: theme.colors.primary }}
              >
                Regenerate Code
              </Text>
            </View>
          </Button>
        </>
      ) : null}

      <Spacer size={24} />

      {/* Quick Navigation */}
      <Card>
        <Text
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Membership
        </Text>

        <Separator />

        <View
          style={{ opacity: 1 }}
          className="flex-row items-center py-3"
          onTouchEnd={() =>
            router.push("/(main)/(customer)/face-enrollment" as never)
          }
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.info + "15" }}
          >
            <Camera size={18} color={theme.colors.info} />
          </View>
          <View className="flex-1">
            <Text
              className="text-base"
              style={{ color: theme.colors.text }}
            >
              Face Enrollment
            </Text>
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              {faceStatus?.enrolled ? "Enrolled" : "Not enrolled"}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </View>

        <Separator />

        <View
          className="flex-row items-center py-3"
          onTouchEnd={() =>
            router.push("/(main)/(customer)/checkin-history" as never)
          }
        >
          <View
            className="mr-3 rounded-lg p-2"
            style={{ backgroundColor: theme.colors.warning + "15" }}
          >
            <History size={18} color={theme.colors.warning} />
          </View>
          <View className="flex-1">
            <Text
              className="text-base"
              style={{ color: theme.colors.text }}
            >
              Check-in History
            </Text>
            <Text
              className="text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              View your past visits
            </Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textSecondary} />
        </View>
      </Card>

      <Spacer size={40} />
    </Screen>
  );
}
