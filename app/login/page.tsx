'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, Mail, Lock, AlertCircle } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await signIn(email, password);

    if (result.success) {
      router.push(redirectTo);
    } else {
      setError(result.error || '登录失败，请重试');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none opacity-40"></div>

      <div className="w-full max-w-md px-8 py-10 relative z-10">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold tracking-[0.3em] text-primary mb-2 uppercase">Private Client</p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            欢迎回来
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            请验证您的身份以访问资产视图
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

        <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
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
                suppressHydrationWarning
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
                placeholder="••••••••"
                required
                suppressHydrationWarning
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
                  <span>安全进入</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            还没有账户？{' '}
            <a
              href="/register"
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              立即注册
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>}>
      <LoginForm />
    </Suspense>
  );
}