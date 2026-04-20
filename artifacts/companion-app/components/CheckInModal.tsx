import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { translations } from "@/constants/translations";

export function CheckInModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, isCheckInDue, dismissCheckIn, callForHelp, emergencyContacts } = useApp();
  const t = translations[language];
  const [showAlerted, setShowAlerted] = useState(false);

  if (!isCheckInDue) return null;

  const handleImFine = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissCheckIn();
    setShowAlerted(false);
  };

  const handleNeedHelp = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setShowAlerted(true);
    callForHelp();
    if (emergencyContacts.length > 0) {
      const contact = emergencyContacts[0];
      const phone = contact.phone.replace(/\s+/g, "");
      try {
        const waUrl = `whatsapp://send?phone=${phone}&text=I need help!`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) {
          await Linking.openURL(waUrl);
        } else {
          await Linking.openURL(`tel:${phone}`);
        }
      } catch {
        await Linking.openURL(`tel:${phone}`).catch(() => {});
      }
    } else {
      Linking.openURL("tel:999").catch(() => {});
    }
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderRadius: colors.radius ?? 16,
              paddingBottom: Math.max(insets.bottom + 16, 32),
            },
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.iconText}>🔔</Text>
          </View>

          {showAlerted ? (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t.checkInAlertSent}
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowAlerted(false);
                  dismissCheckIn();
                }}
              >
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>OK</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t.checkInPrompt}
              </Text>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.success }]}
                onPress={handleImFine}
              >
                <Text style={[styles.btnText, { color: colors.successForeground }]}>
                  {t.checkInFine}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.helpBtn, { backgroundColor: colors.destructive }]}
                onPress={handleNeedHelp}
              >
                <Text style={[styles.btnText, { color: colors.destructiveForeground }]}>
                  {t.checkInHelp}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  iconText: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 28,
  },
  btn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  helpBtn: {
    marginBottom: 0,
  },
  btnText: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
});
