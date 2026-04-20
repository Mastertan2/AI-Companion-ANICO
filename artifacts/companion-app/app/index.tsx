import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInModal } from "@/components/CheckInModal";
import { QuickActionButton } from "@/components/QuickActionButton";
import { type Language, translations } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "ms", label: "BM" },
  { code: "ta", label: "தமிழ்" },
];

function getGreeting(t: typeof translations["en"]): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.greetingMorning;
  if (hour < 17) return t.greetingAfternoon;
  return t.greetingEvening;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, setLanguage, emergencyContacts } = useApp();
  const t = translations[language];

  const greeting = useMemo(() => getGreeting(t), [t]);

  const handleEmergency = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    Linking.openURL("tel:999").catch(() => {});
  };

  const handleCallFamily = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    if (emergencyContacts.length > 0) {
      const phone = emergencyContacts[0].phone.replace(/\s+/g, "");
      Linking.openURL(`tel:${phone}`).catch(() => {});
    } else {
      router.push("/contacts");
    }
  };

  const handleWhatsApp = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (emergencyContacts.length > 0) {
      const phone = emergencyContacts[0].phone.replace(/\s+/g, "");
      Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
        Linking.openURL("https://www.whatsapp.com").catch(() => {})
      );
    } else {
      Linking.openURL("https://www.whatsapp.com").catch(() => {});
    }
  };

  const handleCalendar = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === "ios") {
      Linking.openURL("calshow://").catch(() => {});
    } else if (Platform.OS === "android") {
      Linking.openURL("content://com.android.calendar/time/").catch(() =>
        Linking.openURL("https://calendar.google.com").catch(() => {})
      );
    } else {
      Linking.openURL("https://calendar.google.com").catch(() => {});
    }
  };

  const handleYouTube = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL("youtube://").catch(() =>
      Linking.openURL("https://www.youtube.com").catch(() => {})
    );
  };

  const handleSingPass = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL("singpass://").catch(() =>
      Linking.openURL("https://app.singpass.sg").catch(() => {})
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CheckInModal />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.langRow}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor:
                      language === l.code ? colors.primary : colors.muted,
                    borderRadius: 10,
                  },
                ]}
                onPress={() => setLanguage(l.code)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.langText,
                    {
                      color:
                        language === l.code
                          ? colors.primaryForeground
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.contactsBtn,
              { backgroundColor: colors.muted, borderRadius: 12 },
            ]}
            onPress={() => router.push("/contacts")}
            activeOpacity={0.8}
          >
            <Feather name="users" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greeting} 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.subtitle}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.askBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: 20,
            },
          ]}
          onPress={() => router.push("/assistant")}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={32} color="#fff" />
          <Text style={[styles.askBtnText, { color: colors.primaryForeground }]}>
            {t.askQuestion}
          </Text>
          <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <QuickActionButton
              icon={<Feather name="phone" size={32} color={colors.primary} />}
              label={t.family}
              onPress={handleCallFamily}
            />
            <View style={styles.gridGap} />
            <QuickActionButton
              icon={<Feather name="message-square" size={32} color="#25D366" />}
              label={t.whatsapp}
              onPress={handleWhatsApp}
            />
          </View>
          <View style={styles.gridGapV} />
          <View style={styles.gridRow}>
            <QuickActionButton
              icon={<Feather name="calendar" size={32} color={colors.primary} />}
              label={t.myAppointment}
              onPress={handleCalendar}
            />
            <View style={styles.gridGap} />
            <QuickActionButton
              icon={<Feather name="youtube" size={32} color="#FF0000" />}
              label={t.youtube}
              onPress={handleYouTube}
            />
          </View>
          <View style={styles.gridGapV} />
          <View style={styles.gridRow}>
            <QuickActionButton
              icon={<Feather name="shield" size={32} color={colors.primary} />}
              label={t.singpass}
              onPress={handleSingPass}
            />
            <View style={styles.gridGap} />
            <View style={{ flex: 1 }} />
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.emergencyBar,
          {
            paddingBottom: Math.max(bottomPad, 16) + 8,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.emergencyBtn, { borderRadius: 18 }]}
          onPress={handleEmergency}
          activeOpacity={0.85}
        >
          <Feather name="alert-circle" size={28} color="#fff" />
          <Text style={styles.emergencyText}>{t.emergencyCall}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  langRow: {
    flexDirection: "row",
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  contactsBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  greetingSection: {
    marginBottom: 28,
  },
  greeting: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
  },
  askBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 22,
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 14,
    shadowColor: "#E07B2A",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  askBtnText: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  grid: {
    gap: 0,
  },
  gridRow: {
    flexDirection: "row",
  },
  gridGap: {
    width: 14,
  },
  gridGapV: {
    height: 14,
  },
  emergencyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  emergencyBtn: {
    backgroundColor: "#D42B2B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
    shadowColor: "#D42B2B",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emergencyText: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
