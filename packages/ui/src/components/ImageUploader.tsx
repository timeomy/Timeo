import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImagePlus, X } from "lucide-react-native";
import { useTheme } from "../theme";

export interface ImageUploaderProps {
  onUpload: (storageId: string, url: string) => void;
  generateUploadUrl: () => Promise<string>;
  currentImageUrl?: string | null;
  type?:
    | "product_image"
    | "service_image"
    | "avatar"
    | "logo"
    | "document";
  maxSizeMB?: number;
  aspect?: [number, number];
  onRemove?: () => void;
  label?: string;
  circular?: boolean;
  size?: number;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  onUpload,
  generateUploadUrl,
  currentImageUrl,
  maxSizeMB = 10,
  aspect,
  onRemove,
  label = "Upload Image",
  circular = false,
  size = 160,
}: ImageUploaderProps) {
  const theme = useTheme();
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const displayUrl = previewUri || currentImageUrl;

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please grant photo library access to upload images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspect,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const fileSize = asset.fileSize ?? 0;

    if (fileSize > maxSizeMB * 1024 * 1024) {
      Alert.alert(
        "File Too Large",
        `Maximum file size is ${maxSizeMB}MB. Please choose a smaller image.`
      );
      return;
    }

    setPreviewUri(asset.uri);
    await uploadFile(asset.uri, asset.mimeType ?? "image/jpeg", fileSize);
  }, [aspect, maxSizeMB, generateUploadUrl, onUpload]);

  const uploadFile = useCallback(
    async (uri: string, mimeType: string, _fileSize: number) => {
      if (!ALLOWED_TYPES.includes(mimeType)) {
        Alert.alert(
          "Unsupported Format",
          "Please upload a JPEG, PNG, or WebP image."
        );
        setPreviewUri(null);
        return;
      }

      setUploading(true);
      setProgress(0);

      try {
        setProgress(20);
        const uploadUrl = await generateUploadUrl();

        setProgress(40);
        const response = await fetch(uri);
        const blob = await response.blob();

        setProgress(60);
        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });

        setProgress(80);
        const { storageId } = await uploadResponse.json();

        setProgress(100);
        onUpload(storageId, uri);
      } catch (err) {
        Alert.alert(
          "Upload Failed",
          err instanceof Error ? err.message : "Failed to upload image"
        );
        setPreviewUri(null);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [generateUploadUrl, onUpload]
  );

  const handleRemove = useCallback(() => {
    setPreviewUri(null);
    onRemove?.();
  }, [onRemove]);

  return (
    <View>
      {label ? (
        <Text
          className="mb-2 text-sm font-medium"
          style={{ color: theme.colors.text }}
        >
          {label}
        </Text>
      ) : null}

      {displayUrl ? (
        <View style={{ width: size, height: size }}>
          <Image
            source={{ uri: displayUrl }}
            style={{
              width: size,
              height: size,
              borderRadius: circular ? size / 2 : 12,
            }}
            resizeMode="cover"
          />
          {uploading ? (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                borderRadius: circular ? size / 2 : 12,
              }}
            >
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="mt-1 text-xs font-medium text-white">
                {progress}%
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleRemove}
              className="absolute right-1 top-1 rounded-full p-1"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <X size={14} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={pickImage}
          disabled={uploading}
          className="items-center justify-center border border-dashed"
          style={{
            width: size,
            height: size,
            borderRadius: circular ? size / 2 : 12,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
          activeOpacity={0.7}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                className="mt-2 text-xs"
                style={{ color: theme.colors.textSecondary }}
              >
                Uploading...
              </Text>
            </>
          ) : (
            <>
              <ImagePlus size={28} color={theme.colors.textSecondary} />
              <Text
                className="mt-2 text-xs text-center"
                style={{ color: theme.colors.textSecondary }}
              >
                Tap to upload
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
