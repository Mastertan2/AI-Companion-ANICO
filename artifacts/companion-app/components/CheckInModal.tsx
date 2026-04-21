import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import React, { useState } from "react";
import { Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { translations } from "@/constants/translations";

export function CheckInModal() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, isCheckInDue, checkInQuestion, dismissCheckIn, callForHelp, emergencyContacts, alertChildren } = useApp();
  const t = translations[language];
  const [showAlerted, setShowAlerted] = useState(false);
  const [listening, setListening] = useState(false);

  if (!isCheckInDue) return null;

  const handleImFine = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismissCheckIn();
    setShowAlerted(false);
  };

  const handleNo = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowAlerted(true);
    await alertChildren("I am not feeling okay. Please check on me.", false);
  };

  const handleNeedHelp = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowAlerted(true);
    callForHelp();
    const child = emergencyContacts.find((c) => c.role === "child") ?? emergencyContacts[0];
    if (child) {
      const phone = child.phone.replace(/\s+/g, "");
      try {
        const waUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent("I need help!")}`;
        const canOpen = await Linking.canOpenURL(waUrl);
        if (canOpen) await Linking.openURL(waUrl);
        else await Linking.openURL(`tel:${phone}`);
      } catch {
        await Linking.openURL(`tel:${phone}`).catch(() => {});
      }
    } else {
      Linking.openURL("tel:999").catch(() => {});
    }
  };

  const startVoiceCheckIn = () => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      Alert.alert("Voice check-in", "Please tap Yes, No, or Need Help here. You can also use the Ask a Question screen microphone.");
      return;
    }
    const SR = (window as Record<string, unknown>).SpeechRecognition || (window as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new (SR as new () => SpeechRecognition)();
    recognition.lang = language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : language === "ta" ? "ta-IN" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    setListening(true);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = (event.results[0]?.[0]?.transcript ?? "").toLowerCase();
      setListening(false);
      if (text.includes("help") || text.includes("no") || text.includes("not okay")) handleNeedHelp();
      else handleImFine();
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return (
    <Modal transparent animationType="fade" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderRadius: colors.radius ?? 16, paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
            <Text style={styles.iconText}>🔔</Text>
          </View>

          {showAlerted ? (
            <>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.checkInAlertSent}</Text>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => { setShowAlerted(false); dismissCheckIn(); }}>
                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>OK</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.prompt, { color: colors.mutedForeground }]}>{checkInQuestion}</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>{t.areYouOkay}</Text>
              <TouchableOpacity style={[styles.voiceBtn, { backgroundColor: colors.secondary, borderRadius: 16 }]} onPress={startVoiceCheckIn}>
                <Text style={[styles.voiceText, { color: colors.primary }]}>{listening ? "Listening..." : "🎤 Say: I am okay / I need help"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.success }]} onPress={handleImFine}>
                <Text style={[styles.btnText, { color: colors.successForeground }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.warning }]} onPress={handleNo}>
                <Text style={[styles.btnText, { color: "#fff" }]}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.helpBtn, { backgroundColor: colors.destructive }]} onPress={handleNeedHelp}>
                <Text style={[styles.btnText, { color: colors.destructiveForeground }]}>{t.checkInHelp}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  card: { width: "100%", padding: 28, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  iconContainer: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  iconText: { fontSize: 36 },
  prompt: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center", lineHeight: 26, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 32, marginBottom: 18 },
  voiceBtn: { width: "100%", minHeight: 58, alignItems: "center", justifyContent: "center", marginBottom: 12, paddingHorizontal: 12 },
  voiceText: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  btn: { width: "100%", minHeight: 70, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  helpBtn: { marginBottom: 0 },
  btnText: { fontSize: 22, fontFamily: "Inter_700Bold" },
});
