# 黄金买入记录管理系统 - 开发实施计划

## 文档信息

- **项目名称**: WealthHub Next.js
- **功能模块**: 黄金买入记录管理
- **文档版本**: v1.0
- **创建日期**: 2026-01-22
- **预估工作量**: 4-6 小时

---

## 目录

1. [开发概述](#一开发概述)
2. [Phase 1: 数据库配置](#二phase-1-数据库配置supabase-平台操作)
3. [Phase 2: 后端 API 开发](#三phase-2-后端-api-开发)
4. [Phase 3: 前端改造](#四phase-3-前端改造)
5. [Phase 4: 乐观更新优化](#五phase-4-乐观更新优化)
6. [Phase 5: 测试验证](#六phase-5-测试验证)
7. [附录](#七附录)

---

## 一、开发概述

### 1.1 功能目标

将黄金买入记录从本地测试数据迁移到 Supabase 数据库，实现：
- 多用户数据隔离
- 数据持久化存储
- CRUD 操作（创建、读取、删除）

### 1.2 技术架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端组件       │────▶│   Next.js API   │────▶│   Supabase      │
│   (React)       │◀────│   Routes        │◀────│   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   认证检查       │
                        │   (checkApiAuth)│
                        └─────────────────┘
```

### 1.3 文件改动清单

| 文件路径 | 操作类型 | 说明 |
|---------|---------|------|
| `types.ts` | 修改 | 更新 GoldPurchaseRecord 接口 |
| `lib/supabase.ts` | 修改 | 添加数据库行类型定义 |
| `lib/api/gold-purchases.ts` | 新建 | API 调用封装 |
| `app/api/gold-purchases/route.ts` | 新建 | GET/POST 接口 |
| `app/api/gold-purchases/[id]/route.ts` | 新建 | DELETE 接口 |
| `components/GoldPurchaseRecords.tsx` | 修改 | 对接真实 API + 乐观更新 |

### 1.4 技术决策说明

本次开发采纳了以下技术建议：

| 技术点 | 决策 | 说明 |
|--------|------|------|
| 触发器安全模式 | `security invoker` | 函数以调用者身份执行，遵循最小权限原则 |
| DELETE 操作确认 | 返回被删除记录 | 使用 `.select().single()` 确认删除成功 |
| 前端 API 封装 | 统一封装 | 创建 `lib/api/gold-purchases.ts` 统一管理 |
| 乐观更新 | 实现 | 提升用户体验，操作即时响应 |

---

## 二、Phase 1: 数据库配置（Supabase 平台操作）

### 2.1 登录 Supabase Dashboard

1. 打开浏览器，访问 https://supabase.com/dashboard
2. 使用你的账号登录
3. 在项目列表中，点击 **WealthHub** 项目（或你的项目名称）

### 2.2 打开 SQL Editor

1. 在左侧导航栏，找到 **SQL Editor**（SQL 编辑器图标）
2. 点击进入 SQL Editor 页面
3. 点击右上角 **+ New query** 按钮，创建新的查询窗口

### 2.3 执行建表 SQL

将以下 SQL 完整复制到查询窗口中：

```sql
-- ============================================================
-- 黄金买入记录表 - 完整建表脚本
-- 执行时间: 约 1 秒
-- ============================================================

-- 1. 确保 UUID 扩展已启用
create extension if not exists "uuid-ossp";

-- 2. 创建黄金买入记录表
create table public.gold_purchase_records (
  -- 主键
  id uuid not null default gen_random_uuid() primary key,

  -- 外键：关联用户
  user_id uuid not null references auth.users(id) on delete cascade,

  -- 用户输入字段
  purchase_date timestamptz not null,                      -- 买入日期时间（精确到秒）
  weight numeric(12, 4) not null,                          -- 买入克重（最多 12 位整数，4 位小数）
  gold_price_per_gram numeric(10, 2) not null,             -- 买入金价（元/克）
  handling_fee_per_gram numeric(10, 2) not null,           -- 买入手续费（元/克）
  purchase_channel VARCHAR(100) NOT NULL DEFAULT '未填写'; -- 购买渠道（用户自定义）

  -- 自动计算字段（由触发器填充）
  total_price numeric(15, 2),                      -- 总价 = 克重 × (金价 + 手续费)
  average_price_per_gram numeric(10, 2),           -- 平均克价 = 金价 + 手续费

  -- 时间戳
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- 约束检查
  constraint chk_weight_positive check (weight > 0),
  constraint chk_gold_price_non_negative check (gold_price_per_gram >= 0),
  constraint chk_handling_fee_non_negative check (handling_fee_per_gram >= 0)
);

-- 3. 添加表注释
comment on table public.gold_purchase_records is '黄金买入记录表';
comment on column public.gold_purchase_records.id is '记录唯一标识';
comment on column public.gold_purchase_records.user_id is '所属用户ID';
comment on column public.gold_purchase_records.purchase_date is '买入日期时间';
comment on column public.gold_purchase_records.weight is '买入克重';
comment on column public.gold_purchase_records.gold_price_per_gram is '买入金价（元/克）';
comment on column public.gold_purchase_records.handling_fee_per_gram is '手续费（元/克）';
comment on column public.gold_purchase_records.total_price is '总价（自动计算）';
comment on column public.gold_purchase_records.average_price_per_gram is '平均克价（自动计算）';
comment on column public.gold_purchase_records.purchase_channel is '购买渠道';

-- 4. 创建索引（优化查询性能）
create index idx_gold_purchase_records_user_id
  on public.gold_purchase_records(user_id);

create index idx_gold_purchase_records_purchase_date
  on public.gold_purchase_records(purchase_date desc);

create index idx_gold_purchase_records_user_date
  on public.gold_purchase_records(user_id, purchase_date desc);

-- 5. 启用行级安全策略（RLS）
alter table public.gold_purchase_records enable row level security;

-- 6. 创建 RLS 策略（用户只能操作自己的数据）
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

-- 7. 创建自动计算触发器函数
-- 注意：使用 security invoker，函数以调用者身份执行，遵循最小权限原则
create or replace function public.calculate_gold_purchase_totals()
returns trigger as $$
begin
  -- 计算平均克价 = 金价 + 手续费
  new.average_price_per_gram := new.gold_price_per_gram + new.handling_fee_per_gram;

  -- 计算总价 = 克重 × 平均克价
  new.total_price := new.weight * new.average_price_per_gram;

  return new;
end;
$$ language plpgsql security invoker;

comment on function public.calculate_gold_purchase_totals() is '自动计算黄金买入记录的总价和平均克价';

-- 8. 创建触发器（在插入和更新时自动计算）
create trigger trg_gold_purchase_calculate
  before insert or update on public.gold_purchase_records
  for each row execute function public.calculate_gold_purchase_totals();

-- 9. 创建更新时间戳触发器函数
-- 注意：使用 security invoker
create or replace function public.update_gold_purchase_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security invoker;

comment on function public.update_gold_purchase_updated_at() is '自动更新 updated_at 时间戳';

-- 10. 创建更新时间戳触发器
create trigger trg_gold_purchase_updated_at
  before update on public.gold_purchase_records
  for each row execute function public.update_gold_purchase_updated_at();

-- ============================================================
-- 执行完成后，请在 Table Editor 中验证表是否创建成功
-- ============================================================
```

### 2.4 执行 SQL

1. 确保 SQL 已完整粘贴到查询窗口
2. 点击右下角 **Run** 按钮（或按 `Ctrl/Cmd + Enter`）
3. 等待执行完成，应该看到 `Success. No rows returned` 提示

### 2.5 验证表创建成功

1. 在左侧导航栏，点击 **Table Editor**
2. 在表列表中，应该能看到 `gold_purchase_records` 表
3. 点击该表，验证字段是否正确：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户外键 |
| purchase_date | timestamptz | 买入日期 |
| weight | numeric | 克重 |
| gold_price_per_gram | numeric | 金价 |
| handling_fee_per_gram | numeric | 手续费 |
| total_price | numeric | 总价（自动） |
| average_price_per_gram | numeric | 平均克价（自动） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |
| purchase_channel | varchar | 购买渠道 |

### 2.6 验证 RLS 策略

1. 在左侧导航栏，点击 **Authentication** → **Policies**
2. 找到 `gold_purchase_records` 表
3. 确认有 4 条策略：
   - 用户可以查看自己的黄金买入记录 (SELECT)
   - 用户可以插入自己的黄金买入记录 (INSERT)
   - 用户可以更新自己的黄金买入记录 (UPDATE)
   - 用户可以删除自己的黄金买入记录 (DELETE)

### 2.7 测试触发器（可选）

在 SQL Editor 中执行测试插入：

```sql
-- 测试触发器自动计算
-- 注意：需要替换为真实的 user_id

-- 查看是否有测试用户
select id, email from auth.users limit 5;

-- 使用上面查到的用户 ID 进行测试（替换 'YOUR_USER_ID'）
insert into public.gold_purchase_records (
  user_id,
  purchase_date,
  weight,
  gold_price_per_gram,
  handling_fee_per_gram
) values (
  'YOUR_USER_ID'::uuid,  -- 替换为真实用户 ID
  '2026-01-19T14:30:00Z',
  250,
  1043.60,
  15.00
);

-- 验证计算结果
-- 预期：total_price = 264650.00, average_price_per_gram = 1058.60
select
  weight,
  gold_price_per_gram,
  handling_fee_per_gram,
  average_price_per_gram,
  total_price
from public.gold_purchase_records
order by created_at desc
limit 1;

-- 清理测试数据（可选）
-- delete from public.gold_purchase_records where purchase_date = '2026-01-19T14:30:00Z';
```

---

## 三、Phase 2: 后端 API 开发

### 3.1 更新类型定义

#### 文件: `types.ts`

找到 `GoldPurchaseRecord` 接口，替换为以下内容：

```typescript
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
}
```

### 3.2 更新 Supabase 类型定义

#### 文件: `lib/supabase.ts`

在文件中添加以下类型定义：

```typescript
// 黄金买入记录 - 数据库行类型
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

### 3.3 创建 API 调用封装

#### 文件: `lib/api/gold-purchases.ts`（新建）

创建目录和文件：

```bash
mkdir -p lib/api
touch lib/api/gold-purchases.ts
```

文件完整内容：

```typescript
/**
 * 黄金买入记录 API 调用封装
 *
 * 使用方法:
 * import { getGoldPurchases, createGoldPurchase, deleteGoldPurchase } from '@/lib/api/gold-purchases';
 *
 * 说明:
 * - 统一封装所有 API 调用，便于维护和类型安全
 * - 后端认证机制（checkApiAuth）保持不变
 * - 此文件仅为前端调用的便利层
 */

import { GoldPurchaseRecord, CreateGoldPurchaseRequest } from '@/types';

// API 响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 获取当前用户的所有黄金买入记录
 * @returns Promise<GoldPurchaseRecord[]>
 */
export async function getGoldPurchases(): Promise<GoldPurchaseRecord[]> {
  const response = await fetch('/api/gold-purchases');
  const result: ApiResponse<GoldPurchaseRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

/**
 * 创建黄金买入记录
 * @param data 创建参数
 * @returns Promise<GoldPurchaseRecord> 创建的记录（包含自动计算字段）
 */
export async function createGoldPurchase(
  data: CreateGoldPurchaseRequest
): Promise<GoldPurchaseRecord> {
  const response = await fetch('/api/gold-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<GoldPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

/**
 * 删除黄金买入记录
 * @param id 记录 ID
 * @returns Promise<void>
 */
export async function deleteGoldPurchase(id: string): Promise<void> {
  const response = await fetch(`/api/gold-purchases/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}
```

### 3.4 创建 GET/POST API 路由

#### 文件: `app/api/gold-purchases/route.ts`（新建）

创建目录和文件：

```bash
mkdir -p app/api/gold-purchases
touch app/api/gold-purchases/route.ts
```

文件完整内容：

```typescript
/**
 * 黄金买入记录 API
 *
 * GET  /api/gold-purchases     - 获取当前用户的所有记录
 * POST /api/gold-purchases     - 创建新记录
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode,
  HttpStatusCode
} from '@/lib/api-response';

/**
 * GET /api/gold-purchases
 * 获取当前用户的所有黄金买入记录，按买入日期倒序排列
 */
export async function GET(request: NextRequest) {
  // 1. 认证检查
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    // 2. 查询数据库
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('gold_purchase_records')
      .select('*')
      .order('purchase_date', { ascending: false });

    // 3. 错误处理
    if (error) {
      console.error('获取黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取黄金买入记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    // 4. 返回数据
    return successResponse(data || [], '获取黄金买入记录成功');
  } catch (err) {
    console.error('获取黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}

/**
 * POST /api/gold-purchases
 * 创建新的黄金买入记录
 */
export async function POST(request: NextRequest) {
  // 1. 认证检查
  const auth = await checkApiAuth(request);
  if (!auth.authorized || !auth.user) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    // 2. 解析请求体
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的 JSON 格式'
      );
    }

    const { purchase_date, weight, gold_price_per_gram, handling_fee_per_gram } = body;

    // 3. 必填字段验证
    if (!purchase_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_date'
      );
    }
    if (weight == null || typeof weight !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须是数字'
      );
    }
    if (gold_price_per_gram == null || typeof gold_price_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 必须是数字'
      );
    }
    if (handling_fee_per_gram == null || typeof handling_fee_per_gram !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 必须是数字'
      );
    }

    // 4. 数值范围验证
    if (weight <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'weight 必须大于 0'
      );
    }
    if (gold_price_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'gold_price_per_gram 不能为负数'
      );
    }
    if (handling_fee_per_gram < 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'handling_fee_per_gram 不能为负数'
      );
    }

    // 5. 日期格式验证
    const purchaseDate = new Date(purchase_date);
    if (isNaN(purchaseDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_date 格式无效，请使用 ISO 8601 格式'
      );
    }

    // 6. 插入数据库
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('gold_purchase_records')
      .insert({
        user_id: auth.user.id,
        purchase_date,
        weight,
        gold_price_per_gram,
        handling_fee_per_gram,
        // total_price 和 average_price_per_gram 由触发器自动计算
      })
      .select()
      .single();

    // 7. 错误处理
    if (error) {
      console.error('创建黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建黄金买入记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    // 8. 返回创建的记录
    return successResponse(data, '创建黄金买入记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### 3.5 创建 DELETE API 路由

#### 文件: `app/api/gold-purchases/[id]/route.ts`（新建）

创建目录和文件：

```bash
mkdir -p app/api/gold-purchases/[id]
touch app/api/gold-purchases/[id]/route.ts
```

文件完整内容：

```typescript
/**
 * 黄金买入记录 API - 单条记录操作
 *
 * DELETE /api/gold-purchases/[id] - 删除指定记录
 *
 * 技术说明：
 * - 使用 .select().single() 返回被删除的记录，确认删除是否成功
 * - 如果记录不存在或无权删除，返回明确的错误信息
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode
} from '@/lib/api-response';

/**
 * DELETE /api/gold-purchases/[id]
 * 删除指定的黄金买入记录（只能删除自己的记录）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. 认证检查
  const auth = await checkApiAuth(request);
  if (!auth.authorized || !auth.user) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    // 2. 获取路径参数（Next.js 16 中 params 是 Promise）
    const { id } = await params;

    // 3. 验证 ID 格式（UUID）
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的记录 ID 格式'
      );
    }

    // 4. 执行删除并返回被删除的记录
    //    技术要点：使用 .select().single() 确认删除是否成功
    //    如果记录不存在，会返回错误而不是静默成功
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('gold_purchase_records')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)  // RLS 会限制，这里双重保险
      .select()
      .single();

    // 5. 错误处理
    if (error) {
      // 如果没有找到记录（PGRST116 是 "no rows returned" 错误）
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCode.DATA_NOT_FOUND,
          '记录不存在或无权删除'
        );
      }

      console.error('删除黄金买入记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除黄金买入记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    // 6. 确认确实删除了记录
    if (!data) {
      return errorResponse(
        ErrorCode.DATA_NOT_FOUND,
        '记录不存在或无权删除'
      );
    }

    // 7. 返回成功响应
    return successResponse(null, '删除黄金买入记录成功');
  } catch (err) {
    console.error('删除黄金买入记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

---

## 四、Phase 3: 前端改造

### 4.1 改造 GoldPurchaseRecords 组件

#### 文件: `components/GoldPurchaseRecords.tsx`

完整替换为以下内容：

```typescript
'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Toast } from 'antd-mobile';
import { Asset, GoldPurchaseRecord } from '@/types';
import { formatNumber } from '@/utils';
import { getGoldPurchases, deleteGoldPurchase } from '@/lib/api/gold-purchases';
import { MarketDataHistoryResponse } from '@/lib/api-response';

interface GoldPurchaseRecordsProps {
  asset: Asset;
  currentGoldPrice: number;
  marketData?: MarketDataHistoryResponse | null;
}

// 带盈亏计算的记录类型
interface RecordWithProfit extends GoldPurchaseRecord {
  profitLoss: number;
  currentValue: number;
  purchaseCost: number;
}

const GoldPurchaseRecords: React.FC<GoldPurchaseRecordsProps> = ({
  asset,
  currentGoldPrice,
  marketData,
}) => {
  // ============================================================
  // 状态管理
  // ============================================================
  const [records, setRecords] = useState<GoldPurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // 数据获取
  // ============================================================
  useEffect(() => {
    async function fetchRecords() {
      try {
        setLoading(true);
        setError(null);
        const data = await getGoldPurchases();
        setRecords(data);
      } catch (err) {
        console.error('获取黄金买入记录失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  // ============================================================
  // 乐观删除
  // 说明：见 Phase 4 详细说明
  // ============================================================
  const handleDelete = useCallback(async (recordId: string) => {
    // 1. 保存当前状态用于回滚
    const previousRecords = [...records];

    // 2. 立即更新 UI（乐观更新）
    setRecords(prev => prev.filter(r => r.id !== recordId));

    try {
      // 3. 后台发送删除请求
      await deleteGoldPurchase(recordId);
      // 删除成功，无需额外操作
      Toast.show({ content: '删除成功', position: 'bottom' });
    } catch (err) {
      // 4. 失败时回滚状态
      setRecords(previousRecords);
      Toast.show({
        content: err instanceof Error ? err.message : '删除失败，请重试',
        position: 'bottom',
      });
    }
  }, [records]);

  // ============================================================
  // 计算盈亏
  // ============================================================
  const recordsWithProfit = useMemo<RecordWithProfit[]>(() => {
    return records.map(record => {
      // 当前市值 = 重量 × 当前金价
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

  // ============================================================
  // 工具函数
  // ============================================================
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // ============================================================
  // 渲染：加载状态
  // ============================================================
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  // ============================================================
  // 渲染：错误状态
  // ============================================================
  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  // ============================================================
  // 渲染：无数据状态
  // ============================================================
  if (recordsWithProfit.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          购买记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无购买记录
        </div>
      </div>
    );
  }

  // ============================================================
  // 渲染：记录列表
  // ============================================================
  return (
    <div className="space-y-3">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          购买记录
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {recordsWithProfit.length}笔交易
        </div>
      </div>

      {/* 记录列表 */}
      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {recordsWithProfit.map((record) => (
          <div
            key={record.id}
            className="rounded-xl bg-surface-darker border border-[rgba(167,125,47,0.12)] p-3 shadow-sm"
          >
            {/* 第一行：主要信息 */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatNumber(record.weight, 0)}
                  <span className="text-xs font-normal text-slate-500 ml-0.5">g</span>
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(record.purchase_date)}
                </span>
              </div>
              <div className={`text-sm font-bold ${
                record.profitLoss >= 0
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
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.gold_price_per_gram, 1)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">工费</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.handling_fee_per_gram, 0)}
                  </span>
                </div>
              </div>

              {/* 右侧：总成本构成 */}
              <div className="flex flex-col gap-1 items-end text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    ¥{formatNumber(record.weight * record.gold_price_per_gram, 0)}
                  </span>
                  <span className="opacity-70 text-[10px]">
                    + ¥{formatNumber(record.weight * record.handling_fee_per_gram, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="opacity-70">总成本</span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-500 text-sm">
                    ¥{formatNumber(record.total_price, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoldPurchaseRecords;
```

---

## 五、Phase 4: 乐观更新优化

### 5.1 什么是乐观更新？

**乐观更新**是一种前端优化策略，核心思想是：**先更新 UI，再发送请求**。

| 策略 | 流程 | 用户体验 |
|------|------|----------|
| 悲观更新（传统） | 操作 → 等待 API → 等待刷新 → UI 更新 | 明显卡顿感（400-1000ms） |
| 乐观更新 | 操作 → **立即 UI 更新** → 后台 API → 失败回滚 | 即时响应（<50ms） |

### 5.2 乐观更新的作用

1. **用户体验提升**：操作即时响应，无等待感
2. **感知性能提升**：实际 API 时间不变，但用户感觉"快了很多"
3. **界面流畅度**：避免频繁的 loading 状态闪烁

### 5.3 实现原理

```
用户点击删除
    │
    ├─── 1. 保存当前状态（用于回滚）
    │        const previousRecords = [...records];
    │
    ├─── 2. 立即更新 UI（乐观）
    │        setRecords(prev => prev.filter(r => r.id !== id));
    │        ↓
    │        用户看到记录消失（<50ms）
    │
    ├─── 3. 后台发送 DELETE 请求
    │        await deleteGoldPurchase(id);
    │
    ├─── 4a. 成功：什么都不做
    │
    └─── 4b. 失败：回滚状态 + 显示错误
             setRecords(previousRecords);
             Toast.show('删除失败');
```

### 5.4 代码实现详解

以下是 `handleDelete` 函数的完整实现：

```typescript
/**
 * 乐观删除黄金买入记录
 *
 * 工作流程：
 * 1. 保存当前状态用于失败时回滚
 * 2. 立即从本地状态中移除记录（用户立即看到效果）
 * 3. 异步发送 DELETE 请求到服务器
 * 4. 如果请求失败，恢复之前保存的状态
 *
 * 为什么使用乐观更新：
 * - 删除操作成功率高（99%+）
 * - 失败可以安全回滚
 * - 大幅提升用户体验
 */
const handleDelete = useCallback(async (recordId: string) => {
  // ==========================================
  // 步骤 1：保存当前状态
  // ==========================================
  // 创建 records 的浅拷贝，用于失败时恢复
  // 注意：使用展开运算符创建新数组，避免引用问题
  const previousRecords = [...records];

  // ==========================================
  // 步骤 2：立即更新 UI（乐观更新核心）
  // ==========================================
  // 过滤掉被删除的记录
  // 用户在这一刻就能看到记录消失，无需等待 API
  setRecords(prev => prev.filter(r => r.id !== recordId));

  try {
    // ==========================================
    // 步骤 3：发送 DELETE 请求
    // ==========================================
    // 这个请求在后台执行，用户无需等待
    await deleteGoldPurchase(recordId);

    // 请求成功，显示成功提示（可选）
    Toast.show({
      content: '删除成功',
      position: 'bottom',
    });

  } catch (err) {
    // ==========================================
    // 步骤 4：失败时回滚
    // ==========================================
    // 恢复之前保存的状态，记录重新出现
    setRecords(previousRecords);

    // 显示错误提示，让用户知道操作失败
    Toast.show({
      content: err instanceof Error ? err.message : '删除失败，请重试',
      position: 'bottom',
    });
  }
}, [records]); // 依赖 records，确保保存的是最新状态
```

### 5.5 适用场景分析

| 操作类型 | 是否适合乐观更新 | 原因 |
|----------|-----------------|------|
| **删除记录** | ✅ 非常适合 | 失败可回滚，无副作用 |
| **修改记录** | ✅ 适合 | 失败可回滚到原值 |
| **新增记录** | ⚠️ 部分适合 | 需要处理临时 ID，服务器返回真实 ID 后替换 |
| **支付/转账** | ❌ 不适合 | 金融操作不可逆，必须等待确认 |

### 5.6 新增记录的乐观更新（扩展）

如果后续需要支持新增记录的乐观更新，可以参考以下模式：

```typescript
const handleCreate = useCallback(async (data: CreateGoldPurchaseRequest) => {
  // 1. 生成临时 ID
  const tempId = `temp-${Date.now()}`;

  // 2. 创建临时记录（预估计算字段）
  const tempRecord: GoldPurchaseRecord = {
    id: tempId,
    user_id: 'temp',
    ...data,
    // 前端预计算（与数据库触发器逻辑一致）
    average_price_per_gram: data.gold_price_per_gram + data.handling_fee_per_gram,
    total_price: data.weight * (data.gold_price_per_gram + data.handling_fee_per_gram),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 3. 立即添加到列表
  setRecords(prev => [tempRecord, ...prev]);

  try {
    // 4. 发送创建请求
    const realRecord = await createGoldPurchase(data);

    // 5. 成功：用真实记录替换临时记录
    setRecords(prev =>
      prev.map(r => r.id === tempId ? realRecord : r)
    );

  } catch (err) {
    // 6. 失败：移除临时记录
    setRecords(prev => prev.filter(r => r.id !== tempId));
    Toast.show({ content: '创建失败', position: 'bottom' });
  }
}, []);
```

### 5.7 注意事项

1. **状态一致性**：确保 `previousRecords` 是在操作前保存的完整状态
2. **错误处理**：回滚后必须通知用户，否则用户不知道操作失败
3. **网络超时**：考虑添加超时处理，避免长时间等待
4. **重复操作**：考虑添加防抖，避免用户快速多次点击

---

## 六、Phase 5: 测试验证

### 6.1 启动开发服务器

```bash
cd /Users/yinlu/Desktop/wealthhub-nextjs
pnpm dev
```

等待服务器启动，访问 http://localhost:3000

### 6.2 API 测试（使用 debug 模式）

#### 6.2.1 测试 GET 接口

在终端执行：

```bash
# 获取所有记录
curl "http://localhost:3000/api/gold-purchases?debug=1"
```

预期响应：
```json
{
  "success": true,
  "data": [],
  "message": "获取黄金买入记录成功"
}
```

#### 6.2.2 测试 POST 接口

```bash
# 创建一条记录
curl -X POST "http://localhost:3000/api/gold-purchases?debug=1" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_date": "2026-01-19T14:30:00.000Z",
    "weight": 250,
    "gold_price_per_gram": 1043.60,
    "handling_fee_per_gram": 15.00
  }'
```

预期响应（注意 total_price 和 average_price_per_gram 是自动计算的）：
```json
{
  "success": true,
  "data": {
    "id": "xxx-xxx-xxx",
    "user_id": "xxx",
    "purchase_date": "2026-01-19T14:30:00+00:00",
    "weight": 250.0000,
    "gold_price_per_gram": 1043.60,
    "handling_fee_per_gram": 15.00,
    "total_price": 264650.00,
    "average_price_per_gram": 1058.60,
    "created_at": "...",
    "updated_at": "..."
  },
  "message": "创建黄金买入记录成功"
}
```

#### 6.2.3 测试 DELETE 接口

```bash
# 删除记录（替换为实际的 ID）
curl -X DELETE "http://localhost:3000/api/gold-purchases/YOUR_RECORD_ID?debug=1"
```

预期响应：
```json
{
  "success": true,
  "data": null,
  "message": "删除黄金买入记录成功"
}
```

### 6.3 验证边界情况

#### 6.3.1 缺少必填字段

```bash
curl -X POST "http://localhost:3000/api/gold-purchases?debug=1" \
  -H "Content-Type: application/json" \
  -d '{
    "weight": 250
  }'
```

预期：返回验证错误

#### 6.3.2 无效数值

```bash
curl -X POST "http://localhost:3000/api/gold-purchases?debug=1" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_date": "2026-01-19T14:30:00.000Z",
    "weight": -10,
    "gold_price_per_gram": 1043.60,
    "handling_fee_per_gram": 15.00
  }'
```

预期：返回 "weight 必须大于 0"

#### 6.3.3 删除不存在的记录

```bash
curl -X DELETE "http://localhost:3000/api/gold-purchases/00000000-0000-0000-0000-000000000000?debug=1"
```

预期：返回 "记录不存在或无权删除"

### 6.4 前端测试

1. **登录应用**
   - 访问 http://localhost:3000
   - 使用测试账号登录

2. **进入黄金详情页**
   - 点击黄金资产卡片
   - 进入黄金详情页面

3. **验证购买记录显示**
   - 应该显示从数据库获取的记录
   - 盈亏计算应该正确
   - 日期格式显示正确

4. **测试加载状态**
   - 刷新页面，应该能看到短暂的"加载中..."状态

5. **测试错误状态**
   - 断开网络后刷新，应该显示错误信息

### 6.5 乐观更新测试

1. **正常删除测试**
   - 点击删除按钮
   - 观察：记录应该**立即消失**（无 loading）
   - 等待 1-2 秒，应该看到"删除成功"提示

2. **网络失败回滚测试**
   - 打开浏览器开发者工具 → Network
   - 设置 Offline 模式（模拟断网）
   - 点击删除按钮
   - 观察：记录先消失，然后**重新出现**
   - 应该看到"删除失败"提示

3. **用户体验对比**
   - 乐观更新：点击后立即响应（<50ms）
   - 传统方式：点击后等待 loading（400-1000ms）

### 6.6 多用户数据隔离测试

1. 使用用户 A 登录，创建一条买入记录
2. 退出登录
3. 使用用户 B 登录
4. 验证用户 B 看不到用户 A 的记录

### 6.7 代码质量检查

```bash
# 类型检查
pnpm build

# 代码规范检查
pnpm lint
```

确保没有类型错误和 lint 警告。

---

## 七、附录

### 7.1 常见问题排查

#### Q1: 数据库连接失败

**症状**: API 返回 `SERVER_DATABASE_ERROR`

**检查项**:
1. 确认 `.env.local` 中的 Supabase 配置正确
2. 确认 Supabase 项目处于活跃状态
3. 检查 RLS 策略是否正确启用

#### Q2: 认证失败

**症状**: API 返回 `AUTH_UNAUTHORIZED`

**检查项**:
1. 开发时使用 `?debug=1` 参数
2. 生产时确认用户已登录
3. 检查 `checkApiAuth` 函数是否正常工作

#### Q3: 触发器不生效

**症状**: `total_price` 和 `average_price_per_gram` 为 null

**检查项**:
1. 在 Supabase SQL Editor 中执行：
   ```sql
   select tgname, tgenabled
   from pg_trigger
   where tgrelid = 'public.gold_purchase_records'::regclass;
   ```
2. 确认触发器状态为 'O'（enabled）

#### Q4: Next.js 16 params 类型错误

**症状**: TypeScript 报错 `params.id` 不存在

**解决**: 确保 DELETE 路由中的 params 类型为 `Promise<{ id: string }>`，并使用 `await` 解构

#### Q5: 乐观更新回滚不生效

**症状**: 删除失败后记录没有恢复

**检查项**:
1. 确认 `previousRecords` 是在 `setRecords` 之前保存的
2. 确认 `catch` 块中正确调用了 `setRecords(previousRecords)`
3. 检查 `useCallback` 的依赖数组是否包含 `records`

### 7.2 回滚方案

如果需要回滚数据库更改：

```sql
-- 删除表和相关对象
drop trigger if exists trg_gold_purchase_updated_at on public.gold_purchase_records;
drop trigger if exists trg_gold_purchase_calculate on public.gold_purchase_records;
drop function if exists public.update_gold_purchase_updated_at();
drop function if exists public.calculate_gold_purchase_totals();
drop table if exists public.gold_purchase_records;
```

### 7.3 开发完成检查清单

#### 数据库
- [ ] 数据库表创建成功
- [ ] RLS 策略配置正确（4 条策略）
- [ ] 触发器使用 `security invoker`
- [ ] 触发器正常工作（自动计算字段）

#### 后端 API
- [ ] GET API 返回正确数据
- [ ] POST API 创建记录成功
- [ ] DELETE API 使用 `.select().single()` 确认删除
- [ ] DELETE API 正确处理"记录不存在"情况

#### 前端
- [ ] API 调用已封装到 `lib/api/gold-purchases.ts`
- [ ] 组件正常显示记录列表
- [ ] 加载/错误状态正常
- [ ] 乐观删除功能正常
- [ ] 删除失败时正确回滚

#### 集成测试
- [ ] 多用户数据隔离正常
- [ ] `pnpm build` 无错误
- [ ] `pnpm lint` 无警告

---

## 文档结束

**创建时间**: 2026-01-22
**最后更新**: 2026-01-22
**作者**: Claude Code Assistant
