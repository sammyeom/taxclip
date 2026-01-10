'use client';

import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

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
    <div className="space-y-6">
      {/* Monthly Spending Trend */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
          Monthly Spending Trend
        </h2>
        {!hasMonthlyData ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm">No data for trend analysis</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `$${value / 1000}k` : `$${value}`
                }
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatCurrency(value || 0)
                }
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}
                cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
              />
              <Bar
                dataKey="amount"
                fill="#06B6D4"
                radius={[8, 8, 0, 0]}
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
          </ResponsiveContainer>
        )}
      </div>

      {/* Month Comparison */}
      {hasComparisonData && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
            This Month vs Last Month
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData}>
              <XAxis
                dataKey="month"
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                stroke="#64748B"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `$${value / 1000}k` : `$${value}`
                }
              />
              <Tooltip
                formatter={(value: number | undefined) =>
                  formatCurrency(value || 0)
                }
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="Last Month" fill="#94A3B8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="This Month" fill="#06B6D4" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
