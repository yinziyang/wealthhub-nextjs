# 黄金买入记录管理系统 - 技术方案

## 文档信息

- **项目名称**: WealthHub Next.js
- **功能模块**: 黄金买入记录管理
- **文档版本**: v1.0
- **创建日期**: 2026-01-22
- **技术栈**: Next.js 16 + Supabase + TypeScript

---

## 一、需求背景

### 1.1 当前状态

- 目前黄金买入记录使用虚假测试数据
- 数据存储在本地 localStorage（`private_client_assets`）
- 无法实现多用户数据隔离
- 缺乏数据持久化和同步机制

### 1.2 业务需求

1. **多用户支持**: 平台支持多个用户独立管理各自的黄金资产
2. **数据安全**: 用户只能访问和操作自己的黄金买入记录
3. **买入记录管理**:
   - 记录每次黄金买入的详细信息
   - 暂不涉及卖出功能
   - 支持历史记录查询和展示
4. **数据完整性**: 确保计算的准确性和一致性

### 1.3 功能范围

**包含**:
- ✅ 黄金买入记录的创建、查询、删除
- ✅ 买入日期（精确到秒）
- ✅ 买入克重、买入克价、买入手续费克价
- ✅ 自动计算总价和平均克价
- ✅ 行级数据安全（RLS）
- ✅ 历史记录按时间倒序展示

**不包含**:
- ❌ 黄金卖出功能
- ❌ 资产转让功能
- ❌ 数据导入导出
- ❌ 报表统计功能

---

## 二、数据库设计

### 2.1 用户表（已存在）

```sql
create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid not null references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.2 黄金买入记录表（新建）

#### 表结构定义

| 字段名 | 数据类型 | 说明 | 约束 | 计算逻辑 |
|--------|----------|------|------|----------|
| `id` | `uuid` | 主键 | PRIMARY KEY, NOT NULL | 自动生成 |
| `user_id` | `uuid` | 用户ID | NOT NULL, FOREIGN KEY | 关联 auth.users(id) |
| `purchase_date` | `timestamptz` | 买入日期时间 | NOT NULL | 用户输入，精确到秒 |
| `weight` | `numeric(12, 4)` | 买入克重 | NOT NULL, > 0 | 用户输入 |
| `gold_price_per_gram` | `numeric(10, 2)` | 金价（元/克） | NOT NULL, ≥ 0 | 用户输入 |
| `handling_fee_per_gram` | `numeric(10, 2)` | 手续费（元/克） | NOT NULL, ≥ 0 | 用户输入 |
| `total_price` | `numeric(15, 2)` | 总价（元） | 自动计算 | weight × (gold_price_per_gram + handling_fee_per_gram) |
| `average_price_per_gram` | `numeric(10, 2)` | 平均克价（元/克） | 自动计算 | gold_price_per_gram + handling_fee_per_gram |
| `created_at` | `timestamptz` | 创建时间 | DEFAULT NOW() | 自动生成 |
| `updated_at` | `timestamptz` | 更新时间 | DEFAULT NOW() | 自动更新 |

#### 完整建表 SQL

```sql
-- 扩展 UUID 生成函数（如果未启用）
create extension if not exists "uuid-ossp";

-- 创建黄金买入记录表
create table public.gold_purchase_records (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 输入字段
  purchase_date timestamptz not null,          -- 买入日期时间（精确到秒）
  weight numeric(12, 4) not null,              -- 买入克重（最多12位整数，4位小数）
  gold_price_per_gram numeric(10, 2) not null,  -- 买入金价（元/克）
  handling_fee_per_gram numeric(10, 2) not null, -- 买入手续费克价（元/克）

  -- 计算字段（由触发器自动计算）
  total_price numeric(15, 2),                  -- 总价 = 克重 * (金价 + 手续费)
  average_price_per_gram numeric(10, 2),        -- 平均克价 = 金价 + 手续费

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  check (weight > 0),
  check (gold_price_per_gram >= 0),
  check (handling_fee_per_gram >= 0)
);

