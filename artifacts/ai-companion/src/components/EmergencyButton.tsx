import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PhoneCall } from 'lucide-react';
import { motion } from 'framer-motion';

export function EmergencyButton() {
  const { t } = useLanguage();

  const handleEmergency = () => {
    window.location.href = "tel:999";
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleEmergency}
      className="w-full bg-destructive text-destructive-foreground rounded-[20px] shadow-lg flex flex-col items-center justify-center gap-2 border-4 border-red-700/20 hover:bg-red-600 transition-colors"
      style={{ minHeight: '120px' }}
    >
      <PhoneCall size={48} />
      <span className="text-3xl font-black uppercase tracking-widest">{t.emergency}</span>
    </motion.button>
  );
}
