import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response';
import type { DailyMarketDataRow } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(
      ErrorCode.AUTH_UNAUTHORIZED,
      '未授权访问，请登录或使用 debug=1 参数'
    );
  }
  
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('daily_market_data')
    .select()
    .order('date', { ascending: false })
    .limit(1)
    .single();
  
  if (error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '获取市场数据失败',
      undefined,
      { supabaseError: error.message }
    );
  }
  
  return successResponse(
    data as DailyMarketDataRow,
    '获取最新市场数据成功'
  );
}
