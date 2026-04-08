"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Shield } from "lucide-react";
import { cn } from "@timeo/ui/web";
import { normalizeTimeoRole } from "@timeo/auth/web";
import { useViewAs } from "@/hooks/use-view-as";

type RoleOption = "admin" | "staff" | "customer";

const ROLE_LABEL: Record<RoleOption, string> = {
  admin: "Admin",
  staff: "Staff",
  customer: "Member",
};

function allowedRolesForTenant(
  tenantRole: string,
  isPlatformAdmin: boolean,
): RoleOption[] {
  if (isPlatformAdmin) return ["admin", "staff", "customer"];

  const normalized = normalizeTimeoRole(tenantRole);
  if (normalized === "admin") return ["admin", "staff", "customer"];
  if (normalized === "staff" || normalized === "coach") return ["staff", "customer"];
  return ["customer"];
}

export function ViewModeSwitcher() {
  const {
    canUseSwitcher,
    isPlatformAdmin,
    tenants,
    activeTenant,
    activeTenantId,
    viewMode,
    viewAsRole,
    switchToPlatform,
    switchTenantRole,
  } = useViewAs();

  const [open, setOpen] = useState(false);

  const currentLabel = useMemo(() => {
    if (isPlatformAdmin && viewMode === "platform") return "Platform Admin";

    const roleLabel =
      viewAsRole === "admin"
        ? "Admin"
        : viewAsRole === "staff" || viewAsRole === "coach"
          ? "Staff"
          : "Member";

    if (!activeTenant) return roleLabel;
    return `${roleLabel} · ${activeTenant.name}`;
  }, [activeTenant, isPlatformAdmin, viewAsRole, viewMode]);

  if (!canUseSwitcher) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 text-xs font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
      >
        {isPlatformAdmin && viewMode === "platform" ? (
          <Shield className="h-3.5 w-3.5 text-primary" />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        )}
        <span className="max-w-[210px] truncate">{currentLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Close view mode menu"
          />

          <div className="absolute right-0 z-50 mt-2 w-[420px] max-w-[calc(100vw-1rem)] rounded-xl border border-white/[0.1] bg-[#0A0F1E] p-3 shadow-2xl">
            <p className="mb-2 px-1 text-[11px] uppercase tracking-wider text-white/40">
              View Mode
            </p>

            {isPlatformAdmin && (
              <button
                type="button"
                onClick={async () => {
                  await switchToPlatform();
                  setOpen(false);
                }}
                className={cn(
                  "mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  viewMode === "platform"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/[0.1] bg-white/[0.02] text-white/80 hover:bg-white/[0.05]",
                )}
              >
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Back to Platform Admin
                </span>
                {viewMode === "platform" && <Check className="h-4 w-4" />}
              </button>
            )}

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {tenants.map((tenant) => {
                const roleOptions = allowedRolesForTenant(tenant.role, isPlatformAdmin);
                return (
                  <div key={tenant.id} className="rounded-lg border border-white/[0.08] p-2">
                    <div className="mb-2 px-1">
                      <p className="truncate text-sm font-medium">{tenant.name}</p>
                      <p className="truncate text-xs text-white/40">@{tenant.slug}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {roleOptions.map((role) => {
                        const selected =
                          viewMode === "tenant" &&
                          activeTenantId === tenant.id &&
                          (viewAsRole
                            ? normalizeTimeoRole(viewAsRole) === role
                            : normalizeTimeoRole(tenant.role) === role);

                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={async () => {
                              await switchTenantRole(tenant.id, role);
                              setOpen(false);
                            }}
                            className={cn(
                              "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                              selected
                                ? "border-primary/40 bg-primary/20 text-primary"
                                : "border-white/[0.1] bg-white/[0.03] text-white/80 hover:bg-white/[0.08]",
                            )}
                          >
                            {ROLE_LABEL[role]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
