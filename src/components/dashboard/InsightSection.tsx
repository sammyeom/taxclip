'use client';

import {
  Tag,
  Receipt as ReceiptIcon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export default function InsightSection({ data }: InsightSectionProps) {
  const insights = [];

  // 1. Top Spending Category
  if (data.topCategory) {
    insights.push({
      icon: Tag,
      iconColor: 'text-blue-500',
      title: 'Top Spending Category',
      description: `${data.topCategory.name} accounts for ${data.topCategory.percentage.toFixed(1)}% of your spending`,
      value: formatCurrency(data.topCategory.amount),
      gradient: 'from-blue-500/5',
    });
  }

  // 2. Average Receipt
  if (data.totalCount > 0) {
    insights.push({
      icon: ReceiptIcon,
      iconColor: 'text-emerald-500',
      title: 'Average Receipt',
      description: `Based on ${data.totalCount} receipts`,
      value: formatCurrency(data.averageAmount || 0),
      gradient: 'from-emerald-500/5',
    });
  }

  // 3. Monthly Trend
  if (data.monthlyChange !== null) {
    const isUp = data.monthlyChange >= 0;
    insights.push({
      icon: isUp ? TrendingUp : TrendingDown,
      iconColor: isUp ? 'text-orange-500' : 'text-teal-500',
      title: 'Monthly Trend',
      description: `${isUp ? 'Up' : 'Down'} from last month`,
      value: `${isUp ? '+' : ''}${data.monthlyChange.toFixed(1)}%`,
      gradient: isUp ? 'from-orange-500/5' : 'from-teal-500/5',
    });
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Insights Grid */}
      {insights.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Card
                key={index}
                className={`bg-gradient-to-t ${insight.gradient} to-card shadow-sm`}
              >
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1 sm:mb-1.5">
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${insight.iconColor} flex-shrink-0`} />
                    <span className="text-[10px] sm:text-xs font-medium truncate">{insight.title}</span>
                  </div>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">
                    {insight.value}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {insight.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
