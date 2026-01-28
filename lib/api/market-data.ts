import type { MarketDataHistoryResponse } from '@/lib/api-response';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

interface FetchMarketDataHistoryParams {
  days?: number;
  hours?: number;
}

export async function fetchMarketDataHistory(
  params: FetchMarketDataHistoryParams,
  signal?: AbortSignal
): Promise<MarketDataHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.days) searchParams.append('days', params.days.toString());
  if (params.hours) searchParams.append('hours', params.hours.toString());

  const response = await fetch(`/api/market-data/history?${searchParams.toString()}`, { signal });
  const result: ApiResponse<MarketDataHistoryResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || '获取市场数据失败');
  }

  // 确保返回的数据结构符合预期，如果 data 为空则提供默认空对象
  return result.data || {
    gold_price: {},
    exchange_rate: {}
  };
}
