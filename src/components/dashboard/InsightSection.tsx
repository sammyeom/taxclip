'use client';

import {
  Tag,
  Receipt as ReceiptIcon,
  DollarSign,
  Lightbulb,
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
  }).format(amount);
};

export default function InsightSection({ data }: InsightSectionProps) {
  const insights = [];

  // Top category insight
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

  // Average receipt
  if (data.totalCount > 0) {
    insights.push({
      icon: ReceiptIcon,
      iconColor: 'text-green-500',
      title: 'Average Receipt',
      description: `Based on ${data.totalCount} receipts`,
      value: formatCurrency(data.averageAmount || 0),
      gradient: 'from-green-500/5',
    });
  }

  // Monthly trend
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

  // Tax benefit estimate
  if (data.estimatedTaxBenefit > 0) {
    insights.push({
      icon: DollarSign,
      iconColor: 'text-purple-500',
      title: 'Estimated Tax Benefit',
      description: 'Based on 10% deduction rate',
      value: formatCurrency(data.estimatedTaxBenefit),
      gradient: 'from-purple-500/5',
    });
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Insights Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          return (
            <Card
              key={index}
              className={`bg-gradient-to-t ${insight.gradient} to-card shadow-sm`}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-1.5 sm:mb-2">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 ${insight.iconColor} flex-shrink-0`} />
                  <span className="text-xs sm:text-sm md:text-base font-medium truncate">{insight.title}</span>
                </div>
                <p className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 truncate">
                  {insight.value}
                </p>
                <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">
                  {insight.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tips Card */}
      <Card className="bg-gradient-to-t from-amber-500/5 to-card shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-1.5 sm:gap-2 text-muted-foreground mb-2 sm:mb-3">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500" />
            <span className="text-xs sm:text-sm md:text-base font-medium">Tax Tips</span>
          </div>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-slate-700">
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-amber-500 flex-shrink-0">•</span>
              <span>Keep receipts for expenses over $75</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-amber-500 flex-shrink-0">•</span>
              <span>Business meals are 50% deductible</span>
            </li>
            <li className="flex items-start gap-1.5 sm:gap-2">
              <span className="text-amber-500 flex-shrink-0">•</span>
              <span>Categorize receipts regularly for accuracy</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
