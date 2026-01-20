-- Supabase 数据库初始化脚本
-- 保存为 init-supabase.sql 并在 Supabase SQL Editor 中执行

-- 表 1：exchange_rates（汇率历史 - 按小时去重）
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rate NUMERIC(10, 4) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hour_key TEXT NOT NULL,  -- 格式: YYYYMMDDHH (例如: 2025012010)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hour_key)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated_at
  ON exchange_rates(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_hour_key
  ON exchange_rates(hour_key);

-- 表 2：gold_prices（金价历史 - 按小时去重）
CREATE TABLE IF NOT EXISTS gold_prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  price NUMERIC(10, 2) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  hour_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hour_key)
);

CREATE INDEX IF NOT EXISTS idx_gold_prices_updated_at
  ON gold_prices(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_gold_prices_hour_key
  ON gold_prices(hour_key);

-- 表 3：daily_market_data（每日最新数据 - 按天去重）
CREATE TABLE IF NOT EXISTS daily_market_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,  -- 日期 (YYYY-MM-DD)
  gold_price NUMERIC(10, 2) NOT NULL,
  gold_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  exchange_rate NUMERIC(10, 4) NOT NULL,
  exchange_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

CREATE INDEX IF NOT EXISTS idx_daily_market_data_date
  ON daily_market_data(date DESC);
