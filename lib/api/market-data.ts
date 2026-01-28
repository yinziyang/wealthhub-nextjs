import type { MarketDataHistoryResponse } from '@/lib/api-response';
import { getCaibaiGoldPrice } from '@/lib/gold-price';
import { getUsdToCnyRate } from '@/lib/exchange-rate';
import {
  saveExchangeRate,
  saveGoldPrice,
  saveDailyMarketData,
} from '@/lib/supabase';

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

function beijingStringToUTC(beijingStr: string): string {
  const [datePart, timePart] = beijingStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  return utcDate.toISOString();
}

function generateHourKey(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHour = date.getUTCHours();

  const beijingHour = (utcHour + 8) % 24;
  const dayOffset = Math.floor((utcHour + 8) / 24);

  const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay + dayOffset));
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  const hour = String(beijingHour).padStart(2, '0');

  return `${year}${month}${day}${hour}`;
}

function generateDateKey(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHour = date.getUTCHours();

  const dayOffset = Math.floor((utcHour + 8) / 24);

  const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay + dayOffset));
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function fetchAndSaveMarketData(): Promise<{
  goldPrice: number;
  goldUpdatedAt: string;
  exchangeRate: number;
  exchangeUpdatedAt: string;
  hourKey: string;
  dateKey: string;
}> {
  const now = new Date();
  const hourKey = generateHourKey(now);
  const dateKey = generateDateKey(now);

  const [goldData, exchangeData] = await Promise.all([
    getCaibaiGoldPrice(),
    getUsdToCnyRate(),
  ]);

  const goldUpdatedAtUTC = beijingStringToUTC(goldData.updateTime);
  const exchangeUpdatedAtUTC = beijingStringToUTC(exchangeData.updateTime);

  await Promise.all([
    saveExchangeRate(exchangeData.rate, exchangeUpdatedAtUTC, hourKey),
    saveGoldPrice(goldData.price, goldUpdatedAtUTC, hourKey),
    saveDailyMarketData({
      date: dateKey,
      goldPrice: goldData.price,
      goldUpdatedAt: goldUpdatedAtUTC,
      exchangeRate: exchangeData.rate,
      exchangeUpdatedAt: exchangeUpdatedAtUTC,
    }),
  ]);

  return {
    goldPrice: goldData.price,
    goldUpdatedAt: goldData.updateTime,
    exchangeRate: exchangeData.rate,
    exchangeUpdatedAt: exchangeData.updateTime,
    hourKey,
    dateKey,
  };
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

  return result.data || {
    gold_price: {},
    exchange_rate: {}
  };
}
