import dotenv from 'dotenv';
import path from 'path';
import { getCaibaiGoldPrice } from '@/lib/gold-price';
import { getUsdToCnyRate } from '@/lib/exchange-rate';
import {
  saveExchangeRate,
  saveGoldPrice,
  saveDailyMarketData,
} from '@/lib/supabase';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function beijingStringToUTC(beijingStr: string): string {
  const [datePart, timePart] = beijingStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  return utcDate.toISOString();
}

function generateHourKey(date: Date): string {
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

function generateDateKey(date: Date): string {
  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth();
  const utcDay = date.getUTCDate();
  const utcHour = date.getUTCHours();

  const dayOffset = Math.floor((utcHour + 8) / 24);

  const beijingDate = new Date(Date.UTC(utcYear, utcMonth, utcDay + dayOffset));
  const year = beijingDate.getUTCFullYear();
  const month = String(beijingDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function main() {
  const startTime = Date.now();
  console.log('=== 市场数据抓取开始 ===');
  console.log(`执行时间: ${new Date().toISOString()}\n`);

  try {
    const now = new Date();
    const hourKey = generateHourKey(now);
    const dateKey = generateDateKey(now);

    console.log('开始获取数据...');

    const [goldData, exchangeData] = await Promise.all([
      getCaibaiGoldPrice(),
      getUsdToCnyRate(),
    ]);

    console.log('\n[金价数据]');
    console.log(`  价格: ${goldData.price.toFixed(2)} 元/克`);
    console.log(`  更新时间: ${goldData.updateTime}`);
    console.log(`  hour_key: ${hourKey}`);

    console.log('\n[汇率数据]');
    console.log(`  USD/CNY: ${exchangeData.rate.toFixed(4)}`);
    console.log(`  更新时间: ${exchangeData.updateTime}`);
    console.log(`  hour_key: ${hourKey}`);

    console.log('\n正在写入数据库...');

    const goldUpdatedAtUTC = beijingStringToUTC(goldData.updateTime);
    const exchangeUpdatedAtUTC = beijingStringToUTC(exchangeData.updateTime);

    const [
      exchangeResult,
      goldResult,
      dailyResult,
    ] = await Promise.all([
      saveExchangeRate(exchangeData.rate, exchangeUpdatedAtUTC, hourKey),
      saveGoldPrice(goldData.price, goldUpdatedAtUTC, hourKey),
      saveDailyMarketData({
        date: dateKey,
        goldPrice: goldData.price,
        goldUpdatedAt: goldUpdatedAtUTC,
        exchangeRate: exchangeData.rate,
        exchangeUpdatedAt: exchangeUpdatedAtUTC,
      }),
    ]);

    console.log('\n✅ 数据库写入成功');
    console.log(`  汇率表: ${exchangeResult.action}`);
    console.log(`  金价表: ${goldResult.action}`);
    console.log(`  每日汇总表: ${dailyResult.action}`);
    console.log(`  date_key: ${dateKey}`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️  执行耗时: ${duration.toFixed(2)} 秒`);
    console.log('=== 市场数据抓取完成 ===\n');

  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

main();
