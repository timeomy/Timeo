import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  Plus,
  Trash2,
  Dumbbell,
  Activity,
  Save,
} from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Button,
  Select,
  LoadingScreen,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";

const SESSION_TYPES = [
  { label: "Personal Training", value: "personal_training" },
  { label: "Group Class", value: "group_class" },
  { label: "Assessment", value: "assessment" },
  { label: "Consultation", value: "consultation" },
];

interface Exercise {
  name: string;
  sets?: string;
  reps?: string;
  weight?: string;
  duration?: string;
  notes?: string;
}

export default function CreateSessionLogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any;

  const [selectedClientId, setSelectedClientId] = useState("");
  const [sessionType, setSessionType] = useState("personal_training");
  const [notes, setNotes] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: "", sets: "", reps: "", weight: "" },
  ]);
  const [metricsWeight, setMetricsWeight] = useState("");
  const [metricsBodyFat, setMetricsBodyFat] = useState("");
  const [metricsHeartRate, setMetricsHeartRate] = useState("");
  const [metricsBloodPressure, setMetricsBloodPressure] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const members = useQuery(
    api.tenantMemberships.listByTenant,
    tenantId ? { tenantId } : "skip"
  );

  const credits = useQuery(
    api.sessionCredits.getByUser,
    tenantId && selectedClientId
      ? { tenantId, userId: selectedClientId as any }
      : "skip"
  );

  const [selectedCreditId, setSelectedCreditId] = useState("");

  const createSessionLog = useMutation(api.sessionLogs.create);

  const clientOptions = useMemo(() => {
    if (!members) return [];
    return members
      .filter((m) => m.status === "active")
      .map((m) => ({
        label: `${m.userName} (${m.userEmail})`,
        value: m.userId as string,
      }));
  }, [members]);

  const creditOptions = useMemo(() => {
    if (!credits) return [];
    return credits
      .filter((c) => c.remaining > 0)
      .map((c) => ({
        label: `${c.packageName} (${c.remaining} left)`,
        value: c._id as string,
      }));
  }, [credits]);

  const addExercise = useCallback(() => {
    setExercises((prev) => [
      ...prev,
      { name: "", sets: "", reps: "", weight: "" },
    ]);
  }, []);

  const removeExercise = useCallback((index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateExercise = useCallback(
    (index: number, field: keyof Exercise, value: string) => {
      setExercises((prev) =>
        prev.map((ex, i) => (i === index ? { ...ex, [field]: value } : ex))
      );
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedClientId) {
      Alert.alert("Error", "Please select a client.");
      return;
    }

    const validExercises = exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets ? parseInt(ex.sets, 10) : undefined,
        reps: ex.reps ? parseInt(ex.reps, 10) : undefined,
        weight: ex.weight ? parseFloat(ex.weight) : undefined,
        duration: ex.duration ? parseInt(ex.duration, 10) : undefined,
        notes: ex.notes || undefined,
      }));

    const hasMetrics =
      metricsWeight || metricsBodyFat || metricsHeartRate || metricsBloodPressure;
    const metrics = hasMetrics
      ? {
          weight: metricsWeight ? parseFloat(metricsWeight) : undefined,
          bodyFat: metricsBodyFat ? parseFloat(metricsBodyFat) : undefined,
          heartRate: metricsHeartRate
            ? parseInt(metricsHeartRate, 10)
            : undefined,
          bloodPressure: metricsBloodPressure || undefined,
        }
      : undefined;

    setIsSubmitting(true);
    try {
      await createSessionLog({
        tenantId,
        clientId: selectedClientId as any,
        sessionType: sessionType as any,
        exercises: validExercises,
        notes: notes || undefined,
        metrics,
        creditId: selectedCreditId ? (selectedCreditId as any) : undefined,
      });
      Alert.alert("Success", "Session log created successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create session log"
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedClientId,
    sessionType,
    exercises,
    notes,
    metricsWeight,
    metricsBodyFat,
    metricsHeartRate,
    metricsBloodPressure,
    selectedCreditId,
    tenantId,
    createSessionLog,
    router,
  ]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="New Session" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (members === undefined) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="New Session Log" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Client Picker */}
        <Card>
          <View className="flex-row items-center mb-2">
            <User size={16} color={theme.colors.primary} />
            <Text
              className="ml-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Client
            </Text>
          </View>
          <Select
            options={clientOptions}
            value={selectedClientId}
            onChange={setSelectedClientId}
            placeholder="Select a client..."
          />
        </Card>

        <Spacer size={12} />

        {/* Session Type */}
        <Card>
          <Text
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Session Type
          </Text>
          <Select
            options={SESSION_TYPES}
            value={sessionType}
            onChange={setSessionType}
            placeholder="Select session type..."
          />
        </Card>

        <Spacer size={12} />

        {/* Credit Selection */}
        {selectedClientId && creditOptions.length > 0 && (
          <>
            <Card>
              <Text
                className="mb-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Use Session Credit (Optional)
              </Text>
              <Select
                options={[
                  { label: "No credit", value: "" },
                  ...creditOptions,
                ]}
                value={selectedCreditId}
                onChange={setSelectedCreditId}
                placeholder="Select credit package..."
              />
            </Card>
            <Spacer size={12} />
          </>
        )}

        {/* Exercises */}
        <Card>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Dumbbell size={16} color={theme.colors.primary} />
              <Text
                className="ml-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Exercises
              </Text>
            </View>
            <TouchableOpacity onPress={addExercise}>
              <View
                className="flex-row items-center rounded-full px-3 py-1"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Plus size={14} color={theme.colors.primary} />
                <Text
                  className="ml-1 text-xs font-semibold"
                  style={{ color: theme.colors.primary }}
                >
                  Add
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {exercises.map((exercise, index) => (
            <View key={index}>
              {index > 0 && <Separator className="my-3" />}
              <View className="flex-row items-center justify-between mb-2">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Exercise {index + 1}
                </Text>
                {exercises.length > 1 && (
                  <TouchableOpacity onPress={() => removeExercise(index)}>
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                className="rounded-xl px-3 py-2.5 text-base"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="Exercise name"
                placeholderTextColor={theme.colors.textSecondary}
                value={exercise.name}
                onChangeText={(v) => updateExercise(index, "name", v)}
              />
              <View className="mt-2 flex-row" style={{ gap: 8 }}>
                <TextInput
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  style={{
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  placeholder="Sets"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={exercise.sets}
                  onChangeText={(v) => updateExercise(index, "sets", v)}
                  keyboardType="numeric"
                />
                <TextInput
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  style={{
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  placeholder="Reps"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={exercise.reps}
                  onChangeText={(v) => updateExercise(index, "reps", v)}
                  keyboardType="numeric"
                />
                <TextInput
                  className="flex-1 rounded-xl px-3 py-2 text-sm"
                  style={{
                    backgroundColor: theme.colors.background,
                    color: theme.colors.text,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                  placeholder="Weight (kg)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={exercise.weight}
                  onChangeText={(v) => updateExercise(index, "weight", v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          ))}
        </Card>

        <Spacer size={12} />

        {/* Body Metrics */}
        <Card>
          <View className="flex-row items-center mb-3">
            <Activity size={16} color={theme.colors.warning} />
            <Text
              className="ml-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Body Metrics (Optional)
            </Text>
          </View>
          <View className="flex-row" style={{ gap: 8 }}>
            <View className="flex-1">
              <Text
                className="mb-1 text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Weight (kg)
              </Text>
              <TextInput
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                value={metricsWeight}
                onChangeText={setMetricsWeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text
                className="mb-1 text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Body Fat (%)
              </Text>
              <TextInput
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                value={metricsBodyFat}
                onChangeText={setMetricsBodyFat}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
          <Spacer size={8} />
          <View className="flex-row" style={{ gap: 8 }}>
            <View className="flex-1">
              <Text
                className="mb-1 text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Heart Rate (bpm)
              </Text>
              <TextInput
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="0"
                placeholderTextColor={theme.colors.textSecondary}
                value={metricsHeartRate}
                onChangeText={setMetricsHeartRate}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text
                className="mb-1 text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Blood Pressure
              </Text>
              <TextInput
                className="rounded-xl px-3 py-2 text-sm"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="120/80"
                placeholderTextColor={theme.colors.textSecondary}
                value={metricsBloodPressure}
                onChangeText={setMetricsBloodPressure}
              />
            </View>
          </View>
        </Card>

        <Spacer size={12} />

        {/* Notes */}
        <Card>
          <Text
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Notes
          </Text>
          <TextInput
            className="rounded-xl px-3 py-3 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              minHeight: 100,
              textAlignVertical: "top",
            }}
            placeholder="Session notes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>

        <Spacer size={24} />

        {/* Submit */}
        <Button size="lg" onPress={handleSubmit} loading={isSubmitting}>
          <View className="flex-row items-center">
            <Save size={18} color="#FFFFFF" />
            <Text className="ml-2 text-base font-semibold text-white">
              Save Session Log
            </Text>
          </View>
        </Button>

        <Spacer size={40} />
      </ScrollView>
    </Screen>
  );
}
