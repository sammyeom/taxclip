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
              text: `You are a receipt data extraction assistant. Analyze this receipt image or PDF and extract the following information in JSON format:
- merchant: The name of the business/merchant
- date: The transaction date (format: YYYY-MM-DD)
- total: The total amount paid (with currency symbol)
- category: Categorize the expense into one of these: Meals & Entertainment, Transportation, Software & Subscriptions, Office Supplies, Travel, Professional Services, Utilities, Marketing, Other
- items: Array of line items from the receipt, each with {name: string, quantity: number, price: string}. If items cannot be extracted, use empty array.
- rawText: All visible text from the receipt

Return ONLY valid JSON with these exact keys. If any field cannot be determined, use an empty string (or empty array for items).`,
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
      max_tokens: 1000,
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

    return NextResponse.json({
      merchant: extractedData.merchant || '',
      date: extractedData.date || '',
      total: extractedData.total || '',
      category: extractedData.category || '',
      items: extractedData.items || [],
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
