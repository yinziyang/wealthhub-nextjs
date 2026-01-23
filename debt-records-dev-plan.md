# 债权资产管理系统 - 开发实施计划

## 文档信息

- **项目名称**: WealthHub Next.js
- **功能模块**: 债权资产记录管理
- **文档版本**: v1.0
- **创建日期**: 2026-01-23
- **参考实现**: 人民币存款记录管理 (`rmb-deposit-records-dev-plan.md`)

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

将债权资产记录持久化存储到 Supabase 数据库，实现：
- 多用户数据隔离
- 数据持久化存储
- CRUD 操作（创建、读取、更新、删除）
- 债权资产详情页展示（含债权总额卡片和债权记录列表）

### 1.2 债权 vs 人民币存款 功能对比

| 功能点 | 人民币存款 | 债权资产 |
|--------|------------|----------|
| 主要数量字段 | `amount` (存款金额) | `amount` (借款额度) |
| 日期字段 | `deposit_date` | `loan_date` |
| 对象字段 | `bank_name` (银行名称) | `debtor_name` (借款人) |
| 折线图 | 累计存款走势 ✅ | 暂不需要 ❌ |
| 编辑/删除 | 支持 | 暂不需要（后续添加） |
| 还款状态 | 不适用 | 暂不需要（后续添加） |
| 利息/利率 | 不适用 | 暂不需要 |

### 1.3 字段命名设计

| 业务含义 | 人民币存款字段名 | 债权资产字段名 |
|----------|------------------|----------------|
| 日期 | `deposit_date` | `loan_date` |
| 对象/渠道 | `bank_name` | `debtor_name` |
| 金额 | `amount` | `amount` |

### 1.4 类型兼容性说明

#### 现状分析
当前 `Asset` 接口的 `purchaseRecords` 字段为联合类型：
```typescript
purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[];
```

#### 建议处理
在 Phase 2 修改 `types.ts` 时，扩展联合类型：
```typescript
purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[] | DebtRecord[];
```

> **说明**：与其他资产类型相同，详情页组件内部独立调用 API 获取数据，不依赖此字段。

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
| `types.ts` | 修改 | 添加 DebtRecord 相关接口 + 更新 Asset.purchaseRecords |
| `lib/api/debt-records.ts` | **新建** | API 调用封装 |
| `app/api/debt-records/route.ts` | **新建** | GET/POST 接口 |
| `app/api/debt-records/[id]/route.ts` | **新建** | PATCH/DELETE 接口（预留） |
| `components/DebtDetailPage.tsx` | **新建** | 债权资产详情页 |
| `components/DebtRecordList.tsx` | **新建** | 债权记录列表组件 |
| `components/AddAssetModal.tsx` | 修改 | 债权类型保存时调用 API |
| `app/page.tsx` | 修改 | 添加债权资产点击跳转逻辑 |

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
-- 债权资产记录表 - 完整建表脚本
-- 执行时间: 约 1 秒
-- ============================================================

-- 1. 确保 UUID 扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建债权资产记录表
CREATE TABLE public.debt_records (
  -- 主键
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 外键：关联用户
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 用户输入字段
  loan_date TIMESTAMPTZ NOT NULL,                         -- 借款日期时间
  debtor_name VARCHAR(100) NOT NULL,                      -- 借款人姓名
  amount NUMERIC(15, 2) NOT NULL,                         -- 借款额度

  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 约束检查
  CONSTRAINT chk_debt_amount_positive CHECK (amount > 0)
);

-- 3. 添加表注释
COMMENT ON TABLE public.debt_records IS '债权资产记录表';
COMMENT ON COLUMN public.debt_records.id IS '记录唯一标识';
COMMENT ON COLUMN public.debt_records.user_id IS '所属用户ID';
COMMENT ON COLUMN public.debt_records.loan_date IS '借款日期时间';
COMMENT ON COLUMN public.debt_records.debtor_name IS '借款人姓名';
COMMENT ON COLUMN public.debt_records.amount IS '借款额度';

