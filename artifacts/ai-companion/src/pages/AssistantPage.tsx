import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { ChevronLeft, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubble } from '@/components/ChatBubble';
import { VoiceButton } from '@/components/VoiceButton';
import { handleIntent } from '@/utils/intentHandler';
import { normalizeInput } from '@/utils/dialectMap';  

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function AssistantPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [overlayMessage, setOverlayMessage] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition if available
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // could tie this to selected language
      
      recognition.onstart = () => setIsListening(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        sendMessage(transcript);
      };
      
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const cleanedText = normalizeInput(text);
    
    const userMsg = { id: Date.now().toString(), text, isUser: true };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Send to backend
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanedText })
      });
      
      const data = await res.json();
      const reply = data.reply || "I didn't quite get that.";
      
      // Add response message
      const aiMsg = { id: (Date.now() + 1).toString(), text: reply, isUser: false };
      setMessages(prev => [...prev, aiMsg]);
      
      // Handle intents
      const intentHandled = handleIntent(reply, (msg) => {
        setOverlayMessage(msg);
        setTimeout(() => setOverlayMessage(null), 3000);
      });
      
      // Speak response
      speakText(reply);
      
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = "Sorry, I'm having trouble connecting right now.";
      setMessages(prev => [...prev, { id: Date.now().toString(), text: errorMsg, isUser: false }]);
      speakText(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className="min-h-[100dvh] w-full flex flex-col bg-background"
    >
      <header className="flex items-center px-4 py-6 border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <Link href="/">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex items-center text-primary cursor-pointer p-2 -ml-2 rounded-full hover:bg-accent"
          >
            <ChevronLeft size={40} />
            <span className="text-2xl font-bold ml-1">{t.back}</span>
          </motion.div>
        </Link>
        <h1 className="text-2xl font-bold mx-auto pr-16">{t.howCanIHelp}</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex items-center justify-center text-center opacity-50">
            <p className="text-2xl font-medium max-w-[80%]">{t.howCanIHelp}</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} />
        ))}
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start mb-6"
          >
            <div className="bg-card text-card-foreground border-2 border-border px-6 py-4 rounded-[24px] rounded-tl-sm flex items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={28} />
              <span className="text-xl">Thinking...</span>
            </div>
          </motion.div>
        )}
      </main>

      {/* Overlays for listening/speaking */}
      <AnimatePresence>
        {(isListening || isSpeaking || overlayMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-[160px] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-8 py-4 rounded-[32px] flex items-center gap-4 z-20 shadow-2xl"
          >
            {isListening && <div className="w-4 h-4 bg-red-500 rounded-full animate-ping" />}
            {isSpeaking && <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse" />}
            {!isListening && !isSpeaking && overlayMessage && <div className="w-4 h-4 bg-green-400 rounded-full" />}
            <span className="text-2xl font-bold">
              {overlayMessage ? overlayMessage : isListening ? t.listening : t.speaking}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="p-4 bg-card border-t border-border pb-8">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.typeMessage}
              className="w-full h-[80px] bg-background border-2 border-border rounded-[24px] px-6 text-2xl focus:outline-none focus:ring-4 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            />
          </div>
          
          {inputValue.trim() ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              type="submit"
              className="h-[80px] px-8 bg-primary text-primary-foreground rounded-[24px] flex items-center justify-center font-bold text-2xl shadow-md disabled:opacity-50"
              disabled={isLoading}
            >
              <Send size={32} className="mr-2" />
              {t.send}
            </motion.button>
          ) : (
            <VoiceButton isListening={isListening} onClick={toggleListening} />
          )}
        </form>
      </footer>
    </motion.div>
  );
}
