/**
 * 日期时间工具模块
 */

/**
 * 将 Unix 时间戳（秒）转换为指定时区的时间字符串
 * @param unixSeconds Unix 时间戳（秒）
 * @param offsetHours 时区偏移小时数（例如：8 表示 UTC+8）
 * @returns 格式化的时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function unixToTimeZoneTime(unixSeconds: number, offsetHours: number): string {
  const utcDate = new Date(unixSeconds * 1000);

  const targetTime = new Date(
    utcDate.getTime() + offsetHours * 60 * 60 * 1000
  );

  const year = targetTime.getUTCFullYear();
  const month = String(targetTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetTime.getUTCDate()).padStart(2, '0');
  const hours = String(targetTime.getUTCHours()).padStart(2, '0');
  const minutes = String(targetTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(targetTime.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/** 北京时区偏移（UTC+8） */
const BEIJING_OFFSET_HOURS = 8;

/**
 * 将 Unix 时间戳（秒）转换为北京时间字符串
 * @param unixSeconds Unix 时间戳（秒）
 * @returns 格式化的北京时间字符串 (YYYY-MM-DD HH:mm:ss)
 */
export function unixToBeijingTime(unixSeconds: number): string {
  return unixToTimeZoneTime(unixSeconds, BEIJING_OFFSET_HOURS);
}

/**
 * 将 Date 对象转换为 YYYYMMDD 格式的字符串
 * @param date 日期对象
 * @returns 格式化后的日期字符串，例如 '20260121'
 *
 * @example
 * formatDateYYYYMMDD(new Date(2026, 0, 21)) // '20260121'
 */
export function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 将 YYYY-MM-DD 格式的字符串转换为 YYYYMMDD 格式
 * @param dateStr 日期字符串，例如 '2026-01-21'
 * @returns 格式化后的日期字符串，例如 '20260121'
 * 
 * @example
 * formatDateYYYYMMDDFromString('2026-01-21') // '20260121'
 */
export function formatDateYYYYMMDDFromString(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[0]}${parts[1]}${parts[2]}`;
}

/**
 * 日期减法：返回减去 N 天后的新日期
 * @param date 原始日期
 * @param days 减去的天数
 * @returns 新的日期对象
 * 
 * @example
 * subDays(new Date(2026, 0, 21), 1) // 2026-01-20
 * subDays(new Date(2026, 0, 21), 7) // 2026-01-14
 */
export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

/**
 * 生成最近 N 天的日期数组（从今天往前）
 * @param days 天数
 * @returns 日期键数组，降序排列 [今天, 昨天, ..., N天前]
 *
 * @example
 * getDateRange(3) // ['20260121', '20260120', '20260119']
 */
export function getDateRange(days: number): string[] {
  const result: string[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    result.push(formatDateYYYYMMDD(date));
  }

  return result;
}

/**
 * 将 UTC 时间的 Date 对象转换为北京时间的 hour_key
 * 格式：YYYYMMDDHH，例如 '2025012010'
 * 与数据写入脚本中的 generateHourKey 逻辑保持一致
 *
 * @param date 日期对象（UTC 时间）
 * @returns 北京时间的小时键，例如 '2025012010'
 *
 * @example
 * toBeijingHourKey(new Date('2026-01-20T02:00:00Z')) // '2025012010' (UTC+8)
 */
export function toBeijingHourKey(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHour = date.getUTCHours();

  const beijingHour = (utcHour + 8) % 24;
  const dayOffset = Math.floor((utcHour + 8) / 24);

  const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay + dayOffset));
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');
  const hour = String(beijingHour).padStart(2, '0');

  return `${year}${month}${day}${hour}`;
}

/**
 * 生成最近 N 小时的 hour_key 数组（从当前小时往前）
 * @param hours 小时数
 * @returns hour_key 数组，降序排列 [当前小时, 上一小时, ..., N小时前]
 *
 * @example
 * getHourRange(3) // ['2026012010', '2026012009', '2026012008']
 */
export function getHourRange(hours: number): string[] {
  const result: string[] = [];
  const now = Date.now();

  for (let i = 0; i < hours; i++) {
    const date = new Date(now - i * 60 * 60 * 1000);
    result.push(toBeijingHourKey(date));
  }

  return result;
}
