import { createClient } from '@supabase/supabase-js';
import { Receipt, InsertReceipt, UpdateReceipt, UserSettings, UpdateUserSettings, Expense, InsertExpense, UpdateExpense } from '@/types/database';
import type {
  Subscription,
  UpdateSubscription,
  SubscriptionEvent,
  InsertSubscriptionEvent,
  SubscriptionFeedback,
  InsertSubscriptionFeedback,
  CancelReason,
  PauseDuration,
} from '@/types/subscription';

// 🔇 Console 401 에러 완전 숨기기
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  console.error = function(...args: any[]) {
    const message = args.join(' ');
    if (message.includes('401') || message.includes('Unauthorized') || message.includes('/auth/v1/user')) {
      return; // 무시
    }
    originalError.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    const message = args.join(' ');
    if (message.includes('401') || message.includes('Unauthorized')) {
      return; // 무시
    }
    originalWarn.apply(console, args);
  };
}

// Supabase configuration
const supabaseUrl = 'https://nlzxthrzgtvwweuvrbyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5senh0aHJ6Z3R2d3dldXZyYnlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2ODYxMjQsImV4cCI6MjA4MzI2MjEyNH0.0Oh5NKoNFTcpY3ViZ1kLCDDz1XpZnTs44Se9xuih0_o';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function for email/password sign up
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing up:', error.message);
    return { error };
  }

  // Create default user_settings for new user
  if (data.user) {
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', data.user.id)
      .single();

    if (!existingSettings) {
      await supabase.from('user_settings').insert({
        user_id: data.user.id,
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        auto_categorize: true,
        email_notifications: true,
        monthly_summary: true,
        receipt_reminders: false,
        tax_deadline_reminders: true,
        business_type: 'sole_proprietor',
        tax_year_type: 'calendar',
        meals_deduction_rate: 0.50,
        mileage_tracking: false,
        mileage_rate: 0.67,
        data_retention_years: 7,
      });
    }
  }

  return { data };
};

// Helper function for email/password sign in
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error.message);
    return { error };
  }

  // Create default user_settings if not exists (for users who signed up before this feature)
  if (data.user) {
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', data.user.id)
      .single();

    if (!existingSettings) {
      await supabase.from('user_settings').insert({
        user_id: data.user.id,
        currency: 'USD',
        date_format: 'MM/DD/YYYY',
        auto_categorize: true,
        email_notifications: true,
        monthly_summary: true,
        receipt_reminders: false,
        tax_deadline_reminders: true,
        business_type: 'sole_proprietor',
        tax_year_type: 'calendar',
        meals_deduction_rate: 0.50,
        mileage_tracking: false,
        mileage_rate: 0.67,
        data_retention_years: 7,
      });
    }
  }

  return { data };
};

// Helper function for Google OAuth sign in
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    return { error };
  }

  return { data };
};

// Helper function to sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error.message);
    return { error };
  }

  return { error: null };
};

// Helper function for password reset
export const resetPasswordForEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    console.error('Error sending reset email:', error.message);
    return { error };
  }

  return { data, error: null };
};

// Helper function to update password
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Error updating password:', error.message);
    return { error };
  }

  return { data, error: null };
};

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    return { user: null, error };
  }

  return { user: session?.user ?? null, error: null };
};

// 영수증 목록 가져오기
export const getReceipts = async () => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching receipts:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt[], error: null };
};

// 영수증 ID로 가져오기
export const getReceiptById = async (id: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching receipt:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt, error: null };
};

// 연도별 영수증 가져오기
export const getReceiptsByYear = async (year: number) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('tax_year', year)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching receipts by year:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt[], error: null };
};

// 카테고리별 영수증 가져오기
export const getReceiptsByCategory = async (category: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('category', category)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching receipts by category:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt[], error: null };
};

