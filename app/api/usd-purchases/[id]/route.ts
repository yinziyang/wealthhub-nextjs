/**
 * 美元购汇记录 API - 单条记录操作
 *
 * PATCH  /api/usd-purchases/[id] - 更新指定记录
 * DELETE /api/usd-purchases/[id] - 删除指定记录
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

    const { purchase_date, usd_amount, exchange_rate, purchase_channel } = body;

    if (usd_amount != null && typeof usd_amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须是数字'
      );
    }
    if (exchange_rate != null && typeof exchange_rate !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须是数字'
      );
    }

    if (usd_amount !== undefined && usd_amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须大于 0'
      );
    }
    if (exchange_rate !== undefined && exchange_rate <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须大于 0'
      );
    }

    if (purchase_channel !== undefined && typeof purchase_channel !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 必须是字符串'
      );
    }
    if (purchase_channel !== undefined && purchase_channel.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 不能为空字符串'
      );
    }
    if (purchase_channel !== undefined && purchase_channel.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 长度不能超过 100 个字符'
      );
    }

    if (purchase_date !== undefined) {
      const purchaseDate = new Date(purchase_date);
      if (isNaN(purchaseDate.getTime())) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'purchase_date 格式无效，请使用 ISO 8601 格式'
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
      purchase_date?: string;
      usd_amount?: number;
      exchange_rate?: number;
      purchase_channel?: string;
    } = {};
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
    if (usd_amount !== undefined) updateData.usd_amount = usd_amount;
    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate;
    if (purchase_channel !== undefined) updateData.purchase_channel = purchase_channel;

    const { data, error } = await supabase
      .from('usd_purchase_records')
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

      console.error('更新美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新美元购汇记录失败',
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

    return successResponse(data, '更新美元购汇记录成功');
  } catch (err) {
    console.error('更新美元购汇记录异常:', err);
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
      .from('usd_purchase_records')
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

      console.error('删除美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除美元购汇记录失败',
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

    return successResponse(null, '删除美元购汇记录成功');
  } catch (err) {
    console.error('删除美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
