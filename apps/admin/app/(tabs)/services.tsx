import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
import { formatPrice } from "@timeo/shared";
import { api } from "@timeo/api";
import { useQuery, useMutation } from "convex/react";

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

export default function ServicesScreen() {
  const theme = useTheme();
  const { activeTenantId } = useTimeoAuth();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
    visible: boolean;
  }>({ message: "", type: "success", visible: false });

  const tenantId = activeTenantId as string;

  const services = useQuery(
    api.services.list,
    tenantId ? { tenantId: tenantId as any } : "skip"
  );

  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const toggleActive = useMutation(api.services.toggleActive);

  const filteredServices = useMemo(() => {
    if (!services) return [];
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }, [services, search]);

  const handleToggleActive = useCallback(
    async (serviceId: string) => {
      try {
        await toggleActive({ serviceId: serviceId as any });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to toggle service";
        setToast({ message, type: "error", visible: true });
      }
    },
    [toggleActive]
  );

  const openCreateModal = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingService(null);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback(
    (service: NonNullable<typeof services>[0]) => {
      setForm({
        name: service.name,
        description: service.description,
        durationMinutes: String(service.durationMinutes),
        price: String(service.price / 100),
      });
      setEditingService(service._id);
      setShowModal(true);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      setToast({
        message: "Service name is required",
        type: "error",
        visible: true,
      });
      return;
    }

    const duration = parseInt(form.durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      setToast({
        message: "Duration must be a positive number",
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
      if (editingService) {
        await updateService({
          serviceId: editingService as any,
          name: form.name.trim(),
          description: form.description.trim(),
          durationMinutes: duration,
          price: Math.round(price * 100),
        });
        setToast({
          message: "Service updated successfully",
          type: "success",
          visible: true,
        });
      } else {
        await createService({
          tenantId: tenantId as any,
          name: form.name.trim(),
          description: form.description.trim(),
          durationMinutes: duration,
          price: Math.round(price * 100),
        });
        setToast({
          message: "Service created successfully",
          type: "success",
          visible: true,
        });
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingService(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save service";
      setToast({ message, type: "error", visible: true });
    } finally {
      setSaving(false);
    }
  }, [form, editingService, tenantId, createService, updateService]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Services" />
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

  if (services === undefined) {
    return <LoadingScreen message="Loading services..." />;
  }

  const renderService = ({
    item,
  }: {
    item: NonNullable<typeof services>[0];
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
          <Row align="center" gap={12} className="mt-2">
            <Text
              className="text-sm font-medium"
              style={{ color: theme.colors.primary }}
            >
              {item.durationMinutes} min
            </Text>
            <PriceDisplay
              amount={item.price}
              currency={item.currency}
              size="sm"
            />
          </Row>
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
        title="Services"
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
          placeholder="Search services..."
        />
        <Spacer size={12} />
      </View>
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item._id}
        renderItem={renderService}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="No services found"
            description={
              search
                ? "Try a different search term."
                : "Create your first service to start accepting bookings."
            }
            action={
              !search
                ? {
                    label: "Create Service",
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
          setEditingService(null);
        }}
        title={editingService ? "Edit Service" : "New Service"}
      >
        <Input
          label="Service Name"
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          placeholder="e.g., Haircut, Massage"
          className="mb-4"
        />
        <Input
          label="Description"
          value={form.description}
          onChangeText={(text) =>
            setForm((f) => ({ ...f, description: text }))
          }
          placeholder="Brief description of the service"
          multiline
          numberOfLines={3}
          className="mb-4"
        />
        <Row gap={12}>
          <View className="flex-1">
            <Input
              label="Duration (min)"
              value={form.durationMinutes}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, durationMinutes: text }))
              }
              placeholder="60"
              keyboardType="number-pad"
            />
          </View>
          <View className="flex-1">
            <Input
              label="Price (RM)"
              value={form.price}
              onChangeText={(text) =>
                setForm((f) => ({ ...f, price: text }))
              }
              placeholder="50.00"
              keyboardType="decimal-pad"
            />
          </View>
        </Row>
        <Spacer size={20} />
        <Button onPress={handleSave} loading={saving}>
          {editingService ? "Update Service" : "Create Service"}
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
