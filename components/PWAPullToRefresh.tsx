'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { ArrowDown, ArrowUp, Loader2, Check } from 'lucide-react';

interface PWAPullToRefreshProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
}

const PWAPullToRefresh: React.FC<PWAPullToRefreshProps> = ({ onRefresh, children }) => {
  const isPWA = usePWA();
  
  // State
  const [pullY, setPullY] = useState(0);
  const [status, setStatus] = useState<'pulling' | 'canRelease' | 'refreshing' | 'complete'>('pulling');
  const [isTouching, setIsTouching] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef(0);
  const isDraggingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  // Constants
  const HEAD_HEIGHT = 80;
  const THRESHOLD = 80; // 触发刷新和阻尼介入的阈值 (屏幕像素)
  const MAX_PULL = 80;  // 开始强阻尼的位置，与触发位置一致
  const DAMPING = 0.6;  // 基础阻尼

  // Update onRefresh ref
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!isPWA || !containerRef.current) return;

    const container = containerRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      // 只有在顶部时才允许下拉
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 5) return; 

      touchStartRef.current = e.touches[0].clientY;
      isDraggingRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      // 如果不在顶部，且没在拖拽中，不处理
      if (scrollTop > 5 && !isDraggingRef.current) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - touchStartRef.current;

      // 开始下拉逻辑：在顶部 + 向下拉 + (已在拖拽模式 或 刚开始拉)
      if (diff > 0 && (scrollTop <= 5 || isDraggingRef.current)) {
        if (e.cancelable) e.preventDefault(); // 阻止原生滚动
        isDraggingRef.current = true;
        setIsTouching(true);

        // 1. 应用基础阻尼
        let newY = diff * DAMPING;

        // 2. 超过 MAX_PULL 后的强阻尼 (模拟"拉不动"的边界感)
        // 用户要求：变成向上箭头(达到阈值)时，阻尼介入
        if (newY > MAX_PULL) {
           // 极强的阻力系数 0.15，防止过度下拉
           newY = MAX_PULL + (newY - MAX_PULL) * 0.15;
        }
        
        setPullY(newY);
        
        // 状态判定：直接对比屏幕位移 newY 和 阈值
        if (status !== 'refreshing' && status !== 'complete') {
           setStatus(newY >= THRESHOLD ? 'canRelease' : 'pulling');
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current) return;
      
      isDraggingRef.current = false;
      setIsTouching(false);

      if (status === 'refreshing' || status === 'complete') {
        // 如果正在刷新，松手后保持在 HEAD_HEIGHT
        setPullY(HEAD_HEIGHT);
        return;
      }

      // 触发判定：直接对比屏幕位移 pullY 和 阈值
      if (pullY >= THRESHOLD) {
        // 触发刷新
        setPullY(HEAD_HEIGHT);
        setStatus('refreshing');
        try {
          await onRefreshRef.current();
          setStatus('complete');
          // 显示完成状态 800ms
          setTimeout(() => {
             setPullY(0);
             // 动画结束后重置状态
             setTimeout(() => setStatus('pulling'), 300);
          }, 800);
        } catch (e) {
          console.error(e);
          setPullY(0);
          setStatus('pulling');
        }
      } else {
        // 没拉到位，回弹
        setPullY(0);
      }
    };

    // passive: false 允许 preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isPWA, pullY, status]); // 移除了 onRefresh 依赖，改用 ref

  if (!isPWA) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} style={{ minHeight: '100%' }}>
      {/* Pull Indicator */}
      <div 
         className="overflow-hidden flex items-center justify-center w-full bg-transparent"
         style={{ 
           height: `${pullY}px`,
           // 拖拽时无动画（跟手），松手时有动画（回弹）
           transition: isTouching ? 'none' : 'height 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
         }}
      >
        <div className="flex items-center justify-center h-full pb-2"> 
          {status === 'pulling' && (
            <div className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm text-slate-500 dark:text-slate-400 transform transition-transform duration-200">
              <ArrowDown size={20} />
            </div>
          )}
          {status === 'canRelease' && (
            <div className="p-2 rounded-full bg-primary/10 text-primary transform transition-transform duration-200 scale-110">
              <ArrowUp size={20} />
            </div>
          )}
          {status === 'refreshing' && (
            <div className="p-2 rounded-full bg-surface-light dark:bg-surface-dark shadow-sm text-primary">
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
          {status === 'complete' && (
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-500">
              <Check size={20} />
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      {children}
    </div>
  );
};

export default PWAPullToRefresh;
