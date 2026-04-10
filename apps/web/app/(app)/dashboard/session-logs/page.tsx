"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  useCoachClients,
  useCreateSessionLog,
  useGymMembers,
  useSessionLogs,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import {
  DEFAULT_EXERCISE_REPS,
  DEFAULT_EXERCISE_SETS,
  SESSION_LOG_DURATION_OPTIONS,
  SESSION_LOG_EXERCISE_TEMPLATES,
  SESSION_LOG_FEEDBACK_OPTIONS,
  SESSION_LOG_QUICK_TYPE_OPTIONS,
  SESSION_LOG_TYPE_LABELS,
  type SessionLogFeedback,
  type SessionLogQuickType,
  type SessionLogType,
} from "@timeo/shared";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ChevronDown,
  ChevronUp,
  Clock3,
  ImagePlus,
  NotebookPen,
  Plus,
  X,
} from "lucide-react";

type ExerciseDraft = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  notes: string;
};

type HistoryExercise = {
  name?: string;
  sets?: number;
  reps?: number;
  weight?: number;
  notes?: string;
};

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

const SESSION_TYPE_BADGE_CLASS: Partial<Record<SessionLogType, string>> = {
  leg_day: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  back_day: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  shoulder_day: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  chest_day: "bg-red-500/15 text-red-300 border-red-400/30",
  arms_day: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  full_body: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  cardio: "bg-orange-500/15 text-orange-300 border-orange-400/30",
  core: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
  assessment: "bg-yellow-500/15 text-yellow-300 border-yellow-400/30",
  custom: "bg-white/10 text-white/90 border-white/20",
  personal_training: "bg-blue-500/15 text-blue-300 border-blue-400/30",
  group_class: "bg-purple-500/15 text-purple-300 border-purple-400/30",
  consultation: "bg-teal-500/15 text-teal-300 border-teal-400/30",
};

const FEEDBACK_LABELS: Record<SessionLogFeedback, string> = {
  great: "Great",
  good: "Good",
  tired: "Tired",
  struggling: "Struggling",
};

function createExerciseDrafts(sessionType: SessionLogQuickType): ExerciseDraft[] {
  return SESSION_LOG_EXERCISE_TEMPLATES[sessionType].map((name) => ({
    name,
    sets: String(DEFAULT_EXERCISE_SETS),
    reps: String(DEFAULT_EXERCISE_REPS),
    weight: "",
    notes: "",
  }));
}

function mapExercisesForPayload(exercises: ExerciseDraft[]) {
  return exercises
    .map((exercise) => ({
      name: exercise.name.trim(),
      sets: exercise.sets.trim() ? Number(exercise.sets) : undefined,
      reps: exercise.reps.trim() ? Number(exercise.reps) : undefined,
      weight: exercise.weight.trim() ? Number(exercise.weight) : undefined,
      notes: exercise.notes.trim() || undefined,
    }))
    .filter((exercise) => exercise.name.length > 0);
}

function formatSessionLabel(
  sessionType: string | undefined,
  customSessionType?: string | null,
) {
  if (!sessionType) return "Session";

  if (sessionType === "custom" && customSessionType?.trim()) {
    return customSessionType.trim();
  }

  const knownLabel =
    SESSION_LOG_TYPE_LABELS[sessionType as SessionLogType] ?? undefined;
  if (knownLabel) return knownLabel;

  return sessionType.replace(/_/g, " ");
}

