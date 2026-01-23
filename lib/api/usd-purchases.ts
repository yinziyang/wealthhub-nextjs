/**
 * 美元购汇记录 API 调用封装
 *
 * 使用方法:
 * import { getUsdPurchases, createUsdPurchase, deleteUsdPurchase, updateUsdPurchase } from '@/lib/api/usd-purchases';
 */

import { UsdPurchaseRecord, CreateUsdPurchaseRequest, UpdateUsdPurchaseRequest } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export async function getUsdPurchases(): Promise<UsdPurchaseRecord[]> {
  const response = await fetch('/api/usd-purchases');
  const result: ApiResponse<UsdPurchaseRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

export async function createUsdPurchase(
  data: CreateUsdPurchaseRequest
): Promise<UsdPurchaseRecord> {
  const response = await fetch('/api/usd-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<UsdPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

export async function deleteUsdPurchase(id: string): Promise<void> {
  const response = await fetch(`/api/usd-purchases/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

export async function updateUsdPurchase(
  id: string,
  data: UpdateUsdPurchaseRequest
): Promise<UsdPurchaseRecord> {
  const response = await fetch(`/api/usd-purchases/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<UsdPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}
