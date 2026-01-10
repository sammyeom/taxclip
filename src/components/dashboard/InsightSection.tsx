'use client';

import {
  Tag,
  Receipt as ReceiptIcon,
  DollarSign,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

export interface InsightData {
  topCategory: {
    name: string;
    amount: number;
    percentage: number;
  } | null;
  averageAmount: number;
  estimatedTaxBenefit: number;
  totalCount: number;
  monthlyChange: number | null;
}

interface InsightSectionProps {
  data: InsightData;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function InsightSection({ data }: InsightSectionProps) {
  const insights = [];

  // Top category insight
  if (data.topCategory) {
    insights.push({
      icon: Tag,
      iconBg: 'bg-blue-500',
      title: 'Top Spending Category',
      description: `${data.topCategory.name} accounts for ${data.topCategory.percentage.toFixed(1)}% of your spending`,
      value: formatCurrency(data.topCategory.amount),
      gradient: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
    });
  }

  // Average receipt
  if (data.totalCount > 0) {
    insights.push({
      icon: ReceiptIcon,
      iconBg: 'bg-green-500',
      title: 'Average Receipt',
      description: `Based on ${data.totalCount} receipts`,
      value: formatCurrency(data.averageAmount || 0),
      gradient: 'from-green-50 to-emerald-50',
      border: 'border-green-200',
    });
  }

  // Monthly trend
  if (data.monthlyChange !== null) {
    const isUp = data.monthlyChange >= 0;
    insights.push({
      icon: isUp ? TrendingUp : TrendingDown,
      iconBg: isUp ? 'bg-orange-500' : 'bg-teal-500',
      title: 'Monthly Trend',
      description: `${isUp ? 'Up' : 'Down'} from last month`,
      value: `${isUp ? '+' : ''}${data.monthlyChange.toFixed(1)}%`,
      gradient: isUp ? 'from-orange-50 to-amber-50' : 'from-teal-50 to-cyan-50',
      border: isUp ? 'border-orange-200' : 'border-teal-200',
    });
  }

  // Tax benefit estimate
  if (data.estimatedTaxBenefit > 0) {
    insights.push({
      icon: DollarSign,
      iconBg: 'bg-purple-500',
      title: 'Estimated Tax Benefit',
      description: 'Based on 10% deduction rate',
      value: formatCurrency(data.estimatedTaxBenefit),
      gradient: 'from-purple-50 to-pink-50',
      border: 'border-purple-200',
    });
  }

  return (
    <div className="space-y-4">
      {/* Insights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <div
              key={index}
              className={`bg-gradient-to-br ${insight.gradient} rounded-xl shadow-lg p-4 border ${insight.border}`}
            >
              <div className="flex items-start gap-3">
                <div className={`${insight.iconBg} rounded-lg p-2 flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 text-sm">
                    {insight.title}
                  </h3>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {insight.value}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips Card */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl shadow-lg p-4 border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="bg-amber-500 rounded-lg p-2 flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm mb-2">
              Tax Tips
            </h3>
            <ul className="space-y-1 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <span className="text-amber-500">•</span>
                Keep receipts for expenses over $75
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500">•</span>
                Business meals are 50% deductible
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-500">•</span>
                Categorize receipts regularly for accuracy
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
