import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { type Language } from "@/constants/translations";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  emergencyContacts: EmergencyContact[];
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (id: string) => void;
  isCheckInDue: boolean;
  dismissCheckIn: () => void;
  callForHelp: () => void;
  alertChildren: (message: string) => void;
  lastCheckInTime: Date | null;
  isSpeechEnabled: boolean;
  toggleSpeech: () => void;
  recordActivity: () => void;
  inactivityMinutesLeft: number | null;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  language: "companion_language",
  contacts: "companion_contacts",
  lastCheckIn: "companion_last_checkin",
  speechEnabled: "companion_speech",
  lastActivity: "companion_last_activity",
};

const CHECK_IN_INTERVAL_MS = 3 * 60 * 60 * 1000;
const INACTIVITY_ALERT_MS = 12 * 60 * 60 * 1000;

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const AUTO_ALERT_MESSAGES: Record<Language, string> = {
  en: "URGENT: This is an automatic alert from the AI Companion app. Your family member has not used their phone or checked in for over 12 hours. Please check on them immediately.",
  zh: "紧急：这是AI伴侣应用的自动提醒。您的家人已超过12小时未使用手机或签到。请立即查看。",
  ms: "URGENT: Ini adalah amaran automatik dari aplikasi AI Companion. Ahli keluarga anda tidak menggunakan telefon atau daftar masuk selama lebih 12 jam. Sila semak segera.",
  ta: "அவசரம்: இது AI Companion பயன்பாட்டின் தானியங்கி எச்சரிக்கை. உங்கள் குடும்ப உறுப்பினர் 12 மணி நேரத்திற்கும் மேலாக தொலைபேசியை பயன்படுத்தவில்லை. உடனடியாக சரிபார்க்கவும்.",
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isCheckInDue, setIsCheckInDue] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [inactivityMinutesLeft, setInactivityMinutesLeft] = useState<number | null>(null);

  const checkInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contactsRef = useRef<EmergencyContact[]>([]);
  const languageRef = useRef<Language>("en");

  useEffect(() => {
    contactsRef.current = emergencyContacts;
  }, [emergencyContacts]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    loadStoredData();
    if (Platform.OS !== "web") setupNotifications();
    return () => {
      if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
      if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
      if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);
    };
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedLang, storedContacts, storedCheckIn, storedSpeech, storedActivity] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.contacts),
          AsyncStorage.getItem(STORAGE_KEYS.lastCheckIn),
          AsyncStorage.getItem(STORAGE_KEYS.speechEnabled),
          AsyncStorage.getItem(STORAGE_KEYS.lastActivity),
        ]);

      if (storedLang) {
        setLanguageState(storedLang as Language);
        languageRef.current = storedLang as Language;
      }
      if (storedContacts) {
        const parsed = JSON.parse(storedContacts);
        setEmergencyContacts(parsed);
        contactsRef.current = parsed;
      }
      if (storedSpeech !== null) setIsSpeechEnabled(storedSpeech === "true");

      if (storedCheckIn) {
        const lastTime = new Date(storedCheckIn);
        setLastCheckInTime(lastTime);
        const elapsed = Date.now() - lastTime.getTime();
        if (elapsed >= CHECK_IN_INTERVAL_MS) {
          setIsCheckInDue(true);
        } else {
          scheduleCheckIn(CHECK_IN_INTERVAL_MS - elapsed);
        }
      } else {
        scheduleCheckIn(CHECK_IN_INTERVAL_MS);
      }

      const now = Date.now();
      const lastActivityMs = storedActivity ? parseInt(storedActivity) : now;
      const activityElapsed = now - lastActivityMs;

      if (activityElapsed >= INACTIVITY_ALERT_MS) {
        triggerAutoAlert();
      } else {
        scheduleAutoAlert(INACTIVITY_ALERT_MS - activityElapsed);
      }

      await AsyncStorage.setItem(STORAGE_KEYS.lastActivity, now.toString()).catch(() => {});
    } catch {
    }
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
    } catch {
    }
  };

  const scheduleCheckIn = useCallback((delayMs: number) => {
    if (checkInTimerRef.current) clearTimeout(checkInTimerRef.current);
    checkInTimerRef.current = setTimeout(() => {
      setIsCheckInDue(true);
      if (Platform.OS !== "web") scheduleCheckInNotification();
    }, delayMs);
  }, []);

  const scheduleAutoAlert = useCallback((delayMs: number) => {
    if (autoAlertTimerRef.current) clearTimeout(autoAlertTimerRef.current);
    if (inactivityTickRef.current) clearInterval(inactivityTickRef.current);

    const endTime = Date.now() + delayMs;

    inactivityTickRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setInactivityMinutesLeft(Math.ceil(remaining / 60000));
      if (remaining === 0 && inactivityTickRef.current) {
        clearInterval(inactivityTickRef.current);
      }
    }, 60000);

    setInactivityMinutesLeft(Math.ceil(delayMs / 60000));

    autoAlertTimerRef.current = setTimeout(() => {
      triggerAutoAlert();
    }, delayMs);
  }, []);

  const triggerAutoAlert = useCallback(() => {
    const contacts = contactsRef.current;
    const lang = languageRef.current;
    const message = AUTO_ALERT_MESSAGES[lang] || AUTO_ALERT_MESSAGES.en;

    if (contacts.length > 0) {
      const phone = contacts[0].phone.replace(/\s+/g, "");
      const encoded = encodeURIComponent(message);
      Linking.openURL(`whatsapp://send?phone=${phone}&text=${encoded}`).catch(() =>
        Linking.openURL(`sms:${phone}?body=${encoded}`).catch(() =>
          Linking.openURL(`tel:${phone}`).catch(() => {})
        )
      );
    }

    if (Platform.OS !== "web") {
      Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Auto-alert sent",
          body: "Your family has been notified. You haven't been active for 12 hours.",
          channelId: "checkin",
        },
        trigger: null,
      }).catch(() => {});
    }
  }, []);

  const scheduleCheckInNotification = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to check in!",
          body: "Tap here to let us know you're okay.",
          channelId: "checkin",
        },
        trigger: null,
      });
    } catch {
    }
  };

  const recordActivity = useCallback(() => {
    const now = Date.now();
    AsyncStorage.setItem(STORAGE_KEYS.lastActivity, now.toString()).catch(() => {});
    scheduleAutoAlert(INACTIVITY_ALERT_MS);
  }, [scheduleAutoAlert]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    languageRef.current = lang;
    await AsyncStorage.setItem(STORAGE_KEYS.language, lang).catch(() => {});
  }, []);

  const addEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    setEmergencyContacts((prev) => {
      const updated = [...prev, contact];
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

  const dismissCheckIn = useCallback(async () => {
    const now = new Date();
    setIsCheckInDue(false);
    setLastCheckInTime(now);
    await AsyncStorage.setItem(STORAGE_KEYS.lastCheckIn, now.toISOString()).catch(() => {});
    scheduleCheckIn(CHECK_IN_INTERVAL_MS);
    recordActivity();
  }, [scheduleCheckIn, recordActivity]);

  const callForHelp = useCallback(() => {
    setIsCheckInDue(false);
    const now = new Date();
    setLastCheckInTime(now);
    AsyncStorage.setItem(STORAGE_KEYS.lastCheckIn, now.toISOString()).catch(() => {});
    scheduleCheckIn(CHECK_IN_INTERVAL_MS);
    recordActivity();
  }, [scheduleCheckIn, recordActivity]);

  const alertChildren = useCallback((message: string) => {
    setEmergencyContacts((contacts) => {
      if (contacts.length > 0) {
        const phone = contacts[0].phone.replace(/\s+/g, "");
        const encoded = encodeURIComponent(message);
        Linking.openURL(`whatsapp://send?phone=${phone}&text=${encoded}`).catch(() =>
          Linking.openURL(`sms:${phone}?body=${encoded}`).catch(() =>
            Linking.openURL(`tel:${phone}`).catch(() => {})
          )
        );
      } else {
        Linking.openURL("tel:999").catch(() => {});
      }
      return contacts;
    });
  }, []);

  const toggleSpeech = useCallback(async () => {
    setIsSpeechEnabled((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.speechEnabled, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        emergencyContacts,
        addEmergencyContact,
        removeEmergencyContact,
        isCheckInDue,
        dismissCheckIn,
        callForHelp,
        alertChildren,
        lastCheckInTime,
        isSpeechEnabled,
        toggleSpeech,
        recordActivity,
        inactivityMinutesLeft,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
