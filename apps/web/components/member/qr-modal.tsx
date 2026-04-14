"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, QrCode, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface MemberQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId?: string | null;
  qrCodeValue?: string | null;
  access?: {
    allowed: boolean;
    reason: string;
  } | null;
}

function getAccessCopy(reason?: string, allowed?: boolean) {
  if (allowed === false) {
    if (reason === "subscription_expired") {
      return {
        badge: "Expired",
        title: "Door access paused",
        detail: "Your membership plan has ended. Renew your plan to restore access.",
      };
    }

    if (reason === "membership_suspended") {
      return {
        badge: "Suspended",
        title: "Door access paused",
        detail: "Your gym membership is suspended right now. Please contact the gym team for help.",
      };
    }

    if (reason === "membership_inactive") {
      return {
        badge: "Inactive",
        title: "Door access paused",
        detail: "Your member profile is inactive, so scans will be declined until it is reactivated.",
      };
    }

    if (reason === "payment_pending_verification") {
      return {
        badge: "Pending review",
        title: "Waiting for payment review",
        detail: "Your latest payment is still being verified. Access will turn on automatically once it is approved.",
      };
    }

    if (reason === "payment_rejected") {
      return {
        badge: "Payment issue",
        title: "Payment needs attention",
        detail: "Your latest payment was rejected. Submit a new payment or contact the gym team.",
      };
    }

    return {
      badge: "Unavailable",
      title: "Access unavailable",
      detail: "This QR is still yours, but the scanner will deny entry until your access is restored.",
    };
  }

  return {
    badge: "Access live",
    title: "Ready to scan",
    detail: "Your access is active. This screen refreshes automatically to match your latest membership status.",
  };
}

export function MemberQrModal({
  open,
  onOpenChange,
  memberName,
  memberId,
  qrCodeValue,
  access,
}: MemberQrModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const accessCopy = getAccessCopy(access?.reason, access?.allowed);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="relative flex h-full w-full flex-col items-center justify-center px-5 py-8"
            initial={{ y: 18, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="w-full max-w-md text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">My QR Code</p>
              <h2 className="mt-2 text-2xl font-bold text-white">{accessCopy.title}</h2>
              <p className="mt-1 text-sm text-white/55">Show this screen at the downstairs door scanner</p>
            </div>

            <div className="mt-5 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    access?.allowed === false ? "bg-red-500/15 text-red-200" : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {access?.allowed === false ? <AlertTriangle className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      access?.allowed === false
                        ? "border-red-500/35 bg-red-500/15 text-red-200"
                        : "border-emerald-500/35 bg-emerald-500/15 text-emerald-200"
                    }`}
                  >
                    {accessCopy.badge}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{accessCopy.title}</p>
                  <p className="mt-1 text-sm leading-6 text-white/65">{accessCopy.detail}</p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/45">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refreshes automatically about every 15 seconds
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex w-full justify-center">
              {qrCodeValue ? (
                <div className="w-full max-w-[min(88vw,26rem)] rounded-3xl bg-white p-4 shadow-[0_20px_80px_rgba(0,0,0,0.55)] sm:p-5">
                  <QRCodeSVG value={qrCodeValue} size={320} level="H" includeMargin bgColor="#FFFFFF" fgColor="#111111" className="h-auto w-full" />
                </div>
              ) : (
                <div className="flex min-h-[280px] w-full max-w-[min(88vw,26rem)] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.16] bg-white/[0.03] px-6 text-center text-white/50 sm:min-h-[360px]">
                  <QrCode className="h-12 w-12 text-white/30" />
                  <p className="mt-4 text-sm">QR code unavailable</p>
                </div>
              )}
            </div>

            <div className="mt-4 w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-base font-semibold text-white">{memberName}</p>
              <p className="mt-0.5 font-mono text-xs text-white/55">ID: {memberId ?? "—"}</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
