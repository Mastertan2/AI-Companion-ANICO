import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type PrivacyKey, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PRIVACY_ITEMS: { key: PrivacyKey; label: string; desc: string }[] = [
  { key: "location", label: "Location", desc: "Share last known location in alerts" },
  { key: "checkInStatus", label: "Check-in status", desc: "Share last check-in time" },
  { key: "emergencyAlerts", label: "Emergency alerts", desc: "Allow urgent alert details" },
  { key: "appActivity", label: "App activity", desc: "Share when the app was last used" },
  { key: "reminders", label: "Reminders", desc: "Share reminder count and status" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { privacyPreferences, updatePrivacyPreferences, userName, setUserName, isSpeechEnabled, toggleSpeech } = useApp();
  const [nameDraft, setNameDraft] = useState(userName);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggle = (key: PrivacyKey) => updatePrivacyPreferences({ ...privacyPreferences, [key]: !privacyPreferences[key] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 28 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}> 
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Elderly user name</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]} value={nameDraft} onChangeText={setNameDraft} placeholder="Name" placeholderTextColor={colors.mutedForeground} />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14 }]} onPress={() => setUserName(nameDraft)}>
            <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save name</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}> 
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Privacy Controls</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Choose what caregivers can see when alerts are sent.</Text>
          {PRIVACY_ITEMS.map((item) => (
            <TouchableOpacity key={item.key} style={[styles.privacyRow, { borderBottomColor: colors.border }]} onPress={() => toggle(item.key)} activeOpacity={0.75}>
              <View style={[styles.checkbox, { backgroundColor: privacyPreferences[item.key] ? colors.primary : colors.muted, borderColor: privacyPreferences[item.key] ? colors.primary : colors.border }]}> 
                {privacyPreferences[item.key] && <Feather name="check" size={18} color={colors.primaryForeground} />}
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.bigRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]} onPress={toggleSpeech}>
          <Feather name={isSpeechEnabled ? "volume-2" : "volume-x"} size={28} color={colors.primary} />
          <View style={styles.flex1}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>Voice replies</Text>
            <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{isSpeechEnabled ? "Assistant speaks aloud" : "Assistant is muted"}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bigRow, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]} onPress={() => router.push("/caregiver")}>
          <Feather name="monitor" size={28} color={colors.primary} />
          <View style={styles.flex1}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>Caregiver Dashboard</Text>
            <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>View check-in status and recent alerts</Text>
          </View>
          <Feather name="chevron-right" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  iconBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 16 },
  card: { borderWidth: 1.5, padding: 16, gap: 12 },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  input: { minHeight: 56, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_400Regular" },
  saveBtn: { minHeight: 56, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: 1 },
  checkbox: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  flex1: { flex: 1 },
  rowTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  rowDesc: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 20 },
  bigRow: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, padding: 16 },
});
