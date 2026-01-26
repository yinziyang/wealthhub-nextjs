'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Asset, DebtRecord } from '@/types';
import { formatNumber } from '@/utils';
import { getDebtRecords } from '@/lib/api/debt-records';
import DebtRecordList from '@/components/DebtRecordList';

interface DebtDetailPageProps {
  asset: Asset;
}

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromiseDebt: Promise<DebtRecord[]> | null = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DebtDetailPage: React.FC<DebtDetailPageProps> = ({ asset }) => {
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从记录中计算总债务金额
  const totalDebt = records.reduce((sum, record) => sum + record.amount, 0);

  // 统一获取数据，只调用一次 API（使用模块级缓存防止 React Strict Mode 导致重复请求）
  const fetchRecords = useCallback(async () => {
    // 如果已经有正在进行的全局请求，复用它
    if (globalFetchPromiseDebt) {
      try {
        const data = await globalFetchPromiseDebt;
        setRecords(data);
        setLoading(false);
      } catch (err) {
        console.error('获取债权记录失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
        setLoading(false);
      }
      return;
    }

    // 创建新的请求并缓存到全局变量
    setLoading(true);
    setError(null);
    globalFetchPromiseDebt = getDebtRecords();

    try {
      const data = await globalFetchPromiseDebt;
      setRecords(data);
    } catch (err) {
      console.error('获取债权记录失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
      // 请求完成后立即清除全局缓存
      globalFetchPromiseDebt = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
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

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 计算最早借款日期
  const earliestLoanDate = React.useMemo(() => {
    if (records.length === 0) return null;
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()
    );
    return new Date(sortedRecords[0].loan_date);
  }, [records]);

  return (
    <div className="space-y-4 -mt-2">
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(245,158,11,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-amber-50/30 dark:from-amber-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-amber-500 dark:text-amber-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {loading ? (
                <span className="inline-block w-32 h-10 bg-amber-200 dark:bg-amber-800 rounded animate-pulse" />
              ) : (
                `¥${formatNumber(totalDebt, 0)}`
              )}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              债权资产总额
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                债权笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? '--' : `${records.length}`} 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早借款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading || !earliestLoanDate
                  ? '--'
                  : earliestLoanDate.toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <DebtRecordList records={records} loading={loading} error={error} onRefresh={fetchRecords} />
    </div>
  );
};

export default DebtDetailPage;
