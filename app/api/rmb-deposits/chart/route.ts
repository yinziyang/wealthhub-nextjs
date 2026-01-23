/**
 * 人民币存款折线图数据 API
 *
 * GET /api/rmb-deposits/chart - 获取折线图数据
 *
 * 返回格式：按日期（北京时间）分组合并的存款记录
 * - 同一天多笔存款合并，金额求和
 * - 银行名称用逗号分隔
 * - 日期格式：YYYYMMDD（北京时间）
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode
} from '@/lib/api-response';

interface ChartDataItem {
  date: string;
  bank_name: string;
  amount: number;
}

function formatToBeijingDate(utcDateStr: string): string {
  const date = new Date(utcDateStr);
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('rmb_deposit_records')
      .select('deposit_date, bank_name, amount')
      .order('deposit_date', { ascending: true });

    if (error) {
      console.error('获取人民币存款图表数据失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取图表数据失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    const groupedMap = new Map<string, { banks: Set<string>; amount: number }>();

    for (const record of data || []) {
      const dateKey = formatToBeijingDate(record.deposit_date);

      if (groupedMap.has(dateKey)) {
        const existing = groupedMap.get(dateKey)!;
        existing.banks.add(record.bank_name);
        existing.amount += record.amount;
      } else {
        groupedMap.set(dateKey, {
          banks: new Set([record.bank_name]),
          amount: record.amount
        });
      }
    }

    const chartData: ChartDataItem[] = Array.from(groupedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { banks, amount }]) => ({
        date,
        bank_name: Array.from(banks).join(', '),
        amount
      }));

    return successResponse(chartData, '获取图表数据成功');
  } catch (err) {
    console.error('获取人民币存款图表数据异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
