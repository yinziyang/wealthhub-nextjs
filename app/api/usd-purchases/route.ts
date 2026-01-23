/**
 * 美元购汇记录 API
 *
 * GET  /api/usd-purchases     - 获取当前用户的所有记录
 * POST /api/usd-purchases     - 创建新记录
 */

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
      .from('usd_purchase_records')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error('获取美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取美元购汇记录成功');
  } catch (err) {
    console.error('获取美元购汇记录异常:', err);
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

    const { purchase_date, usd_amount, exchange_rate, purchase_channel } = body;

    if (!purchase_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_date'
      );
    }
    if (usd_amount == null || typeof usd_amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须是数字'
      );
    }
    if (exchange_rate == null || typeof exchange_rate !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须是数字'
      );
    }

    if (usd_amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须大于 0'
      );
    }
    if (exchange_rate <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须大于 0'
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
      .from('usd_purchase_records')
      .insert({
        user_id: userId,
        purchase_date,
        usd_amount,
        exchange_rate,
        purchase_channel,
      })
      .select()
      .single();

    if (error) {
      console.error('创建美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建美元购汇记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
