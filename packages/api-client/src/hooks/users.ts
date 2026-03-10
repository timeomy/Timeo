import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
  force_password_reset: boolean;
  created_at: string;
}

const userKeys = {
  me: () => ["users", "me"] as const,
};

/** Fetch the current authenticated user's profile, including force_password_reset flag. */
export function useUserProfile() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () => api.get<UserProfile>("/api/users/me"),
    staleTime: 60_000,
    retry: false,
  });
}

/** Change password for the currently authenticated user and clear force_password_reset. */
export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post<{ message: string }>("/api/users/me/change-password", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}
