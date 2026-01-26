'use client';

import React, { useState, useEffect } from 'react';
import { CreateUsdPurchaseRequest, UsdPurchaseRecord } from '@/types';
import FormField from './FormField';
import { formatNumber } from '@/utils';
import NumericKeyboard from '@/components/NumericKeyboard';

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface UsdPurchaseFormProps {
  mode: 'add' | 'edit';
  initialData?: UsdPurchaseRecord;
  onSubmit: (data: CreateUsdPurchaseRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  currentExchangeRate?: number;
}

const DEFAULT_EXCHANGE_RATE = 7.24;

const UsdPurchaseForm: React.FC<UsdPurchaseFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  currentExchangeRate = DEFAULT_EXCHANGE_RATE,
}) => {
  const [date, setDate] = useState(getTodayString());
  const [name, setName] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [customExchangeRate, setCustomExchangeRate] = useState(currentExchangeRate.toString());
  const [activeField, setActiveField] = useState<keyof typeof fieldSetters | null>(null);

  const fieldSetters = {
    usdAmount: setUsdAmount,
    customExchangeRate: setCustomExchangeRate,
  };

  const fieldValues = {
    usdAmount,
    customExchangeRate,
  };

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setDate(initialData.purchase_date);
      setName(initialData.purchase_channel);
      setUsdAmount(initialData.usd_amount.toString());
      setCustomExchangeRate(initialData.exchange_rate.toString());
    } else if (mode === 'add') {
      setCustomExchangeRate(currentExchangeRate.toString());
    }
  }, [mode, initialData, currentExchangeRate]);

  const handleFieldClick = (field: keyof typeof fieldSetters) => {
    setActiveField(field);
  };

  const handleKeyboardInput = (key: string) => {
    if (!activeField) return;

    const setter = fieldSetters[activeField];
    const currentVal = fieldValues[activeField];

    if (key === '.') {
      if (!currentVal.includes('.')) {
        setter(prev => prev + key);
      }
    } else {
      if (currentVal === '0' && key !== '.') {
        setter(key);
      } else {
        setter(prev => prev + key);
      }
    }
  };

  const handleKeyboardDelete = () => {
    if (!activeField) return;
    fieldSetters[activeField](prev => prev.slice(0, -1));
  };

  const getActiveFieldLabel = () => {
    switch (activeField) {
      case 'usdAmount': return '美元金额';
      case 'customExchangeRate': return '汇率';
      default: return '';
    }
  };

  const getCurrentFieldValue = () => {
    switch (activeField) {
      case 'usdAmount': return usdAmount;
      case 'customExchangeRate': return customExchangeRate;
      default: return '';
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      alert('请输入购汇渠道');
      return;
    }

    const usd = parseFloat(usdAmount) || 0;
    const rate = parseFloat(customExchangeRate) || DEFAULT_EXCHANGE_RATE;

    if (usd <= 0) {
      alert('美元金额必须大于 0');
      return;
    }

    const data: CreateUsdPurchaseRequest = {
      purchase_date: date,
      usd_amount: usd,
      exchange_rate: rate,
      purchase_channel: name,
    };

    await onSubmit(data);
  };

  return (
    <div className="space-y-4 mb-8">
      <div className="flex gap-3">
        <FormField
          label="日期"
          value={date}
          type="numeric"
          readOnly
          className="w-[35%]"
        />
        <FormField
          label="购汇渠道"
          value={name}
          type="text"
          placeholder="招商银行"
          onChange={setName}
          className="flex-1"
        />
      </div>

      <FormField
        label="美元金额"
        value={usdAmount}
        placeholder="0.00"
        suffix="USD"
        active={activeField === 'usdAmount'}
        onClick={() => handleFieldClick('usdAmount')}
      />

      <FormField
        label="汇率"
        value={customExchangeRate}
        placeholder={DEFAULT_EXCHANGE_RATE.toString()}
        active={activeField === 'customExchangeRate'}
        onClick={() => handleFieldClick('customExchangeRate')}
      />

      <div className="flex justify-between items-center px-2 pt-1">
        <span className="text-xs text-slate-400">折合人民币</span>
        <span className="text-sm font-bold text-primary">
          ≈ ¥ {formatNumber((parseFloat(usdAmount) || 0) * (parseFloat(customExchangeRate) || DEFAULT_EXCHANGE_RATE))}
        </span>
      </div>

      {!activeField && (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all ${
            isSubmitting
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-dim text-white'
          }`}
        >
          {isSubmitting ? '保存中...' : mode === 'add' ? '确认添加' : '确认编辑'}
        </button>
      )}

      <NumericKeyboard
        isOpen={!!activeField}
        onClose={() => setActiveField(null)}
        onInput={handleKeyboardInput}
        onDelete={handleKeyboardDelete}
        onConfirm={() => setActiveField(null)}
        activeFieldLabel={getActiveFieldLabel()}
        currentValue={getCurrentFieldValue()}
      />
    </div>
  );
};

export default UsdPurchaseForm;
