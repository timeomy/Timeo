import React, { useState, useCallback } from "react";
import { View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Input,
  Button,
  Spacer,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useMutation } from "convex/react";

export default function CreateGiftCardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();

  const tenantId = activeTenantId as string;

  const createGiftCard = useMutation(api.giftCards.create);

  const [amount, setAmount] = useState("");
  const [purchaserName, setPurchaserName] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const handleCreate = useCallback(async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setToast({
        message: "Please enter a valid amount",
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);
    try {
      const result = await createGiftCard({
        tenantId: tenantId as any,
        initialBalance: Math.round(parsedAmount * 100),
        currency: "MYR",
        purchaserName: purchaserName.trim() || undefined,
        purchaserEmail: purchaserEmail.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientEmail: recipientEmail.trim() || undefined,
        message: message.trim() || undefined,
      });

      Alert.alert(
        "Gift Card Created",
        `Code: ${result.code}\n\nShare this code with the recipient.`,
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "Failed to create gift card";
      setToast({ message: errMessage, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [
    amount,
    purchaserName,
    purchaserEmail,
    recipientName,
    recipientEmail,
    message,
    tenantId,
    createGiftCard,
    router,
  ]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Issue Gift Card" onBack={() => router.back()} />
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

  return (
    <Screen scroll>
      <Header title="Issue Gift Card" onBack={() => router.back()} />

      <Card className="mb-4">
        <Input
          label="Amount (RM)"
          value={amount}
          onChangeText={setAmount}
          placeholder="50.00"
          keyboardType="decimal-pad"
          className="mb-4"
        />

        <Input
          label="Purchaser Name"
          value={purchaserName}
          onChangeText={setPurchaserName}
          placeholder="John Doe"
          className="mb-4"
        />

        <Input
          label="Purchaser Email"
          value={purchaserEmail}
          onChangeText={setPurchaserEmail}
          placeholder="john@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-4"
        />

        <Input
          label="Recipient Name"
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Jane Doe"
          className="mb-4"
        />

        <Input
          label="Recipient Email"
          value={recipientEmail}
          onChangeText={setRecipientEmail}
          placeholder="jane@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-4"
        />

        <Input
          label="Message (optional)"
          value={message}
          onChangeText={setMessage}
          placeholder="Happy Birthday!"
          multiline
          numberOfLines={3}
          className="mb-4"
        />
      </Card>

      <Button onPress={handleCreate} loading={saving}>
        Issue Gift Card
      </Button>

      <Spacer size={20} />

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
