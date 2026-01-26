import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { getSupabaseClient } from '@/lib/supabase';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Type definition for the result.json content
interface MarketDataInput {
  [timestamp: string]: {
    gold_price: number;
    exchange_rate: number;
  };
}

// Reuse utility from fetch-market-data.ts
function beijingStringToUTC(beijingStr: string): string {
  const [datePart, timePart] = beijingStr.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  // Create date in UTC by subtracting 8 hours from the Beijing time components
  // Note: month is 0-indexed in Date.UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
  return utcDate.toISOString();
}

async function main() {
  const startTime = Date.now();
  console.log('=== 历史数据导入开始 ===');
  console.log(`执行时间: ${new Date().toISOString()}\n`);

  try {
    // 1. Read result.json
    const jsonPath = path.resolve(process.cwd(), 'scripts/result.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`找不到数据文件: ${jsonPath}`);
    }
    
    console.log(`正在读取文件: ${jsonPath}`);
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const marketData: MarketDataInput = JSON.parse(rawData);
    
    const entries = Object.entries(marketData);
    console.log(`共读取到 ${entries.length} 条数据记录\n`);

    // 2. Transform data
    const rowsToInsert = entries.map(([beijingTimeStr, data]) => {
      // Key is like "2020-01-01 00:00:00" (Beijing Time)
      
      // Extract date part for the 'date' column (Beijing date)
      const dateKey = beijingTimeStr.split(' ')[0]; // "2020-01-01"

      // Convert full string to UTC for timestamp columns
      const utcTime = beijingStringToUTC(beijingTimeStr);
      
      return {
        date: dateKey,
        gold_price: data.gold_price,
        gold_updated_at: utcTime,
        exchange_rate: data.exchange_rate,
        exchange_updated_at: utcTime,
        updated_at: new Date().toISOString() // Operation time
      };
    });

    // 3. Batch Insert
    const BATCH_SIZE = 50;
    const client = getSupabaseClient();
    let successCount = 0;
    let failCount = 0;

    console.log(`开始批量写入数据库 (每批 ${BATCH_SIZE} 条)...`);

    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(rowsToInsert.length / BATCH_SIZE);

      const { error } = await client
        .from('daily_market_data')
        .upsert(batch, { onConflict: 'date' });

      if (error) {
        console.error(`❌ 第 ${currentBatchNum}/${totalBatches} 批写入失败:`, error.message);
        failCount += batch.length;
      } else {
        process.stdout.write(`✅ 已处理 ${Math.min(i + BATCH_SIZE, rowsToInsert.length)} / ${rowsToInsert.length} 条\r`);
        successCount += batch.length;
      }
    }

    console.log('\n');
    console.log('=== 导入完成 ===');
    console.log(`成功: ${successCount} 条`);
    console.log(`失败: ${failCount} 条`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`⏱️  总耗时: ${duration.toFixed(2)} 秒\n`);

  } catch (error) {
    console.error('\n❌ 致命错误:', error);
    process.exit(1);
  }
}

main();
