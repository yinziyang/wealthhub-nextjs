'use client';

import React, { useState, useEffect } from 'react';
import { CreateRmbDepositRequest, RmbDepositRecord } from '@/types';
import FormField from './FormField';
import NumericKeyboard from '@/components/NumericKeyboard';

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

interface RmbDepositFormProps {
  mode: 'add' | 'edit';
  initialData?: RmbDepositRecord;
  onSubmit: (data: CreateRmbDepositRequest) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RmbDepositForm: React.FC<RmbDepositFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [date, setDate] = useState(getTodayString());
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [activeField, setActiveField] = useState<'amount' | null>(null);

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setDate(initialData.deposit_date);
      setName(initialData.bank_name);
      setAmount(initialData.amount.toString());
    }
  }, [mode, initialData]);

  const handleFieldClick = (field: 'amount') => {
    setActiveField(field);
  };

  const handleKeyboardInput = (key: string) => {
    if (!activeField) return;

    if (key === '.') {
      if (!amount.includes('.')) {
        setAmount(prev => prev + key);
      }
    } else {
      if (amount === '0' && key !== '.') {
        setAmount(key);
      } else {
        setAmount(prev => prev + key);
      }
    }
  };

  const handleKeyboardDelete = () => {
    if (!activeField) return;
    setAmount(prev => prev.slice(0, -1));
  };

  const getActiveFieldLabel = () => {
    switch (activeField) {
      case 'amount': return '金额';
      default: return '';
    }
  };

  const getCurrentFieldValue = () => {
    switch (activeField) {
      case 'amount': return amount;
      default: return '';
    }
  };

  const handleSubmit = async () => {
    if (!name) {
      alert('请输入银行名称');
      return;
    }

    const amt = parseFloat(amount) || 0;

    if (amt <= 0) {
      alert('金额必须大于 0');
      return;
    }

    const data: CreateRmbDepositRequest = {
      deposit_date: date,
      bank_name: name,
      amount: amt,
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
          label="银行/账户名称"
          value={name}
          type="text"
          placeholder="招商银行"
          onChange={setName}
          className="flex-1"
        />
      </div>

      <FormField
        label="金额"
        value={amount}
        placeholder="0.00"
        suffix="CNY"
        active={activeField === 'amount'}
        onClick={() => handleFieldClick('amount')}
      />

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

export default RmbDepositForm;
