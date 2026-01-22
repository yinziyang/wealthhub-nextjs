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

    const { purchase_date, weight, gold_price_per_gram, handling_fee_per_gram, purchase_channel } = body;

    if (weight != null && typeof weight !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须是数字'
      );
    }
    if (gold_price_per_gram != null && typeof gold_price_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 必须是数字'
      );
    }
    if (handling_fee_per_gram != null && typeof handling_fee_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 必须是数字'
      );
    }

    if (weight !== undefined && weight <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须大于 0'
      );
    }
    if (gold_price_per_gram !== undefined && gold_price_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 不能为负数'
      );
    }
    if (handling_fee_per_gram !== undefined && handling_fee_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 不能为负数'
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
      weight?: number;
      gold_price_per_gram?: number;
      handling_fee_per_gram?: number;
      purchase_channel?: string;
    } = {};
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
    if (weight !== undefined) updateData.weight = weight;
    if (gold_price_per_gram !== undefined) updateData.gold_price_per_gram = gold_price_per_gram;
    if (handling_fee_per_gram !== undefined) updateData.handling_fee_per_gram = handling_fee_per_gram;
    if (purchase_channel !== undefined) updateData.purchase_channel = purchase_channel;

    const { data, error } = await supabase
      .from('gold_purchase_records')
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

      console.error('更新黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新黄金买入记录失败',
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

    return successResponse(data, '更新黄金买入记录成功');
  } catch (err) {
    console.error('更新黄金买入记录异常:', err);
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
      .from('gold_purchase_records')
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

      console.error('删除黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除黄金买入记录失败',
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

    return successResponse(null, '删除黄金买入记录成功');
  } catch (err) {
    console.error('删除黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
