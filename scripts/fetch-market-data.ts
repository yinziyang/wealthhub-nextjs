import dotenv from 'dotenv';
import path from 'path';
import { fetchAndSaveMarketData } from '@/lib/api/market-data';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const startTime = Date.now();
  console.log('=== 市场数据抓取开始 ===');
  console.log(`执行时间: ${new Date().toISOString()}\n`);

  try {
    console.log('开始获取数据...');

    const data = await fetchAndSaveMarketData();

    console.log('\n[金价数据]');
    console.log(`  价格: ${data.goldPrice.toFixed(2)} 元/克`);
    console.log(`  更新时间: ${data.goldUpdatedAt}`);
    console.log(`  hour_key: ${data.hourKey}`);

    console.log('\n[汇率数据]');
    console.log(`  USD/CNY: ${data.exchangeRate.toFixed(4)}`);
    console.log(`  更新时间: ${data.exchangeUpdatedAt}`);
    console.log(`  hour_key: ${data.hourKey}`);

    console.log('\n✅ 数据库写入成功');
    console.log(`  date_key: ${data.dateKey}`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️  执行耗时: ${duration.toFixed(2)} 秒`);
    console.log('=== 市场数据抓取完成 ===\n');

  } catch (error) {
    console.error('\n❌ 错误:', error);
    process.exit(1);
  }
}

main();
