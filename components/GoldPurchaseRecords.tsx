'use client';

import React, { useMemo } from 'react';
import { Asset, GoldPurchaseRecord } from '@/types';
import { formatNumber } from '@/utils';
import { MarketDataHistoryResponse } from '@/lib/api-response';

interface GoldPurchaseRecordsProps {
  asset: Asset;
  currentGoldPrice: number;
  marketData?: MarketDataHistoryResponse | null;
  records: GoldPurchaseRecord[];
  loading: boolean;
}

interface RecordWithProfit extends GoldPurchaseRecord {
  profitLoss: number;
  currentValue: number;
  purchaseCost: number;
}

const GoldPurchaseRecords: React.FC<GoldPurchaseRecordsProps> = ({
  currentGoldPrice,
  records,
  loading,
}) => {
  const recordsWithProfit = useMemo<RecordWithProfit[]>(() => {
    return records.map(record => {
      const currentValue = record.weight * currentGoldPrice;
      const profitLoss = currentValue - record.total_price;

      return {
        ...record,
        profitLoss,
        currentValue,
        purchaseCost: record.total_price,
      };
    });
  }, [records, currentGoldPrice]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (recordsWithProfit.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无购买记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          购买记录
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {recordsWithProfit.length}笔交易
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {recordsWithProfit.map((record) => (
          <div
            key={record.id}
            className="rounded-xl bg-surface-darker border border-[rgba(167,125,47,0.12)] p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatNumber(record.weight, 0)}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">g</span>
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(record.purchase_date)}
                </span>
              </div>
              <div className={`text-sm font-bold ${
                record.profitLoss >= 0
                  ? 'text-emerald-500'
                  : 'text-red-500'
              }`}>
                {record.profitLoss >= 0 ? '+' : ''}¥{formatNumber(record.profitLoss, 0)}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">金价</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.gold_price_per_gram, 1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">工费</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.handling_fee_per_gram, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">渠道</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {record.purchase_channel}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 items-end text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.weight * record.gold_price_per_gram, 0)}
                  </span>
                  <span className="opacity-70 text-[10px]">
                    + ¥{formatNumber(record.weight * record.handling_fee_per_gram, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="opacity-70">总成本</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-500 text-sm">
                    ¥{formatNumber(record.total_price, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoldPurchaseRecords;
