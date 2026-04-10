import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

export interface GymMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarUrl?: string | null;
}

interface GymMembersApiResponse {
  members: Array<{
    membership: {
      id: string;
      role: string;
      status: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  pagination?: {
    totalPages?: number;
  };
}

export interface CoachOption {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

type CoachApiResponse = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
};

export interface MemberDetail {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    memberId: string | null;
    createdAt: string;
  };
  membership: {
    id: string;
    role: string;
    status: string;
    notes: string | null;
    tags: string[];
    memberId: string | null;
    joinedAt: string;
    coachId: string | null;
  };
  membershipStatus: "active" | "suspended" | "expired";
  subscription: {
    id: string;
    status: string;
    membershipId: string;
    planName: string | null;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    startDate: string;
    endDate: string;
    cancelAtPeriodEnd: boolean;
    daysRemaining: number;
    isActive: boolean;
  } | null;
  payments: Array<{
    id: string;
    planName: string;
    amount: number;
    currency: string;
    status: string;
    receiptUrl: string | null;
    memberNote: string | null;
    adminNote: string | null;
    approvedAt: string | null;
    rejectedAt: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  checkIns: Array<{
    id: string;
    method: string;
    gate: string | null;
    device: string | null;
    entryType: string | null;
    notes: string | null;
    timestamp: string;
  }>;
  classEnrollments: Array<{
    id: string;
    classId: string;
    className: string | null;
    status: string;
    waitlistPosition: number | null;
    startTime: string | null;
    location: string | null;
    enrolledAt: string;
    attendedAt: string | null;
  }>;
  sessionCredits: Array<{
    id: string;
    packageId: string;
    packageName: string | null;
    totalSessions: number;
    usedSessions: number;
    remainingSessions: number;
    expiresAt: string | null;
    purchasedAt: string;
  }>;
  faceRegistration?: {
    registered: boolean;
    registrations: Array<{ id: string; status: string }>;
  };
  recentCheckIns?: Array<{
    id: string;
    method: string;
    timestamp: string;
  }>;
  qrCode?: string | null;
}

export interface UpdateMemberPayload {
  name?: string;
  email?: string;
  phone?: string | null;
  avatar_url?: string | null;
  role?: "customer" | "coach" | "staff" | "admin";
  status?: "active" | "suspended" | "inactive";
  notes?: string | null;
  tags?: string[];
  coach_id?: string | null;
  member_id?: string | null;
}

export function useGymMembers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["gym", tenantId, "members"],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async () => {
      const allMembers: GymMember[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const response = await api.get<GymMembersApiResponse>(
          `/api/tenants/${tenantId}/gym/members?page=${page}&limit=100`,
        );

        allMembers.push(
          ...response.members.map((row) => ({
            membershipId: row.membership.id,
            userId: row.user.id,
            name: row.user.name,
            email: row.user.email,
            role: row.membership.role,
            status: row.membership.status,
            avatarUrl: row.user.avatarUrl,
          })),
        );

        totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        page += 1;
      }

      return allMembers;
    },
  });
}

export function useMemberDetail(
  tenantId: string | null | undefined,
  memberId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["gym", tenantId, "member-detail", memberId],
    enabled: !!tenantId && !!memberId,
    staleTime: 10_000,
    queryFn: () =>
      api.get<MemberDetail>(
        `/api/tenants/${tenantId}/members/${encodeURIComponent(memberId ?? "")}`,
      ),
  });
}

export function useCoaches(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["gym", tenantId, "coaches"],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async () => {
      const rows = await api.get<CoachApiResponse[]>(`/api/tenants/${tenantId}/coaches`);
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatar_url,
        role: row.role,
      }));
    },
  });
}

export function useUpdateMember(tenantId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: UpdateMemberPayload;
    }) => {
      if (!tenantId) {
        throw new Error("Tenant ID is required to update a member");
      }

      return api.patch<{
        user: MemberDetail["user"];
        membership: MemberDetail["membership"];
      }>(
        `/api/tenants/${tenantId}/members/${encodeURIComponent(memberId)}`,
        payload,
      );
    },
    onSuccess: (_data, { memberId }) => {
      if (!tenantId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: ["gym", tenantId, "member-detail", memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["gym", tenantId, "members"],
      });
    },
  });
}
