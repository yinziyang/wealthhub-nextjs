# 资产组合聚合API开发计划（方案B - UNION ALL单次查询）

## 1. 需求背景

当前资产组合详情页面使用 `localStorage` 存储和展示假数据，需要设计一个聚合API从数据库获取真实数据。

## 2. 数据库表结构

### 2.1 gold_purchase_records（黄金买入记录）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID |
| purchase_date | timestamp | 购买日期 |
| weight | numeric | 克重 |
| gold_price_per_gram | numeric | 金价（元/克） |
| handling_fee_per_gram | numeric | 手续费（元/克） |
| purchase_channel | varchar(100) | 购买渠道 |
| total_price | numeric | 总价（自动计算） |
| average_price_per_gram | numeric | 平均克价（自动计算） |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 2.2 usd_purchase_records（美元购汇记录）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID |
| purchase_date | timestamp | 购汇日期 |
| usd_amount | numeric | 美元金额 |
| exchange_rate | numeric | 购汇汇率 |
| purchase_channel | varchar(100) | 购汇渠道 |
| total_rmb_amount | numeric | 折合人民币（自动计算） |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 2.3 rmb_deposit_records（人民币存款记录）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID |
| deposit_date | timestamp | 存款日期 |
| bank_name | varchar(100) | 银行名称 |
| amount | numeric | 存款金额 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

### 2.4 debt_records（债权资产记录）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 用户ID |
| loan_date | timestamp | 借款日期 |
| debtor_name | varchar(100) | 借款人 |
| amount | numeric | 借款金额 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

## 3. API设计

### 3.1 端点
```
GET /api/portfolio/all
```

### 3.2 响应格式
```typescript
interface PortfolioAllResponse {
  'gold-purchases': Record<string, GoldPurchaseRecord>;
  'debt-records': Record<string, DebtRecord>;
  'usd-purchases': Record<string, UsdPurchaseRecord>;
  'rmb-deposits': Record<string, RmbDepositRecord>;
}

// 成功响应示例
{
  "success": true,
  "data": {
    "gold-purchases": {
      "uuid-1": { "id": "uuid-1", "purchase_date": "...", "weight": 100, ... },
      "uuid-2": { "id": "uuid-2", "purchase_date": "...", "weight": 50, ... }
    },
    "debt-records": {
      "uuid-3": { "id": "uuid-3", "loan_date": "...", "debtor_name": "张三", "amount": 50000, ... }
    },
    "usd-purchases": {
      "uuid-4": { "id": "uuid-4", "purchase_date": "...", "usd_amount": 10000, "exchange_rate": 7.2, ... }
    },
    "rmb-deposits": {
      "uuid-5": { "id": "uuid-5", "deposit_date": "...", "bank_name": "工商银行", "amount": 100000, ... }
    }
  },
  "message": "获取资产组合数据成功"
}
```

## 4. 方案B：UNION ALL 单次查询

### 4.1 Supabase 数据库函数

在 Supabase SQL Editor 中执行以下DDL，创建存储过程：

```sql
-- 创建资产组合聚合查询函数
CREATE OR REPLACE FUNCTION get_portfolio_all()
RETURNS TABLE (
  record_type TEXT,
  record_id UUID,
  record_data JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- 黄金买入记录
  SELECT
    'gold-purchases'::TEXT as record_type,
    id as record_id,
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'purchase_date', purchase_date,
      'weight', weight,
      'gold_price_per_gram', gold_price_per_gram,
      'handling_fee_per_gram', handling_fee_per_gram,
      'purchase_channel', purchase_channel,
      'total_price', total_price,
      'average_price_per_gram', average_price_per_gram,
      'created_at', created_at,
      'updated_at', updated_at
    ) as record_data
  FROM gold_purchase_records
  WHERE user_id = auth.uid()

  UNION ALL

  -- 美元购汇记录
  SELECT
    'usd-purchases'::TEXT as record_type,
    id as record_id,
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'purchase_date', purchase_date,
      'usd_amount', usd_amount,
      'exchange_rate', exchange_rate,
      'purchase_channel', purchase_channel,
      'total_rmb_amount', total_rmb_amount,
      'created_at', created_at,
      'updated_at', updated_at
    ) as record_data
  FROM usd_purchase_records
  WHERE user_id = auth.uid()

  UNION ALL

  -- 人民币存款记录
  SELECT
    'rmb-deposits'::TEXT as record_type,
    id as record_id,
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'deposit_date', deposit_date,
      'bank_name', bank_name,
      'amount', amount,
      'created_at', created_at,
      'updated_at', updated_at
    ) as record_data
  FROM rmb_deposit_records
  WHERE user_id = auth.uid()

  UNION ALL

  -- 债权资产记录
  SELECT
    'debt-records'::TEXT as record_type,
    id as record_id,
    jsonb_build_object(
      'id', id,
      'user_id', user_id,
      'loan_date', loan_date,
      'debtor_name', debtor_name,
      'amount', amount,
      'created_at', created_at,
      'updated_at', updated_at
    ) as record_data
  FROM debt_records
  WHERE user_id = auth.uid();
$$;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION get_portfolio_all() TO authenticated;
```

