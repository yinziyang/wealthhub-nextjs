import { getUsdToCnyRate } from './lib/exchange-rate.ts';
import { getCaibaiGoldPrice } from './lib/gold-price.ts';

console.log('=== 测试获取汇率 ===');
try {
  const rate = await getUsdToCnyRate();
  console.log('汇率:', rate);
} catch (error) {
  console.error('获取汇率失败:', error.message);
}

console.log('\n=== 测试获取金价 ===');
try {
  const gold = await getCaibaiGoldPrice();
  console.log('金价:', gold);
} catch (error) {
  console.error('获取金价失败:', error.message);
}
