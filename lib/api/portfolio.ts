import type { PortfolioAllResponse } from '@/types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export async function fetchPortfolioAll(signal?: AbortSignal): Promise<PortfolioAllResponse> {
  const response = await fetch('/api/portfolio/all', { signal });
  const result: ApiResponse<PortfolioAllResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || '获取资产组合数据失败');
  }

  return result.data || {
    'gold-purchases': {},
    'debt-records': {},
    'usd-purchases': {},
    'rmb-deposits': {},
  };
}
