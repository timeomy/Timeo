import { useState, useRef, useCallback } from "react";
import { View, Text, Alert, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  Camera,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useFaceEnrollmentStatus, useSubmitFacePhoto } from "@timeo/api-client";
import {
  Screen,
  Header,
  Card,
  Button,
  LoadingScreen,
  Spacer,
  useTheme,
} from "@timeo/ui";

type EnrollmentState = "not-enrolled" | "enrolling" | "enrolled" | "failed";

export default function FaceEnrollmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [enrollState, setEnrollState] = useState<EnrollmentState>("not-enrolled");
  const cameraRef = useRef<CameraView>(null);

  const { data: faceStatus, isLoading } = useFaceEnrollmentStatus(tenantId);
  const submitPhoto = useSubmitFacePhoto(tenantId ?? "");

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });
      if (photo?.base64) {
        setCapturedPhoto(`data:image/jpeg;base64,${photo.base64}`);
      }
    } catch (err) {
      Alert.alert(
        "Capture Failed",
        err instanceof Error ? err.message : "Could not take photo",
      );
    }
  }, []);

  const handleRetake = useCallback(() => {
    setCapturedPhoto(null);
    setEnrollState("not-enrolled");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!capturedPhoto || !tenantId) return;
    setEnrollState("enrolling");
    try {
      // Extract base64 from data URI
      const base64Data = capturedPhoto.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
      await submitPhoto.mutateAsync({ photoBase64: base64Data });
      setEnrollState("enrolled");
    } catch (err) {
      setEnrollState("failed");
      Alert.alert(
        "Enrollment Failed",
        err instanceof Error
          ? err.message
          : "Could not enroll face. Please try again.",
      );
    }
  }, [capturedPhoto, tenantId, submitPhoto]);

  if (!tenantId) {
    return (
      <Screen>
        <Header title="Face Enrollment" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: theme.colors.textSecondary }}>
            No organization selected.
          </Text>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Loading enrollment status..." />;
  }

  // Already enrolled
  if (faceStatus?.enrolled && enrollState !== "enrolling") {
    return (
      <Screen scroll>
        <Header title="Face Enrollment" onBack={() => router.back()} />
        <Spacer size={40} />
        <View className="items-center px-8">
          <View
            className="h-24 w-24 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle2 size={48} color={theme.colors.success} />
          </View>
          <Spacer size={20} />
          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Face Enrolled
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Your face is registered for turnstile access. You can check in by
            looking at the camera at the entrance.
          </Text>
          {faceStatus.enrolledAt ? (
            <Text
              className="mt-3 text-xs"
              style={{ color: theme.colors.textSecondary }}
            >
              Enrolled on{" "}
              {new Date(faceStatus.enrolledAt).toLocaleDateString("en-MY", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          ) : null}
          <Spacer size={32} />
          <Button
            variant="outline"
            onPress={() => {
              setCapturedPhoto(null);
              setEnrollState("not-enrolled");
            }}
          >
            <View className="flex-row items-center">
              <RefreshCw size={16} color={theme.colors.primary} />
              <Text
                className="ml-2 font-semibold"
                style={{ color: theme.colors.primary }}
              >
                Re-enroll Face
              </Text>
            </View>
          </Button>
        </View>
      </Screen>
    );
  }

  // Camera permission not yet determined
  if (!permission) {
    return (
      <Screen>
        <Header title="Face Enrollment" onBack={() => router.back()} />
      </Screen>
    );
  }

  // Camera permission denied
  if (!permission.granted) {
    return (
      <Screen scroll>
        <Header title="Face Enrollment" onBack={() => router.back()} />
        <Spacer size={40} />
        <View className="items-center px-8">
          <Camera size={48} color={theme.colors.textSecondary} />
          <Spacer size={16} />
          <Text
            className="text-center text-base font-semibold"
            style={{ color: theme.colors.text }}
          >
            Camera Permission Required
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            We need camera access to capture your face photo for check-in
            enrollment.
          </Text>
          <Spacer size={24} />
          <Button onPress={requestPermission}>
            <Text
              className="font-semibold"
              style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
            >
              Grant Camera Access
            </Text>
          </Button>
        </View>
      </Screen>
    );
  }

  // Enrollment success state
  if (enrollState === "enrolled") {
    return (
      <Screen scroll>
        <Header title="Face Enrollment" onBack={() => router.back()} />
        <Spacer size={40} />
        <View className="items-center px-8">
          <View
            className="h-24 w-24 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.colors.success + "15" }}
          >
            <CheckCircle2 size={48} color={theme.colors.success} />
          </View>
          <Spacer size={20} />
          <Text
            className="text-xl font-bold"
            style={{ color: theme.colors.text }}
          >
            Enrollment Complete!
          </Text>
          <Text
            className="mt-2 text-center text-sm"
            style={{ color: theme.colors.textSecondary }}
          >
            Your face has been registered. You can now use face recognition to
            check in at the gym.
          </Text>
          <Spacer size={32} />
          <Button onPress={() => router.back()}>
            <Text
              className="font-semibold"
              style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
            >
              Done
            </Text>
          </Button>
        </View>
      </Screen>
    );
  }

  // Preview captured photo
  if (capturedPhoto) {
    return (
      <Screen scroll>
        <Header title="Face Enrollment" onBack={() => router.back()} />
        <Spacer size={24} />
        <View className="items-center px-4">
          <Card>
            <View className="items-center py-4">
              <View
                className="overflow-hidden rounded-2xl"
                style={{ width: 280, height: 280 }}
              >
                <Image
                  source={{ uri: capturedPhoto }}
                  style={{ width: 280, height: 280 }}
                  resizeMode="cover"
                />
              </View>
              <Spacer size={16} />
              <Text
                className="text-center text-sm"
                style={{ color: theme.colors.textSecondary }}
              >
                Make sure your face is clearly visible and well-lit.
              </Text>
            </View>
          </Card>

          <Spacer size={20} />

          {enrollState === "failed" ? (
            <View className="mb-4 flex-row items-center rounded-xl px-4 py-3"
              style={{ backgroundColor: theme.colors.error + "15" }}
            >
              <XCircle size={16} color={theme.colors.error} />
              <Text
                className="ml-2 flex-1 text-sm"
                style={{ color: theme.colors.error }}
              >
                Enrollment failed. Please try again with a clearer photo.
              </Text>
            </View>
          ) : null}

          <View className="w-full gap-3">
            <Button
              onPress={handleSubmit}
              loading={enrollState === "enrolling"}
            >
              <Text
                className="font-semibold"
                style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
              >
                {enrollState === "enrolling"
                  ? "Enrolling..."
                  : "Submit Photo"}
              </Text>
            </Button>
            <Button
              variant="outline"
              onPress={handleRetake}
              disabled={enrollState === "enrolling"}
            >
              <View className="flex-row items-center">
                <RefreshCw size={16} color={theme.colors.primary} />
                <Text
                  className="ml-2 font-semibold"
                  style={{ color: theme.colors.primary }}
                >
                  Retake Photo
                </Text>
              </View>
            </Button>
          </View>
        </View>
        <Spacer size={40} />
      </Screen>
    );
  }

  // Live camera preview
  return (
    <Screen padded={false}>
      <Header title="Face Enrollment" onBack={() => router.back()} />
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
        />
        {/* Face detection overlay */}
        <View style={styles.overlay}>
          <View style={styles.faceGuide}>
            <View style={styles.faceOval} />
          </View>
        </View>
        <View style={styles.instructions}>
          <Text
            className="text-center text-sm font-medium"
            style={{ color: "#FFFFFF" }}
          >
            Position your face within the oval
          </Text>
        </View>
        <View style={styles.captureBar}>
          <Button onPress={handleCapture}>
            <View className="flex-row items-center">
              <Camera
                size={18}
                color={theme.dark ? "#0B0B0F" : "#FFFFFF"}
              />
              <Text
                className="ml-2 font-semibold"
                style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
              >
                Capture Photo
              </Text>
            </View>
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  faceGuide: {
    width: 250,
    height: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  faceOval: {
    width: 220,
    height: 300,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 110,
    backgroundColor: "transparent",
  },
  instructions: {
    position: "absolute",
    top: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  captureBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
});
