'use client';

import React from 'react';
import { PullToRefresh } from 'antd-mobile';
import { usePWA } from '@/hooks/usePWA';

interface PWAPullToRefreshProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
}

const PWAPullToRefresh: React.FC<PWAPullToRefreshProps> = ({ onRefresh, children }) => {
  const isPWA = usePWA();

  if (!isPWA) {
    return <>{children}</>;
  }

  return (
    <PullToRefresh onRefresh={onRefresh}>
      {children}
    </PullToRefresh>
  );
};

export default PWAPullToRefresh;
