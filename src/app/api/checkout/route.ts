import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LEMON_SQUEEZY_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const STORE_ID = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;
const PRODUCT_MONTHLY = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_MONTHLY;
const PRODUCT_YEARLY = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_YEARLY;

// Create Supabase client with service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the plan type from request body
    const { plan } = await request.json();

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // Select the variant ID based on plan
    const variantId = plan === 'monthly' ? PRODUCT_MONTHLY : PRODUCT_YEARLY;

    if (!variantId) {
      return NextResponse.json({ error: 'Product not configured' }, { status: 500 });
    }

    // Create checkout session with Lemon Squeezy
    const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${LEMON_SQUEEZY_API_KEY}`,
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
                user_email: user.email,
              },
            },
            checkout_options: {
              embed: false,
              media: true,
              logo: true,
              desc: true,
              discount: true,
              dark: false,
              subscription_preview: true,
            },
            product_options: {
              enabled_variants: [parseInt(variantId)],
              redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taxclip.co'}/dashboard?checkout=success`,
              receipt_link_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://taxclip.co'}/dashboard`,
              receipt_button_text: 'Go to Dashboard',
              receipt_thank_you_note: 'Thank you for subscribing to TaxClip Pro!',
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: STORE_ID,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Lemon Squeezy API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }

    const checkoutData = await response.json();
    const checkoutUrl = checkoutData.data.attributes.url;

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
