'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreateGoldPurchaseRequest, GoldPurchaseRecord } from '@/types';
import FormField from './FormField';
import { formatNumber } from '@/utils';
import NumericKeyboard from '@/components/NumericKeyboard';
import { DatePickerWheel } from '@/components/DatePickerWheel';

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseDateString = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const formatDateToString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// 将 ISO 8601 格式的日期字符串转换为 YYYY-MM-DD 格式
const normalizeDateString = (dateStr: string): string => {
  if (!dateStr) return getTodayString();
  // 如果是 ISO 格式（包含 T），提取日期部分
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  // 如果已经是 YYYY-MM-DD 格式，直接返回
  return dateStr;
};

interface GoldPurchaseFormProps {
  mode: 'add' | 'edit';
  initialData?: GoldPurchaseRecord;
  onSubmit: (data: CreateGoldPurchaseRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  currentGoldPrice?: number;
}

const GoldPurchaseForm: React.FC<GoldPurchaseFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  currentGoldPrice = 612.50,
}) => {
  const [date, setDate] = useState(getTodayString());
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('');
  const [customGoldPrice, setCustomGoldPrice] = useState(currentGoldPrice.toString());
  const [handlingFee, setHandlingFee] = useState('0');
  const [activeField, setActiveField] = useState<keyof typeof fieldSetters | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fieldSetters = {
    weight: setWeight,
    customGoldPrice: setCustomGoldPrice,
    handlingFee: setHandlingFee,
  };

  const fieldValues = {
    weight,
    customGoldPrice,
    handlingFee,
  };

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setDate(normalizeDateString(initialData.purchase_date));
      setName(initialData.purchase_channel);
      setWeight(initialData.weight.toString());
      setCustomGoldPrice(initialData.gold_price_per_gram.toString());
      setHandlingFee(initialData.handling_fee_per_gram.toString());
    } else if (mode === 'add') {
      setCustomGoldPrice(currentGoldPrice.toString());
    }
  }, [mode, initialData, currentGoldPrice]);

  const handleFieldClick = (field: keyof typeof fieldSetters) => {
    setActiveField(field);
    setShowDatePicker(false);
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
      case 'weight': return '重量';
      case 'customGoldPrice': return '单价';
      case 'handlingFee': return '手续费';
      default: return '';
    }
  };

  const getCurrentFieldValue = () => {
    switch (activeField) {
      case 'weight': return weight;
      case 'customGoldPrice': return customGoldPrice;
      case 'handlingFee': return handlingFee;
      default: return '';
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      alert('请输入购买渠道');
      return;
    }

    const w = parseFloat(weight) || 0;
    const price = parseFloat(customGoldPrice) || currentGoldPrice;
    const fee = parseFloat(handlingFee) || 0;

    if (w <= 0) {
      alert('重量必须大于 0');
      return;
    }

    const data: CreateGoldPurchaseRequest = {
      purchase_date: date,
      weight: w,
      gold_price_per_gram: price,
      handling_fee_per_gram: fee,
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
          onClick={() => {
            setShowDatePicker(true);
            setActiveField(null);
          }}
          className="w-[35%]"
        />
        <FormField
          label="购买渠道/品牌"
          value={name}
          type="text"
          placeholder="周大福"
          onChange={setName}
          className="flex-1"
        />
      </div>

      <FormField
        label="重量"
        value={weight}
        placeholder="0.00"
        suffix="g"
        active={activeField === 'weight'}
        onClick={() => handleFieldClick('weight')}
      />

      <div className="flex gap-3">
        <FormField
          label="单价"
          value={customGoldPrice}
          placeholder={currentGoldPrice.toString()}
          suffix="CNY/g"
          active={activeField === 'customGoldPrice'}
          onClick={() => handleFieldClick('customGoldPrice')}
          className="flex-1"
        />
        <FormField
          label="手续费"
          value={handlingFee}
          placeholder="0"
          suffix="元/g"
          active={activeField === 'handlingFee'}
          onClick={() => handleFieldClick('handlingFee')}
          className="flex-1"
        />
      </div>

      <div className="flex justify-between items-center px-2 pt-1">
        <span className="text-xs text-slate-400">折合人民币 (含手续费)</span>
        <span className="text-sm font-bold text-primary">
          ≈ ¥ {formatNumber((parseFloat(weight) || 0) * ((parseFloat(customGoldPrice) || currentGoldPrice) + (parseFloat(handlingFee) || 0)))}
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

      <DatePickerWheel
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        max={new Date()}
        value={parseDateString(date)}
        onConfirm={(val) => {
          setDate(formatDateToString(val));
        }}
        title="选择日期"
      />
    </div>
  );
};

export default GoldPurchaseForm;
