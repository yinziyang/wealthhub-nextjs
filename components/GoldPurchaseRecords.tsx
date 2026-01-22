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
      <div className="text-slate-900 dark:text-white text-base font-bold">
        购买记录
      </div>
      <div className="space-y-3">
        {sortedRecords.map((record) => {
          const goldPriceAmount = record.weight * record.goldPrice;
          const handlingFeeAmount = record.weight * record.handlingFee;
          const totalAmount = goldPriceAmount + handlingFeeAmount;

          return (
            <div
              key={record.id}
              className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm p-4"
            >
              {/* 顶部：日期和盈利/亏损 */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  {record.date}
                </div>
                <div className={`text-base font-bold ${
                  record.profitLoss >= 0 
                    ? 'text-emerald-500 dark:text-emerald-400' 
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {record.profitLoss >= 0 ? '+' : ''}¥{formatNumber(record.profitLoss, 0)}
                </div>
              </div>

              {/* 中间：购买信息 */}
              <div className="mb-3">
                <div className="text-slate-900 dark:text-white text-sm">
                  {formatNumber(record.weight, 0)}g 金价：{formatNumber(record.goldPrice, 1)}/g 手续费: {formatNumber(record.handlingFee, 0)}元/g
                </div>
              </div>

              {/* 底部：成本明细 */}
              <div className="pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-slate-500 dark:text-slate-400">
                    ¥{formatNumber(goldPriceAmount, 0)} (金价) + ¥{formatNumber(handlingFeeAmount, 0)} (手续费) = 
                  </div>
                  <div className="text-yellow-500 dark:text-yellow-400 font-bold ml-2">
                    ¥{formatNumber(totalAmount, 0)}
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
