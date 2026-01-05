import { ChevronRight } from 'lucide-react';

interface CardProps {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
}

export const AccordionCard = ({ title, description, icon, onClick }: CardProps) => {
  return (
    <div 
      onClick={onClick}
      className="group relative flex items-center justify-between p-6 rounded-[18px] bg-white/5 border border-white/10 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:border-blue-500/50"
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-xl">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      
      {/* Glossy Border Effect */}
      <div className="absolute inset-0 rounded-[18px] border-2 border-transparent group-hover:border-blue-500/20 pointer-events-none transition-all" />
    </div>
  );
};