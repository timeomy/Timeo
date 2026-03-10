import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import {
  CheckCircle2,
  XCircle,
  User,
} from "lucide-react-native";
import { useTimeoAuth } from "@timeo/auth";
import { useCheckInByQr } from "@timeo/api-client";
import { Screen, Header, Button, Spacer, useTheme } from "@timeo/ui";

type ScanResult = {
  success: boolean;
  member?: {
    name: string;
    email?: string;
    membershipName?: string;
    photoUrl?: string;
  };
  error?: string;
};

export default function StaffScannerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { activeTenantId } = useTimeoAuth();
  const tenantId = activeTenantId as string;

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const checkInByQr = useCheckInByQr(tenantId ?? "");

  // Animate result overlay
  useEffect(() => {
    if (result) {
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      overlayOpacity.setValue(0);
    }
  }, [result, overlayOpacity]);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned || processing || !tenantId) return;
      setScanned(true);
      setProcessing(true);
      try {
        const response = await checkInByQr.mutateAsync(data);
        setResult({
          success: true,
          member: response.member,
        });
      } catch (err) {
        setResult({
          success: false,
          error:
            err instanceof Error ? err.message : "Check-in failed",
        });
      } finally {
        setProcessing(false);
      }
    },
    [scanned, processing, tenantId, checkInByQr],
  );

  const handleScanAgain = useCallback(() => {
    setScanned(false);
    setResult(null);
  }, []);

  if (!permission) {
    return (
      <Screen>
        <Header title="Scanner" onBack={() => router.back()} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen scroll>
        <Header title="Scanner" onBack={() => router.back()} />
        <Spacer size={40} />
        <View className="items-center px-8">
          <Text
            className="mb-4 text-center text-base"
            style={{ color: theme.colors.text }}
          >
            Camera permission is required to scan member QR codes
          </Text>
          <Button onPress={requestPermission}>
            <Text
              className="font-semibold"
              style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
            >
              Grant Permission
            </Text>
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Header title="Scan Member QR" onBack={() => router.back()} />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />

        {/* Scan area overlay */}
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>

        {/* Processing indicator */}
        {processing && (
          <View style={styles.processingOverlay}>
            <View style={styles.processingBox}>
              <Text className="text-base font-semibold text-white">
                Verifying...
              </Text>
            </View>
          </View>
        )}

        {/* Result overlay */}
        {result && !processing && (
          <Animated.View
            style={[
              styles.resultOverlay,
              {
                opacity: overlayOpacity,
                backgroundColor: result.success
                  ? "rgba(34, 197, 94, 0.92)"
                  : "rgba(239, 68, 68, 0.92)",
              },
            ]}
          >
            <View style={styles.resultContent}>
              {result.success ? (
                <>
                  <CheckCircle2 size={72} color="#FFFFFF" />
                  <Spacer size={20} />
                  <Text style={styles.resultTitle}>Check-in Granted</Text>

                  {result.member ? (
                    <View style={styles.memberCard}>
                      <View style={styles.memberAvatar}>
                        <User size={32} color="#22C55E" />
                      </View>
                      <Spacer size={12} />
                      <Text style={styles.memberName}>
                        {result.member.name}
                      </Text>
                      {result.member.email ? (
                        <Text style={styles.memberDetail}>
                          {result.member.email}
                        </Text>
                      ) : null}
                      {result.member.membershipName ? (
                        <View style={styles.membershipBadge}>
                          <Text style={styles.membershipText}>
                            {result.member.membershipName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : (
                <>
                  <XCircle size={72} color="#FFFFFF" />
                  <Spacer size={20} />
                  <Text style={styles.resultTitle}>Check-in Denied</Text>
                  <Spacer size={8} />
                  <Text style={styles.resultError}>
                    {result.error ?? "Unknown error"}
                  </Text>
                </>
              )}

              <Spacer size={32} />
              <Button onPress={handleScanAgain}>
                <Text
                  className="font-semibold"
                  style={{ color: theme.dark ? "#0B0B0F" : "#FFFFFF" }}
                >
                  Scan Next Member
                </Text>
              </Button>
            </View>
          </Animated.View>
        )}

        {/* Bottom instruction bar */}
        {!result && !processing && (
          <View style={styles.bottomBar}>
            <Text className="text-center text-sm" style={{ color: "#FFFFFF" }}>
              Point camera at member&apos;s QR code
            </Text>
          </View>
        )}
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
    width: 260,
    height: 260,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  processingBox: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  resultContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  resultError: {
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  memberCard: {
    marginTop: 24,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    width: "100%",
  },
  memberAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  memberName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memberDetail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  membershipBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  membershipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
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
