export interface ChartConfig {
  id: string;
  path: string;
  gradientStart: string;
  strokeColor: string;
}

// ============================================================
// 黄金买入记录类型定义
// ============================================================

// 数据库记录类型（与数据库字段一一对应）
export interface GoldPurchaseRecord {
  id: string;
  user_id: string;
  purchase_date: string;           // ISO 8601 格式的时间戳
  weight: number;                   // 克重
  gold_price_per_gram: number;      // 金价（元/克）
  handling_fee_per_gram: number;    // 手续费（元/克）
  purchase_channel: string;         // 购买渠道（必填）
  total_price: number;              // 总价（自动计算）
  average_price_per_gram: number;   // 平均克价（自动计算）
  created_at: string;
  updated_at: string;
}

// 创建记录的请求参数（不包含自动计算字段）
export interface CreateGoldPurchaseRequest {
  purchase_date: string;
  weight: number;
  gold_price_per_gram: number;
  handling_fee_per_gram: number;
  purchase_channel: string;         // 购买渠道（必填）
}

// 更新记录的请求参数（所有字段可选）
export interface UpdateGoldPurchaseRequest {
  purchase_date?: string;
  weight?: number;
  gold_price_per_gram?: number;
  handling_fee_per_gram?: number;
  purchase_channel?: string;        // 购买渠道（可选）
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