// 이번 달 영수증 업로드 개수 가져오기 (UTC 기준, 매달 1일 0시 리셋)
export const getMonthlyReceiptCount = async () => {
  const now = new Date();
  // Use UTC for month boundaries (reset on 1st of each month at UTC midnight)
  const startOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const endOfMonthUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  const { count, error } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonthUTC.toISOString())
    .lte('created_at', endOfMonthUTC.toISOString());

  if (error) {
    console.error('Error counting monthly receipts:', error.message);
    return { count: 0, error };
  }

  return { count: count || 0, error: null };
};

// 영수증 검색 (vendor 이름으로)
export const searchReceipts = async (query: string) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .ilike('merchant', `%${query}%`)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error searching receipts:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt[], error: null };
};

// 영수증 통계 가져오기
export const getReceiptStats = async (year?: number) => {
  try {
    // Build query
    let query = supabase.from('receipts').select('*');

    if (year) {
      query = query.eq('tax_year', year);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return { data: null, error: new Error('No data returned') };

    // Helper function to calculate total from subtotal + tax + tip
    const getReceiptTotal = (r: { total?: number | null; subtotal?: number | null; tax?: number | null; tip?: number | null }) => {
      const subtotal = r.subtotal ?? 0;
      const tax = r.tax ?? 0;
      const tip = r.tip ?? 0;
      // If subtotal, tax, or tip exists, calculate total from them
      if (subtotal > 0 || tax > 0 || tip > 0) {
        return subtotal + tax + tip;
      }
      return r.total ?? 0;
    };

    // Calculate statistics
    const totalCount = data.length;
    const totalAmount = data.reduce((sum, r) => sum + getReceiptTotal(r), 0);

    // Category totals
    const categoryTotals: Record<string, number> = {};
    data.forEach(receipt => {
      const cat = receipt.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + getReceiptTotal(receipt);
    });

    // Monthly totals (Jan=0, Dec=11)
    const monthlyTotals = new Array(12).fill(0);
    data.forEach(receipt => {
      if (receipt.date) {
        const month = new Date(receipt.date).getMonth();
        monthlyTotals[month] += getReceiptTotal(receipt);
      }
    });

    return {
      data: {
        totalCount,
        totalAmount,
        categoryTotals,
        monthlyTotals,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error calculating receipt stats:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
};

// 영수증을 CSV로 내보내기
export const exportReceiptsToCSV = async (year: number) => {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('tax_year', year)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching receipts for export:', error.message);
    return { data: null, error };
  }

  if (!data || data.length === 0) {
    return { data: '', error: null };
  }

  // CSV Headers
  const headers = 'Date,Vendor,Amount,Category,Business Purpose,Payment Method\n';

  // CSV Rows
  const rows = data.map(receipt => {
    const date = receipt.date || '';
    const vendor = (receipt.merchant || '').replace(/,/g, ';'); // Escape commas
    const amount = receipt.total || 0;
    const category = receipt.category || '';
    const businessPurpose = (receipt.business_purpose || '').replace(/,/g, ';');
    const paymentMethod = receipt.payment_method || '';

    return `${date},${vendor},${amount},${category},${businessPurpose},${paymentMethod}`;
  }).join('\n');

  return { data: headers + rows, error: null };
};

// 영수증 생성
export const createReceipt = async (receipt: InsertReceipt) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('receipts')
    .insert([{
      ...receipt,
      user_id: session.user.id,
      user_email: session.user.email,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating receipt:', error.message);
    return { data: null, error };
  }

  return { data: data as Receipt, error: null };
};

// 영수증 수정
export const updateReceipt = async (id: string, receipt: UpdateReceipt) => {
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.error('Error updating receipt: No active session');
    return { data: null, error: { message: 'Not authenticated. Please log in again.' } };
  }

  const { data, error } = await supabase
    .from('receipts')
    .update(receipt)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating receipt:', error.message, error);
    return { data: null, error };
  }

  return { data: data as Receipt, error: null };
};

// 영수증 삭제
export const deleteReceipt = async (id: string) => {
  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting receipt:', error.message);
    return { error };
  }

  return { error: null };
};

// ==================== Expense Functions (IRS Audit-Ready) ====================

// 지출 목록 가져오기
export const getExpenses = async () => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching expenses:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense[], error: null };
};

