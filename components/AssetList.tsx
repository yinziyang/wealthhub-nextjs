'use client';

import React from 'react';
import AssetCard from './AssetCard';
import { Asset } from '../types';
import { getLatestValue, generateChartPath } from '../utils';
import { getIcon } from './icons';
import type { MarketDataHistoryResponse } from '../lib/api-response';

interface AssetListProps {
  assets: Asset[];
  marketData?: MarketDataHistoryResponse | null;
  isLoading?: boolean;
  onAssetClick?: (asset: Asset) => void;
}

interface AssetCardSkeletonProps {
  asset: Asset;
}

const AssetCardSkeleton: React.FC<AssetCardSkeletonProps> = ({ asset }) => {
  const IconComponent = getIcon(asset.icon);

  return (
    <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl ${asset.iconBgColor} flex items-center justify-center ${asset.iconColor} border border-white/5`}>
            {React.createElement(IconComponent, { size: 20 })}
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white text-sm font-bold">
              {asset.title}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              {asset.subtitle}
            </p>
          </div>
        </div>
        <div className="space-y-2 text-right">
          <div className="w-24 h-6 bg-slate-100 dark:bg-white/10 rounded animate-pulse" />
          <div className="w-16 h-3 bg-slate-50 dark:bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
};

const AssetList: React.FC<AssetListProps> = ({ assets, marketData, isLoading, onAssetClick }) => {
  const updatedAssets = assets.map(asset => {
    if (!marketData) return asset;

    if (asset.type === 'usd') {
      const latestRate = getLatestValue(marketData.exchange_rate);
      const chartPath = generateChartPath(marketData.exchange_rate);
      return {
        ...asset,
        subAmount: `汇率 ${latestRate}`,
        chart: { ...asset.chart, path: chartPath }
      };
    }

    if (asset.type === 'gold') {
      const latestPrice = getLatestValue(marketData.gold_price);
      const chartPath = generateChartPath(marketData.gold_price);
      return {
        ...asset,
        subAmount: `¥${latestPrice} /g`,
        chart: { ...asset.chart, path: chartPath }
      };
    }

    return asset;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          资产组合详情
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <p className="text-slate-400 text-sm">暂无资产记录，请点击底部 &quot;+&quot; 添加。</p>
        </div>
      ) : isLoading ? (
        assets.map(asset => (
          <AssetCardSkeleton key={asset.id} asset={asset} />
        ))
      ) : (
        updatedAssets.map(asset => (
          <AssetCard key={asset.id} asset={asset} onClick={onAssetClick} />
        ))
      )}
    </div>
  );
};

export default AssetList;
