'use client';

import React, { useMemo } from 'react';
import { Asset, GoldPurchaseRecord } from '@/types';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';

interface GoldPurchaseRecordsProps {
  asset: Asset;
  currentGoldPrice: number;
  marketData?: MarketDataHistoryResponse | null;
}

const GoldPurchaseRecords: React.FC<GoldPurchaseRecordsProps> = ({
  asset,
  currentGoldPrice,
  marketData,
}) => {
  // 获取购买记录，如果没有则从 asset 数据推断
  const purchaseRecords = useMemo(() => {
    // 如果 asset 中有购买记录，直接使用
    if (asset.purchaseRecords && asset.purchaseRecords.length > 0) {
      return asset.purchaseRecords;
    }

    // 测试数据：创建5个购买记录用于UI展示
    const testRecords: GoldPurchaseRecord[] = [
      {
        id: `${asset.id}-test-1`,
        date: '2026-01-19',
        weight: 250,
        goldPrice: 1043.6,
        handlingFee: 15,
      },
      {
        id: `${asset.id}-test-2`,
        date: '2026-01-14',
        weight: 100,
        goldPrice: 1033.4,
        handlingFee: 20,
      },
      {
        id: `${asset.id}-test-3`,
        date: '2026-01-10',
        weight: 500,
        goldPrice: 1025.0,
        handlingFee: 12,
      },
      {
        id: `${asset.id}-test-4`,
        date: '2026-01-05',
        weight: 300,
        goldPrice: 1018.5,
        handlingFee: 18,
      },
      {
        id: `${asset.id}-test-5`,
        date: '2025-12-28',
        weight: 200,
        goldPrice: 1005.2,
        handlingFee: 15,
      },
    ];

    // 返回测试数据
    return testRecords;

    // 原始逻辑：从 asset 数据推断（暂时注释，使用测试数据）
    // // 否则从 asset 的 subtitle 和 date 推断一条记录
    // // 从 subtitle 提取重量（例如："重量 5,000g"）
    // const weightMatch = asset.subtitle.match(/(\d+(?:,\d+)*)g/);
    // const weight = weightMatch ? parseFloat(weightMatch[1].replace(/,/g, '')) : 0;

    // // 从 subAmount 提取金价（例如："¥480 /g"）
    // const priceMatch = asset.subAmount.match(/¥(\d+(?:\.\d+)?)/);
    // const goldPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;

    // // 从 amount 和 weight、goldPrice 计算手续费
    // // amount = weight * (goldPrice + handlingFee)
    // // handlingFee = (amount / weight) - goldPrice
    // const totalCost = Math.abs(asset.amount);
    // const handlingFee = weight > 0 && goldPrice > 0 
    //   ? (totalCost / weight) - goldPrice 
    //   : 0;

    // if (weight > 0 && goldPrice > 0 && asset.date) {
    //   return [{
    //     id: `${asset.id}-record-1`,
    //     date: asset.date,
    //     weight,
    //     goldPrice,
    //     handlingFee: Math.max(0, handlingFee), // 确保手续费不为负
    //   }];
    // }

    // return [];
  }, [asset]);

  // 计算每条记录的盈利/亏损
  const recordsWithProfit = useMemo(() => {
    return purchaseRecords.map(record => {
      // 当前市值 = 重量 * 当前金价
      const currentValue = record.weight * currentGoldPrice;
      // 购买成本 = 重量 * (金价 + 手续费)
      const purchaseCost = record.weight * (record.goldPrice + record.handlingFee);
      // 盈利/亏损 = 当前市值 - 购买成本
      const profitLoss = currentValue - purchaseCost;

      return {
        ...record,
        profitLoss,
        currentValue,
        purchaseCost,
      };
    });
  }, [purchaseRecords, currentGoldPrice]);

  // 按日期降序排列（最新的在前）
  const sortedRecords = useMemo(() => {
    return [...recordsWithProfit].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [recordsWithProfit]);

  if (sortedRecords.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          购买记录
        </div>
        <div className="text-xs text-slate-500 font-normal">
          {sortedRecords.length}笔交易
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {sortedRecords.map((record) => {
          const goldPriceAmount = record.weight * record.goldPrice;
          const handlingFeeAmount = record.weight * record.handlingFee;
          const totalAmount = goldPriceAmount + handlingFeeAmount;

          return (
            <div
              key={record.id}
              className="rounded-xl bg-surface-darker border border-[rgba(167,125,47,0.12)] p-3 shadow-sm"
            >
              {/* 第一行：主要信息 (克重、日期、总盈亏) */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatNumber(record.weight, 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">g</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {record.date}
                  </span>
                </div>
                <div className={`text-sm font-bold ${record.profitLoss >= 0
                  ? 'text-emerald-500'
                  : 'text-red-500'
                  }`}>
                  {record.profitLoss >= 0 ? '+' : ''}¥{formatNumber(record.profitLoss, 0)}
                </div>
              </div>

              {/* 第二行：详细数据 */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                {/* 左侧：单价信息 */}
                <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">金价</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(record.goldPrice, 1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">工费</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(record.handlingFee, 0)}</span>
                  </div>
                </div>

                {/* 右侧：总成本构成 */}
                <div className="flex flex-col gap-1 items-end text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(goldPriceAmount, 0)}</span>
                    <span className="opacity-70 text-[10px]">+ ¥{formatNumber(handlingFeeAmount, 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">总成本</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-500 text-sm">¥{formatNumber(totalAmount, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoldPurchaseRecords;
