import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Package } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
} from "@timeo/api-client";
import {
  Screen,
  Header,
  SearchInput,
  Button,
  Input,
  Badge,
  PriceDisplay,
  Modal,
  EmptyState,
  LoadingScreen,
  Toast,
  useTheme,
} from "@timeo/ui";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
}

const EMPTY_FORM: ProductFormData = {
  name: "",
  description: "",
  price: "",
};

export default function AdminProductsScreen() {
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const { data: products, isLoading, refetch, isRefetching } = useProducts(tenantId);
  const createProduct = useCreateProduct(tenantId ?? "");
  const updateProduct = useUpdateProduct(tenantId ?? "");

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)),
    );
  }, [products, search]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback(
    (product: NonNullable<typeof products>[0]) => {
      setEditingId(product.id);
      setForm({
        name: product.name,
        description: product.description ?? "",
        price: String(product.price / 100),
      });
      setShowModal(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      Alert.alert("Required", "Product name is required.");
      return;
    }
    const priceRM = parseFloat(form.price);
    if (isNaN(priceRM) || priceRM < 0) {
      Alert.alert("Required", "Price must be a valid number.");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: trimmedName,
        description: form.description.trim() || undefined,
        price: Math.round(priceRM * 100),
      };

      if (editingId) {
        await updateProduct.mutateAsync({ id: editingId, ...data });
        setToast({ message: "Product updated", type: "success", visible: true });
      } else {
        await createProduct.mutateAsync(data);
        setToast({ message: "Product created", type: "success", visible: true });
      }
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save product";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, createProduct, updateProduct]);

  const handleToggleActive = useCallback(
    async (product: NonNullable<typeof products>[0]) => {
      try {
        await updateProduct.mutateAsync({
          id: product.id,
          isActive: !product.isActive,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to toggle product";
        setToast({ message, type: "error", visible: true });
      }
    },
    [updateProduct],
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading products..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Products" />

      <View className="px-4 pb-3">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search products..." />
      </View>

      <View className="px-4 pb-3">
        <Button onPress={openCreate}>Add Product</Button>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No products"
            description="Create your first product to get started."
            icon={<Package size={32} color={theme.colors.textSecondary} />}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => openEdit(item)}
            onLongPress={() => handleToggleActive(item)}
            activeOpacity={0.7}
            className="rounded-2xl p-4"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.colors.text }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.description ? (
                  <Text
                    className="mt-0.5 text-sm"
                    style={{ color: theme.colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}
                <View className="mt-2">
                  <PriceDisplay amount={item.price} currency={item.currency} size="sm" />
                </View>
              </View>
              <Badge
                variant={item.isActive ? "success" : "default"}
                label={item.isActive ? "Active" : "Inactive"}
              />
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Product" : "New Product"}
      >
        <View style={{ marginBottom: 12 }}>
          <Input
            label="Product Name"
            value={form.name}
            onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
            placeholder="e.g. Protein Shake"
          />
        </View>
        <View style={{ marginBottom: 12 }}>
          <Input
            label="Description"
            value={form.description}
            onChangeText={(text) => setForm((f) => ({ ...f, description: text }))}
            placeholder="Optional description"
          />
        </View>
        <View style={{ marginBottom: 16 }}>
          <Input
            label="Price (RM)"
            value={form.price}
            onChangeText={(text) => setForm((f) => ({ ...f, price: text }))}
            placeholder="25.00"
            keyboardType="decimal-pad"
          />
        </View>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button variant="outline" onPress={() => setShowModal(false)}>
              Cancel
            </Button>
          </View>
          <View className="flex-1">
            <Button onPress={handleSave} loading={saving}>
              {editingId ? "Update" : "Create"}
            </Button>
          </View>
        </View>
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
