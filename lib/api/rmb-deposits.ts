/**
 * 人民币存款记录 API 调用封装
 *
 * 使用方法:
 * import { getRmbDeposits, createRmbDeposit, ... } from '@/lib/api/rmb-deposits';
 */

import {
  RmbDepositRecord,
  CreateRmbDepositRequest,
  UpdateRmbDepositRequest,
  RmbDepositChartItem
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

export async function getRmbDeposits(signal?: AbortSignal): Promise<RmbDepositRecord[]> {
  const response = await fetch('/api/rmb-deposits', { signal });
  const result: ApiResponse<RmbDepositRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

export async function createRmbDeposit(
  data: CreateRmbDepositRequest
): Promise<RmbDepositRecord> {
  const response = await fetch('/api/rmb-deposits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<RmbDepositRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

export async function deleteRmbDeposit(id: string): Promise<void> {
  const response = await fetch(`/api/rmb-deposits/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

export async function updateRmbDeposit(
  id: string,
  data: UpdateRmbDepositRequest
): Promise<RmbDepositRecord> {
  const response = await fetch(`/api/rmb-deposits/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<RmbDepositRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}

export async function getRmbDepositChartData(): Promise<RmbDepositChartItem[]> {
  const response = await fetch('/api/rmb-deposits/chart');
  const result: ApiResponse<RmbDepositChartItem[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取图表数据失败');
  }

  return result.data || [];
}
