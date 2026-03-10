"use client";

import { useState } from "react";
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
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  Cpu,
  Plus,
  Wifi,
  WifiOff,
  Unlock,
  SmilePlus,
  Clock,
  Hash,
  Loader2,
  X,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type TurnstileDevice = {
  id: string;
  name: string;
  serialNumber: string;
  status: "online" | "offline";
  lastSeen: string | null;
  enrolledFaces: number;
};

// ---- Data hooks ----

function useDevices() {
  const { tenantId } = useTenantId();
  return useQuery<TurnstileDevice[]>({
    queryKey: ["gym", tenantId, "/devices"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/devices`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load devices");
      return data.data as TurnstileDevice[];
    },
    enabled: !!tenantId,
  });
}

function useRegisterDevice() {
  const { tenantId } = useTenantId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; serialNumber: string }) => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/devices`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to register device");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gym", tenantId] });
    },
  });
}

function useOpenDoor() {
  const { tenantId } = useTenantId();
  return useMutation({
    mutationFn: async (deviceId: string) => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/devices/${deviceId}/open`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to open door");
      return data.data;
    },
  });
}

// ---- Helpers ----

function formatRelative(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---- Page ----

export default function TurnstileDevicesPage() {
  const router = useRouter();
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState("");
  const [regSerial, setRegSerial] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const { data: devices, isLoading } = useDevices();
  const registerMutation = useRegisterDevice();
  const openDoorMutation = useOpenDoor();

  async function handleRegister() {
    if (!regName.trim() || !regSerial.trim()) return;
    try {
      await registerMutation.mutateAsync({
        name: regName.trim(),
        serialNumber: regSerial.trim(),
      });
      setRegName("");
      setRegSerial("");
      setShowRegister(false);
    } catch (err) {
      console.error("Register device failed:", err);
    }
  }

  async function handleOpenDoor(deviceId: string) {
    setOpeningId(deviceId);
    try {
      await openDoorMutation.mutateAsync(deviceId);
    } catch (err) {
      console.error("Open door failed:", err);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-white/50 hover:text-white"
            onClick={() => router.push("/dashboard/gym")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Turnstile Devices
            </h1>
            <p className="text-sm text-white/50">
              {isLoading
                ? "Loading..."
                : `${devices?.length ?? 0} device${(devices?.length ?? 0) !== 1 ? "s" : ""} registered`}
            </p>
          </div>
        </div>
        <Button
          className="gap-2"
          onClick={() => setShowRegister(!showRegister)}
        >
          {showRegister ? (
            <>
              <X className="h-4 w-4" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Register Device
            </>
          )}
        </Button>
      </div>

      {/* Register Form (inline) */}
      {showRegister && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Register New Device</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Device Name
                </label>
                <Input
                  placeholder="e.g. Front Entrance"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Serial Number
                </label>
                <Input
                  placeholder="e.g. TSL-2024-001"
                  value={regSerial}
                  onChange={(e) => setRegSerial(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleRegister}
                disabled={
                  registerMutation.isPending ||
                  !regName.trim() ||
                  !regSerial.trim()
                }
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Device"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRegister(false);
                  setRegName("");
                  setRegSerial("");
                }}
              >
                Cancel
              </Button>
            </div>
            {registerMutation.isError && (
              <p className="mt-2 text-sm text-red-400">
                {(registerMutation.error as Error)?.message ?? "Registration failed"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Device Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-48 rounded-xl bg-white/[0.06]"
            />
          ))}
        </div>
      ) : (devices?.length ?? 0) === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-white/[0.04] p-3 mb-3">
              <Cpu className="h-6 w-6 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white/50">
              No devices registered
            </p>
            <p className="text-xs text-white/30 mt-1 max-w-xs">
              Register a turnstile device to enable QR and face check-ins.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices!.map((device) => (
            <Card key={device.id} className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        device.status === "online"
                          ? "bg-emerald-500/10"
                          : "bg-white/[0.04]",
                      )}
                    >
                      <Cpu
                        className={cn(
                          "h-5 w-5",
                          device.status === "online"
                            ? "text-emerald-400"
                            : "text-white/30",
                        )}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {device.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-white/40">
                        <Hash className="h-3 w-3" />
                        {device.serialNumber}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs gap-1",
                      device.status === "online"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30",
                    )}
                  >
                    {device.status === "online" ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {device.status}
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Last Seen
                    </span>
                    <span className="text-white/60">
                      {device.lastSeen
                        ? formatRelative(device.lastSeen)
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40 flex items-center gap-1.5">
                      <SmilePlus className="h-3.5 w-3.5" />
                      Enrolled Faces
                    </span>
                    <span className="text-white/60">
                      {device.enrolledFaces}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => handleOpenDoor(device.id)}
                    disabled={
                      openingId === device.id || device.status !== "online"
                    }
                  >
                    {openingId === device.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    Open Door
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5">
                    <SmilePlus className="h-3.5 w-3.5" />
                    Enrollments
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
