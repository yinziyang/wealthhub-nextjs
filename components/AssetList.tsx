'use client';

import React from 'react';
import AssetCard from './AssetCard';
import { Asset } from '../types';

interface AssetListProps {
  assets: Asset[];
}

const AssetList: React.FC<AssetListProps> = ({ assets }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          资产组合详情
        </h3>
      </div>
      
      {assets.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
          <p className="text-slate-400 text-sm">暂无资产记录，请点击底部 &quot;+&quot; 添加。</p>
        </div>
      ) : (
        assets.map(asset => (
          <AssetCard key={asset.id} asset={asset} />
        ))
      )}
    </div>
  );
};

export default AssetList;
