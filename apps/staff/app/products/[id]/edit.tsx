import { useState, useEffect, useCallback } from "react";
import { ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@timeo/api";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Input,
  Button,
  Switch,
  Spacer,
  LoadingScreen,
} from "@timeo/ui";
import type { Id } from "@timeo/api";

export default function ProductEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as Id<"tenants"> | null;

  const isNew = id === "new";
  const productId = isNew ? null : (id as Id<"products">);

  const existingProduct = useQuery(
    api.products.getById,
    productId ? { productId } : "skip"
  );

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(isNew);

  // Populate form with existing data
  useEffect(() => {
    if (existingProduct && !initialized) {
      setName(existingProduct.name);
      setDescription(existingProduct.description);
      setPrice((existingProduct.price / 100).toFixed(2));
      setIsActive(existingProduct.isActive);
      setInitialized(true);
    }
  }, [existingProduct, initialized]);

  const validate = useCallback((): string | null => {
    if (!name.trim()) return "Product name is required.";
    if (!price.trim()) return "Price is required.";
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return "Please enter a valid price.";
    return null;
  }, [name, price]);

  const handleSave = useCallback(async () => {
    const error = validate();
    if (error) {
      Alert.alert("Validation Error", error);
      return;
    }

    if (!tenantId) {
      Alert.alert("Error", "No organization selected.");
      return;
    }

    setSaving(true);
    try {
      const priceInCents = Math.round(parseFloat(price) * 100);

      if (isNew) {
        await createProduct({
          tenantId,
          name: name.trim(),
          description: description.trim(),
          price: priceInCents,
        });
      } else if (productId) {
        await updateProduct({
          productId,
          name: name.trim(),
          description: description.trim(),
          price: priceInCents,
        });
      }

      router.back();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save product"
      );
    } finally {
      setSaving(false);
    }
  }, [
    validate,
    tenantId,
    isNew,
    name,
    description,
    price,
    createProduct,
    updateProduct,
    productId,
    router,
  ]);

  // Loading state for existing product
  if (!isNew && existingProduct === undefined) {
    return <LoadingScreen message="Loading product..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title={isNew ? "New Product" : "Edit Product"}
        onBack={() => router.back()}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Spacer size={8} />

          <Input
            label="Product Name"
            placeholder="Enter product name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Spacer size={16} />

          <Input
            label="Description"
            placeholder="Enter product description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Spacer size={16} />

          <Input
            label="Price (RM)"
            placeholder="0.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />

          <Spacer size={20} />

          <Switch
            label="Active"
            value={isActive}
            onValueChange={setIsActive}
          />

          <Spacer size={32} />

          <Button onPress={handleSave} loading={saving}>
            {isNew ? "Create Product" : "Save Changes"}
          </Button>

          <Spacer size={16} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
