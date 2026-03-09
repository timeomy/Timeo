import { useState, useRef, useCallback } from "react";
import { View, Text, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, CameraType } from "expo-camera";
import { ScanFace, Camera, RotateCcw, Check, X } from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import {
  Screen,
  Header,
  Card,
  Button,
  Spacer,
  useTheme,
} from "@timeo/ui";

type RegistrationStatus = "idle" | "capturing" | "preview" | "uploading" | "done" | "error";

export default function FaceRegistrationScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId, user } = useTimeoAuth();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<RegistrationStatus>("idle");
  const [isUploading, setIsUploading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("front");
  const [resultMessage, setResultMessage] = useState("");

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
        exif: false,
      });
      if (photo) {
        setPhotoUri(photo.uri);
        setPhotoBase64(photo.base64 ?? null);
        setStatus("preview");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  }, []);

  const handleRetake = useCallback(() => {
    setPhotoUri(null);
    setPhotoBase64(null);
    setStatus("capturing");
  }, []);

  const handleUpload = useCallback(async () => {
    if (!activeTenantId || !user?.id || !photoBase64) return;

    setIsUploading(true);

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
      const response = await fetch(
        `${apiUrl}/api/tenants/${activeTenantId}/access-control/face-register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            faceImage: photoBase64,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        const devices = data.data?.devices ?? [];
        const syncedCount = devices.filter(
          (d: { status: string }) => d.status === "synced",
        ).length;
        const pendingCount = devices.filter(
          (d: { status: string }) => d.status === "pending",
        ).length;

        setStatus("done");
        if (syncedCount > 0) {
          setResultMessage(
            `Face registered on ${syncedCount} device(s).${pendingCount > 0 ? ` ${pendingCount} pending sync.` : ""}`,
          );
        } else if (pendingCount > 0) {
          setResultMessage(
            `Registration queued for ${pendingCount} device(s). Will sync when devices come online.`,
          );
        } else {
          setResultMessage("Registration submitted.");
        }
      } else {
        setStatus("error");
        setResultMessage(data.error?.message ?? "Registration failed.");
      }
    } catch (err) {
      setStatus("error");
      setResultMessage(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }, [activeTenantId, user, photoBase64]);

  // ── No tenant selected ──────────────────────────────────────────────────
  if (!activeTenantId) {
    return (
      <Screen>
        <Header title="Face Registration" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6">
          <ScanFace size={48} color={theme.colors.textSecondary} />
          <Spacer size={12} />
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            No organization selected. Please select an organization first.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Camera permission not granted ───────────────────────────────────────
  if (!permission?.granted) {
    return (
      <Screen>
        <Header title="Face Registration" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6">
          <Camera size={48} color={theme.colors.textSecondary} />
          <Spacer size={12} />
          <Text
            className="mb-4 text-center text-base"
            style={{ color: theme.colors.text }}
          >
            Camera access is needed to register your face for turnstile entry.
          </Text>
          <Button onPress={requestPermission}>Grant Camera Access</Button>
        </View>
      </Screen>
    );
  }

  // ── Result screen (done or error) ──────────────────────────────────────
  if (status === "done" || status === "error") {
    return (
      <Screen>
        <Header title="Face Registration" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6">
          {status === "done" ? (
            <View
              className="rounded-full p-4"
              style={{ backgroundColor: theme.colors.success + "20" }}
            >
              <Check size={48} color={theme.colors.success} />
            </View>
          ) : (
            <View
              className="rounded-full p-4"
              style={{ backgroundColor: theme.colors.error + "20" }}
            >
              <X size={48} color={theme.colors.error} />
            </View>
          )}
          <Spacer size={16} />
          <Text
            className="text-center text-lg font-semibold"
            style={{
              color: status === "done" ? theme.colors.success : theme.colors.error,
            }}
          >
            {status === "done" ? "Registration Complete" : "Registration Failed"}
          </Text>
          <Spacer size={8} />
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            {resultMessage}
          </Text>
          <Spacer size={24} />
          <Button onPress={() => router.back()}>
            Back to Profile
          </Button>
          {status === "error" && (
            <>
              <Spacer size={8} />
              <Button
                variant="outline"
                onPress={() => {
                  setStatus("capturing");
                  setPhotoUri(null);
                  setPhotoBase64(null);
                }}
              >
                Try Again
              </Button>
            </>
          )}
        </View>
      </Screen>
    );
  }

  // ── Preview screen ─────────────────────────────────────────────────────
  if (status === "preview" && photoUri) {
    return (
      <Screen>
        <Header title="Confirm Photo" onBack={handleRetake} />
        <View className="flex-1">
          <Image
            source={{ uri: photoUri }}
            className="flex-1"
            resizeMode="cover"
          />
          <View className="absolute bottom-0 left-0 right-0 p-6">
            <Card>
              <Text
                className="mb-3 text-center text-base"
                style={{ color: theme.colors.text }}
              >
                Is this photo clear and your face is fully visible?
              </Text>
              <Button onPress={handleUpload} loading={isUploading}>
                Confirm & Register
              </Button>
              <Spacer size={8} />
              <Button variant="outline" onPress={handleRetake}>
                <RotateCcw size={16} color={theme.colors.text} />
                {" Retake"}
              </Button>
            </Card>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Uploading screen ───────────────────────────────────────────────────
  if (status === "uploading") {
    return (
      <Screen>
        <Header title="Registering..." />
        <View className="flex-1 items-center justify-center px-6">
          <ScanFace size={48} color={theme.colors.primary} />
          <Spacer size={16} />
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.text }}
          >
            Registering your face with the turnstile...
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            This may take a few seconds.
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Camera / idle screen ───────────────────────────────────────────────
  return (
    <Screen>
      <Header title="Face Registration" onBack={() => router.back()} />

      {status === "idle" ? (
        <View className="flex-1 items-center justify-center px-6">
          <ScanFace size={64} color={theme.colors.primary} />
          <Spacer size={16} />
          <Text
            className="text-center text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Register Your Face
          </Text>
          <Spacer size={8} />
          <Text
            className="text-center text-base"
            style={{ color: theme.colors.textSecondary }}
          >
            Take a clear selfie so the gym turnstile can recognize you. Make
            sure your face is well-lit and centered.
          </Text>
          <Spacer size={32} />
          <Button onPress={() => setStatus("capturing")}>
            Open Camera
          </Button>
        </View>
      ) : (
        <View className="flex-1">
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
          >
            {/* Overlay guide */}
            <View className="flex-1 items-center justify-center">
              <View
                className="h-64 w-64 rounded-full border-4"
                style={{ borderColor: theme.colors.primary + "80" }}
              />
              <Text
                className="mt-4 text-center text-base font-medium"
                style={{ color: "#fff" }}
              >
                Position your face in the circle
              </Text>
            </View>

            {/* Capture button */}
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center pb-10">
              <Button
                onPress={() =>
                  setFacing(facing === "front" ? "back" : "front")
                }
                variant="outline"
                className="mr-4"
              >
                <RotateCcw size={20} color="#fff" />
              </Button>

              <Button onPress={handleCapture} className="h-16 w-16 rounded-full">
                <Camera size={28} color="#fff" />
              </Button>
            </View>
          </CameraView>
        </View>
      )}
    </Screen>
  );
}
