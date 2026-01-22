import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import type { User } from '@supabase/supabase-js';

/**
 * 检查 API 认证状态
 * 
 * 支持两种访问方式：
 * 1. 用户已登录（通过 Supabase Auth）
 * 2. Debug 模式（URL 参数 debug=1）
 * 
 * @param request Next.js 请求对象
 * @returns 认证结果
 * 
 * @example
 * // 在 API route 中使用
 * const auth = await checkApiAuth(request);
 * if (!auth.authorized) {
 *   return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
 * }
 */
export async function checkApiAuth(request: NextRequest): Promise<{
  authorized: boolean;
  user?: User;
  isDebug: boolean;
}> {
  const searchParams = request.nextUrl.searchParams;
  const isDebug = searchParams.get('debug') === '1';
  
  if (isDebug) {
    return { authorized: true, isDebug: true };
  }
  
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    return { authorized: false, isDebug: false };
  }
  
  return { 
    authorized: true, 
    user: data.user, 
    isDebug: false 
  };
}
