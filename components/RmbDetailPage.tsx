'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import RmbDepositChart from '@/components/RmbDepositChart';
import RmbDepositRecords from '@/components/RmbDepositRecords';

interface RmbDetailPageProps {
  asset: Asset;
}

const RmbDetailPage: React.FC<RmbDetailPageProps> = ({ asset }) => {
  const totalDeposit = asset.amount;

  return (
    <div className="space-y-4 -mt-2">
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(59,130,246,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-blue-50/30 dark:from-blue-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-blue-500 dark:text-blue-400 text-4xl font-extrabold tracking-tight mb-0.5">
              ¥{formatNumber(totalDeposit, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              人民币存款总额
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                存款笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="deposit-count">
                -- 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早存款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="earliest-date">
                --
              </div>
            </div>
          </div>
        </div>
      </div>

      <RmbDepositChart />

      <RmbDepositRecords />
    </div>
  );
};

export default RmbDetailPage;
