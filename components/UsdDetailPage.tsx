'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Asset, UsdPurchaseRecord } from '@/types';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';
import { getUsdPurchases } from '@/lib/api/usd-purchases';
import UsdExchangeRateChart from '@/components/UsdExchangeRateChart';
import UsdPurchaseRecords from '@/components/UsdPurchaseRecords';

interface UsdDetailPageProps {
  asset: Asset;
  marketData?: MarketDataHistoryResponse | null;
}

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromiseUsd: Promise<UsdPurchaseRecord[]> | null = null;

// asset 参数保留以保持接口兼容性，但数据从接口获取
const UsdDetailPage: React.FC<UsdDetailPageProps> = ({ asset: _asset, marketData }) => {
  const [purchaseRecords, setPurchaseRecords] = useState<UsdPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取购买记录
  const fetchRecords = useCallback(async () => {
    // 如果已经有正在进行的全局请求，复用它
    if (globalFetchPromiseUsd) {
      try {
        const data = await globalFetchPromiseUsd;
        setPurchaseRecords(data);
        setLoading(false);
      } catch (err) {
        console.error('获取美元购汇记录失败:', err);
        setLoading(false);
      }
      return;
    }

    // 创建新的请求并缓存到全局变量
    setLoading(true);
    globalFetchPromiseUsd = getUsdPurchases();

    try {
      const data = await globalFetchPromiseUsd;
      setPurchaseRecords(data);
    } catch (err) {
      console.error('获取美元购汇记录失败:', err);
    } finally {
      setLoading(false);
      // 请求完成后立即清除全局缓存
      globalFetchPromiseUsd = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromiseUsd) {
        try {
          const data = await globalFetchPromiseUsd;
          if (!isCancelled) {
            setPurchaseRecords(data);
            setLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error('获取美元购汇记录失败:', err);
            setLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      setLoading(true);
      globalFetchPromiseUsd = getUsdPurchases();

      try {
        const data = await globalFetchPromiseUsd;

        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          setPurchaseRecords(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('获取美元购汇记录失败:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromiseUsd = null;
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 从 marketData 获取当前汇率，如果没有则使用默认值
  let currentExchangeRate = 7.24;
  let todayChangePercent = 0;
  if (marketData?.exchange_rate) {
    const entries = Object.entries(marketData.exchange_rate);
    if (entries.length > 0) {
      const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
      currentExchangeRate = sorted[0][1] || 7.24;
      if (sorted.length > 1) {
        const todayRate = sorted[0][1];
        const yesterdayRate = sorted[1][1];
        todayChangePercent = ((todayRate - yesterdayRate) / yesterdayRate) * 100;
      }
    }
  }

  // 根据购买记录计算总美元金额（usd_amount累加）
  const totalUsdAmount = purchaseRecords.reduce(
    (sum, record) => sum + record.usd_amount,
    0,
  );

  // 总投资成本（total_rmb_amount累加）
  const totalInvestment = purchaseRecords.reduce(
    (sum, record) => sum + record.total_rmb_amount,
    0,
  );

  // 持仓汇率 = 总投资成本 / 总美元金额
  const averageExchangeRate = totalUsdAmount > 0 ? totalInvestment / totalUsdAmount : 0;

  // 当前总市值 = 总美元金额 * 当前汇率
  const currentTotalValue = totalUsdAmount * currentExchangeRate;

  // 累计持有盈亏 = 当前总市值 - 总投资成本
  const profitLoss = currentTotalValue - totalInvestment;

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
              {loading ? (
                <span className="inline-block w-32 h-10 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse" />
              ) : (
                formatNumber(currentExchangeRate, 2)
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
                美元汇率 (USD/CNY)
              </div>
              <div className={`text-sm font-bold ${
                todayChangePercent >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {todayChangePercent >= 0 ? '+' : ''}{formatNumber(todayChangePercent, 2)}% 今日
              </div>
            </div>
          </div>

          <div className="pt-3">
            <div className="text-emerald-500 dark:text-emerald-400 text-2xl font-extrabold tracking-tight mb-0.5">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse" />
              ) : (
                `${profitLoss >= 0 ? '+' : ''}¥${formatNumber(profitLoss, 0)}`
              )}
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
                {loading ? "..." : formatNumber(totalUsdAmount, 2)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓汇率
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? "..." : formatNumber(averageExchangeRate, 4)}
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
                {loading ? "..." : `¥${formatNumber(totalInvestment, 0)}`}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                当前总市值
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? "..." : `¥${formatNumber(currentTotalValue, 0)}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      <UsdExchangeRateChart />

      <UsdPurchaseRecords 
        asset={_asset}
        currentExchangeRate={currentExchangeRate}
        marketData={marketData}
        records={purchaseRecords}
        loading={loading}
        onRefresh={fetchRecords}
      />
    </div>
  );
};

export default UsdDetailPage;
