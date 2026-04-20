import { Feather } from "@expo/vector-icons";
import * as Contacts from "expo-contacts";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { translations } from "@/constants/translations";
import { type EmergencyContact, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface DeviceContact {
  id: string;
  name: string;
  phone: string;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

export default function ContactsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, emergencyContacts, addEmergencyContact, removeEmergencyContact } = useApp();
  const t = translations[language];

  const [showPicker, setShowPicker] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [search, setSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAddContact = useCallback(async () => {
    if (Platform.OS === "web") {
      const name = "Family Member";
      const phone = "+65 9000 0000";
      const contact: EmergencyContact = { id: makeId(), name, phone };
      await addEmergencyContact(contact);
      return;
    }

    setLoadingContacts(true);
    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        setPermDenied(!canAskAgain);
        setLoadingContacts(false);
        if (canAskAgain) {
          Alert.alert(t.permissionRequired);
        }
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const withPhone: DeviceContact[] = data
        .filter((c) => c.name && c.phoneNumbers?.length)
        .map((c) => ({
          id: c.id ?? makeId(),
          name: c.name!,
          phone: c.phoneNumbers![0].number ?? "",
        }));

      setDeviceContacts(withPhone);
      setShowPicker(true);
    } catch {
    } finally {
      setLoadingContacts(false);
    }
  }, [addEmergencyContact, t]);

  const handleSelectContact = useCallback(
    async (dc: DeviceContact) => {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const contact: EmergencyContact = {
        id: makeId(),
        name: dc.name,
        phone: dc.phone,
      };
      await addEmergencyContact(contact);
      setShowPicker(false);
      setSearch("");
    },
    [addEmergencyContact]
  );

  const handleRemove = useCallback(
    (contact: EmergencyContact) => {
      if (Platform.OS === "web") {
        removeEmergencyContact(contact.id);
        return;
      }
      Alert.alert(t.confirmRemove, contact.name, [
        { text: t.cancel, style: "cancel" },
        {
          text: t.remove,
          style: "destructive",
          onPress: () => removeEmergencyContact(contact.id),
        },
      ]);
    },
    [removeEmergencyContact, t]
  );

  const handleCall = useCallback((contact: EmergencyContact) => {
    const phone = contact.phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${phone}`).catch(() => {});
  }, []);

  const handleWhatsApp = useCallback((contact: EmergencyContact) => {
    const phone = contact.phone.replace(/\s+/g, "");
    Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
      Linking.openURL("https://www.whatsapp.com").catch(() => {})
    );
  }, []);

  const filteredContacts = deviceContacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const renderEmergencyContact = ({ item }: { item: EmergencyContact }) => (
    <View
      style={[
        styles.contactCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius ?? 16,
        },
      ]}
    >
      <View
        style={[styles.avatar, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.avatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.contactInfo}>
        <Text style={[styles.contactName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>
          {item.phone}
        </Text>
      </View>
      <View style={styles.contactActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success, borderRadius: 10 }]}
          onPress={() => handleCall(item)}
          activeOpacity={0.8}
        >
          <Feather name="phone" size={18} color={colors.successForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#25D366", borderRadius: 10 }]}
          onPress={() => handleWhatsApp(item)}
          activeOpacity={0.8}
        >
          <Feather name="message-square" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderRadius: 10 }]}
          onPress={() => handleRemove(item)}
          activeOpacity={0.8}
        >
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeviceContact = ({ item }: { item: DeviceContact }) => (
    <TouchableOpacity
      style={[
        styles.deviceContactRow,
        { borderBottomColor: colors.border },
      ]}
      onPress={() => handleSelectContact(item)}
      activeOpacity={0.75}
    >
      <View style={[styles.smallAvatar, { backgroundColor: colors.accent }]}>
        <Text style={[styles.smallAvatarText, { color: colors.foreground }]}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.flex1}>
        <Text style={[styles.contactName, { color: colors.foreground }]}>
          {item.name}
        </Text>
        <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>
          {item.phone}
        </Text>
      </View>
      <Feather name="plus-circle" size={22} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.muted, borderRadius: 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t.emergencyContacts}
        </Text>
        <TouchableOpacity
          style={[
            styles.addBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: 12,
              opacity: loadingContacts ? 0.6 : 1,
            },
          ]}
          onPress={handleAddContact}
          activeOpacity={0.8}
          disabled={loadingContacts}
        >
          <Feather name="user-plus" size={20} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {permDenied && (
        <View
          style={[
            styles.permBanner,
            { backgroundColor: colors.muted, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.permText, { color: colors.mutedForeground }]}>
            {t.permissionRequired}
          </Text>
          <TouchableOpacity onPress={() => Linking.openSettings().catch(() => {})}>
            <Text style={[styles.permLink, { color: colors.primary }]}>
              {t.openSettings}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={emergencyContacts}
        keyExtractor={(c) => c.id}
        renderItem={renderEmergencyContact}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!emergencyContacts.length}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={56} color={colors.muted} />
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              {t.noContacts}
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyAddBtn,
                { backgroundColor: colors.primary, borderRadius: 14 },
              ]}
              onPress={handleAddContact}
              activeOpacity={0.8}
            >
              <Feather name="user-plus" size={20} color={colors.primaryForeground} />
              <Text style={[styles.emptyAddText, { color: colors.primaryForeground }]}>
                {t.addContact}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPicker(false);
          setSearch("");
        }}
      >
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              {t.selectContact}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.muted, borderRadius: 10 }]}
              onPress={() => {
                setShowPicker(false);
                setSearch("");
              }}
            >
              <Feather name="x" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBar, { borderBottomColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.foreground, fontFamily: "Inter_400Regular" },
              ]}
              value={search}
              onChangeText={setSearch}
              placeholder={t.searchContacts}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(c) => c.id}
            renderItem={renderDeviceContact}
            contentContainerStyle={styles.pickerList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!filteredContacts.length}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Feather name="search" size={40} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  {t.noContactsFound}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  addBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  permText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  permLink: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  contactInfo: {
    flex: 1,
    gap: 3,
  },
  contactName: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  contactPhone: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 26,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  pickerModal: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingHorizontal: 16,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    height: 40,
  },
  pickerList: {
    paddingBottom: 40,
  },
  deviceContactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 14,
  },
  smallAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  flex1: { flex: 1 },
});
