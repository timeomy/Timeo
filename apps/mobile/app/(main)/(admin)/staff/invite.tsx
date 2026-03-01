import { useState, useCallback } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle, Mail } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useInviteStaff } from "@timeo/api-client";
import {
  Screen,
  Header,
  Input,
  Select,
  Button,
  Spacer,
  Toast,
  useTheme,
} from "@timeo/ui";

const ROLE_OPTIONS = [
  { label: "Staff", value: "staff" },
  { label: "Admin", value: "admin" },
];

export default function InviteStaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const inviteStaff = useInviteStaff(tenantId ?? "");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const handleInvite = useCallback(async () => {
    if (!email.trim()) {
      setToast({ message: "Email is required", type: "error", visible: true });
      return;
    }
    if (!role) {
      setToast({ message: "Please select a role", type: "error", visible: true });
      return;
    }

    setLoading(true);
    try {
      await inviteStaff.mutateAsync({
        email: email.trim().toLowerCase(),
        role,
      });
      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send invite";
      setToast({ message, type: "error", visible: true });
    } finally {
      setLoading(false);
    }
  }, [email, role, inviteStaff]);

  const handleInviteAnother = useCallback(() => {
    setEmail("");
    setRole("staff");
    setSuccess(false);
  }, []);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Invite Team Member" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen>
        <Header title="Invite Team Member" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="mb-6 rounded-full p-5"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle size={48} color={theme.colors.success} />
          </View>
          <Text className="text-center text-xl font-bold" style={{ color: theme.colors.text }}>
            Invite Sent!
          </Text>
          <Text className="mt-2 text-center text-sm" style={{ color: theme.colors.textSecondary }}>
            An invitation has been sent to {email}. They will receive
            instructions to join your organization.
          </Text>
          <Spacer size={32} />
          <View className="w-full">
            <Button onPress={handleInviteAnother}>Invite Another</Button>
            <Spacer size={12} />
            <Button variant="outline" onPress={() => router.back()}>
              Done
            </Button>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Invite Team Member" onBack={() => router.back()} />

      <View className="rounded-2xl p-4" style={{ backgroundColor: theme.colors.surface }}>
        <View className="mb-6 items-center">
          <View
            className="rounded-full p-4"
            style={{ backgroundColor: theme.colors.primary + "15" }}
          >
            <Mail size={32} color={theme.colors.primary} />
          </View>
          <Spacer size={12} />
          <Text className="text-center text-base" style={{ color: theme.colors.textSecondary }}>
            Enter the email address and role for the person you want to invite
            to your team.
          </Text>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Input
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="colleague@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Select
            label="Role"
            options={ROLE_OPTIONS}
            value={role}
            onChange={setRole}
            placeholder="Select a role"
          />
        </View>

        {/* Role Description */}
        <View
          className="mb-6 rounded-xl p-4"
          style={{ backgroundColor: theme.colors.background }}
        >
          {role === "admin" ? (
            <View>
              <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                Admin Role
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                Full access to manage services, products, staff, customers,
                settings, and all business operations.
              </Text>
            </View>
          ) : (
            <View>
              <Text className="text-sm font-semibold" style={{ color: theme.colors.text }}>
                Staff Role
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                Can manage bookings, view services and products, and handle
                day-to-day operations. Cannot change settings or manage other
                staff.
              </Text>
            </View>
          )}
        </View>

        <Button onPress={handleInvite} loading={loading} disabled={!email.trim()}>
          Send Invitation
        </Button>
      </View>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
