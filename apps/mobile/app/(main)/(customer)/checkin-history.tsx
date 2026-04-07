import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  QrCode,
  ScanFace,
  Wifi,
  HandMetal,
  MapPin,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useMyCheckInHistory } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";

const METHOD_CONFIG = {
  qr: { label: "QR Code", Icon: QrCode, color: "primary" as const },
  face: { label: "Face", Icon: ScanFace, color: "info" as const },
  nfc: { label: "NFC", Icon: Wifi, color: "secondary" as const },
  manual: { label: "Manual", Icon: HandMetal, color: "warning" as const },
};

export default function CheckinHistoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading } = useMyCheckInHistory(tenantId, { page, limit });

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Check-in History" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading && page === 1) {
    return <LoadingScreen message="Loading check-in history..." />;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Screen padded={false}>
      <View className="px-4">
        <Header title="Check-in History" onBack={() => router.back()} />
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Clock size={48} color={theme.colors.textSecondary + "50"} />
          <Spacer size={16} />
          <Text
            className="text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            No Check-ins Yet
          </Text>
          <Text
            className="mt-1 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Your check-in history will appear here after your first visit.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <Spacer size={8} />}
          renderItem={({ item }) => {
            const method = item.method ?? "manual";
            const config = METHOD_CONFIG[method] ?? METHOD_CONFIG.manual;
            const { Icon, label, color } = config;
            const isGranted = item.status !== "denied";
            const date = new Date(item.checkedInAt);

            return (
              <Card>
                <View className="flex-row items-center">
                  {/* Method icon */}
                  <View
                    className="mr-3 rounded-lg p-2.5"
                    style={{
                      backgroundColor:
                        (theme.colors[color] ?? theme.colors.primary) + "15",
                    }}
                  >
                    <Icon
                      size={20}
                      color={theme.colors[color] ?? theme.colors.primary}
                    />
                  </View>

                  {/* Details */}
                  <View className="flex-1">
                    <View className="flex-row items-center">
                      <Text
                        className="text-base font-semibold"
                        style={{ color: theme.colors.text }}
                      >
                        {date.toLocaleDateString("en-MY", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </View>

                    <View className="mt-1 flex-row items-center gap-3">
                      <Text
                        className="text-sm"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor:
                            (theme.colors[color] ?? theme.colors.primary) +
                            "15",
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{
                            color:
                              theme.colors[color] ?? theme.colors.primary,
                          }}
                        >
                          {label}
                        </Text>
                      </View>
                      {item.location ? (
                        <View className="flex-row items-center">
                          <MapPin
                            size={11}
                            color={theme.colors.textSecondary}
                          />
                          <Text
                            className="ml-0.5 text-xs"
                            style={{ color: theme.colors.textSecondary }}
                          >
                            {item.location}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Status */}
                  {item.status ? (
                    <View className="ml-2">
                      {isGranted ? (
                        <CheckCircle2
                          size={20}
                          color={theme.colors.success}
                        />
                      ) : (
                        <XCircle size={20} color={theme.colors.error} />
                      )}
                    </View>
                  ) : (
                    <CheckCircle2 size={20} color={theme.colors.success} />
                  )}
                </View>
              </Card>
            );
          }}
          ListFooterComponent={
            totalPages > 1 ? (
              <View className="mt-4 flex-row items-center justify-center gap-4">
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg p-2"
                  style={{
                    backgroundColor: theme.colors.surface,
                    opacity: page <= 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={20} color={theme.colors.text} />
                </TouchableOpacity>

                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  Page {page} of {totalPages}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg p-2"
                  style={{
                    backgroundColor: theme.colors.surface,
                    opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={20} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}
