'use client';

import { useState } from 'react';
import { AccordionCard } from './AccordionCard';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock Data Structure
const FAQ_DATA = [
  {
    id: '1',
    title: 'Premium Package',
    description: 'Learn about what\'s included in our top-tier plan.',
    content: 'The Premium Package includes 24/7 priority support, access to all advanced features, and unlimited projects.',
    icon: '💎'
  },
  {
    id: '2',
    title: 'Subscription & Billing',
    description: 'How to manage your subscription and payment details.',
    content: 'You can cancel your subscription at any time from your account settings. Changes are prorated automatically.',
    icon: '💳'
  }
];

export const FAQContainer = () => {
  const [activeFaq, setActiveFaq] = useState<typeof FAQ_DATA[0] | null>(null);

  return (
    <div className="relative w-full max-w-4xl h-[600px] mx-auto overflow-hidden rounded-[24px] border border-white/10 bg-[#0d1117] shadow-2xl">
      {/* 1. Aurora Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] animate-pulse" />
      </div>

      {/* 2. List View (Slide & Fade Out) */}
      <div className={cn(
        "relative z-10 p-8 transition-all duration-500 ease-in-out",
        activeFaq ? "opacity-0 scale-95 pointer-events-none translate-x-[-20px]" : "opacity-100 scale-100 translate-x-0"
      )}>
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-400">Find answers and get the help you need.</p>
        </header>

        <div className="space-y-4">
          {FAQ_DATA.map((faq) => (
            <AccordionCard 
              key={faq.id} 
              title={faq.title} 
              description={faq.description} 
              icon={faq.icon}
              onClick={() => setActiveFaq(faq)}
            />
          ))}
        </div>
      </div>

      {/* 3. Detail View (Overlap / Popup) */}
      <div className={cn(
        "absolute inset-0 z-20 bg-[#0d1117] p-8 transition-all duration-600 cubic-bezier(0.23, 1, 0.32, 1)",
        activeFaq 
          ? "translate-y-0 opacity-100 visible" 
          : "translate-y-full opacity-0 invisible"
      )}>
        {activeFaq && (
          <div className="h-full flex flex-col">
            <button 
              onClick={() => setActiveFaq(null)}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-8 group"
            >
              <div className="p-2 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20">
                <ArrowLeft size={20} />
              </div>
              <span className="font-medium">Back to FAQ</span>
            </button>

            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">{activeFaq.title}</h2>
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-gray-300 leading-relaxed">
                {activeFaq.content}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};