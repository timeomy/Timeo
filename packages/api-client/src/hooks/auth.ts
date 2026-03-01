import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

const authKeys = {
  currentUser: () => ["auth", "currentUser"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: () => api.get<User>("/api/auth/session"),
    staleTime: 60_000,
    retry: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post<{ user: User }>("/api/auth/sign-in/email", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() }),
  });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      name: string;
    }) => api.post<{ user: User }>("/api/auth/sign-up/email", data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authKeys.currentUser() }),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/sign-out"),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.currentUser(), null);
      queryClient.invalidateQueries();
    },
  });
}
