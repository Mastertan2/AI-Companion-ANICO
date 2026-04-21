import { Feather } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { translations } from "@/constants/translations";
import { type ContactRole, type EmergencyContact, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface DeviceContact { id: string; name: string; phone: string; }

type ContactDraft = { id?: string; name: string; phone: string; role: ContactRole };

const ROLE_OPTIONS: { role: ContactRole; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { role: "child", label: "Child", icon: "heart" },
  { role: "friend", label: "Friend", icon: "smile" },
  { role: "doctor", label: "Doctor", icon: "activity" },
];

function makeId(): string { return Date.now().toString() + Math.random().toString(36).slice(2, 9); }

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, emergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact } = useApp();
  const t = translations[language];

  const [showEditor, setShowEditor] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [draft, setDraft] = useState<ContactDraft>({ name: "", phone: "", role: "child" });
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const resetDraft = () => setDraft({ name: "", phone: "", role: "child" });

  const openAddEditor = () => { resetDraft(); setShowEditor(true); };

  const openEditEditor = (contact: EmergencyContact) => {
    setDraft({ id: contact.id, name: contact.name, phone: contact.phone, role: contact.role });
    setShowEditor(true);
  };

  const saveDraft = async () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    if (!name || !phone) return;
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (draft.id) updateEmergencyContact({ id: draft.id, name, phone, role: draft.role });
    else addEmergencyContact({ id: makeId(), name, phone, role: draft.role });
    setShowEditor(false);
    resetDraft();
  };

  const importFromDevice = useCallback(async () => {
    if (Platform.OS === "web") {
      openAddEditor();
      return;
    }
    setLoadingContacts(true);
    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(!canAskAgain);
        if (canAskAgain) Alert.alert(t.permissionRequired);
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers], sort: Contacts.SortTypes.FirstName });
      const withPhone: DeviceContact[] = data
        .filter((c) => c.name && c.phoneNumbers?.length)
        .map((c) => ({ id: c.id ?? makeId(), name: c.name!, phone: c.phoneNumbers![0].number ?? "" }));
      setDeviceContacts(withPhone);
      setShowPicker(true);
    } catch {
    } finally {
      setLoadingContacts(false);
    }
  }, [t]);

  const handleSelectDeviceContact = (contact: DeviceContact) => {
    setDraft({ name: contact.name, phone: contact.phone, role: "child" });
    setShowPicker(false);
    setSearch("");
    setShowEditor(true);
  };

  const handleRemove = useCallback((contact: EmergencyContact) => {
    if (Platform.OS === "web") {
      removeEmergencyContact(contact.id);
      return;
    }
    Alert.alert(t.confirmRemove, contact.name, [
      { text: t.cancel, style: "cancel" },
      { text: t.remove, style: "destructive", onPress: () => removeEmergencyContact(contact.id) },
    ]);
  }, [removeEmergencyContact, t]);

  const handleCall = (contact: EmergencyContact) => {
    const phone = contact.phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleWhatsApp = (contact: EmergencyContact) => {
    const phone = contact.phone.replace(/\s+/g, "");
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => Linking.openURL(`https://wa.me/${phone}`).catch(() => {}));
  };

  const filteredContacts = deviceContacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  const renderEmergencyContact = ({ item }: { item: EmergencyContact }) => {
    const role = ROLE_OPTIONS.find((r) => r.role === item.role) ?? ROLE_OPTIONS[0];
    return (
      <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]}> 
        <View style={[styles.avatar, { backgroundColor: item.role === "child" ? colors.primary : item.role === "doctor" ? colors.success : colors.accent }]}> 
          <Feather name={role.icon} size={24} color="#fff" />
        </View>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactName, { color: colors.foreground }]}>{item.name}</Text>
          <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{item.phone}</Text>
          <View style={[styles.rolePill, { backgroundColor: colors.secondary, borderRadius: 99 }]}> 
            <Text style={[styles.rolePillText, { color: colors.primary }]}>{role.label}{item.role === "child" ? " • gets alerts" : ""}</Text>
          </View>
        </View>
        <View style={styles.contactActions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success, borderRadius: 12 }]} onPress={() => handleCall(item)} activeOpacity={0.8}>
            <Feather name="phone" size={18} color={colors.successForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#25D366", borderRadius: 12 }]} onPress={() => handleWhatsApp(item)} activeOpacity={0.8}>
            <Feather name="message-circle" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => openEditEditor(item)} activeOpacity={0.8}>
            <Feather name="edit-2" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => handleRemove(item)} activeOpacity={0.8}>
            <Feather name="trash-2" size={18} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}> 
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()} activeOpacity={0.75}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Contacts & Roles</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: 12, opacity: loadingContacts ? 0.6 : 1 }]} onPress={openAddEditor} activeOpacity={0.8} disabled={loadingContacts}>
          <Feather name="plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {permDenied && (
        <View style={[styles.permBanner, { backgroundColor: colors.muted, borderBottomColor: colors.border }]}> 
          <Text style={[styles.permText, { color: colors.mutedForeground }]}>{t.permissionRequired}</Text>
          <TouchableOpacity onPress={() => Linking.openSettings().catch(() => {})}>
            <Text style={[styles.permLink, { color: colors.primary }]}>{t.openSettings}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.toolbar}> 
        <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]} onPress={openAddEditor}>
          <Feather name="user-plus" size={22} color={colors.primary} />
          <Text style={[styles.toolbarText, { color: colors.foreground }]}>Add manually</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolbarBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]} onPress={importFromDevice}>
          <Feather name="book-open" size={22} color={colors.primary} />
          <Text style={[styles.toolbarText, { color: colors.foreground }]}>Pick from phone</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={emergencyContacts}
        keyExtractor={(c) => c.id}
        renderItem={renderEmergencyContact}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!emergencyContacts.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={56} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Add children, friends, and doctors. Only contacts marked Child receive automatic alerts.</Text>
            <TouchableOpacity style={[styles.emptyAddBtn, { backgroundColor: colors.primary, borderRadius: 14 }]} onPress={openAddEditor} activeOpacity={0.8}>
              <Feather name="user-plus" size={20} color={colors.primaryForeground} />
              <Text style={[styles.emptyAddText, { color: colors.primaryForeground }]}>{t.addContact}</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal visible={showEditor} animationType="slide" transparent onRequestClose={() => setShowEditor(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.editorSheet, { backgroundColor: colors.card, paddingBottom: bottomPad + 18 }]}> 
            <Text style={[styles.editorTitle, { color: colors.foreground }]}>{draft.id ? "Edit contact" : "Add contact"}</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]} value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} placeholder="Name" placeholderTextColor={colors.mutedForeground} />
            <TextInput style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]} value={draft.phone} onChangeText={(phone) => setDraft((d) => ({ ...d, phone }))} placeholder="Phone number" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Role</Text>
            <View style={styles.roleRow}>
              {ROLE_OPTIONS.map((option) => (
                <TouchableOpacity key={option.role} style={[styles.roleBtn, { backgroundColor: draft.role === option.role ? colors.primary : colors.muted, borderRadius: 14 }]} onPress={() => setDraft((d) => ({ ...d, role: option.role }))}>
                  <Feather name={option.icon} size={18} color={draft.role === option.role ? colors.primaryForeground : colors.mutedForeground} />
                  <Text style={[styles.roleText, { color: draft.role === option.role ? colors.primaryForeground : colors.mutedForeground }]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 16, opacity: draft.name.trim() && draft.phone.trim() ? 1 : 0.5 }]} onPress={saveDraft} disabled={!draft.name.trim() || !draft.phone.trim()}>
              <Text style={[styles.saveText, { color: colors.primaryForeground }]}>Save contact</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.muted, borderRadius: 16 }]} onPress={() => { setShowEditor(false); resetDraft(); }}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showPicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowPicker(false); setSearch(""); }}>
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}> 
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}> 
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>{t.selectContact}</Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.muted, borderRadius: 10 }]} onPress={() => { setShowPicker(false); setSearch(""); }}>
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchBar, { borderBottomColor: colors.border }]}> 
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} value={search} onChangeText={setSearch} placeholder={t.searchContacts} placeholderTextColor={colors.mutedForeground} autoFocus />
          </View>
          <FlatList data={filteredContacts} keyExtractor={(c) => c.id} renderItem={({ item }) => (
            <TouchableOpacity style={[styles.deviceContactRow, { borderBottomColor: colors.border }]} onPress={() => handleSelectDeviceContact(item)} activeOpacity={0.75}>
              <View style={[styles.smallAvatar, { backgroundColor: colors.accent }]}><Text style={[styles.smallAvatarText, { color: colors.foreground }]}>{item.name.charAt(0).toUpperCase()}</Text></View>
              <View style={styles.flex1}><Text style={[styles.contactName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>{item.phone}</Text></View>
              <Feather name="plus-circle" size={22} color={colors.primary} />
            </TouchableOpacity>
          )} contentContainerStyle={styles.pickerList} showsVerticalScrollIndicator={false} scrollEnabled={!!filteredContacts.length} ListEmptyComponent={<View style={styles.emptyState}><Feather name="search" size={40} color={colors.muted} /><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.noContactsFound}</Text></View>} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold" },
  addBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  permBanner: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10, borderBottomWidth: 1 },
  permText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  permLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toolbar: { flexDirection: "row", gap: 12, padding: 16 },
  toolbarBtn: { flex: 1, minHeight: 70, borderWidth: 1.5, padding: 12, alignItems: "center", justifyContent: "center", gap: 8 },
  toolbarText: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  listContent: { paddingHorizontal: 16, gap: 12 },
  contactCard: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1.5, marginBottom: 12, gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  contactInfo: { flex: 1, gap: 4 },
  contactName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  contactPhone: { fontSize: 15, fontFamily: "Inter_400Regular" },
  rolePill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4 },
  rolePillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  contactActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 16, paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 26 },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 24, gap: 10, marginTop: 8 },
  emptyAddText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  editorSheet: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 12 },
  editorTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", marginBottom: 4 },
  input: { minHeight: 56, paddingHorizontal: 16, fontSize: 18, fontFamily: "Inter_400Regular" },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_700Bold", marginTop: 4 },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: { flex: 1, minHeight: 58, alignItems: "center", justifyContent: "center", gap: 5 },
  roleText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  saveBtn: { minHeight: 64, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveText: { fontSize: 19, fontFamily: "Inter_700Bold" },
  cancelBtn: { minHeight: 56, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pickerModal: { flex: 1 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, paddingTop: 24, borderBottomWidth: 1 },
  pickerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", padding: 12, paddingHorizontal: 16, gap: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 17, height: 40 },
  pickerList: { paddingBottom: 40 },
  deviceContactRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, gap: 14 },
  smallAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  smallAvatarText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  flex1: { flex: 1 },
});