-- 4. 创建索引（优化查询性能）
CREATE INDEX idx_debt_records_user_id
  ON public.debt_records(user_id);

CREATE INDEX idx_debt_records_loan_date
  ON public.debt_records(loan_date DESC);

CREATE INDEX idx_debt_records_user_date
  ON public.debt_records(user_id, loan_date DESC);

-- 5. 启用行级安全策略（RLS）
ALTER TABLE public.debt_records ENABLE ROW LEVEL SECURITY;

-- 6. 创建 RLS 策略（用户只能操作自己的数据）
CREATE POLICY "用户可以查看自己的债权记录"
  ON public.debt_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以插入自己的债权记录"
  ON public.debt_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的债权记录"
  ON public.debt_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "用户可以删除自己的债权记录"
  ON public.debt_records FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 创建更新时间戳触发器函数
CREATE OR REPLACE FUNCTION public.update_debt_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

COMMENT ON FUNCTION public.update_debt_record_updated_at() IS '自动更新 updated_at 时间戳';

-- 8. 创建更新时间戳触发器
CREATE TRIGGER trg_debt_record_updated_at
  BEFORE UPDATE ON public.debt_records
  FOR EACH ROW EXECUTE FUNCTION public.update_debt_record_updated_at();

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
2. 在表列表中，应该能看到 `debt_records` 表
3. 点击该表，验证字段是否正确：

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户外键 |
| loan_date | timestamptz | 借款日期 |
| debtor_name | varchar(100) | 借款人姓名 |
| amount | numeric(15,2) | 借款额度 |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

### 2.6 验证 RLS 策略

1. 在左侧导航栏，点击 **Authentication** → **Policies**
2. 找到 `debt_records` 表
3. 确认有 4 条策略：
   - 用户可以查看自己的债权记录 (SELECT)
   - 用户可以插入自己的债权记录 (INSERT)
   - 用户可以更新自己的债权记录 (UPDATE)
   - 用户可以删除自己的债权记录 (DELETE)

### 2.7 测试数据（可选）

```sql
-- 测试插入
-- 注意：需要替换为真实的 user_id

-- 查看是否有测试用户
SELECT id, email FROM auth.users LIMIT 5;

-- 使用上面查到的用户 ID 进行测试（替换 'YOUR_USER_ID'）
INSERT INTO public.debt_records (
  user_id,
  loan_date,
  debtor_name,
  amount
) VALUES (
  'YOUR_USER_ID'::uuid,
  '2026-01-15T10:00:00+08:00',
  '张三',
  50000
);

-- 验证插入结果
SELECT * FROM public.debt_records ORDER BY created_at DESC LIMIT 1;

-- 清理测试数据（可选）
-- DELETE FROM public.debt_records WHERE debtor_name = '张三' AND amount = 50000;
```

---

## 三、Phase 2: 后端 API 开发

### 3.1 更新类型定义

#### 文件: `types.ts`

在文件中添加以下类型定义（在 `RmbDepositRecord` 相关定义之后）：

```typescript
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
```

同时，**更新 `Asset` 接口**的 `purchaseRecords` 字段：

```typescript
export interface Asset {
  // ... 其他字段保持不变

  // 购买/存款/债权记录（根据 type 字段区分类型，详情页内部独立获取）
  purchaseRecords?: GoldPurchaseRecord[] | UsdPurchaseRecord[] | RmbDepositRecord[] | DebtRecord[];
}
```

### 3.2 创建 API 调用封装

#### 文件: `lib/api/debt-records.ts`（新建）

