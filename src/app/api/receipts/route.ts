import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlzxthrzgtvwweuvrbyg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5senhodGhyemd0dnd3ZXV2cmJ5ZyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3Njg2MTI0LCJleHAiOjIwODMyNjIxMjR9.0Oh5NKoNFTcpY3ViZ1kLCDDz1XpZnTs44Se9xuih0_o';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { merchant, date, total, category, items } = body;

    // Validate required fields
    if (!merchant || !date || !total) {
      return NextResponse.json(
        { error: 'Missing required fields: merchant, date, or total' },
        { status: 400 }
      );
    }

    // Insert receipt into database
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: user.id,
        merchant,
        date,
        total,
        category: category || 'Other',
        items: items || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving receipt:', error);
      return NextResponse.json(
        { error: 'Failed to save receipt to database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt: data,
    });
  } catch (error) {
    console.error('Error in receipts API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create Supabase client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's receipts
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching receipts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch receipts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      receipts: data || [],
    });
  } catch (error) {
    console.error('Error in receipts API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