// 지출 ID로 가져오기
export const getExpenseById = async (id: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching expense:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense, error: null };
};

// 연도별 지출 가져오기
export const getExpensesByYear = async (year: number) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('tax_year', year)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses by year:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense[], error: null };
};

// IRS 카테고리별 지출 가져오기
export const getExpensesByIRSCategory = async (irsCategory: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('irs_category', irsCategory)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching expenses by IRS category:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense[], error: null };
};

// 지출 생성 (expenses 테이블이 없을 수 있음 - optional feature)
export const createExpense = async (expense: InsertExpense) => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { data: null, error: new Error('Not authenticated') };
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      user_id: session.user.id,
      user_email: session.user.email,
    }])
    .select()
    .single();

  if (error) {
    // Use warn instead of error - expenses table is optional
    console.warn('createExpense warning:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense, error: null };
};

// 지출 수정
export const updateExpense = async (id: string, expense: UpdateExpense) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating expense:', error.message);
    return { data: null, error };
  }

  return { data: data as Expense, error: null };
};

// 지출 삭제
export const deleteExpense = async (id: string) => {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting expense:', error.message);
    return { error };
  }

  return { error: null };
};

// IRS 카테고리별 지출 통계
export const getExpenseStatsByIRSCategory = async (year?: number) => {
  try {
    let query = supabase.from('expenses').select('*');

    if (year) {
      query = query.eq('tax_year', year);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return { data: null, error: new Error('No data returned') };

    // Calculate statistics by IRS category
    const totalCount = data.length;
    const totalAmount = data.reduce((sum, e) => sum + (e.total || 0), 0);

    const irsCategoryTotals: Record<string, number> = {};
    data.forEach(expense => {
      const cat = expense.irs_category || 'other';
      irsCategoryTotals[cat] = (irsCategoryTotals[cat] || 0) + (expense.total || 0);
    });

    return {
      data: {
        totalCount,
        totalAmount,
        irsCategoryTotals,
      },
      error: null,
    };
  } catch (err) {
    console.error('Error calculating expense stats:', err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Unknown error'),
    };
  }
};

// ==================== User Settings Functions ====================

// Default settings to return if no settings exist
const DEFAULT_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  auto_categorize: true,
  email_notifications: true,
  monthly_summary: true,
  receipt_reminders: false,
  tax_deadline_reminders: true,
  business_type: 'sole_proprietor',
  tax_year_type: 'calendar',
  meals_deduction_rate: 0.50,
  mileage_tracking: false,
  mileage_rate: 0.67,
  data_retention_years: 7,
};

