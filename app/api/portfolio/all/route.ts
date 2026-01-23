import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode,
} from '@/lib/api-response';
import type { PortfolioAllResponse, PortfolioRpcResult } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.rpc('get_portfolio_all');

    if (error) {
      console.error('获取资产组合数据失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取资产组合数据失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    const result: PortfolioAllResponse = {
      'gold-purchases': {},
      'usd-purchases': {},
      'rmb-deposits': {},
      'debt-records': {},
    };

    if (data && Array.isArray(data)) {
      for (const row of data as PortfolioRpcResult[]) {
        result[row.record_type][row.record_id] = row.record_data;
      }
    }

    return successResponse(result, '获取资产组合数据成功');
  } catch (err) {
    console.error('获取资产组合数据异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
