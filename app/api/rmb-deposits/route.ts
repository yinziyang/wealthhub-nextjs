/**
 * 人民币存款记录 API
 *
 * GET  /api/rmb-deposits     - 获取当前用户的所有记录
 * POST /api/rmb-deposits     - 创建新记录
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
      .from('rmb_deposit_records')
      .select('*')
      .order('deposit_date', { ascending: false });

    if (error) {
      console.error('获取人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取人民币存款记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取人民币存款记录成功');
  } catch (err) {
    console.error('获取人民币存款记录异常:', err);
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

    const { deposit_date, bank_name, amount } = body;

    if (!deposit_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: deposit_date'
      );
    }
    if (amount == null || typeof amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须是数字'
      );
    }

    if (amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须大于 0'
      );
    }

    if (!bank_name) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: bank_name'
      );
    }
    if (typeof bank_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 必须是字符串'
      );
    }
    if (bank_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 不能为空字符串'
      );
    }
    if (bank_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 长度不能超过 100 个字符'
      );
    }

    const depositDate = new Date(deposit_date);
    if (isNaN(depositDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'deposit_date 格式无效，请使用 ISO 8601 格式'
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
      .from('rmb_deposit_records')
      .insert({
        user_id: userId,
        deposit_date,
        bank_name,
        amount,
      })
      .select()
      .single();

    if (error) {
      console.error('创建人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建人民币存款记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建人民币存款记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建人民币存款记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
