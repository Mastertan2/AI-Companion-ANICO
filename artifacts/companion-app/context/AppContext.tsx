import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { type Language } from "@/constants/translations";

export type ContactRole = "child" | "friend" | "doctor";
export type PrivacyKey = "location" | "checkInStatus" | "emergencyAlerts" | "appActivity" | "reminders";
export type CareStatus = "ok" | "no_response" | "emergency";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  role: ContactRole;
}

export interface PrivacyPreferences {
  location: boolean;
  checkInStatus: boolean;
  emergencyAlerts: boolean;
  appActivity: boolean;
  reminders: boolean;
}

export interface Reminder {
  id: string;
  task: string;
  time: string;
  createdAt: string;
  completedAt?: string;
}

export interface CareAlert {
  id: string;
  message: string;
  createdAt: string;
  status: "sent" | "not_configured" | "failed";
}

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: EmergencyContact) => void;
  updateEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (id: string) => void;
  privacyPreferences: PrivacyPreferences;
  updatePrivacyPreferences: (prefs: PrivacyPreferences) => void;
  reminders: Reminder[];
  addReminder: (reminder: Omit<Reminder, "id" | "createdAt">) => Promise<Reminder>;
  removeReminder: (id: string) => void;
  completeReminder: (id: string) => void;
  isCheckInDue: boolean;
  checkInQuestion: string;
  dismissCheckIn: () => void;
  callForHelp: () => void;
  alertChildren: (message: string, emergency?: boolean) => Promise<void>;
  lastCheckInTime: Date | null;
  isSpeechEnabled: boolean;
  toggleSpeech: () => void;
  recordActivity: () => void;
  inactivityMinutesLeft: number | null;
  careStatus: CareStatus;
  recentAlerts: CareAlert[];
  userName: string;
  setUserName: (name: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  language: "companion_language",
  contacts: "companion_contacts",
  privacy: "companion_privacy",
  reminders: "companion_reminders",
  alerts: "companion_alerts",
  userName: "companion_user_name",
  lastCheckIn: "companion_last_checkin",
  checkInDueSince: "companion_checkin_due_since",
  speechEnabled: "companion_speech",
  lastActivity: "companion_last_activity",
};

const CHECK_IN_INTERVAL_MS = 3 * 60 * 60 * 1000;
const NO_RESPONSE_ALERT_MS = 6 * 60 * 60 * 1000;
const CHECK_IN_NOTIF_ID = "companion_checkin";

const DEFAULT_PRIVACY: PrivacyPreferences = {
  location: false,
  checkInStatus: true,
  emergencyAlerts: true,
  appActivity: false,
  reminders: false,
};

const CHECK_IN_QUESTIONS: Record<Language, string[]> = {
  en: ["Hope your day has been good 😊", "Have you eaten?", "Did you drink water?", "Have you taken a short walk?"],
  zh: ["希望您今天过得不错 😊", "您吃饭了吗？", "您喝水了吗？", "您有走一走吗？"],
  ms: ["Semoga hari anda baik 😊", "Sudah makan?", "Sudah minum air?", "Ada berjalan sebentar?"],
  ta: ["உங்கள் நாள் நன்றாக இருந்திருக்கும் 😊", "நீங்கள் சாப்பிட்டீர்களா?", "தண்ணீர் குடித்தீர்களா?", "சிறிது நடந்தீர்களா?"],
};

if (Platform.OS !== "web") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
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

function normalizeStoredContacts(input: unknown): EmergencyContact[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((c) => c && typeof c === "object" && "name" in c && "phone" in c)
    .map((c) => {
      const item = c as Partial<EmergencyContact>;
      const name = String(item.name ?? "Family Member");
      const lower = name.toLowerCase();
      const role: ContactRole = item.role ?? (lower.includes("doctor") ? "doctor" : lower.includes("friend") ? "friend" : "child");
      return { id: item.id ?? makeId(), name, phone: String(item.phone ?? ""), role };
    });
}

