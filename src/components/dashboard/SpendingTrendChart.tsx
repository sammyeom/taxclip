'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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
} satisfies ChartConfig;

const comparisonChartConfig = {
  'Last Month': {
    label: 'Last Month',
    color: '#F97316',
  },
  'This Month': {
    label: 'This Month',
    color: '#06B6D4',
  },
} satisfies ChartConfig;

export default function SpendingTrendChart({
  monthlyData,
  comparisonData,
}: SpendingTrendChartProps) {
  const router = useRouter();
  const hasMonthlyData = monthlyData.some((d) => d.amount > 0);
  const hasComparisonData = comparisonData.some(
    (d) => d['Last Month'] > 0 || d['This Month'] > 0
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-base sm:text-xl md:text-2xl font-bold">
            Monthly Spending Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
          {!hasMonthlyData ? (
            <div className="text-center py-8 sm:py-12">
              <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 text-xs sm:text-sm">No data for trend analysis</p>
            </div>
          ) : (
            <ChartContainer config={monthlyChartConfig} className="h-[180px] sm:h-[220px] md:h-[250px] w-full">
              <BarChart
                data={monthlyData}
                accessibilityLayer
                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
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
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                    />
                  }
                />
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
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Month Comparison */}
      {hasComparisonData && (
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-xl md:text-2xl font-bold">
              This Month vs Last Month
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-4 sm:pb-6">
            <ChartContainer config={comparisonChartConfig} className="h-[200px] sm:h-[220px] md:h-[250px] w-full">
              <BarChart
                data={comparisonData}
                accessibilityLayer
                margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={8}
                  axisLine={false}
                  fontSize={10}
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
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                    />
                  }
                />
                <ChartLegend
                  content={<ChartLegendContent />}
                  className="mt-2 flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm"
                />
                <Bar
                  dataKey="Last Month"
                  fill="#F97316"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="This Month"
                  fill="#06B6D4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
