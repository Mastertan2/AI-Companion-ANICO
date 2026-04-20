import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'wouter';
import { EmergencyButton } from '@/components/EmergencyButton';
import { Users, Calendar, MessageSquare, PhoneCall, Globe, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { t, language, setLanguage } = useLanguage();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t.greetingMorning);
    else if (hour < 18) setGreeting(t.greetingAfternoon);
    else setGreeting(t.greetingEvening);
  }, [t]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[100dvh] w-full flex flex-col px-6 py-8 pb-12"
    >
      <header className="flex justify-end mb-8">
        <div className="relative inline-block">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="appearance-none bg-card border-2 border-border text-card-foreground py-3 pl-12 pr-10 rounded-[16px] text-xl font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-ring"
            aria-label="Select Language"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="ms">Malay</option>
            <option value="ta">Tamil</option>
          </select>
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Globe className="text-muted-foreground" size={24} />
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-8">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-extrabold text-foreground mb-3">{greeting}</h1>
          <p className="text-2xl text-muted-foreground font-medium">{t.subtitle}</p>
        </div>

        <Link href="/assistant">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="w-full bg-primary text-primary-foreground rounded-[24px] shadow-lg flex items-center justify-center gap-4 transition-colors hover:bg-orange-600 active:bg-orange-700 cursor-pointer"
            style={{ minHeight: '100px' }}
          >
            <MessageSquare size={40} />
            <span className="text-3xl font-bold">{t.askQuestion}</span>
          </motion.div>
        </Link>

        <div className="grid grid-cols-2 gap-4 my-4">
          <QuickActionButton 
            icon={<Users size={32} className="text-primary" />} 
            label={t.family} 
            onClick={() => window.location.href = "tel:"} 
          />
          <QuickActionButton 
            icon={<PhoneCall size={32} className="text-destructive" />} 
            label={t.emergencyCall} 
            onClick={() => window.location.href = "tel:999"} 
          />
          <QuickActionButton 
            icon={<Calendar size={32} className="text-blue-500" />} 
            label={t.myAppointment} 
            onClick={() => {}} 
          />
          <QuickActionButton 
            icon={<MessageCircle size={32} className="text-green-500" />} 
            label={t.whatsapp} 
            onClick={() => window.location.href = "whatsapp://"} 
          />
        </div>

        <div className="mt-auto pt-4">
          <EmergencyButton />
        </div>
      </main>
    </motion.div>
  );
}

function QuickActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-card text-card-foreground border-2 border-border rounded-[20px] shadow-sm flex flex-col items-center justify-center p-4 gap-3 min-h-[120px] transition-colors hover:bg-accent"
    >
      {icon}
      <span className="text-xl font-bold text-center">{label}</span>
    </motion.button>
  );
}
