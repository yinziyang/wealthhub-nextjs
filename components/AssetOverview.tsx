'use client';

import React, { useMemo } from 'react';
import { DistributionItem, Asset } from '../types';
import { formatNumber } from '../utils';

interface AssetOverviewProps {
  assets: Asset[];
}

const AssetOverview: React.FC<AssetOverviewProps> = ({ assets }) => {
  
  const { total, distribution } = useMemo(() => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.amount, 0);
    
    const grouped = assets.reduce((acc, asset) => {
      acc[asset.type] = (acc[asset.type] || 0) + asset.amount;
      return acc;
    }, {} as Record<string, number>);

    const typeConfig: Record<string, { label: string, color: string, bgColor: string }> = {
      rmb: { label: '人民币', color: 'text-primary', bgColor: 'bg-primary' },
      usd: { label: '美元资产', color: 'text-[#4a6fa5]', bgColor: 'bg-[#4a6fa5]' },
      gold: { label: '实物黄金', color: 'text-[#c5a059]', bgColor: 'bg-[#c5a059]' },
      debt: { label: '债权资产', color: 'text-[#58508d]', bgColor: 'bg-[#58508d]' }
    };

    let accumulatedPercentage = 0;
    const distItems: DistributionItem[] = [];

    Object.keys(grouped).forEach((type) => {
        const value = grouped[type];
        if (value <= 0) return;

        const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
        
        distItems.push({
            id: type,
            label: typeConfig[type]?.label || type,
            percentage: percentage,
            color: typeConfig[type]?.color || 'text-slate-500',
            bgColor: typeConfig[type]?.bgColor || 'bg-slate-500',
            offset: -accumulatedPercentage
        });

        accumulatedPercentage += percentage;
    });
    
    return { total: totalValue, distribution: distItems };
  }, [assets]);

  const formattedTotal = formatNumber(total);
  const [totalInt, totalDec] = formattedTotal.split('.');

  return (
    <section 
      className="relative -mt-2 bg-surface-darker border border-[rgba(167,125,47,0.12)] pt-8 pb-8 px-6 mb-8 shadow-[0_10px_40px_-10px_rgba(167,125,47,0.15)]"
      style={{
        borderRadius: '32px',
        overflow: 'hidden',
        WebkitMaskImage: '-webkit-radial-gradient(white, white)',
        maskImage: 'radial-gradient(white, white)',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        isolation: 'isolate'
      }}
    >
      <div 
        className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none"
        style={{
          transform: 'translate(30%, -30%)',
          WebkitTransform: 'translate(30%, -30%) translateZ(0)',
          willChange: 'transform'
        }}
      ></div>
      
      <div className="relative z-10 w-full mb-8">
        <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mb-2">
          净资产估值 (CNY)
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-primary">¥</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {totalInt}
            {totalDec && <span className="text-xl text-slate-600 font-medium">.{totalDec}</span>}
          </h1>
        </div>
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="relative size-32 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
            <circle 
              className="text-white/5" 
              cx="21" 
              cy="21" 
              fill="transparent" 
              r="16" 
              stroke="currentColor" 
              strokeWidth="5"
            ></circle>
            
            {total > 0 && distribution.map((item) => (
              <circle
                key={item.id}
                className={`${item.color} transition-all duration-300 ease-out cursor-pointer hover:filter hover:brightness-125`}
                cx="21"
                cy="21"
                fill="transparent"
                r="16"
                stroke="currentColor"
                strokeWidth="5.5"
                strokeDasharray={`${item.percentage} ${100 - item.percentage}`}
                strokeDashoffset={item.offset}
                style={{ transitionProperty: 'stroke-width, filter' }}
              >
                 <title>{item.label}: {formatNumber(item.percentage, 1)}%</title>
              </circle>
            ))}
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[12px] font-bold text-slate-400">Total</span>
            <span className="text-[14px] font-extrabold text-white">100%</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1">
          {distribution.map((item) => (
             <div key={item.id} className="flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-2">
                <div className={`size-2 rounded-full ${item.bgColor || item.color.replace('text-', 'bg-')}`}></div>
                <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                  {item.label}
                </span>
              </div>
              <span className="text-xs font-bold text-white">
                {formatNumber(item.percentage, 1)}%
              </span>
            </div>
          ))}
          {distribution.length === 0 && (
             <div className="text-xs text-slate-500 italic">暂无数据分布</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AssetOverview;