// 사용자 설정 가져오기
export const getUserSettings = async () => {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      console.error('Error getting session:', sessionError?.message);
      return { data: DEFAULT_SETTINGS, error: null }; // Return defaults if not logged in
    }

    // Fetch user settings from database
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      // If no settings found (PGRST116), return defaults
      if (error.code === 'PGRST116') {
        return { data: DEFAULT_SETTINGS, error: null };
      }
      console.error('Error fetching user settings:', error.message);
      return { data: DEFAULT_SETTINGS, error: null };
    }

    return { data: data as UserSettings, error: null };
  } catch (err) {
    console.error('Error in getUserSettings:', err);
    return { data: DEFAULT_SETTINGS, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

// 사용자 설정 업데이트 (upsert)
export const updateUserSettings = async (settings: UpdateUserSettings) => {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Upsert user settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: session.user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id', // Use user_id as conflict resolution column
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error.message);
      return { data: null, error };
    }

    return { data: data as UserSettings, error: null };
  } catch (err) {
    console.error('Error in updateUserSettings:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

// 사용자 설정 초기화
export const resetUserSettings = async () => {
  try {
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { error: new Error('Not authenticated') };
    }

    // Delete user settings row
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error resetting user settings:', error.message);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Error in resetUserSettings:', err);
    return { error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

// ==================== Subscription Functions ====================

/**
 * 구독 정보 조회
 */
export const getSubscription = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error.message);
      return { data: null, error };
    }

    return { data: data as Subscription | null, error: null };
  } catch (err) {
    console.error('Error in getSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 일시정지
 */
export const pauseSubscription = async (durationDays: PauseDuration) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();
    const pauseEndDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // 현재 구독 정보 조회
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('plan_type, interval, plan_interval')
      .eq('user_id', session.user.id)
      .single();

    const planType = currentSub?.interval === 'year' || currentSub?.plan_interval === 'year'
      ? 'annual'
      : 'monthly';

    // 이벤트 기록
    await supabase.from('subscription_events').insert({
      user_id: session.user.id,
      event_type: 'pause_requested',
      previous_plan: planType,
      new_plan: 'paused',
      pause_duration_days: durationDays,
      pause_end_date: pauseEndDate.toISOString(),
    });

    // 구독 상태 업데이트
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        is_paused: true,
        pause_start_date: now.toISOString(),
        pause_end_date: pauseEndDate.toISOString(),
        pause_duration_days: durationDays,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in pauseSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 일시정지 해제
 */
export const resumeSubscription = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();

    // 이벤트 기록
    await supabase.from('subscription_events').insert({
      user_id: session.user.id,
      event_type: 'pause_ended',
    });

    // 구독 상태 업데이트
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        is_paused: false,
        pause_start_date: null,
        pause_end_date: null,
        pause_duration_days: null,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in resumeSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 할인 적용
 */
export const applyDiscount = async (
  discountPercent: number,
  durationMonths: number,
  reason?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();
    const discountEndDate = new Date(now.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    // 현재 구독 정보 조회
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('plan_type, interval, plan_interval')
      .eq('user_id', session.user.id)
      .single();

    const planType = currentSub?.interval === 'year' || currentSub?.plan_interval === 'year'
      ? 'annual'
      : 'monthly';

    // 원래 가격 계산
    const originalPrice = planType === 'annual' ? 99 : 9.99;
    const discountedPrice = originalPrice * (1 - discountPercent / 100);

    // 이벤트 기록
    await supabase.from('subscription_events').insert({
      user_id: session.user.id,
      event_type: 'discount_applied',
      previous_plan: planType,
      new_plan: planType,
      discount_percent: discountPercent,
      discount_duration_months: durationMonths,
    });

    // 구독 업데이트
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        discount_percentage: discountPercent,
        discount_start_date: now.toISOString(),
        discount_end_date: discountEndDate.toISOString(),
        discount_reason: reason || 'retention_offer',
        original_price: originalPrice,
        discounted_price: discountedPrice,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in applyDiscount:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 할인 제거
 */
export const removeDiscount = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        discount_percentage: null,
        discount_start_date: null,
        discount_end_date: null,
        discount_reason: null,
        original_price: null,
        discounted_price: null,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in removeDiscount:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 취소 처리
 */
export const cancelSubscription = async (reason?: CancelReason, feedback?: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();

    // Get current subscription info
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('id, interval, plan_interval, current_period_end')
      .eq('user_id', session.user.id)
      .single();

    const planType = currentSub?.interval === 'year' || currentSub?.plan_interval === 'year'
      ? 'annual'
      : 'monthly';

    // Record cancellation event
    await supabase.from('subscription_events').insert({
      user_id: session.user.id,
      event_type: 'cancel_requested',
      previous_plan: planType,
      new_plan: 'free',
      cancel_reason: reason || null,
      cancel_feedback: feedback || null,
      effective_date: currentSub?.current_period_end || null,
    });

    // Record feedback separately
    if (reason || feedback) {
      await supabase.from('subscription_feedback').insert({
        user_id: session.user.id,
        subscription_id: currentSub?.id || null,
        feedback_type: 'cancellation',
        reason: reason || null,
        feedback_text: feedback || null,
      });
    }

    // Update subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        will_renew: false,
        cancelled_at: now.toISOString(),
        cancellation_reason: reason || null,
        cancellation_feedback: feedback || null,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in cancelSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 재활성화 (취소 철회)
 */
export const reactivateSubscription = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();

    // 이벤트 기록
    await supabase.from('subscription_events').insert({
      user_id: session.user.id,
      event_type: 'reactivated',
    });

    // 구독 업데이트
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        will_renew: true,
        cancelled_at: null,
        cancellation_reason: null,
        cancellation_feedback: null,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in reactivateSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 이벤트 기록
 */
export const recordSubscriptionEvent = async (event: InsertSubscriptionEvent) => {
  const { data, error } = await supabase
    .from('subscription_events')
    .insert(event)
    .select()
    .single();

  return { data: data as SubscriptionEvent | null, error };
};

/**
 * 구독 이벤트 히스토리 조회
 */
export const getSubscriptionEvents = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('subscription_events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    return { data: data as SubscriptionEvent[] | null, error };
  } catch (err) {
    console.error('Error in getSubscriptionEvents:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 피드백 제출
 */
export const submitFeedback = async (feedback: InsertSubscriptionFeedback) => {
  const { data, error } = await supabase
    .from('subscription_feedback')
    .insert(feedback)
    .select()
    .single();

  return { data: data as SubscriptionFeedback | null, error };
};

/**
 * 사용자 피드백 조회
 */
export const getUserFeedback = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('subscription_feedback')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    return { data: data as SubscriptionFeedback[] | null, error };
  } catch (err) {
    console.error('Error in getUserFeedback:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 구독 정보 업데이트 (범용)
 */
export const updateSubscription = async (updates: UpdateSubscription) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    const now = new Date();

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data: data as Subscription | null, error };
  } catch (err) {
    console.error('Error in updateSubscription:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 무료 체험 시작
 */
export const startFreeTrial = async (planType: 'monthly' | 'annual') => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { data: null, error: new Error('Not authenticated') };

    // Check if trial was already used
    const { data: settings } = await supabase
      .from('user_settings')
      .select('has_used_trial')
      .eq('user_id', session.user.id)
      .single();

    if (settings?.has_used_trial) {
      return { data: null, error: new Error('Free trial already used') };
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const subscriptionEndDate = planType === 'annual'
      ? new Date(trialEndsAt.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(trialEndsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const planName = planType === 'annual' ? 'pro_annual' : 'pro_monthly';
    const intervalType = planType === 'annual' ? 'year' : 'month';

    // Check if subscription exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    const subscriptionData = {
      status: 'on_trial',
      plan_type: planName,
      interval: intervalType,
      plan_interval: intervalType,
      trial_ends_at: trialEndsAt.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: subscriptionEndDate.toISOString(),
      will_renew: true,
      updated_at: now.toISOString(),
    };

    let subscriptionError = null;

    if (existing) {
      const { error } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', session.user.id);
      subscriptionError = error;
    } else {
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: session.user.id,
          ...subscriptionData,
          created_at: now.toISOString(),
        });
      subscriptionError = error;
    }

    if (subscriptionError) {
      return { data: null, error: subscriptionError };
    }

    // Mark trial as used
    const { data, error } = await supabase
      .from('user_settings')
      .update({
        has_used_trial: true,
        subscription_status: 'on_trial',
        subscription_plan: planName,
        subscription_ends_at: subscriptionEndDate.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    return { data, error };
  } catch (err) {
    console.error('Error in startFreeTrial:', err);
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') };
  }
};

/**
 * 트라이얼 사용 여부 확인
 */
export const hasUsedTrial = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const { data } = await supabase
      .from('user_settings')
      .select('has_used_trial')
      .eq('user_id', session.user.id)
      .single();

    return data?.has_used_trial === true;
  } catch {
    return false;
  }
};