### 4.2 性能测试SQL（直接在Supabase SQL Editor测试）

```sql
-- 性能测试：替换 'your-user-id' 为实际用户ID
EXPLAIN ANALYZE
SELECT
  'gold-purchases'::TEXT as record_type,
  id as record_id,
  jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'purchase_date', purchase_date,
    'weight', weight,
    'gold_price_per_gram', gold_price_per_gram,
    'handling_fee_per_gram', handling_fee_per_gram,
    'purchase_channel', purchase_channel,
    'total_price', total_price,
    'average_price_per_gram', average_price_per_gram,
    'created_at', created_at,
    'updated_at', updated_at
  ) as record_data
FROM gold_purchase_records
WHERE user_id = 'your-user-id'::uuid

UNION ALL

SELECT
  'usd-purchases'::TEXT as record_type,
  id as record_id,
  jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'purchase_date', purchase_date,
    'usd_amount', usd_amount,
    'exchange_rate', exchange_rate,
    'purchase_channel', purchase_channel,
    'total_rmb_amount', total_rmb_amount,
    'created_at', created_at,
    'updated_at', updated_at
  ) as record_data
FROM usd_purchase_records
WHERE user_id = 'your-user-id'::uuid

UNION ALL

SELECT
  'rmb-deposits'::TEXT as record_type,
  id as record_id,
  jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'deposit_date', deposit_date,
    'bank_name', bank_name,
    'amount', amount,
    'created_at', created_at,
    'updated_at', updated_at
  ) as record_data
FROM rmb_deposit_records
WHERE user_id = 'your-user-id'::uuid

UNION ALL

SELECT
  'debt-records'::TEXT as record_type,
  id as record_id,
  jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'loan_date', loan_date,
    'debtor_name', debtor_name,
    'amount', amount,
    'created_at', created_at,
    'updated_at', updated_at
  ) as record_data
FROM debt_records
WHERE user_id = 'your-user-id'::uuid;
```

### 4.3 后端数据转换逻辑

```typescript
// API调用RPC函数后，需要将扁平数组转换为嵌套对象格式
interface RpcResult {
  record_type: 'gold-purchases' | 'usd-purchases' | 'rmb-deposits' | 'debt-records';
  record_id: string;
  record_data: GoldPurchaseRecord | UsdPurchaseRecord | RmbDepositRecord | DebtRecord;
}

function transformToPortfolioResponse(rows: RpcResult[]): PortfolioAllResponse {
  const result: PortfolioAllResponse = {
    'gold-purchases': {},
    'usd-purchases': {},
    'rmb-deposits': {},
    'debt-records': {},
  };

  for (const row of rows) {
    result[row.record_type][row.record_id] = row.record_data;
  }

  return result;
}
```

## 5. 文件修改清单

### 5.1 数据库变更（手动执行）
| 操作 | 说明 |
|------|------|
| 创建函数 `get_portfolio_all()` | 在Supabase SQL Editor执行上述DDL |

### 5.2 新建文件
| 文件路径 | 说明 |
|----------|------|
| `app/api/portfolio/all/route.ts` | 资产组合聚合API |
| `lib/api/portfolio.ts` | 前端调用函数 |

### 5.3 修改文件
| 文件路径 | 修改内容 |
|----------|----------|
| `types.ts` | 添加 `PortfolioAllResponse` 和 `PortfolioRpcResult` 类型定义 |
| `app/page.tsx` | 从API获取数据替代localStorage |

## 6. 实施步骤

### Step 1: 在Supabase创建数据库函数
- 登录Supabase控制台
- 进入SQL Editor
- 执行第4.1节的DDL语句
- 验证函数创建成功

### Step 2: 添加类型定义（types.ts）

```typescript
// RPC函数返回的单条记录类型
export interface PortfolioRpcResult {
  record_type: 'gold-purchases' | 'usd-purchases' | 'rmb-deposits' | 'debt-records';
  record_id: string;
  record_data: GoldPurchaseRecord | UsdPurchaseRecord | RmbDepositRecord | DebtRecord;
}

// 资产组合聚合响应类型
export interface PortfolioAllResponse {
  'gold-purchases': Record<string, GoldPurchaseRecord>;
  'debt-records': Record<string, DebtRecord>;
  'usd-purchases': Record<string, UsdPurchaseRecord>;
  'rmb-deposits': Record<string, RmbDepositRecord>;
}
```

### Step 3: 创建API端点（app/api/portfolio/all/route.ts）

