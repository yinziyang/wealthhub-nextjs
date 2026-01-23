'use client';

import React from 'react';
import AssetCard from './AssetCard';
import { Asset } from '../types';
import { getLatestValue, generateChartPath } from '../utils';
import type { MarketDataHistoryResponse } from '../lib/api-response';

interface AssetListProps {
  assets: Asset[];
  marketData?: MarketDataHistoryResponse | null;
  isLoading?: boolean;
  onAssetClick?: (asset: Asset) => void;
}

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

      {/* 
        总是显示资产卡片，如果有数据加载中，传递 isLoading=true 给卡片组件
        移除 assets.length === 0 的判断，因为现在 assets 总是会初始化 4 个卡片
      */}
      {updatedAssets.map(asset => (
        <AssetCard 
          key={asset.id} 
          asset={asset} 
          onClick={onAssetClick} 
          isLoading={isLoading} 
        />
      ))}
    </div>
  );
};

export default AssetList;
