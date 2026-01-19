import OpenAI from 'openai';
import { LineItem } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Document types for IRS audit purposes
export type DocumentType = 'receipt' | 'invoice' | 'payment_proof' | 'online_order' | 'other';

// Item structure from OCR extraction
export interface ExtractedItem {
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface ReceiptData {
  date: string;
  vendor: string;
  amount: number;
  subtotal?: number;           // Subtotal before tax
  tax?: number;                // Tax amount (separate field)
  tip?: number;                // Tip amount (separate field)
  currency: string;            // Currency code (USD, KRW, EUR, etc.)
  items: LineItem[];           // Only purchased items (no tax/tip)
  category: string;
  paymentMethod?: string;
  documentType: DocumentType;  // Auto-classified document type
  confidence?: number;         // Classification confidence (0-100)
}

// IRS Schedule C categories for accurate categorization
const IRS_CATEGORIES = [
  'advertising',
  'car_truck',
  'insurance',
  'legal_professional',
  'office_expense',
  'rent_lease',
  'repairs_maintenance',
  'supplies',
  'travel',
  'meals',
  'utilities',
  'other'
];

// Detailed IRS Schedule C category classification guide
const IRS_CATEGORY_GUIDE = `
IRS SCHEDULE C CATEGORY CLASSIFICATION (IMPORTANT - Read carefully):

Choose the MOST SPECIFIC category that matches. Only use "other" if NONE of the categories below fit.

1. "advertising" (Line 8) - Marketing and promotional expenses:
   - Google Ads, Facebook Ads, Instagram Ads, LinkedIn Ads
   - Business cards, flyers, brochures, banners
   - Website hosting, domain names (if promotional)
   - Social media marketing tools
   - Promotional merchandise (branded items)
   - Press releases, PR services
   - Trade show booth fees
   - Newspaper/magazine ads
   Keywords: ad, ads, marketing, promotion, campaign, sponsor, SEO, SEM

2. "car_truck" (Line 9) - Vehicle expenses for business use:
   - Gas, fuel, diesel
   - Parking fees for business
   - Tolls for business travel
   - Car wash (business vehicle)
   - Oil changes, tire rotation
   - Vehicle repairs and maintenance
   - Car insurance (business portion)
   - Registration fees (business vehicle)
   Keywords: gas, fuel, parking, toll, car, auto, vehicle, Uber, Lyft (for business)

3. "insurance" (Line 15) - Business insurance premiums:
   - General liability insurance
   - Professional liability (E&O)
   - Property insurance (business)
   - Workers compensation
   - Business interruption insurance
   - Cyber liability insurance
   Keywords: insurance, premium, policy, coverage, liability

4. "legal_professional" (Line 17) - Professional services:
   - Attorney/lawyer fees
   - CPA/accountant fees
   - Tax preparation services
   - Bookkeeping services
   - Consulting fees
   - Professional licensing fees
   - Notary fees
   Keywords: attorney, lawyer, legal, CPA, accountant, consultant, professional fee

5. "office_expense" (Line 18) - Office-related expenses:
   - Office supplies (pens, paper, staplers)
   - Printer ink, toner
   - Postage, shipping supplies
   - Small office equipment (<$200)
   - Desk accessories
   - Filing supplies
   - Cleaning supplies for office
   Keywords: office, supplies, stationery, FedEx, UPS, USPS, postage, shipping

6. "rent_lease" (Line 20) - Rental and lease payments:
   - Office rent
   - Coworking space fees (WeWork, Regus)
   - Equipment rental/lease
   - Storage unit rental
   - Warehouse rent
   Keywords: rent, lease, rental, WeWork, Regus, coworking, storage

7. "repairs_maintenance" (Line 21) - Repairs and maintenance:
   - Computer/laptop repairs
   - Equipment repairs
   - Office building maintenance
   - HVAC maintenance
   - Plumbing repairs (office)
   Keywords: repair, maintenance, fix, service call, technician

8. "supplies" (Line 22) - Business supplies and materials:
   - Raw materials for products
   - Packaging materials
   - Inventory supplies
   - Manufacturing supplies
   - Craft supplies (if business-related)
   Keywords: supplies, materials, inventory, packaging, wholesale

9. "travel" (Line 24a) - Business travel expenses:
   - Airfare, flights
   - Hotels, lodging, Airbnb
   - Train tickets, bus fare
   - Rental cars (for travel)
   - Taxi/Uber/Lyft (to airport, client meetings)
   - Baggage fees
   - Travel agency fees
   Keywords: flight, airline, hotel, Airbnb, travel, trip, conference travel

10. "meals" (Line 24b) - Business meals (50% deductible):
    - Client meals, business lunches/dinners
    - Team meals during business meetings
    - Food during business travel
    - Coffee meetings with clients
    - Restaurant receipts (business purpose)
    Keywords: restaurant, meal, lunch, dinner, breakfast, food, cafe, coffee (with client)

11. "utilities" (Line 25) - Utility expenses:
    - Electricity (office/home office portion)
    - Internet service (business use)
    - Phone/cell phone (business use)
    - Water (office)
    - Gas/heating (office)
    - Cloud services (AWS, Azure, Google Cloud)
    - Software subscriptions (SaaS)
    Keywords: utility, electric, internet, phone, AT&T, Verizon, Comcast, AWS, Azure, subscription

12. "other" (Line 27a) - ONLY use if nothing else fits:
    - Bank fees, merchant fees
    - Credit card processing fees
    - License fees (non-professional)
    - Dues and subscriptions (trade associations)
    - Education/training (not travel)
    - Books and publications

CLASSIFICATION RULES:
- Software/SaaS subscriptions → "utilities" (cloud services)
- Domain names for business website → "advertising"
- API services (OpenAI, Stripe, etc.) → "utilities"
- Co-working space → "rent_lease"
- Uber/Lyft to airport → "travel"
- Uber/Lyft around town for business → "car_truck"
- Amazon purchases → Look at items (office supplies, equipment, etc.)
- Food delivery for team meeting → "meals"
`;


// Valid document types
const DOCUMENT_TYPES: DocumentType[] = ['receipt', 'invoice', 'payment_proof', 'online_order', 'other'];

/**
 * Extract receipt data from a single image
 */
export async function extractReceiptData(imageUrl: string): Promise<ReceiptData> {
  return extractReceiptDataFromMultipleImages([imageUrl]);
}

/**
 * Extract receipt data from multiple images (multi-page receipt support)
 * All images are analyzed together as parts of a single receipt/transaction
 */
export async function extractReceiptDataFromMultipleImages(imageUrls: string[]): Promise<ReceiptData> {
  if (imageUrls.length === 0) {
    throw new Error('No images provided');
  }

  try {
    // Build the content array with all images
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = imageUrls.map((url, index) => ({
      type: "image_url" as const,
      image_url: {
        url: url,
        detail: "high" as const, // Use high detail for long receipts
      },
    }));

    // Create the prompt based on whether it's single or multi-image
    const isMultiImage = imageUrls.length > 1;

    // Common document type classification instructions
    const documentTypeInstructions = `
DOCUMENT TYPE CLASSIFICATION:
Classify this document as one of:
- "receipt": Physical store receipt, POS printout, thermal paper receipt
- "invoice": Bill or invoice requesting payment (has "Invoice", due date, payment terms)
- "payment_proof": Bank statement, credit card statement, payment confirmation screenshot
- "online_order": Online order confirmation, Amazon/email order receipt, shipping confirmation
- "other": Cannot determine or doesn't fit above categories

Classification hints:
- Receipts usually have "RECEIPT", store address, itemized list, "THANK YOU"
- Invoices have "INVOICE #", "Bill To", "Due Date", "Payment Terms"
- Payment proofs have bank logos, transaction IDs, "Payment Successful"
- Online orders have "Order #", "Ship To", confirmation emails, website headers`;

    const itemsFormatInstruction = `
ITEMS FORMAT - Extract each item with quantity and price:
{
  "name": "item name/description",
  "qty": quantity as number (default 1 if not specified),
  "unitPrice": price per unit as number,
  "amount": total for this item (qty * unitPrice)
}
If only total price is shown (not unit price), set unitPrice = amount and qty = 1.`;

    const promptText = isMultiImage
      ? `You are analyzing ${imageUrls.length} images that together make up a SINGLE receipt/transaction.
These images may show different parts of the same long receipt (top, middle, bottom sections).

IMPORTANT: Combine all information from ALL images to extract the COMPLETE data:
- The TOTAL AMOUNT should be the final total from the receipt (usually on the last image)
- Include ALL items from ALL images in the items list
- The vendor/store name is usually at the top (first image)
- The date and payment method may be at the top or bottom

${documentTypeInstructions}

${IRS_CATEGORY_GUIDE}

${itemsFormatInstruction}

Extract and return this JSON format:
{
  "date": "YYYY-MM-DD format",
  "vendor": "merchant/store name",
  "amount": final total amount as number (NOT subtotal),
  "subtotal": subtotal before tax as number (null if not visible),
  "tax": tax amount as number (null if not visible),
  "tip": tip/gratuity amount as number (null if not visible),
  "currency": "3-letter currency code (USD, KRW, EUR, GBP, JPY, CNY, CAD, AUD, etc.) - detect from currency symbol ($=USD, ₩=KRW, €=EUR, £=GBP, ¥=JPY or CNY, etc.)",
  "items": [
    {"name": "item1", "qty": 1, "unitPrice": 10.00, "amount": 10.00},
    {"name": "item2", "qty": 2, "unitPrice": 5.00, "amount": 10.00}
  ],
  "category": "one of: ${IRS_CATEGORIES.join(', ')}",
  "paymentMethod": "credit card, cash, debit, check, etc.",
  "documentType": "one of: receipt, invoice, payment_proof, online_order, other",
  "confidence": confidence percentage 0-100 for document type classification
}

IMPORTANT: Extract tax and tip separately - do NOT include them in the items array. They will be added separately.

Make sure to:
1. Extract ALL line items from every image with their quantities and prices
2. Use the FINAL TOTAL (including tax) as the amount
3. CAREFULLY categorize using the IRS Schedule C guide above - DO NOT default to "other" unless nothing else fits
4. Classify the document type accurately for IRS audit purposes`
      : `Analyze this document image and extract the following information in JSON format:

${documentTypeInstructions}

${IRS_CATEGORY_GUIDE}

${itemsFormatInstruction}

Return this JSON format:
{
  "date": "YYYY-MM-DD format",
  "vendor": "merchant/store name",
  "amount": total amount as number,
  "subtotal": subtotal before tax as number (null if not visible),
  "tax": tax amount as number (null if not visible),
  "tip": tip/gratuity amount as number (null if not visible),
  "currency": "3-letter currency code (USD, KRW, EUR, GBP, JPY, CNY, CAD, AUD, etc.) - detect from currency symbol ($=USD, ₩=KRW, €=EUR, £=GBP, ¥=JPY or CNY, etc.)",
  "items": [
    {"name": "item1", "qty": 1, "unitPrice": 10.00, "amount": 10.00},
    {"name": "item2", "qty": 2, "unitPrice": 5.00, "amount": 10.00}
  ],
  "category": "one of: ${IRS_CATEGORIES.join(', ')}",
  "paymentMethod": "credit card, cash, debit, check, etc.",
  "documentType": "one of: receipt, invoice, payment_proof, online_order, other",
  "confidence": confidence percentage 0-100 for document type classification
}

IMPORTANT: Extract tax and tip separately - do NOT include them in the items array. They will be added separately.

IMPORTANT RULES:
1. CAREFULLY read the IRS Schedule C category guide above
2. Choose the MOST SPECIFIC category - DO NOT default to "other" unless absolutely nothing else fits
3. Look at the vendor name and items to determine category (e.g., OpenAI = "utilities", Restaurant = "meals")
4. Extract each item with its quantity and unit price
5. Classify the document type accurately for IRS audit purposes`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // Use full gpt-4o for better multi-image handling
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            ...imageContents,
          ],
        },
      ],
      max_tokens: 2000, // Enough tokens for detailed response
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const data = JSON.parse(jsonMatch[0]);

    // Validate category
    const category = IRS_CATEGORIES.includes(data.category) ? data.category : 'other';

    // Validate document type
    const documentType: DocumentType = DOCUMENT_TYPES.includes(data.documentType)
      ? data.documentType
      : 'receipt'; // Default to receipt if not specified

    // Convert items to LineItem format
    const lineItems: LineItem[] = [];
    if (Array.isArray(data.items)) {
      data.items.forEach((item: string | ExtractedItem, index: number) => {
        if (typeof item === 'string') {
          // Legacy string format - convert to LineItem
          lineItems.push({
            id: `item_${Date.now()}_${index}`,
            name: item,
            qty: 1,
            unitPrice: 0,
            amount: 0,
            selected: true,
          });
        } else if (typeof item === 'object' && item !== null) {
          // Object format with qty, unitPrice, amount
          const qty = typeof item.qty === 'number' ? item.qty : 1;
          const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
          const amount = typeof item.amount === 'number' ? item.amount : qty * unitPrice;

          lineItems.push({
            id: `item_${Date.now()}_${index}`,
            name: item.name || '',
            qty,
            unitPrice,
            amount,
            selected: true,
          });
        }
      });
    }

    // Extract tax and tip as separate fields (not in items array)
    const taxAmount = (data.tax && typeof data.tax === 'number' && data.tax > 0) ? data.tax : undefined;
    const tipAmount = (data.tip && typeof data.tip === 'number' && data.tip > 0) ? data.tip : undefined;
    const subtotalAmount = (data.subtotal && typeof data.subtotal === 'number') ? data.subtotal : undefined;

    return {
      date: data.date || new Date().toISOString().split('T')[0],
      vendor: data.vendor || 'Unknown Vendor',
      amount: parseFloat(data.amount) || 0,
      subtotal: subtotalAmount,
      tax: taxAmount,
      tip: tipAmount,
      currency: data.currency || 'USD',
      items: lineItems,
      category,
      paymentMethod: data.paymentMethod,
      documentType,
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract receipt data');
  }
}

