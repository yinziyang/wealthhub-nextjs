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
import RmbDetailPage from '@/components/RmbDetailPage';
import DebtDetailPage from '@/components/DebtDetailPage';
import AuthGuard from '@/components/AuthGuard';
import { Asset, PortfolioAllResponse } from '@/types';
import { createAssetObject, getLatestValue } from '@/utils';
import { fetchPortfolioAll } from '@/lib/api/portfolio';
import type { MarketDataHistoryResponse } from '@/lib/api-response';

type CurrentTab = 'assets' | 'profile';
type AssetView = 'list' | 'gold-detail' | 'usd-detail' | 'rmb-detail' | 'debt-detail';

// 默认占位资产对象，用于初始渲染和 loading 状态
const createDefaultAssets = (): Asset[] => {
  const today = new Date().toISOString().split('T')[0];
  return [
    createAssetObject('rmb', '人民币存款', 0, true, {}, today, 'portfolio-rmb'),
    createAssetObject('usd', '美元资产', 0, true, { usdAmount: 0, exchangeRate: 0 }, today, 'portfolio-usd'),
    createAssetObject('gold', '实物黄金', 0, true, { weight: 0, goldPrice: 0 }, today, 'portfolio-gold'),
    createAssetObject('debt', '债权资产', 0, true, {}, today, 'portfolio-debt'),
  ];
};

function Dashboard() {
  const { } = useAuth();
  const [currentTab, setCurrentTab] = useState<CurrentTab>('assets');
  const [assetView, setAssetView] = useState<AssetView>('list');
  const [selectedGoldAsset, setSelectedGoldAsset] = useState<Asset | null>(null);
  const [selectedUsdAsset, setSelectedUsdAsset] = useState<Asset | null>(null);
  const [selectedRmbAsset, setSelectedRmbAsset] = useState<Asset | null>(null);
  const [selectedDebtAsset, setSelectedDebtAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 初始化为默认占位资产
  const [assets, setAssets] = useState<Asset[]>(createDefaultAssets());
  const [marketData, setMarketData] = useState<MarketDataHistoryResponse | null>(null);
  const [isMarketDataLoading, setIsMarketDataLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioAllResponse | null>(null);
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(true);

  const calculateAssets = (
    portfolioData: PortfolioAllResponse,
    goldPrice: number,
    exchangeRate: number
  ): Asset[] => {
    const today = new Date().toISOString().split('T')[0];
    const goldRecords = Object.values(portfolioData['gold-purchases']);
    const totalWeight = goldRecords.reduce((sum, r) => sum + r.weight, 0);
    const goldAmount = totalWeight * goldPrice;

    const usdRecords = Object.values(portfolioData['usd-purchases']);
    const totalUsd = usdRecords.reduce((sum, r) => sum + r.usd_amount, 0);
    const usdAmount = totalUsd * exchangeRate;

    const rmbRecords = Object.values(portfolioData['rmb-deposits']);
    const rmbAmount = rmbRecords.reduce((sum, r) => sum + r.amount, 0);

    const debtRecords = Object.values(portfolioData['debt-records']);
    const debtAmount = debtRecords.reduce((sum, r) => sum + r.amount, 0);

    return [
      createAssetObject('rmb', '人民币存款', rmbAmount, true, {}, today, 'portfolio-rmb'),
      createAssetObject('usd', '美元资产', usdAmount, true, { usdAmount: totalUsd, exchangeRate }, today, 'portfolio-usd'),
      createAssetObject('gold', '实物黄金', goldAmount, true, { weight: totalWeight, goldPrice }, today, 'portfolio-gold'),
      createAssetObject('debt', '债权资产', debtAmount, true, {}, today, 'portfolio-debt'),
    ];
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchPortfolioData = async () => {
      // 开始加载前，重置为 loading 状态
      setIsPortfolioLoading(true);
      
      try {
        const data = await fetchPortfolioAll(controller.signal);
        if (!controller.signal.aborted) {
          setPortfolio(data);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        
        console.error('获取资产组合数据失败:', error);
        if (!controller.signal.aborted) {
          setPortfolio({
            'gold-purchases': {},
            'debt-records': {},
            'usd-purchases': {},
            'rmb-deposits': {},
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPortfolioLoading(false);
        }
      }
    };

    // Debounce to fetch to avoid double-calling in Strict Mode
    const timeoutId = setTimeout(() => {
      fetchPortfolioData();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (portfolio && marketData) {
      const goldPrice = getLatestValue(marketData.gold_price) || 500;
      const exchangeRate = getLatestValue(marketData.exchange_rate) || 7.2;

      const calculatedAssets = calculateAssets(portfolio, goldPrice, exchangeRate);
      setAssets(calculatedAssets);
    } else if (portfolio && isPortfolioLoading === false) {
      const goldPrice = 500;
      const exchangeRate = 7.2;

      const calculatedAssets = calculateAssets(portfolio, goldPrice, exchangeRate);
      setAssets(calculatedAssets);
    }
  }, [portfolio, marketData, isPortfolioLoading]);

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
      setSelectedRmbAsset(null);
      setSelectedDebtAsset(null);
      setAssetView('gold-detail');
    } else if (asset.type === 'usd') {
      setSelectedUsdAsset(asset);
      setSelectedGoldAsset(null);
      setSelectedRmbAsset(null);
      setSelectedDebtAsset(null);
      setAssetView('usd-detail');
    } else if (asset.type === 'rmb') {
      setSelectedRmbAsset(asset);
      setSelectedGoldAsset(null);
      setSelectedUsdAsset(null);
      setSelectedDebtAsset(null);
      setAssetView('rmb-detail');
    } else if (asset.type === 'debt') {
      setSelectedDebtAsset(asset);
      setSelectedGoldAsset(null);
      setSelectedUsdAsset(null);
      setSelectedRmbAsset(null);
      setAssetView('debt-detail');
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  };

  const handleBackToList = () => {
    setAssetView('list');
    setSelectedGoldAsset(null);
    setSelectedUsdAsset(null);
    setSelectedRmbAsset(null);
    setSelectedDebtAsset(null);
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
            ) : assetView === 'rmb-detail' && selectedRmbAsset ? (
              <RmbDetailPage asset={selectedRmbAsset} />
            ) : assetView === 'debt-detail' && selectedDebtAsset ? (
              <DebtDetailPage asset={selectedDebtAsset} />
            ) : (
              <>
                <AssetOverview assets={assets} />
                <AssetList
                  assets={assets}
                  marketData={marketData}
                  isLoading={isPortfolioLoading}
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
