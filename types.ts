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

// ============================================================
// 美元购汇记录类型定义
// ============================================================

// 数据库记录类型（与数据库字段一一对应）
export interface UsdPurchaseRecord {
  id: string;
  user_id: string;
  purchase_date: string;           // ISO 8601 格式的时间戳
  usd_amount: number;              // 美元金额
  exchange_rate: number;           // 购汇汇率
  purchase_channel: string;        // 购汇渠道（必填）
  total_rmb_amount: number;        // 折合人民币总额（自动计算）
  created_at: string;
  updated_at: string;
}

// 创建记录的请求参数（不包含自动计算字段）
export interface CreateUsdPurchaseRequest {
  purchase_date: string;
  usd_amount: number;
  exchange_rate: number;
  purchase_channel: string;        // 购汇渠道（必填）
}

// 更新记录的请求参数（所有字段可选）
export interface UpdateUsdPurchaseRequest {
  purchase_date?: string;
  usd_amount?: number;
  exchange_rate?: number;
  purchase_channel?: string;       // 购汇渠道（可选）
}

// ============================================================
// 人民币存款记录类型定义
// ============================================================

// 数据库记录类型（与数据库字段一一对应）
export interface RmbDepositRecord {
  id: string;
  user_id: string;
  deposit_date: string;           // ISO 8601 格式的时间戳
  bank_name: string;              // 存款银行名称
  amount: number;                 // 存款金额
  created_at: string;
  updated_at: string;
}

// 创建记录的请求参数
export interface CreateRmbDepositRequest {
  deposit_date: string;
  bank_name: string;
  amount: number;
}

// 更新记录的请求参数（所有字段可选）
export interface UpdateRmbDepositRequest {
  deposit_date?: string;
  bank_name?: string;
  amount?: number;
}

// ============================================================
// 债权资产记录类型定义
// ============================================================

// 数据库记录类型（与数据库字段一一对应）
export interface DebtRecord {
  id: string;
  user_id: string;
  loan_date: string;              // ISO 8601 格式的时间戳
  debtor_name: string;            // 借款人姓名
  amount: number;                 // 借款额度
  created_at: string;
  updated_at: string;
}

// 创建记录的请求参数
export interface CreateDebtRecordRequest {
  loan_date: string;
  debtor_name: string;
  amount: number;
}

// 更新记录的请求参数（所有字段可选）
export interface UpdateDebtRecordRequest {
  loan_date?: string;
  debtor_name?: string;
  amount?: number;
}

// 折线图数据项
export interface RmbDepositChartItem {
  date: string;        // YYYYMMDD 格式，北京时间
  bank_name: string;   // 银行名称（合并时用逗号分隔）
  amount: number;      // 当日存款金额
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
  // 购买/存款/债权记录（根据 type 字段区分类型，详情页内部独立获取）
  purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[] | DebtRecord[];
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

// ============================================================
// 资产组合聚合类型定义
// ============================================================

export interface PortfolioRpcResult {
  record_type: 'gold-purchases' | 'usd-purchases' | 'rmb-deposits' | 'debt-records';
  record_id: string;
  record_data: GoldPurchaseRecord | UsdPurchaseRecord | RmbDepositRecord | DebtRecord;
}

export interface PortfolioAllResponse {
  'gold-purchases': Record<string, GoldPurchaseRecord>;
  'debt-records': Record<string, DebtRecord>;
  'usd-purchases': Record<string, UsdPurchaseRecord>;
  'rmb-deposits': Record<string, RmbDepositRecord>;
}