-- 创建索引
create index idx_gold_purchase_records_user_id
  on public.gold_purchase_records(user_id);

create index idx_gold_purchase_records_purchase_date
  on public.gold_purchase_records(purchase_date desc);

create index idx_gold_purchase_records_user_date
  on public.gold_purchase_records(user_id, purchase_date desc);

-- 启用 RLS（行级安全策略）
alter table public.gold_purchase_records enable row level security;

-- 创建 RLS 策略
create policy "用户可以查看自己的黄金买入记录"
  on public.gold_purchase_records for select
  using (auth.uid() = user_id);

create policy "用户可以插入自己的黄金买入记录"
  on public.gold_purchase_records for insert
  with check (auth.uid() = user_id);

create policy "用户可以更新自己的黄金买入记录"
  on public.gold_purchase_records for update
  using (auth.uid() = user_id);

create policy "用户可以删除自己的黄金买入记录"
  on public.gold_purchase_records for delete
  using (auth.uid() = user_id);

-- 创建自动计算触发器函数
create function public.calculate_gold_purchase_totals()
returns trigger as $$
begin
  -- 计算平均克价 = 金价 + 手续费
  new.average_price_per_gram = new.gold_price_per_gram + new.handling_fee_per_gram;

  -- 计算总价 = 克重 * 平均克价
  new.total_price = new.weight * new.average_price_per_gram;

  return new;
end;
$$ language plpgsql security definer;

-- 创建触发器（在插入和更新时自动计算）
create trigger on_gold_purchase_record_change
  before insert or update on public.gold_purchase_records
  for each row execute function public.calculate_gold_purchase_totals();

-- 创建更新时间戳触发器
create function public.update_gold_purchase_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_gold_purchase_record_update
  before update on public.gold_purchase_records
  for each row execute function public.update_gold_purchase_updated_at();
```

#### 数据设计说明

1. **数据精度**:
   - `weight`: 使用 `numeric(12, 4)` 支持最大 9999999999.9999 克，4位小数满足高精度需求
   - `gold_price_per_gram`: 使用 `numeric(10, 2)` 支持最大 99999999.99 元/克
   - `handling_fee_per_gram`: 同上，与金价保持一致
   - `total_price`: 使用 `numeric(15, 2)` 支持最大 99999999999999.99 元，满足大额资产需求

2. **时区处理**:
   - 所有时间戳使用 `timestamptz` 类型，自动处理时区转换
   - API 返回时自动转换为 UTC 时间戳（ISO 8601 格式）

3. **自动计算逻辑**:
   - 使用 PostgreSQL 触发器在插入和更新时自动计算
   - **优点**:
     - 数据一致性由数据库保证，应用层错误不影响计算
     - 任意操作都能保持数据正确
     - 应用层代码更简洁，无需重复计算逻辑
   - **计算公式**:
     - `average_price_per_gram = gold_price_per_gram + handling_fee_per_gram`
     - `total_price = weight × average_price_per_gram`

4. **索引优化**:
   - `idx_gold_purchase_records_user_id`: 加速按用户查询
   - `idx_gold_purchase_records_purchase_date`: 加速按时间排序
   - `idx_gold_purchase_records_user_date`: 复合索引，优化常见查询场景

5. **数据安全**:
   - 启用 RLS（Row Level Security）
   - 所有策略都基于 `auth.uid()` 确保用户只能访问自己的数据
   - 外键级联删除：用户删除时，相关记录自动清理

---

## 三、API 接口设计

### 3.1 接口规范

所有接口遵循以下规范：
- **认证方式**: 使用 `checkApiAuth` 函数验证用户身份
- **响应格式**: 使用 `successResponse` 和 `errorResponse` 统一响应格式
- **权限控制**: RLS 策略在数据库层面控制数据访问

### 3.2 接口列表

#### 3.2.1 获取黄金买入记录列表

**接口**: `GET /api/gold-purchases`

**功能**: 获取当前用户的所有黄金买入记录，按买入日期倒序排列

**请求参数**: 无

**响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "purchase_date": "2026-01-19T14:30:00.000Z",
      "weight": 250.0000,
      "gold_price_per_gram": 1043.60,
      "handling_fee_per_gram": 15.00,
      "total_price": 264650.00,
      "average_price_per_gram": 1058.60,
      "created_at": "2026-01-19T14:30:00.000Z",
      "updated_at": "2026-01-19T14:30:00.000Z"
    }
  ],
  "message": "获取黄金买入记录成功"
}
```

