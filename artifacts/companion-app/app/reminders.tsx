import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Reminder, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = (h % 12 || 12).toString();
  return `${displayH}:${m} ${ampm}`;
}

function timeContext(time24: string): string {
  const h = parseInt(time24.split(":")[0], 10);
  if (h >= 5 && h < 12) return "Morning";
  if (h >= 12 && h < 17) return "Afternoon";
  if (h >= 17 && h < 21) return "Evening";
  return "Night";
}

export default function RemindersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { reminders, addReminder, removeReminder, completeReminder } = useApp();
  const [task, setTask] = useState("");
  const [time, setTime] = useState("");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const save = async () => {
    if (!task.trim() || !/^\d{1,2}:\d{2}$/.test(time.trim())) return;
    const [h, m] = time.split(":");
    await addReminder({ task: task.trim(), time: `${h.padStart(2, "0")}:${m}` });
    setTask("");
    setTime("");
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18, opacity: item.completedAt ? 0.65 : 1 }]}>
      <View style={[styles.timeBox, { backgroundColor: item.completedAt ? colors.muted : colors.primary, borderRadius: 14 }]}>
        <Text style={[styles.timeText, { color: item.completedAt ? colors.mutedForeground : colors.primaryForeground }]}>
          {to12Hour(item.time)}
        </Text>
        <Text style={[styles.timePeriod, { color: item.completedAt ? colors.mutedForeground : "rgba(255,255,255,0.8)" }]}>
          {timeContext(item.time)}
        </Text>
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.taskText, { color: colors.foreground, textDecorationLine: item.completedAt ? "line-through" : "none" }]}>
          {item.task}
        </Text>
        <Text style={[styles.statusText, { color: item.completedAt ? colors.success : colors.mutedForeground }]}>
          {item.completedAt ? "✓ Done" : "Scheduled"}
        </Text>
      </View>
      {!item.completedAt && (
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.success, borderRadius: 12 }]}
          onPress={() => completeReminder(item.id)}
        >
          <Feather name="check" size={22} color={colors.successForeground} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.muted, borderRadius: 12 }]}
        onPress={() => removeReminder(item.id)}
      >
        <Feather name="trash-2" size={22} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>My Reminders</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}>
        <Text style={[styles.addTitle, { color: colors.foreground }]}>Add Reminder</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]}
          value={task}
          onChangeText={setTask}
          placeholder="e.g. Take medicine"
          placeholderTextColor={colors.mutedForeground}
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]}
          value={time}
          onChangeText={setTime}
          placeholder="Time (e.g. 20:00 for 8:00 PM)"
          placeholderTextColor={colors.mutedForeground}
          keyboardType="numbers-and-punctuation"
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: task.trim() && /^\d{1,2}:\d{2}$/.test(time.trim()) ? 1 : 0.5 }]}
          onPress={save}
        >
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save Reminder</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={(r) => r.id}
        renderItem={renderReminder}
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={52} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No reminders yet.{"\n"}Try saying: "Remind me to take medicine at 8pm."
            </Text>
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
  title: { flex: 1, textAlign: "center", fontSize: 24, fontFamily: "Inter_700Bold" },
  addCard: { margin: 16, padding: 16, borderWidth: 1.5, gap: 10 },
  addTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  input: { minHeight: 56, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_400Regular" },
  saveBtn: { minHeight: 60, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 20, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, padding: 14, marginBottom: 2 },
  timeBox: { minWidth: 84, paddingHorizontal: 8, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 2 },
  timeText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  timePeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  flex1: { flex: 1 },
  taskText: { fontSize: 19, fontFamily: "Inter_700Bold", lineHeight: 26 },
  statusText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3 },
  iconBtn: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 16, padding: 40 },
  emptyText: { fontSize: 18, textAlign: "center", lineHeight: 28, fontFamily: "Inter_400Regular" },
});
