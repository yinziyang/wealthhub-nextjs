'use client';

import React, { useEffect, useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  content,
  confirmText = '确认',
  cancelText = '取消',
  isDestructive = false,
  isLoading = false,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setVisible(false), 200);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Dialog Panel */}
      <div 
        className={`relative bg-white dark:bg-[#1C1C1E] w-full max-w-[280px] rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-200 ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
            {title}
          </h3>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
            {content}
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-slate-200 dark:border-white/10 divide-x divide-slate-200 dark:divide-white/10">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="py-3.5 text-[17px] font-medium text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-white/5 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`py-3.5 text-[17px] font-bold active:bg-slate-100 dark:active:bg-white/5 transition-colors disabled:opacity-50 ${
              isDestructive 
                ? 'text-red-500 dark:text-red-400' 
                : 'text-blue-500 dark:text-blue-400'
            }`}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
