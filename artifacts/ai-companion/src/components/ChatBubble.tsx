import React from 'react';
import { motion } from 'framer-motion';

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
}

export function ChatBubble({ message, isUser }: ChatBubbleProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
    >
      <div 
        className={`max-w-[85%] px-6 py-4 rounded-[24px] text-xl leading-relaxed shadow-sm ${
          isUser 
            ? 'bg-primary text-primary-foreground rounded-tr-sm' 
            : 'bg-card text-card-foreground border-2 border-border rounded-tl-sm'
        }`}
      >
        {message}
      </div>
    </motion.div>
  );
}
