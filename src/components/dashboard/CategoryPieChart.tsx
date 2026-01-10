'use client';

import { Tag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

export default function CategoryPieChart({
  data,
  totalAmount,
}: CategoryPieChartProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6">
        Spending by Category
      </h2>
      {data.length === 0 ? (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 text-sm">No category data yet</p>
        </div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, props) => {
                  const payload = props.payload as
                    | { name: string; count: number }
                    | undefined;
                  return [
                    formatCurrency(Number(value) || 0),
                    `${payload?.name} (${payload?.count} receipts)`,
                  ];
                }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-1">Total</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Legend */}
      {data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.slice(0, 6).map((category) => (
            <div key={category.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-xs text-slate-600 truncate">
                {category.name}
              </span>
              <span className="text-xs text-slate-400 ml-auto">
                {totalAmount > 0
                  ? ((category.value / totalAmount) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
