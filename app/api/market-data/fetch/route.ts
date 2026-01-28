import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response';
import { getCaibaiGoldPrice } from '@/lib/gold-price';
import { getUsdToCnyRate } from '@/lib/exchange-rate';
import {
  saveExchangeRate,
  saveGoldPrice,
  saveDailyMarketData,
} from '@/lib/supabase';

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

export async function POST(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(
      ErrorCode.AUTH_UNAUTHORIZED,
      '未授权访问，请登录或使用 debug=1 参数'
    );
  }

  try {
    const startTime = Date.now();
    const now = new Date();
    const hourKey = generateHourKey(now);
    const dateKey = generateDateKey(now);

    const [goldData, exchangeData] = await Promise.all([
      getCaibaiGoldPrice(),
      getUsdToCnyRate(),
    ]);

    const goldUpdatedAtUTC = beijingStringToUTC(goldData.updateTime);
    const exchangeUpdatedAtUTC = beijingStringToUTC(exchangeData.updateTime);

    const [exchangeResult, goldResult, dailyResult] = await Promise.all([
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

    const duration = (Date.now() - startTime) / 1000;

    return successResponse(
      {
        goldPrice: goldData.price,
        goldUpdatedAt: goldData.updateTime,
        exchangeRate: exchangeData.rate,
        exchangeUpdatedAt: exchangeData.updateTime,
        hourKey,
        dateKey,
        exchangeAction: exchangeResult.action,
        goldAction: goldResult.action,
        dailyAction: dailyResult.action,
        duration: duration.toFixed(2),
      },
      '市场数据抓取并保存成功'
    );
  } catch (error) {
    console.error('抓取市场数据失败:', error);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      error instanceof Error ? error.message : '抓取市场数据失败'
    );
  }
}
