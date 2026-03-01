import { useState, useCallback } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CreditCard, Check, AlertCircle } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useGiftCardByCode, useRedeemGiftCard } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Spacer,
  useTheme,
} from "@timeo/ui";

export default function RedeemGiftCardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const trimmedCode = code.trim().toUpperCase();
  const {
    data: card,
    isLoading: isValidating,
  } = useGiftCardByCode(
    tenantId,
    trimmedCode.length >= 3 ? trimmedCode : undefined,
  );

  const redeemGiftCard = useRedeemGiftCard(tenantId ?? "");

  const isValid = !!card && card.isActive && card.currentBalance > 0;
  const isInvalid = trimmedCode.length >= 3 && !isValidating && !card;

  const handleRedeem = useCallback(async () => {
    if (!tenantId || !card || !amount.trim()) return;
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemGiftCard.mutateAsync({
        giftCardId: card.id,
        amount: amountCents,
      });
      Alert.alert(
        "Success",
        `Redeemed RM ${(amountCents / 100).toFixed(2)}.\nNew balance: RM ${(result.remainingBalance / 100).toFixed(2)}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to redeem gift card",
      );
    } finally {
      setRedeeming(false);
    }
  }, [tenantId, card, amount, redeemGiftCard, router]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Redeem Gift Card" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header title="Redeem Gift Card" onBack={() => router.back()} />
      <View className="flex-1 px-4" style={{ paddingTop: 8 }}>
        <Card>
          <View className="mb-2 flex-row items-center">
            <CreditCard size={16} color={theme.colors.primary} />
            <Text
              className="ml-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Gift Card Code
            </Text>
          </View>
          <TextInput
            className="rounded-xl px-3 py-2.5 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: isValid
                ? theme.colors.success
                : isInvalid
                  ? theme.colors.error
                  : theme.colors.border,
            }}
            placeholder="Enter gift card code (e.g. GC-XXXX-XXXX)"
            placeholderTextColor={theme.colors.textSecondary}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </Card>

        <Spacer size={12} />

        {isValid && card && (
          <Card>
            <View
              className="rounded-xl p-4"
              style={{ backgroundColor: theme.colors.success + "15" }}
            >
              <View className="flex-row items-center">
                <Check size={20} color={theme.colors.success} />
                <Text
                  className="ml-2 text-base font-semibold"
                  style={{ color: theme.colors.success }}
                >
                  Valid Gift Card
                </Text>
              </View>
              <Spacer size={8} />
              <Text
                className="text-sm"
                style={{ color: theme.colors.text }}
              >
                Code: {card.code}
              </Text>
              <Text
                className="mt-1 text-2xl font-bold"
                style={{ color: theme.colors.success }}
              >
                RM {(card.currentBalance / 100).toFixed(2)}
              </Text>
              <Text
                className="text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Available balance
              </Text>
            </View>
          </Card>
        )}

        {isInvalid && (
          <Card>
            <View
              className="flex-row items-center rounded-xl p-4"
              style={{ backgroundColor: theme.colors.error + "15" }}
            >
              <AlertCircle size={20} color={theme.colors.error} />
              <Text
                className="ml-2 text-sm font-medium"
                style={{ color: theme.colors.error }}
              >
                Gift card not found or inactive
              </Text>
            </View>
          </Card>
        )}

        {isValid && (
          <>
            <Spacer size={12} />

            <Card>
              <Text
                className="mb-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Redemption Amount (RM)
              </Text>
              <TextInput
                className="rounded-xl px-3 py-2.5 text-base"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </Card>

            <Spacer size={24} />

            <Button
              size="lg"
              onPress={handleRedeem}
              loading={redeeming}
              disabled={!amount.trim() || redeeming}
            >
              <View className="flex-row items-center">
                <CreditCard
                  size={18}
                  color={theme.dark ? "#0B0B0F" : "#FFFFFF"}
                />
                <Text
                  className="ml-2 text-base font-semibold"
                  style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
                >
                  Redeem Gift Card
                </Text>
              </View>
            </Button>
          </>
        )}
      </View>
    </Screen>
  );
}
