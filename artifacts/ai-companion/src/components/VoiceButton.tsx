import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface VoiceButtonProps {
  isListening: boolean;
  onClick: () => void;
}

export function VoiceButton({ isListening, onClick }: VoiceButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`h-[80px] w-[80px] rounded-full flex items-center justify-center shadow-xl transition-all ${
        isListening 
          ? 'bg-destructive text-destructive-foreground animate-pulse shadow-red-500/50' 
          : 'bg-primary text-primary-foreground shadow-orange-500/30'
      }`}
    >
      {isListening ? <Square size={36} className="fill-current" /> : <Mic size={40} />}
    </motion.button>
  );
}
