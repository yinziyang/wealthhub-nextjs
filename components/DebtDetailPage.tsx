'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import DebtRecordList from '@/components/DebtRecordList';

interface DebtDetailPageProps {
  asset: Asset;
}

const DebtDetailPage: React.FC<DebtDetailPageProps> = ({ asset }) => {
  const totalDebt = asset.amount;

  return (
    <div className="space-y-4 -mt-2">
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(245,158,11,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-amber-50/30 dark:from-amber-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-amber-500 dark:text-amber-400 text-4xl font-extrabold tracking-tight mb-0.5">
              ¥{formatNumber(totalDebt, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              债权资产总额
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                债权笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="debt-count">
                -- 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早借款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="earliest-loan-date">
                --
              </div>
            </div>
          </div>
        </div>
      </div>

      <DebtRecordList />
    </div>
  );
};

export default DebtDetailPage;