```typescript
/**
 * 债权资产记录 API 调用封装
 *
 * 使用方法:
 * import { getDebtRecords, createDebtRecord, ... } from '@/lib/api/debt-records';
 */

import {
  DebtRecord,
  CreateDebtRecordRequest,
  UpdateDebtRecordRequest
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
 * 获取当前用户的所有债权记录
 */
export async function getDebtRecords(): Promise<DebtRecord[]> {
  const response = await fetch('/api/debt-records');
  const result: ApiResponse<DebtRecord[]> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '获取记录失败');
  }

  return result.data || [];
}

/**
 * 创建债权记录
 */
export async function createDebtRecord(
  data: CreateDebtRecordRequest
): Promise<DebtRecord> {
  const response = await fetch('/api/debt-records', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<DebtRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '创建记录失败');
  }

  return result.data;
}

/**
 * 删除债权记录（预留接口）
 */
export async function deleteDebtRecord(id: string): Promise<void> {
  const response = await fetch(`/api/debt-records/${id}`, {
    method: 'DELETE',
  });

  const result: ApiResponse<null> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || result.message || '删除记录失败');
  }
}

/**
 * 更新债权记录（预留接口）
 */
export async function updateDebtRecord(
  id: string,
  data: UpdateDebtRecordRequest
): Promise<DebtRecord> {
  const response = await fetch(`/api/debt-records/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result: ApiResponse<DebtRecord> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || result.message || '更新记录失败');
  }

  return result.data;
}
```

### 3.3 创建 GET/POST API 路由

#### 文件: `app/api/debt-records/route.ts`（新建）

```typescript
/**
 * 债权资产记录 API
 *
 * GET  /api/debt-records     - 获取当前用户的所有记录
 * POST /api/debt-records     - 创建新记录
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
      .from('debt_records')
      .select('*')
      .order('loan_date', { ascending: false });

    if (error) {
      console.error('获取债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取债权记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data || [], '获取债权记录成功');
  } catch (err) {
    console.error('获取债权记录异常:', err);
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

    const { loan_date, debtor_name, amount } = body;

    // 必填字段验证
    if (!loan_date) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: loan_date'
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

    // debtor_name 必填验证
    if (!debtor_name) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        '缺少必填字段: debtor_name'
      );
    }
    if (typeof debtor_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 必须是字符串'
      );
    }
    if (debtor_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 不能为空字符串'
      );
    }
    if (debtor_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    const loanDate = new Date(loan_date);
    if (isNaN(loanDate.getTime())) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'loan_date 格式无效，请使用 ISO 8601 格式'
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
      .from('debt_records')
      .insert({
        user_id: userId,
        loan_date,
        debtor_name,
        amount,
      })
      .select()
      .single();

    if (error) {
      console.error('创建债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '创建债权记录失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    return successResponse(data, '创建债权记录成功', HttpStatusCode.CREATED);
  } catch (err) {
    console.error('创建债权记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### 3.4 创建 PATCH/DELETE API 路由（预留）

#### 文件: `app/api/debt-records/[id]/route.ts`（新建）

```typescript
/**
 * 债权资产记录 API - 单条记录操作
 *
 * PATCH  /api/debt-records/[id] - 更新指定记录
 * DELETE /api/debt-records/[id] - 删除指定记录
 *
 * 注：当前版本暂不在前端使用，预留接口供后续扩展
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

    const { loan_date, debtor_name, amount } = body;

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

    // debtor_name 验证（可选字段）
    if (debtor_name !== undefined && typeof debtor_name !== 'string') {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 必须是字符串'
      );
    }
    if (debtor_name !== undefined && debtor_name.trim().length === 0) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 不能为空字符串'
      );
    }
    if (debtor_name !== undefined && debtor_name.length > 100) {
      return errorResponse(
        ErrorCode.DATA_VALIDATION_FAILED,
        'debtor_name 长度不能超过 100 个字符'
      );
    }

    // 日期格式验证
    if (loan_date !== undefined) {
      const loanDate = new Date(loan_date);
      if (isNaN(loanDate.getTime())) {
        return errorResponse(
          ErrorCode.DATA_VALIDATION_FAILED,
          'loan_date 格式无效，请使用 ISO 8601 格式'
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
      loan_date?: string;
      debtor_name?: string;
      amount?: number;
    } = {};
    if (loan_date !== undefined) updateData.loan_date = loan_date;
    if (debtor_name !== undefined) updateData.debtor_name = debtor_name;
    if (amount !== undefined) updateData.amount = amount;

    const { data, error } = await supabase
      .from('debt_records')
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

      console.error('更新债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '更新债权记录失败',
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

    return successResponse(data, '更新债权记录成功');
  } catch (err) {
    console.error('更新债权记录异常:', err);
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
      .from('debt_records')
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

      console.error('删除债权记录失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '删除债权记录失败',
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

    return successResponse(null, '删除债权记录成功');
  } catch (err) {
    console.error('删除债权记录异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

---

## 四、Phase 3: 前端改造

### 4.1 债权资产详情页草图

```
┌────────────────────────────────────────┐
│  ← 返回          债权资产              │  ← Header
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │                                  │  │
│  │      ¥1,500,000                  │  │  ← 债权总额（大字号、橙色）
│  │      债权资产总额                 │  │
│  │                                  │  │
│  │  ┌────────────┬────────────┐    │  │
│  │  │ 债权笔数    │ 最早借款    │    │  │
│  │  │ 3 笔       │ 2025-08-20 │    │  │
│  │  └────────────┴────────────┘    │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  债权记录                    共 3 笔    │
│  ┌──────────────────────────────────┐  │
│  │ ¥500,000            2026-01-10   │  │
│  │ 借款人: 张三                      │  │
│  ├──────────────────────────────────┤  │
│  │ ¥300,000            2025-11-15   │  │
│  │ 借款人: 李四                      │  │
│  ├──────────────────────────────────┤  │
│  │ ¥700,000            2025-08-20   │  │
│  │ 借款人: 王五                      │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌────┐  ┌────┐  ┌────┐              │
│  │资产│  │ + │  │我的│              │  ← BottomNav
│  └────┘  └────┘  └────┘              │
└────────────────────────────────────────┘
```

### 4.2 创建债权资产详情页组件

#### 文件: `components/DebtDetailPage.tsx`（新建）

参考 `RmbDetailPage.tsx` 的布局结构，设计要点：

- **配色方案**：橙色系（amber-500/amber-400），与债权资产卡片保持一致
- **边框颜色**：`border-[rgba(245,158,11,0.12)]`
- **顶部卡片**：展示债权总额、债权笔数、最早借款日期
- **底部**：债权记录列表组件

```typescript
'use client';

import React from 'react';
import { Asset } from '@/types';
import { formatNumber } from '@/utils';
import DebtRecordList from '@/components/DebtRecordList';

interface DebtDetailPageProps {
  asset: Asset;
}

const DebtDetailPage: React.FC<DebtDetailPageProps> = ({ asset }) => {
  const totalDebt = asset.amount;

  return (
    <div className="space-y-4 -mt-2">
      {/* 顶部：资产总额卡片 */}
      <div
        className="rounded-2xl bg-surface-darker border border-[rgba(245,158,11,0.12)] overflow-hidden shadow-sm"
        style={{ borderRadius: '32px' }}
      >
        <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-amber-50/30 dark:from-amber-900/10 to-transparent">
          <div className="mb-3">
            <div className="text-amber-500 dark:text-amber-400 text-4xl font-extrabold tracking-tight mb-0.5">
              ¥{formatNumber(totalDebt, 0)}
            </div>
            <div className="text-slate-500 dark:text-slate-300 text-xs font-medium">
              债权资产总额
            </div>
          </div>
        </div>

        {/* 统计信息 - 由子组件填充 */}
        <div className="px-5 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                债权笔数
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="debt-count">
                -- 笔
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium mb-1 uppercase tracking-wide">
                最早借款
              </div>
              <div className="text-slate-900 dark:text-white text-base font-bold" id="earliest-loan-date">
                --
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 债权记录列表 */}
      <DebtRecordList />
    </div>
  );
};

