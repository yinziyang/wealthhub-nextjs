'use client';

import React from 'react';
import { PieChart, Plus, User } from 'lucide-react';

interface BottomNavProps {
  onAddClick: () => void;
  currentTab: 'assets' | 'profile';
  onTabChange: (tab: 'assets' | 'profile') => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onAddClick, currentTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white dark:bg-[#121316] pb-safe z-50 outline-none">
      <div className="flex items-center justify-center h-16 px-2 gap-12">
        <button 
          onClick={() => onTabChange('assets')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors outline-none focus:outline-none ${
            currentTab === 'assets' ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <PieChart size={20} fill={currentTab === 'assets' ? 'currentColor' : 'none'} />
          <span className={`text-[10px] ${currentTab === 'assets' ? 'font-bold' : 'font-medium'}`}>资产</span>
        </button>

        <div className="relative -top-4">
          <button 
            onClick={onAddClick}
            className="flex items-center justify-center size-12 rounded-full bg-primary text-white shadow-lg shadow-primary/30 border-4 border-white dark:border-[#121316] hover:scale-105 active:scale-95 transition-transform outline-none focus:outline-none"
          >
            <Plus size={24} />
          </button>
        </div>

        <button 
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors outline-none focus:outline-none ${
            currentTab === 'profile' ? 'text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          <User size={20} fill={currentTab === 'profile' ? 'currentColor' : 'none'} />
          <span className={`text-[10px] ${currentTab === 'profile' ? 'font-bold' : 'font-medium'}`}>我的</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
