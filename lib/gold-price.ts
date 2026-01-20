/**
 * 金价服务模块
 * 提供菜百投资金价实时查询功能
 */

import { httpPost } from './http-client';

/** 菜百 API 响应结构 */
interface CaibaiResponse {
  JsonResult: string;
  JsonMessage: {
    MessageIndex: string;
    Remark: string;
    MessageInfo: string;
  };
  JsonData: Array<{
    SQLBuilderID: string;
    FIELD: Array<{
      attrname: string;
      fieldtype: string;
      WIDTH: string;
    }>;
    ROW: Array<GoldPriceRow>;
  }>;
}

/** 金价数据行 */
interface GoldPriceRow {
  /** 类型名称 */
  FKIND_NAME: string;
  /** 基础金价（元/克） */
  FPRICE_BASE: string;
  /** 更新时间 */
  FNEWTIME: string;
  /** 顶部备注 */
  FTOP_REMARK: string;
  /** 备注 */
  FREMARK: string;
}

/** 金价信息 */
export interface GoldPriceInfo {
  /** 类型名称（如：菜百投资基础金价） */
  name: string;
  /** 价格（元/克） */
  price: number;
  /** 更新时间 */
  updateTime: string;
  /** 顶部备注 */
  topRemark: string;
  /** 备注 */
  remark: string;
}

const CAIBAI_API = 'http://111.198.86.222/BAP/OpenApi';
const TIMEOUT_MS = 30_000;

/** 菜百 API 请求体 */
const CAIBAI_REQUEST_BODY = {
  Context: {
    token: '',
    version: '',
    from: '2',
    mchid: '',
    appid: '',
    timestamp: '',
  },
  SQLBuilderItem: [
    {
      SQLBuilderID: '{005A5001-B9AD-41CB-8409-8F7675D19143}',
      TableName: 'BS_POS_GP_MA',
      Caption: '每日金价',
      Select: {
        FMID: '{4F054C98-16B8-8A9E-3112-F8AFC1BC77E9}',
        FPID: '{4F054C98-16B8-8A9E-3112-F8AFC1BC77E9}',
        FTID: '',
        FUID: '',
        FOID: '{7D77D027-9824-4156-A25E-12FC59527DDE}',
        FWID: '',
        FORG_STORE_ID: '',
      },
    },
  ],
};

/**
 * 获取菜百投资金价
 * 超时时间：30 秒
 * @returns 金价信息
 */
export async function getCaibaiGoldPrice(): Promise<GoldPriceInfo> {
  const response = await httpPost<CaibaiResponse>(
    CAIBAI_API,
    CAIBAI_REQUEST_BODY,
    { timeout: TIMEOUT_MS }
  );

  // 检查是否有有效数据
  if (
    !response.JsonData?.length ||
    !response.JsonData[0].ROW?.length
  ) {
    throw new Error('金价数据不可用');
  }

  // 获取最后一条数据（最新金价）
  const rows = response.JsonData[0].ROW;
  const lastRow = rows[rows.length - 1];

  const price = parseFloat(lastRow.FPRICE_BASE);
  if (isNaN(price)) {
    throw new Error('金价数据格式错误');
  }

  return {
    name: lastRow.FKIND_NAME,
    price,
    updateTime: lastRow.FNEWTIME,
    topRemark: lastRow.FTOP_REMARK,
    remark: lastRow.FREMARK,
  };
}
