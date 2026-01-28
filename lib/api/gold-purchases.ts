/**
 * 黄金买入记录 API 调用封装
 *
 * 使用方法:
 * import { getGoldPurchases, createGoldPurchase, deleteGoldPurchase } from '@/lib/api/gold-purchases';
 *
 * 说明:
 * - 统一封装所有 API 调用，便于维护和类型安全
 * - 后端认证机制（checkApiAuth）保持不变
 * - 此文件仅为前端调用的便利层
 */

import { GoldPurchaseRecord, CreateGoldPurchaseRequest, UpdateGoldPurchaseRequest } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export async function getGoldPurchases(signal?: AbortSignal): Promise<GoldPurchaseRecord[]> {
  const response = await fetch('/api/gold-purchases', { signal });
  const result: ApiResponse<GoldPurchaseRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

export async function createGoldPurchase(
  data: CreateGoldPurchaseRequest
): Promise<GoldPurchaseRecord> {
  const response = await fetch('/api/gold-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<GoldPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

export async function deleteGoldPurchase(id: string): Promise<void> {
  const response = await fetch(`/api/gold-purchases/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

export async function updateGoldPurchase(
  id: string,
  data: UpdateGoldPurchaseRequest
): Promise<GoldPurchaseRecord> {
  const response = await fetch(`/api/gold-purchases/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<GoldPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}