```typescript
import { NextRequest } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { createServerSupabaseClient } from '@/lib/supabase-client';
import {
  successResponse,
  errorResponse,
  ErrorCode,
} from '@/lib/api-response';
import type { PortfolioAllResponse, PortfolioRpcResult } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await checkApiAuth(request);
  if (!auth.authorized) {
    return errorResponse(ErrorCode.AUTH_UNAUTHORIZED, '未授权访问');
  }

  try {
    const supabase = await createServerSupabaseClient();

    // 调用RPC函数，单次查询获取所有数据
    const { data, error } = await supabase.rpc('get_portfolio_all');

    if (error) {
      console.error('获取资产组合数据失败:', error);
      return errorResponse(
        ErrorCode.SERVER_DATABASE_ERROR,
        '获取资产组合数据失败',
        undefined,
        { supabaseError: error.message }
      );
    }

    // 转换为目标格式
    const result: PortfolioAllResponse = {
      'gold-purchases': {},
      'usd-purchases': {},
      'rmb-deposits': {},
      'debt-records': {},
    };

    if (data && Array.isArray(data)) {
      for (const row of data as PortfolioRpcResult[]) {
        result[row.record_type][row.record_id] = row.record_data;
      }
    }

    return successResponse(result, '获取资产组合数据成功');
  } catch (err) {
    console.error('获取资产组合数据异常:', err);
    return errorResponse(
      ErrorCode.SERVER_INTERNAL_ERROR,
      '服务器内部错误'
    );
  }
}
```

### Step 4: 创建前端调用函数（lib/api/portfolio.ts）

```typescript
import type { PortfolioAllResponse } from '@/types';

export async function fetchPortfolioAll(): Promise<PortfolioAllResponse> {
  const response = await fetch('/api/portfolio/all');
  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || '获取资产组合数据失败');
  }

  return result.data;
}
```

### Step 5: 修改主页面（app/page.tsx）

主要变更：
1. 移除 localStorage 相关代码
2. 添加 `useEffect` 调用 `fetchPortfolioAll()`
3. 根据返回数据计算各类资产总额
4. 生成4条 Asset 记录用于展示

```typescript
// 数据计算逻辑
const calculateAssets = (
  portfolio: PortfolioAllResponse,
  goldPrice: number,    // 当前金价
  exchangeRate: number  // 当前汇率
): Asset[] => {
  // 黄金资产：总克重 × 当前金价
  const goldRecords = Object.values(portfolio['gold-purchases']);
  const totalWeight = goldRecords.reduce((sum, r) => sum + r.weight, 0);
  const goldAmount = totalWeight * goldPrice;

  // 美元资产：总美元 × 当前汇率
  const usdRecords = Object.values(portfolio['usd-purchases']);
  const totalUsd = usdRecords.reduce((sum, r) => sum + r.usd_amount, 0);
  const usdAmount = totalUsd * exchangeRate;

  // 人民币存款：直接求和
  const rmbRecords = Object.values(portfolio['rmb-deposits']);
  const rmbAmount = rmbRecords.reduce((sum, r) => sum + r.amount, 0);

  // 债权资产：直接求和
  const debtRecords = Object.values(portfolio['debt-records']);
  const debtAmount = debtRecords.reduce((sum, r) => sum + r.amount, 0);

  return [
    createAssetObject('rmb', '人民币存款', rmbAmount, true, {}, today, 'portfolio-rmb'),
    createAssetObject('usd', '美元资产', usdAmount, true, { usdAmount: totalUsd, exchangeRate }, today, 'portfolio-usd'),
    createAssetObject('gold', '实物黄金', goldAmount, true, { weight: totalWeight, goldPrice }, today, 'portfolio-gold'),
    createAssetObject('debt', '债权资产', debtAmount, true, {}, today, 'portfolio-debt'),
  ];
};
```

## 7. 数据正确性保障

### 7.1 RPC函数使用 `auth.uid()` 自动过滤当前用户数据
- 无需在API层手动传递user_id
- 防止数据泄露风险

### 7.2 JSONB保持原始数据类型
- 数值类型不会丢失精度
- 时间戳保持ISO 8601格式

### 7.3 空数据处理
- 表无数据时返回空数组
- 转换后为空对象 `{}`

## 8. 测试验证

### 8.1 数据库函数测试
```sql
-- 在Supabase SQL Editor中以认证用户身份测试
SELECT * FROM get_portfolio_all();
```

### 8.2 API测试
```bash
# 获取资产组合数据
curl -X GET http://localhost:3000/api/portfolio/all \
  -H "Cookie: sb-xxx-auth-token=xxx"
```

### 8.3 前端测试场景
| 场景 | 预期结果 |
|------|----------|
| 新用户无数据 | 显示4个资产卡片，金额均为0 |
| 仅有黄金记录 | 黄金有金额，其他为0 |
| 全部有数据 | 4个资产卡片显示正确总额 |

## 9. 时序图

```
┌─────────┐    ┌─────────┐    ┌──────────┐
│  前端   │    │   API   │    │ Supabase │
└────┬────┘    └────┬────┘    └────┬─────┘
     │              │              │
     │ GET /api/portfolio/all      │
     │─────────────>│              │
     │              │              │
     │              │ RPC: get_portfolio_all()
     │              │─────────────>│
     │              │              │
     │              │  UNION ALL单次查询
     │              │  (4表合并结果)   │
     │              │<─────────────│
     │              │              │
     │              │ 转换为嵌套对象格式
     │              │              │
     │   返回聚合数据 │              │
     │<─────────────│              │
     │              │              │
     │   计算资产总值、渲染页面       │
     │              │              │
```

---

**下一步：请先在Supabase SQL Editor中执行第4.1节的DDL创建数据库函数，然后告诉我继续实施后端和前端代码。**