function formatDateTime(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SessionLogsPage() {
  const { tenantId } = useTenantId();
  const { activeRole } = useTimeoWebAuthContext();
  const isCoach = activeRole === "coach";

  const [selectedClientId, setSelectedClientId] = useState("");
  const [sessionType, setSessionType] = useState<SessionLogQuickType>("leg_day");
  const [customSessionType, setCustomSessionType] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() =>
    createExerciseDrafts("leg_day"),
  );
  const [sessionNotes, setSessionNotes] = useState("");
  const [clientFeedback, setClientFeedback] = useState<SessionLogFeedback | "">(
    "",
  );
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: coachClients = [], isLoading: coachClientsLoading } =
    useCoachClients(tenantId);
  const { data: gymMembers = [], isLoading: gymMembersLoading } = useGymMembers(
    isCoach ? null : tenantId,
  );

  const clientOptions = useMemo<ClientOption[]>(() => {
    if (isCoach) {
      return coachClients.map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
      }));
    }

    return gymMembers
      .filter((member) => member.role === "customer")
      .map((member) => ({
        id: member.userId,
        name: member.name,
        email: member.email,
      }));
  }, [coachClients, gymMembers, isCoach]);

  useEffect(() => {
    if (!selectedClientId && clientOptions.length === 1) {
      setSelectedClientId(clientOptions[0]?.id ?? "");
    }
  }, [clientOptions, selectedClientId]);

  const { data: logs = [], isLoading: logsLoading } = useSessionLogs(tenantId ?? "", {
    scope: isCoach ? "coach" : "tenant",
    clientId: isCoach ? selectedClientId || undefined : undefined,
  });

  const historyLogs = useMemo(() => {
    if (!selectedClientId || isCoach) {
      return logs;
    }

    return logs.filter((log) => log.clientId === selectedClientId);
  }, [isCoach, logs, selectedClientId]);

  const selectedClient = clientOptions.find((client) => client.id === selectedClientId);
  const clientsLoading = isCoach ? coachClientsLoading : gymMembersLoading;

  const { mutateAsync: createLog } = useCreateSessionLog(tenantId ?? "", {
    scope: isCoach ? "coach" : "tenant",
  });

  function setSessionTemplate(nextType: SessionLogQuickType) {
    setSessionType(nextType);
    setExercises(createExerciseDrafts(nextType));
    if (nextType !== "custom") {
      setCustomSessionType("");
    }
  }

  function updateExercise(
    index: number,
    field: keyof ExerciseDraft,
    value: string,
  ) {
    setExercises((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addExercise() {
    setExercises((current) => [
      ...current,
      {
        name: "",
        sets: String(DEFAULT_EXERCISE_SETS),
        reps: String(DEFAULT_EXERCISE_REPS),
        weight: "",
        notes: "",
      },
    ]);
  }

  function removeExercise(index: number) {
    setExercises((current) => current.filter((_, i) => i !== index));
  }

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhotoDataUrl("");
      setPhotoFileName("");
      return;
    }

    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setPhotoDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  }

  const requiresCustomLabel = sessionType === "custom";
  const canSubmit =
    !!tenantId &&
    !!selectedClientId &&
    durationMinutes > 0 &&
    (!requiresCustomLabel || customSessionType.trim().length > 0);

  async function handleSubmit() {
    if (!canSubmit || !tenantId) return;

    setSaving(true);
    setErrorMessage(null);

    const payloadExercises = detailsOpen
      ? mapExercisesForPayload(exercises)
      : undefined;
    const customLabel = requiresCustomLabel
      ? customSessionType.trim()
      : undefined;
    const metrics: Record<string, unknown> = {
      durationMinutes,
      ...(customLabel ? { customSessionType: customLabel } : {}),
      ...(detailsOpen && clientFeedback ? { clientFeedback } : {}),
      ...(detailsOpen && photoDataUrl ? { photoUrl: photoDataUrl } : {}),
    };

    try {
      await createLog({
        clientId: selectedClientId,
        sessionType,
        duration: durationMinutes,
        durationMinutes,
        customSessionType: customLabel,
        notes: detailsOpen ? sessionNotes.trim() || undefined : undefined,
        exercises: payloadExercises,
        clientFeedback: detailsOpen && clientFeedback ? clientFeedback : undefined,
        photoUrl: detailsOpen && photoDataUrl ? photoDataUrl : undefined,
        metrics,
      });

      setSessionNotes("");
      setClientFeedback("");
      setPhotoDataUrl("");
      setPhotoFileName("");
      setDetailsOpen(false);
      setExercises(createExerciseDrafts(sessionType));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to log session",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Session Logs</h1>
        <p className="text-sm text-white/50">
          Fast coach logging with quick defaults and optional detail capture.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <NotebookPen className="h-5 w-5 text-primary" />
            Quick Log Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select
            label="Client"
            placeholder={clientsLoading ? "Loading clients..." : "Select a client"}
            options={clientOptions.map((client) => ({
              value: client.id,
              label: `${client.name} · ${client.email}`,
            }))}
            value={selectedClientId}
            onChange={(value) => {
              setSelectedClientId(value);
              setExpandedLogId(null);
            }}
            disabled={clientsLoading || clientOptions.length === 0}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Session Type</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {SESSION_LOG_QUICK_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSessionTemplate(option.value)}
                  className={cn(
                    "h-12 rounded-xl border px-3 text-sm font-semibold transition-all",
                    sessionType === option.value
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {requiresCustomLabel && (
              <Input
                placeholder="Enter custom session name"
                value={customSessionType}
                onChange={(event) => setCustomSessionType(event.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-white">Duration</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SESSION_LOG_DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDurationMinutes(minutes)}
                  className={cn(
                    "h-11 rounded-xl border px-3 text-sm font-semibold transition-all",
                    durationMinutes === minutes
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25",
                  )}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <button
              type="button"
              onClick={() => setDetailsOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white">Add Details</p>
                <p className="text-xs text-white/50">
                  Exercises, notes, mood feedback, and progress photo.
                </p>
              </div>
              {detailsOpen ? (
                <ChevronUp className="h-4 w-4 text-white/70" />
              ) : (
                <ChevronDown className="h-4 w-4 text-white/70" />
              )}
            </button>

            {detailsOpen && (
              <div className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Exercise List</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={addExercise}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Exercise
                    </Button>
                  </div>

                  {exercises.length === 0 ? (
                    <p className="text-xs text-white/50">
                      No exercises yet. Add one to track details.
                    </p>
                  ) : (
                    exercises.map((exercise, index) => (
                      <div
                        key={`${exercise.name}-${index}`}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Input
                            value={exercise.name}
                            onChange={(event) =>
                              updateExercise(index, "name", event.target.value)
                            }
                            placeholder="Exercise name"
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-red-400 hover:bg-red-500/10"
                            onClick={() => removeExercise(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 md:grid-cols-4">
                          <Input
                            value={exercise.sets}
                            onChange={(event) =>
                              updateExercise(index, "sets", event.target.value)
                            }
                            placeholder="Sets"
                            type="number"
                            min={0}
                          />
                          <Input
                            value={exercise.reps}
                            onChange={(event) =>
                              updateExercise(index, "reps", event.target.value)
                            }
                            placeholder="Reps"
                            type="number"
                            min={0}
                          />
                          <Input
                            value={exercise.weight}
                            onChange={(event) =>
                              updateExercise(index, "weight", event.target.value)
                            }
                            placeholder="Weight"
                            type="number"
                            min={0}
                            step="0.5"
                          />
                          <Input
                            value={exercise.notes}
                            onChange={(event) =>
                              updateExercise(index, "notes", event.target.value)
                            }
                            placeholder="Notes"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Session Notes</p>
                  <textarea
                    value={sessionNotes}
                    onChange={(event) => setSessionNotes(event.target.value)}
                    rows={3}
                    placeholder="Anything notable from this session..."
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Client Feedback / Mood</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {SESSION_LOG_FEEDBACK_OPTIONS.map((feedback) => (
                      <button
                        key={feedback}
                        type="button"
                        onClick={() => setClientFeedback(feedback)}
                        className={cn(
                          "h-10 rounded-xl border text-sm font-medium transition-all",
                          clientFeedback === feedback
                            ? "border-primary/60 bg-primary/20 text-primary"
                            : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25",
                        )}
                      >
                        {FEEDBACK_LABELS[feedback]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-white">Progress Photo</p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 px-3 py-2 text-sm text-white/70 hover:border-white/35">
                    <ImagePlus className="h-4 w-4" />
                    <span>{photoFileName || "Upload image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onPhotoChange}
                    />
                  </label>
                  {photoDataUrl && (
                    <img
                      src={photoDataUrl}
                      alt="Progress preview"
                      className="h-32 w-32 rounded-lg border border-white/10 object-cover"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {errorMessage && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="h-12 w-full text-base font-semibold"
          >
            {saving ? "Logging Session..." : "Log Session"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg text-white">
            Session History
            {selectedClient && (
              <span className="ml-2 text-sm font-normal text-white/60">
                · {selectedClient.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full bg-white/[0.06]" />
              ))}
            </div>
          ) : historyLogs.length === 0 ? (
            <p className="text-sm text-white/50">No sessions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((log) => {
                const exercises = (log.exercises ?? []) as HistoryExercise[];
                const hasDetails =
                  exercises.length > 0 ||
                  Boolean(log.notes?.trim()) ||
                  Boolean(log.clientFeedback) ||
                  Boolean(log.photoUrl);
                const isExpanded = expandedLogId === log.id;
                const duration = log.durationMinutes ?? log.duration ?? null;
                const sessionTypeKey = log.sessionType as SessionLogType | undefined;

                return (
                  <div
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            (sessionTypeKey &&
                              SESSION_TYPE_BADGE_CLASS[sessionTypeKey]) ||
                              "bg-white/10 text-white/90 border-white/20",
                          )}
                        >
                          {formatSessionLabel(
                            log.sessionType,
                            log.customSessionType,
                          )}
                        </Badge>
                        <span className="inline-flex items-center gap-1 text-sm text-white/70">
                          <Clock3 className="h-3.5 w-3.5" />
                          {duration ? `${duration} min` : "-"}
                        </span>
                        {!selectedClientId && log.clientName && (
                          <span className="text-sm text-white/60">{log.clientName}</span>
                        )}
                      </div>
                      <span className="text-xs text-white/40">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>

                    {hasDetails ? (
                      <>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white"
                          onClick={() =>
                            setExpandedLogId((current) =>
                              current === log.id ? null : log.id,
                            )
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                          {isExpanded ? "Hide details" : "Show details"}
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 border-t border-white/10 pt-3 text-sm text-white/80">
                            {exercises.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                  Exercises
                                </p>
                                <div className="space-y-1">
                                  {exercises.map((exercise, index) => (
                                    <div
                                      key={`${exercise.name ?? "exercise"}-${index}`}
                                      className="rounded-md border border-white/10 px-3 py-2"
                                    >
                                      <p className="font-medium text-white">
                                        {exercise.name ?? "Exercise"}
                                      </p>
                                      <p className="text-xs text-white/60">
                                        {exercise.sets ? `${exercise.sets} sets` : "-"} ·{" "}
                                        {exercise.reps ? `${exercise.reps} reps` : "-"} ·{" "}
                                        {typeof exercise.weight === "number"
                                          ? `${exercise.weight} kg`
                                          : "No weight"}
                                      </p>
                                      {exercise.notes && (
                                        <p className="text-xs text-white/60">
                                          {exercise.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {log.notes && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                  Session Notes
                                </p>
                                <p>{log.notes}</p>
                              </div>
                            )}

                            {log.clientFeedback && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                  Client Feedback
                                </p>
                                <p>
                                  {FEEDBACK_LABELS[
                                    log.clientFeedback as SessionLogFeedback
                                  ] ?? log.clientFeedback}
                                </p>
                              </div>
                            )}

                            {log.photoUrl && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-white/50">
                                  Progress Photo
                                </p>
                                <img
                                  src={log.photoUrl}
                                  alt="Progress"
                                  className="mt-1 h-32 w-32 rounded-lg border border-white/10 object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs text-white/45">
                        Quick log only — no extra details saved.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
