"use client";

import { useState } from "react";
import {
  useSessionLogs,
  useCreateSessionLog,
  useDeleteSessionLog,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  Plus,
  Trash2,
  Search,
  AlertCircle,
  Dumbbell,
  X,
} from "lucide-react";

type SessionType =
  | "personal_training"
  | "group_class"
  | "assessment"
  | "consultation";

const SESSION_TYPE_CONFIG: Record<
  SessionType,
  { label: string; className: string }
> = {
  personal_training: {
    label: "Personal Training",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  group_class: {
    label: "Group Class",
    className: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  assessment: {
    label: "Assessment",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  },
  consultation: {
    label: "Consultation",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
};

const SESSION_TYPE_OPTIONS = [
  { label: "Personal Training", value: "personal_training" },
  { label: "Group Class", value: "group_class" },
  { label: "Assessment", value: "assessment" },
  { label: "Consultation", value: "consultation" },
];

const TABS = [
  { value: "all", label: "All" },
  { value: "personal_training", label: "PT" },
  { value: "group_class", label: "Group" },
  { value: "assessment", label: "Assessment" },
  { value: "consultation", label: "Consult" },
] as const;

interface ExerciseEntry {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

interface SessionForm {
  clientEmail: string;
  sessionType: SessionType;
  notes: string;
  exercises: ExerciseEntry[];
  metricsWeight: string;
  metricsBodyFat: string;
  metricsHeartRate: string;
}

const EMPTY_FORM: SessionForm = {
  clientEmail: "",
  sessionType: "personal_training",
  notes: "",
  exercises: [],
  metricsWeight: "",
  metricsBodyFat: "",
  metricsHeartRate: "",
};

const EMPTY_EXERCISE: ExerciseEntry = {
  name: "",
  sets: undefined,
  reps: undefined,
  weight: undefined,
  duration: undefined,
};

export default function SessionLogsPage() {
  const { tenantId } = useTenantId();
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<SessionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: logs, isLoading } = useSessionLogs(tenantId ?? "");
  const { mutateAsync: createLog } = useCreateSessionLog(tenantId ?? "");
  const { mutateAsync: deleteLog } = useDeleteSessionLog(tenantId ?? "");

  const filteredLogs =
    logs?.filter((l) =>
      activeTab === "all" ? true : l.sessionType === activeTab,
    ) ?? [];

  const counts = {
    all: logs?.length ?? 0,
    personal_training:
      logs?.filter((l) => l.sessionType === "personal_training").length ?? 0,
    group_class:
      logs?.filter((l) => l.sessionType === "group_class").length ?? 0,
    assessment:
      logs?.filter((l) => l.sessionType === "assessment").length ?? 0,
    consultation:
      logs?.filter((l) => l.sessionType === "consultation").length ?? 0,
  };

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function addExercise() {
    setForm({
      ...form,
      exercises: [...form.exercises, { ...EMPTY_EXERCISE }],
    });
  }

  function updateExercise(index: number, field: string, value: string | number) {
    const updated = [...form.exercises];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, exercises: updated });
  }

  function removeExercise(index: number) {
    setForm({
      ...form,
      exercises: form.exercises.filter((_, i) => i !== index),
    });
  }

  async function handleSave() {
    if (!tenantId || !form.clientEmail.trim()) return;
    setSaving(true);
    try {
      const metrics =
        form.metricsWeight || form.metricsBodyFat || form.metricsHeartRate
          ? {
              weight: form.metricsWeight
                ? Number(form.metricsWeight)
                : undefined,
              bodyFat: form.metricsBodyFat
                ? Number(form.metricsBodyFat)
                : undefined,
              heartRate: form.metricsHeartRate
                ? Number(form.metricsHeartRate)
                : undefined,
            }
          : undefined;

      const exercises = form.exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          name: e.name.trim(),
          sets: e.sets || undefined,
          reps: e.reps || undefined,
          weight: e.weight || undefined,
          duration: e.duration || undefined,
        }));

      await createLog({
        clientEmail: form.clientEmail.trim(),
        sessionType: form.sessionType,
        notes: form.notes || undefined,
        exercises,
        metrics,
      });

      setDialogOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("Failed to create session log:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(sessionLogId: string) {
    if (!tenantId) return;
    try {
      await deleteLog(sessionLogId);
    } catch (err) {
      console.error("Failed to delete session log:", err);
    }
  }

  function formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Session Logs
          </h1>
          <p className="text-sm text-white/50">
            {isLoading
              ? "Loading..."
              : `${logs?.length ?? 0} session${(logs?.length ?? 0) !== 1 ? "s" : ""} logged`}
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Log Session
        </Button>
      </div>

      {/* Filter Tabs + Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/[0.04] border border-white/[0.06]">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-400"
            >
              {tab.label}
              {counts[tab.value as keyof typeof counts] > 0 && (
                <span className="ml-1.5 text-xs text-white/40">
                  {counts[tab.value as keyof typeof counts]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card className="glass-card">
            <CardContent className="p-0">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredLogs.length === 0 ? (
                <EmptyState tab={activeTab} onAdd={openCreate} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="text-white/50">Client</TableHead>
                      <TableHead className="text-white/50">Type</TableHead>
                      <TableHead className="text-white/50">Coach</TableHead>
                      <TableHead className="text-white/50">
                        Exercises
                      </TableHead>
                      <TableHead className="text-white/50">Date</TableHead>
                      <TableHead className="text-right text-white/50">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        className="border-white/[0.06] hover:bg-white/[0.02]"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">
                              {log.clientName}
                            </p>
                            {log.clientEmail && (
                              <p className="text-xs text-white/40">
                                {log.clientEmail}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              SESSION_TYPE_CONFIG[
                                log.sessionType as SessionType
                              ]?.className,
                            )}
                          >
                            {SESSION_TYPE_CONFIG[
                              log.sessionType as SessionType
                            ]?.label ?? log.sessionType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/70">
                          {log.coachName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-white/70">
                            <Dumbbell className="h-3.5 w-3.5 text-white/40" />
                            {log.exercises.length} exercise
                            {log.exercises.length !== 1 ? "s" : ""}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/70">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => handleDelete(log.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Session</DialogTitle>
            <DialogDescription>
              Record a training session with exercises and metrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Client Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Email</label>
              <Input
                placeholder="client@example.com"
                value={form.clientEmail}
                onChange={(e) =>
                  setForm({ ...form, clientEmail: e.target.value })
                }
                type="email"
              />
            </div>

            <Select
              label="Session Type"
              options={SESSION_TYPE_OPTIONS}
              value={form.sessionType}
              onChange={(value) =>
                setForm({ ...form, sessionType: value as SessionType })
              }
            />

            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                placeholder="Session notes..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            {/* Exercises */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exercises</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1"
                  onClick={addExercise}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Exercise
                </Button>
              </div>
              {form.exercises.map((exercise, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Exercise name"
                      value={exercise.name}
                      onChange={(e) => updateExercise(i, "name", e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                      onClick={() => removeExercise(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Sets"
                      type="number"
                      min={0}
                      value={exercise.sets ?? ""}
                      onChange={(e) =>
                        updateExercise(
                          i,
                          "sets",
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                    <Input
                      placeholder="Reps"
                      type="number"
                      min={0}
                      value={exercise.reps ?? ""}
                      onChange={(e) =>
                        updateExercise(
                          i,
                          "reps",
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                    <Input
                      placeholder="Weight (kg)"
                      type="number"
                      min={0}
                      step="0.5"
                      value={exercise.weight ?? ""}
                      onChange={(e) =>
                        updateExercise(
                          i,
                          "weight",
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                    <Input
                      placeholder="Duration (min)"
                      type="number"
                      min={0}
                      value={exercise.duration ?? ""}
                      onChange={(e) =>
                        updateExercise(
                          i,
                          "duration",
                          e.target.value ? Number(e.target.value) : "",
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Body Metrics (optional)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Weight (kg)"
                  type="number"
                  min={0}
                  step="0.1"
                  value={form.metricsWeight}
                  onChange={(e) =>
                    setForm({ ...form, metricsWeight: e.target.value })
                  }
                />
                <Input
                  label="Body Fat %"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={form.metricsBodyFat}
                  onChange={(e) =>
                    setForm({ ...form, metricsBodyFat: e.target.value })
                  }
                />
                <Input
                  label="Heart Rate"
                  type="number"
                  min={0}
                  value={form.metricsHeartRate}
                  onChange={(e) =>
                    setForm({ ...form, metricsHeartRate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.clientEmail.trim()}
            >
              {saving ? "Saving..." : "Log Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-28 bg-white/[0.06]" />
          <Skeleton className="h-5 w-24 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
          <Skeleton className="h-7 w-16 ml-auto bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ tab, onAdd }: { tab: string; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">
        No session logs found
      </p>
      <p className="text-xs text-white/30 mt-1">
        {tab === "all"
          ? "Log your first training session to get started."
          : `No ${tab.replace(/_/g, " ")} sessions at the moment.`}
      </p>
      {tab === "all" && (
        <Button size="sm" className="mt-4 gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Log Session
        </Button>
      )}
    </div>
  );
}
