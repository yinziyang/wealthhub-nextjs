'use client';

import React from 'react';
import { Asset } from '../types';
import { getIcon } from './icons';

interface AssetCardProps {
  asset: Asset;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const hasChart = asset.chart.path && asset.chart.path !== '';
  const IconComponent = getIcon(asset.icon);

  return (
    <div 
      className="relative group overflow-hidden p-5 rounded-2xl bg-white dark:bg-surface-dark border border-slate-100 dark:border-white/5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
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
            <p className="text-[10px] text-slate-400 font-medium">
              {asset.subtitle}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-slate-900 dark:text-white text-lg font-extrabold tracking-tight">
            {asset.displayAmount}
          </p>
          <span className={`text-[10px] font-bold ${asset.subAmountColor || 'opacity-0'}`}>
            {asset.subAmount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AssetCard;
