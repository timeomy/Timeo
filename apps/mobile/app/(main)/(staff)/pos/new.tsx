import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  Plus,
  Trash2,
  ShoppingBag,
  Tag,
  Save,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useStaffMembers,
  useValidateVoucher,
  useCreatePosTransaction,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  Select,
  RadioGroup,
  LoadingScreen,
  Separator,
  Spacer,
  useTheme,
} from "@timeo/ui";

const ITEM_TYPES = [
  { label: "Membership", value: "membership" },
  { label: "Session Package", value: "session_package" },
  { label: "Service", value: "service" },
  { label: "Product", value: "product" },
];

const PAYMENT_METHODS = [
  { label: "Cash", value: "cash" },
  { label: "Card", value: "card" },
  { label: "QR Pay", value: "qr_pay" },
  { label: "Bank Transfer", value: "bank_transfer" },
];

interface LineItem {
  type: string;
  name: string;
  price: string;
  quantity: string;
}

export default function NewTransactionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { type: "product", name: "", price: "", quantity: "1" },
  ]);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [voucherCode, setVoucherCode] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: members, isLoading: isLoadingMembers } = useStaffMembers(tenantId);

  const trimmedCode = voucherCode.trim().toUpperCase();
  const { data: voucherValidation } = useValidateVoucher(
    tenantId,
    trimmedCode.length >= 3 ? { code: trimmedCode } : undefined,
  );

  const createTransaction = useCreatePosTransaction(tenantId ?? "");

  const customerOptions = useMemo(() => {
    if (!members) return [];
    return members.map((m) => ({
      label: `${m.name} (${m.email})`,
      value: m.userId ?? m.id,
    }));
  }, [members]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { type: "product", name: "", price: "", quantity: "1" },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback(
    (index: number, field: keyof LineItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const { subtotal, discount, total } = useMemo(() => {
    let sub = 0;
    for (const item of items) {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity, 10) || 0;
      sub += Math.round(price * 100) * qty;
    }

    let disc = 0;
    if (voucherValidation?.valid && voucherValidation.voucher) {
      const v = voucherValidation.voucher;
      if (v.type === "percentage") {
        disc = Math.round((sub * v.value) / 100);
      } else if (v.type === "fixed") {
        disc = v.value;
      }
    }

    return {
      subtotal: sub,
      discount: disc,
      total: Math.max(0, sub - disc),
    };
  }, [items, voucherValidation]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCustomerId) {
      Alert.alert("Error", "Please select a customer.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.name.trim() &&
        parseFloat(item.price) > 0 &&
        parseInt(item.quantity, 10) > 0,
    );

    if (validItems.length === 0) {
      Alert.alert(
        "Error",
        "Please add at least one item with a valid name, price, and quantity.",
      );
      return;
    }

    const formattedItems = validItems.map((item) => ({
      type: item.type,
      referenceId: selectedCustomerId,
      name: item.name.trim(),
      price: Math.round(parseFloat(item.price) * 100),
      quantity: parseInt(item.quantity, 10),
    }));

    setIsSubmitting(true);
    try {
      const result = await createTransaction.mutateAsync({
        customerEmail: undefined,
        items: formattedItems,
        paymentMethod,
        voucherId:
          voucherValidation?.valid && voucherValidation.voucher
            ? voucherValidation.voucher.id
            : undefined,
        discount: discount > 0 ? discount : undefined,
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        "Transaction Complete",
        `Receipt: ${result.receiptNumber ?? "N/A"}\nTotal: RM ${(total / 100).toFixed(2)}`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create transaction",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedCustomerId,
    items,
    paymentMethod,
    voucherValidation,
    discount,
    total,
    notes,
    createTransaction,
    router,
  ]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="New Transaction" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoadingMembers) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="New Transaction" onBack={() => router.back()} />
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Card>
          <View className="mb-2 flex-row items-center">
            <User size={16} color={theme.colors.primary} />
            <Text
              className="ml-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Customer
            </Text>
          </View>
          <Select
            options={customerOptions}
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            placeholder="Select a customer..."
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <ShoppingBag size={16} color={theme.colors.primary} />
              <Text
                className="ml-2 text-sm font-semibold uppercase tracking-wide"
                style={{ color: theme.colors.textSecondary }}
              >
                Items
              </Text>
            </View>
            <TouchableOpacity onPress={addItem}>
              <View
                className="flex-row items-center rounded-full px-3 py-1"
                style={{ backgroundColor: theme.colors.primary + "15" }}
              >
                <Plus size={14} color={theme.colors.primary} />
                <Text
                  className="ml-1 text-xs font-semibold"
                  style={{ color: theme.colors.primary }}
                >
                  Add
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index}>
              {index > 0 && <Separator className="my-3" />}
              <View className="mb-2 flex-row items-center justify-between">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.colors.textSecondary }}
                >
                  Item {index + 1}
                </Text>
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(index)}>
                    <Trash2 size={16} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>
              <Select
                options={ITEM_TYPES}
                value={item.type}
                onChange={(v) => updateItem(index, "type", v)}
                placeholder="Select type..."
              />
              <Spacer size={8} />
              <TextInput
                className="rounded-xl px-3 py-2.5 text-base"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                }}
                placeholder="Item name"
                placeholderTextColor={theme.colors.textSecondary}
                value={item.name}
                onChangeText={(v) => updateItem(index, "name", v)}
              />
              <View className="mt-2 flex-row" style={{ gap: 8 }}>
                <View className="flex-1">
                  <Text
                    className="mb-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Price (RM)
                  </Text>
                  <TextInput
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={item.price}
                    onChangeText={(v) => updateItem(index, "price", v)}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="mb-1 text-xs"
                    style={{ color: theme.colors.textSecondary }}
                  >
                    Quantity
                  </Text>
                  <TextInput
                    className="rounded-xl px-3 py-2 text-sm"
                    style={{
                      backgroundColor: theme.colors.background,
                      color: theme.colors.text,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                    placeholder="1"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={item.quantity}
                    onChangeText={(v) => updateItem(index, "quantity", v)}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>

        <Spacer size={12} />

        <Card>
          <Text
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Payment Method
          </Text>
          <RadioGroup
            options={PAYMENT_METHODS}
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <View className="mb-2 flex-row items-center">
            <Tag size={16} color={theme.colors.info} />
            <Text
              className="ml-2 text-sm font-semibold uppercase tracking-wide"
              style={{ color: theme.colors.textSecondary }}
            >
              Voucher Code (Optional)
            </Text>
          </View>
          <TextInput
            className="rounded-xl px-3 py-2.5 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor:
                voucherValidation?.valid
                  ? theme.colors.success
                  : voucherValidation && !voucherValidation.valid
                    ? theme.colors.error
                    : theme.colors.border,
            }}
            placeholder="Enter voucher code"
            placeholderTextColor={theme.colors.textSecondary}
            value={voucherCode}
            onChangeText={setVoucherCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {voucherValidation?.valid && voucherValidation.voucher && (
            <Text
              className="mt-1 text-xs"
              style={{ color: theme.colors.success }}
            >
              Voucher applied:{" "}
              {voucherValidation.voucher.type === "percentage"
                ? `${voucherValidation.voucher.value}% off`
                : voucherValidation.voucher.type === "fixed"
                  ? `RM ${(voucherValidation.voucher.value / 100).toFixed(2)} off`
                  : "Free session"}
            </Text>
          )}
          {voucherValidation && !voucherValidation.valid && (
            <Text
              className="mt-1 text-xs"
              style={{ color: theme.colors.error }}
            >
              {voucherValidation.reason}
            </Text>
          )}
        </Card>

        <Spacer size={12} />

        <Card>
          <Text
            className="mb-2 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Notes (Optional)
          </Text>
          <TextInput
            className="rounded-xl px-3 py-3 text-base"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderWidth: 1,
              borderColor: theme.colors.border,
              minHeight: 80,
              textAlignVertical: "top",
            }}
            placeholder="Transaction notes..."
            placeholderTextColor={theme.colors.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </Card>

        <Spacer size={12} />

        <Card>
          <Text
            className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: theme.colors.textSecondary }}
          >
            Summary
          </Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm" style={{ color: theme.colors.text }}>
              Subtotal
            </Text>
            <Text className="text-sm" style={{ color: theme.colors.text }}>
              RM {(subtotal / 100).toFixed(2)}
            </Text>
          </View>
          {discount > 0 && (
            <View className="mt-1 flex-row items-center justify-between">
              <Text
                className="text-sm"
                style={{ color: theme.colors.success }}
              >
                Discount
              </Text>
              <Text
                className="text-sm"
                style={{ color: theme.colors.success }}
              >
                -RM {(discount / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <Separator className="my-2" />
          <View className="flex-row items-center justify-between">
            <Text
              className="text-lg font-bold"
              style={{ color: theme.colors.text }}
            >
              Total
            </Text>
            <Text
              className="text-lg font-bold"
              style={{ color: theme.colors.primary }}
            >
              RM {(total / 100).toFixed(2)}
            </Text>
          </View>
        </Card>

        <Spacer size={24} />

        <Button size="lg" onPress={handleSubmit} loading={isSubmitting}>
          <View className="flex-row items-center">
            <Save size={18} color={theme.dark ? "#0B0B0F" : "#FFFFFF"} />
            <Text
              className="ml-2 text-base font-semibold"
              style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
            >
              Complete Transaction
            </Text>
          </View>
        </Button>

        <Spacer size={40} />
      </ScrollView>
    </Screen>
  );
}
