"use client";

import { useState } from "react";
import {
  useCheckIns,
  useCheckInStats,
  useCreateCheckIn,
} from "@timeo/api-client";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@timeo/ui/web";
import {
  ScanLine,
  UserPlus,
  QrCode,
  Smartphone,
  Hand,
  Search,
  AlertCircle,
  Users,
  TrendingUp,
  Unlock,
} from "lucide-react";

export default function CheckInsPage() {
  const { tenantId } = useTenantId();
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  });
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [doorDialogOpen, setDoorDialogOpen] = useState(false);
  const [openingDoor, setOpeningDoor] = useState(false);

  const { data: checkIns, isLoading: checkInsLoading } = useCheckIns(tenantId ?? "", { date: selectedDate });
  const { data: stats } = useCheckInStats(tenantId ?? "");
  const { mutateAsync: createCheckIn } = useCreateCheckIn(tenantId ?? "");

  async function handleManualCheckIn() {
    if (!tenantId || !memberEmail.trim()) return;
    setCheckingIn(true);
    try {
      await createCheckIn({ email: memberEmail.trim(), method: "manual" });
      setManualDialogOpen(false);
      setMemberEmail("");
    } catch (err) {
      console.error("Failed to check in:", err);
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleOpenDoor() {
    if (!tenantId) return;
    setOpeningDoor(true);
    try {
      // Door relay action — not available in api-client; no-op for now
      setDoorDialogOpen(false);
    } finally {
      setOpeningDoor(false);
    }
  }

  const METHOD_ICON: Record<string, typeof QrCode> = {
    qr: QrCode,
    nfc: Smartphone,
    manual: Hand,
  };

  const METHOD_LABEL: Record<string, string> = {
    qr: "QR Code",
    nfc: "NFC",
    manual: "Manual",
  };

  function formatTime(isoString: string) {
    return new Date(isoString).toLocaleTimeString("en-MY", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Check-ins
          </h1>
          <p className="text-sm text-white/50">
            {checkInsLoading
              ? "Loading..."
              : `${checkIns?.length ?? 0} check-in${(checkIns?.length ?? 0) !== 1 ? "s" : ""} today`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          <Button
            variant="outline"
            className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setDoorDialogOpen(true)}
          >
            <Unlock className="h-4 w-4" />
            Open Door
          </Button>
          <Button className="gap-2" onClick={() => setManualDialogOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Manual Check-in
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <ScanLine className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.today}</p>
                  <p className="text-xs text-white/50">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">
                    {stats.thisWeek}
                  </p>
                  <p className="text-xs text-white/50">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {stats.byMethod.qr}
                    </p>
                    <p className="text-[10px] text-white/40">QR</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {stats.byMethod.nfc}
                    </p>
                    <p className="text-[10px] text-white/40">NFC</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {stats.byMethod.manual}
                    </p>
                    <p className="text-[10px] text-white/40">Manual</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {checkInsLoading ? (
            <LoadingSkeleton />
          ) : !checkIns || checkIns.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/50">Member</TableHead>
                  <TableHead className="text-white/50">Method</TableHead>
                  <TableHead className="text-white/50">Time</TableHead>
                  <TableHead className="text-white/50">Checked In By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkIns.map((ci) => {
                  const MethodIcon = METHOD_ICON[ci.method] ?? ScanLine;
                  return (
                    <TableRow
                      key={ci.id}
                      className="border-white/[0.06] hover:bg-white/[0.02]"
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">
                            {ci.userName}
                          </p>
                          {ci.userEmail && (
                            <p className="text-xs text-white/40">
                              {ci.userEmail}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-xs",
                            ci.method === "qr"
                              ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                              : ci.method === "nfc"
                                ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
                          )}
                        >
                          <MethodIcon className="h-3 w-3" />
                          {METHOD_LABEL[ci.method] ?? ci.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/70">
                        {formatTime(ci.checkedInAt)}
                      </TableCell>
                      <TableCell className="text-white/70">
                        {ci.checkedInByName ?? "Self"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Check-in Dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-in</DialogTitle>
            <DialogDescription>
              Enter the member&apos;s email address to check them in manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Member Email</label>
              <Input
                placeholder="member@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                type="email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManualDialogOpen(false)}
              disabled={checkingIn}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualCheckIn}
              disabled={checkingIn || !memberEmail.trim()}
            >
              {checkingIn ? "Checking in..." : "Check In"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Door Dialog */}
      <Dialog open={doorDialogOpen} onOpenChange={setDoorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Door</DialogTitle>
            <DialogDescription>
              Remotely trigger the door relay? This will unlock the door for a
              few seconds.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDoorDialogOpen(false)}
              disabled={openingDoor}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOpenDoor}
              disabled={openingDoor}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {openingDoor ? "Opening..." : "Open"}
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
          <Skeleton className="h-5 w-16 rounded-full bg-white/[0.06]" />
          <Skeleton className="h-4 w-16 bg-white/[0.06]" />
          <Skeleton className="h-4 w-20 bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-white/[0.04] p-3 mb-3">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <p className="text-sm font-medium text-white/50">No check-ins found</p>
      <p className="text-xs text-white/30 mt-1">
        Check-ins will appear here when members scan their QR code or are
        checked in manually.
      </p>
    </div>
  );
}
