'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';
import GoldPriceChart from '@/components/GoldPriceChart';
import GoldPurchaseRecords from '@/components/GoldPurchaseRecords';

interface GoldDetailPageProps {
  asset: Asset;
  marketData?: MarketDataHistoryResponse | null;
}

const GoldDetailPage: React.FC<GoldDetailPageProps> = ({ asset, marketData }) => {
  // 从 asset 的 subtitle 中提取重量（例如："重量 5,000g"）
  const weightMatch = asset.subtitle.match(/(\d+(?:,\d+)*)g/);
  const weight = weightMatch ? parseFloat(weightMatch[1].replace(/,/g, '')) : 0;

  // 从 marketData 获取当前金价，如果没有则从 asset.subAmount 提取（例如："¥480 /g"）
  let currentPrice = 0;
  if (marketData?.gold_price) {
    const entries = Object.entries(marketData.gold_price);
    if (entries.length > 0) {
      const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
      currentPrice = sorted[0][1] || 0;
    }
  }
  if (currentPrice === 0) {
    const priceMatch = asset.subAmount.match(/¥(\d+(?:\.\d+)?)/);
    currentPrice = priceMatch ? parseFloat(priceMatch[1]) : 480;
  }

  // 计算当前总市值
  const currentMarketValue = weight * currentPrice;

  // 计算持仓均价（从总投资成本和重量计算）
  const totalInvestment = asset.amount; // 总投资成本
  const averagePrice = weight > 0 ? totalInvestment / weight : 0;

  // 计算累计持有盈亏
  const profitLoss = currentMarketValue - totalInvestment;

  // 计算今日涨跌幅（暂时设为0%，后续可以从市场数据计算）
  const todayChangePercent = 0;

  return (
    <div className="space-y-4 -mt-2">
      {/* 上半部分：价格和盈亏信息 */}
      <div 
        className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm"
        style={{
          borderRadius: '32px',
        }}
      >
        {/* 当前价格区域 */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-yellow-50/30 dark:from-yellow-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-yellow-500 dark:text-yellow-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {formatNumber(currentPrice, 0)}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
                当日总价 (AU9999)
              </div>
              <div className={`text-sm font-bold ${
                todayChangePercent >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {todayChangePercent >= 0 ? '+' : ''}{todayChangePercent}% 今日
              </div>
            </div>
          </div>

          {/* 累计持有盈亏 */}
          <div className="pt-3">
            <div className="text-emerald-500 dark:text-emerald-400 text-2xl font-extrabold tracking-tight mb-0.5">
              {profitLoss >= 0 ? '+' : ''}¥{formatNumber(profitLoss, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              累计持有盈亏
            </div>
          </div>
        </div>

        {/* 持仓信息 */}
        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓克数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {formatNumber(weight, 0)}g
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓均价
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {formatNumber(averagePrice, 2)}元/克
              </div>
            </div>
          </div>
        </div>

        {/* 投资成本和市值 */}
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
                ¥{formatNumber(currentMarketValue, 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 价格走势图表 */}
      <GoldPriceChart />

      {/* 购买记录 */}
      <GoldPurchaseRecords 
        asset={asset}
        currentGoldPrice={currentPrice}
        marketData={marketData}
      />
    </div>
  );
};

export default GoldDetailPage;
