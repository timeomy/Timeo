"use client";

import { useState } from "react";
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
  Label,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  UserPlus,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type CreateMemberResult = {
  id: string;
  name: string;
  email: string;
};

type MemberFormData = {
  name: string;
  email: string;
  phone: string;
  membershipPlan: string;
};

// ---- Data hook ----

function useCreateMember() {
  const { tenantId } = useTenantId();
  return useMutation<CreateMemberResult, Error, MemberFormData>({
    mutationFn: async (formData: MemberFormData) => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );
      const data = await res.json();
      if (!data.success)
        throw new Error(data.error?.message || "Failed to create member");
      return data.data as CreateMemberResult;
    },
  });
}

// ---- Page ----

export default function NewGymMemberPage() {
  const router = useRouter();
  const createMutation = useCreateMember();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipPlan, setMembershipPlan] = useState("");

  const isValid = name.trim().length > 0 && email.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        membershipPlan: membershipPlan.trim(),
      });
      // Redirect to the new member's detail page
      router.push(`/dashboard/gym/members/${result.id}`);
    } catch (err) {
      console.error("Create member error:", err);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-white/50 hover:text-white"
          onClick={() => router.push("/dashboard/gym/members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Add New Member
          </h1>
          <p className="text-sm text-white/50">
            Register a new gym member
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5 text-primary" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-white/70">
                Full Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Ahmad bin Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-white/70">
                Email Address <span className="text-red-400">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. ahmad@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-white/40">
                An invitation email will be sent to this address.
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-white/70">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. +60 12-345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Membership Plan */}
            <div className="space-y-2">
              <Label
                htmlFor="membershipPlan"
                className="text-sm text-white/70"
              >
                Membership Plan
              </Label>
              <Input
                id="membershipPlan"
                placeholder="e.g. Monthly Premium, Day Pass"
                value={membershipPlan}
                onChange={(e) => setMembershipPlan(e.target.value)}
              />
              <p className="text-xs text-white/40">
                Leave blank to assign a plan later.
              </p>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={!isValid || createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Add Member
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/gym/members")}
              >
                Cancel
              </Button>
            </div>

            {/* Error */}
            {createMutation.isError && (
              <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Failed to create member
                  </p>
                  <p className="text-xs text-red-400/60 mt-0.5">
                    {(createMutation.error as Error)?.message ??
                      "Please check the details and try again."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
