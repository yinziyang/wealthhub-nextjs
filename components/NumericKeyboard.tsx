'use client';

import React, { useEffect } from 'react';
import { ChevronDown, Delete, Check } from 'lucide-react';

interface NumericKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
  onInput: (value: string) => void;
  onDelete: () => void;
  onConfirm: () => void;
  activeFieldLabel?: string;
  currentValue?: string;
}

const NumericKeyboard: React.FC<NumericKeyboardProps> = ({
  isOpen,
  onClose,
  onInput,
  onDelete,
  onConfirm,
  activeFieldLabel = '',
  currentValue = ''
}) => {

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'delete'],
  ];

  const handleKeyPress = (key: string) => {
    if (key === 'delete') {
      onDelete();
    } else {
      onInput(key);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] bg-surface-darker border-t border-white/10 rounded-t-2xl shadow-2xl animate-[slideIn_0.2s_ease-out]"
      onTouchMove={handleTouchMove}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
      
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-dark">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-xs text-slate-400 shrink-0">{activeFieldLabel}</span>
          <span className="text-lg font-mono font-bold text-white truncate">{currentValue || '0'}</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors shrink-0"
        >
          <ChevronDown size={18} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-400">收起</span>
        </button>
      </div>

      <div className="px-2 pb-6 pt-2 pb-safe">
        <div className="grid grid-cols-4 gap-1.5">
          <div className="col-span-3 grid grid-cols-3 gap-1.5">
            {keys.flat().map((key, index) => (
              <button
                key={index}
                onClick={() => handleKeyPress(key)}
                className={`
                  h-14 rounded-lg font-bold text-xl flex items-center justify-center
                  transition-all active:scale-95 active:bg-white/20 select-none
                  ${key === 'delete'
                    ? 'bg-white/10 text-slate-400 hover:bg-white/15'
                    : 'bg-white/5 text-white hover:bg-white/10'
                  }
                `}
              >
                {key === 'delete' ? (
                  <Delete size={22} />
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          <div className="col-span-1 flex flex-col gap-1.5">
            <button
              onClick={onConfirm}
              className="flex-1 rounded-lg bg-primary hover:bg-primary-dim text-white font-bold flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Check size={32} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NumericKeyboard;