async function scheduleCheckInNotification(lang: Language, delayMs: number) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(CHECK_IN_NOTIF_ID).catch(() => {});
    const titles: Record<Language, string> = {
      en: "Time to check in 👋",
      zh: "打卡时间到了 👋",
      ms: "Masa untuk daftar masuk 👋",
      ta: "செக்-இன் நேரம் வந்தது 👋",
    };
    const bodies: Record<Language, string> = {
      en: "How are you feeling? Tap to let your family know you're okay.",
      zh: "您感觉怎么样？点击告诉家人您一切安好。",
      ms: "Bagaimana perasaan anda? Ketik untuk memberitahu keluarga anda.",
      ta: "நீங்கள் எப்படி இருக்கிறீர்கள்? உங்கள் குடும்பத்தினருக்கு தெரியப்படுத்த தட்டவும்.",
    };
    await Notifications.scheduleNotificationAsync({
      identifier: CHECK_IN_NOTIF_ID,
      content: {
        title: titles[lang] ?? titles.en,
        body: bodies[lang] ?? bodies.en,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.floor(delayMs / 1000)) },
    });
  } catch {}
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>(DEFAULT_PRIVACY);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<CareAlert[]>([]);
  const [userName, setUserNameState] = useState("your loved one");
  const [isCheckInDue, setIsCheckInDue] = useState(false);
  const [checkInQuestion, setCheckInQuestion] = useState(CHECK_IN_QUESTIONS.en[0]);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [inactivityMinutesLeft, setInactivityMinutesLeft] = useState<number | null>(null);
  const [careStatus, setCareStatus] = useState<CareStatus>("ok");

  const checkInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contactsRef = useRef<EmergencyContact[]>([]);
  const privacyRef = useRef<PrivacyPreferences>(DEFAULT_PRIVACY);
  const languageRef = useRef<Language>("en");
  const userNameRef = useRef("your loved one");
  const lastCheckInRef = useRef<Date | null>(null);
  const lastActivityRef = useRef(Date.now());
  const isCheckInDueRef = useRef(false);

  useEffect(() => { contactsRef.current = emergencyContacts; }, [emergencyContacts]);
  useEffect(() => { privacyRef.current = privacyPreferences; }, [privacyPreferences]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { userNameRef.current = userName; }, [userName]);
  useEffect(() => { lastCheckInRef.current = lastCheckInTime; }, [lastCheckInTime]);
  useEffect(() => { isCheckInDueRef.current = isCheckInDue; }, [isCheckInDue]);

  useEffect(() => {
    loadStoredData();
    if (Platform.OS !== "web") setupNotifications();

    // AppState listener: re-evaluate check-in when app returns to foreground
    if (Platform.OS !== "web") {
      const sub = AppState.addEventListener("change", (state) => {
        if (state === "active") {
          reEvaluateCheckIn();
        }
      });
      return () => {
        sub.remove();
        if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
        if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
        if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);
      };
    }

    return () => {
      if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
      if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
      if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);
    };
  }, []);

  // Re-check timing when returning to foreground (native only)
  const reEvaluateCheckIn = useCallback(async () => {
    if (isCheckInDueRef.current) return; // already showing modal
    try {
      const [storedCheckIn, storedDueSince] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.lastCheckIn),
        AsyncStorage.getItem(STORAGE_KEYS.checkInDueSince),
      ]);
      const now = Date.now();
      if (storedCheckIn) {
        const lastTime = new Date(storedCheckIn).getTime();
        const elapsed = now - lastTime;
        if (elapsed >= CHECK_IN_INTERVAL_MS) {
          // Check-in overdue — show modal
          const lang = languageRef.current;
          const choices = CHECK_IN_QUESTIONS[lang] ?? CHECK_IN_QUESTIONS.en;
          setCheckInQuestion(choices[Math.floor(Math.random() * choices.length)]);
          setIsCheckInDue(true);
          isCheckInDueRef.current = true;
          setCareStatus("no_response");
          const dueSince = storedDueSince ? parseInt(storedDueSince) : now - (elapsed - CHECK_IN_INTERVAL_MS);
          const overdue = now - dueSince;
          if (overdue >= NO_RESPONSE_ALERT_MS) {
            triggerAutoAlert();
          } else {
            scheduleNoResponseAlert(NO_RESPONSE_ALERT_MS - overdue);
          }
        } else {
          // Still time left — reset the timer for remaining duration
          if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
          scheduleCheckIn(CHECK_IN_INTERVAL_MS - elapsed);
        }
      }
    } catch {}
  }, []);

  const addAlert = useCallback((alert: CareAlert) => {
    setRecentAlerts((prev) => {
      const updated = [alert, ...prev].slice(0, 20);
      AsyncStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const scheduleNoResponseAlert = useCallback((delayMs: number) => {
    if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
    if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);

    const endTime = Date.now() + Math.max(0, delayMs);
    const updateRemaining = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setInactivityMinutesLeft(Math.ceil(remaining / 60000));
    };
    updateRemaining();
    inactivityTickRef.current = setInterval(updateRemaining, 60000);

    autoAlertTimerRef.current = setTimeout(() => {
      triggerAutoAlert();
    }, Math.max(0, delayMs));
  }, []);

  const scheduleCheckIn = useCallback((delayMs: number) => {
    if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
    checkInTimerRef.current = setTimeout(() => {
      const lang = languageRef.current;
      const choices = CHECK_IN_QUESTIONS[lang] ?? CHECK_IN_QUESTIONS.en;
      setCheckInQuestion(choices[Math.floor(Math.random() * choices.length)]);
      setIsCheckInDue(true);
      isCheckInDueRef.current = true;
      setCareStatus("no_response");
      const dueSince = Date.now();
      AsyncStorage.setItem(STORAGE_KEYS.checkInDueSince, dueSince.toString()).catch(() => {});
      scheduleNoResponseAlert(NO_RESPONSE_ALERT_MS);
      if (Platform.OS !== "web") {
        scheduleCheckInNotification(lang, NO_RESPONSE_ALERT_MS);
      }
    }, Math.max(0, delayMs));

    // Also schedule a local notification as a backup trigger for native
    if (Platform.OS !== "web") {
      scheduleCheckInNotification(languageRef.current, delayMs);
    }
  }, [scheduleNoResponseAlert]);

  const loadStoredData = async () => {
    try {
      const [storedLang, storedContacts, storedPrivacy, storedReminders, storedAlerts, storedName, storedCheckIn, storedDueSince, storedSpeech, storedActivity] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.language),
        AsyncStorage.getItem(STORAGE_KEYS.contacts),
        AsyncStorage.getItem(STORAGE_KEYS.privacy),
        AsyncStorage.getItem(STORAGE_KEYS.reminders),
        AsyncStorage.getItem(STORAGE_KEYS.alerts),
        AsyncStorage.getItem(STORAGE_KEYS.userName),
        AsyncStorage.getItem(STORAGE_KEYS.lastCheckIn),
        AsyncStorage.getItem(STORAGE_KEYS.checkInDueSince),
        AsyncStorage.getItem(STORAGE_KEYS.speechEnabled),
        AsyncStorage.getItem(STORAGE_KEYS.lastActivity),
      ]);

      if (storedLang) {
        setLanguageState(storedLang as Language);
        languageRef.current = storedLang as Language;
      }
      if (storedContacts) {
        const parsed = normalizeStoredContacts(JSON.parse(storedContacts));
        setEmergencyContacts(parsed);
        contactsRef.current = parsed;
      }
      if (storedPrivacy) {
        const parsed = { ...DEFAULT_PRIVACY, ...JSON.parse(storedPrivacy) };
        setPrivacyPreferences(parsed);
        privacyRef.current = parsed;
      }
      if (storedReminders) setReminders(JSON.parse(storedReminders));
      if (storedAlerts) setRecentAlerts(JSON.parse(storedAlerts));
      if (storedName) {
        setUserNameState(storedName);
        userNameRef.current = storedName;
      }
      if (storedSpeech !== null) setIsSpeechEnabled(storedSpeech === "true");

      const now = Date.now();
      const lastActivityMs = storedActivity ? parseInt(storedActivity) : now;
      lastActivityRef.current = lastActivityMs;

      if (storedCheckIn) {
        const lastTime = new Date(storedCheckIn);
        setLastCheckInTime(lastTime);
        lastCheckInRef.current = lastTime;
        const elapsed = now - lastTime.getTime();
        if (elapsed >= CHECK_IN_INTERVAL_MS) {
          const lang = languageRef.current;
          const choices = CHECK_IN_QUESTIONS[lang] ?? CHECK_IN_QUESTIONS.en;
          setCheckInQuestion(choices[Math.floor(Math.random() * choices.length)]);
          setIsCheckInDue(true);
          isCheckInDueRef.current = true;
          setCareStatus("no_response");
          const dueSince = storedDueSince ? parseInt(storedDueSince) : now - (elapsed - CHECK_IN_INTERVAL_MS);
          await AsyncStorage.setItem(STORAGE_KEYS.checkInDueSince, dueSince.toString()).catch(() => {});
          const overdue = now - dueSince;
          if (overdue >= NO_RESPONSE_ALERT_MS) triggerAutoAlert();
          else scheduleNoResponseAlert(NO_RESPONSE_ALERT_MS - overdue);
        } else {
          setCareStatus("ok");
          const remaining = CHECK_IN_INTERVAL_MS - elapsed;
          scheduleCheckIn(remaining);
          setInactivityMinutesLeft(null);
        }
      } else {
        scheduleCheckIn(CHECK_IN_INTERVAL_MS);
      }
    } catch {}
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") return;
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("checkin", {
          name: "Check-In Reminders",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
        });
      }
    } catch {}
  };

  async function triggerAutoAlert() {
    const name = userNameRef.current;
    await sendCareAlert(`Hi, I haven't heard from ${name} for a while. Please check on them.`, true);
  }

  const buildPrivacyData = useCallback(() => {
    const prefs = privacyRef.current;
    const data: Record<string, unknown> = {};
    if (prefs.checkInStatus) data.checkInStatus = lastCheckInRef.current ? lastCheckInRef.current.toISOString() : null;
    if (prefs.appActivity) data.lastActivity = new Date(lastActivityRef.current).toISOString();
    if (prefs.emergencyAlerts) data.status = careStatus;
    if (prefs.reminders) data.reminders = reminders.map((r) => ({ task: r.task, time: r.time, completed: !!r.completedAt }));
    if (prefs.location) data.location = "Location sharing enabled on this device";
    return data;
  }, [careStatus, reminders]);

  const sendCareAlert = useCallback(async (message: string, emergency = false) => {
    const childContacts = contactsRef.current.filter((c) => c.role === "child");
    setCareStatus(emergency ? "emergency" : "no_response");
    if (!privacyRef.current.emergencyAlerts && emergency) return;

    const alertBase: CareAlert = { id: makeId(), message, createdAt: new Date().toISOString(), status: "failed" };
    if (childContacts.length === 0) {
      addAlert({ ...alertBase, status: "failed" });
      return;
    }

    try {
      const res = await fetch(`${getApiBase()}/alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: userNameRef.current,
          message,
          contacts: childContacts.map((c) => ({ name: c.name, phone: c.phone, role: c.role })),
          privacy: privacyRef.current,
          includedData: buildPrivacyData(),
        }),
      });
      if (res.ok) {
        addAlert({ ...alertBase, status: "sent" });
        return;
      }
      if (res.status === 503) addAlert({ ...alertBase, status: "not_configured" });
      else addAlert({ ...alertBase, status: "failed" });
    } catch {
      addAlert({ ...alertBase, status: "failed" });
    }

    const phone = childContacts[0].phone.replace(/\s+/g, "");
    const encoded = encodeURIComponent(message);
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${encoded}`).catch(() =>
      Linking.openURL(`sms:${phone}?body=${encoded}`).catch(() => {})
    );
  }, [addAlert, buildPrivacyData]);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    AsyncStorage.setItem(STORAGE_KEYS.lastActivity, now.toString()).catch(() => {});
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    languageRef.current = lang;
    await AsyncStorage.setItem(STORAGE_KEYS.language, lang).catch(() => {});
  }, []);

  const addEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    setEmergencyContacts((prev) => {
      const updated = [...prev, { ...contact, role: contact.role ?? "child" }];
      contactsRef.current = updated;
      AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const updateEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    setEmergencyContacts((prev) => {
      const updated = prev.map((c) => (c.id === contact.id ? contact : c));
      contactsRef.current = updated;
      AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeEmergencyContact = useCallback(async (id: string) => {
    setEmergencyContacts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      contactsRef.current = updated;
      AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const updatePrivacyPreferences = useCallback(async (prefs: PrivacyPreferences) => {
    setPrivacyPreferences(prefs);
    privacyRef.current = prefs;
    await AsyncStorage.setItem(STORAGE_KEYS.privacy, JSON.stringify(prefs)).catch(() => {});
  }, []);

  const addReminder = useCallback(async (reminder: Omit<Reminder, "id" | "createdAt">) => {
    const next: Reminder = { id: makeId(), createdAt: new Date().toISOString(), ...reminder };
    setReminders((prev) => {
      const updated = [next, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
    if (Platform.OS !== "web") {
      try {
        const [hours, minutes] = next.time.split(":").map(Number);
        const trigger = new Date();
        trigger.setHours(hours || 0, minutes || 0, 0, 0);
        if (trigger.getTime() <= Date.now()) trigger.setDate(trigger.getDate() + 1);
        await Notifications.scheduleNotificationAsync({
          content: { title: "Reminder", body: next.task, channelId: "checkin" },
          trigger: trigger as unknown as Notifications.NotificationTriggerInput,
        });
      } catch {}
    }
    return next;
  }, []);

  const removeReminder = useCallback((id: string) => {
    setReminders((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const completeReminder = useCallback((id: string) => {
    setReminders((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, completedAt: new Date().toISOString() } : r));
      AsyncStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const dismissCheckIn = useCallback(async () => {
    const now = new Date();
    setIsCheckInDue(false);
    isCheckInDueRef.current = false;
    setCareStatus("ok");
    setInactivityMinutesLeft(null);
    setLastCheckInTime(now);
    lastCheckInRef.current = now;
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastCheckIn, now.toISOString()],
      [STORAGE_KEYS.checkInDueSince, ""],
    ]).catch(() => {});
    if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
    if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);
    scheduleCheckIn(CHECK_IN_INTERVAL_MS);
    recordActivity();
  }, [scheduleCheckIn, recordActivity]);

  const callForHelp = useCallback(() => {
    setIsCheckInDue(false);
    isCheckInDueRef.current = false;
    setCareStatus("emergency");
    const now = new Date();
    setLastCheckInTime(now);
    AsyncStorage.setItem(STORAGE_KEYS.lastCheckIn, now.toISOString()).catch(() => {});
    scheduleCheckIn(CHECK_IN_INTERVAL_MS);
    recordActivity();
    sendCareAlert("I need help. Please check on me now.", true);
  }, [scheduleCheckIn, recordActivity, sendCareAlert]);

  const alertChildren = useCallback((message: string, emergency = false) => sendCareAlert(message, emergency), [sendCareAlert]);

  const toggleSpeech = useCallback(async () => {
    setIsSpeechEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.speechEnabled, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const setUserName = useCallback((name: string) => {
    const value = name.trim() || "your loved one";
    setUserNameState(value);
    userNameRef.current = value;
    AsyncStorage.setItem(STORAGE_KEYS.userName, value).catch(() => {});
  }, []);

  return (
    <AppContext.Provider value={{
      language, setLanguage, emergencyContacts, addEmergencyContact, updateEmergencyContact, removeEmergencyContact,
      privacyPreferences, updatePrivacyPreferences, reminders, addReminder, removeReminder, completeReminder,
      isCheckInDue, checkInQuestion, dismissCheckIn, callForHelp, alertChildren, lastCheckInTime,
      isSpeechEnabled, toggleSpeech, recordActivity, inactivityMinutesLeft, careStatus, recentAlerts, userName, setUserName,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
