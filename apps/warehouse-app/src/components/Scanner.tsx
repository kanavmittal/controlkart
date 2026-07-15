import { CameraView, useCameraPermissions, type BarcodeScanningResult, type BarcodeType } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Animated,
  Keyboard,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radii, spacing, touchTarget, typography } from "../theme";
import {
  bumpGeneration,
  createScannerState,
  resetScannerState,
  setBusy,
  shouldAcceptScan,
  type ScannerState,
  type ScanVerdict,
} from "./scanner-core";

const BARCODE_TYPES: BarcodeType[] = ["qr", "code128", "code39", "ean13", "ean8", "upc_a", "upc_e"];

/** How long an edge flash stays visible before fading out. */
const FLASH_VISIBLE_MS = 180;
const FLASH_FADE_MS = 260;

export interface ScannerHandle {
  /** Starts a fresh scanning session: bumps the generation and clears dedupe/busy state. */
  resetSession: () => void;
}

export interface ScannerProps {
  /**
   * Called with the raw decoded string for each accepted scan. Must resolve
   * to a verdict; further scans are ignored until it resolves.
   */
  onScan: (raw: string) => Promise<ScanVerdict>;
  /** Optional helper text rendered near the bottom of the scanner. */
  hint?: string;
}

type FlashKind = "accept" | "reject" | "warn";

const FLASH_COLORS: Record<FlashKind, string> = {
  accept: colors.accent,
  reject: colors.danger,
  warn: colors.warning,
};

async function playVerdictFeedback(verdict: ScanVerdict, triggerFlash: (kind: FlashKind) => void): Promise<void> {
  switch (verdict) {
    case "accept":
      triggerFlash("accept");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    case "reject":
      triggerFlash("reject");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    case "warn":
      triggerFlash("warn");
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case "ignore":
    default:
      return;
  }
}

export const Scanner = forwardRef<ScannerHandle, ScannerProps>(function Scanner({ onScan, hint }, ref) {
  const [permission, requestPermission] = useCameraPermissions();
  const [generation, setGeneration] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [flash, setFlash] = useState<FlashKind | null>(null);

  const coreRef = useRef<ScannerState>(createScannerState());
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceGeneration = useCallback((setter: Dispatch<SetStateAction<number>>) => {
    coreRef.current = bumpGeneration(coreRef.current);
    setter(coreRef.current.generation);
  }, []);

  // Hard requirement (v1 retro lesson): a screen that has lost focus, or a
  // stale mount, must never let a late camera frame commit a scan. Bumping
  // the generation on both focus and unfocus means any scan callback whose
  // closure captured an earlier generation gets dropped in shouldAcceptScan.
  useFocusEffect(
    useCallback(() => {
      advanceGeneration(setGeneration);
      return () => {
        advanceGeneration(setGeneration);
      };
    }, [advanceGeneration]),
  );

  const resetSession = useCallback(() => {
    coreRef.current = resetScannerState(coreRef.current);
    setGeneration(coreRef.current.generation);
    setFlash(null);
    flashOpacity.stopAnimation();
    flashOpacity.setValue(0);
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
  }, [flashOpacity]);

  useImperativeHandle(ref, () => ({ resetSession }), [resetSession]);

  const triggerFlash = useCallback(
    (kind: FlashKind) => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
      setFlash(kind);
      flashOpacity.stopAnimation();
      flashOpacity.setValue(1);
      flashTimeoutRef.current = setTimeout(() => {
        Animated.timing(flashOpacity, {
          toValue: 0,
          duration: FLASH_FADE_MS,
          useNativeDriver: true,
        }).start(() => setFlash(null));
      }, FLASH_VISIBLE_MS);
    },
    [flashOpacity],
  );

  const runScan = useCallback(
    async (raw: string, capturedGeneration: number) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        return;
      }

      const now = Date.now();
      const result = shouldAcceptScan(coreRef.current, capturedGeneration, trimmed, now);
      coreRef.current = result.state;
      if (!result.accepted) {
        return;
      }

      try {
        const verdict = await onScan(trimmed);
        await playVerdictFeedback(verdict, triggerFlash);
      } finally {
        coreRef.current = setBusy(coreRef.current, false);
      }
    },
    [onScan, triggerFlash],
  );

  // Recreated whenever `generation` changes, so the closure captures the
  // generation that was live at registration time — exactly the value
  // shouldAcceptScan compares against the (possibly since-bumped) live one.
  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      void runScan(result.data, generation);
    },
    [generation, runScan],
  );

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualValue.trim();
    setManualValue("");
    setManualVisible(false);
    Keyboard.dismiss();
    if (trimmed) {
      void runScan(trimmed, coreRef.current.generation);
    }
  }, [manualValue, runScan]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.bodyText}>Checking camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    if (permission.canAskAgain) {
      return (
        <View style={styles.centered}>
          <Text style={styles.heading}>Camera access needed</Text>
          <Text style={styles.bodyText}>
            This screen scans barcodes to move stock. Enable the camera to start scanning.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => void requestPermission()}>
            <Text style={styles.primaryButtonText}>Enable camera</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Camera access denied</Text>
        <Text style={styles.bodyText}>
          Camera permission was denied. Enable it for this app in Settings to scan barcodes.
        </Text>
        <Pressable style={styles.primaryButton} onPress={() => void Linking.openSettings()}>
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={styles.fill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.aimingFrame} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashEdge,
          flash ? { borderColor: FLASH_COLORS[flash], opacity: flashOpacity } : { opacity: 0 },
        ]}
      />

      <View style={styles.topControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torchOn ? "Turn torch off" : "Turn torch on"}
          style={[styles.iconButton, torchOn && styles.iconButtonActive]}
          onPress={() => setTorchOn((value) => !value)}
        >
          <Text style={styles.iconButtonText}>{torchOn ? "Torch On" : "Torch"}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter code manually"
          style={styles.iconButton}
          onPress={() => setManualVisible(true)}
        >
          <Text style={styles.iconButtonText}>Keyboard</Text>
        </Pressable>
      </View>

      {hint ? (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      ) : null}

      <Modal
        visible={manualVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.heading}>Enter code manually</Text>
            <TextInput
              style={styles.textInput}
              value={manualValue}
              onChangeText={setManualValue}
              placeholder="Scan code"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={handleManualSubmit}
              returnKeyType="done"
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.primaryButton, styles.modalButton]}
                onPress={() => {
                  setManualValue("");
                  setManualVisible(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.primaryButton, styles.modalButton]} onPress={handleManualSubmit}>
                <Text style={styles.primaryButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

export default Scanner;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing.xl,
    gap: spacing.md,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  bodyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  primaryButton: {
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "600",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  aimingFrame: {
    width: "70%",
    aspectRatio: 1,
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  flashEdge: {
    ...StyleSheet.absoluteFill,
    borderWidth: 12,
    borderRadius: radii.sm,
  },
  topControls: {
    position: "absolute",
    top: spacing.xl,
    right: spacing.md,
    gap: spacing.sm,
  },
  iconButton: {
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  iconButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
  },
  hintContainer: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  textInput: {
    minHeight: touchTarget.minHeight,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
