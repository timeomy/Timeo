"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useChangePassword,
  useGenerateQrCode,
  useMemberQrCode,
  useUpdateUserProfile,
  useUserProfile,
} from "@timeo/api-client";
import { useTimeoWebAuthContext } from "@timeo/auth/web";
import { getInitials } from "@timeo/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Separator,
  cn,
} from "@timeo/ui/web";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Phone,
  QrCode,
  UserRound,
  UserSquare2,
} from "lucide-react";
import { useTenantId } from "@/hooks/use-tenant-id";
import { MemberQrModal } from "@/member/qr-modal";

type NotificationKey = "classReminders" | "paymentUpdates" | "promotions";

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex min-h-11 w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-0.5 text-xs text-white/50">{description}</p>
      </div>
      <span
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-emerald-500" : "bg-white/[0.15]"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

export default function ProfilePage() {
  const { user, signOut } = useTimeoWebAuthContext();
  const { tenantId } = useTenantId();
  const { data: userProfile } = useUserProfile();
  const { data: qrCode } = useMemberQrCode(tenantId);
  const generateQrMutation = useGenerateQrCode(tenantId ?? "");
  const updateProfileMutation = useUpdateUserProfile();
  const changePasswordMutation = useChangePassword();

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    avatarUrl: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [preferences, setPreferences] = useState<Record<NotificationKey, boolean>>({
    classReminders: true,
    paymentUpdates: true,
    promotions: false,
  });

  const displayName = user?.name ?? user?.email ?? "Member";
  const memberId = user?.id?.slice(0, 12).toUpperCase() ?? "MEMBER";
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "web-1.0.0";

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setProfileForm({
      name: userProfile.name ?? "",
      phone: userProfile.phone ?? "",
      avatarUrl: userProfile.avatar_url ?? user?.imageUrl ?? "",
    });
  }, [user?.imageUrl, userProfile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem("timeo.member-notification-prefs");
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Record<NotificationKey, boolean>;
      setPreferences((previous) => ({ ...previous, ...parsed }));
    } catch {
      // Ignore malformed localStorage values.
    }
  }, []);

  function savePreferences(next: Record<NotificationKey, boolean>) {
    setPreferences(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("timeo.member-notification-prefs", JSON.stringify(next));
    }
  }

  async function handleOpenQr() {
    if (!tenantId) {
      return;
    }

    if (!qrCode?.code) {
      try {
        await generateQrMutation.mutateAsync({ tenantId });
      } catch {
        // Keep modal visible with fallback state.
      }
    }

    setIsQrOpen(true);
  }

  async function handleSaveProfile() {
    setProfileError(null);
    setProfileSaved(false);

    try {
      await updateProfileMutation.mutateAsync({
        name: profileForm.name.trim() || undefined,
        phone: profileForm.phone.trim() || null,
        avatar_url: profileForm.avatarUrl.trim() || null,
      });

      setProfileSaved(true);
      window.setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      setProfileError((error as Error).message ?? "Unable to update profile");
    }
  }

  const passwordValid = useMemo(() => {
    return (
      passwordForm.current.length > 0 &&
      passwordForm.next.length >= 8 &&
      passwordForm.next === passwordForm.confirm
    );
  }, [passwordForm]);

  async function handleChangePassword() {
    if (!passwordValid) {
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      setPasswordSuccess(true);
      setPasswordForm({ current: "", next: "", confirm: "" });
      window.setTimeout(() => setPasswordSuccess(false), 2500);
    } catch (error) {
      setPasswordError((error as Error).message ?? "Unable to update password");
    }
  }

  return (
    <div className="space-y-5 pb-4">
      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-14 w-14 border border-white/[0.2]">
                {profileForm.avatarUrl ? <AvatarImage src={profileForm.avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-white/[0.08] text-sm text-white">{getInitials(displayName)}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white">{displayName}</h1>
                <p className="truncate text-sm text-white/55">{user?.email ?? "—"}</p>
                <Badge className="mt-2 rounded-full border-white/[0.14] bg-white/[0.08] font-mono text-[11px] text-white/80">
                  Member ID: {memberId}
                </Badge>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenQr}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-emerald-500/15 text-emerald-300 transition-colors hover:bg-emerald-500/25"
            >
              <QrCode className="h-5 w-5" />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <UserRound className="h-4 w-4 text-white/65" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-white/50">Full name</label>
            <Input
              value={profileForm.name}
              onChange={(event) => setProfileForm((previous) => ({ ...previous, name: event.target.value }))}
              className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03]"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-white/50">Phone</label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
              <Input
                value={profileForm.phone}
                onChange={(event) => setProfileForm((previous) => ({ ...previous, phone: event.target.value }))}
                className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03] pl-9"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-white/50">Avatar URL</label>
            <Input
              value={profileForm.avatarUrl}
              onChange={(event) => setProfileForm((previous) => ({ ...previous, avatarUrl: event.target.value }))}
              className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03]"
              placeholder="https://..."
            />
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-xs text-white/55">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-white/40" />
              <span>{user?.email ?? "—"}</span>
            </div>
          </div>

          {profileError ? <p className="text-xs text-red-300">{profileError}</p> : null}
          {profileSaved ? (
            <p className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Profile updated
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="h-11 w-full rounded-xl bg-emerald-500 font-semibold text-black hover:bg-emerald-500/90"
          >
            {updateProfileMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bell className="h-4 w-4 text-white/65" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          <PreferenceToggle
            label="Class reminders"
            description="Get reminders before your booked classes"
            checked={preferences.classReminders}
            onChange={() =>
              savePreferences({
                ...preferences,
                classReminders: !preferences.classReminders,
              })
            }
          />
          <PreferenceToggle
            label="Payment updates"
            description="Receive payment and renewal updates"
            checked={preferences.paymentUpdates}
            onChange={() =>
              savePreferences({
                ...preferences,
                paymentUpdates: !preferences.paymentUpdates,
              })
            }
          />
          <PreferenceToggle
            label="Offers and promos"
            description="Occasional promos from your gym"
            checked={preferences.promotions}
            onChange={() =>
              savePreferences({
                ...preferences,
                promotions: !preferences.promotions,
              })
            }
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Lock className="h-4 w-4 text-white/65" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            value={passwordForm.current}
            onChange={(event) =>
              setPasswordForm((previous) => ({
                ...previous,
                current: event.target.value,
              }))
            }
            className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03]"
            placeholder="Current password"
          />
          <Input
            type="password"
            value={passwordForm.next}
            onChange={(event) =>
              setPasswordForm((previous) => ({
                ...previous,
                next: event.target.value,
              }))
            }
            className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03]"
            placeholder="New password (min 8 chars)"
          />
          <Input
            type="password"
            value={passwordForm.confirm}
            onChange={(event) =>
              setPasswordForm((previous) => ({
                ...previous,
                confirm: event.target.value,
              }))
            }
            className="h-11 rounded-xl border-white/[0.1] bg-white/[0.03]"
            placeholder="Confirm new password"
          />

          {passwordForm.confirm && passwordForm.confirm !== passwordForm.next ? (
            <p className="text-xs text-red-300">Passwords do not match.</p>
          ) : null}
          {passwordError ? <p className="text-xs text-red-300">{passwordError}</p> : null}
          {passwordSuccess ? (
            <p className="flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Password updated
            </p>
          ) : null}

          <Button
            type="button"
            onClick={handleChangePassword}
            disabled={!passwordValid || changePasswordMutation.isPending}
            className="h-11 w-full rounded-xl bg-white text-black hover:bg-white/90"
          >
            {changePasswordMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/[0.08] bg-white/[0.03]">
        <CardContent className="space-y-4 p-4">
          <Button
            type="button"
            onClick={() => signOut()}
            className="h-11 w-full rounded-xl bg-red-500/90 font-semibold text-white hover:bg-red-500"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>

          <Separator className="bg-white/[0.08]" />

          <div className="flex items-center justify-between text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <UserSquare2 className="h-3.5 w-3.5" />
              Member portal
            </span>
            <span>Version {appVersion}</span>
          </div>
        </CardContent>
      </Card>

      <MemberQrModal
        open={isQrOpen}
        onOpenChange={setIsQrOpen}
        qrCode={qrCode?.code}
        memberName={displayName}
        memberId={memberId}
        regenerating={generateQrMutation.isPending}
        onRegenerate={
          tenantId
            ? () => {
                void generateQrMutation.mutateAsync({ tenantId });
              }
            : undefined
        }
      />
    </div>
  );
}
