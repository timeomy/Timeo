import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { Briefcase } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  useServices,
  useCreateService,
  useUpdateService,
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

interface ServiceFormData {
  name: string;
  description: string;
  durationMinutes: string;
  price: string;
}

const EMPTY_FORM: ServiceFormData = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
};

export default function AdminServicesScreen() {
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const { data: services, isLoading, refetch, isRefetching } = useServices(tenantId);
  const createService = useCreateService(tenantId ?? "");
  const updateService = useUpdateService(tenantId ?? "");

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)),
    );
  }, [services, search]);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEdit = useCallback(
    (service: NonNullable<typeof services>[0]) => {
      setEditingId(service.id);
      setForm({
        name: service.name,
        description: service.description ?? "",
        durationMinutes: String(service.durationMinutes),
        price: String(service.price / 100),
      });
      setShowModal(true);
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      Alert.alert("Required", "Service name is required.");
      return;
    }
    const duration = parseInt(form.durationMinutes, 10);
    if (!duration || duration <= 0) {
      Alert.alert("Required", "Duration must be a positive number.");
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
        durationMinutes: duration,
        price: Math.round(priceRM * 100),
      };

      if (editingId) {
        await updateService.mutateAsync({ id: editingId, ...data });
        setToast({ message: "Service updated", type: "success", visible: true });
      } else {
        await createService.mutateAsync(data);
        setToast({ message: "Service created", type: "success", visible: true });
      }
      setShowModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save service";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [form, editingId, createService, updateService]);

  const handleToggleActive = useCallback(
    async (service: NonNullable<typeof services>[0]) => {
      try {
        await updateService.mutateAsync({
          id: service.id,
          isActive: !service.isActive,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to toggle service";
        setToast({ message, type: "error", visible: true });
      }
    },
    [updateService],
  );

  if (!tenantId) {
    return (
      <Screen scroll>
        <EmptyState title="No organization selected" description="Please select an organization." />
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading services..." />;
  }

  return (
    <Screen padded={false}>
      <Header title="Services" />

      <View className="px-4 pb-3">
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search services..." />
      </View>

      <View className="px-4 pb-3">
        <Button onPress={openCreate}>Add Service</Button>
      </View>

      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 10 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
        ListEmptyComponent={
          <EmptyState
            title="No services"
            description="Create your first service to get started."
            icon={<Briefcase size={32} color={theme.colors.textSecondary} />}
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
                <View className="mt-2 flex-row items-center" style={{ gap: 8 }}>
                  <PriceDisplay amount={item.price} currency={item.currency} size="sm" />
                  <Text className="text-xs" style={{ color: theme.colors.textSecondary }}>
                    {item.durationMinutes} min
                  </Text>
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
        title={editingId ? "Edit Service" : "New Service"}
      >
        <View style={{ marginBottom: 12 }}>
          <Input
            label="Service Name"
            value={form.name}
            onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
            placeholder="e.g. Haircut"
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
        <View className="flex-row" style={{ gap: 8, marginBottom: 12 }}>
          <View className="flex-1">
            <Input
              label="Duration (min)"
              value={form.durationMinutes}
              onChangeText={(text) => setForm((f) => ({ ...f, durationMinutes: text }))}
              placeholder="60"
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Price (RM)"
              value={form.price}
              onChangeText={(text) => setForm((f) => ({ ...f, price: text }))}
              placeholder="50.00"
              keyboardType="decimal-pad"
            />
          </View>
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
