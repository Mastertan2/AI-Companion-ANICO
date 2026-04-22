import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type CareAlert, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(date: Date | null): string {
  if (!date) return "No check-in yet";
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = (h % 12 || 12).toString();
  const time = `${displayH}:${m} ${ampm}`;
  return `${date.toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short" })} at ${time}`;
}

interface LocationInfo {
  lat: number;
  lng: number;
  address: string;
}

export default function CaregiverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userName, lastCheckInTime, careStatus, privacyPreferences, recentAlerts, emergencyContacts, reminders } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const statusColor =
    careStatus === "ok" ? ["#22C55E", "#16A34A"] as [string, string] :
    careStatus === "no_response" ? ["#F59E0B", "#D97706"] as [string, string] :
    ["#EF4444", "#DC2626"] as [string, string];
  const statusLabel = careStatus === "ok" ? "✓  All Good" : careStatus === "no_response" ? "⚠  No Response" : "🚨  Emergency";
  const statusIcon = careStatus === "ok" ? "check-circle" : careStatus === "no_response" ? "alert-triangle" : "alert-circle";

  useEffect(() => {
    if (privacyPreferences.location && Platform.OS !== "web") {
      fetchLocation();
    }
  }, [privacyPreferences.location]);

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationError("Location permission not granted");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          const parts = [geo.name, geo.street, geo.district, geo.city].filter(Boolean);
          if (parts.length > 0) address = parts.join(", ");
        }
      } catch {}
      setLocation({ lat: latitude, lng: longitude, address });
    } catch (e) {
      setLocationError("Unable to get location");
    } finally {
      setLocationLoading(false);
    }
  };

  const openInMaps = () => {
    if (!location) return;
    Linking.openURL(`https://www.google.com/maps?q=${location.lat},${location.lng}`).catch(() => {});
  };

  const renderAlert = ({ item }: { item: CareAlert }) => (
    <View style={[styles.alertRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]}>
      <Feather
        name={item.status === "sent" ? "check-circle" : item.status === "not_configured" ? "alert-triangle" : "x-circle"}
        size={24}
        color={item.status === "sent" ? colors.success : colors.destructive}
      />
      <View style={styles.flex1}>
        <Text style={[styles.alertText, { color: colors.foreground }]}>{item.message}</Text>
        <Text style={[styles.alertMeta, { color: colors.mutedForeground }]}>
          {new Date(item.createdAt).toLocaleString("en-SG", { dateStyle: "short", timeStyle: "short" })}
          {" • "}{item.status.replace("_", " ")}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
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
            {/* Status card */}
            <LinearGradient colors={statusColor} style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Feather name={statusIcon as "check-circle" | "alert-triangle" | "alert-circle"} size={30} color="#fff" />
                <View>
                  <Text style={styles.statusName}>{userName}</Text>
                  <Text style={styles.statusLabel}>{statusLabel}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* Wellbeing info card */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Wellbeing Summary</Text>

              {privacyPreferences.checkInStatus && (
                <View style={styles.infoRow}>
                  <Feather name="clock" size={18} color={colors.primary} />
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last check-in</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{formatDate(lastCheckInTime)}</Text>
                  </View>
                </View>
              )}

              {privacyPreferences.reminders && (
                <View style={styles.infoRow}>
                  <Feather name="bell" size={18} color={colors.primary} />
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Reminders</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>
                      {reminders.filter((r) => !r.completedAt).length} active, {reminders.filter((r) => r.completedAt).length} done
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <Feather name="users" size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Family contacts</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground }]}>
                    {emergencyContacts.filter((c) => c.role === "child").length} child, {emergencyContacts.filter((c) => c.role !== "child").length} other
                  </Text>
                </View>
              </View>
            </View>

            {/* Location card */}
            {privacyPreferences.location && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.locationHeader}>
                  <Text style={[styles.infoTitle, { color: colors.foreground }]}>📍 Current Location</Text>
                  <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: colors.muted }]} onPress={fetchLocation}>
                    <Feather name="refresh-cw" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                {locationLoading ? (
                  <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Getting location...</Text>
                ) : locationError ? (
                  <Text style={[styles.infoValue, { color: colors.destructive }]}>{locationError}</Text>
                ) : location ? (
                  <>
                    <Text style={[styles.locationAddress, { color: colors.foreground }]}>{location.address}</Text>
                    <TouchableOpacity style={[styles.mapBtn, { backgroundColor: "#1B6CA8" }]} onPress={openInMaps}>
                      <Feather name="map-pin" size={16} color="#fff" />
                      <Text style={styles.mapBtnText}>Open in Google Maps</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={[styles.mapBtn, { backgroundColor: colors.primary }]} onPress={fetchLocation}>
                    <Feather name="map-pin" size={16} color="#fff" />
                    <Text style={styles.mapBtnText}>Get Current Location</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!privacyPreferences.location && (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                  <Feather name="eye-off" size={18} color={colors.mutedForeground} />
                  <Text style={[styles.infoValue, { color: colors.mutedForeground }]}>Location sharing is off. Enable it in Settings.</Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Alerts</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="bell" size={48} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No alerts yet. Alerts are sent to family when check-ins are missed.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 14 },
  statusCard: { borderRadius: 22, padding: 24, marginBottom: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  statusLabel: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  infoCard: { borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 14 },
  infoTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginTop: 2, lineHeight: 24 },
  locationHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  locationAddress: { fontSize: 17, fontFamily: "Inter_400Regular", lineHeight: 25 },
  mapBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, alignSelf: "flex-start", marginTop: 4 },
  mapBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 4 },
  alertRow: { flexDirection: "row", gap: 12, padding: 14, borderWidth: 1.5, marginBottom: 10 },
  flex1: { flex: 1 },
  alertText: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 23 },
  alertMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 4 },
  empty: { alignItems: "center", gap: 14, padding: 36 },
  emptyText: { fontSize: 17, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 26 },
});
