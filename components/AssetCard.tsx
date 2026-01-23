'use client';

import React from 'react';
import { Asset } from '../types';
import { getIcon } from './icons';

interface AssetCardProps {
  asset: Asset;
  onClick?: (asset: Asset) => void;
  isLoading?: boolean;
}

const SkeletonPulse = ({ className }: { className: string }) => (
  <div className={`bg-slate-200 dark:bg-white/10 rounded animate-pulse ${className}`} />
);

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, isLoading = false }) => {
  const hasChart = asset.chart.path && asset.chart.path !== '';
  const IconComponent = getIcon(asset.icon);

  const handleClick = () => {
    if (onClick && !isLoading) {
      onClick(asset);
    }
  };

  // Helper to render subtitle based on asset type and loading state
  const renderSubtitle = () => {
    if (isLoading) {
      if (asset.type === 'gold') {
        return (
          <div className="flex items-center gap-1">
            <span>重量</span>
            <SkeletonPulse className="w-8 h-3 inline-block align-middle" />
            <span>g</span>
          </div>
        );
      }
      if (asset.type === 'debt') {
        return (
          <div className="flex items-center gap-1">
            <span>借出款项</span>
            <SkeletonPulse className="w-4 h-3 inline-block align-middle" />
            <span>笔</span>
          </div>
        );
      }
      // For rmb and usd, subtitle is static text or loading
      if (asset.type === 'usd') {
        return (
          <div className="flex items-center gap-1">
            <span>$</span>
            <SkeletonPulse className="w-10 h-3 inline-block align-middle" />
            <span>USD</span>
          </div>
        );
      }
      // RMB
      return asset.subtitle;
    }
    return asset.subtitle;
  };

  // Helper to render subAmount based on asset type and loading state
  const renderSubAmount = () => {
    if (isLoading) {
      if (asset.type === 'usd') {
        return (
          <div className="flex items-center justify-end gap-1">
            <span>汇率</span>
            <SkeletonPulse className="w-6 h-2.5" />
          </div>
        );
      }
      if (asset.type === 'gold') {
         return (
          <div className="flex items-center justify-end gap-0.5">
            <span>¥</span>
            <SkeletonPulse className="w-8 h-2.5" />
            <span>/g</span>
          </div>
        );
      }
      // RMB and Debt don't have subAmount skeleton logic specified as per requirements
      // "人民币存款，只有右上角的总额是需要骨架的"
      // "债权资产...右上角总额需要骨架" (subAmount usually static for debt: '待收回')
      return asset.subAmount;
    }
    return asset.subAmount;
  };

  return (
    <div 
      onClick={handleClick}
      className={`relative group overflow-hidden p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 shadow-sm transition-all ${!isLoading ? 'active:scale-[0.98] cursor-pointer' : 'cursor-default'}`}
    >
      {hasChart && (
        <div className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none z-0 opacity-40">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={asset.chart.id} x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor={asset.chart.gradientStart} stopOpacity="0.25"></stop>
                <stop offset="100%" stopColor={asset.chart.gradientStart} stopOpacity="0"></stop>
              </linearGradient>
            </defs>
            <path d={asset.chart.path} fill={`url(#${asset.chart.id})`}></path>
            <path 
              d={asset.chart.path.split('L 100 100')[0]} 
              fill="none" 
              stroke={asset.chart.strokeColor} 
              strokeOpacity="0.4" 
              strokeWidth="1.5"
            ></path>
          </svg>
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`size-10 rounded-xl ${asset.iconBgColor} flex items-center justify-center ${asset.iconColor} border border-white/5`}>
            {React.createElement(IconComponent, { size: 20 })}
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white text-sm font-bold">
              {asset.title}
            </h4>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {renderSubtitle()}
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          {isLoading ? (
             <SkeletonPulse className="w-24 h-6 mb-1" />
          ) : (
            <p className="text-slate-900 dark:text-white text-lg font-extrabold tracking-tight">
              {asset.displayAmount}
            </p>
          )}
          
          <span className={`text-[10px] font-bold ${asset.subAmountColor || 'opacity-0'} block min-h-[15px]`}>
            {renderSubAmount()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;
