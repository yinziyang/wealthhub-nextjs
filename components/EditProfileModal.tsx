'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullName: string;
  onSave: (fullName: string) => void;
}

export default function EditProfileModal({ isOpen, onClose, fullName, onSave }: EditProfileModalProps) {
  const [name, setName] = useState(fullName);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(fullName);
      setIsSaving(false);
    }
  }, [fullName, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    await onSave(name);
    setIsSaving(false);
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">修改真实姓名</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-surface-darker transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              真实姓名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
              placeholder="请输入您的姓名"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-surface-dark text-slate-700 dark:text-slate-300 py-4 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-surface-darker transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              className="flex-1 bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}