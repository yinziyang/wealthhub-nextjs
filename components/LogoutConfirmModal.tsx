'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutConfirmModal({ isOpen, onClose }: LogoutConfirmModalProps) {
  const { signOut } = useAuth();
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogout = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/login');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center pointer-events-none overflow-hidden"
      style={{ height: '100dvh' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        onClick={(e) => {
          if (e.target !== e.currentTarget) return;
          onClose();
        }}
      ></div>

      {/* Modal Content */}
      <div
        className="relative w-full max-w-md mx-auto bg-white dark:bg-[#121417] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pointer-events-auto"
        style={{
          maxHeight: '90dvh',
          overflowY: 'auto',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
        onTouchStart={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <LogOut className="text-red-600 dark:text-red-400" size={32} />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">退出登录</h2>
          <p className="text-slate-500 text-sm">
            确定要退出当前账户吗？退出后需要重新登录才能访问您的资产数据
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  );
}