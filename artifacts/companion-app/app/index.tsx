import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { LinearGradient } from "expo-linear-gradient";
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
import { Circle, Svg } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckInModal } from "@/components/CheckInModal";
import { ContactPickerSheet } from "@/components/ContactPickerSheet";
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

function formatClock(): string {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = ((h % 12) || 12).toString();
  return `${displayH}:${m} ${ampm}`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long" });
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
  const hours = (Date.now() - lastCheckIn.getTime()) / 3600000;
  if (hours >= 3) return "due";
  if (hours >= 2.25) return "warning";
  return "good";
}

function getProgressFraction(lastCheckIn: Date | null): number {
  if (!lastCheckIn) return 1;
  const elapsed = (Date.now() - lastCheckIn.getTime()) / (3 * 3600000);
  return Math.min(1, Math.max(0, elapsed));
}

// SVG circular arc for check-in timer
function CheckInRing({ fraction, status }: { fraction: number; status: CheckInStatus }) {
  const SIZE = 110;
  const R = 46;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const circumference = 2 * Math.PI * R;
  const dashOffset = circumference * (1 - fraction);
  const trackColor = "#E8E0D8";
  const fillColor = status === "good" ? "#22C55E" : status === "warning" ? "#F59E0B" : "#EF4444";

  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle cx={cx} cy={cy} r={R} stroke={trackColor} strokeWidth={10} fill="none" />
      <Circle
        cx={cx} cy={cy} r={R}
        stroke={fillColor}
        strokeWidth={10}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90, ${cx}, ${cy})`}
      />
    </Svg>
  );
}

// Action card component
function ActionCard({
  icon, label, onPress, bg, iconColor,
}: {
  icon: string; label: string; onPress: () => void; bg: string; iconColor: string;
}) {
  return (
    <TouchableOpacity style={[styles.actionCard, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.actionIconWrap, { backgroundColor: "rgba(255,255,255,0.28)" }]}>
        <Feather name={icon as keyof typeof Feather.glyphMap} size={30} color={iconColor} />
      </View>
      <Text style={[styles.actionLabel, { color: iconColor }]} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    language, setLanguage, emergencyContacts,
    dismissCheckIn, lastCheckInTime, alertChildren, inactivityMinutesLeft,
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
  const progressFraction = useMemo(() => getProgressFraction(lastCheckInTime), [lastCheckInTime, now]);

  const statusColor = checkInStatus === "good" ? "#22C55E" : checkInStatus === "warning" ? "#F59E0B" : "#EF4444";
  const statusLabel = checkInStatus === "good" ? t.checkInStatusGood : checkInStatus === "warning" ? t.checkInStatusWarning : t.checkInStatusDue;

  const headerGradient: [string, string] =
    checkInStatus === "good" ? ["#E07B2A", "#F5A55A"] :
    checkInStatus === "warning" ? ["#D97706", "#F59E0B"] :
    ["#DC2626", "#F87171"];

  const handleCheckInNow = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    dismissCheckIn();
  };

  const handleAlertChildren = useCallback(async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    alertChildren(t.alertMessage);
  }, [alertChildren, t]);

  const handleEmergency = async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Linking.openURL("tel:999").catch(() => {});
  };

  const handleCallFamily = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (emergencyContacts.length === 0) router.push("/contacts");
    else setContactPickerMode("call");
  };

  const handleWhatsApp = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (emergencyContacts.length === 0) Linking.openURL("https://www.whatsapp.com").catch(() => {});
    else setContactPickerMode("whatsapp");
  };

  const handleContactSelected = (contact: EmergencyContact, mode: "call" | "whatsapp") => {
    const phone = contact.phone.replace(/\s+/g, "");
    if (mode === "call") Linking.openURL(`tel:${phone}`).catch(() => {});
    else Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => Linking.openURL(`https://wa.me/${phone}`).catch(() => {}));
  };

  const handleCalendar = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "ios") Linking.openURL("calshow://").catch(() => {});
    else if (Platform.OS === "android") Linking.openURL("content://com.android.calendar/time/").catch(() => Linking.openURL("https://calendar.google.com").catch(() => {}));
    else Linking.openURL("https://calendar.google.com").catch(() => {});
  };

  const handleYouTube = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("youtube://").catch(() => Linking.openURL("https://www.youtube.com").catch(() => {}));
  };

  const handleSingPass = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("singpass://").catch(() => Linking.openURL("https://app.singpass.sg").catch(() => {}));
  };

  const handleMaps = async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── GRADIENT HEADER ─── */}
        <LinearGradient
          colors={headerGradient}
          style={[styles.header, { paddingTop: topPad + 10, borderRadius: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}
        >
          {/* Top controls */}
          <View style={styles.headerTopRow}>
            <View style={styles.langRow}>
              {LANGUAGES.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.langBtn, { backgroundColor: language === l.code ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)" }]}
                  onPress={() => setLanguage(l.code)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.langText, { color: "#fff" }]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push("/contacts")}>
                <Feather name="users" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push("/settings")}>
                <Feather name="settings" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Clock + greeting */}
          <View style={styles.headerBody}>
            <View style={styles.greetingCol}>
              <Text style={styles.clockText}>{formatClock()}</Text>
              <Text style={styles.dateText}>{formatDate()}</Text>
              <Text style={styles.greetingText}>{greeting} 👋</Text>
            </View>

            {/* Check-in ring */}
            <View style={styles.ringWrap}>
              <CheckInRing fraction={progressFraction} status={checkInStatus} />
              <View style={styles.ringLabel}>
                <Text style={[styles.ringStatus, { color: statusColor }]}>{statusLabel}</Text>
                <Text style={styles.ringSub}>check-in</Text>
              </View>
            </View>
          </View>

          {/* Last check-in strip */}
          <View style={styles.checkInStrip}>
            <Feather name="clock" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.stripText}>{t.lastCheckIn}: {elapsedText}</Text>
            <TouchableOpacity style={styles.stripBtn} onPress={handleCheckInNow}>
              <Text style={styles.stripBtnText}>{t.checkInNow} ✓</Text>
            </TouchableOpacity>
          </View>

          {/* Alert strip (warning/due) */}
          {checkInStatus !== "good" && (
            <TouchableOpacity style={styles.alertStrip} onPress={handleAlertChildren}>
              <Feather name="send" size={14} color="#fff" />
              <Text style={styles.alertStripText}>{t.alertChildren}</Text>
            </TouchableOpacity>
          )}

          {/* Auto-alert countdown */}
          {inactivityMinutesLeft !== null && inactivityMinutesLeft <= 120 && (
            <View style={styles.autoStrip}>
              <Feather name="alert-circle" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.autoStripText}>
                {inactivityMinutesLeft <= 0
                  ? "Alerting family now..."
                  : `Auto-alert in ${inactivityMinutesLeft >= 60 ? `${Math.floor(inactivityMinutesLeft / 60)}h ${inactivityMinutesLeft % 60}m` : `${inactivityMinutesLeft} min`}`}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          {/* ─── ASK A QUESTION ─── */}
          <TouchableOpacity
            style={[styles.askBtn, { backgroundColor: colors.card, borderColor: colors.primary, borderRadius: 20 }]}
            onPress={() => router.push("/assistant")}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#E07B2A", "#F5A55A"]} style={styles.askIconCircle}>
              <Feather name="message-circle" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.askBtnText, { color: colors.foreground }]}>{t.askQuestion}</Text>
            <Feather name="chevron-right" size={22} color={colors.primary} />
          </TouchableOpacity>

          {/* ─── SECTION LABEL ─── */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Quick Actions</Text>

          {/* ─── ACTION GRID ─── */}
          <View style={styles.grid}>
            <ActionCard icon="phone" label={t.family} onPress={handleCallFamily} bg="#1B6CA8" iconColor="#fff" />
            <ActionCard icon="message-square" label={t.whatsapp} onPress={handleWhatsApp} bg="#25D366" iconColor="#fff" />
            <ActionCard icon="youtube" label={t.youtube} onPress={handleYouTube} bg="#FF0000" iconColor="#fff" />
            <ActionCard icon="map-pin" label="Maps" onPress={handleMaps} bg="#34A853" iconColor="#fff" />
            <ActionCard icon="calendar" label={t.myAppointment} onPress={handleCalendar} bg="#8B5CF6" iconColor="#fff" />
            <ActionCard icon="shield" label={t.singpass} onPress={handleSingPass} bg="#E07B2A" iconColor="#fff" />
            <ActionCard icon="bell" label="Reminders" onPress={() => router.push("/reminders")} bg="#0EA5E9" iconColor="#fff" />
            <ActionCard icon="monitor" label="Caregiver" onPress={() => router.push("/caregiver")} bg="#475569" iconColor="#fff" />
          </View>
        </View>
      </ScrollView>

      {/* ─── EMERGENCY BAR ─── */}
      <View style={[styles.emergencyBar, { paddingBottom: Math.max(bottomPad, 16) + 8, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity style={styles.emergencyBtn} onPress={handleEmergency} activeOpacity={0.85}>
          <LinearGradient colors={["#DC2626", "#EF4444"]} style={styles.emergencyGrad}>
            <Feather name="alert-circle" size={28} color="#fff" />
            <Text style={styles.emergencyText}>{t.emergencyCall}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 0 },
  body: { paddingHorizontal: 16, paddingTop: 18 },

  // Header
  header: { paddingHorizontal: 18, paddingBottom: 18 },
  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  langRow: { flexDirection: "row", gap: 6 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  langText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  headerIcons: { flexDirection: "row", gap: 8 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },

  headerBody: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  greetingCol: { flex: 1, gap: 2 },
  clockText: { fontSize: 42, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  dateText: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_400Regular" },
  greetingText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#fff", marginTop: 6 },

  ringWrap: { width: 110, height: 110, alignItems: "center", justifyContent: "center" },
  ringLabel: { position: "absolute", alignItems: "center" },
  ringStatus: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  ringSub: { fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },

  checkInStrip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, gap: 8, marginTop: 4 },
  stripText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_400Regular" },
  stripBtn: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  stripBtnText: { fontSize: 13, color: "#fff", fontFamily: "Inter_700Bold" },

  alertStrip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.18)", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, marginTop: 8 },
  alertStripText: { fontSize: 14, color: "#fff", fontFamily: "Inter_600SemiBold" },

  autoStrip: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 4 },
  autoStripText: { fontSize: 12, color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular" },

  // Ask button
  askBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 18, paddingHorizontal: 18, marginBottom: 16, gap: 14, borderWidth: 1.5, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  askIconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  askBtnText: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold" },

  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 },

  // Action grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionCard: { width: "47%", borderRadius: 18, padding: 16, gap: 12, minHeight: 110, elevation: 3, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  actionIconWrap: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 20 },

  // Emergency
  emergencyBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingTop: 10, paddingHorizontal: 16, borderTopWidth: 1 },
  emergencyBtn: { borderRadius: 18, overflow: "hidden" },
  emergencyGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, gap: 12 },
  emergencyText: { color: "#fff", fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
});
