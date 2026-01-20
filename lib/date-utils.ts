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
