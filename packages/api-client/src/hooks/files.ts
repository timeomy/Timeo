import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";
import { queryKeys } from "../query-keys";

interface FileRecord {
  id: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export function useFiles(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.files.all(tenantId ?? ""),
    queryFn: () => api.get<FileRecord[]>(`/api/tenants/${tenantId}/files`),
    enabled: !!tenantId,
    staleTime: 30_000,
  });
}

export function useUploadFile(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ??
        process.env.EXPO_PUBLIC_API_URL ??
        "http://localhost:4000";

      const response = await fetch(
        `${baseUrl}/api/tenants/${tenantId}/files`,
        {
          method: "POST",
          credentials: "include",
          body: formData,
        },
      );

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error?.message ?? "Upload failed");
      }
      return json.data as { fileId: string; url: string };
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.files.all(tenantId),
      }),
  });
}

export function useDeleteFile(tenantId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      api.delete(`/api/tenants/${tenantId}/files/${fileId}`),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.files.all(tenantId),
      }),
  });
}
