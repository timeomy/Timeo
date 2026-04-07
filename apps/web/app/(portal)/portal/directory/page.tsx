"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicTenants } from "@timeo/api-client";
import {
  Card,
  CardContent,
  Input,
  Button,
  Skeleton,
} from "@timeo/ui/web";
import {
  Search,
  Building2,
  ArrowRight,
  KeyRound,
} from "lucide-react";

export default function DirectoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  );

  const { data: businesses, isLoading } = usePublicTenants(
    debouncedSearch || undefined
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    setDebounceTimer(timer);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Find a Business
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Discover gyms, salons, clinics and more on Timeo. To join, ask them for an invite code.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          className="glass border-white/[0.08] pl-9"
          placeholder="Search businesses..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton
              key={i}
              className="h-36 rounded-xl bg-white/[0.06]"
            />
          ))}
        </div>
      ) : businesses && businesses.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses.map((biz) => (
            <Card
              key={biz.id}
              className="glass border-white/[0.08] transition-colors hover:border-white/[0.15]"
            >
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: biz.primaryColor
                        ? `${biz.primaryColor}20`
                        : "hsl(var(--primary) / 0.1)",
                    }}
                  >
                    {biz.logoUrl ? (
                      <img
                        src={biz.logoUrl}
                        alt={biz.name}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2
                        className="h-6 w-6"
                        style={{
                          color: biz.primaryColor ?? "hsl(var(--primary))",
                        }}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {biz.name}
                    </p>
                    <p className="text-xs text-white/40">{biz.slug}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-center">
                  <p className="text-xs text-white/50">
                    Have an invite code?{" "}
                    <button
                      onClick={() => router.push("/join")}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      Enter it here
                    </button>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Building2 className="h-8 w-8 text-white/30" />
          </div>
          <p className="text-lg font-medium text-white/60">
            {debouncedSearch
              ? "No businesses found"
              : "No businesses listed yet"}
          </p>
          <p className="mt-1 text-sm text-white/40">
            {debouncedSearch
              ? "Try a different search term"
              : "Check back later or join using a business code"}
          </p>
          {!debouncedSearch && (
            <Button
              variant="outline"
              className="mt-4 gap-2"
              onClick={() => router.push("/join")}
            >
              <KeyRound className="h-4 w-4" />
              Enter a Code
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
