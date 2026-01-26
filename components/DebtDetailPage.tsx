'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Asset, DebtRecord } from '@/types';
import { formatNumber } from '@/utils';
import DebtRecordList from '@/components/DebtRecordList';

interface DebtDetailPageProps {
  asset: Asset;
}

const DebtDetailPage: React.FC<DebtDetailPageProps> = ({ asset }) => {
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Consolidated data fetching
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/debt-records', { signal: controller.signal });
        const json = await res.json();

        if (isCancelled) return;

        if (json.success) {
          setRecords(json.data);
        } else {
          setError('获取数据失败');
        }
      } catch (err) {
        if (!isCancelled && err instanceof Error && err.name !== 'AbortError') {
          console.error('获取债权记录失败:', err);
          setError('数据加载失败');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, []);

  // Calculate total debt
  const totalDebt = useMemo(() => {
    return records.reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  // Calculate earliest loan date
  const earliestLoanDate = useMemo(() => {
    if (records.length === 0) return null;
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()
    );
    return new Date(sortedRecords[0].loan_date);
  }, [records]);

  // Refresh records
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/debt-records');
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      }
    } catch (err) {
      console.error('刷新债权记录失败:', err);
    }
  }, []);

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
