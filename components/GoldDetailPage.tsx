"use client";

import React, { useState, useEffect } from "react";
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

const GoldDetailPage: React.FC<GoldDetailPageProps> = ({
  asset,
  marketData,
}) => {
  const [purchaseRecords, setPurchaseRecords] = useState<GoldPurchaseRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // 获取购买记录
  useEffect(() => {
    let isCancelled = false;

    async function fetchRecords() {
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

    fetchRecords();

    return () => {
      isCancelled = true;
    };
  }, []);

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

  // 计算今日涨跌幅（暂时设为0%，后续可以从市场数据计算）
  const todayChangePercent = 0;

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
              {formatNumber(currentPrice, 2)}
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
                {todayChangePercent}% 今日
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
      />
    </div>
  );
};

export default GoldDetailPage;
