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
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  language: "companion_language",
  contacts: "companion_contacts",
  lastCheckIn: "companion_last_checkin",
  speechEnabled: "companion_speech",
};

const CHECK_IN_INTERVAL_MS = 3 * 60 * 60 * 1000;

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

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isCheckInDue, setIsCheckInDue] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState<Date | null>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const checkInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadStoredData();
    if (Platform.OS !== "web") setupNotifications();
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedLang, storedContacts, storedCheckIn, storedSpeech] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.contacts),
          AsyncStorage.getItem(STORAGE_KEYS.lastCheckIn),
          AsyncStorage.getItem(STORAGE_KEYS.speechEnabled),
        ]);

      if (storedLang) setLanguageState(storedLang as Language);
      if (storedContacts) setEmergencyContacts(JSON.parse(storedContacts));
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

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem(STORAGE_KEYS.language, lang).catch(() => {});
  }, []);

  const addEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    setEmergencyContacts((prev) => {
      const updated = [...prev, contact];
      AsyncStorage.setItem(STORAGE_KEYS.contacts, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const removeEmergencyContact = useCallback(async (id: string) => {
    setEmergencyContacts((prev) => {
      const updated = prev.filter((c) => c.id !== id);
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
  }, [scheduleCheckIn]);

  const callForHelp = useCallback(() => {
    setIsCheckInDue(false);
    const now = new Date();
    setLastCheckInTime(now);
    AsyncStorage.setItem(STORAGE_KEYS.lastCheckIn, now.toISOString()).catch(() => {});
    scheduleCheckIn(CHECK_IN_INTERVAL_MS);
  }, [scheduleCheckIn]);

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
