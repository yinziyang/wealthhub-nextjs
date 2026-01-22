'use client';

import React, { useState } from 'react';
import { Diamond, ArrowRight, ScanFace, Lock, Loader2 } from 'lucide-react';

interface AuthPageProps {
  onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay for a premium feel
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background-light dark:bg-background-dark relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none opacity-40"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none opacity-40"></div>

      <div className="w-full max-w-md px-8 py-10 relative z-10 flex flex-col h-full sm:h-auto justify-center">
        
        {/* Logo / Header Area */}
        <div className="mb-12 text-center">
          <div className="size-20 mx-auto mb-6 bg-surface-dark rounded-full border border-white/10 flex items-center justify-center shadow-gold-glow relative">
            <Diamond className="text-primary" size={40} />
            <div className="absolute inset-0 border border-primary/30 rounded-full animate-pulse"></div>
          </div>
          <p className="text-xs font-bold tracking-[0.3em] text-primary mb-2 uppercase">Private Client</p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {isLogin ? '欢迎回来' : '申请访问'}
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            {isLogin ? '请验证您的身份以访问资产视图' : '建立您的私人财富档案'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                账户 / ID
              </label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                placeholder="请输入您的账户ID"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                通行密钥
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 rounded-xl px-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
                placeholder="••••••••"
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
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <span>{isLogin ? '安全进入' : '创建档案'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Biometric Hint (Visual only) */}
        {isLogin && (
          <div className="mt-8 text-center">
            <button type="button" className="inline-flex flex-col items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors group">
              <ScanFace className="group-hover:scale-110 transition-transform" size={32} />
              <span className="text-[10px] font-medium tracking-wide">Face ID 登录</span>
            </button>
          </div>
        )}

        {/* Toggle Mode */}
        <div className="mt-auto sm:mt-10 text-center">
          <p className="text-slate-500 text-sm">
            {isLogin ? '还没有账户? ' : '已有账户? '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline underline-offset-4"
            >
              {isLogin ? '立即注册' : '直接登录'}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-600 uppercase tracking-widest opacity-60">
          <Lock size={12} />
          Secure 256-bit Encryption
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
