'use client';

import { useMemo } from 'react';
import { Tag } from 'lucide-react';
import { PieChart, Pie, Cell, Label } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

export interface CategoryData {
  name: string;
  value: number;
  count: number;
  color: string;
  [key: string]: string | number;
}

interface CategoryPieChartProps {
  data: CategoryData[];
  totalAmount: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatCurrencyCompact = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
};

export default function CategoryPieChart({
  data,
  totalAmount,
}: CategoryPieChartProps) {
  // Build chart config dynamically from data
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((category) => {
      config[category.name] = {
        label: category.name,
        color: category.color,
      };
    });
    return config;
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-xl md:text-2xl font-bold">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
        {data.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Tag className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-xs sm:text-sm">No category data yet</p>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto h-[200px] sm:h-[260px] md:h-[300px] w-full max-w-[300px] sm:max-w-none"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs sm:text-sm">{name}</span>
                          <span className="text-xs sm:text-sm">{formatCurrency(Number(value) || 0)}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="70%"
                  paddingAngle={2}
                  strokeWidth={1}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={entry.color}
                    />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 8}
                              className="fill-muted-foreground text-[10px] sm:text-xs"
                            >
                              Total
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 10}
                              className="fill-foreground text-sm sm:text-lg md:text-xl font-bold"
                            >
                              {formatCurrencyCompact(totalAmount)}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Category Legend */}
            <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-x-2 gap-y-1.5 sm:gap-2 px-1 sm:px-0">
              {data.slice(0, 6).map((category) => (
                <div key={category.name} className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate flex-1">
                    {category.name}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground/70 flex-shrink-0">
                    {totalAmount > 0
                      ? ((category.value / totalAmount) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