**实现代码** (`app/api/gold-purchases/route.ts`):

```typescript
import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import { successResponse, errorResponse, ErrorCode } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gold_purchase_records')
    .select('*')
    .order('purchase_date', { ascending: false });

  if (error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '获取黄金买入记录失败',
      undefined,
      { supabaseError: error.message }
    );
  }

  return successResponse(data, '获取黄金买入记录成功');
}
```

---

#### 3.2.2 创建黄金买入记录

**接口**: `POST /api/gold-purchases`

**功能**: 创建新的黄金买入记录，数据库触发器自动计算总价和平均克价

**请求头**:
```
Content-Type: application/json
```

**请求体**:

```json
{
  "purchase_date": "2026-01-19T14:30:00.000Z",
  "weight": 250,
  "gold_price_per_gram": 1043.60,
  "handling_fee_per_gram": 15.00
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| `purchase_date` | string | ✅ | 买入日期时间（ISO 8601 格式） | `"2026-01-19T14:30:00.000Z"` |
| `weight` | number | ✅ | 买入克重（必须 > 0） | `250` |
| `gold_price_per_gram` | number | ✅ | 金价（元/克，必须 ≥ 0） | `1043.60` |
| `handling_fee_per_gram` | number | ✅ | 手续费（元/克，必须 ≥ 0） | `15.00` |

**验证规则**:
- `purchase_date`: 必须是有效的 ISO 8601 日期时间格式
- `weight`: 必须 > 0
- `gold_price_per_gram`: 必须 ≥ 0
- `handling_fee_per_gram`: 必须 ≥ 0

**响应示例**:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "purchase_date": "2026-01-19T14:30:00.000Z",
    "weight": 250.0000,
    "gold_price_per_gram": 1043.60,
    "handling_fee_per_gram": 15.00,
    "total_price": 264650.00,
    "average_price_per_gram": 1058.60,
    "created_at": "2026-01-19T14:30:00.000Z",
    "updated_at": "2026-01-19T14:30:00.000Z"
  },
  "message": "创建黄金买入记录成功"
}
```

