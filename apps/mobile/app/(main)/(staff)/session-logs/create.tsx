import { useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Save } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useCoachClients, useCreateSessionLog } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Select,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";

const SESSION_TYPE_OPTIONS = [
  { label: "PT Session", value: "personal_training" },
  { label: "Group Class", value: "group_class" },
  { label: "Assessment", value: "assessment" },
];

export default function CreateSessionLogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const { clientId: presetClientId } = useLocalSearchParams<{ clientId?: string }>();
  const tenantId = activeTenantId as string;

  const [selectedClientId, setSelectedClientId] = useState(presetClientId ?? "");
  const [sessionType, setSessionType] = useState("personal_training");
  const [duration, setDuration] = useState("60");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const { data: clients, isLoading: loadingClients } = useCoachClients(tenantId);
  const createSessionLog = useCreateSessionLog(tenantId ?? "", { scope: "coach" });

  const clientOptions = useMemo(
    () =>
      (clients ?? []).map((client) => ({
        label: `${client.name} (${client.email})`,
        value: client.id,
      })),
    [clients],
  );

  const handleSave = async () => {
    if (!selectedClientId) {
      Alert.alert("Missing client", "Please select a client first.");
      return;
    }

    const parsedDuration = Number.parseInt(duration, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      Alert.alert("Invalid duration", "Duration must be a positive number.");
      return;
    }

    try {
      await createSessionLog.mutateAsync({
        clientId: selectedClientId,
        sessionType,
        duration: parsedDuration,
        notes: notes.trim() || undefined,
        date,
      });

      Alert.alert("Session logged", "Session log saved successfully.", [
        {
          text: "Great",
          onPress: () => router.replace("/session-logs" as never),
        },
      ]);
    } catch (err) {
      Alert.alert(
        "Save failed",
        err instanceof Error ? err.message : "Unable to save session log.",
      );
    }
  };

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Log Session" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (loadingClients) {
    return <LoadingScreen message="Loading clients..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Log Session" onBack={() => router.back()} />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}
      >
        <Card>
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Client
          </Text>
          <Select
            options={clientOptions}
            value={selectedClientId}
            onChange={setSelectedClientId}
            placeholder="Select a client"
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Session Type
          </Text>
          <Select
            options={SESSION_TYPE_OPTIONS}
            value={sessionType}
            onChange={setSessionType}
            placeholder="Select session type"
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Duration (minutes)
          </Text>
          <TextInput
            className="rounded-xl px-3 py-3 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="e.g. 60"
            placeholderTextColor={theme.colors.textSecondary}
          />

          <Text className="mt-3 mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Session Date (YYYY-MM-DD)
          </Text>
          <TextInput
            className="rounded-xl px-3 py-3 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: theme.colors.textSecondary }}>
            Notes
          </Text>
          <TextInput
            className="rounded-xl px-3 py-3 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              minHeight: 120,
              textAlignVertical: "top",
            }}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="How did the session go?"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </Card>

        <Spacer size={20} />

        <Button size="lg" onPress={handleSave} loading={createSessionLog.isPending}>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Save size={16} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
            <Text style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}>
              Save Session
            </Text>
          </View>
        </Button>
      </ScrollView>
    </Screen>
  );
}
