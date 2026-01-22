'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    setIsLoading(true);

    const result = await signUp(email, password);

    if (result.success) {
      setSuccess(true);
      setIsLoading(false);
    } else {
      setError(result.error || '注册失败，请重试');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none opacity-40"></div>

        <div className="w-full max-w-md px-8 py-10 relative z-10 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={40} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
              注册成功
            </h1>
            <p className="text-slate-500 text-sm">
              我们已向 <span className="font-bold text-slate-900 dark:text-white">{email}</span> 发送了验证邮件
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">下一步操作：</h3>
            <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                检查您的邮箱收件箱（或垃圾邮件文件夹）
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                点击邮件中的验证链接
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                验证后返回登录
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <a
              href="/login"
              className="block w-full bg-primary hover:bg-primary-dim text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 text-center transition-all"
            >
              前往登录
            </a>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="block w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '发送中...' : '重新发送验证邮件'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none opacity-40"></div>

      <div className="w-full max-w-md px-8 py-10 relative z-10">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-primary mb-2 uppercase">Private Client</p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            申请访问
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            建立您的私人财富档案
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              邮箱地址
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                placeholder="请输入您的邮箱"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                placeholder="至少 6 位密码"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              确认密码
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                placeholder="再次输入密码"
                required
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dim text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>创建档案</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            已有账户？{' '}
            <a
              href="/login"
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              直接登录
            </a>
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest opacity-60">
          <Lock size={12} />
          Secure 256-bit Encryption
        </div>
      </div>
    </div>
  );
}