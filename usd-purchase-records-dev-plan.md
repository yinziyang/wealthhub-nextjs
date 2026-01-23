# 美元资产管理系统 - 开发实施计划

## 文档信息

- **项目名称**: WealthHub Next.js
- **功能模块**: 美元购汇/持有记录管理
- **文档版本**: v1.1
- **创建日期**: 2026-01-23
- **最后更新**: 2026-01-23（补充类型兼容性说明）
- **参考实现**: 黄金买入记录管理 (`gold-purchase-records-dev-plan.md`)

---

## 目录

1. [需求分析与差异说明](#一需求分析与差异说明)
   - [1.4 类型兼容性说明（重要）](#14-类型兼容性说明重要)
2. [Phase 1: 数据库配置](#二phase-1-数据库配置supabase-平台操作)
3. [Phase 2: 后端 API 开发](#三phase-2-后端-api-开发)
4. [Phase 3: 前端改造](#四phase-3-前端改造)
5. [Phase 4: 测试验证](#五phase-4-测试验证)
6. [附录](#六附录)

---

## 一、需求分析与差异说明

### 1.1 功能目标

将美元购汇记录持久化存储到 Supabase 数据库，实现：
- 多用户数据隔离
- 数据持久化存储
- CRUD 操作（创建、读取、更新、删除）
- 美元详情页展示（含汇率走势图和购汇记录）

### 1.2 黄金 vs 美元 功能对比

| 功能点 | 黄金资产 | 美元资产 |
|--------|----------|----------|
| 主要数量字段 | `weight` (克重) | `usd_amount` (美元金额) |
| 价格/汇率字段 | `gold_price_per_gram` (金价/克) | `exchange_rate` (汇率) |
| 手续费 | `handling_fee_per_gram` ✅ | 无 ❌ |
| 平均价格 | `average_price_per_gram` ✅ | 无 ❌ |
| 总价计算公式 | 克重 × (金价 + 手续费) | 美元金额 × 汇率 |
| 渠道字段 | `purchase_channel` | `purchase_channel` |
| 盈亏计算 | (当前金价 - 平均买入价) × 克重 | (当前汇率 - 买入汇率) × 美元金额 |

### 1.3 实际实现与计划文档差异说明

通过分析黄金功能的实际代码实现，发现与原计划文档存在以下差异，本次美元开发将采用**实际代码实现的模式**：

| 差异点 | 原计划文档 | 实际实现 | 本次采用 |
|--------|-----------|----------|----------|
| PATCH 接口 | 未规划 | 已实现（支持部分更新） | ✅ 实现 |
| `purchase_channel` | 有默认值 | **必填字段**，需严格验证 | ✅ 必填 |
| Debug 模式 | 未详细说明 | 支持 `?debug=1&user_id=xxx` | ✅ 支持 |
| 乐观更新 | 删除时实现 | **未实现**（仅展示功能） | 📋 后续迭代 |
| 删除按钮 | 有 | **无**（记录列表只读） | 📋 后续迭代 |

### 1.4 类型兼容性说明（重要）

#### 问题背景

当前 `types.ts` 中的 `Asset` 接口定义了 `purchaseRecords` 字段：

```typescript
export interface Asset {
  // ... 其他字段
  // 黄金购买记录（仅当 type === 'gold' 时使用）
  purchaseRecords?: GoldPurchaseRecord[];
}
```

#### 现状分析

经代码审查确认：
- **该字段实际未被使用** - `GoldDetailPage` 和 `GoldPurchaseRecords` 都是通过 API **独立获取数据**
- 本次美元实现采用相同模式：`UsdPurchaseRecords` 内部调用 `getUsdPurchases()` 获取数据
- 因此不会产生编译错误

#### 建议处理

为了**类型定义的准确性和未来扩展性**，在 Phase 2 修改 `types.ts` 时，同时更新 `Asset` 接口：

```typescript
export interface Asset {
  // ... 其他字段
  // 购买记录（根据 type 字段区分类型，详情页内部独立获取，此字段预留扩展）
  purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[];
}
```

> **说明**：当前架构中，详情页组件（`GoldDetailPage`、`UsdDetailPage`）内部通过子组件独立调用 API 获取购买记录，不依赖 `Asset.purchaseRecords` 字段。此字段更新为联合类型是为了保持类型定义的完整性，便于未来可能的列表页预加载等场景。

### 1.5 技术架构

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

### 1.6 文件改动清单

| 文件路径 | 操作类型 | 说明 |
|---------|---------|------|
| `types.ts` | 修改 | 添加 UsdPurchaseRecord 相关接口 + 更新 Asset.purchaseRecords 为联合类型 |
| `lib/api/usd-purchases.ts` | **新建** | API 调用封装 |
| `app/api/usd-purchases/route.ts` | **新建** | GET/POST 接口 |
| `app/api/usd-purchases/[id]/route.ts` | **新建** | PATCH/DELETE 接口 |
| `components/UsdDetailPage.tsx` | **新建** | 美元详情页（参考 GoldDetailPage） |
| `components/UsdPurchaseRecords.tsx` | **新建** | 美元购汇记录列表组件 |
| `components/UsdExchangeRateChart.tsx` | **新建** | 汇率走势图（可复用 GoldPriceChart 逻辑） |
| `components/AddAssetModal.tsx` | 修改 | 美元类型保存时调用 API |
| `app/page.tsx` | 修改 | 添加美元资产点击跳转逻辑 |

---

## 二、Phase 1: 数据库配置（Supabase 平台操作）

### 2.1 登录 Supabase Dashboard

1. 打开浏览器，访问 https://supabase.com/dashboard
2. 使用你的账号登录
3. 在项目列表中，点击 **WealthHub** 项目

### 2.2 打开 SQL Editor

1. 在左侧导航栏，找到 **SQL Editor**
2. 点击进入 SQL Editor 页面
3. 点击右上角 **+ New query** 按钮

### 2.3 执行建表 SQL

将以下 SQL 完整复制到查询窗口中执行：

```sql
-- ============================================================
-- 美元购汇记录表 - 完整建表脚本
-- 执行时间: 约 1 秒
-- ============================================================

-- 1. 确保 UUID 扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建美元购汇记录表
CREATE TABLE public.usd_purchase_records (
  -- 主键
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 外键：关联用户
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 用户输入字段
  purchase_date TIMESTAMPTZ NOT NULL,                      -- 购汇日期时间
  usd_amount NUMERIC(15, 2) NOT NULL,                      -- 美元金额
  exchange_rate NUMERIC(10, 4) NOT NULL,                   -- 购汇汇率
  purchase_channel VARCHAR(100) NOT NULL,                  -- 购汇渠道（用户自定义，如：招商银行、工商银行等）

  -- 自动计算字段（由触发器填充）
  total_rmb_amount NUMERIC(15, 2),                         -- 折合人民币总额 = 美元金额 × 汇率

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 约束检查
  CONSTRAINT chk_usd_amount_positive CHECK (usd_amount > 0),
  CONSTRAINT chk_exchange_rate_positive CHECK (exchange_rate > 0)
);

-- 3. 添加表注释
COMMENT ON TABLE public.usd_purchase_records IS '美元购汇记录表';
COMMENT ON COLUMN public.usd_purchase_records.id IS '记录唯一标识';
COMMENT ON COLUMN public.usd_purchase_records.user_id IS '所属用户ID';
COMMENT ON COLUMN public.usd_purchase_records.purchase_date IS '购汇日期时间';
COMMENT ON COLUMN public.usd_purchase_records.usd_amount IS '美元金额';
COMMENT ON COLUMN public.usd_purchase_records.exchange_rate IS '购汇汇率';
COMMENT ON COLUMN public.usd_purchase_records.purchase_channel IS '购汇渠道';
COMMENT ON COLUMN public.usd_purchase_records.total_rmb_amount IS '折合人民币总额（自动计算）';

-- 4. 创建索引（优化查询性能）
CREATE INDEX idx_usd_purchase_records_user_id
  ON public.usd_purchase_records(user_id);

CREATE INDEX idx_usd_purchase_records_purchase_date
  ON public.usd_purchase_records(purchase_date DESC);

CREATE INDEX idx_usd_purchase_records_user_date
  ON public.usd_purchase_records(user_id, purchase_date DESC);

-- 5. 启用行级安全策略（RLS）
ALTER TABLE public.usd_purchase_records ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略（用户只能操作自己的数据）
CREATE POLICY "用户可以查看自己的美元购汇记录"
  ON public.usd_purchase_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的美元购汇记录"
  ON public.usd_purchase_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的美元购汇记录"
  ON public.usd_purchase_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的美元购汇记录"
  ON public.usd_purchase_records FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 创建自动计算触发器函数
-- 注意：使用 SECURITY INVOKER，函数以调用者身份执行，遵循最小权限原则
CREATE OR REPLACE FUNCTION public.calculate_usd_purchase_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- 计算折合人民币总额 = 美元金额 × 汇率
  NEW.total_rmb_amount := NEW.usd_amount * NEW.exchange_rate;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.calculate_usd_purchase_totals() IS '自动计算美元购汇记录的人民币总额';

-- 8. 创建触发器（在插入和更新时自动计算）
CREATE TRIGGER trg_usd_purchase_calculate
  BEFORE INSERT OR UPDATE ON public.usd_purchase_records
  FOR EACH ROW EXECUTE FUNCTION public.calculate_usd_purchase_totals();

-- 9. 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_usd_purchase_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.update_usd_purchase_updated_at() IS '自动更新 updated_at 时间戳';

-- 10. 创建更新时间戳触发器
CREATE TRIGGER trg_usd_purchase_updated_at
  BEFORE UPDATE ON public.usd_purchase_records
  FOR EACH ROW EXECUTE FUNCTION public.update_usd_purchase_updated_at();

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
2. 在表列表中，应该能看到 `usd_purchase_records` 表
3. 点击该表，验证字段是否正确：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户外键 |
| purchase_date | timestamptz | 购汇日期 |
| usd_amount | numeric(15,2) | 美元金额 |
| exchange_rate | numeric(10,4) | 汇率 |
| purchase_channel | varchar(100) | 购汇渠道 |
| total_rmb_amount | numeric(15,2) | 人民币总额（自动） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 2.6 验证 RLS 策略

1. 在左侧导航栏，点击 **Authentication** → **Policies**
2. 找到 `usd_purchase_records` 表
3. 确认有 4 条策略：
   - 用户可以查看自己的美元购汇记录 (SELECT)
   - 用户可以插入自己的美元购汇记录 (INSERT)
   - 用户可以更新自己的美元购汇记录 (UPDATE)
   - 用户可以删除自己的美元购汇记录 (DELETE)

### 2.7 测试触发器（可选）

```sql
-- 测试触发器自动计算
-- 注意：需要替换为真实的 user_id

-- 查看是否有测试用户
SELECT id, email FROM auth.users LIMIT 5;

-- 使用上面查到的用户 ID 进行测试（替换 'YOUR_USER_ID'）
INSERT INTO public.usd_purchase_records (
  user_id,
  purchase_date,
  usd_amount,
  exchange_rate,
  purchase_channel
) VALUES (
  'YOUR_USER_ID'::uuid,  -- 替换为真实用户 ID
  '2026-01-19T14:30:00Z',
  10000,
  7.24,
  '招商银行'
);

-- 验证计算结果
-- 预期：total_rmb_amount = 72400.00
SELECT
  usd_amount,
  exchange_rate,
  total_rmb_amount
FROM public.usd_purchase_records
ORDER BY created_at DESC
LIMIT 1;

-- 清理测试数据（可选）
-- DELETE FROM public.usd_purchase_records WHERE purchase_date = '2026-01-19T14:30:00Z';
```

---

## 三、Phase 2: 后端 API 开发

### 3.1 更新类型定义

#### 文件: `types.ts`

在文件中添加以下类型定义（在 `GoldPurchaseRecord` 相关定义之后）：

```typescript
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
```

同时，**更新 `Asset` 接口**的 `purchaseRecords` 字段为联合类型（见 1.4 节说明）：

```typescript
export interface Asset {
  // ... 其他字段保持不变

  // 购买记录（根据 type 字段区分类型，详情页内部独立获取，此字段预留扩展）
  purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[];
}
```

### 3.2 创建 API 调用封装

#### 文件: `lib/api/usd-purchases.ts`（新建）

```typescript
/**
 * 美元购汇记录 API 调用封装
 *
 * 使用方法:
 * import { getUsdPurchases, createUsdPurchase, deleteUsdPurchase, updateUsdPurchase } from '@/lib/api/usd-purchases';
 */

import { UsdPurchaseRecord, CreateUsdPurchaseRequest, UpdateUsdPurchaseRequest } from '@/types';

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
 * 获取当前用户的所有美元购汇记录
 */
export async function getUsdPurchases(): Promise<UsdPurchaseRecord[]> {
  const response = await fetch('/api/usd-purchases');
  const result: ApiResponse<UsdPurchaseRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

/**
 * 创建美元购汇记录
 */
export async function createUsdPurchase(
  data: CreateUsdPurchaseRequest
): Promise<UsdPurchaseRecord> {
  const response = await fetch('/api/usd-purchases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<UsdPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

/**
 * 删除美元购汇记录
 */
export async function deleteUsdPurchase(id: string): Promise<void> {
  const response = await fetch(`/api/usd-purchases/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

/**
 * 更新美元购汇记录
 */
export async function updateUsdPurchase(
  id: string,
  data: UpdateUsdPurchaseRequest
): Promise<UsdPurchaseRecord> {
  const response = await fetch(`/api/usd-purchases/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<UsdPurchaseRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}
```

### 3.3 创建 GET/POST API 路由

#### 文件: `app/api/usd-purchases/route.ts`（新建）

```typescript
/**
 * 美元购汇记录 API
 *
 * GET  /api/usd-purchases     - 获取当前用户的所有记录
 * POST /api/usd-purchases     - 创建新记录
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

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('usd_purchase_records')
      .select('*')
      .order('purchase_date', { ascending: false });

    if (error) {
      console.error('获取美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取美元购汇记录成功');
  } catch (err) {
    console.error('获取美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的 JSON 格式'
      );
    }

    const { purchase_date, usd_amount, exchange_rate, purchase_channel } = body;

    // 必填字段验证
    if (!purchase_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_date'
      );
    }
    if (usd_amount == null || typeof usd_amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须是数字'
      );
    }
    if (exchange_rate == null || typeof exchange_rate !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须是数字'
      );
    }

    // 数值范围验证
    if (usd_amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须大于 0'
      );
    }
    if (exchange_rate <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须大于 0'
      );
    }

    // purchase_channel 必填验证
    if (!purchase_channel) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: purchase_channel'
      );
    }
    if (typeof purchase_channel !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 必须是字符串'
      );
    }
    if (purchase_channel.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 不能为空字符串'
      );
    }
    if (purchase_channel.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    const purchaseDate = new Date(purchase_date);
    if (isNaN(purchaseDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_date 格式无效，请使用 ISO 8601 格式'
      );
    }

    // 获取用户 ID（支持 debug 模式）
    let userId: string;
    if (auth.isDebug) {
      const debugUserId = request.nextUrl.searchParams.get('user_id');
      if (!debugUserId) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'Debug 模式下需要提供 user_id 参数'
        );
      }
      userId = debugUserId;
    } else {
      userId = auth.user!.id;
    }

    // 插入数据库
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('usd_purchase_records')
      .insert({
        user_id: userId,
        purchase_date,
        usd_amount,
        exchange_rate,
        purchase_channel,
      })
      .select()
      .single();

    if (error) {
      console.error('创建美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建美元购汇记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### 3.4 创建 PATCH/DELETE API 路由

#### 文件: `app/api/usd-purchases/[id]/route.ts`（新建）

```typescript
/**
 * 美元购汇记录 API - 单条记录操作
 *
 * PATCH  /api/usd-purchases/[id] - 更新指定记录
 * DELETE /api/usd-purchases/[id] - 删除指定记录
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode
} from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的记录 ID 格式'
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的 JSON 格式'
      );
    }

    const { purchase_date, usd_amount, exchange_rate, purchase_channel } = body;

    // 类型验证（可选字段）
    if (usd_amount != null && typeof usd_amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须是数字'
      );
    }
    if (exchange_rate != null && typeof exchange_rate !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须是数字'
      );
    }

    // 数值范围验证
    if (usd_amount !== undefined && usd_amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'usd_amount 必须大于 0'
      );
    }
    if (exchange_rate !== undefined && exchange_rate <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'exchange_rate 必须大于 0'
      );
    }

    // purchase_channel 验证（可选字段）
    if (purchase_channel !== undefined && typeof purchase_channel !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 必须是字符串'
      );
    }
    if (purchase_channel !== undefined && purchase_channel.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 不能为空字符串'
      );
    }
    if (purchase_channel !== undefined && purchase_channel.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'purchase_channel 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    if (purchase_date !== undefined) {
      const purchaseDate = new Date(purchase_date);
      if (isNaN(purchaseDate.getTime())) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'purchase_date 格式无效，请使用 ISO 8601 格式'
        );
      }
    }

    // 获取用户 ID（支持 debug 模式）
    let userId: string;
    if (auth.isDebug) {
      const debugUserId = request.nextUrl.searchParams.get('user_id');
      if (!debugUserId) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'Debug 模式下需要提供 user_id 参数'
        );
      }
      userId = debugUserId;
    } else {
      userId = auth.user!.id;
    }

    // 构建更新数据
    const supabase = await createServerSupabaseClient();
    const updateData: {
      purchase_date?: string;
      usd_amount?: number;
      exchange_rate?: number;
      purchase_channel?: string;
    } = {};
    if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
    if (usd_amount !== undefined) updateData.usd_amount = usd_amount;
    if (exchange_rate !== undefined) updateData.exchange_rate = exchange_rate;
    if (purchase_channel !== undefined) updateData.purchase_channel = purchase_channel;

    const { data, error } = await supabase
      .from('usd_purchase_records')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCode.DATA_NOT_FOUND,
          '记录不存在或无权更新'
        );
      }

      console.error('更新美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    if (!data) {
      return errorResponse(
        ErrorCode.DATA_NOT_FOUND,
        '记录不存在或无权更新'
      );
    }

    return successResponse(data, '更新美元购汇记录成功');
  } catch (err) {
    console.error('更新美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const { id } = await params;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '无效的记录 ID 格式'
      );
    }

    // 获取用户 ID（支持 debug 模式）
    let userId: string;
    if (auth.isDebug) {
      const debugUserId = request.nextUrl.searchParams.get('user_id');
      if (!debugUserId) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'Debug 模式下需要提供 user_id 参数'
        );
      }
      userId = debugUserId;
    } else {
      userId = auth.user!.id;
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('usd_purchase_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(
          ErrorCode.DATA_NOT_FOUND,
          '记录不存在或无权删除'
        );
      }

      console.error('删除美元购汇记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除美元购汇记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    if (!data) {
      return errorResponse(
        ErrorCode.DATA_NOT_FOUND,
        '记录不存在或无权删除'
      );
    }

    return successResponse(null, '删除美元购汇记录成功');
  } catch (err) {
    console.error('删除美元购汇记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

---

## 四、Phase 3: 前端改造

### 4.1 创建美元详情页组件

#### 文件: `components/UsdDetailPage.tsx`（新建）

参考 `GoldDetailPage.tsx` 的布局结构，修改为美元相关的数据展示：

- 将金价改为汇率
- 将克重改为美元金额
- 移除手续费相关展示
- 颜色改为绿色系（emerald）
- 边框颜色改为 `border-[rgba(34,197,94,0.12)]`

### 4.2 创建美元购汇记录组件

#### 文件: `components/UsdPurchaseRecords.tsx`（新建）

参考 `GoldPurchaseRecords.tsx` 的结构，修改为：

- 调用 `getUsdPurchases()` 获取数据
- 盈亏计算：`(当前汇率 - 买入汇率) × 美元金额`
- 展示字段：美元金额、汇率、渠道、购汇成本
- 颜色使用绿色系

### 4.3 创建汇率走势图组件

#### 文件: `components/UsdExchangeRateChart.tsx`（新建）

参考 `GoldPriceChart.tsx` 实现，修改为：

- 数据源改为 `exchange_rate`
- 颜色改为绿色系
- 标题改为"汇率走势"

### 4.4 修改 AddAssetModal 组件

#### 文件: `components/AddAssetModal.tsx`

在 `handleSave` 函数的美元类型处理中添加 API 调用：

```typescript
} else if (selectedType === 'usd') {
  const usd = parseFloat(usdAmount) || 0;
  const rate = parseFloat(customExchangeRate) || DEFAULT_EXCHANGE_RATE;

  if (usd <= 0) {
    setErrorMessage('美元金额必须大于 0');
    return;
  }

  finalRmbValue = usd * rate;
  details = { usdAmount: usd, exchangeRate: rate };

  // 保存到数据库
  setIsSaving(true);
  setErrorMessage('');

  try {
    const response = await fetch('/api/usd-purchases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        purchase_date: date,
        usd_amount: usd,
        exchange_rate: rate,
        purchase_channel: name,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      setErrorMessage(result.message || '保存失败，请重试');
      setIsSaving(false);
      return;
    }
  } catch (error) {
    console.error('保存美元购汇记录失败:', error);
    setErrorMessage('网络错误，请重试');
    setIsSaving(false);
    return;
  }
}
```

### 4.5 修改 app/page.tsx

添加美元资产的点击跳转逻辑：

1. **更新类型定义**：
```typescript
type AssetView = 'list' | 'gold-detail' | 'usd-detail';
```

2. **添加状态**：
```typescript
const [selectedUsdAsset, setSelectedUsdAsset] = useState<Asset | null>(null);
```

3. **修改 handleAssetClick**：
```typescript
const handleAssetClick = (asset: Asset) => {
  if (asset.type === 'gold') {
    setSelectedGoldAsset(asset);
    setSelectedUsdAsset(null);
    setAssetView('gold-detail');
  } else if (asset.type === 'usd') {
    setSelectedUsdAsset(asset);
    setSelectedGoldAsset(null);
    setAssetView('usd-detail');
  }
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  });
};
```

4. **修改 handleBackToList**：
```typescript
const handleBackToList = () => {
  setAssetView('list');
  setSelectedGoldAsset(null);
  setSelectedUsdAsset(null);
  // ...
};
```

5. **修改渲染逻辑**：
```typescript
{assetView === 'gold-detail' && selectedGoldAsset ? (
  <GoldDetailPage asset={selectedGoldAsset} marketData={marketData} />
) : assetView === 'usd-detail' && selectedUsdAsset ? (
  <UsdDetailPage asset={selectedUsdAsset} marketData={marketData} />
) : (
  // 列表视图
)}
```

6. **导入组件**：
```typescript
import UsdDetailPage from '@/components/UsdDetailPage';
```

---

## 五、Phase 4: 测试验证

### 5.1 启动开发服务器

```bash
cd /Users/yinlu/Desktop/wealthhub-nextjs
pnpm dev
```

### 5.2 API 测试

#### GET 接口
```bash
curl "http://localhost:3000/api/usd-purchases?debug=1"
```

#### POST 接口
```bash
curl -X POST "http://localhost:3000/api/usd-purchases?debug=1&user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "purchase_date": "2026-01-19T14:30:00.000Z",
    "usd_amount": 10000,
    "exchange_rate": 7.24,
    "purchase_channel": "招商银行"
  }'
```

### 5.3 前端测试

1. 登录应用
2. 点击美元资产卡片 → 应跳转到美元详情页
3. 验证汇率、盈亏、购汇记录显示正确
4. 测试添加美元购汇记录

### 5.4 代码质量检查

```bash
pnpm build
pnpm lint
```

---

## 六、附录

### 6.1 回滚方案

```sql
DROP TRIGGER IF EXISTS trg_usd_purchase_updated_at ON public.usd_purchase_records;
DROP TRIGGER IF EXISTS trg_usd_purchase_calculate ON public.usd_purchase_records;
DROP FUNCTION IF EXISTS public.update_usd_purchase_updated_at();
DROP FUNCTION IF EXISTS public.calculate_usd_purchase_totals();
DROP TABLE IF EXISTS public.usd_purchase_records;
```

### 6.2 开发完成检查清单

#### 数据库
- [ ] 表创建成功
- [ ] RLS 策略配置正确（4 条）
- [ ] 触发器正常工作

#### 后端 API
- [ ] GET 返回正确数据
- [ ] POST 创建记录成功
- [ ] PATCH 更新记录成功
- [ ] DELETE 删除记录成功

#### 前端
- [ ] `UsdDetailPage` 正常显示
- [ ] `UsdPurchaseRecords` 正常显示
- [ ] `UsdExchangeRateChart` 正常显示
- [ ] 点击美元卡片可跳转
- [ ] `AddAssetModal` 美元类型调用 API

---

**创建时间**: 2026-01-23
**作者**: Claude Code Assistant
