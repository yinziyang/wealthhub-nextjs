'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface HeaderProps {
  // No props needed
}

const Header: React.FC<HeaderProps> = () => {
  const avatarUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuAFSEhbafgAgdfpcn6zY7ZUhAD_T5A0buEssl6EEiWXWyo3bPLCGxgRAWN5ka_bKahjzEX5bLRa54apkItJYhEO14NCe0yTI_hd-AUxKyr6k-GGwrX1orTGKMuWSdE-Sr3Mmz6yGujtVNcbUebaNppQPF_UCa6zXPFaq-XQ10P4QdSjf3PXk5gQuyUiJsp6X0KmAkfOmYhIrKQWdsCgSlEBXoeqKkGoAe_TENsMPxn-3AA1S12B-Eb1-eRdaDjIs7GBYpp4GXMl";

  return (
    <header className="fixed top-0 left-0 right-0 mx-auto z-50 w-full max-w-md flex items-center justify-between p-5 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="relative size-10 shrink-0 rounded-full border border-primary/20 p-0.5">
          <div 
            className="bg-center bg-no-repeat bg-cover rounded-full w-full h-full" 
            style={{ backgroundImage: `url("${avatarUrl}")` }}
          ></div>
          <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary border-2 border-background-dark"></div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
            Private Client
          </p>
          <h2 className="text-slate-900 dark:text-white text-sm font-bold leading-tight">
            李先生
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
