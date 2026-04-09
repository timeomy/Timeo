import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert, TextInput, TouchableOpacity, View, Text } from "react-native";
import {
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  Phone,
  QrCode,
  RefreshCw,
  UserRound,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import {
  useChangePassword,
  useGenerateQrCode,
  useMemberQrCode,
  useUpdateUserProfile,
  useUserProfile,
} from "@timeo/api-client";
import { useTimeoAuth } from "@timeo/auth";
import { Avatar, Button, Card, Header, Screen, Spacer, useTheme } from "@timeo/ui";

export default function ProfileScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, activeTenantId, signOut } = useTimeoAuth();

  const { data: userProfile } = useUserProfile();
  const { data: qrCode, isLoading: qrLoading } = useMemberQrCode(activeTenantId);

  const updateProfileMutation = useUpdateUserProfile();
  const changePasswordMutation = useChangePassword();
  const generateQrMutation = useGenerateQrCode(activeTenantId ?? "");

  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const displayName = user?.name ?? user?.email ?? "Member";
  const memberId = user?.id?.slice(0, 12).toUpperCase() ?? "MEMBER";

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setProfileForm({
      name: userProfile.name ?? user?.name ?? "",
      phone: userProfile.phone ?? "",
    });
  }, [user?.name, userProfile]);

  const passwordValid = useMemo(
    () =>
      passwordForm.current.length > 0 &&
      passwordForm.next.length >= 8 &&
      passwordForm.next === passwordForm.confirm,
    [passwordForm],
  );

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background + "80",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: theme.colors.text,
    fontSize: 14,
  };

  async function handleSaveProfile() {
    setProfileSaved(false);
    setProfileError(null);

    try {
      await updateProfileMutation.mutateAsync({
        name: profileForm.name.trim() || undefined,
        phone: profileForm.phone.trim() || null,
      });

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (error) {
      setProfileError((error as Error).message ?? "Unable to update profile");
    }
  }

  async function handleChangePassword() {
    if (!passwordValid) {
      return;
    }

    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordForm.current,
        newPassword: passwordForm.next,
      });

      setPasswordSuccess(true);
      setPasswordForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPasswordSuccess(false), 2500);
    } catch (error) {
      setPasswordError((error as Error).message ?? "Unable to update password");
    }
  }

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/(auth)/sign-in");
          } catch {
            Alert.alert("Error", "Unable to sign out. Please try again.");
          }
        },
      },
    ]);
  }, [router, signOut]);

  async function handleRefreshQr() {
    if (!activeTenantId) {
      return;
    }

    try {
      await generateQrMutation.mutateAsync({});
    } catch (error) {
      Alert.alert("Error", (error as Error).message ?? "Failed to refresh QR code");
    }
  }

  return (
    <Screen scroll>
      <Header title="Profile" />

      <Card>
        <View className="flex-row items-start justify-between">
          <View className="flex-1 flex-row items-center pr-3">
            <Avatar src={user?.imageUrl} fallback={displayName} size="lg" />
            <View className="ml-3 flex-1">
              <Text className="text-lg font-bold" style={{ color: theme.colors.text }}>
                {displayName}
              </Text>
              <Text className="mt-1 text-sm" style={{ color: theme.colors.textSecondary }}>
                {user?.email ?? "—"}
              </Text>
              <View
                className="mt-2 self-start rounded-full px-2.5 py-1"
                style={{ backgroundColor: theme.colors.primary + "20" }}
              >
                <Text
                  className="text-[11px] font-semibold"
                  style={{ color: theme.colors.primary }}
                >
                  Member ID: {memberId}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(main)/(customer)/qr-code" as never)}
            className="h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.colors.success + "20" }}
          >
            <QrCode size={20} color={theme.colors.success} />
          </TouchableOpacity>
        </View>
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <QrCode size={16} color={theme.colors.textSecondary} />
            <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
              Member QR
            </Text>
          </View>
          {activeTenantId ? (
            <TouchableOpacity
              onPress={handleRefreshQr}
              className="flex-row items-center rounded-lg px-2.5 py-1"
              style={{ backgroundColor: theme.colors.background + "80" }}
            >
              <RefreshCw
                size={12}
                color={theme.colors.primary}
              />
              <Text className="ml-1 text-xs font-semibold" style={{ color: theme.colors.primary }}>
                Refresh
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!activeTenantId ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Join a business to generate your member QR code.
          </Text>
        ) : qrLoading ? (
          <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
            Loading QR code...
          </Text>
        ) : qrCode?.code ? (
          <View className="items-center">
            <View className="rounded-2xl bg-white p-3">
              <QRCode value={qrCode.code} size={140} />
            </View>
            <Text className="mt-2 text-xs" style={{ color: theme.colors.textSecondary }}>
              Tap full screen for turnstile scan
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(main)/(customer)/qr-code" as never)}
              className="mt-3 rounded-xl px-4 py-2"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-sm font-semibold" style={{ color: "#0B0B0F" }}>
                Open full QR
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text className="text-sm" style={{ color: theme.colors.textSecondary }}>
              QR code not generated yet.
            </Text>
            <TouchableOpacity
              onPress={handleRefreshQr}
              className="mt-3 rounded-xl px-4 py-2"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: "#0B0B0F" }}>
                Generate QR code
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center">
          <UserRound size={16} color={theme.colors.textSecondary} />
          <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
            Personal Details
          </Text>
        </View>

        <Text className="mb-1 text-xs" style={{ color: theme.colors.textSecondary }}>
          Full name
        </Text>
        <TextInput
          value={profileForm.name}
          onChangeText={(value) =>
            setProfileForm((previous) => ({
              ...previous,
              name: value,
            }))
          }
          placeholder="Your name"
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        <Spacer size={10} />

        <Text className="mb-1 text-xs" style={{ color: theme.colors.textSecondary }}>
          Phone
        </Text>
        <View className="relative">
          <View className="absolute left-3 top-3.5 z-10">
            <Phone size={14} color={theme.colors.textSecondary} />
          </View>
          <TextInput
            value={profileForm.phone}
            onChangeText={(value) =>
              setProfileForm((previous) => ({
                ...previous,
                phone: value,
              }))
            }
            placeholder="Optional"
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              ...inputStyle,
              paddingLeft: 34,
            }}
          />
        </View>

        <Spacer size={10} />

        <View
          className="rounded-xl px-3 py-2"
          style={{ backgroundColor: theme.colors.background + "80" }}
        >
          <View className="flex-row items-center">
            <Mail size={14} color={theme.colors.textSecondary} />
            <Text className="ml-2 text-sm" style={{ color: theme.colors.text }}>
              {user?.email ?? "—"}
            </Text>
          </View>
        </View>

        {profileError ? (
          <Text className="mt-2 text-xs" style={{ color: theme.colors.error }}>
            {profileError}
          </Text>
        ) : null}

        {profileSaved ? (
          <Text className="mt-2 text-xs" style={{ color: theme.colors.success }}>
            Profile updated
          </Text>
        ) : null}

        <Spacer size={12} />

        <Button
          onPress={handleSaveProfile}
          loading={updateProfileMutation.isPending}
        >
          Save changes
        </Button>
      </Card>

      <Spacer size={12} />

      <Card>
        <View className="mb-3 flex-row items-center">
          <Lock size={16} color={theme.colors.textSecondary} />
          <Text className="ml-2 text-base font-semibold" style={{ color: theme.colors.text }}>
            Change Password
          </Text>
        </View>

        <TextInput
          secureTextEntry
          value={passwordForm.current}
          onChangeText={(value) =>
            setPasswordForm((previous) => ({
              ...previous,
              current: value,
            }))
          }
          placeholder="Current password"
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        <Spacer size={10} />

        <TextInput
          secureTextEntry
          value={passwordForm.next}
          onChangeText={(value) =>
            setPasswordForm((previous) => ({
              ...previous,
              next: value,
            }))
          }
          placeholder="New password (min 8 chars)"
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        <Spacer size={10} />

        <TextInput
          secureTextEntry
          value={passwordForm.confirm}
          onChangeText={(value) =>
            setPasswordForm((previous) => ({
              ...previous,
              confirm: value,
            }))
          }
          placeholder="Confirm new password"
          placeholderTextColor={theme.colors.textSecondary}
          style={inputStyle}
        />

        {passwordForm.confirm && passwordForm.confirm !== passwordForm.next ? (
          <Text className="mt-2 text-xs" style={{ color: theme.colors.error }}>
            Passwords do not match.
          </Text>
        ) : null}

        {passwordError ? (
          <Text className="mt-2 text-xs" style={{ color: theme.colors.error }}>
            {passwordError}
          </Text>
        ) : null}

        {passwordSuccess ? (
          <View className="mt-2 flex-row items-center">
            <CheckCircle2 size={13} color={theme.colors.success} />
            <Text className="ml-1.5 text-xs" style={{ color: theme.colors.success }}>
              Password updated
            </Text>
          </View>
        ) : null}

        <Spacer size={12} />

        <Button
          variant="outline"
          onPress={handleChangePassword}
          loading={changePasswordMutation.isPending}
          disabled={!passwordValid}
        >
          Update password
        </Button>
      </Card>

      <Spacer size={12} />

      <Card>
        <Button variant="destructive" onPress={handleSignOut}>
          <View className="flex-row items-center">
            <LogOut size={16} color="#FFFFFF" />
            <Text className="ml-2 text-sm font-semibold" style={{ color: "#FFFFFF" }}>
              Logout
            </Text>
          </View>
        </Button>
      </Card>
    </Screen>
  );
}
