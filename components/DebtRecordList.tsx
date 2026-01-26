'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DebtRecord, UpdateDebtRecordRequest } from '@/types';
import { formatNumber } from '@/utils';
import { getDebtRecords, updateDebtRecord, deleteDebtRecord } from '@/lib/api/debt-records';
import SwipeableRecordItem from './SwipeableRecordItem';
import EditRecordModal from './EditRecordModal';
import ConfirmDialog from './ConfirmDialog';
import { Toast } from '@/components/Toast';

// 模块级别的请求缓存，防止 React Strict Mode 导致重复请求
let globalFetchPromiseDebt: Promise<DebtRecord[]> | null = null;

interface DebtRecordListProps {
  records?: DebtRecord[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
}

const DebtRecordList: React.FC<DebtRecordListProps> = ({
  records: externalRecords,
  loading: externalLoading,
  error: externalError,
  onRefresh: externalOnRefresh,
}) => {
  const [internalRecords, setInternalRecords] = useState<DebtRecord[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);
  
  // 如果外部提供了数据，使用外部数据；否则使用内部状态
  const records = externalRecords ?? internalRecords;
  const loading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DebtRecord | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 统一获取数据，只调用一次 API（使用模块级缓存防止 React Strict Mode 导致重复请求）
  const fetchRecords = useCallback(async () => {
    // 如果外部提供了 onRefresh，调用它
    if (externalOnRefresh) {
      await externalOnRefresh();
      return;
    }

    // 如果已经有正在进行的全局请求，复用它
    if (globalFetchPromiseDebt) {
      try {
        const data = await globalFetchPromiseDebt;
        setInternalRecords(data);
        setInternalLoading(false);
      } catch (err) {
        console.error('获取债权记录失败:', err);
        setInternalError(err instanceof Error ? err.message : '获取数据失败');
        setInternalLoading(false);
      }
      return;
    }

    // 创建新的请求并缓存到全局变量
    setInternalLoading(true);
    setInternalError(null);
    globalFetchPromiseDebt = getDebtRecords();

    try {
      const data = await globalFetchPromiseDebt;
      setInternalRecords(data);
    } catch (err) {
      console.error('获取债权记录失败:', err);
      setInternalError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setInternalLoading(false);
      // 请求完成后立即清除全局缓存
      globalFetchPromiseDebt = null;
    }
  }, [externalOnRefresh]);

  useEffect(() => {
    // 如果外部提供了数据，不需要内部获取
    if (externalRecords !== undefined) {
      return;
    }

    let isCancelled = false;

    async function fetchData() {
      // 如果已经有正在进行的全局请求，复用它
      if (globalFetchPromiseDebt) {
        try {
          const data = await globalFetchPromiseDebt;
          if (!isCancelled) {
            setInternalRecords(data);
            setInternalLoading(false);
          }
        } catch (err) {
          if (!isCancelled) {
            console.error('获取债权记录失败:', err);
            setInternalError(err instanceof Error ? err.message : '获取数据失败');
            setInternalLoading(false);
          }
        }
        return;
      }

      // 创建新的请求并缓存到全局变量
      setInternalLoading(true);
      setInternalError(null);
      globalFetchPromiseDebt = getDebtRecords();

      try {
        const data = await globalFetchPromiseDebt;

        // 如果组件已卸载或请求被取消，不更新状态
        if (!isCancelled) {
          setInternalRecords(data);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('获取债权记录失败:', err);
          setInternalError(err instanceof Error ? err.message : '获取数据失败');
        }
      } finally {
        if (!isCancelled) {
          setInternalLoading(false);
        }
        // 请求完成后立即清除全局缓存
        globalFetchPromiseDebt = null;
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [externalRecords]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleEdit = (id: string) => {
    const record = records.find(r => r.id === id);
    if (record) {
      setEditingRecord(record);
      setEditModalOpen(true);
    }
  };

  const handleDeleteClick = (id: string) => {
    setRecordToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDebtRecord(recordToDelete);
      Toast.show({ icon: 'success', content: '删除成功' });
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      // 刷新数据而不是更新本地状态
      await fetchRecords();
    } catch (error) {
      console.error('删除记录失败:', error);
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '删除失败' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async (updatedData: object) => {
    if (!editingRecord) return;

    try {
      await updateDebtRecord(editingRecord.id, updatedData as UpdateDebtRecordRequest);
      Toast.show({ icon: 'success', content: '保存成功' });
      setEditModalOpen(false);
      setEditingRecord(null);
      // 刷新数据而不是更新本地状态
      await fetchRecords();
    } catch (error) {
      console.error('更新记录失败:', error);
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '保存失败' });
    }
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
          <SwipeableRecordItem
            key={record.id}
            recordId={record.id}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            activeSwipeId={activeSwipeId}
            onSwipeOpen={setActiveSwipeId}
            onSwipeClose={() => setActiveSwipeId(null)}
          >
            <div className="rounded-xl bg-surface-darker border border-[rgba(245,158,11,0.12)] p-3 shadow-sm">
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
          </SwipeableRecordItem>
        ))}
      </div>

      <EditRecordModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingRecord(null);
        }}
        recordType="debt"
        recordData={editingRecord}
        onSave={handleSaveEdit}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        content="删除后无法恢复，确定要删除这条记录吗？"
        confirmText="删除"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
};

export default DebtRecordList;
