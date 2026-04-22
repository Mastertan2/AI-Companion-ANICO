import { type Language } from "./translations";

export interface WellbeingText {
  notifTitle: string;
  notifBody: string;
  chatMessage: string;
  banner: string;
}

export type WellbeingPromptType =
  | "morning_greeting"
  | "breakfast_check"
  | "activity_check_1"
  | "lunch_check"
  | "activity_check_2"
  | "dinner_check";

export interface WellbeingSlot {
  id: string;
  type: WellbeingPromptType;
  hour: number;
  minute: number;
}

export const WELLBEING_SLOTS: WellbeingSlot[] = [
  { id: "wb_morning",    type: "morning_greeting",  hour: 7,  minute: 30 },
  { id: "wb_breakfast",  type: "breakfast_check",   hour: 9,  minute: 0  },
  { id: "wb_activity1",  type: "activity_check_1",  hour: 10, minute: 30 },
  { id: "wb_lunch",      type: "lunch_check",       hour: 12, minute: 30 },
  { id: "wb_activity2",  type: "activity_check_2",  hour: 15, minute: 0  },
  { id: "wb_dinner",     type: "dinner_check",      hour: 18, minute: 30 },
];

export const WELLBEING_PROMPTS: Record<WellbeingPromptType, Record<Language, WellbeingText>> = {
  morning_greeting: {
    en: {
      notifTitle: "Good morning! ☀️",
      notifBody: "How are you feeling today? Tap to chat.",
      chatMessage: "Good morning ☀️ How are you feeling today? What would you like to do?",
      banner: "Good morning! How are you feeling? 😊",
    },
    zh: {
      notifTitle: "早上好！☀️",
      notifBody: "您今天感觉怎么样？点击聊天。",
      chatMessage: "早上好 ☀️ 您今天感觉怎么样？今天想做什么？",
      banner: "早上好！您今天感觉怎么样？😊",
    },
    ms: {
      notifTitle: "Selamat pagi! ☀️",
      notifBody: "Macam mana perasaan anda hari ini? Ketik untuk berbual.",
      chatMessage: "Selamat pagi ☀️ Macam mana perasaan anda hari ini? Apa yang anda ingin lakukan?",
      banner: "Selamat pagi! Macam mana perasaan anda? 😊",
    },
    ta: {
      notifTitle: "காலை வணக்கம் ☀️",
      notifBody: "இன்று நீங்கள் எப்படி உணர்கிறீர்கள். பேச தட்டவும்.",
      chatMessage: "காலை வணக்கம் ☀️ நீங்கள் இன்று எப்படி உணர்கிறீர்கள். இன்று என்ன செய்ய விரும்புகிறீர்கள்",
      banner: "காலை வணக்கம். நீங்கள் நலமாக இருக்கிறீர்களா 😊",
    },
  },
  breakfast_check: {
    en: {
      notifTitle: "Breakfast time! 🍳",
      notifBody: "Have you had breakfast yet?",
      chatMessage: "Good morning! Have you had breakfast yet? It is important to eat well to stay healthy 😊",
      banner: "Have you eaten breakfast yet? 🍳",
    },
    zh: {
      notifTitle: "早饭时间到了！🍳",
      notifBody: "您吃早饭了吗？",
      chatMessage: "早安！您吃早饭了吗？好好吃饭对身体很重要 😊",
      banner: "您吃早饭了吗？🍳",
    },
    ms: {
      notifTitle: "Masa sarapan! 🍳",
      notifBody: "Sudah makan pagi?",
      chatMessage: "Selamat pagi! Sudah makan pagi? Penting untuk makan dengan baik untuk kekal sihat 😊",
      banner: "Sudah makan pagi belum? 🍳",
    },
    ta: {
      notifTitle: "காலை உணவு நேரம் 🍳",
      notifBody: "காலை உணவு சாப்பிட்டீர்களா.",
      chatMessage: "காலை வணக்கம். காலை உணவு சாப்பிட்டீர்களா. ஆரோக்கியமாக இருக்க நன்றாக சாப்பிடுவது முக்கியம் 😊",
      banner: "காலை உணவு சாப்பிட்டீர்களா 🍳",
    },
  },
  activity_check_1: {
    en: {
      notifTitle: "Morning check-in 👋",
      notifBody: "What have you been up to this morning?",
      chatMessage: "Hi! What have you been doing this morning? Did you go for a walk or do anything nice?",
      banner: "What have you been up to this morning? 👋",
    },
    zh: {
      notifTitle: "上午问候 👋",
      notifBody: "今天早上您在做什么？",
      chatMessage: "您好！今天早上您都在做什么呀？有没有出去散散步？",
      banner: "今天早上您都在做什么？👋",
    },
    ms: {
      notifTitle: "Sapa pagi 👋",
      notifBody: "Apa yang anda buat pagi ini?",
      chatMessage: "Hai! Apa yang anda buat pagi ini? Adakah anda berjalan-jalan atau buat sesuatu yang menyeronokkan?",
      banner: "Apa yang anda buat pagi ini? 👋",
    },
    ta: {
      notifTitle: "காலை வணக்கம் 👋",
      notifBody: "இன்று காலை என்ன செய்தீர்கள்.",
      chatMessage: "வணக்கம். இன்று காலை நீங்கள் என்ன செய்தீர்கள். சிறிது நடந்தீர்களா அல்லது ஏதாவது நல்ல செய்தீர்களா",
      banner: "இன்று காலை என்ன செய்தீர்கள் 👋",
    },
  },
  lunch_check: {
    en: {
      notifTitle: "Lunchtime! 🍜",
      notifBody: "Have you had lunch? Remember to drink water too.",
      chatMessage: "Good afternoon! Have you had lunch? Remember to drink plenty of water today 💧",
      banner: "Have you eaten lunch? Remember to drink water 💧",
    },
    zh: {
      notifTitle: "午饭时间！🍜",
      notifBody: "您吃午饭了吗？记得多喝水哦。",
      chatMessage: "下午好！您吃午饭了吗？今天记得要多喝水哦 💧",
      banner: "您吃午饭了吗？记得喝水 💧",
    },
    ms: {
      notifTitle: "Masa makan tengahari! 🍜",
      notifBody: "Sudah makan tengahari? Jangan lupa minum air.",
      chatMessage: "Selamat tengahari! Sudah makan tengahari? Jangan lupa minum air yang cukup hari ini 💧",
      banner: "Sudah makan tengahari? Jangan lupa minum air 💧",
    },
    ta: {
      notifTitle: "மதிய உணவு நேரம் 🍜",
      notifBody: "மதிய உணவு சாப்பிட்டீர்களா. தண்ணீரும் குடிக்கவும்.",
      chatMessage: "மதிய வணக்கம். மதிய உணவு சாப்பிட்டீர்களா. இன்று நிறைய தண்ணீர் குடிக்கவும் 💧",
      banner: "மதிய உணவு சாப்பிட்டீர்களா. தண்ணீர் குடிக்கவும் 💧",
    },
  },
  activity_check_2: {
    en: {
      notifTitle: "Afternoon check-in ☕",
      notifBody: "How are you doing? Did you rest or go for a walk?",
      chatMessage: "Good afternoon! How are you feeling? Have you had a rest or gone for a walk today?",
      banner: "How are you doing this afternoon? ☕",
    },
    zh: {
      notifTitle: "下午问候 ☕",
      notifBody: "您今天还好吗？有没有休息或散步？",
      chatMessage: "下午好！您感觉怎么样？今天有休息一会儿或者出去散步吗？",
      banner: "今天下午您过得怎么样？☕",
    },
    ms: {
      notifTitle: "Sapa petang ☕",
      notifBody: "Macam mana anda hari ini? Sudah berehat atau berjalan?",
      chatMessage: "Selamat petang! Macam mana perasaan anda? Adakah anda sudah berehat atau berjalan hari ini?",
      banner: "Macam mana petang anda hari ini? ☕",
    },
    ta: {
      notifTitle: "மாலை வணக்கம் ☕",
      notifBody: "நீங்கள் இன்று எப்படி இருக்கிறீர்கள். ஓய்வெடுத்தீர்களா.",
      chatMessage: "மாலை வணக்கம். நீங்கள் எப்படி உணர்கிறீர்கள். இன்று ஓய்வெடுத்தீர்களா அல்லது நடந்தீர்களா",
      banner: "இன்று மாலை நீங்கள் எப்படி இருக்கிறீர்கள் ☕",
    },
  },
  dinner_check: {
    en: {
      notifTitle: "Dinner time! 🍽️",
      notifBody: "Have you had dinner? I hope you had a good day.",
      chatMessage: "Good evening! Have you had dinner yet? I hope you had a wonderful day today 🌙",
      banner: "Have you eaten dinner yet? 🍽️",
    },
    zh: {
      notifTitle: "晚饭时间！🍽️",
      notifBody: "您吃晚饭了吗？希望您今天过得愉快。",
      chatMessage: "晚上好！您吃晚饭了吗？希望您今天过得很愉快 🌙",
      banner: "您吃晚饭了吗？🍽️",
    },
    ms: {
      notifTitle: "Masa makan malam! 🍽️",
      notifBody: "Sudah makan malam? Semoga hari anda menyenangkan.",
      chatMessage: "Selamat malam! Sudah makan malam? Semoga hari anda sangat menyenangkan hari ini 🌙",
      banner: "Sudah makan malam belum? 🍽️",
    },
    ta: {
      notifTitle: "இரவு உணவு நேரம் 🍽️",
      notifBody: "இரவு உணவு சாப்பிட்டீர்களா. நல்ல நாளாக இருந்திருக்கும்.",
      chatMessage: "மாலை வணக்கம். இரவு உணவு சாப்பிட்டீர்களா. இன்று மிகவும் நல்ல நாளாக இருந்திருக்கும் 🌙",
      banner: "இரவு உணவு சாப்பிட்டீர்களா 🍽️",
    },
  },
};

/** Return which slot is "active" right now (within a ±20-min window), or null. */
export function getCurrentWellbeingSlot(): WellbeingSlot | null {
  const now = new Date();
  const totalMins = now.getHours() * 60 + now.getMinutes();
  for (const slot of WELLBEING_SLOTS) {
    const slotMins = slot.hour * 60 + slot.minute;
    if (totalMins >= slotMins && totalMins < slotMins + 60) return slot;
  }
  return null;
}
