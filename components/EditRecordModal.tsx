'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { GoldPurchaseRecord, UsdPurchaseRecord, DebtRecord, RmbDepositRecord } from '@/types';
import { GoldPurchaseForm, UsdPurchaseForm, DebtRecordForm, RmbDepositForm } from './forms';

type RecordType = 'gold' | 'usd' | 'debt' | 'rmb';

type RecordData = 
  | GoldPurchaseRecord 
  | UsdPurchaseRecord 
  | DebtRecord 
  | RmbDepositRecord;

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordType: RecordType;
  recordData: RecordData | null;
  onSave: (updatedData: object) => Promise<void>;
}

const DEFAULT_GOLD_PRICE = 612.50;
const DEFAULT_EXCHANGE_RATE = 7.24;

const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  recordType,
  recordData,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentGoldPrice, setCurrentGoldPrice] = useState(DEFAULT_GOLD_PRICE);
  const [currentExchangeRate, setCurrentExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setIsSaving(false);
    }
  }, [isOpen]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market-data/history?days=7');
      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.gold_price) {
          const goldPrices = result.data.gold_price;
          const dates = Object.keys(goldPrices).sort().reverse();
          if (dates.length > 0) {
            const latestPrice = goldPrices[dates[0]];
            setCurrentGoldPrice(latestPrice);
          }
        }

        if (result.data.exchange_rate) {
          const exchangeRates = result.data.exchange_rate;
          const dates = Object.keys(exchangeRates).sort().reverse();
          if (dates.length > 0) {
            const latestRate = exchangeRates[dates[0]];
            setCurrentExchangeRate(latestRate);
          }
        }
      }
    } catch (error) {
      console.error('获取市场数据失败:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMarketData();
    }
  }, [isOpen]);

  const handleSubmit = async (data: object) => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      await onSave(data);
      setIsSaving(false);
    } catch (error) {
      console.error('保存失败:', error);
      setErrorMessage('保存失败，请重试');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center pointer-events-none overflow-hidden" style={{ height: '100dvh' }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      ></div>

      <div
        className="relative w-full max-w-md mx-auto bg-white dark:bg-[#121417] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pointer-events-auto transform transition-transform duration-300 pb-safe"
        style={{ maxHeight: '90dvh', overflowY: 'auto' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">编辑记录</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
          </div>
        )}

        {recordType === 'gold' && recordData && (
          <GoldPurchaseForm
            mode="edit"
            initialData={recordData as GoldPurchaseRecord}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSaving}
            currentGoldPrice={currentGoldPrice}
          />
        )}

        {recordType === 'usd' && recordData && (
          <UsdPurchaseForm
            mode="edit"
            initialData={recordData as UsdPurchaseRecord}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSaving}
            currentExchangeRate={currentExchangeRate}
          />
        )}

        {recordType === 'debt' && recordData && (
          <DebtRecordForm
            mode="edit"
            initialData={recordData as DebtRecord}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSaving}
          />
        )}

        {recordType === 'rmb' && recordData && (
          <RmbDepositForm
            mode="edit"
            initialData={recordData as RmbDepositRecord}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={isSaving}
          />
        )}

        <div className="h-6 sm:h-0"></div>
      </div>
    </div>
  );
};

export default EditRecordModal;
