import React, { useState, useMemo, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { Plus } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  SearchInput,
  Switch,
  Card,
  Modal,
  Input,
  Button,
  Badge,
  Row,
  Spacer,
  LoadingScreen,
  EmptyState,
  PriceDisplay,
  Toast,
  useTheme,
} from "@timeo/ui";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
};

export default function ProductsScreen() {
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const tenantId = activeTenantId as string;

  const products = useQuery(
    api.products.list,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const toggleActive = useMutation(api.products.toggleActive);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [products, search]);

  const handleToggleActive = useCallback(
    async (productId: string) => {
      try {
        await toggleActive({ productId: productId as any });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to toggle product";
        setToast({ message, type: "error", visible: true });
      }
    },
    [toggleActive]
  );

  const openCreateModal = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingProduct(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback(
    (product: NonNullable<typeof products>[0]) => {
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price / 100),
        imageUrl: product.imageUrl ?? "",
      });
      setEditingProduct(product._id);
      setShowModal(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setToast({
        message: "Product name is required",
        type: "error",
        visible: true,
      });
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setToast({
        message: "Price must be a valid number",
        type: "error",
        visible: true,
      });
      return;
    }

    setSaving(true);
    try {
      if (editingProduct) {
        await updateProduct({
          productId: editingProduct as any,
          name: form.name.trim(),
          description: form.description.trim(),
          price: Math.round(price * 100),
          imageUrl: form.imageUrl.trim() || undefined,
        });
        setToast({
          message: "Product updated successfully",
          type: "success",
          visible: true,
        });
      } else {
        await createProduct({
          tenantId: tenantId as any,
          name: form.name.trim(),
          description: form.description.trim(),
          price: Math.round(price * 100),
          imageUrl: form.imageUrl.trim() || undefined,
        });
        setToast({
          message: "Product created successfully",
          type: "success",
          visible: true,
        });
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingProduct(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save product";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [form, editingProduct, tenantId, createProduct, updateProduct]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Products" />
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

  if (products === undefined) {
    return <LoadingScreen message="Loading products..." />;
  }

  const renderProduct = ({
    item,
  }: {
    item: NonNullable<typeof products>[0];
  }) => (
    <Card
      className="mb-3"
      onPress={() => openEditModal(item)}
    >
      <Row justify="between" align="start">
        <View className="flex-1 mr-3">
          <Row align="center" gap={8}>
            <Text
              className="text-base font-semibold"
              style={{ color: theme.colors.text }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {!item.isActive && (
              <Badge label="Inactive" variant="error" />
            )}
          </Row>
          {item.description ? (
            <Text
              className="mt-1 text-sm"
              style={{ color: theme.colors.textSecondary }}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}
          <View className="mt-2">
            <PriceDisplay
              amount={item.price}
              currency={item.currency}
              size="sm"
            />
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item._id)}
        />
      </Row>
    </Card>
  );

  return (
    <Screen>
      <Header
        title="Products"
        rightActions={
          <TouchableOpacity
            onPress={openCreateModal}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.primary }}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <View className="px-4">
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
        />
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item._id}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No products found"
            description={
              search
                ? "Try a different search term."
                : "Add your first product to start selling."
            }
            action={
              !search
                ? {
                    label: "Add Product",
                    onPress: openCreateModal,
                  }
                : undefined
            }
          />
        }
      />

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setForm(EMPTY_FORM);
          setEditingProduct(null);
        }}
        title={editingProduct ? "Edit Product" : "New Product"}
      >
        <Input
          label="Product Name"
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          placeholder="e.g., Shampoo, T-Shirt"
          className="mb-4"
        />
        <Input
          label="Description"
          value={form.description}
          onChangeText={(text) =>
            setForm((f) => ({ ...f, description: text }))
          }
          placeholder="Brief description of the product"
          multiline
          numberOfLines={3}
          className="mb-4"
        />
        <Input
          label="Price (RM)"
          value={form.price}
          onChangeText={(text) => setForm((f) => ({ ...f, price: text }))}
          placeholder="25.00"
          keyboardType="decimal-pad"
          className="mb-4"
        />
        <Input
          label="Image URL (optional)"
          value={form.imageUrl}
          onChangeText={(text) =>
            setForm((f) => ({ ...f, imageUrl: text }))
          }
          placeholder="https://example.com/image.jpg"
          autoCapitalize="none"
          keyboardType="url"
          className="mb-4"
        />
        <Spacer size={8} />
        <Button onPress={handleSave} loading={saving}>
          {editingProduct ? "Update Product" : "Create Product"}
        </Button>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </Screen>
  );
}
