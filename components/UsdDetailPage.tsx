"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Asset, UsdPurchaseRecord } from "@/types";
import { formatNumber } from "@/utils";
import type { MarketDataHistoryResponse } from "@/lib/api-response";
import UsdExchangeRateChart from "@/components/UsdExchangeRateChart";
import UsdPurchaseRecords from "@/components/UsdPurchaseRecords";

interface UsdDetailPageProps {
  asset: Asset;
}

const UsdDetailPage: React.FC<UsdDetailPageProps> = ({
  asset: _asset,
}) => {
  const [data30d, setData30d] = useState<MarketDataHistoryResponse | null>(null);
  const [purchaseRecords, setPurchaseRecords] = useState<UsdPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchAllData() {
      setLoading(true);
      setError(null);

      try {
        const [resMarket, resRecords] = await Promise.all([
          fetch('/api/market-data/history?days=30', { signal: controller.signal }),
          fetch('/api/usd-purchases', { signal: controller.signal }),
        ]);

        const [jsonMarket, jsonRecords] = await Promise.all([
          resMarket.json(),
          resRecords.json(),
        ]);

        if (isCancelled) return;

        if (jsonMarket.success) {
          setData30d(jsonMarket.data);
        }
        if (jsonRecords.success) {
          setPurchaseRecords(jsonRecords.data);
        }
      } catch (err) {
        if (!isCancelled && err instanceof Error && err.name !== 'AbortError') {
          console.error('获取数据失败:', err);
          setError('数据加载失败');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchAllData();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  // Calculate current exchange rate and change
  const currentExchangeRate = useMemo(() => {
    if (!data30d?.exchange_rate) return 7.24; // Default value
    const entries = Object.entries(data30d.exchange_rate);
    if (entries.length === 0) return 7.24;
    const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
    return sorted[0][1] || 7.24;
  }, [data30d]);

  const todayChangePercent = useMemo(() => {
    if (!data30d?.exchange_rate) return 0;
    const entries = Object.entries(data30d.exchange_rate);
    if (entries.length < 2) return 0;
    const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
    const todayRate = sorted[0][1];
    const yesterdayRate = sorted[1][1];
    if (yesterdayRate === 0) return 0;
    return ((todayRate - yesterdayRate) / yesterdayRate) * 100;
  }, [data30d]);

  // Refresh purchase records only
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/usd-purchases');
      const json = await res.json();
      if (json.success) {
        setPurchaseRecords(json.data);
      }
    } catch (err) {
      console.error('刷新购汇记录失败:', err);
    }
  }, []);

  // Calculate statistics
  const totalUsdAmount = purchaseRecords.reduce(
    (sum, record) => sum + record.usd_amount,
    0,
  );

  const totalInvestment = purchaseRecords.reduce(
    (sum, record) => sum + record.total_rmb_amount,
    0,
  );

  const averageExchangeRate =
    totalUsdAmount > 0 ? totalInvestment / totalUsdAmount : 0;

  const currentTotalValue = totalUsdAmount * currentExchangeRate;
  const profitLoss = currentTotalValue - totalInvestment;

  return (
    <div className="space-y-4 -mt-2">
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(34,197,94,0.12)] overflow-hidden shadow-sm"
        style={{
          borderRadius: "32px",
        }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-emerald-50/30 dark:from-emerald-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-emerald-600 dark:text-emerald-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {loading ? (
                <span className="inline-block w-32 h-10 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse" />
              ) : (
                formatNumber(currentExchangeRate, 4)
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
                美元汇率 (USD/CNY)
              </div>
              <div
                className={`text-sm font-bold ${
                  todayChangePercent >= 0
                    ? "text-emerald-500 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {todayChangePercent >= 0 ? "+" : ""}
                {formatNumber(todayChangePercent, 2)}% 今日
              </div>
            </div>
          </div>

          <div className="pt-3">
            <div className="text-emerald-500 dark:text-emerald-400 text-2xl font-extrabold tracking-tight mb-0.5">
              {loading ? (
                <span className="inline-block w-24 h-8 bg-emerald-200 dark:bg-emerald-800 rounded animate-pulse" />
              ) : (
                `${profitLoss >= 0 ? "+" : ""}¥${formatNumber(profitLoss, 0)}`
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

      {loading ? (
        <div className="rounded-2xl bg-surface-darker border border-[rgba(34,197,94,0.12)] overflow-hidden shadow-sm p-4 h-[250px] flex items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            加载图表数据...
          </div>
        </div>
      ) : (
        <UsdExchangeRateChart initialData30d={data30d} />
      )}

      <UsdPurchaseRecords
        currentExchangeRate={currentExchangeRate}
        records={purchaseRecords}
        loading={loading}
        onRefresh={fetchRecords}
      />
    </div>
  );
};

export default UsdDetailPage;
