# 人民币存款管理系统 - 开发实施计划

## 文档信息

- **项目名称**: WealthHub Next.js
- **功能模块**: 人民币存款记录管理
- **文档版本**: v1.0
- **创建日期**: 2026-01-23
- **参考实现**: 美元购汇记录管理 (`usd-purchase-records-dev-plan.md`)

---

## 目录

1. [需求分析与差异说明](#一需求分析与差异说明)
2. [Phase 1: 数据库配置](#二phase-1-数据库配置supabase-平台操作)
3. [Phase 2: 后端 API 开发](#三phase-2-后端-api-开发)
4. [Phase 3: 前端改造](#四phase-3-前端改造)
5. [Phase 4: 测试验证](#五phase-4-测试验证)
6. [附录](#六附录)

---

## 一、需求分析与差异说明

### 1.1 功能目标

将人民币存款记录持久化存储到 Supabase 数据库，实现：
- 多用户数据隔离
- 数据持久化存储
- CRUD 操作（创建、读取、更新、删除）
- 人民币存款详情页展示（含累计存款折线图和存款记录列表）

### 1.2 人民币 vs 美元/黄金 功能对比

| 功能点 | 黄金资产 | 美元资产 | 人民币存款 |
|--------|----------|----------|------------|
| 主要数量字段 | `weight` (克重) | `usd_amount` (美元金额) | `amount` (存款金额) |
| 价格/汇率字段 | `gold_price_per_gram` ✅ | `exchange_rate` ✅ | 无 ❌ |
| 手续费 | `handling_fee_per_gram` ✅ | 无 ❌ | 无 ❌ |
| 渠道字段 | `purchase_channel` | `purchase_channel` | `bank_name` |
| 自动计算字段 | `total_price`, `average_price` | `total_rmb_amount` | 无 |
| 盈亏计算 | 有（基于金价波动） | 有（基于汇率波动） | 无（金额固定） |
| 折线图类型 | 金价走势 | 汇率走势 | **累计存款金额走势** |

### 1.3 字段命名对照

| 业务含义 | 美元字段名 | 人民币字段名 |
|----------|------------|--------------|
| 日期 | `purchase_date` | `deposit_date` |
| 渠道/银行 | `purchase_channel` | `bank_name` |
| 金额 | `usd_amount` | `amount` |

### 1.4 折线图数据接口说明

#### 接口功能
- 返回用户的存款记录列表，用于前端绘制**累计存款折线图**
- 同一天多笔存款**合并**为一条记录（金额求和）
- UTC 时间转换为北京时间（UTC+8）后输出

#### 返回数据格式
```typescript
interface RmbDepositChartItem {
  date: string;        // YYYYMMDD 格式，北京时间
  bank_name: string;   // 银行名称（合并时用逗号分隔）
  amount: number;      // 当日存款金额
}

// API 响应
{
  "success": true,
  "data": RmbDepositChartItem[]
}
```

### 1.5 类型兼容性说明

#### 现状分析
当前 `Asset` 接口的 `purchaseRecords` 字段为联合类型：
```typescript
purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[];
```

#### 建议处理
在 Phase 2 修改 `types.ts` 时，扩展联合类型：
```typescript
purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[];
```

> **说明**：与黄金、美元相同，详情页组件内部独立调用 API 获取数据，不依赖此字段。

### 1.6 技术架构

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

### 1.7 文件改动清单

| 文件路径 | 操作类型 | 说明 |
|---------|---------|------|
| `types.ts` | 修改 | 添加 RmbDepositRecord 相关接口 + 更新 Asset.purchaseRecords |
| `lib/api/rmb-deposits.ts` | **新建** | API 调用封装 |
| `app/api/rmb-deposits/route.ts` | **新建** | GET/POST 接口 |
| `app/api/rmb-deposits/[id]/route.ts` | **新建** | PATCH/DELETE 接口 |
| `app/api/rmb-deposits/chart/route.ts` | **新建** | 折线图数据接口 |
| `components/RmbDetailPage.tsx` | **新建** | 人民币存款详情页 |
| `components/RmbDepositRecords.tsx` | **新建** | 存款记录列表组件 |
| `components/RmbDepositChart.tsx` | **新建** | 累计存款折线图组件 |
| `components/AddAssetModal.tsx` | 修改 | 人民币类型保存时调用 API |
| `app/page.tsx` | 修改 | 添加人民币资产点击跳转逻辑 |

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
-- 人民币存款记录表 - 完整建表脚本
-- 执行时间: 约 1 秒
-- ============================================================

-- 1. 确保 UUID 扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建人民币存款记录表
CREATE TABLE public.rmb_deposit_records (
  -- 主键
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 外键：关联用户
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 用户输入字段
  deposit_date TIMESTAMPTZ NOT NULL,                      -- 存款日期时间
  bank_name VARCHAR(100) NOT NULL,                        -- 存款银行名称
  amount NUMERIC(15, 2) NOT NULL,                         -- 存款金额

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 约束检查
  CONSTRAINT chk_amount_positive CHECK (amount > 0)
);

-- 3. 添加表注释
COMMENT ON TABLE public.rmb_deposit_records IS '人民币存款记录表';
COMMENT ON COLUMN public.rmb_deposit_records.id IS '记录唯一标识';
COMMENT ON COLUMN public.rmb_deposit_records.user_id IS '所属用户ID';
COMMENT ON COLUMN public.rmb_deposit_records.deposit_date IS '存款日期时间';
COMMENT ON COLUMN public.rmb_deposit_records.bank_name IS '存款银行名称';
COMMENT ON COLUMN public.rmb_deposit_records.amount IS '存款金额';

-- 4. 创建索引（优化查询性能）
CREATE INDEX idx_rmb_deposit_records_user_id
  ON public.rmb_deposit_records(user_id);

CREATE INDEX idx_rmb_deposit_records_deposit_date
  ON public.rmb_deposit_records(deposit_date DESC);

CREATE INDEX idx_rmb_deposit_records_user_date
  ON public.rmb_deposit_records(user_id, deposit_date DESC);

-- 5. 启用行级安全策略（RLS）
ALTER TABLE public.rmb_deposit_records ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略（用户只能操作自己的数据）
CREATE POLICY "用户可以查看自己的人民币存款记录"
  ON public.rmb_deposit_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的人民币存款记录"
  ON public.rmb_deposit_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的人民币存款记录"
  ON public.rmb_deposit_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的人民币存款记录"
  ON public.rmb_deposit_records FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_rmb_deposit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.update_rmb_deposit_updated_at() IS '自动更新 updated_at 时间戳';

-- 8. 创建更新时间戳触发器
CREATE TRIGGER trg_rmb_deposit_updated_at
  BEFORE UPDATE ON public.rmb_deposit_records
  FOR EACH ROW EXECUTE FUNCTION public.update_rmb_deposit_updated_at();

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
2. 在表列表中，应该能看到 `rmb_deposit_records` 表
3. 点击该表，验证字段是否正确：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户外键 |
| deposit_date | timestamptz | 存款日期 |
| bank_name | varchar(100) | 银行名称 |
| amount | numeric(15,2) | 存款金额 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 2.6 验证 RLS 策略

1. 在左侧导航栏，点击 **Authentication** → **Policies**
2. 找到 `rmb_deposit_records` 表
3. 确认有 4 条策略：
   - 用户可以查看自己的人民币存款记录 (SELECT)
   - 用户可以插入自己的人民币存款记录 (INSERT)
   - 用户可以更新自己的人民币存款记录 (UPDATE)
   - 用户可以删除自己的人民币存款记录 (DELETE)

### 2.7 测试数据（可选）

```sql
-- 测试插入
-- 注意：需要替换为真实的 user_id

-- 查看是否有测试用户
SELECT id, email FROM auth.users LIMIT 5;

-- 使用上面查到的用户 ID 进行测试（替换 'YOUR_USER_ID'）
INSERT INTO public.rmb_deposit_records (
  user_id,
  deposit_date,
  bank_name,
  amount
) VALUES (
  'YOUR_USER_ID'::uuid,
  '2026-01-15T10:00:00+08:00',
  '招商银行',
  100000
);

-- 验证插入结果
SELECT * FROM public.rmb_deposit_records ORDER BY created_at DESC LIMIT 1;

-- 清理测试数据（可选）
-- DELETE FROM public.rmb_deposit_records WHERE bank_name = '招商银行' AND amount = 100000;
```

---

## 三、Phase 2: 后端 API 开发

### 3.1 更新类型定义

#### 文件: `types.ts`

在文件中添加以下类型定义（在 `UsdPurchaseRecord` 相关定义之后）：

```typescript
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

// 折线图数据项
export interface RmbDepositChartItem {
  date: string;        // YYYYMMDD 格式，北京时间
  bank_name: string;   // 银行名称（合并时用逗号分隔）
  amount: number;      // 当日存款金额
}
```

同时，**更新 `Asset` 接口**的 `purchaseRecords` 字段：

```typescript
export interface Asset {
  // ... 其他字段保持不变

  // 购买/存款记录（根据 type 字段区分类型，详情页内部独立获取）
  purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[];
}
```

### 3.2 创建 API 调用封装

#### 文件: `lib/api/rmb-deposits.ts`（新建）

```typescript
/**
 * 人民币存款记录 API 调用封装
 *
 * 使用方法:
 * import { getRmbDeposits, createRmbDeposit, ... } from '@/lib/api/rmb-deposits';
 */

import {
  RmbDepositRecord,
  CreateRmbDepositRequest,
  UpdateRmbDepositRequest,
  RmbDepositChartItem
} from '@/types';

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
 * 获取当前用户的所有人民币存款记录
 */
export async function getRmbDeposits(): Promise<RmbDepositRecord[]> {
  const response = await fetch('/api/rmb-deposits');
  const result: ApiResponse<RmbDepositRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

/**
 * 创建人民币存款记录
 */
export async function createRmbDeposit(
  data: CreateRmbDepositRequest
): Promise<RmbDepositRecord> {
  const response = await fetch('/api/rmb-deposits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<RmbDepositRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

/**
 * 删除人民币存款记录
 */
export async function deleteRmbDeposit(id: string): Promise<void> {
  const response = await fetch(`/api/rmb-deposits/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

/**
 * 更新人民币存款记录
 */
export async function updateRmbDeposit(
  id: string,
  data: UpdateRmbDepositRequest
): Promise<RmbDepositRecord> {
  const response = await fetch(`/api/rmb-deposits/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<RmbDepositRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}

/**
 * 获取折线图数据（按日期合并、累计计算）
 */
export async function getRmbDepositChartData(): Promise<RmbDepositChartItem[]> {
  const response = await fetch('/api/rmb-deposits/chart');
  const result: ApiResponse<RmbDepositChartItem[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取图表数据失败');
  }

  return result.data || [];
}
```

### 3.3 创建 GET/POST API 路由

#### 文件: `app/api/rmb-deposits/route.ts`（新建）

```typescript
/**
 * 人民币存款记录 API
 *
 * GET  /api/rmb-deposits     - 获取当前用户的所有记录
 * POST /api/rmb-deposits     - 创建新记录
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
      .from('rmb_deposit_records')
      .select('*')
      .order('deposit_date', { ascending: false });

    if (error) {
      console.error('获取人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取人民币存款记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取人民币存款记录成功');
  } catch (err) {
    console.error('获取人民币存款记录异常:', err);
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

    const { deposit_date, bank_name, amount } = body;

    // 必填字段验证
    if (!deposit_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: deposit_date'
      );
    }
    if (amount == null || typeof amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须是数字'
      );
    }

    // 数值范围验证
    if (amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须大于 0'
      );
    }

    // bank_name 必填验证
    if (!bank_name) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: bank_name'
      );
    }
    if (typeof bank_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 必须是字符串'
      );
    }
    if (bank_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 不能为空字符串'
      );
    }
    if (bank_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    const depositDate = new Date(deposit_date);
    if (isNaN(depositDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'deposit_date 格式无效，请使用 ISO 8601 格式'
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
      .from('rmb_deposit_records')
      .insert({
        user_id: userId,
        deposit_date,
        bank_name,
        amount,
      })
      .select()
      .single();

    if (error) {
      console.error('创建人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建人民币存款记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建人民币存款记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建人民币存款记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### 3.4 创建 PATCH/DELETE API 路由

#### 文件: `app/api/rmb-deposits/[id]/route.ts`（新建）

```typescript
/**
 * 人民币存款记录 API - 单条记录操作
 *
 * PATCH  /api/rmb-deposits/[id] - 更新指定记录
 * DELETE /api/rmb-deposits/[id] - 删除指定记录
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

    const { deposit_date, bank_name, amount } = body;

    // 类型验证（可选字段）
    if (amount != null && typeof amount !== 'number') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须是数字'
      );
    }

    // 数值范围验证
    if (amount !== undefined && amount <= 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'amount 必须大于 0'
      );
    }

    // bank_name 验证（可选字段）
    if (bank_name !== undefined && typeof bank_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 必须是字符串'
      );
    }
    if (bank_name !== undefined && bank_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 不能为空字符串'
      );
    }
    if (bank_name !== undefined && bank_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'bank_name 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    if (deposit_date !== undefined) {
      const depositDate = new Date(deposit_date);
      if (isNaN(depositDate.getTime())) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'deposit_date 格式无效，请使用 ISO 8601 格式'
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
      deposit_date?: string;
      bank_name?: string;
      amount?: number;
    } = {};
    if (deposit_date !== undefined) updateData.deposit_date = deposit_date;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (amount !== undefined) updateData.amount = amount;

    const { data, error } = await supabase
      .from('rmb_deposit_records')
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

      console.error('更新人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新人民币存款记录失败',
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

    return successResponse(data, '更新人民币存款记录成功');
  } catch (err) {
    console.error('更新人民币存款记录异常:', err);
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
      .from('rmb_deposit_records')
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

      console.error('删除人民币存款记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除人民币存款记录失败',
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

    return successResponse(null, '删除人民币存款记录成功');
  } catch (err) {
    console.error('删除人民币存款记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### 3.5 创建折线图数据 API

#### 文件: `app/api/rmb-deposits/chart/route.ts`（新建）

```typescript
/**
 * 人民币存款折线图数据 API
 *
 * GET /api/rmb-deposits/chart - 获取折线图数据
 *
 * 返回格式：按日期（北京时间）分组合并的存款记录
 * - 同一天多笔存款合并，金额求和
 * - 银行名称用逗号分隔
 * - 日期格式：YYYYMMDD（北京时间）
 */

import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode
} from '@/lib/api-response';

interface ChartDataItem {
  date: string;
  bank_name: string;
  amount: number;
}

/**
 * 将 UTC 时间转换为北京时间的 YYYYMMDD 格式
 */
function formatToBeijingDate(utcDateStr: string): string {
  const date = new Date(utcDateStr);
  // 北京时间 = UTC + 8小时
  const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = beijingTime.getUTCFullYear();
  const month = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('rmb_deposit_records')
      .select('deposit_date, bank_name, amount')
      .order('deposit_date', { ascending: true });

    if (error) {
      console.error('获取人民币存款图表数据失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取图表数据失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    // 按日期（北京时间）分组合并
    const groupedMap = new Map<string, { banks: Set<string>; amount: number }>();

    for (const record of data || []) {
      const dateKey = formatToBeijingDate(record.deposit_date);

      if (groupedMap.has(dateKey)) {
        const existing = groupedMap.get(dateKey)!;
        existing.banks.add(record.bank_name);
        existing.amount += record.amount;
      } else {
        groupedMap.set(dateKey, {
          banks: new Set([record.bank_name]),
          amount: record.amount
        });
      }
    }

    // 转换为输出格式，按日期排序
    const chartData: ChartDataItem[] = Array.from(groupedMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { banks, amount }]) => ({
        date,
        bank_name: Array.from(banks).join(', '),
        amount
      }));

    return successResponse(chartData, '获取图表数据成功');
  } catch (err) {
    console.error('获取人民币存款图表数据异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

---

## 四、Phase 3: 前端改造

### 4.1 人民币存款详情页草图

```
┌────────────────────────────────────────┐
│  ← 返回          人民币存款             │  ← Header
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      ¥5,000,000                  │  │  ← 资产总额（大字号、蓝色）
│  │      人民币存款总额               │  │
│  │                                  │  │
│  │  ┌────────────┬────────────┐    │  │
│  │  │ 存款笔数    │ 最早存款    │    │  │
│  │  │ 8 笔       │ 2025-06-15 │    │  │
│  │  └────────────┴────────────┘    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  累计存款走势                           │
│  ┌──────────────────────────────────┐  │
│  │      ^                           │  │
│  │  金  │        ___________        │  │
│  │  额  │      _/                   │  │
│  │      │    _/                     │  │
│  │      │  _/                       │  │
│  │      │_/                         │  │
│  │      └──────────────────────────▶│  │
│  │              日期                 │  │
│  └──────────────────────────────────┘  │
│                                        │
│  存款记录                    共 8 笔    │
│  ┌──────────────────────────────────┐  │
│  │ ¥1,000,000         2026-01-15   │  │
│  │ 招商银行                         │  │
│  ├──────────────────────────────────┤  │
│  │ ¥500,000           2026-01-10   │  │
│  │ 工商银行                         │  │
│  ├──────────────────────────────────┤  │
│  │ ¥800,000           2025-12-20   │  │
│  │ 建设银行                         │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────┐  ┌────┐  ┌────┐              │
│  │资产│  │ + │  │我的│              │  ← BottomNav
│  └────┘  └────┘  └────┘              │
└────────────────────────────────────────┘
```

### 4.2 创建人民币存款详情页组件

#### 文件: `components/RmbDetailPage.tsx`（新建）

参考 `GoldDetailPage.tsx` 和 `UsdDetailPage.tsx` 的布局结构，设计要点：

- **配色方案**：蓝色系（blue-500/blue-400）
- **边框颜色**：`border-[rgba(59,130,246,0.12)]`
- **顶部卡片**：展示存款总额、存款笔数、最早存款日期
- **中部**：累计存款折线图组件
- **底部**：存款记录列表组件

```typescript
'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import RmbDepositChart from '@/components/RmbDepositChart';
import RmbDepositRecords from '@/components/RmbDepositRecords';

interface RmbDetailPageProps {
  asset: Asset;
}

const RmbDetailPage: React.FC<RmbDetailPageProps> = ({ asset }) => {
  const totalDeposit = asset.amount;

  return (
    <div className="space-y-4 -mt-2">
      {/* 顶部：资产总额卡片 */}
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(59,130,246,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-blue-50/30 dark:from-blue-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-blue-500 dark:text-blue-400 text-4xl font-extrabold tracking-tight mb-0.5">
              ¥{formatNumber(totalDeposit, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              人民币存款总额
            </div>
          </div>
        </div>

        {/* 统计信息 - 由子组件填充 */}
        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                存款笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="deposit-count">
                -- 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早存款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="earliest-date">
                --
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 累计存款折线图 */}
      <RmbDepositChart />

      {/* 存款记录列表 */}
      <RmbDepositRecords />
    </div>
  );
};

export default RmbDetailPage;
```

### 4.3 创建累计存款折线图组件

#### 文件: `components/RmbDepositChart.tsx`（新建）

参考 `UsdExchangeRateChart.tsx` 实现，主要修改：

- 数据源：调用 `/api/rmb-deposits/chart` 获取数据
- 计算逻辑：将每日存款金额**累加**，绘制累计曲线
- 配色：蓝色系（rgb(59, 130, 246)）
- 标题：「累计存款走势」
- Y 轴：金额（元）

**核心逻辑：**
```typescript
// 将每日存款转换为累计存款
const cumulativeData = chartData.reduce((acc, item, index) => {
  const prevTotal = index > 0 ? acc[index - 1].cumulative : 0;
  acc.push({
    ...item,
    cumulative: prevTotal + item.amount
  });
  return acc;
}, [] as Array<ChartDataItem & { cumulative: number }>);
```

### 4.4 创建存款记录列表组件

#### 文件: `components/RmbDepositRecords.tsx`（新建）

参考 `UsdPurchaseRecords.tsx` 实现，主要修改：

- 数据源：调用 `getRmbDeposits()` 获取数据
- 展示字段：存款金额、日期、银行名称
- 配色：蓝色系
- 无盈亏计算（金额固定）
- 更新父组件的统计信息（存款笔数、最早存款日期）

**关键代码片段：**
```typescript
// 更新父组件的统计信息
useEffect(() => {
  if (records.length > 0) {
    // 更新存款笔数
    const countEl = document.getElementById('deposit-count');
    if (countEl) countEl.textContent = `${records.length} 笔`;

    // 更新最早存款日期
    const sortedRecords = [...records].sort(
      (a, b) => new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
    );
    const earliestEl = document.getElementById('earliest-date');
    if (earliestEl) {
      earliestEl.textContent = formatDate(sortedRecords[0].deposit_date);
    }
  }
}, [records]);
```

### 4.5 修改 AddAssetModal 组件

#### 文件: `components/AddAssetModal.tsx`

在 `handleSave` 函数的人民币类型处理中添加 API 调用：

```typescript
if (selectedType === 'rmb') {
  const rmbAmount = parseFloat(amount) || 0;

  if (rmbAmount <= 0) {
    setErrorMessage('金额必须大于 0');
    return;
  }

  finalRmbValue = rmbAmount;

  // 保存到数据库
  setIsSaving(true);
  setErrorMessage('');

  try {
    const response = await fetch('/api/rmb-deposits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deposit_date: date,
        bank_name: name,
        amount: rmbAmount,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      setErrorMessage(result.message || '保存失败，请重试');
      setIsSaving(false);
      return;
    }
  } catch (error) {
    console.error('保存人民币存款记录失败:', error);
    setErrorMessage('网络错误，请重试');
    setIsSaving(false);
    return;
  }
}
```

### 4.6 修改 app/page.tsx

添加人民币资产的点击跳转逻辑：

1. **更新类型定义**：
```typescript
type AssetView = 'list' | 'gold-detail' | 'usd-detail' | 'rmb-detail';
```

2. **添加状态**：
```typescript
const [selectedRmbAsset, setSelectedRmbAsset] = useState<Asset | null>(null);
```

3. **修改 handleAssetClick**：
```typescript
const handleAssetClick = (asset: Asset) => {
  if (asset.type === 'gold') {
    setSelectedGoldAsset(asset);
    setSelectedUsdAsset(null);
    setSelectedRmbAsset(null);
    setAssetView('gold-detail');
  } else if (asset.type === 'usd') {
    setSelectedUsdAsset(asset);
    setSelectedGoldAsset(null);
    setSelectedRmbAsset(null);
    setAssetView('usd-detail');
  } else if (asset.type === 'rmb') {
    setSelectedRmbAsset(asset);
    setSelectedGoldAsset(null);
    setSelectedUsdAsset(null);
    setAssetView('rmb-detail');
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
  setSelectedRmbAsset(null);
  // ...
};
```

5. **修改渲染逻辑**：
```typescript
{assetView === 'gold-detail' && selectedGoldAsset ? (
  <GoldDetailPage asset={selectedGoldAsset} marketData={marketData} />
) : assetView === 'usd-detail' && selectedUsdAsset ? (
  <UsdDetailPage asset={selectedUsdAsset} marketData={marketData} />
) : assetView === 'rmb-detail' && selectedRmbAsset ? (
  <RmbDetailPage asset={selectedRmbAsset} />
) : (
  // 列表视图
)}
```

6. **导入组件**：
```typescript
import RmbDetailPage from '@/components/RmbDetailPage';
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
curl "http://localhost:3000/api/rmb-deposits?debug=1"
```

#### POST 接口
```bash
curl -X POST "http://localhost:3000/api/rmb-deposits?debug=1&user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "deposit_date": "2026-01-15T10:00:00.000Z",
    "bank_name": "招商银行",
    "amount": 100000
  }'
```

#### 折线图数据接口
```bash
curl "http://localhost:3000/api/rmb-deposits/chart?debug=1"
```

### 5.3 前端测试

1. 登录应用
2. 点击人民币存款资产卡片 → 应跳转到人民币存款详情页
3. 验证资产总额、存款笔数、最早存款日期显示正确
4. 验证累计存款折线图正常显示
5. 验证存款记录列表显示正确
6. 测试添加人民币存款记录

### 5.4 代码质量检查

```bash
pnpm build
pnpm lint
```

---

## 六、附录

### 6.1 回滚方案

```sql
DROP TRIGGER IF EXISTS trg_rmb_deposit_updated_at ON public.rmb_deposit_records;
DROP FUNCTION IF EXISTS public.update_rmb_deposit_updated_at();
DROP TABLE IF EXISTS public.rmb_deposit_records;
```

### 6.2 开发完成检查清单

#### 数据库
- [ ] 表创建成功
- [ ] RLS 策略配置正确（4 条）
- [ ] 触发器正常工作

#### 后端 API
- [ ] GET `/api/rmb-deposits` 返回正确数据
- [ ] POST `/api/rmb-deposits` 创建记录成功
- [ ] PATCH `/api/rmb-deposits/[id]` 更新记录成功
- [ ] DELETE `/api/rmb-deposits/[id]` 删除记录成功
- [ ] GET `/api/rmb-deposits/chart` 返回正确的折线图数据

#### 前端
- [ ] `RmbDetailPage` 正常显示
- [ ] `RmbDepositRecords` 正常显示
- [ ] `RmbDepositChart` 正常显示累计曲线
- [ ] 点击人民币存款卡片可跳转
- [ ] `AddAssetModal` 人民币类型调用 API
- [ ] 返回按钮正常工作

---

**创建时间**: 2026-01-23
**作者**: Claude Code Assistant
