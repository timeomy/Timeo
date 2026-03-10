"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
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
  AvatarImage,
  AvatarFallback,
  cn,
} from "@timeo/ui/web";
import {
  ScanLine,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Keyboard,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type ScanResult = {
  status: "granted" | "denied";
  checkInId?: string;
  member?: {
    name: string;
    email?: string;
    membershipName?: string;
    photoUrl?: string;
  };
  reason?: string;
};

// ---- Data hook ----

function useCheckInByQr() {
  const { tenantId } = useTenantId();
  return useMutation<ScanResult, Error, string>({
    mutationFn: async (qrCode: string) => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/checkin`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode, method: "qr" }),
        },
      );
      const data = await res.json();
      if (!data.success) {
        if (data.data?.status === "denied") {
          return data.data as ScanResult;
        }
        throw new Error(data.error?.message || "Check-in failed");
      }
      return data.data as ScanResult;
    },
  });
}

// ---- Helpers ----

function getInitial(name: string | null) {
  return (name?.[0] ?? "?").toUpperCase();
}

// ---- Page ----

export default function GymScannerPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [qrValue, setQrValue] = useState("");
  const checkInMutation = useCheckInByQr();

  async function handleScan(code?: string) {
    const value = (code ?? qrValue).trim();
    if (!value) return;
    try {
      await checkInMutation.mutateAsync(value);
    } catch (err) {
      console.error("Scan error:", err);
    }
    setQrValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  }

  function handleReset() {
    checkInMutation.reset();
    setQrValue("");
    inputRef.current?.focus();
  }

  const result = checkInMutation.data;
  const isGranted = result?.status === "granted";
  const isDenied = result?.status === "denied";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
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
            QR Scanner
          </h1>
          <p className="text-sm text-white/50">
            Scan member QR codes to check them in
          </p>
        </div>
      </div>

      {/* Scanner Input */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Keyboard className="h-5 w-5 text-primary" />
            Scan or Enter Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/50">
            Use a barcode/QR scanner or type the member code manually, then
            press Enter.
          </p>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Scan QR code or enter member code..."
              value={qrValue}
              onChange={(e) => setQrValue(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="flex-1 font-mono"
            />
            <Button
              onClick={() => handleScan()}
              disabled={!qrValue.trim() || checkInMutation.isPending}
              className="gap-2"
            >
              {checkInMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              Check In
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Card */}
      {(isGranted || isDenied) && result && (
        <Card
          className={cn(
            "border-2 transition-all",
            isGranted
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-red-500/40 bg-red-500/5",
          )}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div
                className={cn(
                  "flex h-20 w-20 items-center justify-center rounded-full",
                  isGranted ? "bg-emerald-500/20" : "bg-red-500/20",
                )}
              >
                {isGranted ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-400" />
                )}
              </div>

              <div>
                <h2
                  className={cn(
                    "text-2xl font-bold",
                    isGranted ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {isGranted ? "Access Granted" : "Access Denied"}
                </h2>
                {isDenied && result.reason && (
                  <p className="mt-1 text-sm text-red-400/70">
                    {result.reason}
                  </p>
                )}
              </div>

              {result.member && (
                <div className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 w-full max-w-sm">
                  <Avatar className="h-14 w-14">
                    <AvatarImage
                      src={result.member.photoUrl ?? undefined}
                      alt={result.member.name}
                    />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                      {getInitial(result.member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white">
                      {result.member.name}
                    </p>
                    {result.member.email && (
                      <p className="text-xs text-white/50">
                        {result.member.email}
                      </p>
                    )}
                    {result.member.membershipName && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {result.member.membershipName}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleReset}
                className="mt-2 gap-2"
              >
                <ScanLine className="h-4 w-4" />
                Scan Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Card */}
      {checkInMutation.isError && (
        <Card className="border-2 border-red-500/40 bg-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Check-in Error
                </p>
                <p className="text-xs text-red-400/70 mt-0.5">
                  {(checkInMutation.error as Error)?.message ??
                    "Something went wrong. Please try again."}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="mt-3 gap-2"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-sm font-medium text-white/70 mb-3">
            How to use
          </h3>
          <ul className="space-y-2 text-sm text-white/50">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">
                1
              </span>
              Connect a USB barcode/QR scanner to this device
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">
                2
              </span>
              The scanner will type the QR value into the input field
              automatically
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">
                3
              </span>
              Most scanners auto-submit with Enter — the check-in happens
              instantly
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary font-bold">
                4
              </span>
              You can also type a member code manually and press Enter
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
