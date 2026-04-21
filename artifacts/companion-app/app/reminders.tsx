import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type Reminder, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

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
      <View style={[styles.timeBox, { backgroundColor: colors.primary, borderRadius: 14 }]}> 
        <Text style={[styles.timeText, { color: colors.primaryForeground }]}>{item.time}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.taskText, { color: colors.foreground }]}>{item.task}</Text>
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{item.completedAt ? "Done" : "Scheduled"}</Text>
      </View>
      {!item.completedAt && <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.success, borderRadius: 12 }]} onPress={() => completeReminder(item.id)}><Feather name="check" size={20} color={colors.successForeground} /></TouchableOpacity>}
      <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => removeReminder(item.id)}><Feather name="trash-2" size={20} color={colors.destructive} /></TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()}><Feather name="arrow-left" size={22} color={colors.foreground} /></TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>My Reminders</Text>
        <View style={styles.headerBtn} />
      </View>
      <View style={[styles.addCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}> 
        <Text style={[styles.addTitle, { color: colors.foreground }]}>Add reminder</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]} value={task} onChangeText={setTask} placeholder="Take medicine" placeholderTextColor={colors.mutedForeground} />
        <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]} value={time} onChangeText={setTime} placeholder="20:00" placeholderTextColor={colors.mutedForeground} keyboardType="numbers-and-punctuation" />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: task.trim() && /^\d{1,2}:\d{2}$/.test(time.trim()) ? 1 : 0.5 }]} onPress={save}>
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save reminder</Text>
        </TouchableOpacity>
      </View>
      <FlatList data={reminders} keyExtractor={(r) => r.id} renderItem={renderReminder} contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 24 }]} ListEmptyComponent={<View style={styles.empty}><Feather name="calendar" size={48} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No reminders yet. You can also say, “Remind me to take medicine at 8pm.”</Text></View>} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontFamily: "Inter_700Bold" },
  addCard: { margin: 16, padding: 16, borderWidth: 1.5, gap: 10 },
  addTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  input: { minHeight: 54, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_400Regular" },
  saveBtn: { minHeight: 58, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  timeBox: { width: 72, height: 54, alignItems: "center", justifyContent: "center" },
  timeText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  flex1: { flex: 1 },
  taskText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statusText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 3 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  empty: { alignItems: "center", gap: 14, padding: 40 },
  emptyText: { fontSize: 17, textAlign: "center", lineHeight: 25, fontFamily: "Inter_400Regular" },
});
