import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import * as Speech from "expo-speech";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { normalizeSpeech } from "@/utils/sealionService";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: ActionResult | null;
  originalSpeech?: string;
}

interface ActionResult {
  type: string;
  query?: string;
  app?: string;
  name?: string;
  url?: string;
  time?: string;
  task?: string;
  date?: string;
  action?: string;
  message?: string;
  label?: string;
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

function getSpeechLang(lang: string): string {
  if (lang === "zh") return "zh-CN";
  if (lang === "ms") return "ms-MY";
  if (lang === "ta") return "ta-IN";
  return "en-SG";
}

/** Strip question marks for Tamil (TTS pronounces them as "question mark") */
function cleanTTS(text: string, lang: string): string {
  if (lang === "ta") return text.replace(/\?+/g, "").replace(/\s{2,}/g, " ").trim();
  return text;
}

function buildMapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

function buildYouTubeUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildSpotifyUrl(query: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

function buildGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function getTimeOfDayPrompt(lang: string): string | null {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const totalMins = h * 60 + m;

  type PromptSet = { morning: string; breakfast: string; activity1: string; lunch: string; activity2: string; dinner: string };
  const prompts: Record<string, PromptSet> = {
    en: {
      morning:   "Good morning ☀️ How are you feeling today? What would you like to do?",
      breakfast: "Good morning! Have you had breakfast yet? Remember to eat well today 😊",
      activity1: "Hi! What have you been doing this morning? Did you go for a walk?",
      lunch:     "Good afternoon! Have you eaten lunch? Remember to drink plenty of water 💧",
      activity2: "Good afternoon! How are you doing? Have you had a rest or gone for a walk today?",
      dinner:    "Good evening! Have you had dinner yet? I hope you had a wonderful day 🌙",
    },
    zh: {
      morning:   "早上好 ☀️ 您今天感觉怎么样？今天想做什么？",
      breakfast: "早上好！您吃早饭了吗？记得好好吃饭哦 😊",
      activity1: "您好！今天早上您在做什么？有没有出去散步？",
      lunch:     "下午好！您吃午饭了吗？记得多喝水 💧",
      activity2: "下午好！您感觉怎么样？今天有没有休息或者散步？",
      dinner:    "晚上好！您吃晚饭了吗？希望您今天过得愉快 🌙",
    },
    ms: {
      morning:   "Selamat pagi ☀️ Macam mana perasaan anda hari ini? Apa yang anda ingin lakukan?",
      breakfast: "Selamat pagi! Sudah makan pagi? Ingat untuk makan dengan baik 😊",
      activity1: "Hai! Apa yang anda buat pagi ini? Adakah anda berjalan-jalan?",
      lunch:     "Selamat tengahari! Sudah makan tengahari? Jangan lupa minum air 💧",
      activity2: "Selamat petang! Macam mana anda? Sudah berehat atau berjalan hari ini?",
      dinner:    "Selamat malam! Sudah makan malam? Semoga hari anda menyenangkan 🌙",
    },
    ta: {
      morning:   "காலை வணக்கம் ☀️ இன்று நீங்கள் எப்படி உணர்கிறீர்கள். இன்று என்ன செய்ய விரும்புகிறீர்கள்",
      breakfast: "காலை வணக்கம். காலை உணவு சாப்பிட்டீர்களா. நன்றாக சாப்பிடுவது முக்கியம் 😊",
      activity1: "வணக்கம். இன்று காலை நீங்கள் என்ன செய்தீர்கள். சிறிது நடந்தீர்களா",
      lunch:     "மதிய வணக்கம். மதிய உணவு சாப்பிட்டீர்களா. தண்ணீர் குடிக்க மறக்காதீர்கள் 💧",
      activity2: "மாலை வணக்கம். நீங்கள் எப்படி உணர்கிறீர்கள். இன்று ஓய்வெடுத்தீர்களா அல்லது நடந்தீர்களா",
      dinner:    "மாலை வணக்கம். இரவு உணவு சாப்பிட்டீர்களா. நல்ல நாளாக இருந்திருக்கும் 🌙",
    },
  };
  const set = prompts[lang] ?? prompts.en;
  if (totalMins >= 7*60 && totalMins < 8*60)   return set.morning;
  if (totalMins >= 8*60 && totalMins < 10*60)  return set.breakfast;
  if (totalMins >= 10*60 && totalMins < 12*60) return set.activity1;
  if (totalMins >= 12*60 && totalMins < 14*60) return set.lunch;
  if (totalMins >= 14*60 && totalMins < 17*60) return set.activity2;
  if (totalMins >= 17*60 && totalMins < 21*60) return set.dinner;
  return null;
}

/* ─── WAVEFORM BARS ─── */
const BAR_COUNT = 5;
const DELAYS_MS = [0, 110, 55, 165, 25];
const DURATIONS = [320, 280, 350, 300, 260];

function WaveformBars({ isActive, vadLevel }: { isActive: boolean; vadLevel: number }) {
  const anims = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))).current;
  const loopsRef = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    if (isActive) {
      loopsRef.current = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: DURATIONS[i], useNativeDriver: false }),
            Animated.timing(anim, { toValue: 0.15, duration: DURATIONS[i], useNativeDriver: false }),
          ])
        )
      );
      DELAYS_MS.forEach((d, i) => setTimeout(() => loopsRef.current[i]?.start(), d));
    } else {
      loopsRef.current.forEach((l) => l.stop());
      anims.forEach((a) => Animated.timing(a, { toValue: 0.15, duration: 180, useNativeDriver: false }).start());
    }
  }, [isActive, anims]);

  const maxH = 36;
  const minH = 5;
  const scale = 0.35 + Math.min(1, vadLevel) * 0.65;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, height: maxH }}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            borderRadius: 3,
            backgroundColor: "#E07B2A",
            height: anim.interpolate({
              inputRange: [0.15, 1],
              outputRange: [minH, maxH * scale],
            }),
          }}
        />
      ))}
    </View>
  );
}

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, isSpeechEnabled, emergencyContacts, recordActivity, addReminder, completeReminder, removeReminder, reminders, pendingWellbeingPrompt, consumeWellbeingPrompt } = useApp();
  const t = translations[language];

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [webSpeechSupported, setWebSpeechSupported] = useState(false);
  const [vadLevel, setVadLevel] = useState(0);
  const [noSpeechDetected, setNoSpeechDetected] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [pendingContactAction, setPendingContactAction] = useState<{
    mode: "call" | "whatsapp";
    contacts: EmergencyContact[];
  } | null>(null);

  const recordingRef = useRef<unknown>(null);
  const webRecognitionRef = useRef<unknown>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadAnimFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isStoppingRef = useRef(false);
  const hasSpokenRef = useRef(false);
  const hasShownWelcomeRef = useRef(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Show wellbeing/time-based prompt on first open
  useEffect(() => {
    if (hasShownWelcomeRef.current) return;
    hasShownWelcomeRef.current = true;

    // Priority 1: prompt from a tapped notification
    const fromNotif = consumeWellbeingPrompt();
    const prompt = fromNotif ?? getTimeOfDayPrompt(language);

    if (prompt) {
      const greeting: Message = { id: makeId(), role: "assistant", content: prompt, action: null };
      setMessages([greeting]);
      setTimeout(() => speakText(prompt), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const SR =
        (window as Record<string, unknown>).SpeechRecognition ||
        (window as Record<string, unknown>).webkitSpeechRecognition;
      setWebSpeechSupported(!!SR);
    }
    return () => {
      Speech.stop().catch(() => {});
      stopAllAudio();
    };
  }, []);

  /* ─── AUDIO CLEANUP ─── */
  function stopAllAudio() {
    if (vadAnimFrameRef.current) { cancelAnimationFrame(vadAnimFrameRef.current); vadAnimFrameRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null; }
    analyserRef.current = null;
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
  }

  /* ─── WEB AUDIO VAD ─── */
  async function startWebAudioAnalyser(): Promise<void> {
    if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVadLevel(Math.min(1, avg / 40));
        vadAnimFrameRef.current = requestAnimationFrame(loop);
      };
      vadAnimFrameRef.current = requestAnimationFrame(loop);
    } catch {}
  }

  /* ─── TTS ─── */
  const speakText = useCallback(async (text: string) => {
    if (!isSpeechEnabled) return;
    const clean = cleanTTS(text, language);
    await Speech.stop().catch(() => {});
    setIsSpeakingTTS(true);
    Speech.speak(clean, {
      language: getSpeechLang(language),
      rate: language === "ta" ? 0.85 : 0.9,
      pitch: 1.0,
      onDone: () => setIsSpeakingTTS(false),
      onError: () => setIsSpeakingTTS(false),
      onStopped: () => setIsSpeakingTTS(false),
    });
  }, [isSpeechEnabled, language]);

  const stopSpeaking = async () => {
    await Speech.stop().catch(() => {});
    setIsSpeakingTTS(false);
  };

  /* ─── ACTION EXECUTOR ─── */
  const executeAction = useCallback(async (action: ActionResult, contacts: EmergencyContact[]) => {
    const { type } = action;

    // Google Maps — directions mode (auto-open directions)
    if (type === "navigate_maps" && action.query) {
      const url = buildMapsDirectionsUrl(action.query);
      Linking.openURL("comgooglemaps://?daddr=" + encodeURIComponent(action.query) + "&directionsmode=driving")
        .catch(() => Linking.openURL(url).catch(() => {}));
      return;
    }

    if (type === "open_maps" && action.query) {
      Linking.openURL(buildMapsSearchUrl(action.query)).catch(() => {});
      return;
    }

    if (type === "open_youtube" && action.query) {
      Linking.openURL("youtube://results?search_query=" + encodeURIComponent(action.query))
        .catch(() => Linking.openURL(buildYouTubeUrl(action.query!)).catch(() => {}));
      return;
    }

    if (type === "open_spotify" && action.query) {
      Linking.openURL("spotify://search/" + encodeURIComponent(action.query))
        .catch(() => Linking.openURL(buildSpotifyUrl(action.query!)).catch(() => {}));
      return;
    }

    if (type === "google_search" && action.query) {
      Linking.openURL(buildGoogleSearchUrl(action.query)).catch(() => {});
      return;
    }

    if (type === "set_reminder" && action.time && action.task) {
      await addReminder({ time: action.time, task: action.task, date: action.date });
      router.push("/reminders");
      return;
    }

    if (type === "set_alarm" && action.time) {
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "android") {
        // Android — open system clock/alarm picker via intent
        Linking.openURL("intent://alarm/#Intent;scheme=android-app;end")
          .catch(() => Linking.openURL("intent:#Intent;action=android.intent.action.SET_ALARM;end")
          .catch(() => Linking.openURL("https://play.google.com/store/apps/details?id=com.google.android.deskclock").catch(() => {})));
      } else if (Platform.OS === "ios") {
        Linking.openURL("clock-alarm://").catch(() => Linking.openURL("com.apple.mobiletimer-display://").catch(() => {}));
      }
      return;
    }

    // Update reminder (mark done or cancel by voice)
    if (type === "update_reminder" && action.task) {
      const taskLower = (action.task ?? "").toLowerCase();
      const matched = reminders.find((r) =>
        r.task.toLowerCase().includes(taskLower) || taskLower.includes(r.task.toLowerCase().split(" ")[0])
      );
      if (matched) {
        if (action.action === "cancel") removeReminder(matched.id);
        else completeReminder(matched.id);
      }
      router.push("/reminders");
      return;
    }

    if (type === "open_app") {
      switch (action.app) {
        case "singpass":
          // Android uses intent URL; iOS uses scheme; web fallback
          if (Platform.OS === "android") {
            Linking.openURL("intent://sg.ndi.sp/#Intent;scheme=singpass;package=sg.ndi.sp;end")
              .catch(() => Linking.openURL("https://app.singpass.sg").catch(() => {}));
          } else {
            Linking.openURL("singpass://").catch(() =>
              Linking.openURL("https://app.singpass.sg").catch(() => {})
            );
          }
          break;
        case "whatsapp":
          Linking.openURL("whatsapp://").catch(() => Linking.openURL("https://www.whatsapp.com").catch(() => {}));
          break;
        case "youtube":
          Linking.openURL("youtube://").catch(() => Linking.openURL("https://www.youtube.com").catch(() => {}));
          break;
        case "googlemaps":
          Linking.openURL("comgooglemaps://").catch(() => Linking.openURL("https://maps.google.com").catch(() => {}));
          break;
        case "calendar":
          if (Platform.OS === "ios") Linking.openURL("calshow://").catch(() => {});
          else if (Platform.OS === "android") Linking.openURL("content://com.android.calendar/time/").catch(() => Linking.openURL("https://calendar.google.com").catch(() => {}));
          else Linking.openURL("https://calendar.google.com").catch(() => {});
          break;
        case "healthhub":
          Linking.openURL("https://www.healthhub.sg").catch(() => {});
          break;
        default:
          if (action.url) Linking.openURL(action.url).catch(() => {});
      }
      return;
    }

    if (type === "call_emergency") {
      Linking.openURL("tel:999").catch(() => {});
      return;
    }

    // WhatsApp with pre-filled message
    if (type === "whatsapp_message") {
      const targetName = (action.name ?? "").toLowerCase();
      const msgText = action.message ?? "";

      let matched: EmergencyContact | undefined;
      if (targetName) {
        matched =
          contacts.find((c) => c.name.toLowerCase() === targetName) ||
          contacts.find((c) => c.role.toLowerCase() === targetName) ||
          contacts.find((c) => c.name.toLowerCase().includes(targetName)) ||
          contacts.find((c) => targetName.includes(c.name.toLowerCase().split(" ")[0])) ||
          contacts.find((c) => targetName.includes(c.role));
      }

      if (matched) {
        const phone = matched.phone.replace(/\s+/g, "");
        const encoded = encodeURIComponent(msgText);
        Linking.openURL(`whatsapp://send?phone=${phone}&text=${encoded}`)
          .catch(() => Linking.openURL(`https://wa.me/${phone}?text=${encoded}`).catch(() => {}));
      } else if (contacts.length > 0) {
        setPendingContactAction({ mode: "whatsapp", contacts });
      }
      return;
    }

    if (type === "call_contact" || type === "whatsapp_contact") {
      const mode: "call" | "whatsapp" = type === "call_contact" ? "call" : "whatsapp";
      const targetName = (action.name ?? "").toLowerCase();

      let matched: EmergencyContact | undefined;
      if (targetName) {
        matched =
          contacts.find((c) => c.name.toLowerCase() === targetName) ||
          contacts.find((c) => c.role.toLowerCase() === targetName) ||
          contacts.find((c) => c.name.toLowerCase().includes(targetName)) ||
          contacts.find((c) => targetName.includes(c.role)) ||
          contacts.find((c) => targetName.includes(c.name.toLowerCase().split(" ")[0]));
      }

      if (matched) {
        const phone = matched.phone.replace(/\s+/g, "");
        // Auto-trigger — no confirmation alert needed
        if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (mode === "call") {
          Linking.openURL(`tel:${phone}`).catch(() => {});
        } else {
          Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() =>
            Linking.openURL(`https://wa.me/${phone}`).catch(() => {})
          );
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
  }, [addReminder, completeReminder, removeReminder, reminders, router]);

  /* ─── SEND MESSAGE ─── */
  const sendMessage = useCallback(async (text: string, originalSpeech?: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    recordActivity();
    const userMsg: Message = { id: makeId(), role: "user", content: trimmed, originalSpeech };
    setMessages((prev) => [userMsg, ...prev]);
    setInputText("");
    setIsSending(true);
    setNoSpeechDetected(false);
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const history = messages.slice(0, 8).reverse().map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${getApiBase()}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          language,
          contacts: emergencyContacts.map((c) => ({ name: c.name, phone: c.phone, role: c.role })),
          reminders: reminders.slice(0, 20).map((r) => ({ task: r.task, time: r.time, date: r.date, completedAt: r.completedAt })),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply: string; action: ActionResult | null };

      const assistantMsg: Message = { id: makeId(), role: "assistant", content: data.reply, action: data.action };
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
  }, [isSending, messages, speakText, language, emergencyContacts, reminders, executeAction, recordActivity]);

  /* ─── NORMALIZE + SEND (SEA-LION pipeline) ─── */
  const normalizeAndSend = useCallback(async (rawTranscript: string) => {
    const trimmed = rawTranscript.trim();
    if (!trimmed) return;
    setIsNormalizing(true);
    try {
      const result = await normalizeSpeech(trimmed);
      const original = result.changed ? trimmed : undefined;
      await sendMessage(result.normalized, original);
    } catch {
      try { await sendMessage(trimmed); } catch {}
    } finally {
      setIsNormalizing(false);
    }
  }, [sendMessage]);

  /* ─── WEB MIC ─── */
  const startWebMic = useCallback(async () => {
    if (typeof window === "undefined") return;
    const SR =
      (window as Record<string, unknown>).SpeechRecognition ||
      (window as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;

    isStoppingRef.current = false;
    hasSpokenRef.current = false;
    setNoSpeechDetected(false);
    setVadLevel(0);
    startWebAudioAnalyser();

    const recognition = new (SR as new () => SpeechRecognition)();
    recognition.lang = getSpeechLang(language);
    recognition.continuous = false;
    recognition.interimResults = false;
    webRecognitionRef.current = recognition;
    setIsRecording(true);

    maxTimerRef.current = setTimeout(() => { if (!isStoppingRef.current) recognition.stop(); }, 10000);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      hasSpokenRef.current = !!transcript.trim();
      if (transcript.trim()) {
        setIsRecording(false);
        setIsTranscribing(true);
        normalizeAndSend(transcript).catch(() => {}).finally(() => setIsTranscribing(false));
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      isStoppingRef.current = true;
      stopAllAudio();
      setIsRecording(false);
      setVadLevel(0);
      if ((e as { error?: string }).error === "no-speech") setNoSpeechDetected(true);
    };

    recognition.onend = () => {
      isStoppingRef.current = true;
      stopAllAudio();
      setIsRecording(false);
      setVadLevel(0);
      if (!hasSpokenRef.current) setNoSpeechDetected(true);
    };

    recognition.start();
  }, [language, normalizeAndSend]);

  const stopWebMic = useCallback(() => {
    isStoppingRef.current = true;
    if (webRecognitionRef.current) {
      (webRecognitionRef.current as SpeechRecognition).stop();
      webRecognitionRef.current = null;
    }
    stopAllAudio();
    setIsRecording(false);
    setVadLevel(0);
  }, []);

  /* ─── NATIVE MIC ─── */

  /** Core stop logic – always runs regardless of guard flag. */
  const doStopNativeRecording = useCallback(async (submitAudio: boolean) => {
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null; }
    setIsRecording(false);
    setVadLevel(0);

    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    if (!submitAudio) {
      // Cancelled by user — just stop and discard
      try {
        const { Audio } = await import("expo-av");
        const recording = rec as InstanceType<typeof Audio.Recording>;
        await recording.stopAndUnloadAsync().catch(() => {});
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
      } catch {}
      return;
    }

    setIsTranscribing(true);
    try {
      const { Audio } = await import("expo-av");
      const recording = rec as InstanceType<typeof Audio.Recording>;
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();

      if (!hasSpokenRef.current) { setNoSpeechDetected(true); return; }

      if (uri) {
        const formData = new FormData();
        formData.append("audio", { uri, type: "audio/m4a", name: "recording.m4a" } as unknown as Blob);
        formData.append("language", language);
        const res = await fetch(`${getApiBase()}/transcribe`, { method: "POST", body: formData });
        if (res.ok) {
          const data = (await res.json()) as { text: string };
          if (data.text?.trim()) {
            await normalizeAndSend(data.text);
          } else {
            setNoSpeechDetected(true);
          }
        }
      }
    } catch {
    } finally {
      setIsTranscribing(false);
    }
  }, [language, normalizeAndSend]);

  /** VAD / timer auto-stop — guarded so it only fires once. */
  const stopNativeMicAuto = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    await doStopNativeRecording(true);
  }, [doStopNativeRecording]);

  /** Manual stop from button press — always fires, regardless of guard. */
  const forceStopNativeMic = useCallback(async () => {
    isStoppingRef.current = true;
    await doStopNativeRecording(hasSpokenRef.current);
  }, [doStopNativeRecording]);

  const startNativeMic = async () => {
    try {
      const { Audio } = await import("expo-av");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      isStoppingRef.current = false;
      hasSpokenRef.current = false;
      setNoSpeechDetected(false);
      setVadLevel(0);

      const SILENCE_THRESHOLD_DB = -38;
      const SILENCE_DURATION_MS = 1600;
      const MAX_DURATION_MS = 10000;
      let lastSpeechTime = Date.now();
      const startTime = Date.now();

      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording || isStoppingRef.current) return;
        const metering = (status as { metering?: number }).metering ?? -160;
        const normalised = Math.max(0, Math.min(1, (metering + 60) / 60));
        setVadLevel(normalised);
        const now = Date.now();
        if (metering > SILENCE_THRESHOLD_DB) { hasSpokenRef.current = true; lastSpeechTime = now; }
        const silenceDuration = now - lastSpeechTime;
        const totalDuration = now - startTime;
        if ((hasSpokenRef.current && silenceDuration >= SILENCE_DURATION_MS && totalDuration > 600) || totalDuration >= MAX_DURATION_MS) {
          stopNativeMicAuto();
        }
      });

      recordingRef.current = recording;
      setIsRecording(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      maxTimerRef.current = setTimeout(() => stopNativeMicAuto(), 11000);
    } catch {}
  };

  const handleMicPress = () => {
    if (isRecording) {
      if (Platform.OS === "web") stopWebMic();
      else forceStopNativeMic().catch(() => {}); // uses the guard-free path so button always works
    } else {
      if (Platform.OS === "web") startWebMic().catch(() => {});
      else startNativeMic().catch(() => {});
    }
  };

  const showMicButton = Platform.OS !== "web" || webSpeechSupported;
  const micState: "transcribing" | "recording" | "idle" =
    isTranscribing ? "transcribing" : isRecording ? "recording" : "idle";

  /* ─── ACTION CHIP ─── */
  const renderActionChip = (action: ActionResult | null | undefined) => {
    if (!action) return null;
    type FeatherIcon = "map-pin" | "navigation" | "youtube" | "phone" | "message-circle" | "external-link" | "alert-circle" | "search" | "music" | "calendar" | "check-circle";
    let icon: FeatherIcon = "external-link";
    let label = "Action taken";
    if (action.type === "navigate_maps") { icon = "navigation"; label = `Directions to ${action.query ?? ""}`; }
    if (action.type === "open_maps") { icon = "map-pin"; label = `Maps: ${action.query ?? ""}`; }
    if (action.type === "open_youtube") { icon = "youtube"; label = `YouTube: ${action.query ?? ""}`; }
    if (action.type === "open_spotify") { icon = "music"; label = `Spotify: ${action.query ?? ""}`; }
    if (action.type === "google_search") { icon = "search"; label = `Search: ${action.query ?? ""}`; }
    if (action.type === "set_reminder") { icon = "calendar"; label = `Reminder set: ${action.task ?? ""}`; }
    if (action.type === "update_reminder") { icon = "check-circle"; label = action.action === "cancel" ? `Cancelled: ${action.task ?? ""}` : `Done: ${action.task ?? ""}`; }
    if (action.type === "call_contact") { icon = "phone"; label = `Calling ${action.name ?? "contact"}`; }
    if (action.type === "whatsapp_contact" || action.type === "whatsapp_message") { icon = "message-circle"; label = `WhatsApp: ${action.name ?? ""}`; }
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
          <View style={[
            styles.bubble,
            {
              backgroundColor: isUser ? colors.primary : colors.card,
              borderRadius: 18,
              borderBottomRightRadius: isUser ? 4 : 18,
              borderBottomLeftRadius: isUser ? 18 : 4,
              borderWidth: isUser ? 0 : 1.5,
              borderColor: colors.border,
            },
          ]}>
            <Text style={[styles.msgText, { color: isUser ? colors.primaryForeground : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
          {!isUser && renderActionChip(item.action)}
          {isUser && item.originalSpeech && (
            <View style={[styles.normNote, { backgroundColor: "#FFF0D6", borderRadius: 10 }]}>
              <Text style={[styles.normOrig, { color: colors.mutedForeground }]}>{`You said: "${item.originalSpeech}"`}</Text>
              <Text style={[styles.normInterp, { color: colors.primary }]}>{`Understood: "${item.content}"`}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {pendingContactAction && (
        <ContactPickerSheet
          visible={true}
          mode={pendingContactAction.mode}
          contacts={pendingContactAction.contacts}
          onSelect={(contact, mode) => {
            const phone = contact.phone.replace(/\s+/g, "");
            if (mode === "call") Linking.openURL(`tel:${phone}`).catch(() => {});
            else Linking.openURL(`whatsapp://send?phone=${phone}`).catch(() => Linking.openURL(`https://wa.me/${phone}`).catch(() => {}));
          }}
          onClose={() => setPendingContactAction(null)}
        />
      )}

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.muted, borderRadius: 12 }]} onPress={() => router.back()} activeOpacity={0.75}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.howCanIHelp}</Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: isSpeakingTTS ? colors.primary : colors.muted, borderRadius: 12 }]}
          onPress={isSpeakingTTS ? stopSpeaking : undefined}
          activeOpacity={0.75}
        >
          <Feather name={isSpeakingTTS ? "volume-x" : "volume-2"} size={20} color={isSpeakingTTS ? colors.primaryForeground : colors.mutedForeground} />
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
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{t.tapMic}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  {showMicButton
                    ? language === "zh" ? "试试说：提醒我8点吃药，或 播放周杰伦"
                      : language === "ms" ? "Cuba: Arahkan ke Jurong Point atau Mainkan muzik"
                      : language === "ta" ? "ஜூரோங் பாயிண்ட்க்கு வழி காட்டு அல்லது மருந்து நினைவூட்டல்"
                      : `Try: "Remind me to take medicine at 8pm" or "Call my son"`
                    : t.orTypeBelow}
                </Text>
              </View>
            ) : null
          }
        />

        {/* INPUT AREA */}
        <View style={[styles.inputArea, { paddingBottom: bottomPad + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {noSpeechDetected && micState === "idle" && (
            <View style={[styles.statusBanner, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statusBannerText, { color: colors.mutedForeground }]}>
                {language === "zh" ? "没有听到声音，请再试一次"
                  : language === "ms" ? "Tiada suara dikesan, sila cuba lagi"
                  : language === "ta" ? "குரல் கேட்கவில்லை, மீண்டும் முயற்சிக்கவும்"
                  : "I didn't hear anything, please try again"}
              </Text>
            </View>
          )}

          {micState === "transcribing" && !isNormalizing && (
            <View style={[styles.statusBanner, { backgroundColor: colors.muted }]}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.statusBannerText, { color: colors.mutedForeground }]}>{t.transcribing}</Text>
            </View>
          )}

          {isNormalizing && (
            <View style={[styles.statusBanner, { backgroundColor: "#FFF0D6", borderRadius: 10 }]}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.statusBannerText, { color: colors.primary }]}>
                {language === "zh" ? "正在理解您的语言..."
                  : language === "ms" ? "Memahami percakapan anda..."
                  : language === "ta" ? "உங்கள் பேச்சை புரிந்துகொள்கிறது..."
                  : "Understanding you..."}
              </Text>
            </View>
          )}

          {showMicButton && (
            <View style={styles.micSection}>
              {micState === "recording" && <WaveformBars isActive={true} vadLevel={vadLevel} />}
              <TouchableOpacity
                style={[
                  styles.bigMicBtn,
                  {
                    backgroundColor: micState === "recording" ? colors.destructive : micState === "transcribing" ? colors.muted : colors.primary,
                    shadowColor: micState === "recording" ? colors.destructive : colors.primary,
                    transform: [{ scale: micState === "recording" ? 1.06 : 1 }],
                  },
                ]}
                onPress={handleMicPress}
                activeOpacity={0.85}
                disabled={micState === "transcribing"}
              >
                {micState === "transcribing" ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <Feather name={micState === "recording" ? "square" : "mic"} size={42} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={[styles.micLabel, { color: micState === "recording" ? colors.destructive : colors.mutedForeground }]}>
                {micState === "recording" ? t.listening : micState === "transcribing" ? t.transcribing : t.tapMic}
              </Text>
            </View>
          )}

          {(Platform.OS === "web" || showKeyboard) && (
            <View style={styles.textRow}>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.muted, color: colors.foreground, borderRadius: 14 }]}
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
                style={[styles.sendBtn, { backgroundColor: inputText.trim() && !isSending ? colors.primary : colors.muted, borderRadius: 14 }]}
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
              <Feather name={showKeyboard ? "mic" : "edit-2"} size={18} color={colors.mutedForeground} />
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  headerBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 22, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 12, flexGrow: 1 },
  msgRow: { flexDirection: "row", marginBottom: 14 },
  msgWrap: { maxWidth: "85%", gap: 4 },
  bubble: { paddingHorizontal: 18, paddingVertical: 14 },
  msgText: { fontSize: 20, fontFamily: "Inter_400Regular", lineHeight: 30 },
  actionChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, alignSelf: "flex-start" },
  actionChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  typingRow: { flexDirection: "row", justifyContent: "flex-start", marginBottom: 10 },
  typingBubble: { paddingHorizontal: 20, paddingVertical: 14, borderWidth: 1.5 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 50, gap: 14 },
  emptyTitle: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 17, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32, lineHeight: 25 },
  inputArea: { borderTopWidth: 1, paddingTop: 14, paddingHorizontal: 20, gap: 12 },
  statusBanner: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  statusBannerText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  micSection: { alignItems: "center", gap: 10, paddingVertical: 4 },
  bigMicBtn: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  micLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  textRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  textInput: { flex: 1, minHeight: 54, maxHeight: 130, paddingHorizontal: 16, paddingVertical: 14, fontSize: 18, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  keyboardToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 4 },
  keyboardToggleText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  normNote: { paddingHorizontal: 12, paddingVertical: 8, gap: 3 },
  normOrig: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  normInterp: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
