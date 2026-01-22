'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profiles';
import { clearProfileCache } from '@/lib/profile-cache';
import EditProfileModal from './EditProfileModal';
import ChangePasswordModal from './ChangePasswordModal';
import LogoutConfirmModal from './LogoutConfirmModal';

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleProfileUpdate = async (fullName: string) => {
    if (!user) return;
    const result = await updateProfile(user.id, { full_name: fullName });
    if (result.success) {
      // 强制刷新 Context 中的 profile
      clearProfileCache(); // Optional: clear cache to be safe, though refreshProfile overwrites it
      await refreshProfile();
      setIsEditModalOpen(false);
    }
  };

  const initials = profile?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="px-5 py-6 space-y-6">
      {/* 头像区域 */}
      <div className="flex flex-col items-center">
        <div className="size-24 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold mb-4">
          {initials}
        </div>
      </div>

      {/* 信息卡片 */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm">邮箱</span>
          <span className="text-slate-900 dark:text-white font-medium">{user?.email}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 text-sm">真实姓名</span>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-slate-900 dark:text-white font-medium hover:text-primary dark:hover:text-primary transition-colors"
          >
            {profile?.full_name || '点击设置'}
          </button>
        </div>
      </div>

      {/* 账户设置 */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl overflow-hidden">
        <button
          onClick={() => setIsPasswordModalOpen(true)}
          className="w-full flex justify-between items-center p-5 hover:bg-slate-50 dark:hover:bg-surface-darker transition-colors"
        >
          <span className="text-slate-900 dark:text-white font-medium">修改密码</span>
          <span className="text-slate-400">›</span>
        </button>
      </div>

      {/* 退出登录按钮 */}
      <button 
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-4 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        退出登录
      </button>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        fullName={profile?.full_name || ''}
        onSave={handleProfileUpdate}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}