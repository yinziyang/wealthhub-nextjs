'use client';

import React, { useEffect, useState } from 'react';
import { DebtRecord } from '@/types';
import { formatNumber } from '@/utils';
import { getDebtRecords } from '@/lib/api/debt-records';

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromiseDebt: Promise<DebtRecord[]> | null = null;

const DebtRecordList: React.FC = () => {
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 统一获取数据，只调用一次 API（使用模块级缓存防止 React Strict Mode 导致重复请求）
  useEffect(() => {
    let isCancelled = false;

    async function fetchRecords() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromiseDebt) {
        try {
          const data = await globalFetchPromiseDebt;
          if (!isCancelled) {
            setRecords(data);
            setLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error('获取债权记录失败:', err);
            setError(err instanceof Error ? err.message : '获取数据失败');
            setLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      setLoading(true);
      setError(null);
      globalFetchPromiseDebt = getDebtRecords();

      try {
        const data = await globalFetchPromiseDebt;
        
        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          setRecords(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('获取债权记录失败:', err);
          setError(err instanceof Error ? err.message : '获取数据失败');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromiseDebt = null;
      }
    }

    fetchRecords();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      const countEl = document.getElementById('debt-count');
      if (countEl) countEl.textContent = `${records.length} 笔`;

      const sortedRecords = [...records].sort(
        (a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()
      );
      const earliestEl = document.getElementById('earliest-loan-date');
      if (earliestEl) {
        const date = new Date(sortedRecords[0].loan_date);
        earliestEl.textContent = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
    }
  }, [records]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无债权记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          债权记录
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {records.length}笔借款
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-xl bg-surface-darker border border-[rgba(245,158,11,0.12)] p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ¥{formatNumber(record.amount, 2)}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(record.loan_date)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">借款人</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {record.debtor_name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebtRecordList;
