import { NextResponse } from 'next/server';

/**
 * 统一 API 响应格式规范
 * 
 * 所有 API 接口必须遵循此格式，确保前端处理的一致性。
 * 
 * @module lib/api-response
 */

// ============================================================================
// 1. 响应格式类型定义
// ============================================================================

/**
 * 成功响应格式
 * @example
 * {
 *   "success": true,
 *   "data": { "id": "123", "name": "测试" },
 *   "message": "操作成功"
 * }
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * 错误响应格式
 * @example
 * {
 *   "success": false,
 *   "error": {
 *     "code": "UNAUTHORIZED",
 *     "message": "未授权访问",
 *     "details": { "reason": "Missing session" }
 *   }
 * }
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * 分页响应格式
 * @example
 * {
 *   "success": true,
 *   "data": [...],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "total": 100,
 *     "totalPages": 5
 *   }
 * }
 */
export interface ApiPaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 历史市场数据响应格式（按天）
 * @example
 * {
 *   "success": true,
 *   "data": {
 *     "gold_price": {
 *       "20260101": 1023.00,
 *       "20260102": 1025.00
 *     },
 *     "exchange_rate": {
 *       "20260101": 6.9732,
 *       "20260102": 6.9810
 *     }
 *   }
 * }
 */
export interface MarketDataHistoryResponse {
  gold_price: Record<string, number>;
  exchange_rate: Record<string, number>;
}

/**
 * 历史市场数据响应格式（按小时）
 * @example
 * {
 *   "success": true,
 *   "data": {
 *     "gold_price": {
 *       "2026012020": 1023.00,
 *       "2026012021": 1025.00
 *     },
 *     "exchange_rate": {
 *       "2026012020": 6.9732,
 *       "2026012021": 6.9810
 *     }
 *   }
 * }
 */
export interface MarketDataHourlyHistoryResponse {
  gold_price: Record<string, number>;
  exchange_rate: Record<string, number>;
}

// ============================================================================
// 2. HTTP 状态码规范
// ============================================================================

/**
 * 推荐的 HTTP 状态码使用规范：
 * 
 * 200 OK - 请求成功
 * 201 Created - 资源创建成功
 * 204 No Content - 删除成功（无返回内容）
 * 400 Bad Request - 请求参数错误
 * 401 Unauthorized - 未认证
 * 403 Forbidden - 权限不足
 * 404 Not Found - 资源不存在
 * 422 Unprocessable Entity - 数据验证失败
 * 429 Too Many Requests - 请求过于频繁
 * 500 Internal Server Error - 服务器内部错误
 * 503 Service Unavailable - 服务暂时不可用
 */
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// ============================================================================
// 3. 错误码枚举
// ============================================================================

/**
 * 统一错误码定义
 * 格式：模块_错误类型_具体错误
 * 例如：AUTH_MISSING_CREDENTIALS, DATA_NOT_FOUND
 */
export enum ErrorCode {
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_MISSING_CREDENTIALS = 'AUTH_MISSING_CREDENTIALS',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  FORBIDDEN_INSUFFICIENT_PERMISSIONS = 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_ALREADY_EXISTS = 'DATA_ALREADY_EXISTS',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  SERVER_INTERNAL_ERROR = 'SERVER_INTERNAL_ERROR',
  SERVER_DATABASE_ERROR = 'SERVER_DATABASE_ERROR',
  SERVER_EXTERNAL_API_ERROR = 'SERVER_EXTERNAL_API_ERROR',
}

// ============================================================================
// 4. 辅助函数：创建响应
// ============================================================================

/**
 * 创建成功响应
 * @param data 返回的数据
 * @param message 可选的成功消息
 * @param status HTTP 状态码（默认 200）
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: HttpStatusCode = HttpStatusCode.OK
): NextResponse {
  const body: ApiResponse<T> = {
    success: true,
    data,
  };
  
  if (message) {
    body.message = message;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * 创建错误响应
 * @param code 错误码
 * @param message 错误消息（用户友好）
 * @param status HTTP 状态码（默认根据错误码自动推断）
 * @param details 可选的详细信息
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status?: HttpStatusCode,
  details?: any
): NextResponse {
  if (!status) {
    status = getStatusCodeForError(code);
  }
  
  const body: ApiError = {
    success: false,
    error: {
      code,
      message,
    },
  };
  
  if (details) {
    body.error.details = details;
  }
  
  return NextResponse.json(body, { status });
}

/**
 * 创建分页响应
 * @param data 数据数组
 * @param page 当前页码
 * @param pageSize 每页大小
 * @param total 总记录数
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): NextResponse {
  const totalPages = Math.ceil(total / pageSize);
  
  const body: ApiPaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
  
  return NextResponse.json(body);
}

// ============================================================================
// 5. 私有辅助函数
// ============================================================================

function getStatusCodeForError(code: ErrorCode): HttpStatusCode {
  if (code.startsWith('AUTH_')) {
    return HttpStatusCode.UNAUTHORIZED;
  }
  if (code.startsWith('FORBIDDEN_')) {
    return HttpStatusCode.FORBIDDEN;
  }
  if (code === ErrorCode.DATA_NOT_FOUND) {
    return HttpStatusCode.NOT_FOUND;
  }
  if (code === ErrorCode.DATA_VALIDATION_FAILED) {
    return HttpStatusCode.UNPROCESSABLE_ENTITY;
  }
  return HttpStatusCode.INTERNAL_SERVER_ERROR;
}
