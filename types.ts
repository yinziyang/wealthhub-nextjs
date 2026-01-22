export interface ChartConfig {
  id: string;
  path: string;
  gradientStart: string;
  strokeColor: string;
}

export interface GoldPurchaseRecord {
  id: string;
  date: string; // 购买日期 YYYY-MM-DD
  weight: number; // 购买克重
  goldPrice: number; // 金价（元/克）
  handlingFee: number; // 手续费（元/克）
}

export interface Asset {
  id: string;
  type: 'rmb' | 'usd' | 'gold' | 'debt';
  title: string;
  subtitle: string;
  amount: number;
  displayAmount: string;
  subAmount: string;
  subAmountColor?: string;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  chart: ChartConfig;
  date?: string;
  // 黄金购买记录（仅当 type === 'gold' 时使用）
  purchaseRecords?: GoldPurchaseRecord[];
}

export interface DistributionItem {
  id: string;
  label: string;
  percentage: number;
  color: string;
  bgColor?: string;
  offset: number;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export type CurrentTab = 'assets' | 'profile';
