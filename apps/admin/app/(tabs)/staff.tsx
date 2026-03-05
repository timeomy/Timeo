import React, { useState, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { UserPlus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  SearchInput,
  Avatar,
  Badge,
  Spacer,
  LoadingScreen,
  EmptyState,
  Select,
  useTheme,
} from "@timeo/ui";
import { getInitials } from "@timeo/shared";
import { useStaffMembers } from "@timeo/api-client";

const ROLE_BADGE_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  admin: "info",
  staff: "default",
  customer: "success",
  platform_admin: "warning",
};

const ROLE_FILTER_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
  { label: "Customer", value: "customer" },
];

export default function StaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const tenantId = activeTenantId as string;

  const { data: members, isLoading } = useStaffMembers(tenantId);

  const filteredMembers = useMemo(() => {
    if (!members) return [];

    return members
      .filter((m) => {
        if (roleFilter === "all" && m.role === "customer") return false;
        if (roleFilter !== "all" && m.role !== roleFilter) return false;
        return true;
      })
      .filter((m) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const roleOrder = ["platform_admin", "admin", "staff", "customer"];
        return roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
      });
  }, [members, search, roleFilter]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Staff" />
        <View className="flex-1 items-center justify-center">
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading team..." />;
  }

  const renderMember = ({ item }: { item: (typeof filteredMembers)[0] }) => (
    <TouchableOpacity
      onPress={() => router.push(`/staff/${item.id}`)}
      activeOpacity={0.7}
      className="mb-2 flex-row items-center rounded-2xl p-4"
      style={{ backgroundColor: theme.colors.surface }}
    >
      <Avatar
        fallback={getInitials(item.name)}
        size="md"
      />
      <View className="ml-3 flex-1">
        <Text
          className="text-base font-semibold"
          style={{ color: theme.colors.text }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          className="text-sm"
          style={{ color: theme.colors.textSecondary }}
          numberOfLines={1}
        >
          {item.email}
        </Text>
      </View>
      <View className="flex-row items-center">
        <Badge
          label={item.role}
          variant={ROLE_BADGE_VARIANTS[item.role] ?? "default"}
        />
        {!item.isActive && (
          <Badge label="Inactive" variant="error" className="ml-2" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <Header
        title="Staff"
        rightActions={
          <TouchableOpacity
            onPress={() => router.push("/staff/invite")}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <UserPlus size={20} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
          </TouchableOpacity>
        }
      />
      <View className="px-4">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff..."
        />
        <Spacer size={12} />
        <Select
          options={ROLE_FILTER_OPTIONS}
          value={roleFilter}
          onChange={setRoleFilter}
          placeholder="Filter by role"
        />
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No team members found"
            description={
              search
                ? "Try a different search term."
                : "Invite your first team member to get started."
            }
            action={
              !search
                ? {
                    label: "Invite Member",
                    onPress: () => router.push("/staff/invite"),
                  }
                : undefined
            }
          />
        }
      />
    </Screen>
  );
}
