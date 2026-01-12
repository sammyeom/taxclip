import { createClient } from '@supabase/supabase-js';
import { Receipt, InsertReceipt, UpdateReceipt, UserSettings, UpdateUserSettings, Expense, InsertExpense, UpdateExpense } from '@/types/database';

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
        default_category: 'other',
        auto_categorize: false,
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
        default_category: 'other',
        auto_categorize: false,
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

// 이번 달 영수증 개수 가져오기
export const getMonthlyReceiptCount = async () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { count, error } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString());

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

    // Calculate statistics
    const totalCount = data.length;
    const totalAmount = data.reduce((sum, r) => sum + (r.total || 0), 0);

    // Category totals
    const categoryTotals: Record<string, number> = {};
    data.forEach(receipt => {
      const cat = receipt.category || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (receipt.total || 0);
    });

    // Monthly totals (Jan=0, Dec=11)
    const monthlyTotals = new Array(12).fill(0);
    data.forEach(receipt => {
      if (receipt.date) {
        const month = new Date(receipt.date).getMonth();
        monthlyTotals[month] += receipt.total || 0;
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
  const { data, error } = await supabase
    .from('receipts')
    .update(receipt)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating receipt:', error.message);
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
  default_category: 'other',
  auto_categorize: false,
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
