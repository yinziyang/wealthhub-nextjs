/**
 * 公共 HTTP 客户端模块
 * 提供统一的 HTTP 请求封装，支持超时控制
 */

/** 默认超时时间：30 秒 */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** HTTP 请求配置 */
export interface HttpRequestOptions {
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 请求头 */
  headers?: Record<string, string>;
}

/** HTTP 错误类型 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** 超时错误类型 */
export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`请求超时（${timeoutMs / 1000} 秒）`);
    this.name = 'TimeoutError';
  }
}

/**
 * 发送 GET 请求
 * @param url 请求地址
 * @param options 请求配置
 * @returns 响应数据
 */
export async function httpGet<T>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<T> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(`请求失败，HTTP 状态码：${response.status}`, response.status);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw new TimeoutError(timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 发送 POST 请求
 * @param url 请求地址
 * @param body 请求体
 * @param options 请求配置
 * @returns 响应数据
 */
export async function httpPost<T, B = unknown>(
  url: string,
  body: B,
  options: HttpRequestOptions = {}
): Promise<T> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new HttpError(`请求失败，HTTP 状态码：${response.status}`, response.status);
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
      throw new TimeoutError(timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
