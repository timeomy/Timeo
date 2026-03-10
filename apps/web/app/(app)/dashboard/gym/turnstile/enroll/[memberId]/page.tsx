"use client";

import { useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTenantId } from "@/hooks/use-tenant-id";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
  Skeleton,
  cn,
} from "@timeo/ui/web";
import {
  ArrowLeft,
  SmilePlus,
  Upload,
  CheckCircle2,
  XCircle,
  Loader2,
  ImagePlus,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---- Types ----

type MemberInfo = {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  faceEnrolled: boolean;
};

type EnrollResult = {
  success: boolean;
  message: string;
};

// ---- Data hooks ----

function useMemberInfo(memberId: string) {
  const { tenantId } = useTenantId();
  return useQuery<MemberInfo>({
    queryKey: ["gym", tenantId, "/members", memberId, "info"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members/${memberId}`,
        { credentials: "include" },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to load member");
      return data.data as MemberInfo;
    },
    enabled: !!tenantId && !!memberId,
  });
}

function useEnrollFace(memberId: string) {
  const { tenantId } = useTenantId();
  return useMutation<EnrollResult, Error, File>({
    mutationFn: async (photoFile: File) => {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await fetch(
        `${API_URL}/api/tenants/${tenantId}/gym/members/${memberId}/enroll-face`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Enrollment failed");
      return data.data as EnrollResult;
    },
  });
}

// ---- Helpers ----

function getInitial(name: string | null) {
  return (name?.[0] ?? "?").toUpperCase();
}

// ---- Page ----

export default function FaceEnrollmentPage() {
  const params = useParams()!;
  const memberId = params.memberId as string;
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: member, isLoading } = useMemberInfo(memberId);
  const enrollMutation = useEnrollFace(memberId);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileSelect(file);
    }
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function onDragLeave() {
    setDragOver(false);
  }

  async function handleEnroll() {
    if (!selectedFile) return;
    try {
      await enrollMutation.mutateAsync(selectedFile);
    } catch (err) {
      console.error("Enrollment error:", err);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/[0.06]" />
        <Skeleton className="h-32 rounded-xl bg-white/[0.06]" />
        <Skeleton className="h-64 rounded-xl bg-white/[0.06]" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-white/50">Member not found</p>
        <Button
          variant="outline"
          className="mt-4 gap-2"
          onClick={() => router.push("/dashboard/gym/members")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-white/50 hover:text-white"
        onClick={() => router.push(`/dashboard/gym/members/${memberId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Member
      </Button>

      {/* Member Info Header */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage
                src={member.photoUrl ?? undefined}
                alt={member.name}
              />
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                {getInitial(member.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-white">{member.name}</h2>
              <p className="text-sm text-white/50">{member.email}</p>
            </div>
            <div className="ml-auto">
              {member.faceEnrolled ? (
                <Badge
                  variant="outline"
                  className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Enrolled
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1 bg-white/[0.06] text-white/50 border-white/[0.08]"
                >
                  <XCircle className="h-3 w-3" />
                  Not Enrolled
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Face Enrollment */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SmilePlus className="h-5 w-5 text-primary" />
            Face Enrollment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]",
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileInputChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-48 w-48 overflow-hidden rounded-xl border border-white/[0.06]">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <p className="text-sm text-white/50">{selectedFile?.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    enrollMutation.reset();
                  }}
                >
                  Choose Different Photo
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-full bg-white/[0.04] p-4 mb-4">
                  <ImagePlus className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-sm font-medium text-white/60">
                  Drop a photo here or click to select
                </p>
                <p className="text-xs text-white/30 mt-1">
                  Use a clear, front-facing photo for best recognition accuracy.
                </p>
              </>
            )}
          </div>

          {/* Enroll Button */}
          <Button
            className="w-full gap-2"
            onClick={handleEnroll}
            disabled={!selectedFile || enrollMutation.isPending}
          >
            {enrollMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enrolling face...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Enroll Face
              </>
            )}
          </Button>

          {/* Status Feedback */}
          {enrollMutation.isSuccess && (
            <div className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  Face enrolled successfully
                </p>
                <p className="text-xs text-emerald-400/60 mt-0.5">
                  {enrollMutation.data?.message ??
                    "The member can now use face recognition at the turnstile."}
                </p>
              </div>
            </div>
          )}

          {enrollMutation.isError && (
            <div className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Enrollment failed
                </p>
                <p className="text-xs text-red-400/60 mt-0.5">
                  {(enrollMutation.error as Error)?.message ??
                    "Please try again with a different photo."}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
