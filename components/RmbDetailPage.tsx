'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Asset, RmbDepositRecord, RmbDepositChartItem } from '@/types';
import { formatNumber } from '@/utils';
import RmbDepositChart from '@/components/RmbDepositChart';
import RmbDepositRecords from '@/components/RmbDepositRecords';

interface RmbDetailPageProps {
  asset: Asset;
}

function formatToBeijingDate(utcDateStr: string): string {
  const date = new Date(utcDateStr);
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

const RmbDetailPage: React.FC<RmbDetailPageProps> = ({ asset }) => {
  const [records, setRecords] = useState<RmbDepositRecord[]>([]);
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
        const res = await fetch('/api/rmb-deposits', { signal: controller.signal });
        const json = await res.json();

        if (isCancelled) return;

        if (json.success) {
          setRecords(json.data);
        } else {
          setError('获取数据失败');
        }
      } catch (err) {
        if (!isCancelled && err instanceof Error && err.name !== 'AbortError') {
          console.error('获取人民币存款记录失败:', err);
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

  // Calculate statistics
  const totalDeposit = useMemo(() => {
    return records.reduce((sum, record) => sum + record.amount, 0);
  }, [records]);

  const depositCount = records.length;

  const earliestDepositDate = useMemo(() => {
    if (records.length === 0) return null;
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
    );
    return new Date(sortedRecords[0].deposit_date);
  }, [records]);

  // Generate chart data
  const chartData = useMemo<RmbDepositChartItem[]>(() => {
    if (records.length === 0) return [];

    const groupedMap = new Map<string, { banks: Set<string>; amount: number }>();

    for (const record of records) {
      const dateKey = formatToBeijingDate(record.deposit_date);

      if (groupedMap.has(dateKey)) {
        const existing = groupedMap.get(dateKey)!;
        existing.banks.add(record.bank_name);
        existing.amount += record.amount;
      } else {
        groupedMap.set(dateKey, {
          banks: new Set([record.bank_name]),
          amount: record.amount
        });
      }
    }

    return Array.from(groupedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { banks, amount }]) => ({
        date,
        bank_name: Array.from(banks).join(', '),
        amount
      }));
  }, [records]);

  // Refresh records
  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/rmb-deposits');
      const json = await res.json();
      if (json.success) {
        setRecords(json.data);
      }
    } catch (err) {
      console.error('刷新存款记录失败:', err);
    }
  }, []);

  return (
    <div className="space-y-4 -mt-2">
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(59,130,246,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-blue-50/30 dark:from-blue-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-blue-500 dark:text-blue-400 text-4xl font-extrabold tracking-tight mb-0.5">
              {loading ? (
                <span className="inline-block w-32 h-10 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
              ) : (
                `¥${formatNumber(totalDeposit, 0)}`
              )}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              人民币存款总额
            </div>
          </div>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                存款笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading ? '--' : `${depositCount} 笔`}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早存款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold">
                {loading || !earliestDepositDate
                  ? '--'
                  : earliestDepositDate.toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <RmbDepositChart chartData={chartData} isLoading={loading} error={error} />

      <RmbDepositRecords records={records} loading={loading} error={error} onRefresh={fetchRecords} />
    </div>
  );
};

export default RmbDetailPage;
