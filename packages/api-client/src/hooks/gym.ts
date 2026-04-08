import { useQuery } from "@tanstack/react-query";
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
