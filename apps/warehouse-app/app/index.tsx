import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useAuth } from "../src/auth/AuthContext";
import { colors, radii, spacing, touchTarget, typography } from "../src/theme";

interface TileProps {
  label: string;
  hint: string;
}

function Tile({ label, hint }: TileProps) {
  return (
    <View style={[styles.tile, styles.tileDisabled]} accessibilityState={{ disabled: true }}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileHint}>{hint}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { staff, status, signOut } = useAuth();

  if (status === "loading") {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (status === "signedOut") {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.greeting}>Hi{staff?.name ? `, ${staff.name}` : ""}</Text>
        <Text style={styles.subtitle}>ControlKart Warehouse</Text>
      </View>

      <View style={styles.tiles}>
        <Tile label="Receive" hint="Coming in the next milestone" />
        <Tile label="Stock take" hint="Coming in the next milestone" />
      </View>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          void signOut();
        }}
        accessibilityRole="button"
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: "space-between",
  },
  greeting: {
    color: colors.text,
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    marginTop: spacing.xs,
  },
  tiles: {
    gap: spacing.md,
  },
  tile: {
    minHeight: touchTarget.minHeight * 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.xs,
  },
  tileDisabled: {
    opacity: 0.55,
  },
  tileLabel: {
    color: colors.text,
    fontSize: typography.heading.fontSize,
    fontWeight: typography.heading.fontWeight,
  },
  tileHint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  logoutButton: {
    minHeight: touchTarget.minHeight,
    minWidth: touchTarget.minWidth,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: colors.danger,
    fontSize: typography.body.fontSize,
    fontWeight: typography.heading.fontWeight,
  },
});
