"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Asset, GoldPurchaseRecord } from "@/types";
import { formatNumber } from "@/utils";
import type { MarketDataHistoryResponse } from "@/lib/api-response";
import { getGoldPurchases } from "@/lib/api/gold-purchases";
import GoldPriceChart from "@/components/GoldPriceChart";
import GoldPurchaseRecords from "@/components/GoldPurchaseRecords";

interface GoldDetailPageProps {
  asset: Asset;
  marketData?: MarketDataHistoryResponse | null;
}

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromiseGold: Promise<GoldPurchaseRecord[]> | null = null;
let globalFetchPromisePrice: Promise<MarketDataHistoryResponse> | null = null;

const GoldDetailPage: React.FC<GoldDetailPageProps> = ({
  asset,
  marketData,
}) => {
  const [purchaseRecords, setPurchaseRecords] = useState<GoldPurchaseRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceLoading, setPriceLoading] = useState(true);

  // 获取购买记录
  const fetchRecords = useCallback(async () => {
    // 如果已经有正在进行的全局请求，复用它
    if (globalFetchPromiseGold) {
      try {
        const data = await globalFetchPromiseGold;
        setPurchaseRecords(data);
        setLoading(false);
      } catch (err) {
        console.error("获取黄金买入记录失败:", err);
        setLoading(false);
      }
      return;
    }

    // 创建新的请求并缓存到全局变量
    setLoading(true);
    globalFetchPromiseGold = getGoldPurchases();

    try {
      const data = await globalFetchPromiseGold;
      setPurchaseRecords(data);
    } catch (err) {
      console.error("获取黄金买入记录失败:", err);
    } finally {
      setLoading(false);
      // 请求完成后立即清除全局缓存
      globalFetchPromiseGold = null;
    }
  }, []);

  // 获取实时金价数据
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchPriceData() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromisePrice) {
        try {
          const data = await globalFetchPromisePrice;
          if (!isCancelled) {
            extractPriceFromData(data);
            setPriceLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error("获取金价数据失败:", err);
            setPriceLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      // 使用 hours=1 只获取最近1小时的数据，避免和 GoldPriceChart 的请求冲突
      setPriceLoading(true);
      globalFetchPromisePrice = fetch("/api/market-data/history?hours=1", {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((result) => {
          if (result.success) {
            return result.data as MarketDataHistoryResponse;
          }
          throw new Error("获取数据失败");
        });

      try {
        const data = await globalFetchPromisePrice;

        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          extractPriceFromData(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("获取金价数据失败:", err);
        }
      } finally {
        if (!isCancelled) {
          setPriceLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromisePrice = null;
      }
    }

    // 从市场数据中提取最新金价（只提取价格，不计算涨跌幅）
    function extractPriceFromData(data: MarketDataHistoryResponse) {
      if (data?.gold_price) {
        const entries = Object.entries(data.gold_price);
        if (entries.length > 0) {
          // 按 key 排序，取最大的（最新的）
          const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
          const latestPrice = sorted[0][1] || 0;
          setCurrentPrice(latestPrice);
        }
      }
    }

    // Debounce to fetch to avoid double-calling in Strict Mode
    const timeoutId = setTimeout(() => {
      fetchPriceData();
    }, 50);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromiseGold) {
        try {
          const data = await globalFetchPromiseGold;
          if (!isCancelled) {
            setPurchaseRecords(data);
            setLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error("获取黄金买入记录失败:", err);
            setLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      setLoading(true);
      globalFetchPromiseGold = getGoldPurchases();

      try {
        const data = await globalFetchPromiseGold;

        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          setPurchaseRecords(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("获取黄金买入记录失败:", err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromiseGold = null;
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);


  // 从 marketData 获取今日涨跌幅（保持之前的获取方式不变）
  let todayChangePercent = 0;
  if (marketData?.gold_price) {
    const entries = Object.entries(marketData.gold_price);
    if (entries.length > 0) {
      const sorted = entries.sort(([a], [b]) => parseInt(b) - parseInt(a));
      if (sorted.length > 1) {
        const todayPrice = sorted[0][1];
        const yesterdayPrice = sorted[1][1];
        todayChangePercent =
          ((todayPrice - yesterdayPrice) / yesterdayPrice) * 100;
      }
    }
  }

  // 根据购买记录计算持仓克数（weight字段累加）
  const totalWeight = purchaseRecords.reduce(
    (sum, record) => sum + record.weight,
    0,
  );

  // 总投资成本（total_price累加）
  const totalInvestment = purchaseRecords.reduce(
    (sum, record) => sum + record.total_price,
    0,
  );

  // 持仓均价 = 总投资成本 / 持仓克数
  const averagePrice = totalWeight > 0 ? totalInvestment / totalWeight : 0;

  // 当前总市值 = 持仓克数 * 当前金价
  const currentMarketValue = totalWeight * currentPrice;

  // 累计持有盈亏 = 当前总市值 - 总投资成本
  const profitLoss = currentMarketValue - totalInvestment;

  return (
    <div className="space-y-4 -mt-2">
      {/* 上半部分：价格和盈亏信息 */}
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm"
        style={{
          borderRadius: "32px",
        }}
      >
        {/* 当前价格区域 */}
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-yellow-50/30 dark:from-yellow-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-yellow-500 dark:text-yellow-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {priceLoading ? (
                <span className="inline-block w-32 h-10 bg-yellow-200 dark:bg-yellow-800 rounded animate-pulse" />
              ) : (
                formatNumber(currentPrice, 2)
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

          {/* 累计持有盈亏 */}
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

        {/* 持仓信息 */}
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

        {/* 投资成本和市值 */}
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

      {/* 价格走势图表 */}
      <GoldPriceChart />

      {/* 购买记录 */}
      <GoldPurchaseRecords
        asset={asset}
        currentGoldPrice={currentPrice}
        marketData={marketData}
        records={purchaseRecords}
        loading={loading}
        onRefresh={fetchRecords}
      />
    </div>
  );
};

export default GoldDetailPage;
