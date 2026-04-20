import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "default" | "destructive" | "success";
  disabled?: boolean;
}

export function QuickActionButton({
  icon,
  label,
  onPress,
  loading = false,
  variant = "default",
  disabled = false,
}: QuickActionButtonProps) {
  const colors = useColors();

  const bgColor =
    variant === "destructive"
      ? colors.destructive
      : variant === "success"
      ? colors.success
      : colors.card;

  const textColor =
    variant === "destructive"
      ? colors.destructiveForeground
      : variant === "success"
      ? colors.successForeground
      : colors.foreground;

  const handlePress = async () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: bgColor,
          borderColor: variant === "default" ? colors.border : "transparent",
          borderRadius: colors.radius ?? 16,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={disabled || loading}
    >
      <View style={styles.iconWrap}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          icon
        )}
      </View>
      <Text
        style={[styles.label, { color: textColor }]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 20,
  },
});
