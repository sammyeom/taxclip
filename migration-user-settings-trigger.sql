-- Migration: Auto-create user_settings when new user signs up
-- Run this in Supabase SQL Editor

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (
    user_id,
    currency,
    date_format,
    default_category,
    auto_categorize,
    email_notifications,
    monthly_summary,
    receipt_reminders,
    tax_deadline_reminders,
    business_type,
    tax_year_type,
    meals_deduction_rate,
    mileage_tracking,
    mileage_rate,
    data_retention_years
  ) VALUES (
    NEW.id,
    'USD',
    'MM/DD/YYYY',
    'other',
    false,
    true,
    true,
    false,
    true,
    'sole_proprietor',
    'calendar',
    0.50,
    false,
    0.67,
    7
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create settings for existing users who don't have them
INSERT INTO public.user_settings (
  user_id,
  currency,
  date_format,
  default_category,
  auto_categorize,
  email_notifications,
  monthly_summary,
  receipt_reminders,
  tax_deadline_reminders,
  business_type,
  tax_year_type,
  meals_deduction_rate,
  mileage_tracking,
  mileage_rate,
  data_retention_years
)
SELECT
  id,
  'USD',
  'MM/DD/YYYY',
  'other',
  false,
  true,
  true,
  false,
  true,
  'sole_proprietor',
  'calendar',
  0.50,
  false,
  0.67,
  7
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings);
