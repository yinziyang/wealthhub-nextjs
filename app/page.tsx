'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AssetOverview from '@/components/AssetOverview';
import AssetList from '@/components/AssetList';
import BottomNav from '@/components/BottomNav';
import AddAssetModal from '@/components/AddAssetModal';
import { Asset } from '@/types';
import { createAssetObject } from '@/utils';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('private_client_assets');
    const today = new Date().toISOString().split('T')[0];
    
    const defaultAssets: Asset[] = [
       createAssetObject('rmb', '人民币存款', 5000000, true, {}, today, 'default-rmb'),
       createAssetObject('usd', '美元资产', 3550000, true, { usdAmount: 500000, exchangeRate: 7.1 }, today, 'default-usd'),
       createAssetObject('gold', '实物黄金', 2400000, true, { weight: 5000, goldPrice: 480 }, today, 'default-gold'),
       createAssetObject('debt', '债权资产', 1500000, true, {}, today, 'default-debt'),
    ];
    defaultAssets[0].subtitle = '4个账户正在监测';
    defaultAssets[3].subtitle = '3笔进行中借款';
    
    const loadedAssets = saved ? JSON.parse(saved) : defaultAssets;
    
    const idMap = new Map<string, number>();
    const uniqueAssets = loadedAssets.map((asset: Asset) => {
      const count = idMap.get(asset.id) || 0;
      idMap.set(asset.id, count + 1);
      
      if (count > 0) {
        return { ...asset, id: `${asset.id}-dup-${count}` };
      }
      return asset;
    });
    
    setAssets(uniqueAssets);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('private_client_assets', JSON.stringify(assets));
    }
  }, [assets, isLoaded]);

  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-50 transition-colors duration-200 min-h-screen flex justify-center">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md bg-background-light dark:bg-background-dark shadow-2xl border-x border-slate-200 dark:border-slate-800">
        
        <Header />
        
        <main className="flex-1 px-5 pt-[100px] pb-28">
          <AssetOverview assets={assets} />
          <AssetList assets={assets} />
        </main>

        <BottomNav onAddClick={() => setIsModalOpen(true)} />

        <AddAssetModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleAddAsset}
        />
        
      </div>
    </div>
  );
}
