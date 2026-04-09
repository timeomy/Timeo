import { View, Text, FlatList, RefreshControl, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CalendarDays, CheckCircle2, Users } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useClassAttendance, useMarkAttendance } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Badge,
  EmptyState,
  LoadingScreen,
  useTheme,
} from "@timeo/ui";

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClassAttendanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const { classId } = useLocalSearchParams<{ classId: string }>();

  const tenantId = activeTenantId as string;

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useClassAttendance(tenantId, classId);

  const markAttendance = useMarkAttendance(tenantId ?? "", classId ?? "");

  const handleToggleAttendance = async (enrollmentId: string, attended: boolean) => {
    try {
      await markAttendance.mutateAsync({
        enrollmentId,
        attended: !attended,
      });
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof Error ? err.message : "Unable to update attendance.",
      );
    }
  };

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Attendance" onBack={() => router.back()} />
        <EmptyState
          title="No organization selected"
          description="Please select an organization first."
        />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading class attendance..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Mark Attendance" onBack={() => router.back()} />

      <FlatList
        data={data?.enrollments ?? []}
        keyExtractor={(item) => item.enrollmentId}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 24,
          gap: 10,
        }}
        ListHeaderComponent={
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  {data?.class?.className ?? "Group Class"}
                </Text>
                <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                  <CalendarDays size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {formatDate(data?.class?.startAt)}
                  </Text>
                </View>
                <View className="mt-1 flex-row items-center" style={{ gap: 6 }}>
                  <Users size={13} color={theme.colors.textSecondary} />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {data?.enrollments.length ?? 0} enrolled
                  </Text>
                </View>
              </View>

              <Badge
                label={`${
                  data?.enrollments.filter((item) => item.attended).length ?? 0
                } attended`}
              />
            </View>
          </Card>
        }
        ListEmptyComponent={
          <EmptyState
            title="No enrolled members"
            description="Enrollments will show up here before class starts."
            icon={<Users size={30} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <Card>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-base font-semibold" style={{ color: theme.colors.text }}>
                  {item.memberName}
                </Text>
                {item.memberEmail ? (
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {item.memberEmail}
                  </Text>
                ) : null}
                {item.attendedAt ? (
                  <Text className="mt-1 text-xs" style={{ color: theme.colors.success }}>
                    Marked attended at {formatDate(item.attendedAt)}
                  </Text>
                ) : null}
              </View>

              <Button
                size="sm"
                variant={item.attended ? "outline" : "default"}
                onPress={() =>
                  handleToggleAttendance(item.enrollmentId, item.attended)
                }
                loading={markAttendance.isPending}
              >
                {item.attended ? "Undo" : "Attended"}
              </Button>
            </View>

            <View className="mt-2 flex-row items-center" style={{ gap: 6 }}>
              <CheckCircle2 size={13} color={item.attended ? theme.colors.success : theme.colors.textSecondary} />
              <Text
                className="text-xs"
                style={{
                  color: item.attended ? theme.colors.success : theme.colors.textSecondary,
                }}
              >
                {item.attended ? "Attendance recorded" : "Not marked yet"}
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
