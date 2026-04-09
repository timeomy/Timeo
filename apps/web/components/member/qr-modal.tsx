"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QrCode, X, RefreshCw } from "lucide-react";
import { Button, cn } from "@timeo/ui/web";
import { QRCodeSVG } from "qrcode.react";

interface MemberQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrCode?: string | null;
  memberName: string;
  memberId?: string | null;
  regenerating?: boolean;
  onRegenerate?: () => void;
}

export function MemberQrModal({
  open,
  onOpenChange,
  qrCode,
  memberName,
  memberId,
  regenerating,
  onRegenerate,
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="relative w-full max-w-md rounded-3xl border border-white/[0.14] bg-[#10131d] p-5 shadow-2xl"
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

            <div className="mt-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Member QR Code</p>
              <h2 className="mt-2 text-xl font-bold text-white">Ready to scan</h2>
              <p className="mt-1 text-sm text-white/55">Show this screen at the front desk</p>
            </div>

            <div className="mt-5 flex justify-center">
              {qrCode ? (
                <div className="rounded-3xl bg-white p-4 shadow-[0_16px_60px_rgba(0,0,0,0.45)]">
                  <QRCodeSVG value={qrCode} size={252} level="H" includeMargin />
                </div>
              ) : (
                <div className="flex h-[284px] w-[284px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.16] bg-white/[0.03] text-white/50">
                  <QrCode className="h-12 w-12 text-white/30" />
                  <p className="mt-4 text-sm">QR code unavailable</p>
                </div>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-base font-semibold text-white">{memberName}</p>
              <p className="mt-0.5 font-mono text-xs text-white/55">ID: {memberId ?? "—"}</p>
            </div>

            {onRegenerate ? (
              <Button
                type="button"
                onClick={onRegenerate}
                disabled={regenerating}
                className="mt-4 h-11 w-full rounded-xl bg-emerald-500 font-semibold text-black hover:bg-emerald-500/90"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", regenerating && "animate-spin")} />
                {regenerating ? "Refreshing QR..." : "Refresh QR"}
              </Button>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
