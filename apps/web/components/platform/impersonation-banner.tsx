"use client";

import { useSearchParams } from "next/navigation";
import { Shield, X } from "lucide-react";
import { useState } from "react";

export function ImpersonationBanner() {
  const params = useSearchParams();
  const token = params.get("impersonate");
  const tenant = params.get("tenant");
  const [dismissed, setDismissed] = useState(false);

  if (!token || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-300">
          <span className="font-semibold">Impersonation mode</span>
          {tenant && (
            <>
              {" "}— viewing as <span className="font-semibold">{tenant}</span>
            </>
          )}
          . This session is time-limited and single-use.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="rounded p-0.5 text-amber-400 transition-colors hover:text-amber-200"
        aria-label="Dismiss impersonation banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
