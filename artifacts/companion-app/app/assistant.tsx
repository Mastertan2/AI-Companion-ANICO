import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactPickerSheet } from "@/components/ContactPickerSheet";
import { translations } from "@/constants/translations";
import { type EmergencyContact, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ActionResult | null;
}

interface ActionResult {
  type: string;
  query?: string;
  app?: string;
  name?: string;
  url?: string;
}

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2, 9);
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  if (Platform.OS !== "web") return "http://localhost:8080/api";
  return "/api";
}

function getWebSpeechLang(lang: string): string {
  if (lang === "zh") return "zh-CN";
  if (lang === "ms") return "ms-MY";
  if (lang === "ta") return "ta-IN";
  return "en-US";
}

function buildMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function buildYouTubeUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isSpeechEnabled, emergencyContacts, recordActivity } = useApp();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);
  const [pendingContactAction, setPendingContactAction] = useState<{
    mode: "call" | "whatsapp";
    contacts: EmergencyContact[];
  } | null>(null);

  const recordingRef = useRef<unknown>(null);
  const webRecognitionRef = useRef<unknown>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const SR =
        (window as Record<string, unknown>).SpeechRecognition ||
        (window as Record<string, unknown>).webkitSpeechRecognition;
      setWebSpeechSupported(!!SR);
    }
    return () => {
      Speech.stop().catch(() => {});
    };
  }, []);

  const speakText = useCallback(
    async (text: string) => {
      if (!isSpeechEnabled) return;
      await Speech.stop().catch(() => {});
      setIsSpeakingTTS(true);
      Speech.speak(text, {
        language: getWebSpeechLang(language),
        rate: 0.9,
        pitch: 1.0,
        onDone: () => setIsSpeakingTTS(false),
        onError: () => setIsSpeakingTTS(false),
        onStopped: () => setIsSpeakingTTS(false),
      });
    },
    [isSpeechEnabled, language]
  );

  const stopSpeaking = async () => {
    await Speech.stop().catch(() => {});
    setIsSpeakingTTS(false);
  };

  /* ─── ACTION EXECUTOR ─── */
  const executeAction = useCallback(
    async (action: ActionResult, contacts: EmergencyContact[]) => {
      const { type } = action;

      if (type === "open_maps" && action.query) {
        const url = buildMapsUrl(action.query);
        Linking.openURL(url).catch(() => {});
        return;
      }

      if (type === "open_youtube" && action.query) {
        const url = buildYouTubeUrl(action.query);
        Linking.openURL("youtube://results?search_query=" + encodeURIComponent(action.query))
          .catch(() => Linking.openURL(url).catch(() => {}));
        return;
      }

      if (type === "open_app") {
        switch (action.app) {
          case "singpass":
            Linking.openURL("singpass://").catch(() =>
              Linking.openURL("https://app.singpass.sg").catch(() => {})
            );
            break;
          case "whatsapp":
            Linking.openURL("whatsapp://").catch(() =>
              Linking.openURL("https://www.whatsapp.com").catch(() => {})
            );
            break;
          case "youtube":
            Linking.openURL("youtube://").catch(() =>
              Linking.openURL("https://www.youtube.com").catch(() => {})
            );
            break;
          case "googlemaps":
            Linking.openURL("comgooglemaps://").catch(() =>
              Linking.openURL("https://maps.google.com").catch(() => {})
            );
            break;
          case "calendar":
            if (Platform.OS === "ios") {
              Linking.openURL("calshow://").catch(() => {});
            } else {
              Linking.openURL("https://calendar.google.com").catch(() => {});
            }
            break;
          case "healthhub":
            Linking.openURL("https://www.healthhub.sg").catch(() => {});
            break;
          case "camera":
            if (Platform.OS !== "web") {
              Linking.openURL("camera://").catch(() => {});
            }
            break;
          default:
            if (action.url) {
              Linking.openURL(action.url).catch(() => {});
            }
        }
        return;
      }

      if (type === "call_emergency") {
        Linking.openURL("tel:999").catch(() => {});
        return;
      }

      if (type === "call_contact" || type === "whatsapp_contact") {
        const mode: "call" | "whatsapp" = type === "call_contact" ? "call" : "whatsapp";
        const targetName = (action.name ?? "").toLowerCase();

        let matched: EmergencyContact | undefined;
        if (targetName) {
          matched =
            contacts.find((c) => c.name.toLowerCase() === targetName) ||
            contacts.find((c) => c.name.toLowerCase().includes(targetName)) ||
            contacts.find((c) => targetName.includes(c.name.toLowerCase().split(" ")[0]));
        }

        if (matched) {
          const phone = matched.phone.replace(/\s+/g, "");
          const doAction = () => {
            if (mode === "call") {
              Linking.openURL(`tel:${phone}`).catch(() => {});
            } else {
              Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
                Linking.openURL(`https://wa.me/${phone}`).catch(() => {})
              );
            }
          };

          if (Platform.OS !== "web") {
            Alert.alert(
              mode === "call" ? `Call ${matched.name}?` : `WhatsApp ${matched.name}?`,
              matched.phone,
              [
                { text: "Cancel", style: "cancel" },
                { text: mode === "call" ? "Call" : "Send", onPress: doAction },
              ]
            );
          } else {
            doAction();
          }
        } else if (contacts.length > 0) {
          setPendingContactAction({ mode, contacts });
        } else {
          router.push("/contacts");
        }
        return;
      }

      if (type === "open_url" && action.url) {
        Linking.openURL(action.url).catch(() => {});
      }
    },
    [router]
  );

  /* ─── SEND MESSAGE ─── */
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      recordActivity();
      const userMsg: Message = { id: makeId(), role: "user", content: trimmed };
      setMessages((prev) => [userMsg, ...prev]);
      setInputText("");
      setIsSending(true);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      try {
        const history = messages
          .slice(0, 8)
          .reverse()
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch(`${getApiBase()}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history,
            language,
            contacts: emergencyContacts.map((c) => ({ name: c.name, phone: c.phone })),
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { reply: string; action: ActionResult | null };

        const assistantMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: data.reply,
          action: data.action,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
        speakText(data.reply);

        if (data.action) {
          await executeAction(data.action, emergencyContacts);
        }
      } catch {
        const errMsg: Message = {
          id: makeId(),
          role: "assistant",
          content:
            language === "zh" ? "抱歉，暂时无法连接。请重试。"
            : language === "ms" ? "Maaf, tidak dapat menyambung. Sila cuba lagi."
            : language === "ta" ? "மன்னிக்கவும், இணைக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
            : "Sorry, I couldn't connect. Please try again.",
        };
        setMessages((prev) => [errMsg, ...prev]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, speakText, language, emergencyContacts, executeAction, recordActivity]
  );

  /* ─── WEB SPEECH ─── */
  const startWebMic = useCallback(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as Record<string, unknown>).SpeechRecognition ||
      (window as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new (SR as new () => SpeechRecognition)();
    recognition.lang = getWebSpeechLang(language);
    recognition.continuous = false;
    recognition.interimResults = false;
    webRecognitionRef.current = recognition;
    setIsRecording(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setIsRecording(false);
      if (transcript.trim()) sendMessage(transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  }, [language, sendMessage]);

  const stopWebMic = useCallback(() => {
    if (webRecognitionRef.current) {
      (webRecognitionRef.current as SpeechRecognition).stop();
      webRecognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  /* ─── NATIVE MIC ─── */
  const startNativeMic = async () => {
    try {
      const { Audio } = await import("expo-av");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
    }
  };

  const stopNativeMic = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      const { Audio } = await import("expo-av");
      const recording = recordingRef.current as InstanceType<typeof Audio.Recording>;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (uri) {
        const formData = new FormData();
        formData.append("audio", { uri, type: "audio/m4a", name: "recording.m4a" } as unknown as Blob);
        formData.append("language", language);
        const res = await fetch(`${getApiBase()}/transcribe`, { method: "POST", body: formData });
        if (res.ok) {
          const data = (await res.json()) as { text: string };
          if (data.text?.trim()) await sendMessage(data.text);
        }
      }
    } catch {
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleMicPress = () => {
    recordActivity();
    if (Platform.OS === "web") {
      isRecording ? stopWebMic() : startWebMic();
    } else {
      isRecording ? stopNativeMic() : startNativeMic();
    }
  };

  const showMicButton = Platform.OS !== "web" || webSpeechSupported;
  const micState = isTranscribing ? "transcribing" : isRecording ? "recording" : "idle";

  /* ─── ACTION CHIP ─── */
  const renderActionChip = (action: ActionResult | null | undefined) => {
    if (!action) return null;
    let icon: "map-pin" | "youtube" | "phone" | "message-circle" | "external-link" | "alert-circle" = "external-link";
    let label = "Opened";
    if (action.type === "open_maps") { icon = "map-pin"; label = `Maps: ${action.query ?? ""}`; }
    if (action.type === "open_youtube") { icon = "youtube"; label = `YouTube: ${action.query ?? ""}`; }
    if (action.type === "call_contact") { icon = "phone"; label = `Called ${action.name ?? "contact"}`; }
    if (action.type === "whatsapp_contact") { icon = "message-circle"; label = `WhatsApp: ${action.name ?? ""}`; }
    if (action.type === "call_emergency") { icon = "alert-circle"; label = "Called 999"; }
    if (action.type === "open_app") { icon = "external-link"; label = `Opened ${action.app ?? "app"}`; }

    return (
      <View style={[styles.actionChip, { backgroundColor: colors.secondary, borderRadius: 20, marginTop: 6 }]}>
        <Feather name={icon} size={13} color={colors.primary} />
        <Text style={[styles.actionChipText, { color: colors.primary }]}>{label}</Text>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
        <View style={styles.msgWrap}>
          <View
            style={[
              styles.bubble,
              {
                backgroundColor: isUser ? colors.primary : colors.card,
                borderRadius: 18,
                borderBottomRightRadius: isUser ? 4 : 18,
                borderBottomLeftRadius: isUser ? 18 : 4,
                borderWidth: isUser ? 0 : 1.5,
                borderColor: colors.border,
                maxWidth: "100%",
              },
            ]}
          >
            <Text style={[styles.msgText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
          {!isUser && renderActionChip(item.action)}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Contact picker for AI-triggered contact actions */}
      {pendingContactAction && (
        <ContactPickerSheet
          visible={true}
          mode={pendingContactAction.mode}
          contacts={pendingContactAction.contacts}
          onSelect={(contact, mode) => {
            const phone = contact.phone.replace(/\s+/g, "");
            if (mode === "call") {
              Linking.openURL(`tel:${phone}`).catch(() => {});
            } else {
              Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
                Linking.openURL(`https://wa.me/${phone}`).catch(() => {})
              );
            }
          }}
          onClose={() => setPendingContactAction(null)}
        />
      )}

      {/* HEADER */}
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t.howCanIHelp}
        </Text>
        <TouchableOpacity
          style={[
            styles.headerBtn,
            { backgroundColor: isSpeakingTTS ? colors.primary : colors.muted, borderRadius: 12 },
          ]}
          onPress={isSpeakingTTS ? stopSpeaking : undefined}
          activeOpacity={0.75}
        >
          <Feather
            name={isSpeakingTTS ? "volume-x" : "volume-2"}
            size={20}
            color={isSpeakingTTS ? colors.primaryForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* MESSAGES */}
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            isSending ? (
              <View style={styles.typingRow}>
                <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 18 }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isSending ? (
              <View style={styles.emptyState}>
                <Feather name="mic" size={52} color={colors.accent} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {t.tapMic}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  {showMicButton
                    ? 'Try: "Take me to Jurong Point" or "Play Jay Chou"'
                    : t.orTypeBelow}
                </Text>
              </View>
            ) : null
          }
        />

        {/* INPUT */}
        <View
          style={[
            styles.inputArea,
            { paddingBottom: bottomPad + 16, backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          {isRecording && (
            <View style={[styles.statusBanner, { backgroundColor: colors.destructive }]}>
              <Text style={styles.statusBannerText}>● {t.recording}  —  {t.stopRecording}</Text>
            </View>
          )}
          {isTranscribing && (
            <View style={[styles.statusBanner, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statusBannerText, { color: colors.mutedForeground }]}>{t.transcribing}</Text>
            </View>
          )}

          {showMicButton && (
            <View style={styles.micSection}>
              <TouchableOpacity
                style={[
                  styles.bigMicBtn,
                  {
                    backgroundColor:
                      micState === "recording" ? colors.destructive
                      : micState === "transcribing" ? colors.muted
                      : colors.primary,
                    shadowColor:
                      micState === "recording" ? colors.destructive : colors.primary,
                  },
                ]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                disabled={micState === "transcribing"}
              >
                {micState === "transcribing" ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Feather name={micState === "recording" ? "mic-off" : "mic"} size={42} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={[styles.micLabel, { color: colors.mutedForeground }]}>
                {micState === "recording" ? t.stopRecording
                 : micState === "transcribing" ? t.transcribing
                 : t.tapMic}
              </Text>
            </View>
          )}

          {(Platform.OS === "web" || showKeyboard) && (
            <View style={styles.textRow}>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 },
                ]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={t.typeMessage}
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={() => sendMessage(inputText)}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: inputText.trim() && !isSending ? colors.primary : colors.muted,
                    borderRadius: 14,
                  },
                ]}
                onPress={() => sendMessage(inputText)}
                activeOpacity={0.8}
                disabled={!inputText.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Feather name="send" size={22} color={inputText.trim() ? colors.primaryForeground : colors.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {Platform.OS !== "web" && (
            <TouchableOpacity style={styles.keyboardToggle} onPress={() => setShowKeyboard((v) => !v)} activeOpacity={0.7}>
              <Feather name={showKeyboard ? "mic" : "keyboard"} size={18} color={colors.mutedForeground} />
              <Text style={[styles.keyboardToggleText, { color: colors.mutedForeground }]}>
                {showKeyboard ? t.tapMic : t.orTypeBelow}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, gap: 12,
  },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 20, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 12, flexGrow: 1 },
  msgRow: { flexDirection: "row", marginBottom: 12 },
  msgWrap: { maxWidth: "82%", gap: 4 },
  bubble: { paddingHorizontal: 16, paddingVertical: 12 },
  msgText: { fontSize: 18, fontFamily: "Inter_400Regular", lineHeight: 26 },
  actionChip: {
    flexDirection: "row", alignItems: "center",
    gap: 6, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start",
  },
  actionChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  typingRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 10 },
  typingBubble: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 14 },
  emptyTitle: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 22 },
  inputArea: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 20, gap: 12 },
  statusBanner: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center" },
  statusBannerText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  micSection: { alignItems: "center", gap: 10, paddingVertical: 4 },
  bigMicBtn: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
    shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  micLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  textRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInput: {
    flex: 1, minHeight: 48, maxHeight: 120,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 17, fontFamily: "Inter_400Regular",
  },
  sendBtn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  keyboardToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  keyboardToggleText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
