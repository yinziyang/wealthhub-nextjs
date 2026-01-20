export interface ChartConfig {
  id: string;
  path: string;
  gradientStart: string;
  strokeColor: string;
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
}

export interface DistributionItem {
  id: string;
  label: string;
  percentage: number;
  color: string;
  offset: number;
}
