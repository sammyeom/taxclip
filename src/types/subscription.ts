/**
 * 구독 관련 TypeScript 타입 정의
 * Supabase subscription 테이블 및 이벤트 관리용
 */

// 구독 이벤트 타입
export type SubscriptionEventType =
  | 'pause_requested'
  | 'pause_started'
  | 'pause_ended'
  | 'discount_applied'
  | 'downgrade_to_monthly'
  | 'downgrade_to_free'
  | 'cancel_requested'
  | 'cancel_completed'
  | 'reactivated'
  | 'plan_upgraded'
  | 'subscription_started'
  | 'subscription_renewed';

// 취소 이유 타입
export type CancelReason =
  | 'too_expensive'
  | 'not_using'
  | 'missing_features'
  | 'found_alternative'
  | 'technical_issues'
  | 'need_break'
  | 'other';

// 플랜 타입
export type PlanType = 'free' | 'monthly' | 'annual';

// 구독 상태 타입
export type SubscriptionStatusType =
  | 'active'
  | 'on_trial'
  | 'paused'
  | 'cancelled'
  | 'expired';

// 일시정지 기간 타입 (일 단위)
export type PauseDuration = 30 | 60 | 90;

// 피드백 타입
export type FeedbackType = 'cancellation' | 'pause' | 'downgrade' | 'general';

// Supabase subscriptions 테이블 타입
export interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: SubscriptionStatusType;
  product_id: string | null;
  interval: string | null;
  plan_interval: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  // 일시정지 관련
  is_paused: boolean;
  pause_start_date: string | null;
  pause_end_date: string | null;
  pause_duration_days: number | null;
  // 할인 관련
  discount_percentage: number | null;
  discount_start_date: string | null;
  discount_end_date: string | null;
  discount_reason: string | null;
  original_price: number | null;
  discounted_price: number | null;
  // 취소 관련
  cancelled_at: string | null;
  cancellation_reason: CancelReason | null;
  cancellation_feedback: string | null;
  will_renew: boolean;
  // 타임스탬프
  created_at: string;
  updated_at: string;
}

// 구독 업데이트용 타입
export interface UpdateSubscription {
  plan_type?: string;
  status?: SubscriptionStatusType;
  product_id?: string | null;
  current_period_end?: string | null;
  // 일시정지 관련
  is_paused?: boolean;
  pause_start_date?: string | null;
  pause_end_date?: string | null;
  pause_duration_days?: number | null;
  // 할인 관련
  discount_percentage?: number | null;
  discount_start_date?: string | null;
  discount_end_date?: string | null;
  discount_reason?: string | null;
  original_price?: number | null;
  discounted_price?: number | null;
  // 취소 관련
  cancelled_at?: string | null;
  cancellation_reason?: CancelReason | null;
  cancellation_feedback?: string | null;
  will_renew?: boolean;
}

// subscription_events 테이블 레코드
export interface SubscriptionEvent {
  id: string;
  user_id: string;
  event_type: SubscriptionEventType;
  previous_plan?: PlanType | null;
  new_plan?: PlanType | 'paused' | null;
  discount_percent?: number | null;
  discount_duration_months?: number | null;
  pause_duration_days?: number | null;
  pause_end_date?: string | null;
  cancel_reason?: CancelReason | null;
  cancel_feedback?: string | null;
  product_id?: string | null;
  effective_date?: string | null;
  created_at: string;
}

// 새 구독 이벤트 삽입용 타입
export interface InsertSubscriptionEvent {
  user_id: string;
  event_type: SubscriptionEventType;
  previous_plan?: PlanType | null;
  new_plan?: PlanType | 'paused' | null;
  discount_percent?: number | null;
  discount_duration_months?: number | null;
  pause_duration_days?: number | null;
  pause_end_date?: string | null;
  cancel_reason?: CancelReason | null;
  cancel_feedback?: string | null;
  product_id?: string | null;
  effective_date?: string | null;
}

// subscription_feedback 테이블 타입
export interface SubscriptionFeedback {
  id: string;
  user_id: string;
  subscription_id: string | null;
  feedback_type: FeedbackType;
  reason: CancelReason | null;
  feedback_text: string | null;
  rating: number | null; // 1-5
  created_at: string;
}

// 새 피드백 삽입용 타입
export interface InsertSubscriptionFeedback {
  user_id: string;
  subscription_id?: string | null;
  feedback_type: FeedbackType;
  reason?: CancelReason | null;
  feedback_text?: string | null;
  rating?: number | null;
}

// 현재 구독 상태 (화면 표시용)
export interface SubscriptionStatus {
  plan: PlanType;
  status: SubscriptionStatusType;
  isPaused: boolean;
  pauseEndDate?: Date | null;
  willRenew: boolean;
  expirationDate?: Date | null;
  managementURL?: string | null;
  productIdentifier?: string | null;
}

// 취소 이유 옵션 (UI 표시용)
export interface CancelReasonOption {
  value: CancelReason;
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
}

// 취소 이유 목록
export const CANCEL_REASONS: CancelReasonOption[] = [
  { value: 'too_expensive', icon: 'DollarSign', iconBg: '#FEF3C7', iconColor: '#D97706', label: 'Too expensive' },
  { value: 'not_using', icon: 'TrendingDown', iconBg: '#E0E7FF', iconColor: '#4F46E5', label: "Not using it enough" },
  { value: 'missing_features', icon: 'Wrench', iconBg: '#F3E8FF', iconColor: '#9333EA', label: 'Missing features I need' },
  { value: 'found_alternative', icon: 'RefreshCw', iconBg: '#DBEAFE', iconColor: '#2563EB', label: 'Found a better alternative' },
  { value: 'technical_issues', icon: 'Bug', iconBg: '#FEE2E2', iconColor: '#DC2626', label: 'Technical issues' },
  { value: 'need_break', icon: 'Clock', iconBg: '#DCFCE7', iconColor: '#16A34A', label: 'Just need a break' },
  { value: 'other', icon: 'MessageCircle', iconBg: '#F1F5F9', iconColor: '#64748B', label: 'Other reason' },
];

// Pro 혜택 목록
export interface ProBenefit {
  icon: string;
  title: string;
  iconBg: string;
  iconColor: string;
}

export const PRO_BENEFITS: ProBenefit[] = [
  { icon: 'Infinity', title: 'Unlimited receipt uploads', iconBg: '#DCFCE7', iconColor: '#16A34A' },
  { icon: 'Zap', title: 'AI-powered categorization', iconBg: '#E0E7FF', iconColor: '#4F46E5' },
  { icon: 'BarChart3', title: 'Advanced tax analytics', iconBg: '#FEF3C7', iconColor: '#D97706' },
  { icon: 'Headphones', title: 'Priority support', iconBg: '#FCE7F3', iconColor: '#DB2777' },
  { icon: 'FileText', title: 'PDF/CSV exports', iconBg: '#DBEAFE', iconColor: '#2563EB' },
  { icon: 'Shield', title: 'Secure cloud backup', iconBg: '#F3E8FF', iconColor: '#9333EA' },
];
