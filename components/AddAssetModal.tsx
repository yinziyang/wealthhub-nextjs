import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createAssetObject, formatNumber } from '../utils';
import { Asset } from '../types';
import NumericKeyboard from './NumericKeyboard';
import { DatePickerWheel } from './DatePickerWheel';
import { Wallet, DollarSign, LayoutGrid, Handshake, X } from 'lucide-react';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

type AssetType = 'rmb' | 'usd' | 'gold' | 'debt';
type NumericField = 'amount' | 'usdAmount' | 'customExchangeRate' | 'weight' | 'customGoldPrice' | 'handlingFee';

const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Helper to parse YYYY-MM-DD string to Date object
const parseDateString = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  // Month is 0-indexed in Date constructor
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Helper to format Date object to YYYY-MM-DD string
const formatDateToString = (date: Date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const AddAssetModal: React.FC<AddAssetModalProps> = ({ isOpen, onClose, onSave }) => {
  const [isIncrease, setIsIncrease] = useState(true);
  const [selectedType, setSelectedType] = useState<AssetType>('rmb');
  
  // Form States
  const [date, setDate] = useState(getTodayString());
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(''); // For RMB and Debt
  const [usdAmount, setUsdAmount] = useState('');
  const [weight, setWeight] = useState('');
  
  // Custom Rates & Fees States
  const DEFAULT_EXCHANGE_RATE = 7.24;
  const DEFAULT_GOLD_PRICE = 612.50;
  
  const [customExchangeRate, setCustomExchangeRate] = useState(DEFAULT_EXCHANGE_RATE.toString());
  const [customGoldPrice, setCustomGoldPrice] = useState(DEFAULT_GOLD_PRICE.toString());
  const [handlingFee, setHandlingFee] = useState('0');

  // Keyboard State
  const [activeField, setActiveField] = useState<NumericField | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs for auto-scrolling
  const formContainerRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Custom keyboard height (matches NumericKeyboard component)
  const CUSTOM_KEYBOARD_HEIGHT = 280;

  // Track if interaction started on backdrop
  const backdropInteractionRef = useRef(false);

  // Helper to reset all form fields to default
  const resetFormValues = () => {
    setDate(getTodayString());
    setName('');
    setAmount('');
    setUsdAmount('');
    setWeight('');
    setCustomExchangeRate(DEFAULT_EXCHANGE_RATE.toString());
    setCustomGoldPrice(DEFAULT_GOLD_PRICE.toString());
    setHandlingFee('0');
    setActiveField(null);
  };

  useEffect(() => {
    if (isOpen) {
      // Reset everything on open
      setIsIncrease(true);
      setSelectedType('rmb');
      resetFormValues();
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
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

  // iOS Visual Viewport fix - prevent zoom on input focus
  useEffect(() => {
    if (!isOpen) return;
    
    const viewport = window.visualViewport;
    if (!viewport) return;
    
    let lastScale = 1;
    
    const handleViewportChange = () => {
      // Detect if iOS zoomed the viewport
      if (viewport.scale !== 1 && viewport.scale !== lastScale) {
        lastScale = viewport.scale;
        // Force reset the viewport by scrolling
        requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        });
      }
    };
    
    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);
    
    // Also handle focus events on inputs to prevent zoom
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Slight delay to allow iOS to do its thing, then reset
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

  // Auto-scroll to active field when keyboard opens
  const scrollToActiveField = useCallback((fieldName: string | null, keyboardHeight?: number) => {
    if (!fieldName || !formContainerRef.current) return;
    
    const fieldElement = fieldRefs.current[fieldName];
    if (!fieldElement) return;
    
    // Wait for keyboard animation to start
    requestAnimationFrame(() => {
      setTimeout(() => {
        const container = formContainerRef.current;
        if (!container) return;
        
        const fieldRect = fieldElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Use provided keyboard height or default to custom keyboard height
        const actualKeyboardHeight = keyboardHeight || CUSTOM_KEYBOARD_HEIGHT;
        
        // Calculate the visible area (container height minus keyboard height)
        const visibleHeight = containerRect.height - actualKeyboardHeight;
        
        // Check if field is below the visible area
        const fieldBottom = fieldRect.bottom - containerRect.top;
        const fieldTop = fieldRect.top - containerRect.top;
        
        if (fieldBottom > visibleHeight) {
          // Scroll down to bring field into view, with some padding
          const scrollAmount = fieldBottom - visibleHeight + 20;
          container.scrollTo({
            top: container.scrollTop + scrollAmount,
            behavior: 'smooth'
          });
        } else if (fieldTop < 0) {
          // Scroll up if field is above visible area
          container.scrollTo({
            top: container.scrollTop + fieldTop - 20,
            behavior: 'smooth'
          });
        }
      }, 50); // Small delay for keyboard animation
    });
  }, []);

  // Effect to scroll when activeField changes
  useEffect(() => {
    if (activeField) {
      scrollToActiveField(activeField);
    }
  }, [activeField, scrollToActiveField]);

  // Effect to scroll when date picker opens
  useEffect(() => {
    if (showDatePicker) {
      scrollToActiveField('date');
    }
  }, [showDatePicker, scrollToActiveField]);

  // Handlers that trigger reset
  const handleDirectionChange = (newIsIncrease: boolean) => {
    if (isIncrease !== newIsIncrease) {
      setIsIncrease(newIsIncrease);
      resetFormValues();
    }
  };

  const handleTypeChange = (newType: AssetType) => {
    if (selectedType !== newType) {
      setSelectedType(newType);
      resetFormValues();
    }
  };

  // Keyboard Handlers
  const handleFieldClick = (field: NumericField) => {
    setActiveField(field);
  };

  const handleKeyboardInput = (key: string) => {
    if (!activeField) return;

    const setters: Record<NumericField, React.Dispatch<React.SetStateAction<string>>> = {
      amount: setAmount,
      usdAmount: setUsdAmount,
      customExchangeRate: setCustomExchangeRate,
      weight: setWeight,
      customGoldPrice: setCustomGoldPrice,
      handlingFee: setHandlingFee
    };
    
    const getters: Record<NumericField, string> = {
      amount,
      usdAmount,
      customExchangeRate,
      weight,
      customGoldPrice,
      handlingFee
    };

    const currentVal = getters[activeField];
    const setVal = setters[activeField];

    if (key === '.') {
      if (!currentVal.includes('.')) {
        setVal(prev => prev + key);
      }
    } else {
      // Prevent multiple leading zeros
      if (currentVal === '0' && key !== '.') {
        setVal(key);
      } else {
        setVal(prev => prev + key);
      }
    }
  };

  const handleKeyboardDelete = () => {
    if (!activeField) return;

    const setters: Record<NumericField, React.Dispatch<React.SetStateAction<string>>> = {
      amount: setAmount,
      usdAmount: setUsdAmount,
      customExchangeRate: setCustomExchangeRate,
      weight: setWeight,
      customGoldPrice: setCustomGoldPrice,
      handlingFee: setHandlingFee
    };

    setters[activeField](prev => prev.slice(0, -1));
  };

  const getActiveFieldLabel = () => {
    switch (activeField) {
      case 'amount': return selectedType === 'debt' ? '借款金额' : '金额';
      case 'usdAmount': return '美元金额';
      case 'customExchangeRate': return '汇率';
      case 'weight': return '重量';
      case 'customGoldPrice': return '单价';
      case 'handlingFee': return '手续费';
      default: return '';
    }
  };

  const getCurrentFieldValue = () => {
    switch (activeField) {
      case 'amount': return amount;
      case 'usdAmount': return usdAmount;
      case 'customExchangeRate': return customExchangeRate;
      case 'weight': return weight;
      case 'customGoldPrice': return customGoldPrice;
      case 'handlingFee': return handlingFee;
      default: return '';
    }
  };

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name) return; // Simple validation

    let finalRmbValue = 0;
    let details: {
      usdAmount?: number;
      weight?: number;
      exchangeRate?: number;
      goldPrice?: number;
      handlingFee?: number;
    } = {};

    if (selectedType === 'rmb' || selectedType === 'debt') {
      finalRmbValue = parseFloat(amount) || 0;
    } else if (selectedType === 'usd') {
      const usd = parseFloat(usdAmount) || 0;
      const rate = parseFloat(customExchangeRate) || DEFAULT_EXCHANGE_RATE;
      finalRmbValue = usd * rate;
      details = { usdAmount: usd, exchangeRate: rate };
    } else if (selectedType === 'gold') {
      const g = parseFloat(weight) || 0;
      const price = parseFloat(customGoldPrice) || DEFAULT_GOLD_PRICE;
      const fee = parseFloat(handlingFee) || 0;
      
      finalRmbValue = g * (price + fee);
      details = { weight: g, goldPrice: price, handlingFee: fee };
    }

    const newAsset = createAssetObject(
      selectedType,
      name,
      finalRmbValue,
      isIncrease,
      details,
      date
    );

    onSave(newAsset);
    onClose();
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
        onClick={() => handleTypeChange(type)}
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

  // Helper to generate input class based on active state
  const getInputClass = (fieldName: NumericField) => `
    w-full bg-slate-50 dark:bg-surface-dark border rounded-xl px-4 py-3 
    text-slate-900 dark:text-white font-mono transition-colors caret-primary
    ${activeField === fieldName 
      ? 'border-primary ring-1 ring-primary' 
      : 'border-slate-200 dark:border-white/10'
    }
  `;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] flex items-end sm:items-center pointer-events-none overflow-hidden"
        style={{ height: '100dvh' }}
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
          onTouchStart={(e) => {
            // Only mark as backdrop interaction if directly touching backdrop
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
            // Check 1: Target must be backdrop
            if (e.target !== e.currentTarget) return;
            
            // Check 2: Interaction must have started on backdrop
            if (!backdropInteractionRef.current) return;
            
            // Check 3: Reset interaction flag
            backdropInteractionRef.current = false;
            
            onClose();
          }}
        ></div>

        {/* Modal Content */}
        <div 
          ref={formContainerRef}
          className={`
            relative w-full max-w-md mx-auto bg-white dark:bg-[#121417] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pointer-events-auto transform transition-transform duration-300
            ${activeField ? 'pb-[280px] sm:pb-6' : showDatePicker ? 'pb-[260px] sm:pb-6' : 'pb-safe'} 
            /* Add padding bottom when keyboard or date picker is open */
          `}
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

          {/* 1. Direction Toggle */}
          <div className="bg-slate-100 dark:bg-surface-dark p-1 rounded-xl flex mb-6">
            <button
              onClick={() => handleDirectionChange(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                isIncrease
                  ? 'bg-white dark:bg-[#2c2e33] text-emerald-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              资产增加
            </button>
            <button
              onClick={() => handleDirectionChange(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                !isIncrease
                  ? 'bg-white dark:bg-[#2c2e33] text-red-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              资产减少
            </button>
          </div>

          {/* 2. Type Selection */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {renderTypeButton('rmb', '人民币', 'account_balance_wallet')}
            {renderTypeButton('usd', '美元', 'attach_money')}
            {renderTypeButton('gold', '实物黄金', 'grid_view')}
            {renderTypeButton('debt', '债权', 'handshake')}
          </div>

          {/* 3. Dynamic Form */}
          <div className="space-y-4 mb-8 overflow-y-auto max-h-[50vh] sm:max-h-none pr-1">
            {/* Row for Date and Name */}
            <div className="flex gap-3">
              {/* Common Field: Date */}
              <div ref={(el) => { fieldRefs.current['date'] = el; }} className="w-[35%]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">日期</label>
                <input
                  type="text"
                  readOnly
                  inputMode="none"
                  value={date}
                  onClick={() => {
                    setShowDatePicker(true);
                    setActiveField(null);
                  }}
                  className={`
                    w-full bg-slate-50 dark:bg-surface-dark border rounded-xl px-2 sm:px-4 py-3 
                    text-slate-900 dark:text-white transition-colors text-sm cursor-pointer
                    ${showDatePicker 
                      ? 'border-primary ring-1 ring-primary' 
                      : 'border-slate-200 dark:border-white/10'
                    }
                  `}
                />
              </div>

              {/* Common Field: Name - Standard Input */}
              <div ref={(el) => { fieldRefs.current['name'] = el; }} className="flex-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 truncate">
                  {selectedType === 'debt' ? '借款人姓名' : selectedType === 'gold' ? '购买渠道/品牌' : '银行/账户名称'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => {
                    setActiveField(null);
                    setShowDatePicker(false);
                    // Native keyboard: browser handles scrolling automatically, no need to manually scroll
                  }}
                  className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  placeholder={selectedType === 'debt' ? '张三' : selectedType === 'gold' ? '周大福' : '招商银行'}
                />
              </div>
            </div>

            {/* Specific Fields using Numeric Keyboard */}
            {selectedType === 'rmb' && (
              <div ref={(el) => { fieldRefs.current['amount'] = el; }}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">金额 (CNY)</label>
                <input
                  type="text"
                  inputMode="none" // Prevent native keyboard
                  readOnly
                  value={amount}
                  onClick={() => handleFieldClick('amount')}
                  className={getInputClass('amount')}
                  placeholder="0.00"
                />
              </div>
            )}

            {selectedType === 'debt' && (
              <div ref={(el) => { fieldRefs.current['amount'] = el; }}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">借款金额 (CNY)</label>
                <input
                  type="text"
                  inputMode="none"
                  readOnly
                  value={amount}
                  onClick={() => handleFieldClick('amount')}
                  className={getInputClass('amount')}
                  placeholder="0.00"
                />
              </div>
            )}

            {selectedType === 'usd' && (
              <>
                <div ref={(el) => { fieldRefs.current['usdAmount'] = el; }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">美元金额 (USD)</label>
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={usdAmount}
                    onClick={() => handleFieldClick('usdAmount')}
                    className={getInputClass('usdAmount')}
                    placeholder="0.00"
                  />
                </div>
                
                <div ref={(el) => { fieldRefs.current['customExchangeRate'] = el; }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">汇率</label>
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={customExchangeRate}
                    onClick={() => handleFieldClick('customExchangeRate')}
                    className={getInputClass('customExchangeRate')}
                    placeholder={DEFAULT_EXCHANGE_RATE.toString()}
                  />
                </div>

                <div className="flex justify-between items-center px-2 pt-1">
                  <span className="text-xs text-slate-400">折合人民币</span>
                  <span className="text-sm font-bold text-primary">
                    ≈ ¥ {formatNumber((parseFloat(usdAmount) || 0) * (parseFloat(customExchangeRate) || DEFAULT_EXCHANGE_RATE))}
                  </span>
                </div>
              </>
            )}

            {selectedType === 'gold' && (
              <>
                <div ref={(el) => { fieldRefs.current['weight'] = el; }}>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">重量 (克/g)</label>
                  <input
                    type="text"
                    inputMode="none"
                    readOnly
                    value={weight}
                    onClick={() => handleFieldClick('weight')}
                    className={getInputClass('weight')}
                    placeholder="0.00"
                  />
                </div>

                <div className="flex gap-3">
                  <div ref={(el) => { fieldRefs.current['customGoldPrice'] = el; }} className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">单价 (CNY/g)</label>
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      value={customGoldPrice}
                      onClick={() => handleFieldClick('customGoldPrice')}
                      className={getInputClass('customGoldPrice')}
                      placeholder={DEFAULT_GOLD_PRICE.toString()}
                    />
                  </div>
                  <div ref={(el) => { fieldRefs.current['handlingFee'] = el; }} className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">手续费 (元/g)</label>
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      value={handlingFee}
                      onClick={() => handleFieldClick('handlingFee')}
                      className={getInputClass('handlingFee')}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center px-2 pt-1">
                  <span className="text-xs text-slate-400">折合人民币 (含手续费)</span>
                  <span className="text-sm font-bold text-primary">
                    ≈ ¥ {formatNumber((parseFloat(weight) || 0) * ((parseFloat(customGoldPrice) || DEFAULT_GOLD_PRICE) + (parseFloat(handlingFee) || 0)))}
                  </span>
                </div>
              </>
            )}
          </div>

          {!activeField && (
            <button
              onClick={handleSave}
              className="w-full bg-primary hover:bg-primary-dim text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
            >
              确认添加
            </button>
          )}
          
          <div className="h-6 sm:h-0"></div> {/* Safe area spacer for mobile */}
        </div>
      </div>

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
    </>
  );
};

export default AddAssetModal;