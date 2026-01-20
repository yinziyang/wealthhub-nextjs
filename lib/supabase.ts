import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

export interface ExchangeRateRow {
  id: string;
  rate: number;
  updated_at: string;
  hour_key: string;
  created_at: string;
}

export interface GoldPriceRow {
  id: string;
  price: number;
  updated_at: string;
  hour_key: string;
  created_at: string;
}

export interface DailyMarketDataRow {
  id: string;
  date: string;
  gold_price: number;
  gold_updated_at: string;
  exchange_rate: number;
  exchange_updated_at: string;
  created_at: string;
  updated_at: string;
}

export async function saveExchangeRate(
  rate: number,
  updatedAt: string,
  hourKey: string
): Promise<{ action: 'inserted' | 'updated'; data: ExchangeRateRow }> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('exchange_rates')
    .upsert(
      {
        rate,
        updated_at: updatedAt,
        hour_key: hourKey,
      },
      { onConflict: 'hour_key' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save exchange rate: ${error.message}`);
  }

  return {
    action: 'updated',
    data: data as ExchangeRateRow,
  };
}

export async function saveGoldPrice(
  price: number,
  updatedAt: string,
  hourKey: string
): Promise<{ action: 'inserted' | 'updated'; data: GoldPriceRow }> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('gold_prices')
    .upsert(
      {
        price,
        updated_at: updatedAt,
        hour_key: hourKey,
      },
      { onConflict: 'hour_key' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save gold price: ${error.message}`);
  }

  return {
    action: 'updated',
    data: data as GoldPriceRow,
  };
}

export async function saveDailyMarketData({
  date,
  goldPrice,
  goldUpdatedAt,
  exchangeRate,
  exchangeUpdatedAt,
}: {
  date: string;
  goldPrice: number;
  goldUpdatedAt: string;
  exchangeRate: number;
  exchangeUpdatedAt: string;
}): Promise<{ action: 'inserted' | 'updated'; data: DailyMarketDataRow }> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('daily_market_data')
    .upsert(
      {
        date,
        gold_price: goldPrice,
        gold_updated_at: goldUpdatedAt,
        exchange_rate: exchangeRate,
        exchange_updated_at: exchangeUpdatedAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save daily market data: ${error.message}`);
  }

  return {
    action: 'updated',
    data: data as DailyMarketDataRow,
  };
}
