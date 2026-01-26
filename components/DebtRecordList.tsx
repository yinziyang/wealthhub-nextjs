'use client';

import React, { useState } from 'react';
import { DebtRecord, UpdateDebtRecordRequest } from '@/types';
import { formatNumber } from '@/utils';
import { updateDebtRecord, deleteDebtRecord } from '@/lib/api/debt-records';
import SwipeableRecordItem from './SwipeableRecordItem';
import EditRecordModal from './EditRecordModal';
import ConfirmDialog from './ConfirmDialog';
import { Toast } from '@/components/Toast';

interface DebtRecordListProps {
  records: DebtRecord[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
}

const DebtRecordList: React.FC<DebtRecordListProps> = ({
  records,
  loading,
  error,
  onRefresh,
}) => {
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DebtRecord | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      await updateDebtRecord(editingRecord.id, updatedData as UpdateDebtRecordRequest);
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
