"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Avatar,
  AvatarFallback,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  Dumbbell,
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  StickyNote,
  RefreshCw,
  Save,
  X,
  Weight,
  Calendar,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Types ─────────────────────────────────────────────────────────────────────
type Exercise = {
  id?: string;
  name: string;
  training_type?: string;
  equipment?: string;
  is_custom?: boolean;
};

type LogExercise = {
  id?: string;
  name: string;
  training_type?: string;
  sets?: number | string;
  reps?: number | string;
  weight?: number | string;
  notes?: string;
};

type TrainingLog = {
  id: string;
  sessionType: string;
  trainingTypes: string[];
  exercises: LogExercise[];
  weightKg: number | null;
  sessionsUsed: number;
  notes: string;
  published: boolean;
  createdAt: string;
};

type PackageInfo = {
  subscriptionId: string;
  totalClasses: number;
  remainingClasses: number;
  packageName: string;
  packagePreset: string | null;
  status: string;
  expiresAt: string | null;
} | null;

type LibraryExercise = {
  id: string;
  name: string;
  trainingType: string;
  equipment: string | null;
  isCustom: boolean;
};

// ── Utils ─────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-MY", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function getSessionColor(remaining: number): string {
  if (remaining <= 2) return "#ef4444";
  if (remaining <= 5) return "#f59e0b";
  return "#22c55e";
}

// ── Circular Ring ─────────────────────────────────────────────────────────────
function ClassRing({ remaining, total, size = 160 }: { remaining: number; total: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? remaining / total : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const color = getSessionColor(remaining);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} className="absolute">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.3s ease" }}
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <span className="text-4xl font-black" style={{ color }}>{remaining}</span>
        <span className="text-xs text-muted-foreground">/ {total}</span>
        <span className="text-xs text-muted-foreground mt-0.5">remaining</span>
      </div>
    </div>
  );
}

// ── Training Type Chip ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pull: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  push: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/40" },
  legs: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
};

