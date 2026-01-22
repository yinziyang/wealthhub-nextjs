import { Asset } from './types';

let idCounter = 0;

export function generateId(): string {
  return `${Date.now()}-${++idCounter}`;
}

export function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  if (!isFinite(n)) return n.toString();
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (!decPart) return formattedInt;
  const trimmedDec = decPart.replace(/0+$/, "");
  return trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;
}

const CHART_PATHS = [
  'M0 80 Q 25 70, 40 85 T 70 60 T 100 75 L 100 100 L 0 100 Z',
  'M0 70 Q 20 85, 40 65 T 70 80 T 100 55 L 100 100 L 0 100 Z',
  'M0 90 Q 30 60, 50 80 T 80 50 T 100 40 L 100 100 L 0 100 Z',
];

export function createAssetObject(
  type: 'rmb' | 'usd' | 'gold' | 'debt',
  name: string,
  rawValue: number,
  isIncrease: boolean,
  details: {
    usdAmount?: number;
    weight?: number;
    exchangeRate?: number;
    goldPrice?: number;
    handlingFee?: number;
  },
  date?: string,
  id?: string
): Asset {
  const uniqueId = id || generateId();
  const finalAmount = isIncrease ? rawValue : -rawValue;
  
  let icon = '';
  let iconBgColor = '';
  let iconColor = '';
  let chartColor = '';
  let subAmount = '';
  let subAmountColor = '';
  const title = name;
  let subtitle = '';

  const chartPath = CHART_PATHS[Math.floor(Math.random() * CHART_PATHS.length)];

  switch (type) {
    case 'rmb':
      icon = 'account_balance_wallet';
      iconBgColor = 'bg-primary/10';
      iconColor = 'text-primary';
      chartColor = '#a77d2f';
      subtitle = isIncrease ? '存入记录' : '支出记录';
      subAmount = 'CNY';
      subAmountColor = 'text-slate-500';
      break;
    case 'usd':
      icon = 'attach_money';
      iconBgColor = 'bg-blue-500/10';
      iconColor = 'text-blue-500';
      chartColor = '#3b82f6';
      subtitle = `$ ${formatNumber(details.usdAmount || 0)} USD`;
      subAmount = `汇率 ${details.exchangeRate}`;
      subAmountColor = 'text-blue-500';
      break;
    case 'gold':
      icon = 'grid_view';
      iconBgColor = 'bg-yellow-500/10';
      iconColor = 'text-yellow-600 dark:text-yellow-500';
      chartColor = '#eab308';
      subtitle = `重量 ${formatNumber(details.weight || 0)}g`;
      subAmount = `¥${details.goldPrice} /g`;
      subAmountColor = 'text-emerald-500';
      break;
    case 'debt':
      icon = 'handshake';
      iconBgColor = 'bg-indigo-500/10';
      iconColor = 'text-indigo-500';
      chartColor = '#6366f1';
      subtitle = isIncrease ? '借出款项' : '收回款项';
      subAmount = isIncrease ? '待收回' : '已结清';
      subAmountColor = 'text-slate-500';
      break;
  }

  return {
    id: uniqueId,
    type,
    title,
    subtitle,
    amount: finalAmount,
    displayAmount: `¥ ${formatNumber(finalAmount)}`,
    subAmount,
    subAmountColor,
    icon,
    iconBgColor,
    iconColor,
    chart: {
      id: `grad-${uniqueId}`,
      path: type === 'debt' ? '' : chartPath,
      gradientStart: chartColor,
      strokeColor: chartColor,
    },
    date
  };
}

export function getLatestValue(history: Record<string, number>): number {
  const entries = Object.entries(history);
  if (entries.length === 0) return 0;
  
  const sorted = entries.sort(([a], [b]) => {
    const dateA = parseInt(a);
    const dateB = parseInt(b);
    return dateB - dateA;
  });
  
  return sorted[0][1] || 0;
}

export function generateChartPath(history: Record<string, number>): string {
  const entries = Object.entries(history);
  if (entries.length < 2) {
    return CHART_PATHS[Math.floor(Math.random() * CHART_PATHS.length)];
  }
  
  const sorted = entries.sort(([a], [b]) => {
    const dateA = parseInt(a);
    const dateB = parseInt(b);
    return dateA - dateB;
  });
  
  const values = sorted.map(([, value]) => value).filter(v => v > 0);
  
  if (values.length === 0) {
    return CHART_PATHS[Math.floor(Math.random() * CHART_PATHS.length)];
  }
  
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  
  const heightRange = 80;
  const bottomPadding = 10;
  
  const getY = (value: number): number => {
    if (minVal === maxVal) return 50;
    const normalized = (value - minVal) / (maxVal - minVal);
    return bottomPadding + heightRange - (normalized * heightRange);
  };
  
  const points: [number, number][] = [];
  
  sorted.forEach(([, value], index) => {
    const x = (index / (sorted.length - 1)) * 100;
    const y = getY(value);
    points.push([x, y]);
  });
  
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M${x},${y} L${x},${y} L100 100 L0 100 Z`;
  }
  
  let path = `M${points[0][0]},${points[0][1]}`;
  
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    path += ` L${x},${y}`;
  }
  
  path += ` L100 100 L0 100 Z`;
  
  return path;
}
