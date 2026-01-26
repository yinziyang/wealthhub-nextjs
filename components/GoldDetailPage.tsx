"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Asset, GoldPurchaseRecord } from "@/types";
import { formatNumber } from "@/utils";
import type {
  MarketDataHistoryResponse,
  MarketDataHourlyHistoryResponse,
} from "@/lib/api-response";
import GoldPriceChart from "@/components/GoldPriceChart";
import GoldPurchaseRecords from "@/components/GoldPurchaseRecords";

interface GoldDetailPageProps {
  asset: Asset;
}

const GoldDetailPage: React.FC<GoldDetailPageProps> = ({
  asset,
}) => {
  // State definitions
  const [data24h, setData24h] = useState<MarketDataHourlyHistoryResponse | null>(null);
  const [data7d, setData7d] = useState<MarketDataHistoryResponse | null>(null);
  const [purchaseRecords, setPurchaseRecords] = useState<GoldPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated data fetching
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchAllData() {
      setLoading(true);
      setError(null);

      try {
        // Parallel requests
        const [res24h, res7d, resRecords] = await Promise.all([
          fetch('/api/market-data/history?hours=24', { signal: controller.signal }),
          fetch('/api/market-data/history?days=7', { signal: controller.signal }),
          fetch('/api/gold-purchases', { signal: controller.signal }),
        ]);

        // Parse responses
        const [json24h, json7d, jsonRecords] = await Promise.all([
          res24h.json(),
          res7d.json(),
          resRecords.json(),
        ]);

        if (isCancelled) return;

        // Update state
        if (json24h.success) {
          setData24h(json24h.data);
        }
        if (json7d.success) {
          setData7d(json7d.data);
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

  // Calculate current price and change
  const currentPrice = useMemo(() => {
    if (!data24h?.gold_price) return 0;
    const entries = Object.entries(data24h.gold_price);
    if (entries.length === 0) return 0;
    const sorted = entries.sort(([a], [b]) => b.localeCompare(a));
    return sorted[0][1] || 0;
  }, [data24h]);

  const todayChangePercent = useMemo(() => {
    if (!data7d?.gold_price) return 0;
    const entries = Object.entries(data7d.gold_price);
    if (entries.length < 2) return 0;
    const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
    const todayPrice = sorted[0][1];
    const yesterdayPrice = sorted[1][1];
    if (yesterdayPrice === 0) return 0;
    return ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
  }, [data7d]);

  // Refresh records after update/delete
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/gold-purchases');
      const json = await res.json();
      if (json.success) {
        setPurchaseRecords(json.data);
      }
    } catch (err) {
      console.error('刷新购买记录失败:', err);
    }
  }, []);

  // Calculate statistics
  const totalWeight = purchaseRecords.reduce(
    (sum, record) => sum + record.weight,
    0,
  );

  const totalInvestment = purchaseRecords.reduce(
    (sum, record) => sum + record.total_price,
    0,
  );

  const averagePrice = totalWeight > 0 ? totalInvestment / totalWeight : 0;
  const currentMarketValue = totalWeight * currentPrice;
  const profitLoss = currentMarketValue - totalInvestment;

  return (
    <div className="space-y-4 -mt-2">
      {/* Top Section: Price and Profit/Loss */}
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm"
        style={{
          borderRadius: "32px",
        }}
      >
        {/* Current Price Area */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-yellow-50/30 dark:from-yellow-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-yellow-500 dark:text-yellow-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {currentPrice > 0 ? (
                formatNumber(currentPrice, 2)
              ) : (
                <span className="inline-block w-32 h-10 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
                当前金价 (AU9999)
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

          {/* Cumulative Profit/Loss */}
          <div className="pt-3">
            <div className="text-emerald-500 dark:text-emerald-400 text-2xl font-extrabold tracking-tight mb-0.5">
              {loading
                ? "..."
                : `${profitLoss >= 0 ? "+" : ""}¥${formatNumber(profitLoss, 0)}`}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              累计持有盈亏
            </div>
          </div>
        </div>

        {/* Holdings Info */}
        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓克数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? "..." : formatNumber(totalWeight, 2)}g
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                持仓均价
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? "..." : formatNumber(averagePrice, 2)}元/克
              </div>
            </div>
          </div>
        </div>

        {/* Investment and Market Value */}
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
                {loading ? "..." : `¥${formatNumber(currentMarketValue, 0)}`}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart */}
      {loading ? (
        <div className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm p-4 h-[250px] flex items-center justify-center">
          <div className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
            加载图表数据...
          </div>
        </div>
      ) : (
        <GoldPriceChart initialData24h={data24h} />
      )}

      {/* Purchase Records */}
      <GoldPurchaseRecords
        asset={asset}
        currentGoldPrice={currentPrice}
        records={purchaseRecords}
        loading={loading}
        onRefresh={fetchRecords}
      />
    </div>
  );
};

export default GoldDetailPage;
