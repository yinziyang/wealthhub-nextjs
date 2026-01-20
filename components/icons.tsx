import { Wallet, DollarSign, LayoutGrid, Handshake, X, Bell, ChevronDown, Delete, Check, PieChart, TrendingUp, Plus, FileText, User } from 'lucide-react';

export const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  'account_balance_wallet': Wallet,
  'attach_money': DollarSign,
  'grid_view': LayoutGrid,
  'handshake': Handshake,
  'close': X,
  'notifications': Bell,
  'keyboard_arrow_down': ChevronDown,
  'backspace': Delete,
  'check': Check,
  'pie_chart': PieChart,
  'show_chart': TrendingUp,
  'add': Plus,
  'newspaper': FileText,
  'person': User,
};

export const getIcon = (iconName: string) => {
  return iconMap[iconName] || FileText;
};
