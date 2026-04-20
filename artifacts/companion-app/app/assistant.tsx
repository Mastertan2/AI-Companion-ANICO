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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recordingRef = useRef<{ stopAndUnloadAsync: () => Promise<void>; getURI: () => string | null } | null>(null);

  useEffect(() => {
    return () => {
      if (isSpeechEnabled) Speech.stop();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [isSpeechEnabled]);

  const speakText = useCallback(
    async (text: string) => {
      if (!isSpeechEnabled || Platform.OS === "web") return;
      try {
        await Speech.stop();
        setIsSpeaking(true);
        Speech.speak(text, {
          language: language === "zh" ? "zh-CN" : language === "ms" ? "ms-MY" : language === "ta" ? "ta-IN" : "en-US",
          rate: 0.9,
          onDone: () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
      } catch {
        setIsSpeaking(false);
      }
    },
    [isSpeechEnabled, language]
  );

  const stopSpeaking = async () => {
    await Speech.stop().catch(() => {});
    setIsSpeaking(false);
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

        const res = await fetch(`${getApiBase()}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history, language }),
        });

        if (!res.ok) throw new Error("Server error");
        const data = (await res.json()) as { reply: string };
        const assistantMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [assistantMsg, ...prev]);
        speakText(data.reply);
      } catch {
        const errMsg: Message = {
          id: makeId(),
          role: "assistant",
          content: "Sorry, I couldn't connect right now. Please try again.",
        };
        setMessages((prev) => [errMsg, ...prev]);
      } finally {
        setIsSending(false);
      }
    },
    [isSending, messages, speakText, language]
  );

  const startRecording = async () => {
    if (Platform.OS === "web") return;
    try {
      const { Audio } = await import("expo-av");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const { Audio } = await import("expo-av");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      if (Platform.OS === "web") {
        setIsTranscribing(false);
        return;
      }

      const { fetch: expoFetch } = await import("expo/fetch");
      const { File: ExpoFile } = await import("expo-file-system");

      const audioFile = new ExpoFile(uri, "audio.m4a", { type: "audio/m4a" });
      const form = new FormData();
      form.append("audio", audioFile as unknown as Blob);

      const res = await expoFetch(`${getApiBase()}/transcribe`, {
        method: "POST",
        body: form,
      });

      if (res.ok) {
        const data = (await res.json()) as { text: string };
        if (data.text) {
          await sendMessage(data.text);
        }
      }
    } catch {
    } finally {
      setIsTranscribing(false);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View
        style={[
          styles.msgRow,
          { justifyContent: isUser ? "flex-end" : "flex-start" },
        ]}
      >
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
          <Text
            style={[
              styles.msgText,
              {
                color: isUser ? colors.primaryForeground : colors.foreground,
              },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const micState = isTranscribing ? "transcribing" : isRecording ? "recording" : "idle";

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
          {t.howCanIHelp}
        </Text>
        <TouchableOpacity
          style={[
            styles.speakToggle,
            {
              backgroundColor: isSpeaking ? colors.primary : colors.muted,
              borderRadius: 12,
            },
          ]}
          onPress={isSpeaking ? stopSpeaking : undefined}
          activeOpacity={0.75}
        >
          <Feather
            name={isSpeaking ? "volume-x" : "volume-2"}
            size={20}
            color={isSpeaking ? colors.primaryForeground : colors.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 16 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!messages.length}
          ListFooterComponent={
            isSending ? (
              <View style={styles.typingRow}>
                <View
                  style={[
                    styles.typingBubble,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 18,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isSending ? (
              <View style={styles.emptyState}>
                <Feather name="message-circle" size={56} color={colors.muted} />
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  {t.tapMic}
                </Text>
              </View>
            ) : null
          }
        />

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: bottomPad + 12,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          {isRecording && (
            <View style={[styles.recordingBanner, { backgroundColor: colors.destructive }]}>
              <Text style={styles.recordingText}>● {t.recording} {t.stopRecording}</Text>
            </View>
          )}
          {isTranscribing && (
            <View style={[styles.recordingBanner, { backgroundColor: colors.muted }]}>
              <Text style={[styles.recordingText, { color: colors.mutedForeground }]}>
                {t.transcribing}
              </Text>
            </View>
          )}

          <View style={styles.inputRow}>
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={[
                  styles.micBtn,
                  {
                    backgroundColor:
                      micState === "recording"
                        ? colors.destructive
                        : micState === "transcribing"
                        ? colors.muted
                        : colors.secondary,
                    borderRadius: 14,
                  },
                ]}
                onPress={micState === "idle" ? startRecording : micState === "recording" ? stopRecording : undefined}
                activeOpacity={0.8}
                disabled={micState === "transcribing"}
              >
                {micState === "transcribing" ? (
                  <ActivityIndicator size="small" color={colors.mutedForeground} />
                ) : (
                  <Feather
                    name="mic"
                    size={22}
                    color={
                      micState === "recording"
                        ? colors.destructiveForeground
                        : colors.primary
                    }
                  />
                )}
              </TouchableOpacity>
            )}

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                  borderRadius: 14,
                },
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
                  backgroundColor:
                    inputText.trim() && !isSending
                      ? colors.primary
                      : colors.muted,
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
                  size={20}
                  color={
                    inputText.trim() ? colors.primaryForeground : colors.mutedForeground
                  }
                />
              )}
            </TouchableOpacity>
          </View>
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
  speakToggle: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 60,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  recordingBanner: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
    alignItems: "center",
  },
  recordingText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  micBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
