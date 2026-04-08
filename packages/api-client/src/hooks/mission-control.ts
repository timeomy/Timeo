import { useQuery } from "@tanstack/react-query";
import { api } from "../client";

export type MissionControlCheckIn = {
  id: string;
  userId: string;
  method: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  initials: string;
};

export type HeatmapCell = {
  day: number;
  hour: number;
  count: number;
};

export type MissionControlMetrics = {
  totalMembers: number;
  todayCheckIns: number;
  weekCheckIns: number;
  activeSubscriptions: number;
  monthRevenue: number;
  staffCount: number;
  newMembersThisMonth: number;
  newMembersLastMonth: number;
};

export type MissionControlData = {
  metrics: MissionControlMetrics;
  recentCheckIns: MissionControlCheckIn[];
  heatmap: HeatmapCell[];
  membershipBreakdown: Record<string, number>;
};

export function useMissionControl(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ["mission-control", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: () => api.get<MissionControlData>(`/api/tenants/${tenantId}/mission-control`),
  });
}
