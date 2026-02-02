'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { Bar, XAxis, YAxis, ReferenceLine, ComposedChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

export interface MonthlyData {
  month: string;
  monthFull: string;
  amount: number;
  monthIndex: number;
  year: number;
}

export interface MonthComparisonData {
  month: string;
  'Last Month': number;
  'This Month': number;
}

interface SpendingTrendChartProps {
  monthlyData: MonthlyData[];
  comparisonData: MonthComparisonData[];
  averageAmount?: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatCurrencyCompact = (amount: number) => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount}`;
};

const monthlyChartConfig = {
  amount: {
    label: 'Spending',
    color: '#06B6D4',
  },
  average: {
    label: 'Average',
    color: '#94A3B8',
  },
} satisfies ChartConfig;

export default function SpendingTrendChart({
  monthlyData,
  comparisonData,
  averageAmount = 0,
}: SpendingTrendChartProps) {
  const router = useRouter();
  const hasMonthlyData = monthlyData.some((d) => d.amount > 0);

  // Add average to data for legend display
  const dataWithAverage = monthlyData.map((d) => ({
    ...d,
    average: averageAmount,
  }));

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-6">
        <CardTitle className="text-base sm:text-xl md:text-2xl font-bold">
          Monthly Spending Trend
        </CardTitle>
        {averageAmount > 0 && hasMonthlyData && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            6-month average: <span className="font-semibold text-cyan-600">{formatCurrency(averageAmount)}</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
        {!hasMonthlyData ? (
          <div className="text-center py-8 sm:py-12">
            <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-xs sm:text-sm">No data for trend analysis</p>
          </div>
        ) : (
          <ChartContainer config={monthlyChartConfig} className="h-[200px] sm:h-[240px] md:h-[280px] w-full">
            <ComposedChart
              data={dataWithAverage}
              accessibilityLayer
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                fontSize={10}
                interval={0}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tickLine={false}
                tickMargin={5}
                axisLine={false}
                width={45}
                fontSize={10}
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => formatCurrencyCompact(value)}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">
                          {name === 'amount' ? 'Spending' : 'Avg'}:
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(Number(value) || 0)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              {/* Average Reference Line */}
              {averageAmount > 0 && (
                <ReferenceLine
                  y={averageAmount}
                  stroke="#94A3B8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: 'Avg',
                    position: 'right',
                    fill: '#94A3B8',
                    fontSize: 10,
                  }}
                />
              )}
              {/* Bars */}
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[4, 4, 0, 0]}
                onClick={(data) => {
                  const payload = data as unknown as {
                    monthIndex?: number;
                    year?: number;
                  };
                  if (payload && payload.monthIndex !== undefined) {
                    const year = payload.year || new Date().getFullYear();
                    router.push(
                      `/receipts?month=${payload.monthIndex}&year=${year}`
                    );
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
