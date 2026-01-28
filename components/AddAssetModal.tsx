import React, { useState, useEffect, useRef } from 'react';
import { Wallet, DollarSign, LayoutGrid, Handshake, X } from 'lucide-react';
import type { 
  CreateGoldPurchaseRequest, 
  CreateUsdPurchaseRequest, 
  CreateRmbDepositRequest, 
  CreateDebtRecordRequest 
} from '@/types';
import { GoldPurchaseForm, UsdPurchaseForm, DebtRecordForm, RmbDepositForm } from './forms';
import { fetchMarketDataHistory } from '@/lib/api/market-data';
import { createRmbDeposit } from '@/lib/api/rmb-deposits';
import { createDebtRecord } from '@/lib/api/debt-records';
import { createUsdPurchase } from '@/lib/api/usd-purchases';
import { createGoldPurchase } from '@/lib/api/gold-purchases';
import { getLatestValue } from '@/utils';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // 改为无参数，只通知刷新数据
}

type AssetType = 'rmb' | 'usd' | 'gold' | 'debt';

const DEFAULT_EXCHANGE_RATE = 7.24;
const DEFAULT_GOLD_PRICE = 612.50;

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isIncrease, setIsIncrease] = useState(true);
  const [selectedType, setSelectedType] = useState<AssetType>('rmb');
  const [currentGoldPrice, setCurrentGoldPrice] = useState<number>(DEFAULT_GOLD_PRICE);
  const [currentExchangeRate, setCurrentExchangeRate] = useState<number>(DEFAULT_EXCHANGE_RATE);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const formContainerRef = useRef<HTMLDivElement>(null);

  const backdropInteractionRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsIncrease(true);
      setSelectedType('rmb');
      setErrorMessage('');
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const result = await fetchMarketDataHistory({ days: 7 });

        if (result.gold_price) {
          const latestPrice = getLatestValue(result.gold_price);
          if (latestPrice) {
            setCurrentGoldPrice(latestPrice);
          }
        }

        if (result.exchange_rate) {
          const latestRate = getLatestValue(result.exchange_rate);
          if (latestRate) {
            setCurrentExchangeRate(latestRate);
          }
        }
      } catch (error) {
        console.error('获取市场数据失败:', error);
      }
    };

    if (isOpen) {
      fetchMarketData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    let lastScale = 1;

    const handleViewportChange = () => {
      if (viewport.scale !== 1 && viewport.scale !== lastScale) {
        lastScale = viewport.scale;
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        });
      }
    };

    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          if (viewport.scale !== 1) {
            window.scrollTo(0, 0);
          }
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [isOpen]);

  const handleSubmit = async (
    data: CreateGoldPurchaseRequest | CreateUsdPurchaseRequest | CreateRmbDepositRequest | CreateDebtRecordRequest
  ) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (selectedType === 'rmb') {
        await createRmbDeposit(data as CreateRmbDepositRequest);
      } else if (selectedType === 'debt') {
        await createDebtRecord(data as CreateDebtRecordRequest);
      } else if (selectedType === 'usd') {
        await createUsdPurchase(data as CreateUsdPurchaseRequest);
      } else if (selectedType === 'gold') {
        await createGoldPurchase(data as CreateGoldPurchaseRequest);
      }

      // 保存成功后，通知父组件刷新数据，而不是直接创建资产对象
      setIsSaving(false);
      onClose();
      onSave(); // 通知父组件重新获取资产组合数据
    } catch (error) {
      console.error('保存失败:', error);
      // 这里的 error 可能是 Error 对象，message 已经在封装函数里处理过了
      const msg = error instanceof Error ? error.message : '网络错误，请重试';
      setErrorMessage(msg);
      setIsSaving(false);
    }
  };

  const renderTypeButton = (type: AssetType, label: string, iconName: string) => {
    const iconComponents: Record<string, React.ReactNode> = {
      'account_balance_wallet': <Wallet size={24} className="mb-1" />,
      'attach_money': <DollarSign size={24} className="mb-1" />,
      'grid_view': <LayoutGrid size={24} className="mb-1" />,
      'handshake': <Handshake size={24} className="mb-1" />,
    };

    return (
      <button
        onClick={() => setSelectedType(type)}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
          selectedType === type
            ? 'bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(167,125,47,0.3)]'
            : 'bg-slate-50 dark:bg-surface-dark border-slate-200 dark:border-white/10 text-slate-500'
        }`}
      >
        {iconComponents[iconName]}
        <span className="text-xs font-bold">{label}</span>
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center pointer-events-none overflow-hidden"
        style={{ height: '100dvh' }}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
          onTouchStart={(e) => {
            if (e.target === e.currentTarget) {
              backdropInteractionRef.current = true;
            }
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              backdropInteractionRef.current = true;
            }
          }}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!backdropInteractionRef.current) return;
            backdropInteractionRef.current = false;
            onClose();
          }}
        ></div>

        <div
          ref={formContainerRef}
          className="relative w-full max-w-md mx-auto bg-white dark:bg-[#121417] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pointer-events-auto transform transition-transform duration-300 pb-safe"
          style={{ maxHeight: '90dvh', overflowY: 'auto' }}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">添加资产记录</h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="bg-slate-100 dark:bg-surface-dark p-1 rounded-xl flex mb-6">
            <button
              onClick={() => setIsIncrease(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                isIncrease
                  ? 'bg-white dark:bg-[#2c2e33] text-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              资产增加
            </button>
            <button
              onClick={() => setIsIncrease(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                !isIncrease
                  ? 'bg-white dark:bg-[#2c2e33] text-red-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              资产减少
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {renderTypeButton('rmb', '人民币', 'account_balance_wallet')}
            {renderTypeButton('usd', '美元', 'attach_money')}
            {renderTypeButton('gold', '实物黄金', 'grid_view')}
            {renderTypeButton('debt', '债权', 'handshake')}
          </div>

          {errorMessage && (
            <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {selectedType === 'rmb' && (
            <RmbDepositForm
              mode="add"
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSaving}
            />
          )}

          {selectedType === 'debt' && (
            <DebtRecordForm
              mode="add"
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSaving}
            />
          )}

          {selectedType === 'usd' && (
            <UsdPurchaseForm
              mode="add"
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSaving}
              currentExchangeRate={currentExchangeRate}
            />
          )}

          {selectedType === 'gold' && (
            <GoldPurchaseForm
              mode="add"
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSaving}
              currentGoldPrice={currentGoldPrice}
            />
          )}

          <div className="h-6 sm:h-0"></div>
        </div>
      </div>
    </>
  );
};

export default AddAssetModal;
