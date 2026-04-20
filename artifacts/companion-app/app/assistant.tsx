import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

import { translations } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isSpeechEnabled } = useApp();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const recordingRef = useRef<unknown>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
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
        language: language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : language === "ta" ? "ta-IN" : "en-US",
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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending) return;

      const userMsg: Message = { id: makeId(), role: "user", content: trimmed };
      setMessages((prev) => [userMsg, ...prev]);
      setInputText("");
      setIsSending(true);
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      try {
        const history = messages
          .slice(0, 10)
          .reverse()
          .map((m) => ({ role: m.role, content: m.content }));

        const apiUrl = `${getApiBase()}/chat`;
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, language }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { reply: string };
        const assistantMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
        speakText(data.reply);
      } catch (err) {
        const errMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: t.tapMicToSpeak.includes("tap")
            ? "Sorry, I could not connect right now. Please check your internet and try again."
            : "抱歉，暂时无法连接。请检查网络后再试。",
        };
        setMessages((prev) => [errMsg, ...prev]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, speakText, language, t]
  );

  const startRecording = async () => {
    if (Platform.OS === "web") return;
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
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
    }
  };

  const stopRecording = async () => {
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
        const res = await fetch(`${getApiBase()}/transcribe`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const data = (await res.json()) as { text: string };
          if (data.text?.trim()) {
            await sendMessage(data.text);
          }
        }
      }
    } catch {
    } finally {
      setIsTranscribing(false);
    }
  };

  const micState = isTranscribing ? "transcribing" : isRecording ? "recording" : "idle";

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, { justifyContent: isUser ? "flex-end" : "flex-start" }]}>
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
              maxWidth: "82%",
            },
          ]}
        >
          <Text style={[styles.msgText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
            {
              backgroundColor: isSpeakingTTS ? colors.primary : colors.muted,
              borderRadius: 12,
            },
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* MESSAGES LIST */}
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
                <Feather name="mic" size={48} color={colors.accent} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  {t.tapMic}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  {Platform.OS === "web" ? t.orTypeBelow : t.tapMicToSpeak}
                </Text>
              </View>
            ) : null
          }
        />

        {/* INPUT AREA */}
        <View
          style={[
            styles.inputArea,
            { paddingBottom: bottomPad + 16, backgroundColor: colors.background, borderTopColor: colors.border },
          ]}
        >
          {/* Status banner */}
          {isRecording && (
            <View style={[styles.statusBanner, { backgroundColor: colors.destructive }]}>
              <Text style={styles.statusBannerText}>● {t.recording}  —  {t.stopRecording}</Text>
            </View>
          )}
          {isTranscribing && (
            <View style={[styles.statusBanner, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statusBannerText, { color: colors.mutedForeground }]}>
                {t.transcribing}
              </Text>
            </View>
          )}

          {/* BIG MIC BUTTON — native only */}
          {Platform.OS !== "web" && (
            <View style={styles.micSection}>
              <TouchableOpacity
                style={[
                  styles.bigMicBtn,
                  {
                    backgroundColor:
                      micState === "recording"
                        ? colors.destructive
                        : micState === "transcribing"
                        ? colors.muted
                        : colors.primary,
                    shadowColor: micState === "recording" ? colors.destructive : colors.primary,
                  },
                ]}
                onPress={micState === "idle" ? startRecording : micState === "recording" ? stopRecording : undefined}
                activeOpacity={0.85}
                disabled={micState === "transcribing"}
              >
                {micState === "transcribing" ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Feather
                    name={micState === "recording" ? "mic-off" : "mic"}
                    size={40}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
              <Text style={[styles.micLabel, { color: colors.mutedForeground }]}>
                {micState === "recording" ? t.stopRecording : micState === "transcribing" ? t.transcribing : t.tapMic}
              </Text>
            </View>
          )}

          {/* TEXT INPUT ROW (always visible on web, toggle on native) */}
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
                  <Feather
                    name="send"
                    size={22}
                    color={inputText.trim() ? colors.primaryForeground : colors.mutedForeground}
                  />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Keyboard toggle (native only) */}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              style={styles.keyboardToggle}
              onPress={() => setShowKeyboard((v) => !v)}
              activeOpacity={0.7}
            >
              <Feather
                name={showKeyboard ? "mic" : "keyboard"}
                size={18}
                color={colors.mutedForeground}
              />
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBtn: {
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

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexGrow: 1,
  },
  msgRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  msgText: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    lineHeight: 26,
  },
  typingRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 10,
  },
  typingBubble: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1.5,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  inputArea: {
    borderTopWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 20,
    gap: 12,
  },

  statusBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  statusBannerText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },

  micSection: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  bigMicBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  micLabel: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },

  textRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  keyboardToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  keyboardToggleText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