export default DebtDetailPage;
```

### 4.3 创建债权记录列表组件

#### 文件: `components/DebtRecordList.tsx`（新建）

参考 `RmbDepositRecords.tsx` 实现，主要修改：

- 数据源：调用 `getDebtRecords()` 获取数据
- 展示字段：借款额度、日期、借款人姓名
- 配色：橙色系
- 更新父组件的统计信息（债权笔数、最早借款日期）

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { DebtRecord } from '@/types';
import { formatNumber } from '@/utils';
import { getDebtRecords } from '@/lib/api/debt-records';

const DebtRecordList: React.FC = () => {
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecords() {
      try {
        setLoading(true);
        setError(null);
        const data = await getDebtRecords();
        setRecords(data);
      } catch (err) {
        console.error('获取债权记录失败:', err);
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    }

    fetchRecords();
  }, []);

  // 更新父组件的统计信息
  useEffect(() => {
    if (records.length > 0) {
      // 更新债权笔数
      const countEl = document.getElementById('debt-count');
      if (countEl) countEl.textContent = `${records.length} 笔`;

      // 更新最早借款日期
      const sortedRecords = [...records].sort(
        (a, b) => new Date(a.loan_date).getTime() - new Date(b.loan_date).getTime()
      );
      const earliestEl = document.getElementById('earliest-loan-date');
      if (earliestEl) {
        const date = new Date(sortedRecords[0].loan_date);
        earliestEl.textContent = date.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      }
    }
  }, [records]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-slate-900 dark:text-white text-base font-bold px-1">
          债权记录
        </div>
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          暂无债权记录
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          债权记录
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {records.length}笔借款
        </div>
      </div>

      <div className="grid gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {records.map((record) => (
          <div
            key={record.id}
            className="rounded-xl bg-surface-darker border border-[rgba(245,158,11,0.12)] p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  ¥{formatNumber(record.amount, 2)}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(record.loan_date)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">借款人</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {record.debtor_name}
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

export default DebtRecordList;
```

