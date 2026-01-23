/**
 * 债权资产记录 API - 单条记录操作
 *
 * PATCH  /api/debt-records/[id] - 更新指定记录
 * DELETE /api/debt-records/[id] - 删除指定记录
 *
 * 注：当前版本暂不在前端使用，预留接口供后续扩展
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode
} from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的记录 ID 格式'
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的 JSON 格式'
      );
    }

    const { loan_date, debtor_name, amount } = body;

    if (amount != null && typeof amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须是数字'
      );
    }

    if (amount !== undefined && amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须大于 0'
      );
    }

    if (debtor_name !== undefined && typeof debtor_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 必须是字符串'
      );
    }
    if (debtor_name !== undefined && debtor_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 不能为空字符串'
      );
    }
    if (debtor_name !== undefined && debtor_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 长度不能超过 100 个字符'
      );
    }

    if (loan_date !== undefined) {
      const loanDate = new Date(loan_date);
      if (isNaN(loanDate.getTime())) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'loan_date 格式无效，请使用 ISO 8601 格式'
        );
      }
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
    const updateData: {
      loan_date?: string;
      debtor_name?: string;
      amount?: number;
    } = {};
    if (loan_date !== undefined) updateData.loan_date = loan_date;
    if (debtor_name !== undefined) updateData.debtor_name = debtor_name;
    if (amount !== undefined) updateData.amount = amount;

    const { data, error } = await supabase
      .from('debt_records')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCode.DATA_NOT_FOUND,
          '记录不存在或无权更新'
        );
      }

      console.error('更新债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新债权记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    if (!data) {
      return errorResponse(
        ErrorCode.DATA_NOT_FOUND,
        '记录不存在或无权更新'
      );
    }

    return successResponse(data, '更新债权记录成功');
  } catch (err) {
    console.error('更新债权记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的记录 ID 格式'
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
      .from('debt_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCode.DATA_NOT_FOUND,
          '记录不存在或无权删除'
        );
      }

      console.error('删除债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除债权记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    if (!data) {
      return errorResponse(
        ErrorCode.DATA_NOT_FOUND,
        '记录不存在或无权删除'
      );
    }

    return successResponse(null, '删除债权记录成功');
  } catch (err) {
    console.error('删除债权记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
