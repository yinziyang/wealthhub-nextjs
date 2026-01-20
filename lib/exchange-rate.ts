/**
 * 汇率服务模块
 * 提供实时汇率查询功能
 */

import { httpGet } from './http-client';
import { unixToBeijingTime } from './date-utils';

/** 汇率接口返回结构 */
interface ExchangeRateResponse {
  result: 'success' | 'error';
  base_code: string;
  /** UTC 时间戳（秒） */
  time_last_update_unix: number;
  rates: {
    CNY: number;
    [key: string]: number;
  };
}

/** 汇率信息 */
export interface ExchangeRateInfo {
  /** USD -> CNY 汇率 */
  rate: number;
  /** 更新时间（北京时间，格式：YYYY-MM-DD HH:mm:ss） */
  updateTime: string;
}

const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/USD';
const TIMEOUT_MS = 30_000;

/**
 * 获取美元兑换人民币（USD -> CNY）的实时汇率
 * 超时时间：30 秒
 * @returns 汇率信息（包含汇率和更新时间）
 */
export async function getUsdToCnyRate(): Promise<ExchangeRateInfo> {
  const data = await httpGet<ExchangeRateResponse>(EXCHANGE_RATE_API, {
    timeout: TIMEOUT_MS,
  });

  if (data.result !== 'success') {
    throw new Error('汇率接口返回失败状态');
  }

  const cnyRate = data.rates?.CNY;
  if (typeof cnyRate !== 'number') {
    throw new Error('返回结果中未找到 CNY 汇率');
  }

  const updateUnix = data.time_last_update_unix;
  if (typeof updateUnix !== 'number') {
    throw new Error('返回结果中未找到更新时间');
  }

  return {
    rate: cnyRate,
    updateTime: unixToBeijingTime(updateUnix),
  };
}
