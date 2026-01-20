'use client';

import React from 'react';
import { PieChart, TrendingUp, Plus, FileText, User } from 'lucide-react';

interface BottomNavProps {
  onAddClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onAddClick }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white/90 dark:bg-[#121316]/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16 px-2">
        <button className="flex flex-col items-center justify-center gap-1 w-16 h-full text-primary">
          <PieChart size={20} fill="currentColor" />
          <span className="text-[10px] font-bold">资产</span>
        </button>
        
        <button className="flex flex-col items-center justify-center gap-1 w-16 h-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <TrendingUp size={20} />
          <span className="text-[10px] font-medium">分析</span>
        </button>
        
        <div className="relative -top-4">
          <button 
            onClick={onAddClick}
            className="flex items-center justify-center size-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 border-4 border-white dark:border-[#121316] hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
        
        <button className="flex flex-col items-center justify-center gap-1 w-16 h-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <FileText size={20} />
          <span className="text-[10px] font-medium">资讯</span>
        </button>
        
        <button className="flex flex-col items-center justify-center gap-1 w-16 h-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <User size={20} />
          <span className="text-[10px] font-medium">我的</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
