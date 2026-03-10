"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChangePassword } from "@timeo/api-client";
import { Button, Input } from "@timeo/ui/web";
import { Loader2, ShieldAlert } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const changePassword = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (newPassword !== confirm) {
      setValidationError("Passwords don't match");
      return;
    }
    if (newPassword.length < 8) {
      setValidationError("New password must be at least 8 characters");
      return;
    }
    if (newPassword === currentPassword) {
      setValidationError("New password must be different from your current password");
      return;
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          router.replace("/dashboard");
        },
      },
    );
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Set your password</h1>
            <p className="text-sm text-muted-foreground">
              You must set a new password before continuing.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Temporary password</label>
            <Input
              type="password"
              placeholder="Enter temporary password from email"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={changePassword.isPending}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">New password</label>
            <Input
              type="password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={changePassword.isPending}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Confirm new password</label>
            <Input
              type="password"
              placeholder="Repeat new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={changePassword.isPending}
            />
          </div>

          {(validationError || changePassword.error) && (
            <p className="text-sm text-destructive">
              {validationError ||
                (changePassword.error instanceof Error
                  ? changePassword.error.message
                  : "Failed to change password. Please try again.")}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              changePassword.isPending ||
              !currentPassword ||
              !newPassword ||
              !confirm
            }
          >
            {changePassword.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Set new password"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
