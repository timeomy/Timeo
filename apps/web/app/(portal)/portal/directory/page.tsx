"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePublicTenants, useJoinTenant } from "@timeo/api-client";
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
  Loader2,
  Check,
  Zap,
  ArrowRight,
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
  const joinMutation = useJoinTenant();
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);
  const [joinedSlug, setJoinedSlug] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 300);
    setDebounceTimer(timer);
  };

  const handleJoin = async (slug: string) => {
    setJoiningSlug(slug);
    try {
      await joinMutation.mutateAsync(slug);
      setJoinedSlug(slug);
      setTimeout(() => {
        router.push("/portal");
      }, 1200);
    } catch {
      setJoiningSlug(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Browse Businesses
        </h1>
        <p className="mt-1 text-sm text-white/50">
          Discover gyms, salons, clinics and more on Timeo
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
          {businesses.map((biz) => {
            const isJoining = joiningSlug === biz.slug;
            const isJoined = joinedSlug === biz.slug;

            return (
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

                  <Button
                    size="sm"
                    className="w-full gap-2"
                    variant={isJoined ? "outline" : "default"}
                    disabled={isJoining || isJoined}
                    onClick={() => handleJoin(biz.slug)}
                  >
                    {isJoined ? (
                      <>
                        <Check className="h-4 w-4" />
                        Joined!
                      </>
                    ) : isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        Join
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
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
              Enter a Code
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
