import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import {
  QrCode,
  UserPlus,
  Clock,
  Users,
  Search,
  X,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useCheckIns,
  useCheckInStats,
  useCreateCheckIn,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  StatCard,
  Button,
  Modal,
  LoadingScreen,
  EmptyState,
  Spacer,
  useTheme,
} from "@timeo/ui";


function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMethod(method: string): string {
  if (method === "qr") return "QR";
  if (method === "nfc") return "NFC";
  return "Manual";
}

export default function CheckInsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [showManualCheckIn, setShowManualCheckIn] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const todayStr = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString().split("T")[0];
  }, []);

  const { data: checkIns, isLoading, refetch } = useCheckIns(tenantId, { date: todayStr });
  const { data: stats } = useCheckInStats(tenantId);
  const { mutateAsync: createCheckIn } = useCreateCheckIn(tenantId ?? "");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleManualCheckIn = useCallback(
    async (email: string, userName: string) => {
      Alert.alert(
        "Manual Check-in",
        `Check in ${userName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Check In",
            onPress: async () => {
              try {
                await createCheckIn({ email, method: "manual" });
                setShowManualCheckIn(false);
                setMemberSearch("");
                Alert.alert("Success", `${userName} has been checked in.`);
              } catch (err) {
                Alert.alert(
                  "Error",
                  err instanceof Error
                    ? err.message
                    : "Failed to check in member"
                );
              }
            },
          },
        ]
      );
    },
    [createCheckIn]
  );

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Check-ins" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading && !checkIns) {
    return <LoadingScreen message="Loading check-ins..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Check-ins" onBack={() => router.back()} />

      {/* Stats */}
      {stats && (
        <View className="px-4 pb-3">
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <StatCard
                label="Today"
                value={stats.today}
                icon={<Users size={16} color={theme.colors.primary} />}
              />
            </View>
            <View className="flex-1">
              <StatCard
                label="This Week"
                value={stats.thisWeek}
                icon={<Clock size={16} color={theme.colors.success} />}
              />
            </View>
          </View>
          <Spacer size={8} />
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="flex-1">
              <StatCard
                label="QR"
                value={stats.byMethod.qr}
                icon={<QrCode size={16} color={theme.colors.info} />}
              />
            </View>
            <View className="flex-1">
              <StatCard
                label="Manual"
                value={stats.byMethod.manual}
                icon={<UserPlus size={16} color={theme.colors.warning} />}
              />
            </View>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View className="px-4 pb-3" style={{ gap: 8 }}>
        <View className="flex-row" style={{ gap: 10 }}>
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => router.push("/check-ins/scan" as any)}
          >
            <View className="flex-row items-center">
              <QrCode size={16} color={theme.colors.primary} />
              <Text
                className="ml-2 font-semibold"
                style={{ color: theme.colors.primary }}
              >
                Scan QR
              </Text>
            </View>
          </Button>
          <Button
            className="flex-1"
            onPress={() => setShowManualCheckIn(true)}
          >
            <View className="flex-row items-center">
              <UserPlus size={16} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
              <Text className="ml-2 font-semibold" style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}>
                Manual
              </Text>
            </View>
          </Button>
        </View>
      </View>

      <View className="px-4 pb-2">
        <Text
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: theme.colors.textSecondary }}
        >
          Today's Check-ins ({checkIns?.length ?? 0})
        </Text>
      </View>

      {/* Check-in List */}
      <FlatList
        data={checkIns ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          gap: 8,
        }}
        ListEmptyComponent={
          <EmptyState
            title="No check-ins today"
            description="Check-ins will appear here as members arrive."
            icon={<Users size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Text
                  className="text-sm font-bold"
                  style={{ color: theme.colors.primary }}
                >
                  {(item.userName ?? "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {item.userName ?? "Unknown"}
                </Text>
                {item.userEmail ? (
                  <Text
                    className="text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {item.userEmail}
                  </Text>
                ) : null}
              </View>
              <View className="items-end">
                <Text
                  className="text-sm font-medium"
                  style={{ color: theme.colors.text }}
                >
                  {formatTime(item.checkedInAt)}
                </Text>
                <View
                  className="mt-1 rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor:
                      item.method === "qr"
                        ? theme.colors.info + "15"
                        : item.method === "manual"
                          ? theme.colors.warning + "15"
                          : theme.colors.success + "15",
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{
                      color:
                        item.method === "qr"
                          ? theme.colors.info
                          : item.method === "manual"
                            ? theme.colors.warning
                            : theme.colors.success,
                    }}
                  >
                    {formatMethod(item.method)}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      />

      {/* Manual Check-in Modal */}
      <Modal
        visible={showManualCheckIn}
        onClose={() => {
          setShowManualCheckIn(false);
          setMemberSearch("");
        }}
        title="Manual Check-in"
      >
        <View>
          <View
            className="flex-row items-center rounded-xl px-3 py-2"
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
          >
            <Search size={18} color={theme.colors.textSecondary} />
            <TextInput
              className="ml-2 flex-1 text-base"
              style={{ color: theme.colors.text }}
              placeholder="Enter member email..."
              placeholderTextColor={theme.colors.textSecondary}
              value={memberSearch}
              onChangeText={setMemberSearch}
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {memberSearch ? (
              <TouchableOpacity onPress={() => setMemberSearch("")}>
                <X size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <Spacer size={12} />

          <Button
            onPress={() => {
              if (memberSearch.trim()) {
                handleManualCheckIn(memberSearch.trim(), memberSearch.trim());
              }
            }}
            disabled={!memberSearch.trim()}
          >
            Check In
          </Button>
        </View>
      </Modal>
    </Screen>
  );
}
