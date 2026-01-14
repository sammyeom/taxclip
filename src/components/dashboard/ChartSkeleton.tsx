'use client';

/**
 * Skeleton loading component for charts
 * Used with Suspense boundaries for progressive loading
 */
export default function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
      {/* Title skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-8 w-24 bg-slate-200 rounded" />
      </div>

      {/* Chart area skeleton */}
      <div
        className="bg-slate-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-slate-400 text-sm">Loading chart...</div>
      </div>
    </div>
  );
}

/**
 * Skeleton for stat cards
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-slate-200 rounded-lg" />
        <div className="h-4 w-20 bg-slate-200 rounded" />
      </div>
      <div className="h-8 w-24 bg-slate-200 rounded mb-1" />
      <div className="h-4 w-16 bg-slate-200 rounded" />
    </div>
  );
}

/**
 * Skeleton for recent receipts list
 */
export function ReceiptListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-4 w-16 bg-slate-200 rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="w-10 h-10 bg-slate-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for insight section
 */
export function InsightSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-pulse">
      <div className="h-6 w-28 bg-slate-200 rounded mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-200 rounded-lg" />
            <div className="flex-1">
              <div className="h-4 w-full bg-slate-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
