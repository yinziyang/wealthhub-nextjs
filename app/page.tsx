'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import AssetOverview from '@/components/AssetOverview';
import AssetList from '@/components/AssetList';
import BottomNav from '@/components/BottomNav';
import AddAssetModal from '@/components/AddAssetModal';
import ProfilePage from '@/components/ProfilePage';
import GoldDetailPage from '@/components/GoldDetailPage';
import UsdDetailPage from '@/components/UsdDetailPage';
import AuthGuard from '@/components/AuthGuard';
import { Asset } from '@/types';
import { createAssetObject } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';

type CurrentTab = 'assets' | 'profile';
type AssetView = 'list' | 'gold-detail' | 'usd-detail';

function Dashboard() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<CurrentTab>('assets');
  const [assetView, setAssetView] = useState<AssetView>('list');
  const [selectedGoldAsset, setSelectedGoldAsset] = useState<Asset | null>(null);
  const [selectedUsdAsset, setSelectedUsdAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [marketData, setMarketData] = useState<MarketDataHistoryResponse | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(false);

  const STORAGE_KEY = user?.email 
    ? `private_client_assets_${user.email}` 
    : 'private_client_assets';

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
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
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
    }
  }, [assets, isLoaded, STORAGE_KEY]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMarketData = async () => {
      if (currentTab !== 'assets') return;

      setIsMarketDataLoading(true);
      try {
        const response = await fetch('/api/market-data/history?days=7', {
          signal: controller.signal
        });
        const result = await response.json();
        
        if (!controller.signal.aborted) {
          if (result.success) {
            setMarketData(result.data);
          } else {
            setMarketData({
              gold_price: {},
              exchange_rate: {}
            });
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        
        setMarketData({
          gold_price: {},
          exchange_rate: {}
        });
      } finally {
        if (!controller.signal.aborted) {
          setIsMarketDataLoading(false);
        }
      }
    };

    // Debounce to fetch to avoid double-calling in Strict Mode
    const timeoutId = setTimeout(() => {
      fetchMarketData();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentTab]);

  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [newAsset, ...prev]);
  };

  const handleTabChange = (tab: CurrentTab) => {
    setCurrentTab(tab);
    // 切换标签时重置资产视图为列表
    if (tab === 'assets') {
      setAssetView('list');
      setSelectedGoldAsset(null);
    }
    // 由于"资产/我的"在同一页面内切换，滚动位置会被复用；这里强制回到顶部
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const handleAssetClick = (asset: Asset) => {
    if (asset.type === 'gold') {
      setSelectedGoldAsset(asset);
      setSelectedUsdAsset(null);
      setAssetView('gold-detail');
    } else if (asset.type === 'usd') {
      setSelectedUsdAsset(asset);
      setSelectedGoldAsset(null);
      setAssetView('usd-detail');
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const handleBackToList = () => {
    setAssetView('list');
    setSelectedGoldAsset(null);
    setSelectedUsdAsset(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display antialiased text-slate-900 dark:text-slate-50 transition-colors duration-200 min-h-screen flex justify-center">
      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden max-w-md bg-background-light dark:bg-background-dark shadow-2xl">
        
        <Header 
          currentTab={currentTab} 
          assetView={assetView}
          onBack={handleBackToList}
        />
        
        <main className="flex-1 px-5 pt-[100px] pb-28 outline-none">
          {currentTab === 'assets' ? (
            assetView === 'gold-detail' && selectedGoldAsset ? (
              <GoldDetailPage asset={selectedGoldAsset} marketData={marketData} />
            ) : assetView === 'usd-detail' && selectedUsdAsset ? (
              <UsdDetailPage asset={selectedUsdAsset} marketData={marketData} />
            ) : (
              <>
                <AssetOverview assets={assets} />
                <AssetList
                  assets={assets}
                  marketData={marketData}
                  isLoading={isMarketDataLoading}
                  onAssetClick={handleAssetClick}
                />
              </>
            )
          ) : (
            <ProfilePage />
          )}
        </main>

        <BottomNav 
          onAddClick={() => setIsModalOpen(true)}
          currentTab={currentTab}
          onTabChange={handleTabChange}
        />

        <AddAssetModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSave={handleAddAsset}
        />
        
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}
