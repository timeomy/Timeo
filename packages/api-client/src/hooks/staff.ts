import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface StaffMember {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
}

export function useStaffMembers(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.all(tenantId ?? ""),
    queryFn: () =>
      api.get<StaffMember[]>(`/api/tenants/${tenantId}/staff`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useUpdateStaffRole(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      memberId,
      userId,
      role,
    }: {
      memberId?: string;
      userId?: string;
      role: string;
    }) =>
      api.patch(`/api/tenants/${tenantId}/staff/${memberId ?? userId}`, {
        role,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      }),
  });
}

export function useRemoveStaffMember(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/api/tenants/${tenantId}/staff/${memberId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.staff.all(tenantId),
      }),
  });
}