### 4.4 修改 AddAssetModal 组件

#### 文件: `components/AddAssetModal.tsx`

在 `handleSave` 函数的债权类型处理中添加 API 调用：

**找到现有的债权处理代码（约第 413-414 行）：**
```typescript
} else if (selectedType === 'debt') {
  finalRmbValue = parseFloat(amount) || 0;
}
```

**替换为：**
```typescript
} else if (selectedType === 'debt') {
  const debtAmount = parseFloat(amount) || 0;

  if (debtAmount <= 0) {
    setErrorMessage('金额必须大于 0');
    return;
  }

  finalRmbValue = debtAmount;

  // 保存到数据库
  setIsSaving(true);
  setErrorMessage('');

  try {
    const response = await fetch('/api/debt-records', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        loan_date: date,
        debtor_name: name,
        amount: debtAmount,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      setErrorMessage(result.message || '保存失败，请重试');
      setIsSaving(false);
      return;
    }
  } catch (error) {
    console.error('保存债权记录失败:', error);
    setErrorMessage('网络错误，请重试');
    setIsSaving(false);
    return;
  }
}
```

### 4.5 修改 app/page.tsx

添加债权资产的点击跳转逻辑：

#### 1. 更新类型定义（约第 20 行）：
```typescript
type AssetView = 'list' | 'gold-detail' | 'usd-detail' | 'rmb-detail' | 'debt-detail';
```

#### 2. 添加状态（约第 28 行后）：
```typescript
const [selectedDebtAsset, setSelectedDebtAsset] = useState<Asset | null>(null);
```