function TypeChip({ type, selected, onClick }: { type: string; selected: boolean; onClick: () => void }) {
  const colors = TYPE_COLORS[type] ?? { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold uppercase text-sm tracking-wide border transition-all min-h-[44px]",
        selected
          ? `${colors.bg} ${colors.text} ${colors.border} shadow-lg`
          : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:border-white/20",
      )}
    >
      {type}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoachClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const router = useRouter();
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();

  // Form state
  const [showNewLog, setShowNewLog] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [weightKg, setWeightKg] = useState<string>("");
  const [selectedExercises, setSelectedExercises] = useState<LogExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [sessionsUsed, setSessionsUsed] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [clientNotes, setClientNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [logConfirmation, setLogConfirmation] = useState<string | null>(null);
  const [sessionReceipt, setSessionReceipt] = useState<{
    clientName: string;
    trainingTypes: string[];
    exerciseCount: number;
    sessionsUsed: number;
    remainingClasses: number | null;
    loggedAt: string;
  } | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [customExName, setCustomExName] = useState("");
  const [customExType, setCustomExType] = useState("pull");
  const [customExEquip, setCustomExEquip] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ["coach", tenantId, "clients"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : [];
    },
    enabled: !!tenantId,
  });
  const client = clients.find((c: any) => c.id === clientId);

  const { data: packageInfo, refetch: refetchPackage } = useQuery<PackageInfo>({
    queryKey: ["coach", tenantId, "client-package", clientId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients/${clientId}/package`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : null;
    },
    enabled: !!tenantId && !!clientId,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<TrainingLog[]>({
    queryKey: ["coach", tenantId, "training-logs", clientId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/training-logs?client_id=${clientId}`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : [];
    },
    enabled: !!tenantId && !!clientId,
  });

  const { data: lastWeightData } = useQuery({
    queryKey: ["coach", tenantId, "client-last-weight", clientId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients/${clientId}/last-weight`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : { weightKg: null };
    },
    enabled: !!tenantId && !!clientId,
  });

  const { data: exercises = [] } = useQuery<LibraryExercise[]>({
    queryKey: ["coach", tenantId, "exercises", selectedTypes.join(",")],
    queryFn: async () => {
      if (selectedTypes.length === 0) return [];
      const url = `${API_URL}/api/tenants/${tenantId}/coaches/exercises?types=${selectedTypes.join(",")}`;
      const res = await fetch(url, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : [];
    },
    enabled: !!tenantId && selectedTypes.length > 0,
  });

  const { data: notesData } = useQuery({
    queryKey: ["coach", tenantId, "client-notes", clientId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients/${clientId}/notes`, { credentials: "include" });
      const d = await res.json();
      return d.success ? d.data : { notes: "" };
    },
    enabled: !!tenantId && !!clientId,
  });

  useEffect(() => {
    if (notesData?.notes !== undefined) setClientNotes(notesData.notes);
  }, [notesData]);

  // Auto-populate weight from last session
  useEffect(() => {
    if (lastWeightData?.weightKg && !weightKg) {
      setWeightKg(String(lastWeightData.weightKg));
    }
  }, [lastWeightData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createLog = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/training-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message || "Failed to create log");
      return d.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "training-logs", clientId] });
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "clients"] });
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "client-package", clientId] });
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "client-last-weight", clientId] });
      setShowNewLog(false);
      setSelectedTypes([]);
      setNotes("");
      setSelectedExercises([]);
      setSessionsUsed(1);
      if (data?.remainingClasses !== null && data?.remainingClasses !== undefined) {
        const warn = data.lowClassesWarning ? " ⚠️ Low sessions!" : "";
        setLogConfirmation(`✅ Session logged! ${data.remainingClasses} classes remaining.${warn}`);
      } else {
        setLogConfirmation("✅ Session logged successfully.");
      }
      setTimeout(() => setLogConfirmation(null), 6000);
    },
    onError: (err: Error) => alert(err.message),
  });

  const addCustomExercise = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: customExName, training_type: customExType, equipment: customExEquip || undefined }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error?.message || "Failed to add exercise");
      return d.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["coach", tenantId, "exercises"] });
      // Auto-select the new exercise
      setSelectedExercises((prev) => [...prev, { id: data.id, name: data.name, training_type: data.trainingType, sets: "", reps: "", weight: "" }]);
      setCustomExName("");
      setCustomExEquip("");
      setShowAddCustom(false);
    },
    onError: (err: Error) => alert(err.message),
  });

  const saveNotes = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/tenants/${tenantId}/coaches/me/clients/${clientId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: clientNotes }),
      });
      return res.json();
    },
    onSuccess: () => {
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleExercise = (ex: LibraryExercise) => {
    setSelectedExercises((prev) => {
      const exists = prev.find((e) => e.id === ex.id || e.name === ex.name);
      if (exists) return prev.filter((e) => e.id !== ex.id && e.name !== ex.name);
      return [...prev, { id: ex.id, name: ex.name, training_type: ex.trainingType, sets: "", reps: "", weight: "" }];
    });
  };

  const updateLogExercise = (idx: number, field: string, value: string) => {
    setSelectedExercises((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      return updated;
    });
  };

  const handleSubmit = () => {
    if (selectedExercises.length === 0 && selectedTypes.length === 0) {
      alert("Please select training types and exercises.");
      return;
    }
    const payload = {
      client_id: clientId,
      date: logDate,
      training_types: selectedTypes,
      weight_kg: weightKg ? parseFloat(weightKg) : undefined,
      sessions_used: sessionsUsed,
      exercises: selectedExercises.map((e) => ({
        id: e.id,
        name: e.name,
        training_type: e.training_type,
        sets: e.sets ? parseInt(e.sets as string) : undefined,
        reps: e.reps ? parseInt(e.reps as string) : undefined,
        weight: e.weight ? parseFloat(e.weight as string) : undefined,
      })),
      notes,
    };
    createLog.mutate(payload);
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const hasPackage = packageInfo !== null && packageInfo !== undefined;
  const isPackageExpired = hasPackage && (packageInfo?.remainingClasses ?? 1) <= 0;
  const isLowClasses = hasPackage && (packageInfo?.remainingClasses ?? 999) <= 5 && !isPackageExpired;
  const lastLog = logs[0];

  // Group exercises by type for display
  const filteredExercises = exerciseSearch.trim()
    ? exercises.filter((ex) => ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
    : exercises;

  const groupedExercises = filteredExercises.reduce<Record<string, LibraryExercise[]>>((acc, ex) => {
    if (!acc[ex.trainingType]) acc[ex.trainingType] = [];
    acc[ex.trainingType].push(ex);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-16" style={{ background: "#0A0F1E", minHeight: "100vh" }}>
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 pt-2 pb-3 px-1" style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/my-clients")} className="h-11 w-11 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-lg font-bold">
              {client ? getInitials(client.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{client?.name || "Loading..."}</h1>
            <p className="text-xs text-muted-foreground truncate">{client?.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {hasPackage && packageInfo?.packagePreset && (
              <Badge className="text-xs bg-primary/20 text-primary border-0 font-bold">
                {packageInfo.packagePreset}
              </Badge>
            )}
            {hasPackage && !packageInfo?.packagePreset && (
              <Badge className="text-xs bg-primary/20 text-primary border-0">PT Package</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="px-1 space-y-5">
        {/* ── PACKAGE CARD ── */}
        {hasPackage && (
          <Card className={cn(
            "glass-card border-2 transition-all",
            isPackageExpired ? "border-red-500/60 shadow-red-500/20 shadow-lg"
              : isLowClasses ? "border-amber-400/60 shadow-amber-400/20 shadow-lg"
              : "border-emerald-500/40",
          )}>
            {isPackageExpired && (
              <div className="flex items-center gap-3 rounded-t-xl bg-red-500/20 px-4 py-3 border-b border-red-500/30">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 animate-pulse" />
                <p className="text-sm font-bold text-red-400">PACKAGE EXPIRED — Client needs to renew</p>
              </div>
            )}
            {isLowClasses && (
              <div className="flex items-center gap-3 rounded-t-xl bg-amber-500/15 px-4 py-2.5 border-b border-amber-400/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <p className="text-sm text-amber-400 font-medium">
                  Low sessions — only {packageInfo?.remainingClasses} left!
                </p>
              </div>
            )}
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <p className="font-semibold text-white">
                    {packageInfo?.packagePreset ? `${packageInfo.packagePreset} — ` : ""}
                    {packageInfo?.packageName}
                  </p>
                  {packageInfo?.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Expires {packageInfo.expiresAt}
                    </p>
                  )}
                </div>
                <ClassRing
                  remaining={packageInfo?.remainingClasses ?? 0}
                  total={packageInfo?.totalClasses ?? 1}
                  size={180}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── SESSION RECEIPT ── */}
        {sessionReceipt && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 overflow-hidden">
            {/* Receipt header */}
            <div className="flex items-center gap-3 bg-emerald-500/20 px-4 py-3 border-b border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-300">Session Logged Successfully!</p>
                <p className="text-xs text-emerald-400/70">{new Date(sessionReceipt.loggedAt).toLocaleString("en-MY", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button onClick={() => setSessionReceipt(null)} className="text-emerald-400/50 hover:text-emerald-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Receipt details */}
            <div className="grid grid-cols-2 gap-0 divide-x divide-emerald-500/20 px-0 py-0">
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-emerald-400/70 mb-1">Exercises</p>
                <p className="text-sm font-bold text-white">{sessionReceipt.exerciseCount}</p>
              </div>
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-emerald-400/70 mb-1">Credits Left</p>
                <p className={sessionReceipt.remainingClasses !== null && sessionReceipt.remainingClasses <= 2 ? "text-sm font-bold text-red-400" : "text-sm font-bold text-emerald-300"}>
                  {sessionReceipt.remainingClasses !== null ? sessionReceipt.remainingClasses : "N/A"}
                </p>
              </div>
            </div>
            {sessionReceipt.trainingTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-4">
                {sessionReceipt.trainingTypes.map((t) => {
                  const colors = TYPE_COLORS[t] ?? { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };
                  return (
                    <span key={t} className={[colors.bg, colors.text, "border", colors.border, "rounded-full px-2.5 py-0.5 text-xs font-semibold"].join(" ")}>
                      {t}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LOG CONFIRMATION (fallback) ── */}
        {logConfirmation && !sessionReceipt && (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-400 font-medium">{logConfirmation}</p>
          </div>
        )}

        {/* ── LOG SESSION BUTTON ── */}
        {!showNewLog && (
          <Button
            onClick={() => setShowNewLog(true)}
            disabled={isPackageExpired}
            className={cn(
              "w-full h-14 text-base font-bold gap-2 rounded-xl",
              isPackageExpired
                ? "opacity-50 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20",
            )}
          >
            <Plus className="h-6 w-6" />
            {isPackageExpired ? "Package Expired — Cannot Log" : "Log Session"}
          </Button>
        )}

        {/* ── LOG SESSION FORM ── */}
        {showNewLog && (
          <Card className="glass-card border-primary/40 shadow-lg shadow-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Dumbbell className="h-5 w-5 text-primary" />
                Log Session
              </CardTitle>
              {hasPackage && !isPackageExpired && (
                <p className="text-xs text-muted-foreground">
                  This will deduct {sessionsUsed} session(s). {packageInfo?.remainingClasses} remaining.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">

              {/* Training Types */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Training Type (select all that apply)
                </label>
                <div className="flex gap-3 flex-wrap">
                  {["pull", "push", "legs"].map((type) => (
                    <TypeChip
                      key={type}
                      type={type}
                      selected={selectedTypes.includes(type)}
                      onClick={() => toggleType(type)}
                    />
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Session Date
                </label>
                <Input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="h-11 bg-background border-border/40 text-white"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Weight className="h-4 w-4" /> Client Weight (kg)
                  {lastWeightData?.weightKg && (
                    <span className="text-xs text-white/30 font-normal">last: {lastWeightData.weightKg}kg</span>
                  )}
                </label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={lastWeightData?.weightKg ? `${lastWeightData.weightKg}` : "e.g. 75.5"}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="h-11 bg-background border-border/40 text-white placeholder:text-white/30"
                />
              </div>

              {/* Exercise Selector */}
              {selectedTypes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Exercises
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddCustom(!showAddCustom)}
                      className="text-xs text-primary hover:text-primary h-7 gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Custom
                    </Button>
                  </div>

                  {/* Custom Exercise Form */}
                  {showAddCustom && (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-3 space-y-2">
                      <Input
                        placeholder="Exercise name"
                        value={customExName}
                        onChange={(e) => setCustomExName(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="flex gap-2">
                        <select
                          value={customExType}
                          onChange={(e) => setCustomExType(e.target.value)}
                          className="flex-1 rounded-lg border border-border/40 bg-background px-2 py-1.5 text-sm text-white h-9"
                        >
                          <option value="pull">Pull</option>
                          <option value="push">Push</option>
                          <option value="legs">Legs</option>
                        </select>
                        <Input
                          placeholder="Equipment (opt)"
                          value={customExEquip}
                          onChange={(e) => setCustomExEquip(e.target.value)}
                          className="flex-1 h-9 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => addCustomExercise.mutate()}
                          disabled={!customExName.trim() || addCustomExercise.isPending}
                          className="h-8 flex-1"
                        >
                          Add & Select
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowAddCustom(false)} className="h-8">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Exercise Search */}
                  <div className="relative mb-2">
                    <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      value={exerciseSearch}
                      onChange={(e) => setExerciseSearch(e.target.value)}
                      placeholder="Search exercises..."
                      className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-8 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-primary/50 focus:outline-none"
                    />
                  </div>

                {/* Library Exercises by Group */}
                  <div className="space-y-3">
                    {Object.entries(groupedExercises).map(([type, exList]) => {
                      const colors = TYPE_COLORS[type] ?? { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };
                      return (
                        <div key={type}>
                          <p className={cn("text-xs font-bold uppercase tracking-wider mb-1.5 px-1", colors.text)}>
                            {type}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {exList.map((ex) => {
                              const isSelected = selectedExercises.some((e) => e.id === ex.id || e.name === ex.name);
                              return (
                                <button
                                  key={ex.id}
                                  onClick={() => toggleExercise(ex)}
                                  className={cn(
                                    "text-left px-3 py-2 rounded-lg border text-sm transition-all min-h-[44px]",
                                    isSelected
                                      ? `${colors.bg} ${colors.text} ${colors.border}`
                                      : "bg-white/[0.03] border-white/[0.06] text-white/60 hover:border-white/20",
                                  )}
                                >
                                  <span className="font-medium leading-tight">{ex.name}</span>
                                  {ex.equipment && (
                                    <span className="block text-xs opacity-60 mt-0.5">{ex.equipment}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Exercises — sets/reps/weight */}
              {selectedExercises.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Sets / Reps / Weight for Selected Exercises
                  </label>
                  <div className="space-y-2">
                    {selectedExercises.map((ex, idx) => (
                      <div key={idx} className="rounded-lg border border-border/30 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">{ex.name}</span>
                          <button
                            onClick={() => setSelectedExercises((prev) => prev.filter((_, i) => i !== idx))}
                            className="text-white/30 hover:text-red-400 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <Input
                            placeholder="Sets"
                            type="number"
                            value={ex.sets as string}
                            onChange={(e) => updateLogExercise(idx, "sets", e.target.value)}
                            className="h-10 text-center text-sm"
                          />
                          <Input
                            placeholder="Reps"
                            type="number"
                            value={ex.reps as string}
                            onChange={(e) => updateLogExercise(idx, "reps", e.target.value)}
                            className="h-10 text-center text-sm"
                          />
                          <Input
                            placeholder="kg"
                            type="number"
                            step="0.5"
                            value={ex.weight as string}
                            onChange={(e) => updateLogExercise(idx, "weight", e.target.value)}
                            className="h-10 text-center text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Session Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observations, feedback, next steps..."
                  rows={3}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-3 text-sm resize-none text-white placeholder:text-white/30"
                />
              </div>

              {/* Sessions Used */}
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Sessions to Deduct
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionsUsed(Math.max(1, sessionsUsed - 1))}
                    className="h-10 w-10 p-0"
                  >-</Button>
                  <span className="text-lg font-bold text-white w-8 text-center">{sessionsUsed}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSessionsUsed(sessionsUsed + 1)}
                    className="h-10 w-10 p-0"
                  >+</Button>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  onClick={handleSubmit}
                  disabled={createLog.isPending}
                  className="h-12 gap-2 font-semibold bg-primary hover:bg-primary/90"
                >
                  {createLog.isPending ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Logging...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Submit Session Log</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewLog(false);
                    setSelectedTypes([]);
                    setNotes("");
                    setSelectedExercises([]);
                    setSessionsUsed(1);
                  }}
                  className="h-11 text-muted-foreground"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── LAST SESSION CARD ── */}
        {lastLog && !showNewLog && (
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" /> Last Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{formatDate(lastLog.createdAt)}</p>
                  {lastLog.weightKg && (
                    <p className="text-xs text-white/50 mt-0.5">Weight: {lastLog.weightKg} kg</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {(lastLog.trainingTypes ?? []).map((t) => {
                    const colors = TYPE_COLORS[t] ?? { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };
                    return (
                      <span key={t} className={cn("text-xs font-bold uppercase px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
              {lastLog.exercises?.length > 0 && (
                <div className="space-y-1">
                  {lastLog.exercises.slice(0, 4).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2 text-sm">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                        {ex.weight ? ` @ ${ex.weight}kg` : ""}
                      </span>
                    </div>
                  ))}
                  {lastLog.exercises.length > 4 && (
                    <p className="text-xs text-muted-foreground pl-1">+{lastLog.exercises.length - 4} more</p>
                  )}
                </div>
              )}
              {lastLog.notes && (
                <div className="rounded-lg bg-card/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground italic">{lastLog.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── TRAINING HISTORY ── */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4" /> Training History ({logs.length})
          </h2>

          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-card/40 animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="p-10 text-center text-muted-foreground">
                <Dumbbell className="mx-auto h-10 w-10 mb-3 opacity-20" />
                <p className="text-base">No sessions logged yet</p>
              </CardContent>
            </Card>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                className="glass-card cursor-pointer transition-all duration-200 hover:border-white/20"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-primary/15">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(log.trainingTypes ?? []).length > 0
                            ? (log.trainingTypes ?? []).map((t) => {
                                const colors = TYPE_COLORS[t] ?? { bg: "bg-white/10", text: "text-white/60", border: "" };
                                return (
                                  <span key={t} className={cn("text-xs font-bold uppercase px-1.5 py-0.5 rounded", colors.bg, colors.text)}>
                                    {t}
                                  </span>
                                );
                              })
                            : <span className="text-sm font-medium capitalize">{log.sessionType?.replace(/_/g, " ")}</span>
                          }
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(log.createdAt)} · {log.exercises?.length || 0} exercises
                          {log.weightKg ? ` · ${log.weightKg}kg` : ""}
                          {log.sessionsUsed > 1 ? ` · ${log.sessionsUsed} sessions` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {expandedLog === log.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {expandedLog === log.id && (
                    <div className="mt-4 space-y-3 border-t border-border/20 pt-4">
                      {log.exercises?.length > 0 && (
                        <div className="space-y-1">
                          {log.exercises.map((ex, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-card/60 px-3 py-2">
                              <span className="text-sm font-medium">{ex.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ""}
                                {ex.weight ? ` @ ${ex.weight}kg` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {log.notes && (
                        <div className="rounded-lg bg-card/40 px-3 py-2">
                          <p className="text-xs text-muted-foreground">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ── CLIENT NOTES ── */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <StickyNote className="h-4 w-4" /> Client Notes
            </CardTitle>
            <p className="text-xs text-muted-foreground">Visible to the client from their portal.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={clientNotes}
              onChange={(e) => { setClientNotes(e.target.value); setNotesSaved(false); }}
              placeholder="Goals, preferences, health history, progress..."
              rows={5}
              className="w-full rounded-lg border border-border/40 bg-background px-3 py-3 text-sm resize-none text-white placeholder:text-white/30"
            />
            <Button
              onClick={() => saveNotes.mutate()}
              disabled={saveNotes.isPending}
              variant={notesSaved ? "outline" : "default"}
              className={cn("h-11 gap-2 w-full", notesSaved && "border-emerald-500/50 text-emerald-400")}
            >
              {notesSaved ? (
                <><CheckCircle2 className="h-4 w-4" /> Notes Saved</>
              ) : saveNotes.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4" /> Save Notes</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
