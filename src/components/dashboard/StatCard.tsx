'use client';

import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  subLabel?: string;
  gradient: 'cyan' | 'blue' | 'green' | 'purple';
  trend?: {
    value: number;
    label: string;
  };
}

const gradientClasses = {
  cyan: 'from-cyan-500 to-cyan-600',
  blue: 'from-blue-500 to-blue-600',
  green: 'from-green-500 to-green-600',
  purple: 'from-purple-500 to-purple-600',
};

const subLabelClasses = {
  cyan: 'text-cyan-200',
  blue: 'text-blue-200',
  green: 'text-green-200',
  purple: 'text-purple-200',
};

const labelClasses = {
  cyan: 'text-cyan-100',
  blue: 'text-blue-100',
  green: 'text-green-100',
  purple: 'text-purple-100',
};

export default function StatCard({
  icon: Icon,
  value,
  label,
  subLabel,
  gradient,
  trend,
}: StatCardProps) {
  return (
    <div
      className={`bg-gradient-to-br ${gradientClasses[gradient]} rounded-xl shadow-lg p-4 sm:p-6 text-white`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
      </div>
      <p className="text-xl sm:text-4xl font-bold mb-1 truncate">{value}</p>
      <p className={`text-xs sm:text-sm ${labelClasses[gradient]}`}>{label}</p>
      {subLabel && (
        <p className={`text-xs mt-1 ${subLabelClasses[gradient]}`}>{subLabel}</p>
      )}
      {trend && (
        <p
          className={`text-xs mt-1 flex items-center gap-1 ${
            trend.value >= 0 ? subLabelClasses[gradient] : 'text-white/70'
          }`}
        >
          <span
            className={`inline-block transition-transform ${
              trend.value < 0 ? 'rotate-180' : ''
            }`}
          >
            ↑
          </span>
          {trend.value >= 0 ? '+' : ''}
          {trend.value.toFixed(1)}% {trend.label}
        </p>
      )}
    </div>
  );
}
