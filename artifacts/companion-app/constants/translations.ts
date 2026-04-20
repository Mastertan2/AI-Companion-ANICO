export type Language = "en" | "zh" | "ms" | "ta";

export interface Translations {
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
  subtitle: string;
  askQuestion: string;
  family: string;
  emergencyCall: string;
  myAppointment: string;
  whatsapp: string;
  youtube: string;
  singpass: string;
  emergency: string;
  howCanIHelp: string;
  typeMessage: string;
  send: string;
  listening: string;
  speaking: string;
  back: string;
  areYouOkay: string;
  yesFine: string;
  needHelp: string;
  alertingFamily: string;
  openingApp: string;
  callingContact: string;
  emergencyContacts: string;
  addContact: string;
  noContacts: string;
  callContact: string;
  whatsappContact: string;
  remove: string;
  selectContact: string;
  searchContacts: string;
  noContactsFound: string;
  permissionRequired: string;
  openSettings: string;
  checkIn: string;
  checkInTitle: string;
  checkInPrompt: string;
  checkInFine: string;
  checkInHelp: string;
  checkInAlertSent: string;
  lastCheckIn: string;
  checkInNow: string;
  alertChildren: string;
  alertMessage: string;
  checkInStatusGood: string;
  checkInStatusWarning: string;
  checkInStatusDue: string;
  checkInNever: string;
  minutesAgo: string;
  hourAgo: string;
  hoursAgo: string;
  languageLabel: string;
  tapMic: string;
  tapMicToSpeak: string;
  recording: string;
  stopRecording: string;
  transcribing: string;
  speakResponse: string;
  stopSpeaking: string;
  cancel: string;
  confirmRemove: string;
  orTypeBelow: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    subtitle: "What would you like to do?",
    askQuestion: "Ask a Question",
    family: "Call Family",
    emergencyCall: "Call 999",
    myAppointment: "Calendar",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    singpass: "SingPass",
    emergency: "EMERGENCY",
    howCanIHelp: "How can I help you?",
    typeMessage: "Type your message...",
    send: "Send",
    listening: "Listening...",
    speaking: "Speaking...",
    back: "Back",
    areYouOkay: "Are you okay?",
    yesFine: "Yes, I'm fine!",
    needHelp: "I need help",
    alertingFamily: "Alerting your family...",
    openingApp: "Opening app...",
    callingContact: "Calling...",
    emergencyContacts: "Emergency Contacts",
    addContact: "Add Contact",
    noContacts: "No emergency contacts saved yet.\nTap Add to add a family member.",
    callContact: "Call",
    whatsappContact: "WhatsApp",
    remove: "Remove",
    selectContact: "Select a Contact",
    searchContacts: "Search contacts...",
    noContactsFound: "No contacts found",
    permissionRequired: "Contacts permission is needed to select a contact.",
    openSettings: "Open Settings",
    checkIn: "Check-In",
    checkInTitle: "3-Hour Check-In",
    checkInPrompt: "Hi! It's been 3 hours since your last check-in. Are you doing okay?",
    checkInFine: "Yes, I'm okay!",
    checkInHelp: "I need help",
    checkInAlertSent: "Your family has been notified. Help is on the way.",
    lastCheckIn: "Last check-in",
    checkInNow: "Check In Now ✓",
    alertChildren: "Alert Children",
    alertMessage: "Hello! This is an alert from the AI Companion app. Please check on your loved one — they have not checked in for over 3 hours.",
    checkInStatusGood: "All good",
    checkInStatusWarning: "Check in soon",
    checkInStatusDue: "Overdue!",
    checkInNever: "Not yet today",
    minutesAgo: "mins ago",
    hourAgo: "hour ago",
    hoursAgo: "hours ago",
    languageLabel: "Language",
    tapMic: "Tap to speak",
    tapMicToSpeak: "Tap the microphone to ask a question",
    recording: "Recording...",
    stopRecording: "Tap to stop",
    transcribing: "Processing...",
    speakResponse: "Read aloud",
    stopSpeaking: "Stop",
    cancel: "Cancel",
    confirmRemove: "Remove this contact?",
    orTypeBelow: "or type below",
  },
  zh: {
    greetingMorning: "早上好",
    greetingAfternoon: "下午好",
    greetingEvening: "晚上好",
    subtitle: "您想做什么？",
    askQuestion: "问个问题",
    family: "打电话给家人",
    emergencyCall: "拨打 999",
    myAppointment: "日历",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    singpass: "SingPass",
    emergency: "紧急求助",
    howCanIHelp: "我能怎么帮您？",
    typeMessage: "输入您的信息...",
    send: "发送",
    listening: "正在听...",
    speaking: "正在说话...",
    back: "返回",
    areYouOkay: "您还好吗？",
    yesFine: "我很好！",
    needHelp: "我需要帮助",
    alertingFamily: "正在通知家人...",
    openingApp: "正在打开应用...",
    callingContact: "正在呼叫...",
    emergencyContacts: "紧急联系人",
    addContact: "添加联系人",
    noContacts: "还没有保存紧急联系人。\n点击添加来添加家人。",
    callContact: "拨打",
    whatsappContact: "WhatsApp",
    remove: "删除",
    selectContact: "选择联系人",
    searchContacts: "搜索联系人...",
    noContactsFound: "找不到联系人",
    permissionRequired: "需要通讯录权限才能选择联系人。",
    openSettings: "打开设置",
    checkIn: "签到",
    checkInTitle: "3小时签到",
    checkInPrompt: "您好！距上次签到已过去3小时，您还好吗？",
    checkInFine: "我很好！",
    checkInHelp: "我需要帮助",
    checkInAlertSent: "已通知您的家人，帮助正在赶来。",
    lastCheckIn: "上次签到",
    checkInNow: "立即签到 ✓",
    alertChildren: "通知子女",
    alertMessage: "您好！这是AI伴侣应用的提醒。您的家人已超过3小时未签到，请前往查看。",
    checkInStatusGood: "一切正常",
    checkInStatusWarning: "即将到期",
    checkInStatusDue: "已逾期！",
    checkInNever: "今天尚未签到",
    minutesAgo: "分钟前",
    hourAgo: "小时前",
    hoursAgo: "小时前",
    languageLabel: "语言",
    tapMic: "点击说话",
    tapMicToSpeak: "点击麦克风提问",
    recording: "录音中...",
    stopRecording: "点击停止",
    transcribing: "处理中...",
    speakResponse: "朗读回复",
    stopSpeaking: "停止",
    cancel: "取消",
    confirmRemove: "删除此联系人？",
    orTypeBelow: "或在下方输入",
  },
  ms: {
    greetingMorning: "Selamat pagi",
    greetingAfternoon: "Selamat petang",
    greetingEvening: "Selamat malam",
    subtitle: "Apa yang anda ingin lakukan?",
    askQuestion: "Tanya Soalan",
    family: "Hubungi Keluarga",
    emergencyCall: "Hubungi 999",
    myAppointment: "Kalendar",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    singpass: "SingPass",
    emergency: "KECEMASAN",
    howCanIHelp: "Macam mana saya boleh bantu?",
    typeMessage: "Taip mesej anda...",
    send: "Hantar",
    listening: "Mendengar...",
    speaking: "Bercakap...",
    back: "Kembali",
    areYouOkay: "Adakah anda baik-baik saja?",
    yesFine: "Ya, saya okey!",
    needHelp: "Saya perlukan bantuan",
    alertingFamily: "Memberitahu keluarga anda...",
    openingApp: "Membuka aplikasi...",
    callingContact: "Menghubungi...",
    emergencyContacts: "Kenalan Kecemasan",
    addContact: "Tambah Kenalan",
    noContacts: "Tiada kenalan kecemasan disimpan.\nKetik Tambah untuk menambah ahli keluarga.",
    callContact: "Hubungi",
    whatsappContact: "WhatsApp",
    remove: "Padam",
    selectContact: "Pilih Kenalan",
    searchContacts: "Cari kenalan...",
    noContactsFound: "Tiada kenalan dijumpai",
    permissionRequired: "Kebenaran kenalan diperlukan untuk memilih kenalan.",
    openSettings: "Buka Tetapan",
    checkIn: "Daftar Masuk",
    checkInTitle: "Daftar Masuk 3 Jam",
    checkInPrompt: "Hai! Sudah 3 jam sejak daftar masuk terakhir anda. Adakah anda okay?",
    checkInFine: "Ya, saya okay!",
    checkInHelp: "Saya perlukan bantuan",
    checkInAlertSent: "Keluarga anda telah diberitahu. Bantuan sedang dalam perjalanan.",
    lastCheckIn: "Daftar masuk terakhir",
    checkInNow: "Daftar Masuk Sekarang ✓",
    alertChildren: "Beritahu Anak",
    alertMessage: "Salam! Ini adalah amaran dari aplikasi AI Companion. Orang tersayang anda tidak daftar masuk lebih 3 jam. Sila pergi semak.",
    checkInStatusGood: "Semua baik",
    checkInStatusWarning: "Daftar masuk segera",
    checkInStatusDue: "Tertunggak!",
    checkInNever: "Belum hari ini",
    minutesAgo: "minit lalu",
    hourAgo: "jam lalu",
    hoursAgo: "jam lalu",
    languageLabel: "Bahasa",
    tapMic: "Ketik untuk bercakap",
    tapMicToSpeak: "Ketik mikrofon untuk bertanya",
    recording: "Merakam...",
    stopRecording: "Ketik untuk berhenti",
    transcribing: "Memproses...",
    speakResponse: "Baca kuat",
    stopSpeaking: "Berhenti",
    cancel: "Batal",
    confirmRemove: "Padam kenalan ini?",
    orTypeBelow: "atau taip di bawah",
  },
  ta: {
    greetingMorning: "காலை வணக்கம்",
    greetingAfternoon: "மதிய வணக்கம்",
    greetingEvening: "மாலை வணக்கம்",
    subtitle: "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
    askQuestion: "ஒரு கேள்வி கேளுங்கள்",
    family: "குடும்பத்தை அழைக்க",
    emergencyCall: "999 அழைக்க",
    myAppointment: "காலண்டர்",
    whatsapp: "WhatsApp",
    youtube: "YouTube",
    singpass: "SingPass",
    emergency: "அவசரம்",
    howCanIHelp: "நான் எப்படி உதவலாம்?",
    typeMessage: "உங்கள் செய்தியை தட்டச்சு செய்க...",
    send: "அனுப்பு",
    listening: "கேட்கிறது...",
    speaking: "பேசுகிறது...",
    back: "திரும்பு",
    areYouOkay: "நீங்கள் நலமா?",
    yesFine: "ஆம், நான் நலம்!",
    needHelp: "எனக்கு உதவி தேவை",
    alertingFamily: "உங்கள் குடும்பத்தினருக்கு தெரிவிக்கிறது...",
    openingApp: "செயலி திறக்கிறது...",
    callingContact: "அழைக்கிறது...",
    emergencyContacts: "அவசர தொடர்புகள்",
    addContact: "தொடர்பு சேர்க்க",
    noContacts: "இன்னும் அவசர தொடர்புகள் இல்லை.\nகுடும்ப உறுப்பினரை சேர்க்க 'சேர்' என்பதை தட்டவும்.",
    callContact: "அழை",
    whatsappContact: "WhatsApp",
    remove: "நீக்கு",
    selectContact: "தொடர்பு தேர்வு",
    searchContacts: "தொடர்புகளை தேடு...",
    noContactsFound: "தொடர்புகள் கிடைக்கவில்லை",
    permissionRequired: "தொடர்பு தேர்வு செய்ய அனுமதி தேவை.",
    openSettings: "அமைப்புகள் திற",
    checkIn: "சரிபார்ப்பு",
    checkInTitle: "3 மணி நேர சரிபார்ப்பு",
    checkInPrompt: "வணக்கம்! கடந்த 3 மணி நேரமாக நீங்கள் சரிபார்க்கவில்லை. நலமாக இருக்கிறீர்களா?",
    checkInFine: "ஆம், நலம்!",
    checkInHelp: "எனக்கு உதவி தேவை",
    checkInAlertSent: "உங்கள் குடும்பத்தினருக்கு தெரிவிக்கப்பட்டது. உதவி வழியில் உள்ளது.",
    lastCheckIn: "கடைசி சரிபார்ப்பு",
    checkInNow: "இப்போது சரிபார் ✓",
    alertChildren: "குழந்தைகளை எச்சரி",
    alertMessage: "வணக்கம்! AI Companion ஆப்பிலிருந்து எச்சரிக்கை. உங்கள் அன்பானவர் 3 மணி நேரமாக சரிபார்க்கவில்லை. தயவுசெய்து சோதிக்கவும்.",
    checkInStatusGood: "நலம்",
    checkInStatusWarning: "விரைவில் சரிபார்க்கவும்",
    checkInStatusDue: "காலதாமதம்!",
    checkInNever: "இன்று இன்னும் இல்லை",
    minutesAgo: "நிமிடங்கள் முன்",
    hourAgo: "மணி முன்",
    hoursAgo: "மணி முன்",
    languageLabel: "மொழி",
    tapMic: "பேச தட்டவும்",
    tapMicToSpeak: "கேள்வி கேட்க மைக்ரோஃபோனை தட்டவும்",
    recording: "பதிவாகிறது...",
    stopRecording: "நிறுத்த தட்டவும்",
    transcribing: "செயலாக்குகிறது...",
    speakResponse: "சத்தமாக படி",
    stopSpeaking: "நிறுத்து",
    cancel: "ரத்து",
    confirmRemove: "இந்த தொடர்பை நீக்கவா?",
    orTypeBelow: "அல்லது கீழே தட்டச்சு செய்க",
  },
};
