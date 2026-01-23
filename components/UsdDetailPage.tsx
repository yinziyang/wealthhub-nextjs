'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';
import UsdExchangeRateChart from '@/components/UsdExchangeRateChart';
import UsdPurchaseRecords from '@/components/UsdPurchaseRecords';

interface UsdDetailPageProps {
  asset: Asset;
  marketData?: MarketDataHistoryResponse | null;
}

const UsdDetailPage: React.FC<UsdDetailPageProps> = ({ asset, marketData }) => {
  const totalInvestment = asset.amount;
  const totalRmbValue = totalInvestment;

  let currentExchangeRate = 7.24;
  if (marketData?.exchange_rate && Object.keys(marketData.exchange_rate).length > 0) {
    const entries = Object.entries(marketData.exchange_rate);
    if (entries.length > 0) {
      const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
      currentExchangeRate = sorted[0][1] || 7.24;
    }
  }

  const currentTotalValue = totalRmbValue / currentExchangeRate * currentExchangeRate;
  const profitLoss = currentTotalValue - totalRmbValue;
  const todayChangePercent = 0;

  return (
    <div className="space-y-4 -mt-2">
      <div 
        className="rounded-2xl bg-surface-darker border border-[rgba(34,197,94,0.12)] overflow-hidden shadow-sm"
        style={{
          borderRadius: '32px',
        }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-emerald-50/30 dark:from-emerald-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-emerald-600 dark:text-emerald-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {formatNumber(currentExchangeRate, 2)}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
                美元汇率 (USD/CNY)
              </div>
              <div className={`text-sm font-bold ${
                todayChangePercent >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {todayChangePercent >= 0 ? '+' : ''}{todayChangePercent}% 今日
              </div>
            </div>
          </div>

          <div className="pt-3">
            <div className="text-emerald-500 dark:text-emerald-400 text-2xl font-extrabold tracking-tight mb-0.5">
              {profitLoss >= 0 ? '+' : ''}¥{formatNumber(profitLoss, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              累计持有盈亏
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                美元金额
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {formatNumber(totalRmbValue / currentExchangeRate, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓汇率
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {formatNumber(totalRmbValue / (totalRmbValue / currentExchangeRate), 2)}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                总投资成本
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                ¥{formatNumber(totalInvestment, 0)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                当前总市值
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                ¥{formatNumber(currentTotalValue, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UsdExchangeRateChart />

      <UsdPurchaseRecords 
        asset={asset}
        currentExchangeRate={currentExchangeRate}
        marketData={marketData}
      />
    </div>
  );
};

export default UsdDetailPage;
