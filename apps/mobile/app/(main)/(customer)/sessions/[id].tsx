import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  User,
  Calendar,
  FileText,
  Dumbbell,
  Activity,
  Heart,
  Weight,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Badge,
  LoadingScreen,
  ErrorScreen,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";

interface ExerciseEntry {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

interface SessionLog {
  id: string;
  sessionType?: string;
  coachName?: string;
  notes?: string;
  exercises: ExerciseEntry[];
  metrics?: {
    weight?: number;
    bodyFat?: number;
    heartRate?: number;
    bloodPressure?: string;
    notes?: string;
  };
  createdAt: string;
}

function formatSessionDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatSessionType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();

  const { data: session, isLoading } = useQuery({
    queryKey: ["session-log", id],
    queryFn: () => api.get<SessionLog>(`/api/sessions/logs/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return <LoadingScreen message="Loading session..." />;
  }

  if (!session) {
    return (
      <ErrorScreen
        title="Session not found"
        message="This session log may have been removed."
        onRetry={() => router.back()}
      />
    );
  }

  return (
    <Screen padded={false}>
      <Header title="Session Details" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Session Type & Date */}
        <Card>
          <View className="flex-row items-center justify-between">
            {session.sessionType && (
              <Badge label={formatSessionType(session.sessionType)} />
            )}
            <View className="flex-row items-center">
              <Calendar size={14} color={theme.colors.textSecondary} />
              <Text
                className="ml-1.5 text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                {formatSessionDate(session.createdAt)}
              </Text>
            </View>
          </View>

          <Spacer size={12} />
          <Separator />
          <Spacer size={12} />

          {/* Coach */}
          {session.coachName && (
            <View className="flex-row items-center">
              <View
                className="mr-3 rounded-lg p-2"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <User size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text
                  className="text-xs"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Coach
                </Text>
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                >
                  {session.coachName}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Notes */}
        {session.notes ? (
          <>
            <Spacer size={12} />
            <Card>
              <View className="flex-row items-center mb-2">
                <FileText size={16} color={theme.colors.textSecondary} />
                <Text
                  className="ml-2 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Notes
                </Text>
              </View>
              <Text
                className="text-sm leading-5"
                style={{ color: theme.colors.text }}
              >
                {session.notes}
              </Text>
            </Card>
          </>
        ) : null}

        {/* Exercises */}
        {session.exercises && session.exercises.length > 0 ? (
          <>
            <Spacer size={12} />
            <Card>
              <View className="flex-row items-center mb-3">
                <Dumbbell size={16} color={theme.colors.primary} />
                <Text
                  className="ml-2 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Exercises ({session.exercises.length})
                </Text>
              </View>
              {session.exercises.map((exercise, index) => (
                <View key={index}>
                  {index > 0 && <Separator className="my-2" />}
                  <View>
                    <Text
                      className="text-base font-medium"
                      style={{ color: theme.colors.text }}
                    >
                      {exercise.name}
                    </Text>
                    <View className="mt-1 flex-row flex-wrap" style={{ gap: 12 }}>
                      {exercise.sets != null && (
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {exercise.sets} sets
                        </Text>
                      )}
                      {exercise.reps != null && (
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {exercise.reps} reps
                        </Text>
                      )}
                      {exercise.weight != null && (
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {exercise.weight} kg
                        </Text>
                      )}
                      {exercise.duration != null && (
                        <Text
                          className="text-sm"
                          style={{ color: theme.colors.textSecondary }}
                        >
                          {exercise.duration} min
                        </Text>
                      )}
                    </View>
                    {exercise.notes ? (
                      <Text
                        className="mt-1 text-xs italic"
                        style={{ color: theme.colors.textSecondary }}
                      >
                        {exercise.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {/* Metrics */}
        {session.metrics ? (
          <>
            <Spacer size={12} />
            <Card>
              <View className="flex-row items-center mb-3">
                <Activity size={16} color={theme.colors.warning} />
                <Text
                  className="ml-2 text-sm font-semibold uppercase tracking-wide"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Body Metrics
                </Text>
              </View>
              <View className="flex-row flex-wrap" style={{ gap: 16 }}>
                {session.metrics.weight != null && (
                  <View className="items-center">
                    <Weight size={20} color={theme.colors.primary} />
                    <Text
                      className="mt-1 text-lg font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {session.metrics.weight}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      kg
                    </Text>
                  </View>
                )}
                {session.metrics.bodyFat != null && (
                  <View className="items-center">
                    <Activity size={20} color={theme.colors.warning} />
                    <Text
                      className="mt-1 text-lg font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {session.metrics.bodyFat}%
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      Body Fat
                    </Text>
                  </View>
                )}
                {session.metrics.heartRate != null && (
                  <View className="items-center">
                    <Heart size={20} color={theme.colors.error} />
                    <Text
                      className="mt-1 text-lg font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {session.metrics.heartRate}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      bpm
                    </Text>
                  </View>
                )}
                {session.metrics.bloodPressure ? (
                  <View className="items-center">
                    <Activity size={20} color={theme.colors.success} />
                    <Text
                      className="mt-1 text-lg font-bold"
                      style={{ color: theme.colors.text }}
                    >
                      {session.metrics.bloodPressure}
                    </Text>
                    <Text
                      className="text-xs"
                      style={{ color: theme.colors.textSecondary }}
                    >
                      BP
                    </Text>
                  </View>
                ) : null}
              </View>
              {session.metrics.notes ? (
                <>
                  <Spacer size={8} />
                  <Text
                    className="text-xs italic"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    {session.metrics.notes}
                  </Text>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        <Spacer size={40} />
      </ScrollView>
    </Screen>
  );
}
