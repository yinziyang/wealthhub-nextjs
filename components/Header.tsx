'use client';

import React from 'react';
import { Bell, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  currentTab: 'assets' | 'profile';
  assetView?: 'list' | 'gold-detail' | 'usd-detail';
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentTab, assetView = 'list', onBack }) => {
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email || '用户';
  const initialLetter = profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  const isGoldDetail = currentTab === 'assets' && assetView === 'gold-detail';
  const isUsdDetail = currentTab === 'assets' && assetView === 'usd-detail';

  return (
    <header
      className="fixed top-0 left-0 right-0 mx-auto z-50 w-full max-w-md bg-background-light dark:bg-background-dark transition-all duration-200"
      style={{
        paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '1.25rem',
        paddingLeft: '1.25rem',
        paddingRight: '1.25rem'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isGoldDetail ? (
            <>
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors outline-none focus:outline-none"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                  Private Client
                </p>
                <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">
                  实物黄金
                </h1>
              </div>
            </>
          ) : isUsdDetail ? (
            <>
              <button
                onClick={onBack}
                className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors outline-none focus:outline-none"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                  Private Client
                </p>
                <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">
                  美元资产
                </h1>
              </div>
            </>
          ) : currentTab === 'assets' ? (
            <>
              <div className="relative size-10 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {initialLetter}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                  Private Client
                </p>
                <h2 className="text-slate-900 dark:text-white text-sm font-bold leading-tight">
                  {displayName}
                </h2>
              </div>
            </>
          ) : (
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider uppercase">
                Private Client
              </p>
              <h1 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">
                个人中心
              </h1>
            </div>
          )}
        </div>
        {currentTab === 'assets' && !isGoldDetail && !isUsdDetail && (
          <div className="flex items-center gap-2">
            <button className="flex items-center justify-center size-9 rounded-full bg-slate-100 dark:bg-surface-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors">
              <Bell size={20} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
