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
  ImageUploader,
} from "@timeo/ui";
export default function ServiceEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as any | null;

  const isNew = id === "new";
  const serviceId = isNew ? null : (id as any);

  const existingService = useQuery(
    api.services.getById,
    serviceId ? { serviceId } : "skip"
  );

  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateEntityImage = useMutation(api.files.updateEntityImage);
  const saveFile = useMutation(api.files.saveFile);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(isNew);

  // Populate form with existing data
  useEffect(() => {
    if (existingService && !initialized) {
      setName(existingService.name);
      setDescription(existingService.description);
      setDuration(String(existingService.durationMinutes));
      setPrice((existingService.price / 100).toFixed(2));
      setIsActive(existingService.isActive);
      setImageUrl((existingService as any).imageUrl ?? null);
      setInitialized(true);
    }
  }, [existingService, initialized]);

  const handleImageUpload = useCallback(
    async (storageId: string) => {
      if (!serviceId || isNew) return;
      try {
        await saveFile({
          tenantId: tenantId ?? undefined,
          filename: "service-image",
          mimeType: "image/jpeg",
          size: 0,
          type: "service_image",
          entityId: serviceId,
          storageId,
        });
        await updateEntityImage({
          entityType: "service",
          entityId: serviceId,
          storageId,
        });
      } catch {
        Alert.alert("Error", "Failed to save image.");
      }
    },
    [serviceId, isNew, tenantId, saveFile, updateEntityImage]
  );

  const validate = useCallback((): string | null => {
    if (!name.trim()) return "Service name is required.";
    if (!duration.trim()) return "Duration is required.";
    const durationNum = parseInt(duration, 10);
    if (isNaN(durationNum) || durationNum < 1)
      return "Please enter a valid duration (in minutes).";
    if (!price.trim()) return "Price is required.";
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) return "Please enter a valid price.";
    return null;
  }, [name, duration, price]);

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
      const durationMinutes = parseInt(duration, 10);

      if (isNew) {
        await createService({
          tenantId,
          name: name.trim(),
          description: description.trim(),
          durationMinutes,
          price: priceInCents,
        });
      } else if (serviceId) {
        await updateService({
          serviceId,
          name: name.trim(),
          description: description.trim(),
          durationMinutes,
          price: priceInCents,
        });
      }

      router.back();
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to save service"
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
    duration,
    price,
    createService,
    updateService,
    serviceId,
    router,
  ]);

  // Loading state for existing service
  if (!isNew && existingService === undefined) {
    return <LoadingScreen message="Loading service..." />;
  }

  return (
    <Screen padded={false}>
      <Header
        title={isNew ? "New Service" : "Edit Service"}
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

          <ImageUploader
            label="Service Image"
            generateUploadUrl={generateUploadUrl}
            currentImageUrl={imageUrl}
            onUpload={(storageId, url) => {
              setImageUrl(url);
              handleImageUpload(storageId);
            }}
            onRemove={() => setImageUrl(null)}
          />

          <Spacer size={16} />

          <Input
            label="Service Name"
            placeholder="Enter service name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Spacer size={16} />

          <Input
            label="Description"
            placeholder="Enter service description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Spacer size={16} />

          <Input
            label="Duration (minutes)"
            placeholder="e.g. 30"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
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
            {isNew ? "Create Service" : "Save Changes"}
          </Button>

          <Spacer size={16} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
