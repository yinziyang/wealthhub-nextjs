'use client';

import React, { useMemo, useState } from 'react';
import { Asset, UsdPurchaseRecord, UpdateUsdPurchaseRequest } from '@/types';
import { formatNumber } from '@/utils';
import { updateUsdPurchase, deleteUsdPurchase } from '@/lib/api/usd-purchases';
import SwipeableRecordItem from './SwipeableRecordItem';
import EditRecordModal from './EditRecordModal';
import ConfirmDialog from './ConfirmDialog';
import { Toast } from '@/components/Toast';

interface UsdPurchaseRecordsProps {
  records: UsdPurchaseRecord[];
  currentExchangeRate: number;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
}

interface RecordWithProfit extends UsdPurchaseRecord {
  profitLoss: number;
  currentValue: number;
  purchaseCost: number;
}

const UsdPurchaseRecords: React.FC<UsdPurchaseRecordsProps> = ({
  records,
  currentExchangeRate,
  loading,
  onRefresh,
}) => {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UsdPurchaseRecord | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const recordsWithProfit = useMemo<RecordWithProfit[]>(() => {
    return records.map(record => {
      const currentValue = record.usd_amount * currentExchangeRate;
      const profitLoss = currentValue - record.total_rmb_amount;

      return {
        ...record,
        profitLoss,
        currentValue,
        purchaseCost: record.total_rmb_amount,
      };
    });
  }, [records, currentExchangeRate]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleEdit = (id: string) => {
    const record = recordsWithProfit.find(r => r.id === id);
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
      await deleteUsdPurchase(recordToDelete);
      Toast.show({ icon: 'success', content: '删除成功' });
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      await onRefresh();
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
      await updateUsdPurchase(editingRecord.id, updatedData as UpdateUsdPurchaseRequest);
      Toast.show({ icon: 'success', content: '保存成功' });
      setEditModalOpen(false);
      setEditingRecord(null);
      await onRefresh();
    } catch (error) {
      console.error('更新记录失败:', error);
      Toast.show({ icon: 'fail', content: error instanceof Error ? error.message : '保存失败' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购汇记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (recordsWithProfit.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购汇记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无购汇记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          购汇记录
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {recordsWithProfit.length}笔交易
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {recordsWithProfit.map((record) => (
          <SwipeableRecordItem
            key={record.id}
            recordId={record.id}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            activeSwipeId={activeSwipeId}
            onSwipeOpen={setActiveSwipeId}
            onSwipeClose={() => setActiveSwipeId(null)}
          >
            <div className="rounded-xl bg-surface-darker border border-[rgba(34,197,94,0.12)] p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatNumber(record.usd_amount, 2)}
                    <span className="text-xs font-normal text-slate-500 ml-0.5">USD</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDate(record.purchase_date)}
                  </span>
                </div>
                <div className={`text-sm font-bold ${
                  record.profitLoss >= 0
                    ? 'text-emerald-500'
                    : 'text-red-500'
                }`}>
                  {record.profitLoss >= 0 ? '+' : ''}¥{formatNumber(record.profitLoss, 0)}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">汇率</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {formatNumber(record.exchange_rate, 4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">渠道</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {record.purchase_channel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">成本</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-500 text-sm">
                      ¥{formatNumber(record.total_rmb_amount, 0)}
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
        recordType="usd"
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

export default UsdPurchaseRecords;
