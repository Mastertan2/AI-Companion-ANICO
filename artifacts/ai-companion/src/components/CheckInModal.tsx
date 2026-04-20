import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, PhoneCall } from 'lucide-react';

export function CheckInModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const [missedCount, setMissedCount] = useState(0);

  useEffect(() => {
    // 3 hours = 3 * 60 * 60 * 1000 = 10800000ms
    // For demo purposes, we could use a shorter interval, but let's stick to spec (3 hours).
    const CHECK_IN_INTERVAL = 3 * 60 * 60 * 1000;
    
    const checkInTimer = setInterval(() => {
      setIsOpen(true);
      // Play a sound to get attention if possible
      try {
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(e => console.log('Audio play failed', e));
      } catch(e) {}
    }, CHECK_IN_INTERVAL);

    return () => clearInterval(checkInTimer);
  }, []);

  useEffect(() => {
    if (missedCount >= 3) {
      alert(t.alertingFamily);
      setMissedCount(0); // reset
    }
  }, [missedCount, t]);

  if (!isOpen) return null;

  const handleOkay = () => {
    setIsOpen(false);
    setMissedCount(0);
  };

  const handleNeedHelp = () => {
    setIsOpen(false);
    alert(t.alertingFamily);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card w-full max-w-md rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center gap-8"
          >
            <h2 className="text-4xl font-bold text-card-foreground">{t.areYouOkay}</h2>
            
            <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={handleOkay}
                className="w-full h-24 bg-green-500 hover:bg-green-600 text-white rounded-[20px] text-2xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-95"
              >
                <CheckCircle2 size={36} />
                {t.yesFine}
              </button>
              
              <button 
                onClick={handleNeedHelp}
                className="w-full h-24 bg-destructive hover:bg-red-700 text-destructive-foreground rounded-[20px] text-2xl font-bold flex items-center justify-center gap-3 transition-colors active:scale-95"
              >
                <PhoneCall size={36} />
                {t.needHelp}
              </button>
            </div>
            
            <button 
              onClick={() => {
                setIsOpen(false);
                setMissedCount(prev => prev + 1);
              }}
              className="text-muted-foreground underline text-lg p-2 mt-4"
            >
              Ignore
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
