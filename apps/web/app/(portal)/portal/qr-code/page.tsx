"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { QrCode, RefreshCw, Smartphone } from "lucide-react";

export default function QrCodePage() {
  const { user } = useTimeoWebAuthContext();
  const { tenantId, tenant } = useTenantId();
  const [generating, setGenerating] = useState(false);

  const access = useQuery(api.auth.checkAccess, tenantId ? { tenantId } : "skip");
  const ready = tenantId && access?.ready;

  const qrCode = useQuery(
    api.checkIns.getMyQrCode,
    ready ? { tenantId } : "skip"
  );

  const generateQrCode = useMutation(api.checkIns.generateQrCode);

  const displayName = user
    ? user.name ||
      user.email ||
      "Member"
    : "Member";

  async function handleGenerate() {
    if (!tenantId) return;
    setGenerating(true);
    try {
      await generateQrCode({ tenantId });
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    if (!tenantId) return;
    setGenerating(true);
    try {
      await generateQrCode({ tenantId });
    } catch (err) {
      console.error("Failed to regenerate QR code:", err);
    } finally {
      setGenerating(false);
    }
  }

  // Loading state
  if (qrCode === undefined && tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            QR Code
          </h1>
          <p className="text-sm text-white/50">
            Your personal check-in code
          </p>
        </div>
        <div className="flex justify-center py-16">
          <Skeleton className="h-80 w-80 rounded-2xl bg-white/[0.06]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          QR Code
        </h1>
        <p className="text-sm text-white/50">
          Show this code at the front desk to check in
        </p>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center">
        {qrCode ? (
          <Card className="glass border-white/[0.08] w-full max-w-sm">
            <CardContent className="flex flex-col items-center p-6">
              {/* Member Info */}
              <div className="mb-6 text-center">
                <p className="text-lg font-semibold text-white">
                  {displayName}
                </p>
                {tenant?.name && (
                  <p className="text-sm text-white/50">{tenant.name}</p>
                )}
              </div>

              {/* QR Code Display Area */}
              {/*
                TODO: Install a QR code rendering library (e.g. `qrcode.react` or `react-qr-code`)
                and replace the placeholder below with:
                <QRCodeSVG value={qrCode.code} size={240} level="H" />
              */}
              <div className="relative flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-4">
                {/* Placeholder QR pattern */}
                <div className="absolute inset-4 grid grid-cols-8 grid-rows-8 gap-0.5">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-sm",
                        // Pseudo-random pattern based on code hash for visual effect
                        (i % 3 === 0 || i % 7 === 0 || i < 8 || i > 55)
                          ? "bg-gray-900"
                          : "bg-transparent"
                      )}
                    />
                  ))}
                </div>
                {/* Center icon overlay */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-md">
                  <Smartphone className="h-6 w-6 text-gray-900" />
                </div>
              </div>

              {/* Code String */}
              <div className="mt-4 w-full rounded-lg bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-xs text-white/40">Check-in Code</p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-white">
                  {qrCode.code}
                </p>
              </div>

              {/* Regenerate Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={generating}
                className="mt-4 gap-2"
              >
                <RefreshCw
                  className={cn("h-4 w-4", generating && "animate-spin")}
                />
                {generating ? "Regenerating..." : "Regenerate Code"}
              </Button>

              {/* Created date */}
              {qrCode.createdAt && (
                <p className="mt-3 text-xs text-white/20">
                  Generated{" "}
                  {new Date(qrCode.createdAt).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          /* No QR Code - Show Generate Button */
          <Card className="glass border-white/[0.08] w-full max-w-sm">
            <CardContent className="flex flex-col items-center p-8">
              <div className="mb-6 rounded-full bg-white/[0.04] p-4">
                <QrCode className="h-12 w-12 text-white/30" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                No QR Code Yet
              </h3>
              <p className="mb-6 mt-2 text-center text-sm text-white/50">
                Generate a personal QR code to use for quick check-ins at the
                front desk.
              </p>
              <Button onClick={handleGenerate} disabled={generating} className="gap-2">
                <QrCode className="h-4 w-4" />
                {generating ? "Generating..." : "Generate QR Code"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      <Card className="glass border-white/[0.08]">
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">
            How to Check In
          </h3>
          <ol className="space-y-2 text-sm text-white/50">
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Open this page on your phone when you arrive
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              Show the QR code to the staff at the front desk
            </li>
            <li className="flex items-start gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              They will scan it and you are checked in!
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
