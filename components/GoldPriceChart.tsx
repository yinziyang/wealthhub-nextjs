'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse, MarketDataHourlyHistoryResponse } from '@/lib/api-response';

type TimeRange = '24h' | '30d';

interface GoldPriceChartProps {
  className?: string;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  label: string;
}

const GoldPriceChart: React.FC<GoldPriceChartProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取市场数据
  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = timeRange === '24h' 
          ? '/api/market-data/history?hours=24'
          : '/api/market-data/history?days=30';
        
        const response = await fetch(url, {
          signal: controller.signal
        });
        
        const result = await response.json();
        
        if (!controller.signal.aborted) {
          if (result.success) {
            const data = parseMarketData(result.data, timeRange);
            setChartData(data);
          } else {
            setError('获取数据失败');
            setChartData([]);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('网络错误');
        setChartData([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    timeoutId = setTimeout(() => {
      fetchData();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [timeRange]);

  // 解析市场数据为图表数据点
  const parseMarketData = (
    data: MarketDataHistoryResponse | MarketDataHourlyHistoryResponse,
    range: TimeRange
  ): ChartDataPoint[] => {
    const goldPrices = data.gold_price || {};
    const points: ChartDataPoint[] = [];

    if (range === '24h') {
      // 按小时数据：格式 "2026012020" (北京时间)
      const sortedKeys = Object.keys(goldPrices)
        .filter(key => goldPrices[key] > 0)
        .sort((a, b) => a.localeCompare(b));

      sortedKeys.forEach((key) => {
        const year = parseInt(key.substring(0, 4));
        const month = parseInt(key.substring(4, 6)) - 1;
        const day = parseInt(key.substring(6, 8));
        const hour = parseInt(key.substring(8, 10));

        // hour_key 已经是北京时间，直接创建本地时间对象
        // 使用本地时间构造函数，浏览器会自动处理时区
        const timestamp = new Date(year, month, day, hour, 0, 0).getTime();
        const price = goldPrices[key];
        
        // 标签格式：HH:mm
        const label = `${String(hour).padStart(2, '0')}:00`;

        points.push({ timestamp, price, label });
      });
    } else {
      // 按天数据：格式 "20260101" (北京时间)
      // 生成完整的30天日期范围
      const today = new Date();
      const dateRange: string[] = [];
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}${month}${day}`;
        dateRange.push(dateKey);
      }
      
      // 反转数组，使最早的日期在前
      dateRange.reverse();
      
      // 为每一天创建数据点，即使价格为0也要包含
      dateRange.forEach((dateKey) => {
        const year = parseInt(dateKey.substring(0, 4));
        const month = parseInt(dateKey.substring(4, 6)) - 1;
        const day = parseInt(dateKey.substring(6, 8));

        // date_key 已经是北京时间，使用中午12点作为该日期的代表时间
        const timestamp = new Date(year, month, day, 12, 0, 0).getTime();
        // 如果该日期有数据则使用，否则为0
        const price = goldPrices[dateKey] || 0;
        
        // 标签格式：MM/DD
        const label = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

        points.push({ timestamp, price, label });
      });
    }

    return points.sort((a, b) => a.timestamp - b.timestamp);
  };

  // 计算图表尺寸和坐标
  const chartConfig = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }

    const width = 320;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 过滤掉价格为0的数据点来计算价格范围（但保留所有数据点用于绘制）
    const validPrices = chartData.map(d => d.price).filter(p => p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.1; // 10% 的上下边距

    const priceMin = Math.max(0, minPrice - pricePadding);
    const priceMax = maxPrice + pricePadding;

    // 计算 X 坐标（时间）
    const timestamps = chartData.map(d => d.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1;

    // 生成路径点
    const points = chartData.map((point, index) => {
      const x = padding.left + (point.timestamp - minTime) / timeRange * chartWidth;
      // 如果价格为0，显示在图表底部；否则按正常比例计算
      let y: number;
      if (point.price === 0) {
        y = padding.top + chartHeight; // 底部
      } else {
        y = padding.top + chartHeight - ((point.price - priceMin) / (priceMax - priceMin)) * chartHeight;
      }
      return { x, y, ...point };
    });

    // 生成折线路径
    const pathData = points.map((point, index) => {
      return index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`;
    }).join(' ');

    // 生成区域路径（用于渐变填充）
    const areaPath = `${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    // 选择要显示的标签（最多显示 5 个）
    const labelCount = Math.min(5, points.length);
    const labelStep = Math.floor(points.length / labelCount);
    const labelPoints = points.filter((_, index) => index % labelStep === 0 || index === points.length - 1);

    // 计算最高价和最低价（使用之前已经计算的 validPrices）
    const highestPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      priceMin,
      priceMax,
      points,
      pathData,
      areaPath,
      labelPoints,
      highestPrice,
      lowestPrice,
    };
  }, [chartData]);

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          价格走势
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              timeRange === '24h'
                ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            24小时
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              timeRange === '30d'
                ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            30天
          </button>
        </div>
      </div>

      {/* 图表容器 */}
      <div className="rounded-2xl bg-surface-darker border border-[rgba(167,125,47,0.12)] overflow-hidden shadow-sm p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-slate-500 dark:text-slate-400 text-sm">加载中...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>
          </div>
        ) : chartConfig && chartData.length > 0 ? (
          <div className="relative">
            {/* 最高价和最低价显示 */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-500 dark:text-slate-400 text-xs">最高</div>
                  <div className="text-emerald-500 dark:text-emerald-400 text-sm font-bold">
                    ¥{formatNumber(chartConfig.highestPrice, 0)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-500 dark:text-slate-400 text-xs">最低</div>
                  <div className="text-red-500 dark:text-red-400 text-sm font-bold">
                    ¥{formatNumber(chartConfig.lowestPrice, 0)}
                  </div>
                </div>
              </div>
            </div>
            <svg
              width={chartConfig.width}
              height={chartConfig.height}
              className="overflow-visible"
            >
              {/* 渐变定义 */}
              <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(234, 179, 8)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(234, 179, 8)" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* 背景区域填充 */}
              <path
                d={chartConfig.areaPath}
                fill="url(#goldGradient)"
              />

              {/* 网格线 */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartConfig.padding.top + chartConfig.chartHeight * (1 - ratio);
                const price = chartConfig.priceMin + (chartConfig.priceMax - chartConfig.priceMin) * ratio;
                return (
                  <g key={ratio}>
                    <line
                      x1={chartConfig.padding.left}
                      y1={y}
                      x2={chartConfig.padding.left + chartConfig.chartWidth}
                      y2={y}
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeOpacity="0.1"
                      className="text-slate-400 dark:text-slate-600"
                    />
                    <text
                      x={chartConfig.padding.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="currentColor"
                      className="text-slate-500 dark:text-slate-400"
                    >
                      {formatNumber(price, 0)}
                    </text>
                  </g>
                );
              })}

              {/* 折线 */}
              <path
                d={chartConfig.pathData}
                fill="none"
                stroke="rgb(234, 179, 8)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={chartConfig.points.some(p => p.price === 0) ? "4,2" : "none"}
                opacity={chartConfig.points.some(p => p.price === 0) ? 0.5 : 1}
              />

              {/* 数据点（只显示价格大于0的点） */}
              {chartConfig.points
                .filter(point => point.price > 0)
                .map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r="3"
                    fill="rgb(234, 179, 8)"
                    stroke="white"
                    strokeWidth="2"
                    className="dark:stroke-slate-900"
                  />
                ))}

              {/* X 轴标签 */}
              {chartConfig.labelPoints.map((point, index) => (
                <text
                  key={index}
                  x={point.x}
                  y={chartConfig.height - chartConfig.padding.bottom + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  className="text-slate-500 dark:text-slate-400"
                >
                  {point.label}
                </text>
              ))}

              {/* Y 轴单位标签 */}
              <text
                x={chartConfig.padding.left - 8}
                y={chartConfig.padding.top - 8}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                className="text-slate-500 dark:text-slate-400"
              >
                元/克
              </text>
            </svg>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-slate-500 dark:text-slate-400 text-sm">暂无数据</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoldPriceChart;
