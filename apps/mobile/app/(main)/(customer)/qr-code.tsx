import { useState, useCallback } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { QrCode, RefreshCw, User, Sun, Clock } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useTimeoAuth } from "@timeo/auth";
import { useMemberQrCode, useGenerateQrCode, useCheckIns } from "@timeo/api-client";
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

export default function QrCodeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [isGenerating, setIsGenerating] = useState(false);

  const { data: qrCode, isLoading } = useMemberQrCode(tenantId);
  const { data: recentCheckIns } = useCheckIns(tenantId);
  const generateQrCode = useGenerateQrCode(tenantId ?? "");

  const handleGenerate = useCallback(async () => {
    if (!tenantId) return;
    setIsGenerating(true);
    try {
      await generateQrCode.mutateAsync({});
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to generate QR code"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [tenantId, generateQrCode]);

  const displayName = user?.name || "Member";

  if (!tenantId) {
    return (
      <Screen>
        <Header title="My QR Code" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading QR code..." />;
  }

  return (
    <Screen scroll>
      <Header title="My QR Code" onBack={() => router.back()} />

      <Spacer size={24} />

      {/* Member Info */}
      <View className="items-center">
        <View
          className="h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: theme.colors.primary + "15" }}
        >
          <User size={32} color={theme.colors.primary} />
        </View>
        <Spacer size={12} />
        <Text
          className="text-xl font-bold"
          style={{ color: theme.colors.text }}
        >
          {displayName}
        </Text>
        <Text
          className="mt-1 text-sm"
          style={{ color: theme.colors.textSecondary }}
        >
          Scan to check in
        </Text>
      </View>

      <Spacer size={32} />

      {qrCode ? (
        <Card>
          <View className="items-center py-6">
            <View
              className="items-center justify-center rounded-2xl"
              style={{
                width: 240,
                height: 240,
                backgroundColor: "#FFFFFF",
              }}
            >
              <QRCode value={qrCode.code} size={200} />
            </View>

            <Spacer size={16} />

            <View
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: theme.colors.success + "15" }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: theme.colors.success }}
              >
                Active
              </Text>
            </View>

            <Spacer size={16} />

            <Text
              className="text-center text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Show this code to staff at the front desk
            </Text>

            <Spacer size={12} />

            <View
              className="flex-row items-center rounded-xl px-3 py-2"
              style={{ backgroundColor: theme.colors.warning + "10" }}
            >
              <Sun size={14} color={theme.colors.warning} />
              <Text
                className="ml-2 flex-1 text-xs"
                style={{ color: theme.colors.warning }}
              >
                Tip: Increase screen brightness for faster scanning
              </Text>
            </View>
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
              No QR Code Yet
            </Text>
            <Text
              className="mt-1 text-center text-sm"
              style={{ color: theme.colors.textSecondary }}
            >
              Generate a QR code to check in at the gym
            </Text>
            <Spacer size={20} />
            <Button onPress={handleGenerate} loading={isGenerating}>
              <View className="flex-row items-center">
                <QrCode size={16} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
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

      {qrCode && (
        <>
          <Spacer size={16} />
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
      )}

      {/* Recent Check-ins */}
      {recentCheckIns && recentCheckIns.length > 0 && (
        <>
          <Spacer size={24} />
          <Card>
            <View className="flex-row items-center mb-3">
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text
                className="ml-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Recent Check-ins
              </Text>
            </View>
            {recentCheckIns.slice(0, 5).map((checkIn, index) => (
              <View key={checkIn.id}>
                {index > 0 && <Separator />}
                <View className="flex-row items-center justify-between py-2.5">
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.text }}
                  >
                    {new Date(checkIn.checkedInAt).toLocaleDateString("en-MY", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                  <Text
                    className="text-sm"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {new Date(checkIn.checkedInAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <Spacer size={40} />
    </Screen>
  );
}
