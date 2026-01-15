import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Call OpenAI Vision API to extract receipt information
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert receipt and invoice data extraction assistant for IRS Schedule C business expense tracking. Analyze this receipt/invoice image carefully and extract ALL information in JSON format.

CRITICAL: Extract LINE ITEMS with maximum detail - this is essential for IRS audit compliance, especially for:
- Purchases over $500 (requires itemization)
- Meals/food expenses (requires detailed items for 50% deduction)

Extract the following:
- merchant: Business/store name (look for logo, header, or "Thank you for shopping at...")
- date: Transaction date in YYYY-MM-DD format (check top/bottom of receipt)
- total: Final total amount as a number (after tax, look for "Total", "Grand Total", "Amount Due")
- subtotal: Pre-tax subtotal as a number if visible
- tax: Tax amount as a number if visible
- currency: Currency code (USD, EUR, etc.) - default to USD if not clear
- paymentMethod: Payment method used (credit, debit, cash, check) - look for card type or "CASH"
- category: Best matching IRS Schedule C category from this list:
  * advertising (marketing, ads)
  * car_truck (gas, auto parts, vehicle)
  * commissions_fees (platform fees, payment processing)
  * contract_labor (freelancer payments)
  * insurance (business insurance)
  * legal_professional (legal, accounting, consulting)
  * office_expense (office supplies, postage)
  * rent_equipment (equipment rental/lease)
  * rent_property (office rent, coworking)
  * repairs_maintenance (repairs, maintenance)
  * supplies (materials, packaging)
  * taxes_licenses (licenses, permits)
  * travel (flights, hotels, transportation)
  * meals (restaurants, food, beverages - 50% deductible)
  * utilities (internet, phone, electricity)
  * other (software subscriptions, cloud services, etc.)

- items: ARRAY of ALL line items - EXTRACT EVERY SINGLE ITEM VISIBLE. Each item must have:
  * name: Full item description (include size, variant, SKU if shown)
  * quantity: Number of units (default 1 if not shown)
  * unitPrice: Price per unit as a number
  * amount: Total price for this line (quantity × unitPrice) as a number

  IMPORTANT for items extraction:
  - Look for itemized list between header and subtotal
  - Include EVERY product/service listed
  - For restaurant receipts: list each dish, drink, appetizer separately
  - For retail: include all SKUs, product codes, descriptions
  - Include modifiers, add-ons, or customizations as separate items if priced
  - If item appears multiple times, keep as separate entries or set quantity > 1

- rawText: ALL visible text from the document (for audit trail)

Return ONLY valid JSON. Use null for missing fields (not empty string). Items array should be [] only if truly no items are visible.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'Failed to extract data from file' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse extracted data' },
        { status: 500 }
      );
    }

    // Process items to ensure proper format
    const processedItems = (extractedData.items || []).map((item: { name?: string; quantity?: number; unitPrice?: number; amount?: number; price?: string | number }) => ({
      name: item.name || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || Number(item.price) || 0,
      amount: Number(item.amount) || (Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)),
    }));

    return NextResponse.json({
      merchant: extractedData.merchant || '',
      date: extractedData.date || '',
      total: extractedData.total || '',
      subtotal: extractedData.subtotal || null,
      tax: extractedData.tax || null,
      currency: extractedData.currency || 'USD',
      paymentMethod: extractedData.paymentMethod || '',
      category: extractedData.category || '',
      items: processedItems,
      rawText: extractedData.rawText || '',
    });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
