import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode,
  type MarketDataHistoryResponse,
  type MarketDataHourlyHistoryResponse,
} from '@/lib/api-response';
import { formatDateYYYYMMDDFromString, getHourRange } from '@/lib/date-utils';
import type { DailyMarketDataRow } from '@/lib/supabase';

interface ExchangeRateRow {
  id: string;
  rate: number;
  updated_at: string;
  hour_key: string;
  created_at: string;
}

interface GoldPriceRow {
  id: string;
  price: number;
  updated_at: string;
  hour_key: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  const searchParams = request.nextUrl.searchParams;
  const hoursParam = searchParams.get('hours');
  const daysParam = searchParams.get('days');

  const hours = hoursParam ? parseInt(hoursParam, 10) : null;
  const days = daysParam ? parseInt(daysParam, 10) : 7;

  if (hours !== null) {
    return handleHourlyRequest(hours);
  } else {
    return handleDailyRequest(days);
  }
}

async function handleDailyRequest(days: number) {
  if (isNaN(days) || days < 1) {
    return errorResponse(
      ErrorCode.DATA_VALIDATION_FAILED,
      '参数 days 必须是正整数'
    );
  }

  const dateKeys = getDailyDateRange(days);

  const totalDays = days + 1;
  const startDate = new Date(Date.now() - (totalDays - 1) * 24 * 60 * 60 * 1000);
  const startDateKey = toBeijingDateKey(startDate);

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('daily_market_data')
    .select()
    .gte('date', startDateKey)
    .order('date', { ascending: false });

  if (error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '查询市场数据失败',
      undefined,
      { supabaseError: error.message }
    );
  }

  const dataMap = new Map<string, DailyMarketDataRow>();
  for (const row of data || []) {
    const dateKey = formatDateYYYYMMDDFromString(row.date);
    dataMap.set(dateKey, row);
  }

  const goldPriceMap: Record<string, number> = {};
  const exchangeRateMap: Record<string, number> = {};

  let lastGoldPrice: number | null = null;
  let lastExchangeRate: number | null = null;

  for (const dateKey of dateKeys.reverse()) {
    const record = dataMap.get(dateKey);

    if (record && record.gold_price !== 0) {
      lastGoldPrice = record.gold_price;
    }

    if (record && record.exchange_rate !== 0) {
      lastExchangeRate = record.exchange_rate;
    }

    goldPriceMap[dateKey] = lastGoldPrice ?? 0;
    exchangeRateMap[dateKey] = lastExchangeRate ?? 0;
  }

  const responseData: MarketDataHistoryResponse = {
    gold_price: goldPriceMap,
    exchange_rate: exchangeRateMap,
  };

  return successResponse(responseData, '获取历史数据成功');
}

async function handleHourlyRequest(hours: number) {
  if (isNaN(hours) || hours < 1 || hours > 48) {
    return errorResponse(
      ErrorCode.DATA_VALIDATION_FAILED,
      '参数 hours 必须是 1~48 的整数'
    );
  }

  const hourKeys = getHourRange(hours);

  const totalHours = hours + 1;
  const startHour = new Date(Date.now() - (totalHours - 1) * 60 * 60 * 1000);
  const startHourKey = toBeijingHourKey(startHour);

  const supabase = await createServerSupabaseClient();

  const [exchangeResult, goldResult] = await Promise.all([
    supabase.from('exchange_rates').select().gte('hour_key', startHourKey).order('hour_key', { ascending: false }),
    supabase.from('gold_prices').select().gte('hour_key', startHourKey).order('hour_key', { ascending: false }),
  ]);

  if (exchangeResult.error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '查询汇率数据失败',
      undefined,
      { supabaseError: exchangeResult.error.message }
    );
  }

  if (goldResult.error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '查询金价数据失败',
      undefined,
      { supabaseError: goldResult.error.message }
    );
  }

  const exchangeDataMap = new Map<string, ExchangeRateRow>();
  for (const row of exchangeResult.data || []) {
    exchangeDataMap.set(row.hour_key, row);
  }

  const goldDataMap = new Map<string, GoldPriceRow>();
  for (const row of goldResult.data || []) {
    goldDataMap.set(row.hour_key, row);
  }

  const goldPriceMap: Record<string, number> = {};
  const exchangeRateMap: Record<string, number> = {};

  let lastGoldPrice: number | null = null;
  let lastExchangeRate: number | null = null;

  for (const hourKey of hourKeys.reverse()) {
    const goldRecord = goldDataMap.get(hourKey);
    const exchangeRecord = exchangeDataMap.get(hourKey);

    if (goldRecord && goldRecord.price !== 0) {
      lastGoldPrice = goldRecord.price;
    }

    if (exchangeRecord && exchangeRecord.rate !== 0) {
      lastExchangeRate = exchangeRecord.rate;
    }

    goldPriceMap[hourKey] = lastGoldPrice ?? 0;
    exchangeRateMap[hourKey] = lastExchangeRate ?? 0;
  }

  const responseData: MarketDataHourlyHistoryResponse = {
    gold_price: goldPriceMap,
    exchange_rate: exchangeRateMap,
  };

  return successResponse(responseData, '获取小时历史数据成功');
}

function toBeijingDateKey(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHour = date.getUTCHours();

  const dayOffset = Math.floor((utcHour + 8) / 24);

  const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay + dayOffset));
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

function toBeijingHourKey(date: Date): string {
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

function getDailyDateRange(days: number): string[] {
  const result: string[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    result.push(toBeijingDateKey(date));
  }

  return result;
}
