"use client";

import { useState, useRef } from "react";
import { useMemberQrCode, useGenerateQrCode } from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  Button,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, Printer, Download } from "lucide-react";

export default function QrCodePage() {
  const { user } = useTimeoWebAuthContext();
  const { tenantId, tenant } = useTenantId();
  const [generating, setGenerating] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const { data: qrCode, isLoading } = useMemberQrCode(tenantId);
  const { mutateAsync: generateQrCode } = useGenerateQrCode(tenantId ?? "");

  const displayName = user
    ? user.name || user.email || "Member"
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

  function handlePrint() {
    const gymName = tenant?.name ?? "Timeo";
    const code = qrCode?.code ?? "";
    const svgEl = qrRef.current?.querySelector("svg");
    const svgString = svgEl ? new XMLSerializer().serializeToString(svgEl) : "";
    const svgDataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${displayName}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            .card { text-align: center; padding: 40px; border: 2px solid #e5e7eb; border-radius: 16px; max-width: 320px; }
            .gym { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
            .name { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 20px; }
            .qr { display: flex; justify-content: center; margin-bottom: 20px; }
            .qr img { width: 200px; height: 200px; }
            .code { font-family: monospace; font-size: 13px; color: #374151; background: #f3f4f6; padding: 8px 16px; border-radius: 8px; letter-spacing: 2px; display: inline-block; margin-bottom: 16px; }
            .footer { font-size: 11px; color: #9ca3af; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="card">
            <p class="gym">${gymName}</p>
            <p class="name">${displayName}</p>
            <div class="qr"><img src="${svgDataUrl}" alt="QR Code" /></div>
            <p class="code">${code}</p>
            <p class="footer">Show this QR code to check in at the gym</p>
          </div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Loading state
  if (isLoading && tenantId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">QR Code</h1>
          <p className="text-sm text-white/50">Your personal check-in code</p>
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
        <h1 className="text-2xl font-bold tracking-tight text-white">QR Code</h1>
        <p className="text-sm text-white/50">Show this code at the front desk to check in</p>
      </div>

      {/* QR Code Display */}
      <div className="flex justify-center">
        {qrCode ? (
          <Card className="glass border-white/[0.08] w-full max-w-sm">
            <CardContent className="flex flex-col items-center p-6">
              {/* Member Info */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-base font-bold text-primary">
                  {(displayName[0] ?? "M").toUpperCase()}
                </div>
                <p className="text-lg font-semibold text-white">{displayName}</p>
                {tenant?.name && (
                  <p className="text-sm text-white/50">{tenant.name}</p>
                )}
              </div>

              {/* Real QR Code — Large & Centered */}
              <div
                ref={qrRef}
                className="flex items-center justify-center rounded-3xl bg-white p-6 shadow-2xl"
              >
                <QRCodeSVG
                  value={qrCode.code}
                  size={240}
                  level="H"
                  includeMargin={false}
                  bgColor="#FFFFFF"
                  fgColor="#111111"
                />
              </div>

              {/* Member ID below QR */}
              <div className="mt-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-1">Member ID</p>
                <p className="font-mono text-lg font-bold text-white tracking-wider">{qrCode.code.slice(0, 8).toUpperCase()}</p>
              </div>

              {/* Code String */}
              <div className="w-full rounded-lg bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-xs text-white/40">Full Check-in Code</p>
                <p className="mt-1 font-mono text-xs font-semibold tracking-wider text-white/60">
                  {qrCode.code}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex w-full gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="flex-1 gap-2 border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  <Printer className="h-4 w-4" />
                  Print QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="flex-1 gap-2 border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white"
                >
                  <RefreshCw className={cn("h-4 w-4", generating && "animate-spin")} />
                  {generating ? "Regenerating..." : "Regenerate"}
                </Button>
              </div>

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
              <h3 className="text-lg font-semibold text-white">No QR Code Yet</h3>
              <p className="mb-6 mt-2 text-center text-sm text-white/50">
                Generate a personal QR code to use for quick check-ins at the front desk.
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
          <h3 className="mb-3 text-sm font-semibold text-white">How to Check In</h3>
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
