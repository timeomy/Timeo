import { useState, useCallback } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTimeoAuth } from "@timeo/auth";
import { useCheckInByQr } from "@timeo/api-client";
import { Screen, Header, Button, Spacer, useTheme } from "@timeo/ui";

export default function ScanQRScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const checkInByQr = useCheckInByQr(tenantId ?? "");

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || processing || !tenantId) return;
      setScanned(true);
      setProcessing(true);
      try {
        await checkInByQr.mutateAsync({ code: data });
        Alert.alert("Success", "Member checked in successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } catch (err) {
        Alert.alert(
          "Check-in Failed",
          err instanceof Error ? err.message : "Failed to check in",
          [{ text: "Try Again", onPress: () => setScanned(false) }]
        );
      } finally {
        setProcessing(false);
      }
    },
    [scanned, processing, tenantId, checkInByQr, router]
  );

  if (!permission) {
    return (
      <Screen>
        <Header title="Scan QR" onBack={() => router.back()} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen scroll>
        <Header title="Scan QR" onBack={() => router.back()} />
        <Spacer size={40} />
        <View className="items-center px-8">
          <Text className="mb-4 text-center text-base" style={{ color: theme.colors.text }}>
            Camera permission is required to scan QR codes
          </Text>
          <Button onPress={requestPermission}>
            <Text className="font-semibold text-white">Grant Permission</Text>
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header title="Scan QR Code" onBack={() => router.back()} />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
        <View style={styles.bottomBar}>
          <Text className="text-center text-sm" style={{ color: "#FFFFFF" }}>
            {processing ? "Processing..." : "Point camera at member's QR code"}
          </Text>
          {scanned && !processing && (
            <>
              <Spacer size={12} />
              <Button variant="outline" onPress={() => setScanned(false)}>
                <Text className="font-semibold" style={{ color: "#FFFFFF" }}>
                  Scan Again
                </Text>
              </Button>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
});
