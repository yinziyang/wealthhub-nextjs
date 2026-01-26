'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Asset, RmbDepositRecord, RmbDepositChartItem } from '@/types';
import { formatNumber } from '@/utils';
import { getRmbDeposits } from '@/lib/api/rmb-deposits';
import RmbDepositChart from '@/components/RmbDepositChart';
import RmbDepositRecords from '@/components/RmbDepositRecords';

interface RmbDetailPageProps {
  asset: Asset;
}

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromise: Promise<RmbDepositRecord[]> | null = null;

function formatToBeijingDate(utcDateStr: string): string {
  const date = new Date(utcDateStr);
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RmbDetailPage: React.FC<RmbDetailPageProps> = ({ asset }) => {
  const [records, setRecords] = useState<RmbDepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从记录中计算总存款金额
  const totalDeposit = records.reduce((sum, record) => sum + record.amount, 0);

  // 统一获取数据，只调用一次 API（使用模块级缓存防止 React Strict Mode 导致重复请求）
  const fetchRecords = React.useCallback(async () => {
    // 如果已经有正在进行的全局请求，复用它
    if (globalFetchPromise) {
      try {
        const data = await globalFetchPromise;
        setRecords(data);
        setLoading(false);
      } catch (err) {
        console.error('获取人民币存款记录失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
        setLoading(false);
      }
      return;
    }

    // 创建新的请求并缓存到全局变量
    setLoading(true);
    setError(null);
    globalFetchPromise = getRmbDeposits();

    try {
      const data = await globalFetchPromise;
      setRecords(data);
    } catch (err) {
      console.error('获取人民币存款记录失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setLoading(false);
      // 请求完成后立即清除全局缓存
      globalFetchPromise = null;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromise) {
        try {
          const data = await globalFetchPromise;
          if (!isCancelled) {
            setRecords(data);
            setLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error('获取人民币存款记录失败:', err);
            setError(err instanceof Error ? err.message : '获取数据失败');
            setLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      setLoading(true);
      setError(null);
      globalFetchPromise = getRmbDeposits();

      try {
        const data = await globalFetchPromise;
        
        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          setRecords(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('获取人民币存款记录失败:', err);
          setError(err instanceof Error ? err.message : '获取数据失败');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromise = null;
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 从记录生成图表数据（按日期合并）
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

  // 更新统计信息
  useEffect(() => {
    if (records.length > 0) {
      const countEl = document.getElementById('deposit-count');
      if (countEl) countEl.textContent = `${records.length} 笔`;

      const sortedRecords = [...records].sort(
        (a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
      );
      const earliestEl = document.getElementById('earliest-date');
      if (earliestEl) {
        const date = new Date(sortedRecords[0].deposit_date);
        earliestEl.textContent = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
    }
  }, [records]);

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
              <div className="text-slate-900 dark:text-white text-base font-bold" id="deposit-count">
                {loading ? '--' : `${records.length}`} 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早存款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="earliest-date">
                --
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
