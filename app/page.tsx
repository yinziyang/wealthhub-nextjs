'use client';

import { useState, useEffect, useCallback } from 'react';
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
import PWAPullToRefresh from '@/components/PWAPullToRefresh';
import { Asset, PortfolioAllResponse } from '@/types';
import { createAssetObject, getLatestValue } from '@/utils';
import { fetchPortfolioAll } from '@/lib/api/portfolio';
import { fetchMarketDataHistory } from '@/lib/api/market-data';
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
    const debtCount = debtRecords.length; // 计算债权笔数

    return [
      createAssetObject('rmb', '人民币存款', rmbAmount, true, {}, today, 'portfolio-rmb'),
      createAssetObject('usd', '美元资产', usdAmount, true, { usdAmount: totalUsd, exchangeRate }, today, 'portfolio-usd'),
      createAssetObject('gold', '实物黄金', goldAmount, true, { weight: totalWeight, goldPrice }, today, 'portfolio-gold'),
      // 传递 debtCount
      createAssetObject('debt', '债权资产', debtAmount, true, { debtCount }, today, 'portfolio-debt'),
    ];
  };

  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    // 启动加载状态
    setIsPortfolioLoading(true);

    try {
      // 1. 获取资产组合数据 (控制骨架屏)
      // 使用 Promise.allSettled 或者分开处理，确保一个失败不影响另一个
      // 这里保持原有逻辑分开处理，但放在同一个 async 函数中

      const portfolioPromise = fetchPortfolioAll(signal)
        .then(data => {
            setPortfolio(data);
            return data;
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('获取资产组合数据失败:', error);
            // 失败也需要关闭 loading，显示空状态或错误提示
            setPortfolio({
              'gold-purchases': {},
              'debt-records': {},
              'usd-purchases': {},
              'rmb-deposits': {},
            });
          }
          throw error;
        });

      // 2. 并发获取市场数据
      const marketDataPromise = fetchMarketDataHistory({ days: 7 }, signal)
        .then(data => {
            setMarketData(data);
            return data;
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
             console.error('获取市场数据失败:', error);
             setMarketData({ gold_price: {}, exchange_rate: {} });
          }
          throw error;
        });

      await Promise.allSettled([portfolioPromise, marketDataPromise]);
    } finally {
        setIsPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    // 仅在资产列表视图且当前标签为 assets 时获取数据
    if (currentTab !== 'assets' || assetView !== 'list') return;

    const controller = new AbortController();
    fetchDashboardData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [currentTab, assetView, fetchDashboardData]); // 依赖 assetView 以确保从详情页返回时刷新

  useEffect(() => {
    if (portfolio) {
      // 如果有市场数据，使用最新价格；否则使用默认值
      // 注意：这里不需要等待 isPortfolioLoading 完成，只要 portfolio 有值就计算
      // 这样可以实现：先显示旧价格/默认价格 -> 市场数据回来后自动跳变为新价格
      const goldPrice = marketData ? (getLatestValue(marketData.gold_price) || 500) : 500;
      const exchangeRate = marketData ? (getLatestValue(marketData.exchange_rate) || 7.2) : 7.2;

      const calculatedAssets = calculateAssets(portfolio, goldPrice, exchangeRate);
      setAssets(calculatedAssets);
    }
  }, [portfolio, marketData]);

  const handleAddAsset = async () => {
    // 重新获取资产组合数据，而不是在本地添加资产
    setIsPortfolioLoading(true);
    try {
      const data = await fetchPortfolioAll();
      setPortfolio(data);
    } catch (error) {
      console.error('刷新资产组合数据失败:', error);
    } finally {
      setIsPortfolioLoading(false);
    }
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
              <GoldDetailPage asset={selectedGoldAsset} />
            ) : assetView === 'usd-detail' && selectedUsdAsset ? (
              <UsdDetailPage asset={selectedUsdAsset} />
            ) : assetView === 'rmb-detail' && selectedRmbAsset ? (
              <RmbDetailPage asset={selectedRmbAsset} />
            ) : assetView === 'debt-detail' && selectedDebtAsset ? (
              <DebtDetailPage asset={selectedDebtAsset} />
            ) : (
              <PWAPullToRefresh onRefresh={() => fetchDashboardData()}>
                <AssetOverview assets={assets} isLoading={isPortfolioLoading} />
                <AssetList
                  assets={assets}
                  marketData={marketData}
                  isLoading={isPortfolioLoading}
                  onAssetClick={handleAssetClick}
                />
              </PWAPullToRefresh>
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
