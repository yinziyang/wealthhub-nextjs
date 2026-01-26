'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatNumber } from '@/utils';
import type { MarketDataHistoryResponse } from '@/lib/api-response';

type TimeRange = '30d' | '90d' | '1y';

interface UsdExchangeRateChartProps {
  className?: string;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  label: string;
}

const UsdExchangeRateChart: React.FC<UsdExchangeRateChartProps> = ({ className }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<(ChartDataPoint & { x: number; y: number }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let url: string;
        if (timeRange === '30d') {
          url = '/api/market-data/history?days=30';
        } else if (timeRange === '90d') {
          url = '/api/market-data/history?days=90';
        } else {
          url = '/api/market-data/history?days=365';
        }

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

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [timeRange]);

  useEffect(() => {
    setSelectedPoint(null);
  }, [timeRange, chartData]);

  const parseMarketData = (
    data: MarketDataHistoryResponse,
    range: TimeRange
  ): ChartDataPoint[] => {
    const exchangeRates = data.exchange_rate || {};
    const points: ChartDataPoint[] = [];
    const today = new Date();
    const dateRange: string[] = [];
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 365;

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}${month}${day}`;
      dateRange.push(dateKey);
    }

    dateRange.reverse();

    dateRange.forEach((dateKey) => {
      const year = parseInt(dateKey.substring(0, 4));
      const month = parseInt(dateKey.substring(4, 6)) - 1;
      const day = parseInt(dateKey.substring(6, 8));

      const timestamp = new Date(year, month, day, 12, 0, 0).getTime();
      const price = exchangeRates[dateKey] || 0;

      const label = `${String(month + 1).padStart(2, '0')}/${String(day).padStart(2, '0')}`;

      points.push({ timestamp, price, label });
    });

    return points.sort((a, b) => a.timestamp - b.timestamp);
  };

  const chartConfig = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }

    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const validPrices = chartData.map(d => d.price).filter(p => p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
    const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.1;

    const priceMin = Math.max(0, minPrice - pricePadding);
    const priceMax = maxPrice + pricePadding;

    const timestamps = chartData.map(d => d.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1;

    const points = chartData.map((point) => {
      const x = padding.left + (point.timestamp - minTime) / timeRange * chartWidth;
      let y: number;
      if (point.price === 0) {
        y = padding.top + chartHeight;
      } else {
        y = padding.top + chartHeight - ((point.price - priceMin) / (priceMax - priceMin)) * chartHeight;
      }
      return { x, y, ...point };
    });

    const generateSmoothPath = (pts: Array<ChartDataPoint & { x: number; y: number }>) => {
      if (pts.length === 0) return '';
      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

      let path = `M ${pts[0].x} ${pts[0].y}`;

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];

        const cp1x = p0.x + (p1.x - p0.x) / 3;
        const cp1y = p0.y;
        const cp2x = p1.x - (p1.x - p0.x) / 3;
        const cp2y = p1.y;

        path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
      }
      return path;
    };

    const smoothPathData = generateSmoothPath(points);
    const areaPath = `${smoothPathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

    const labelCount = Math.min(5, points.length);
    const labelStep = Math.floor(points.length / labelCount);
    const labelPoints = points.filter((_, index) => index % labelStep === 0 || index === points.length - 1);

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
      pathData: smoothPathData,
      areaPath,
      labelPoints,
      highestPrice,
      lowestPrice,
    };
  }, [chartData]);

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <div className="text-slate-900 dark:text-white text-base font-bold">
          汇率走势
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timeRange === '30d'
              ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
          >
            30天
          </button>
          <button
            onClick={() => setTimeRange('90d')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timeRange === '90d'
              ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
          >
            90天
          </button>
          <button
            onClick={() => setTimeRange('1y')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${timeRange === '1y'
              ? 'bg-emerald-500 dark:bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
          >
            一年
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-surface-darker border border-[rgba(34,197,94,0.12)] overflow-hidden shadow-sm p-4">
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
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-500 dark:text-slate-400 text-xs">最高</div>
                  <div className="text-emerald-500 dark:text-emerald-400 text-sm font-bold">
                    {formatNumber(chartConfig.highestPrice, 4)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-500 dark:text-slate-400 text-xs">最低</div>
                  <div className="text-red-500 dark:text-red-400 text-sm font-bold">
                    {formatNumber(chartConfig.lowestPrice, 4)}
                  </div>
                </div>
              </div>
            </div>
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
              className="overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="usdGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <path
                d={chartConfig.areaPath}
                fill="url(#usdGradient)"
              />

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
                      {formatNumber(price, 2)}
                    </text>
                  </g>
                );
              })}

              <path
                d={chartConfig.pathData}
                fill="none"
                stroke="rgb(16, 185, 129)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={chartConfig.points.some(p => p.price === 0) ? "4,2" : "none"}
                opacity={chartConfig.points.some(p => p.price === 0) ? 0.5 : 1}
              />

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

              <text
                x={chartConfig.padding.left - 8}
                y={chartConfig.padding.top - 8}
                textAnchor="end"
                fontSize="10"
                fill="currentColor"
                className="text-slate-500 dark:text-slate-400"
              >
                汇率
              </text>

              {selectedPoint && (
                <g pointerEvents="none">
                  <line
                    x1={selectedPoint.x}
                    y1={selectedPoint.y}
                    x2={selectedPoint.x}
                    y2={chartConfig.height - chartConfig.padding.bottom}
                    stroke="rgb(16, 185, 129)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={selectedPoint.x}
                    cy={selectedPoint.y}
                    r={4}
                    fill="rgb(16, 185, 129)"
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={selectedPoint.x}
                    y={selectedPoint.y - 12 < chartConfig.padding.top ? selectedPoint.y + 24 : selectedPoint.y - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="bold"
                    className="fill-slate-900 dark:fill-white"
                  >
                    {formatNumber(selectedPoint.price, 4)} 汇率
                  </text>
                </g>
              )}

              {chartConfig.points.map((point, index) => {
                const prevX = index > 0 ? chartConfig.points[index - 1].x : chartConfig.padding.left;
                const nextX = index < chartConfig.points.length - 1 ? chartConfig.points[index + 1].x : chartConfig.width - chartConfig.padding.right;

                const startX = index === 0 ? chartConfig.padding.left : (prevX + point.x) / 2;
                const endX = index === chartConfig.points.length - 1 ? chartConfig.width - chartConfig.padding.right : (point.x + nextX) / 2;

                return (
                  <rect
                    key={index}
                    x={startX}
                    y={chartConfig.padding.top}
                    width={endX - startX}
                    height={chartConfig.chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => setSelectedPoint(point)}
                  />
                );
              })}
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

export default UsdExchangeRateChart;
