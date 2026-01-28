import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response';
import { fetchAndSaveMarketData } from '@/lib/api/market-data';

export async function POST(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(
      ErrorCode.AUTH_UNAUTHORIZED,
      '未授权访问，请登录或使用 debug=1 参数'
    );
  }

  try {
    const startTime = Date.now();
    const data = await fetchAndSaveMarketData();
    const duration = (Date.now() - startTime) / 1000;

    return successResponse(
      {
        ...data,
        duration: duration.toFixed(2),
      },
      '市场数据抓取并保存成功'
    );
  } catch (error) {
    console.error('抓取市场数据失败:', error);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      error instanceof Error ? error.message : '抓取市场数据失败'
    );
  }
}
