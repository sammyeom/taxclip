import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    // Create default user_settings if not exists
    if (session?.user) {
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (!existingSettings) {
        await supabase.from('user_settings').insert({
          user_id: session.user.id,
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
  }

  // Redirect to dashboard after successful authentication
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}
