'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatNumber } from '@/utils';
import { RmbDepositChartItem } from '@/types';

interface RmbDepositChartProps {
  className?: string;
  chartData: RmbDepositChartItem[];
  isLoading?: boolean;
  error?: string | null;
}

interface ChartDataPoint {
  timestamp: number;
  cumulative: number;
  label: string;
  bankNames: string;
}

const RmbDepositChart: React.FC<RmbDepositChartProps> = ({ className, chartData: rawChartData, isLoading = false, error: externalError = null }) => {
  const [selectedPoint, setSelectedPoint] = useState<(ChartDataPoint & { x: number; y: number }) | null>(null);

  // 将传入的图表数据转换为图表点数据
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (rawChartData.length === 0) return [];

    return rawChartData.reduce((acc, item, index) => {
      const prevTotal = index > 0 ? acc[index - 1].cumulative : 0;
      const year = parseInt(item.date.substring(0, 4), 10);
      const month = parseInt(item.date.substring(4, 6), 10) - 1;
      const day = parseInt(item.date.substring(6, 8), 10);
      const date = new Date(year, month, day);
      const timestamp = date.getTime();
      const label = `${item.date.substring(4, 6)}/${item.date.substring(6, 8)}`;

      acc.push({
        timestamp,
        cumulative: prevTotal + item.amount,
        label,
        bankNames: item.bank_name
      });
      return acc;
    }, [] as ChartDataPoint[]);
  }, [rawChartData]);

  useEffect(() => {
    setSelectedPoint(null);
  }, [chartData]);

  const chartConfig = useMemo(() => {
    if (chartData.length === 0) {
      return null;
    }

    const width = 600;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const cumulatives = chartData.map(d => d.cumulative);
    const minCumulative = 0;
    const maxCumulative = cumulatives.length > 0 ? Math.max(...cumulatives) : 0;
    const cumulativeRange = maxCumulative - minCumulative || 1;
    const cumulativePadding = cumulativeRange * 0.1;

    const cumulativeMin = Math.max(0, minCumulative);
    const cumulativeMax = maxCumulative + cumulativePadding;

    const timestamps = chartData.map(d => d.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const timeRange = maxTime - minTime || 1;

    const points = chartData.map((point) => {
      const x = padding.left + (point.timestamp - minTime) / timeRange * chartWidth;
      const y = padding.top + chartHeight - ((point.cumulative - cumulativeMin) / (cumulativeMax - cumulativeMin)) * chartHeight;
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

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      cumulativeMin,
      cumulativeMax,
      points,
      pathData: smoothPathData,
      areaPath,
      labelPoints,
    };
  }, [chartData]);

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="text-slate-900 dark:text-white text-base font-bold">
        累计存款走势
      </div>

      <div className="rounded-2xl bg-surface-darker border border-[rgba(59,130,246,0.12)] overflow-hidden shadow-sm p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-slate-500 dark:text-slate-400 text-sm">加载中...</div>
          </div>
        ) : externalError ? (
          <div className="flex items-center justify-center h-[180px]">
            <div className="text-red-500 dark:text-red-400 text-sm">{externalError}</div>
          </div>
        ) : chartConfig && chartData.length > 0 ? (
          <div className="relative">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="text-slate-500 dark:text-slate-400 text-xs">当前累计</div>
                  <div className="text-blue-500 dark:text-blue-400 text-sm font-bold">
                    ¥{formatNumber(chartData[chartData.length - 1]?.cumulative || 0, 0)}
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
                <linearGradient id="rmbGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <path
                d={chartConfig.areaPath}
                fill="url(#rmbGradient)"
              />

              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartConfig.padding.top + chartConfig.chartHeight * (1 - ratio);
                const cumulative = chartConfig.cumulativeMin + (chartConfig.cumulativeMax - chartConfig.cumulativeMin) * ratio;
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
                      {formatNumber(cumulative, 0)}
                    </text>
                  </g>
                );
              })}

              <path
                d={chartConfig.pathData}
                fill="none"
                stroke="rgb(59, 130, 246)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
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
                金额
              </text>

              {selectedPoint && (
                <g pointerEvents="none">
                  <line
                    x1={selectedPoint.x}
                    y1={selectedPoint.y}
                    x2={selectedPoint.x}
                    y2={chartConfig.height - chartConfig.padding.bottom}
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={selectedPoint.x}
                    cy={selectedPoint.y}
                    r={4}
                    fill="rgb(59, 130, 246)"
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
                    ¥{formatNumber(selectedPoint.cumulative, 0)}
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

export default RmbDepositChart;
