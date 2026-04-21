import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type EmergencyContact } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  mode: "call" | "whatsapp";
  contacts: EmergencyContact[];
  onSelect: (contact: EmergencyContact, mode: "call" | "whatsapp") => void;
  onClose: () => void;
  title?: string;
}

export function ContactPickerSheet({ visible, mode, contacts, onSelect, onClose, title }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom;

  const handleSelect = async (contact: EmergencyContact) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelect(contact, mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            paddingBottom: bottomPad + 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
          {title ?? (mode === "call" ? "📞 Who do you want to call?" : "💬 Who do you want to message?")}
        </Text>

        {contacts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Feather name="user-x" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No contacts saved yet.{"\n"}Tap the people icon to add family members.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.contactList} showsVerticalScrollIndicator={false}>
            {contacts.map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={[
                  styles.contactRow,
                  {
                    backgroundColor:
                      mode === "call" ? colors.primary + "15" : "#25D36615",
                    borderRadius: 16,
                    borderWidth: 1.5,
                    borderColor:
                      mode === "call" ? colors.primary + "40" : "#25D36640",
                  },
                ]}
                onPress={() => handleSelect(contact)}
                activeOpacity={0.75}
              >
                <View
                  style={[
                    styles.contactAvatar,
                    {
                      backgroundColor:
                        mode === "call" ? colors.primary : "#25D366",
                    },
                  ]}
                >
                  <Feather
                    name={mode === "call" ? "phone" : "message-circle"}
                    size={24}
                    color="#fff"
                  />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.foreground }]}>
                    {contact.name}
                  </Text>
                  <Text style={[styles.contactPhone, { color: colors.mutedForeground }]}>
                    {contact.phone}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={mode === "call" ? colors.primary : "#25D366"}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[
            styles.cancelBtn,
            { backgroundColor: colors.muted, borderRadius: 14, marginTop: 8 },
          ]}
          onPress={onClose}
          activeOpacity={0.75}
        >
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 20,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 14,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  contactList: {
    gap: 12,
    paddingBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  contactName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  contactPhone: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  cancelBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
});
