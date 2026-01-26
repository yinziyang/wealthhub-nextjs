'use client';

import React, { useEffect, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'fail';
  onClose: () => void;
}

const ToastContent: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 触发进入动画
    setIsVisible(true);
    
    // 3秒后自动关闭
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待动画完成
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon = type === 'success' ? CheckCircle2 : XCircle;
  const bgColor = type === 'success' 
    ? 'bg-green-500 dark:bg-green-600' 
    : 'bg-red-500 dark:bg-red-600';

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div
        className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[200px] max-w-[90vw]`}
      >
        <Icon size={20} className="flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
      </div>
    </div>
  );
};

// Toast 管理器
class ToastManager {
  private container: HTMLDivElement | null = null;
  private root: Root | null = null;

  private ensureContainer() {
    if (!this.container && typeof document !== 'undefined') {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
      this.root = createRoot(this.container);
    }
  }

  show(options: { icon?: 'success' | 'fail'; content: string }) {
    if (typeof document === 'undefined') return;
    
    this.ensureContainer();
    
    if (!this.root || !this.container) return;
    
    const type = options.icon || 'success';
    const message = options.content;

    const handleClose = () => {
      if (this.root && this.container) {
        // 清理 toast
        this.root.render(null);
      }
    };

    const toastElement = React.createElement(ToastContent, {
      message,
      type,
      onClose: handleClose,
    });

    this.root.render(toastElement);
  }
}

// 导出单例
const toastManager = new ToastManager();

// 兼容 antd-mobile Toast API
export const Toast = {
  show: (options: { icon?: 'success' | 'fail'; content: string }) => {
    toastManager.show(options);
  },
};
