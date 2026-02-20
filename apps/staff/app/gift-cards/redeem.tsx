import { useState, useCallback } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { CreditCard, Check, AlertCircle } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
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
  const tenantId = activeTenantId as any;

  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const validation = useQuery(
    api.giftCards.validateCode,
    tenantId && code.trim().length >= 3
      ? { tenantId, code: code.trim().toUpperCase() }
      : "skip"
  );

  const redeemGiftCard = useMutation(api.giftCards.redeem);

  const handleRedeem = useCallback(async () => {
    if (!tenantId || !code.trim() || !amount.trim()) return;
    const amountCents = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemGiftCard({
        tenantId,
        code: code.trim().toUpperCase(),
        amount: amountCents,
      });
      Alert.alert(
        "Success",
        `Redeemed RM ${(amountCents / 100).toFixed(2)}.\nNew balance: RM ${(result.newBalance / 100).toFixed(2)}`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to redeem gift card"
      );
    } finally {
      setRedeeming(false);
    }
  }, [tenantId, code, amount, redeemGiftCard, router]);

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

  const isValid = validation && validation.valid === true;
  const isInvalid = validation && validation.valid === false;

  return (
    <Screen padded={false}>
      <Header title="Redeem Gift Card" onBack={() => router.back()} />
      <View className="flex-1 px-4" style={{ paddingTop: 8 }}>
        {/* Gift Card Code Input */}
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

        {/* Validation Result */}
        {isValid && validation.card && (
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
                Code: {validation.card.code}
              </Text>
              <Text
                className="mt-1 text-2xl font-bold"
                style={{ color: theme.colors.success }}
              >
                RM {(validation.card.currentBalance / 100).toFixed(2)}
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
                {validation.reason}
              </Text>
            </View>
          </Card>
        )}

        {isValid && (
          <>
            <Spacer size={12} />

            {/* Amount Input */}
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

            {/* Redeem Button */}
            <Button
              size="lg"
              onPress={handleRedeem}
              loading={redeeming}
              disabled={!amount.trim() || redeeming}
            >
              <View className="flex-row items-center">
                <CreditCard size={18} color="#FFFFFF" />
                <Text className="ml-2 text-base font-semibold text-white">
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
