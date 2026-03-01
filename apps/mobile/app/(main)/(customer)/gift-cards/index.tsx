import { useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { CreditCard, Search, CheckCircle, XCircle } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useGiftCardByCode } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Input,
  Button,
  Spacer,
  EmptyState,
  useTheme,
} from "@timeo/ui";

export default function GiftCardsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;
  const [code, setCode] = useState("");
  const [searchCode, setSearchCode] = useState("");

  const { data: giftCard, isLoading: isSearching } = useGiftCardByCode(
    tenantId,
    searchCode || undefined
  );

  const handleCheckBalance = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed) {
      setSearchCode(trimmed);
    }
  };

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Gift Cards" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Gift Cards" onBack={() => router.back()} />

      <Spacer size={16} />

      {/* Search Section */}
      <Card>
        <View className="flex-row items-center mb-4">
          <CreditCard size={20} color={theme.colors.primary} />
          <Text
            className="ml-2 text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Check Gift Card Balance
          </Text>
        </View>

        <Input
          placeholder="Enter gift card code (e.g. GC-XXXX-XXXX-XXXX)"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />

        <Spacer size={12} />

        <Button onPress={handleCheckBalance} disabled={!code.trim()}>
          <View className="flex-row items-center">
            <Search size={16} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
            <Text
              className="ml-2 font-semibold"
              style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
            >
              Check Balance
            </Text>
          </View>
        </Button>
      </Card>

      {/* Result Section */}
      {searchCode && !isSearching && giftCard ? (
        <>
          <Spacer size={16} />
          {giftCard.isActive ? (
            <Card>
              <View className="items-center py-4">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.success + "15" }}
                >
                  <CheckCircle size={32} color={theme.colors.success} />
                </View>
                <Spacer size={16} />
                <Text
                  className="text-sm font-mono font-semibold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  {giftCard.code}
                </Text>
                <Spacer size={8} />
                <Text
                  className="text-3xl font-bold"
                  style={{ color: theme.colors.success }}
                >
                  RM {(giftCard.currentBalance / 100).toFixed(2)}
                </Text>
                <Text
                  className="mt-1 text-sm"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Available Balance ({giftCard.currency ?? "MYR"})
                </Text>
                <Spacer size={12} />
                <View
                  className="rounded-full px-4 py-1.5"
                  style={{ backgroundColor: theme.colors.success + "15" }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: theme.colors.success }}
                  >
                    Valid & Active
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Card>
              <View className="items-center py-4">
                <View
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: theme.colors.error + "15" }}
                >
                  <XCircle size={32} color={theme.colors.error} />
                </View>
                <Spacer size={16} />
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.error }}
                >
                  Gift Card Inactive
                </Text>
                <Spacer size={4} />
                <Text
                  className="text-sm text-center"
                  style={{ color: theme.colors.textSecondary }}
                >
                  This gift card is no longer active.
                </Text>
              </View>
            </Card>
          )}
        </>
      ) : searchCode && !isSearching && !giftCard ? (
        <>
          <Spacer size={16} />
          <Card>
            <View className="items-center py-4">
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: theme.colors.error + "15" }}
              >
                <XCircle size={32} color={theme.colors.error} />
              </View>
              <Spacer size={16} />
              <Text
                className="text-base font-semibold"
                style={{ color: theme.colors.error }}
              >
                Invalid Gift Card
              </Text>
              <Spacer size={4} />
              <Text
                className="text-sm text-center"
                style={{ color: theme.colors.textSecondary }}
              >
                Gift card not found. Please check the code and try again.
              </Text>
            </View>
          </Card>
        </>
      ) : !searchCode ? (
        <>
          <Spacer size={32} />
          <EmptyState
            title="Check your gift card"
            description="Enter a gift card code above to check the remaining balance."
            icon={<CreditCard size={32} color={theme.colors.textSecondary} />}
          />
        </>
      ) : null}

      <Spacer size={40} />
    </Screen>
  );
}
