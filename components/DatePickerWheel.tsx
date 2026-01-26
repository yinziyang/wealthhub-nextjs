"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface DatePickerWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  value?: Date;
  min?: Date;
  max?: Date;
  title?: string;
}

interface WheelColumnProps {
  items: { value: number; label: string }[];
  selectedValue: number;
  onChange: (value: number) => void;
  itemHeight?: number;
}

// 单个滚轮列 - 使用 transform 实现丝滑滚动
const WheelColumn = ({
  items,
  selectedValue,
  onChange,
  itemHeight = 44,
}: WheelColumnProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 使用 ref 存储 translateY 以避免闭包问题
  const translateYRef = useRef(0);
  const [, forceRender] = useState(0);

  // 拖拽状态
  const dragState = useRef({
    isDragging: false,
    startY: 0,
    startTranslateY: 0,
    // 用于计算速度的历史记录
    history: [] as { y: number; time: number }[],
  });

  // 动画帧 ID
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const visibleItems = 5;
  const containerHeight = itemHeight * visibleItems;
  const centerOffset = itemHeight * 2; // 中间位置的偏移

  // 更新 translateY 并触发重渲染
  const setTranslateY = useCallback((y: number) => {
    translateYRef.current = y;
    forceRender((n) => n + 1);
  }, []);

  // 根据选中值计算 translateY
  const selectedIndex = items.findIndex((item) => item.value === selectedValue);

  // 初始化位置（仅在选中值变化且不在拖拽时）
  useEffect(() => {
    if (
      selectedIndex >= 0 &&
      !dragState.current.isDragging &&
      !isAnimatingRef.current
    ) {
      const targetY = centerOffset - selectedIndex * itemHeight;
      translateYRef.current = targetY;
      forceRender((n) => n + 1);
    }
  }, [selectedIndex, itemHeight, centerOffset, items]);

  // 计算当前应该选中的索引
  const getSelectedIndex = useCallback(
    (y: number) => {
      const index = Math.round((centerOffset - y) / itemHeight);
      return Math.max(0, Math.min(items.length - 1, index));
    },
    [centerOffset, itemHeight, items.length],
  );

  // 计算释放时的速度（使用最近几个采样点）
  const calculateReleaseVelocity = useCallback(() => {
    const history = dragState.current.history;
    if (history.length < 2) return 0;

    // 只使用最近 80ms 内的采样点计算速度
    const now = Date.now();
    const recentHistory = history.filter((h) => now - h.time < 80);

    if (recentHistory.length < 2) {
      // 如果最近没有足够的采样点，使用最后两个点
      const last = history[history.length - 1];
      const prev = history[history.length - 2];
      const dt = last.time - prev.time;
      if (dt <= 0) return 0;
      return (last.y - prev.y) / dt;
    }

    // 使用线性回归计算速度
    const first = recentHistory[0];
    const last = recentHistory[recentHistory.length - 1];
    const dt = last.time - first.time;
    if (dt <= 0) return 0;

    return (last.y - first.y) / dt;
  }, []);

  // 惯性动画
  const startMomentum = useCallback(
    (initialVelocity: number) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      let velocity = initialVelocity * 16; // 转换为每帧的速度
      let currentY = translateYRef.current;

      // 根据速度调整摩擦力 - 速度越快，摩擦力越小，滑动越远
      const baseFriction = 0.96;
      const minFriction = 0.985; // 高速时的摩擦力
      const velocityThreshold = 20; // 速度阈值

      isAnimatingRef.current = true;

      const animate = () => {
        // 动态摩擦力：速度越快，摩擦力越小
        const absVelocity = Math.abs(velocity);
        const friction =
          absVelocity > velocityThreshold
            ? minFriction
            : baseFriction +
              (minFriction - baseFriction) * (absVelocity / velocityThreshold);

        velocity *= friction;
        currentY += velocity;

        // 边界回弹
        const minY = centerOffset - (items.length - 1) * itemHeight;
        const maxY = centerOffset;

        if (currentY > maxY) {
          currentY = maxY + (currentY - maxY) * 0.5;
          velocity *= -0.3;
        } else if (currentY < minY) {
          currentY = minY + (currentY - minY) * 0.5;
          velocity *= -0.3;
        }

        setTranslateY(currentY);

        // 速度足够小时，吸附到最近的项
        if (Math.abs(velocity) < 0.8) {
          // 开始吸附动画
          const targetIndex = getSelectedIndex(currentY);
          const snapTargetY = centerOffset - targetIndex * itemHeight;

          const snapAnimate = () => {
            const diff = snapTargetY - currentY;

            if (Math.abs(diff) < 0.5) {
              setTranslateY(snapTargetY);
              isAnimatingRef.current = false;

              // 更新选中值
              if (
                items[targetIndex] &&
                items[targetIndex].value !== selectedValue
              ) {
                onChange(items[targetIndex].value);
              }
              return;
            }

            // 平滑吸附
            currentY += diff * 0.2;
            setTranslateY(currentY);
            animationRef.current = requestAnimationFrame(snapAnimate);
          };

          animationRef.current = requestAnimationFrame(snapAnimate);
          return;
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [
      centerOffset,
      itemHeight,
      items,
      selectedValue,
      onChange,
      getSelectedIndex,
      setTranslateY,
    ],
  );

  // 动画到指定位置（用于点击选择）
  const animateTo = useCallback(
    (targetY: number) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      let currentY = translateYRef.current;
      isAnimatingRef.current = true;

      const animate = () => {
        const diff = targetY - currentY;

        if (Math.abs(diff) < 0.5) {
          setTranslateY(targetY);
          isAnimatingRef.current = false;

          const targetIndex = getSelectedIndex(targetY);
          if (
            items[targetIndex] &&
            items[targetIndex].value !== selectedValue
          ) {
            onChange(items[targetIndex].value);
          }
          return;
        }

        currentY += diff * 0.15;
        setTranslateY(currentY);
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [items, selectedValue, onChange, getSelectedIndex, setTranslateY],
  );

  // 点击选择
  const handleItemClick = useCallback(
    (index: number) => {
      if (isAnimatingRef.current || dragState.current.isDragging) return;
      const targetY = centerOffset - index * itemHeight;
      animateTo(targetY);
    },
    [centerOffset, itemHeight, animateTo],
  );

  // 使用原生事件监听器处理触摸
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      // 停止当前动画
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      isAnimatingRef.current = false;

      const touch = e.touches[0];
      dragState.current = {
        isDragging: true,
        startY: touch.clientY,
        startTranslateY: translateYRef.current,
        history: [{ y: touch.clientY, time: Date.now() }],
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!dragState.current.isDragging) return;

      // 阻止页面滚动
      e.preventDefault();

      const touch = e.touches[0];
      const deltaY = touch.clientY - dragState.current.startY;
      const newTranslateY = dragState.current.startTranslateY + deltaY;

      // 记录历史位置（保留最近 100ms 的记录）
      const now = Date.now();
      dragState.current.history.push({ y: touch.clientY, time: now });
      dragState.current.history = dragState.current.history.filter(
        (h) => now - h.time < 100,
      );

      // 边界阻尼效果
      const minY = centerOffset - (items.length - 1) * itemHeight;
      const maxY = centerOffset;

      let dampedY = newTranslateY;
      if (newTranslateY > maxY) {
        dampedY = maxY + (newTranslateY - maxY) * 0.3;
      } else if (newTranslateY < minY) {
        dampedY = minY + (newTranslateY - minY) * 0.3;
      }

      setTranslateY(dampedY);
    };

    const handleTouchEnd = () => {
      if (!dragState.current.isDragging) return;
      dragState.current.isDragging = false;

      // 计算释放速度并启动惯性动画
      const velocity = calculateReleaseVelocity();
      startMomentum(velocity);
    };

    // 使用 { passive: false } 以便能够 preventDefault
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    centerOffset,
    itemHeight,
    items.length,
    calculateReleaseVelocity,
    startMomentum,
    setTranslateY,
  ]);

  // 鼠标事件处理（桌面端）
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    isAnimatingRef.current = false;

    dragState.current = {
      isDragging: true,
      startY: e.clientY,
      startTranslateY: translateYRef.current,
      history: [{ y: e.clientY, time: Date.now() }],
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.current.isDragging) return;
      e.preventDefault();

      const deltaY = e.clientY - dragState.current.startY;
      const newTranslateY = dragState.current.startTranslateY + deltaY;

      const now = Date.now();
      dragState.current.history.push({ y: e.clientY, time: now });
      dragState.current.history = dragState.current.history.filter(
        (h) => now - h.time < 100,
      );

      const minY = centerOffset - (items.length - 1) * itemHeight;
      const maxY = centerOffset;

      let dampedY = newTranslateY;
      if (newTranslateY > maxY) {
        dampedY = maxY + (newTranslateY - maxY) * 0.3;
      } else if (newTranslateY < minY) {
        dampedY = minY + (newTranslateY - minY) * 0.3;
      }

      setTranslateY(dampedY);
    },
    [centerOffset, itemHeight, items.length, setTranslateY],
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.current.isDragging) return;
    dragState.current.isDragging = false;

    const velocity = calculateReleaseVelocity();
    startMomentum(velocity);
  }, [calculateReleaseVelocity, startMomentum]);

  // 清理动画
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const translateY = translateYRef.current;
  const isAnimating = isAnimatingRef.current;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden"
      style={{ height: containerHeight }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 选中区域指示器 */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-y border-primary/30 bg-primary/5"
        style={{
          top: itemHeight * 2,
          height: itemHeight,
        }}
      />

      {/* 上下渐变遮罩 */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#1a1a1a] to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#1a1a1a] to-transparent pointer-events-none z-20" />

      {/* 滚动内容 */}
      <div
        ref={contentRef}
        className="absolute left-0 right-0 select-none"
        style={{
          transform: `translateY(${translateY}px)`,
          willChange: "transform",
        }}
      >
        {items.map((item, index) => {
          // 计算当前项距离中心的距离，用于缩放效果
          const itemY = index * itemHeight;
          const centerY = centerOffset - translateY;
          const distance = Math.abs(itemY - centerY);
          const scale = Math.max(0.85, 1 - distance / (itemHeight * 3));
          const opacity = Math.max(0.4, 1 - distance / (itemHeight * 2.5));

          return (
            <div
              key={item.value}
              className="flex items-center justify-center cursor-pointer w-full"
              style={{
                height: itemHeight,
                transform: `scale(${scale})`,
                opacity,
                transition: isAnimating
                  ? "none"
                  : "transform 0.1s, opacity 0.1s",
              }}
              onClick={() => handleItemClick(index)}
            >
              <span
                className={`${
                  item.value === selectedValue
                    ? "text-white font-bold text-lg"
                    : "text-text-secondary text-base"
                } truncate`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 根据年月计算天数
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month, 0).getDate();
};

export const DatePickerWheel = ({
  isOpen,
  onClose,
  onConfirm,
  value,
  min,
  max,
  title = "选择日期",
}: DatePickerWheelProps) => {
  const now = new Date();
  const defaultMin = min || new Date(now.getFullYear() - 30, 0, 1);
  const defaultMax = max || new Date(now.getFullYear() + 10, 11, 31);

  const initialDate = value || (max && max < now ? max : now);
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    initialDate.getMonth() + 1,
  );
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());

  // 重置选中值
  useEffect(() => {
    if (isOpen) {
      const targetDate = value || (max && max < now ? max : now);
      setSelectedYear(targetDate.getFullYear());
      setSelectedMonth(targetDate.getMonth() + 1);
      setSelectedDay(targetDate.getDate());
    }
  }, [isOpen, value, max]);

  // 打开时禁止背景滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // 生成年份列表
  const years = useMemo(() => {
    const list = [];
    const minYear = defaultMin.getFullYear();
    const maxYear = defaultMax.getFullYear();
    for (let y = minYear; y <= maxYear; y++) {
      list.push({ value: y, label: `${y}年` });
    }
    return list;
  }, [defaultMin, defaultMax]);

  // 生成月份列表
  const months = useMemo(() => {
    const list = [];
    let minMonth = 1;
    let maxMonth = 12;

    if (selectedYear === defaultMin.getFullYear()) {
      minMonth = defaultMin.getMonth() + 1;
    }
    if (selectedYear === defaultMax.getFullYear()) {
      maxMonth = defaultMax.getMonth() + 1;
    }

    for (let m = minMonth; m <= maxMonth; m++) {
      list.push({ value: m, label: `${m}月` });
    }
    return list;
  }, [selectedYear, defaultMin, defaultMax]);

  // 生成天数列表
  const days = useMemo(() => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const list = [];
    let minDay = 1;
    let maxDay = daysInMonth;

    if (
      selectedYear === defaultMin.getFullYear() &&
      selectedMonth === defaultMin.getMonth() + 1
    ) {
      minDay = defaultMin.getDate();
    }
    if (
      selectedYear === defaultMax.getFullYear() &&
      selectedMonth === defaultMax.getMonth() + 1
    ) {
      maxDay = Math.min(maxDay, defaultMax.getDate());
    }

    for (let d = minDay; d <= maxDay; d++) {
      list.push({ value: d, label: `${d}日` });
    }
    return list;
  }, [selectedYear, selectedMonth, defaultMin, defaultMax]);

  // 当年份变化时，确保月份有效
  useEffect(() => {
    if (months.length > 0) {
      const monthValues = months.map((m) => m.value);
      if (!monthValues.includes(selectedMonth)) {
        setSelectedMonth(monthValues[monthValues.length - 1]);
      }
    }
  }, [months, selectedMonth]);

  // 当月份变化时，确保日期有效
  useEffect(() => {
    if (days.length > 0) {
      const dayValues = days.map((d) => d.value);
      if (!dayValues.includes(selectedDay)) {
        setSelectedDay(dayValues[dayValues.length - 1]);
      }
    }
  }, [days, selectedDay]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const date = new Date(selectedYear, selectedMonth - 1, selectedDay);
    onConfirm(date);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/30" onClick={onClose} />

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* Picker */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[210] bg-[#1a1a1a] border-t border-white/10 rounded-t-2xl overflow-hidden animate-[slideIn_0.2s_ease-out]"
        style={{ maxWidth: "100vw" }}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-white transition-colors text-sm"
          >
            取消
          </button>
          <span className="text-white font-medium">{title}</span>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-primary hover:text-primary/80 transition-colors text-sm font-bold"
          >
            确定
          </button>
        </div>

        {/* Wheels Container */}
        <div className="flex px-4 py-2 overflow-hidden" style={{ height: 220 }}>
          <div className="flex-[1.5] min-w-0 overflow-hidden">
            <WheelColumn
              items={years}
              selectedValue={selectedYear}
              onChange={setSelectedYear}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <WheelColumn
              items={months}
              selectedValue={selectedMonth}
              onChange={setSelectedMonth}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <WheelColumn
              items={days}
              selectedValue={selectedDay}
              onChange={setSelectedDay}
            />
          </div>
        </div>

        {/* Safe Area */}
        <div className="h-6" />
      </div>
    </>
  );
};
