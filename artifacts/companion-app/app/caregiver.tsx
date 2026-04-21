import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type CareAlert, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(date: Date | null): string {
  if (!date) return "No check-in yet";
  return date.toLocaleString();
}

export default function CaregiverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName, lastCheckInTime, careStatus, privacyPreferences, recentAlerts, emergencyContacts, reminders } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const statusColor = careStatus === "ok" ? colors.success : careStatus === "no_response" ? colors.warning : colors.destructive;
  const statusLabel = careStatus === "ok" ? "OK" : careStatus === "no_response" ? "No response" : "Emergency";

  const renderAlert = ({ item }: { item: CareAlert }) => (
    <View style={[styles.alertRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]}> 
      <Feather name={item.status === "sent" ? "check-circle" : item.status === "not_configured" ? "alert-triangle" : "x-circle"} size={24} color={item.status === "sent" ? colors.success : colors.destructive} />
      <View style={styles.flex1}>
        <Text style={[styles.alertText, { color: colors.foreground }]}>{item.message}</Text>
        <Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>{new Date(item.createdAt).toLocaleString()} • {item.status.replace("_", " ")}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Caregiver Dashboard</Text>
        <View style={styles.headerBtn} />
      </View>
      <FlatList
        data={recentAlerts}
        keyExtractor={(a) => a.id}
        renderItem={renderAlert}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        ListHeaderComponent={
          <>
            <View style={[styles.statusCard, { backgroundColor: statusColor, borderRadius: 22 }]}> 
              <Text style={styles.statusName}>{userName}</Text>
              <Text style={styles.statusLabel}>{statusLabel}</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}> 
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Wellbeing</Text>
              {privacyPreferences.checkInStatus && <Text style={[styles.infoLine, { color: colors.foreground }]}>Last check-in: {formatDate(lastCheckInTime)}</Text>}
              {privacyPreferences.location && <Text style={[styles.infoLine, { color: colors.foreground }]}>Location: Enabled on device</Text>}
              {privacyPreferences.reminders && <Text style={[styles.infoLine, { color: colors.foreground }]}>Reminders: {reminders.length}</Text>}
              <Text style={[styles.infoLine, { color: colors.foreground }]}>Child contacts: {emergencyContacts.filter((c) => c.role === "child").length}</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent alerts</Text>
          </>
        }
        ListEmptyComponent={<View style={styles.empty}><Feather name="bell" size={44} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No alerts yet.</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 20, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 14 },
  statusCard: { padding: 24, gap: 6 },
  statusName: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  statusLabel: { color: "#fff", fontSize: 36, fontFamily: "Inter_700Bold" },
  infoCard: { padding: 16, borderWidth: 1.5, gap: 10 },
  infoTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  infoLine: { fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 25 },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  alertRow: { flexDirection: "row", gap: 12, padding: 14, borderWidth: 1.5, marginBottom: 12 },
  flex1: { flex: 1 },
  alertText: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 23 },
  alertMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  empty: { alignItems: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 17, fontFamily: "Inter_400Regular" },
});
