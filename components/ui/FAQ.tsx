import React, { useState } from 'react';

// --- Types for Reusability ---
export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string | number;
  title: string;
  description: string;
  icon?: React.ReactNode; // Optional icon
  items: FAQItem[];
}

interface FAQProps {
  categories: FAQCategory[];
  mainTitle?: string;
  mainSubtitle?: string;
}

export default function FAQ({ 
  categories, 
  mainTitle = "Frequently Asked Questions", 
  mainSubtitle = "Find answers to your questions and get the help you need." 
}: FAQProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [openAccordionIdx, setOpenAccordionIdx] = useState<number | null>(null);

  // Find the currently active category object
  const activeCategory = categories.find(cat => cat.id === selectedCategoryId);

  const handleBack = () => {
    setSelectedCategoryId(null);
    setOpenAccordionIdx(null);
  };

  return (
    <div className="relative min-h-[800px] w-full flex items-center justify-center bg-[#0d1117] text-[#f0f6fc] overflow-hidden p-4 sm:p-8 font-sans">
      
      {/* --- Aurora Background --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#58a6ff] blur-[100px] opacity-10 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-[#e81cff] blur-[100px] opacity-10 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        
        {/* --- LIST VIEW --- */}
        <div className={`transition-all duration-500 transform ${selectedCategoryId ? 'opacity-0 scale-95 pointer-events-none absolute inset-0' : 'opacity-100 scale-100'}`}>
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">{mainTitle}</h1>
            <p className="text-[#8b949e] text-lg">{mainSubtitle}</p>
          </div>

          <div className="space-y-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className="w-full text-left group relative bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl flex items-center"
              >
                {cat.icon && (
                  <div className="flex-shrink-0 w-12 h-12 bg-[#58a6ff1a] text-[#58a6ff] rounded-full flex items-center justify-center mr-6">
                    {cat.icon}
                  </div>
                )}
                <div className="flex-grow">
                  <h3 className="text-xl font-semibold mb-1 group-hover:text-[#58a6ff] transition-colors">{cat.title}</h3>
                  <p className="text-[#8b949e] text-sm">{cat.description}</p>
                </div>
                <div className="ml-4 text-[#8b949e] group-hover:translate-x-1 group-hover:text-[#58a6ff] transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* --- ACCORDION VIEW --- */}
        <div className={`transition-all duration-500 transform ${!selectedCategoryId ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
          {activeCategory && (
            <div className="bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-6 border-b border-white/10 flex items-center bg-white/5">
                <button 
                  onClick={handleBack}
                  className="p-2 mr-4 rounded-full hover:bg-white/10 transition-colors text-[#8b949e] hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h3 className="text-xl font-semibold">{activeCategory.title}</h3>
              </div>

              <div className="p-6 space-y-2">
                {activeCategory.items.map((item, idx) => {
                  const isOpen = openAccordionIdx === idx;
                  return (
                    <div key={idx} className="border-b border-white/5 last:border-none">
                      <button
                        onClick={() => setOpenAccordionIdx(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center py-5 text-left transition-colors"
                      >
                        <span className={`text-lg font-medium transition-colors ${isOpen ? 'text-[#58a6ff]' : 'text-white'}`}>
                          {item.question}
                        </span>
                        <svg 
                          className={`w-5 h-5 text-[#8b949e] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <p className="pb-5 text-[#8b949e] leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}