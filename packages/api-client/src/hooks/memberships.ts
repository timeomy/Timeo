import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface Membership {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval?: "monthly" | "yearly";
  billingInterval?: "monthly" | "yearly";
  duration_months?: number;
  durationMonths?: number;
  plan_type?: string;
  planType?: string;
  features?: string[];
  benefits?: string[];
  is_active?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MembershipSubscription {
  id: string;
  customerId?: string;
  memberName?: string;
  memberEmail?: string;
  membershipId?: string;
  planName?: string;
  planPrice?: number;
  status: "active" | "past_due" | "canceled" | "incomplete";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd?: boolean;
  updatedAt?: string;
  subscription?: {
    id: string;
    tenantId: string;
    customerId: string;
    membershipId: string;
    status: "active" | "past_due" | "canceled" | "incomplete";
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  plan?: {
    name: string;
    price: number;
  };
}

export interface MyMembershipSubscription {
  subscription: {
    id: string;
    status: string;
    membershipId?: string | null;
    membership_id?: string | null;
    currentPeriodStart?: string;
    current_period_start?: string;
    currentPeriodEnd?: string;
    current_period_end?: string;
    cancelAtPeriodEnd?: boolean;
    cancel_at_period_end?: boolean;
    createdAt?: string;
    created_at?: string;
  };
  plan: {
    name: string | null;
    price: number | null;
  };
}

export function useMemberships(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.memberships.all(tenantId ?? ""),
    queryFn: () =>
      api.get<Membership[]>(`/api/tenants/${tenantId}/memberships`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useMyMembershipSubscriptions(
  tenantId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.memberships.mine(tenantId ?? ""),
    queryFn: () =>
      api.get<MyMembershipSubscription[]>(
        `/api/tenants/${tenantId}/memberships/subscriptions/mine`,
      ),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useMembership(
  tenantId: string | null | undefined,
  membershipId: string | null | undefined,
) {
  return useQuery({
    queryKey: queryKeys.memberships.byId(tenantId ?? "", membershipId ?? ""),
    queryFn: () =>
      api.get<Membership>(
        `/api/tenants/${tenantId}/memberships/${membershipId}`,
      ),
    enabled: !!tenantId && !!membershipId,
  });
}

export function useCreateMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      price: number;
      billingInterval: "monthly" | "yearly";
      description?: string;
      benefits?: string[];
    }) =>
      api.post<{ membershipId: string }>(
        `/api/tenants/${tenantId}/memberships`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useUpdateMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      ...data
    }: {
      membershipId: string;
      name?: string;
      price?: number;
      description?: string;
      benefits?: string[];
      isActive?: boolean;
    }) =>
      api.patch(
        `/api/tenants/${tenantId}/memberships/${membershipId}`,
        data,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useDeleteMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      api.delete(`/api/tenants/${tenantId}/memberships/${membershipId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useSubscribeToMembership(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) =>
      api.post<{ subscriptionId: string }>(
        `/api/tenants/${tenantId}/memberships/${membershipId}/subscribe`,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.memberships.all(tenantId),
      }),
  });
}

export function useMySubscriptions(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.mine(tenantId ?? ""),
    queryFn: () =>
      api.get<MembershipSubscription[]>(
        `/api/tenants/${tenantId}/memberships/subscriptions/mine`,
      ),
    enabled: !!tenantId,
    staleTime: 15_000,
  });
}

export function useTenantSubscriptions(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.subscriptions.all(tenantId ?? ""),
    queryFn: () =>
      api.get<MembershipSubscription[]>(
        `/api/tenants/${tenantId}/memberships/subscriptions`,
      ),
    enabled: !!tenantId,
    staleTime: 15_000,
  });
}
