'use client';

import React from 'react';
import { PullToRefresh } from 'antd-mobile';
import { usePWA } from '@/hooks/usePWA';
import { ArrowDown, ArrowUp, Loader2, Check } from 'lucide-react';
import type { PullStatus } from 'antd-mobile/es/components/pull-to-refresh';

interface PWAPullToRefreshProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
}

const statusRecord: Record<PullStatus, React.ReactNode> = {
  pulling: (
    <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm text-slate-500 dark:text-slate-400 transform transition-transform duration-200">
      <ArrowDown size={20} />
    </div>
  ),
  canRelease: (
    <div className="p-2 rounded-full bg-primary/10 text-primary transform transition-transform duration-200 scale-110">
      <ArrowUp size={20} />
    </div>
  ),
  refreshing: (
    <div className="p-2 rounded-full bg-surface-light dark:bg-surface-dark shadow-sm text-primary">
      <Loader2 size={20} className="animate-spin" />
    </div>
  ),
  complete: (
    <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
      <Check size={20} />
    </div>
  ),
};

const PWAPullToRefresh: React.FC<PWAPullToRefreshProps> = ({ onRefresh, children }) => {
  const isPWA = usePWA();

  if (!isPWA) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh
      onRefresh={onRefresh}
      renderText={(status) => {
        return (
          <div className="w-full h-full flex items-center justify-center pb-2">
            {statusRecord[status]}
          </div>
        );
      }}
      headHeight={80}
      threshold={100}
    >
      {children}
    </PullToRefresh>
  );
};

export default PWAPullToRefresh;
