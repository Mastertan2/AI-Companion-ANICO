import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { ContactPickerSheet } from "@/components/ContactPickerSheet";
import { QuickActionButton } from "@/components/QuickActionButton";
import { type Language, translations } from "@/constants/translations";
import { type EmergencyContact, useApp } from "@/context/AppContext";
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

function formatElapsedTime(date: Date | null, t: typeof translations["en"]): string {
  if (!date) return t.checkInNever;
  const ms = Date.now() - date.getTime();
  const totalMins = Math.floor(ms / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours === 0) return `${totalMins} ${t.minutesAgo}`;
  if (mins === 0) return `${hours} ${hours === 1 ? t.hourAgo : t.hoursAgo}`;
  return `${hours}h ${mins}m ${t.minutesAgo}`;
}

type CheckInStatus = "good" | "warning" | "due";

function getCheckInStatus(lastCheckIn: Date | null): CheckInStatus {
  if (!lastCheckIn) return "due";
  const ms = Date.now() - lastCheckIn.getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours >= 3) return "due";
  if (hours >= 2.25) return "warning";
  return "good";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    language, setLanguage, emergencyContacts,
    dismissCheckIn, lastCheckInTime, alertChildren,
    inactivityMinutesLeft,
  } = useApp();
  const t = translations[language];
  const [now, setNow] = useState(Date.now());
  const [contactPickerMode, setContactPickerMode] = useState<"call" | "whatsapp" | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const greeting = useMemo(() => getGreeting(t), [t]);
  const elapsedText = useMemo(() => formatElapsedTime(lastCheckInTime, t), [lastCheckInTime, t, now]);
  const checkInStatus = useMemo(() => getCheckInStatus(lastCheckInTime), [lastCheckInTime, now]);

  const statusColor =
    checkInStatus === "good" ? colors.success :
    checkInStatus === "warning" ? colors.warning :
    colors.destructive;

  const statusLabel =
    checkInStatus === "good" ? t.checkInStatusGood :
    checkInStatus === "warning" ? t.checkInStatusWarning :
    t.checkInStatusDue;

  const handleCheckInNow = async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    dismissCheckIn();
  };

  const handleAlertChildren = useCallback(async () => {
    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    alertChildren(t.alertMessage);
  }, [alertChildren, t]);

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
    if (emergencyContacts.length === 0) {
      router.push("/contacts");
    } else {
      setContactPickerMode("call");
    }
  };

  const handleWhatsApp = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (emergencyContacts.length === 0) {
      Linking.openURL("https://www.whatsapp.com").catch(() => {});
    } else {
      setContactPickerMode("whatsapp");
    }
  };

  const handleContactSelected = (contact: EmergencyContact, mode: "call" | "whatsapp") => {
    const phone = contact.phone.replace(/\s+/g, "");
    if (mode === "call") {
      Linking.openURL(`tel:${phone}`).catch(() => {});
    } else {
      Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
        Linking.openURL(`https://wa.me/${phone}`).catch(() =>
          Linking.openURL("https://www.whatsapp.com").catch(() => {})
        )
      );
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

  const handleMaps = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL("https://maps.google.com").catch(() => {});
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <CheckInModal />

      <ContactPickerSheet
        visible={contactPickerMode !== null}
        mode={contactPickerMode ?? "call"}
        contacts={emergencyContacts}
        onSelect={handleContactSelected}
        onClose={() => setContactPickerMode(null)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── TOP ROW ─── */}
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

        {/* ─── GREETING ─── */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: colors.foreground }]}>
            {greeting} 👋
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {t.subtitle}
          </Text>
        </View>

        {/* ─── CHECK-IN CARD ─── */}
        <View
          style={[
            styles.checkInCard,
            {
              backgroundColor: colors.card,
              borderColor: statusColor,
              borderRadius: 18,
            },
          ]}
        >
          <View style={styles.checkInHeader}>
            <View style={[styles.checkInIconWrap, { backgroundColor: statusColor }]}>
              <Feather
                name={checkInStatus === "good" ? "check-circle" : checkInStatus === "warning" ? "clock" : "alert-triangle"}
                size={22}
                color="#fff"
              />
            </View>
            <View style={styles.checkInInfo}>
              <Text style={[styles.checkInTitle, { color: colors.foreground }]}>
                {t.checkInTitle}
              </Text>
              <Text style={[styles.checkInSub, { color: colors.mutedForeground }]}>
                {t.lastCheckIn}: {elapsedText}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.checkInButtons}>
            <TouchableOpacity
              style={[styles.checkInBtn, { backgroundColor: colors.success, borderRadius: 12, flex: 1 }]}
              onPress={handleCheckInNow}
              activeOpacity={0.85}
            >
              <Text style={[styles.checkInBtnText, { color: colors.successForeground }]}>
                {t.checkInNow}
              </Text>
            </TouchableOpacity>

            {(checkInStatus === "warning" || checkInStatus === "due") && (
              <>
                <View style={styles.checkInBtnGap} />
                <TouchableOpacity
                  style={[styles.checkInBtn, { backgroundColor: colors.warning, borderRadius: 12, flex: 1 }]}
                  onPress={handleAlertChildren}
                  activeOpacity={0.85}
                >
                  <Feather name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={[styles.checkInBtnText, { color: "#fff" }]}>
                    {t.alertChildren}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {inactivityMinutesLeft !== null && inactivityMinutesLeft <= 120 && (
            <View style={[styles.autoAlertBar, { backgroundColor: colors.destructive + "15", borderRadius: 10 }]}>
              <Feather name="clock" size={13} color={colors.destructive} />
              <Text style={[styles.autoAlertText, { color: colors.destructive }]}>
                {inactivityMinutesLeft <= 0
                  ? "Auto-alerting family now..."
                  : `Auto-alert in ${inactivityMinutesLeft >= 60
                      ? `${Math.floor(inactivityMinutesLeft / 60)}h ${inactivityMinutesLeft % 60}m`
                      : `${inactivityMinutesLeft} min`} if no activity`}
              </Text>
            </View>
          )}
        </View>

        {/* ─── ASK A QUESTION ─── */}
        <TouchableOpacity
          style={[styles.askBtn, { backgroundColor: colors.primary, borderRadius: 20 }]}
          onPress={() => router.push("/assistant")}
          activeOpacity={0.85}
        >
          <Feather name="message-circle" size={32} color="#fff" />
          <Text style={[styles.askBtnText, { color: colors.primaryForeground }]}>
            {t.askQuestion}
          </Text>
          <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* ─── QUICK ACTIONS GRID ─── */}
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
              icon={<Feather name="map-pin" size={32} color="#34A853" />}
              label="Google Maps"
              onPress={handleMaps}
            />
            <View style={styles.gridGap} />
            <QuickActionButton
              icon={<Feather name="shield" size={32} color={colors.primary} />}
              label={t.singpass}
              onPress={handleSingPass}
            />
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
    marginBottom: 20,
  },
  langRow: { flexDirection: "row", gap: 6 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  langText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  contactsBtn: {
    width: 44, height: 44,
    alignItems: "center", justifyContent: "center",
  },
  greetingSection: { marginBottom: 20 },
  greeting: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 17, fontFamily: "Inter_400Regular" },

  checkInCard: {
    borderWidth: 2, padding: 16, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.07,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  checkInHeader: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 14, gap: 12,
  },
  checkInIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  checkInInfo: { flex: 1, gap: 3 },
  checkInTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  checkInSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  checkInButtons: { flexDirection: "row", alignItems: "center" },
  checkInBtn: {
    paddingVertical: 13, paddingHorizontal: 12,
    alignItems: "center", justifyContent: "center", flexDirection: "row",
  },
  checkInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  checkInBtnGap: { width: 10 },
  autoAlertBar: {
    flexDirection: "row", alignItems: "center",
    gap: 6, paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
  },
  autoAlertText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },

  askBtn: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 22, paddingHorizontal: 24,
    marginBottom: 20, gap: 14,
    shadowColor: "#E07B2A", shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  askBtnText: { flex: 1, fontSize: 22, fontFamily: "Inter_700Bold" },
  grid: {},
  gridRow: { flexDirection: "row" },
  gridGap: { width: 14 },
  gridGapV: { height: 14 },
  emergencyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingHorizontal: 20, borderTopWidth: 1,
  },
  emergencyBtn: {
    backgroundColor: "#D42B2B", flexDirection: "row",
    alignItems: "center", justifyContent: "center",
    paddingVertical: 20, gap: 12,
    shadowColor: "#D42B2B", shadowOpacity: 0.4,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  emergencyText: {
    color: "#fff", fontSize: 22,
    fontFamily: "Inter_700Bold", letterSpacing: 1,
  },
});