#### 3. 修改 handleAssetClick（约第 140-160 行）：
在现有的 `else if (asset.type === 'rmb')` 之后添加：
```typescript
} else if (asset.type === 'debt') {
  setSelectedDebtAsset(asset);
  setSelectedGoldAsset(null);
  setSelectedUsdAsset(null);
  setSelectedRmbAsset(null);
  setAssetView('debt-detail');
}
```

#### 4. 修改 handleBackToList（约第 162-170 行）：
添加重置债权资产状态：
```typescript
const handleBackToList = () => {
  setAssetView('list');
  setSelectedGoldAsset(null);
  setSelectedUsdAsset(null);
  setSelectedRmbAsset(null);
  setSelectedDebtAsset(null);  // 新增
  // ...
};
```

#### 5. 修改渲染逻辑（约第 183-200 行）：
在 `assetView === 'rmb-detail'` 条件之后添加：
```typescript
) : assetView === 'debt-detail' && selectedDebtAsset ? (
  <DebtDetailPage asset={selectedDebtAsset} />
```

#### 6. 导入组件（文件顶部）：
```typescript
import DebtDetailPage from '@/components/DebtDetailPage';
```

### 4.6 修改 Header 组件（可选）

#### 文件: `components/Header.tsx`

如果 Header 组件需要根据 `assetView` 显示不同的标题，添加对 `'debt-detail'` 的处理：

```typescript
// 在标题判断逻辑中添加
if (assetView === 'debt-detail') {
  return '债权资产';
}
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
curl "http://localhost:3000/api/debt-records?debug=1"
```

#### POST 接口
```bash
curl -X POST "http://localhost:3000/api/debt-records?debug=1&user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "loan_date": "2026-01-15T10:00:00.000Z",
    "debtor_name": "张三",
    "amount": 50000
  }'
```

### 5.3 前端测试

1. 登录应用
2. 点击债权资产卡片 → 应跳转到债权资产详情页
3. 验证债权总额、债权笔数、最早借款日期显示正确
4. 验证债权记录列表显示正确
5. 测试添加债权记录
6. 返回按钮正常工作

### 5.4 代码质量检查

```bash
pnpm build
pnpm lint
```

---

## 六、附录

### 6.1 回滚方案

```sql
DROP TRIGGER IF EXISTS trg_debt_record_updated_at ON public.debt_records;
DROP FUNCTION IF EXISTS public.update_debt_record_updated_at();
DROP TABLE IF EXISTS public.debt_records;
```

### 6.2 开发完成检查清单

#### 数据库
- [ ] 表创建成功
- [ ] RLS 策略配置正确（4 条）
- [ ] 触发器正常工作

#### 后端 API
- [ ] GET `/api/debt-records` 返回正确数据
- [ ] POST `/api/debt-records` 创建记录成功
- [ ] PATCH `/api/debt-records/[id]` 更新记录成功（预留）
- [ ] DELETE `/api/debt-records/[id]` 删除记录成功（预留）

#### 前端
- [ ] `DebtDetailPage` 正常显示
- [ ] `DebtRecordList` 正常显示
- [ ] 点击债权资产卡片可跳转
- [ ] `AddAssetModal` 债权类型调用 API
- [ ] 返回按钮正常工作

### 6.3 后续扩展规划

以下功能已在数据库和 API 层面预留，可在后续版本中添加：

1. **还款状态管理**
   - 添加 `status` 字段（进行中/已还清）
   - 添加 `repaid_date` 字段（还款日期）
   - 前端添加状态筛选和状态切换功能

2. **编辑和删除功能**
   - 前端添加编辑弹窗
   - 添加删除确认对话框
   - 调用已预留的 PATCH/DELETE API

3. **利息管理**
   - 添加 `interest_rate` 字段（年利率）
   - 添加 `expected_repay_date` 字段（预期还款日期）
   - 前端显示利息计算结果

---

**创建时间**: 2026-01-23
**作者**: Claude Code Assistant
