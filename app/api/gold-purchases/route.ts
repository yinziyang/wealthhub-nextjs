import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode,
  HttpStatusCode
} from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('gold_purchase_records')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error('获取黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取黄金买入记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取黄金买入记录成功');
  } catch (err) {
    console.error('获取黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的 JSON 格式'
      );
    }

    const { purchase_date, weight, gold_price_per_gram, handling_fee_per_gram, purchase_channel } = body;

    if (!purchase_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_date'
      );
    }
    if (weight == null || typeof weight !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须是数字'
      );
    }
    if (gold_price_per_gram == null || typeof gold_price_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 必须是数字'
      );
    }
    if (handling_fee_per_gram == null || typeof handling_fee_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 必须是数字'
      );
    }

    if (weight <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须大于 0'
      );
    }
    if (gold_price_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 不能为负数'
      );
    }
    if (handling_fee_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 不能为负数'
      );
    }

    if (!purchase_channel) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_channel'
      );
    }
    if (typeof purchase_channel !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 必须是字符串'
      );
    }
    if (purchase_channel.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 不能为空字符串'
      );
    }
    if (purchase_channel.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 长度不能超过 100 个字符'
      );
    }

    const purchaseDate = new Date(purchase_date);
    if (isNaN(purchaseDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_date 格式无效，请使用 ISO 8601 格式'
      );
    }

    let userId: string;
    if (auth.isDebug) {
      const debugUserId = request.nextUrl.searchParams.get('user_id');
      if (!debugUserId) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'Debug 模式下需要提供 user_id 参数'
        );
      }
      userId = debugUserId;
    } else {
      userId = auth.user!.id;
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('gold_purchase_records')
      .insert({
        user_id: userId,
        purchase_date,
        weight,
        gold_price_per_gram,
        handling_fee_per_gram,
        purchase_channel,
      })
      .select()
      .single();

    if (error) {
      console.error('创建黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建黄金买入记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建黄金买入记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
