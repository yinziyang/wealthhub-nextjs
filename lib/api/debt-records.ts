/**
 * 债权资产记录 API 调用封装
 *
 * 使用方法:
 * import { getDebtRecords, createDebtRecord, ... } from '@/lib/api/debt-records';
 */

import {
  DebtRecord,
  CreateDebtRecordRequest,
  UpdateDebtRecordRequest
} from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export async function getDebtRecords(): Promise<DebtRecord[]> {
  const response = await fetch('/api/debt-records');
  const result: ApiResponse<DebtRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

export async function createDebtRecord(
  data: CreateDebtRecordRequest
): Promise<DebtRecord> {
  const response = await fetch('/api/debt-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<DebtRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

export async function deleteDebtRecord(id: string): Promise<void> {
  const response = await fetch(`/api/debt-records/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

export async function updateDebtRecord(
  id: string,
  data: UpdateDebtRecordRequest
): Promise<DebtRecord> {
  const response = await fetch(`/api/debt-records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<DebtRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}
