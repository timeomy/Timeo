"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QrCode, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { generateEncryptedQrPayload } from "../../lib/qr-encryption";

interface MemberQrModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId?: string | null;
}

export function MemberQrModal({
  open,
  onOpenChange,
  memberName,
  memberId,
}: MemberQrModalProps) {
  const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(30);

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

  useEffect(() => {
    if (!open) {
      setSecondsRemaining(30);
      return;
    }

    if (!memberId) {
      setQrCodeValue(null);
      setSecondsRemaining(30);
      return;
    }

    const refreshQr = () => {
      const nextPayload = generateEncryptedQrPayload(memberId);
      setQrCodeValue(nextPayload || null);
    };

    refreshQr();
    setSecondsRemaining(30);

    const timer = window.setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          refreshQr();
          return 30;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [open, memberId]);

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

            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">My QR Code</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Ready to scan</h2>
              <p className="mt-1 text-sm text-white/55">Show this screen at the downstairs door scanner</p>
            </div>

            <div className="mt-8 flex justify-center">
              {qrCodeValue ? (
                <div className="rounded-3xl bg-white p-5 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
                  <QRCodeSVG value={qrCodeValue} size={320} level="H" includeMargin />
                </div>
              ) : (
                <div className="flex h-[360px] w-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/[0.16] bg-white/[0.03] text-white/50">
                  <QrCode className="h-12 w-12 text-white/30" />
                  <p className="mt-4 text-sm">QR code unavailable</p>
                </div>
              )}
            </div>

            <p className="mt-5 text-sm text-white/65">QR refreshes in {secondsRemaining}s</p>

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