**实现代码** (`app/api/gold-purchases/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized || !auth.user) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  const body = await request.json();
  const { purchase_date, weight, gold_price_per_gram, handling_fee_per_gram } = body;

  // 基础验证
  if (!purchase_date || !weight || !gold_price_per_gram || handling_fee_per_gram === undefined) {
    return errorResponse(
      ErrorCode.DATA_VALIDATION_FAILED,
      '缺少必填字段'
    );
  }

  if (weight <= 0 || gold_price_per_gram < 0 || handling_fee_per_gram < 0) {
    return errorResponse(
      ErrorCode.DATA_VALIDATION_FAILED,
      '数值必须为正数'
    );
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('gold_purchase_records')
    .insert({
      user_id: auth.user.id,
      purchase_date,
      weight,
      gold_price_per_gram,
      handling_fee_per_gram,
    })
    .select()
    .single();

  if (error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '创建黄金买入记录失败',
      undefined,
      { supabaseError: error.message }
    );
  }

  return successResponse(data, '创建黄金买入记录成功', HttpStatusCode.CREATED);
}
```

---

#### 3.2.3 删除黄金买入记录

**接口**: `DELETE /api/gold-purchases/[id]`

**功能**: 删除指定的黄金买入记录，只能删除自己的记录

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 记录的 UUID |

**响应示例**:

```json
{
  "success": true,
  "data": null,
  "message": "删除黄金买入记录成功"
}
```

**实现代码** (`app/api/gold-purchases/[id]/route.ts`):

```typescript
import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import { successResponse, errorResponse, ErrorCode, HttpStatusCode } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized || !auth.user) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('gold_purchase_records')
    .delete()
    .eq('id', params.id)
    .eq('user_id', auth.user.id); // 确保只能删除自己的记录

  if (error) {
    return errorResponse(
      ErrorCode.SERVER_DATABASE_ERROR,
      '删除黄金买入记录失败',
      undefined,
      { supabaseError: error.message }
    );
  }

  return successResponse(null, '删除黄金买入记录成功', HttpStatusCode.NO_CONTENT);
}
```

---

### 3.3 错误码说明

所有接口遵循统一的错误码规范（定义在 `lib/api-response.ts`）:

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|-------------|
| `AUTH_UNAUTHORIZED` | 未授权访问 | 401 |
| `DATA_VALIDATION_FAILED` | 数据验证失败 | 422 |
| `SERVER_DATABASE_ERROR` | 数据库错误 | 500 |

---

## 四、前端开发

### 4.1 类型定义更新

#### 文件: `types.ts`

更新 `GoldPurchaseRecord` 接口以匹配数据库结构：

```typescript
export interface GoldPurchaseRecord {
  id: string;
  user_id: string;
  purchase_date: string;      // ISO 8601 格式的时间戳
  weight: number;              // 克重
  gold_price_per_gram: number; // 金价（元/克）
  handling_fee_per_gram: number; // 手续费（元/克）
  total_price: number;         // 总价（自动计算）
  average_price_per_gram: number; // 平均克价（自动计算）
  created_at: string;
  updated_at: string;
}
```

#### 文件: `lib/supabase.ts`

添加数据库行类型：

```typescript
export interface GoldPurchaseRecordRow {
  id: string;
  user_id: string;
  purchase_date: string;
  weight: number;
  gold_price_per_gram: number;
  handling_fee_per_gram: number;
  total_price: number;
  average_price_per_gram: number;
  created_at: string;
  updated_at: string;
}
```

---

### 4.2 组件改造

#### 文件: `components/GoldPurchaseRecords.tsx`

**主要改动**:
1. 移除测试数据逻辑（第 26-67 行）
2. 添加 API 数据获取逻辑
3. 适配新的字段名称（snake_case 转 camelCase）
4. 添加数据加载状态和错误处理

**改造后的核心逻辑**:

```typescript
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';

interface GoldPurchaseRecordsProps {
  asset: Asset;
  currentGoldPrice: number;
}

interface ApiGoldPurchaseRecord {
  id: string;
  purchase_date: string;
  weight: number;
  gold_price_per_gram: number;
  handling_fee_per_gram: number;
  total_price: number;
  average_price_per_gram: number;
}

const GoldPurchaseRecords: React.FC<GoldPurchaseRecordsProps> = ({
  asset,
  currentGoldPrice,
}) => {
  const [records, setRecords] = useState<ApiGoldPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从 API 获取数据
  useEffect(() => {
    async function fetchRecords() {
      try {
        const response = await fetch('/api/gold-purchases');
        const result = await response.json();

        if (result.success) {
          setRecords(result.data);
        } else {
          setError(result.error?.message || '获取数据失败');
        }
      } catch (err) {
        console.error('获取黄金买入记录失败:', err);
        setError('网络请求失败');
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  // 计算每条记录的盈利/亏损
  const recordsWithProfit = useMemo(() => {
    return records.map(record => {
      // 当前市值 = 重量 * 当前金价
      const currentValue = record.weight * currentGoldPrice;
      // 盈利/亏损 = 当前市值 - 购买成本
      const profitLoss = currentValue - record.total_price;

      return {
        ...record,
        profitLoss,
        currentValue,
        purchaseCost: record.total_price,
      };
    });
  }, [records, currentGoldPrice]);

  // 按日期降序排列（API 已排序，此处保持一致性）
  const sortedRecords = useMemo(() => {
    return [...recordsWithProfit].sort((a, b) => {
      return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime();
    });
  }, [recordsWithProfit]);

  // 加载状态
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-slate-500">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-red-500">{error}</div>
      </div>
    );
  }

  // 无数据状态
  if (sortedRecords.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          购买记录
        </div>
        <div className="text-xs text-slate-500 font-normal">
          {sortedRecords.length}笔交易
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {sortedRecords.map((record) => {
          // 格式化日期（只显示日期部分）
          const dateStr = new Date(record.purchase_date).toISOString().split('T')[0];

          return (
            <div
              key={record.id}
              className="rounded-xl bg-surface-darker border border-[rgba(167,125,47,0.12)] p-3 shadow-sm"
            >
              {/* 第一行：主要信息 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {formatNumber(record.weight, 0)}<span className="text-xs font-normal text-slate-500 ml-0.5">g</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {dateStr}
                  </span>
                </div>
                <div className={`text-sm font-bold ${record.profitLoss >= 0
                  ? 'text-emerald-500'
                  : 'text-red-500'
                  }`}>
                  {record.profitLoss >= 0 ? '+' : ''}¥{formatNumber(record.profitLoss, 0)}
                </div>
              </div>

              {/* 第二行：详细数据 */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
                {/* 左侧：单价信息 */}
                <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">金价</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(record.gold_price_per_gram, 1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="opacity-70">工费</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(record.handling_fee_per_gram, 0)}</span>
                  </div>
                </div>

                {/* 右侧：总成本构成 */}
                <div className="flex flex-col gap-1 items-end text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-slate-700 dark:text-slate-300">¥{formatNumber(record.weight * record.gold_price_per_gram, 0)}</span>
                    <span className="opacity-70 text-[10px]">+ ¥{formatNumber(record.weight * record.handling_fee_per_gram, 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="opacity-70">总成本</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-500 text-sm">¥{formatNumber(record.total_price, 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GoldPurchaseRecords;
```

---

### 4.3 字段映射说明

| 旧字段名（测试数据） | 新字段名（数据库） | 说明 |
|---------------------|-------------------|------|
| `date` | `purchase_date` | 买入日期时间，精确到秒 |
| `weight` | `weight` | 克重，字段名不变 |
| `goldPrice` | `gold_price_per_gram` | 金价（元/克） |
| `handlingFee` | `handling_fee_per_gram` | 手续费（元/克） |
| 无 | `total_price` | 总价（自动计算） |
| 无 | `average_price_per_gram` | 平均克价（自动计算） |

---

## 五、数据流图

### 5.1 创建买入记录流程

```
用户输入数据
    ↓
前端验证（weight > 0, gold_price ≥ 0, handling_fee ≥ 0）
    ↓
POST /api/gold-purchases
    ↓
API 认证（checkApiAuth）
    ↓
插入数据库（只包含基础字段）
    ↓
数据库触发器自动计算
    ├─ average_price_per_gram = gold_price_per_gram + handling_fee_per_gram
    └─ total_price = weight × average_price_per_gram
    ↓
返回完整记录（包含计算字段）
```

### 5.2 查询买入记录流程

```
前端请求 GET /api/gold-purchases
    ↓
API 认证（checkApiAuth）
    ↓
查询数据库（RLS 策略：只返回当前用户的记录）
    ↓
按 purchase_date DESC 排序
    ↓
返回记录列表
    ↓
前端计算盈利/亏损
    ├─ current_value = weight × current_gold_price
    └─ profit_loss = current_value - total_price
    ↓
渲染 UI
```

---

## 六、安全性设计

### 6.1 认证与授权

1. **API 认证**:
   - 使用 `checkApiAuth` 函数验证用户身份
   - 支持两种模式：正常用户认证 + Debug 模式（`debug=1` 参数）

2. **行级安全策略（RLS）**:
   - 所有查询、插入、更新、删除操作都受 RLS 限制
   - 策略基于 `auth.uid()` 确保用户只能访问自己的数据
   - 即便前端传递恶意参数，也无法访问其他用户数据

3. **级联删除**:
   - 用户删除时，`on delete cascade` 自动清理相关记录

### 6.2 数据验证

1. **前端验证**:
   - 必填字段检查
   - 数值范围验证（weight > 0, price ≥ 0）

2. **数据库约束**:
   ```sql
   check (weight > 0),
   check (gold_price_per_gram >= 0),
   check (handling_fee_per_gram >= 0)
   ```

3. **API 层验证**:
   - 在插入前进行二次验证
   - 防止绕过前端直接调用 API

---

## 七、测试方案

### 7.1 数据库测试

1. **建表测试**:
   - 在 Supabase SQL Editor 中执行建表脚本
   - 验证表结构、索引、RLS 策略是否创建成功

2. **触发器测试**:
   ```sql
   -- 测试自动计算功能
   insert into public.gold_purchase_records (
     user_id,
     purchase_date,
     weight,
     gold_price_per_gram,
     handling_fee_per_gram
   ) values (
     'test-user-id',
     '2026-01-19T14:30:00Z',
     250,
     1043.60,
     15.00
   );

   -- 验证 total_price = 250 × (1043.60 + 15.00) = 264650.00
   -- 验证 average_price_per_gram = 1043.60 + 15.00 = 1058.60
   ```

3. **RLS 策略测试**:
   - 使用不同用户账号测试数据隔离
   - 验证用户 A 无法访问用户 B 的记录

### 7.2 API 测试

1. **GET 请求测试**:
   ```bash
   curl "http://localhost:3000/api/gold-purchases?debug=1"
   ```

2. **POST 请求测试**:
   ```bash
   curl -X POST "http://localhost:3000/api/gold-purchases?debug=1" \
     -H "Content-Type: application/json" \
     -d '{
       "purchase_date": "2026-01-19T14:30:00.000Z",
       "weight": 250,
       "gold_price_per_gram": 1043.60,
       "handling_fee_per_gram": 15.00
     }'
   ```

3. **DELETE 请求测试**:
   ```bash
   curl -X DELETE "http://localhost:3000/api/gold-purchases/{id}?debug=1"
   ```

4. **错误场景测试**:
   - 未授权访问（去掉 `debug=1` 参数）
   - 必填字段缺失
   - 数值为负数
   - 删除不存在的记录

### 7.3 前端测试

1. **数据展示测试**:
   - 验证记录按日期倒序排列
   - 验证盈利/亏损计算正确
   - 验证金额格式化正确

2. **边界情况测试**:
   - 无记录时是否正常显示
   - API 请求失败时错误提示
   - 加载状态显示

3. **暗黑模式测试**:
   - 验证颜色在暗黑模式下的显示效果

---

## 八、部署步骤

### 8.1 数据库初始化

1. 登录 Supabase Dashboard
2. 打开 SQL Editor
3. 执行"二、数据库设计"中的完整建表 SQL
4. 验证表创建成功（检查 Tables 列表）

### 8.2 代码开发

按照以下顺序实施：

1. **更新类型定义**:
   - 修改 `types.ts` 中的 `GoldPurchaseRecord` 接口
   - 在 `lib/supabase.ts` 中添加 `GoldPurchaseRecordRow` 类型

2. **开发 API 路由**:
   - 创建 `app/api/gold-purchases/route.ts`（GET 和 POST）
   - 创建 `app/api/gold-purchases/[id]/route.ts`（DELETE）

3. **改造前端组件**:
   - 修改 `components/GoldPurchaseRecords.tsx`
   - 移除测试数据，对接真实 API

4. **测试验证**:
   - 运行 `pnpm dev` 启动开发服务器
   - 使用 `debug=1` 参数测试 API
   - 验证前端数据展示
   - 测试 RLS 策略（使用多个用户账号）

### 8.3 代码质量检查

开发完成后执行：

```bash
# 类型检查
pnpm build

# 代码检查
pnpm lint
```

---

## 九、后续扩展点

### 9.1 功能扩展

1. **卖出功能**:
   - 新增 `sale_date`、`sale_price_per_gram` 等字段
   - 计算实际盈亏

2. **分页查询**:
   - 支持大量记录的分页展示
   - 添加 `page` 和 `pageSize` 参数

3. **筛选和搜索**:
   - 按日期范围筛选
   - 按金价范围筛选

4. **批量导入**:
   - 支持 Excel/CSV 批量导入历史记录

### 9.2 性能优化

1. **缓存策略**:
   - 使用 React Query 管理数据缓存
   - 优化 API 请求频率

2. **数据库优化**:
   - 根据查询模式调整索引
   - 考虑数据分区（按用户或时间）

---

## 十、风险与注意事项

### 10.1 技术风险

1. **触发器错误**:
   - 触发器逻辑错误可能导致插入失败
   - **应对**: 充分测试触发器逻辑，保留备份

2. **数据精度问题**:
   - `numeric` 类型计算精度可能与预期不符
   - **应对**: 使用测试数据验证计算结果

3. **时区问题**:
   - `timestamptz` 在不同时区下可能有差异
   - **应对**: 统一使用 UTC 存储，前端展示时转换

### 10.2 业务风险

1. **数据迁移**:
   - 现有 localStorage 数据需要手动迁移
   - **应对**: 提供数据导入工具或一次性迁移脚本

2. **并发冲突**:
   - 多个请求同时操作可能导致数据不一致
   - **应对**: 当前场景下并发风险较低，暂不考虑乐观锁

### 10.3 安全风险

1. **权限绕过**:
   - RLS 策略配置错误可能导致数据泄露
   - **应对**: 充分测试多用户场景，验证数据隔离

2. **注入攻击**:
   - SQL 注入风险（Supabase SDK 已防护）
   - **应对**: 始终使用参数化查询，避免拼接 SQL

---

## 十一、附录

### 11.1 相关文件清单

| 文件路径 | 说明 | 改动类型 |
|---------|------|----------|
| `types.ts` | TypeScript 类型定义 | 修改 |
| `lib/supabase.ts` | Supabase 类型定义 | 修改 |
| `app/api/gold-purchases/route.ts` | API 路由（GET、POST） | 新建 |
| `app/api/gold-purchases/[id]/route.ts` | API 路由（DELETE） | 新建 |
| `components/GoldPurchaseRecords.tsx` | 黄金买入记录组件 | 修改 |

### 11.2 参考资料

1. **Supabase 文档**:
   - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
   - [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)

2. **Next.js 文档**:
   - [API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

3. **项目规范**:
   - `AGENTS.md` - 开发规范和流程

---

## 十二、审查要点

为确保方案完整可靠，请重点审查以下内容：

### 12.1 数据库设计

- [ ] 表结构是否满足业务需求
- [ ] 数据类型和精度是否合理
- [ ] 索引是否优化查询性能
- [ ] RLS 策略是否正确配置
- [ ] 触发器逻辑是否准确
- [ ] 级联删除是否合理

### 12.2 API 设计

- [ ] 接口设计是否符合 RESTful 规范
- [ ] 认证和授权是否完善
- [ ] 错误处理是否统一
- [ ] 响应格式是否一致
- [ ] 验证逻辑是否充分

### 12.3 前端开发

- [ ] 字段映射是否正确
- [ ] 错误处理是否完善
- [ ] 加载状态是否友好
- [ ] 暗黑模式是否支持
- [ ] 性能是否优化

### 12.4 安全性

- [ ] 认证机制是否可靠
- [ ] 数据隔离是否有效
- [ ] 输入验证是否充分
- [ ] 错误信息是否安全

### 12.5 测试方案

- [ ] 测试用例是否全面
- [ ] 边界情况是否覆盖
- [ ] 安全测试是否充分

---

**文档结束**
