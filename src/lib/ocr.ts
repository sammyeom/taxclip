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
  confidence?: number;         // Overall OCR confidence (0-100)
  fieldConfidence?: {          // Per-field confidence scores
    date: number;
    vendor: number;
    total: number;
    items: number;
  };
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

    // Validation and confidence scoring instructions
    const validationInstructions = `
VALIDATION RULES (CRITICAL - Follow these exactly):
1. DATE VALIDATION:
   - Must be in YYYY-MM-DD format
   - If unclear or partially visible, return null instead of guessing
   - Check for common date formats: MM/DD/YYYY, DD/MM/YYYY, MMM DD YYYY

2. AMOUNT VALIDATION:
   - Total MUST equal subtotal + tax + tip (if all present)
   - If items are extracted, verify sum of item amounts ≈ subtotal
   - If discrepancy found, trust the "TOTAL" line on receipt
   - Never return 0 for total unless receipt explicitly shows $0.00

3. VENDOR VALIDATION:
   - Look for store name in header, logo, or "Thank you for shopping at..."
   - If unclear, return "Unknown Vendor" - do NOT guess

4. CONFIDENCE SCORING:
   For each field, assess readability:
   - 90-100: Clearly visible, no ambiguity
   - 70-89: Mostly clear, minor uncertainty
   - 50-69: Partially visible or blurry
   - Below 50: Guessing or very unclear

Return additional confidence scores:
{
  "fieldConfidence": {
    "date": 0-100,
    "vendor": 0-100,
    "total": 0-100,
    "items": 0-100
  }
}`;

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

${validationInstructions}

Extract and return this JSON format:
{
  "date": "YYYY-MM-DD format or null if unclear",
  "vendor": "merchant/store name",
  "amount": final total amount as number (NOT subtotal),
  "subtotal": subtotal before tax as number (null if not visible),
  "tax": tax amount as number (null if not visible),
  "tip": tip/gratuity amount as number (null if not visible),
  "currency": "3-letter currency code (USD, KRW, EUR, GBP, JPY, CNY, CAD, AUD, etc.)",
  "items": [
    {"name": "item1", "qty": 1, "unitPrice": 10.00, "amount": 10.00},
    {"name": "item2", "qty": 2, "unitPrice": 5.00, "amount": 10.00}
  ],
  "category": "one of: ${IRS_CATEGORIES.join(', ')}",
  "paymentMethod": "one of: credit, debit, cash, check",
  "documentType": "one of: receipt, invoice, payment_proof, online_order, other",
  "confidence": overall confidence 0-100,
  "fieldConfidence": {
    "date": 0-100,
    "vendor": 0-100,
    "total": 0-100,
    "items": 0-100
  }
}

CRITICAL RULES:
1. Extract tax and tip separately - do NOT include them in the items array
2. If text is unclear, return null for that field - do NOT guess
3. Verify total = subtotal + tax + tip when all are present
4. Extract ALL line items from every image
5. Use the FINAL TOTAL (including tax) as the amount`
      : `Analyze this document image and extract the following information in JSON format:

${documentTypeInstructions}

${IRS_CATEGORY_GUIDE}

${itemsFormatInstruction}

${validationInstructions}

Return this JSON format:
{
  "date": "YYYY-MM-DD format or null if unclear",
  "vendor": "merchant/store name",
  "amount": total amount as number,
  "subtotal": subtotal before tax as number (null if not visible),
  "tax": tax amount as number (null if not visible),
  "tip": tip/gratuity amount as number (null if not visible),
  "currency": "3-letter currency code (USD, KRW, EUR, GBP, JPY, CNY, CAD, AUD, etc.)",
  "items": [
    {"name": "item1", "qty": 1, "unitPrice": 10.00, "amount": 10.00},
    {"name": "item2", "qty": 2, "unitPrice": 5.00, "amount": 10.00}
  ],
  "category": "one of: ${IRS_CATEGORIES.join(', ')}",
  "paymentMethod": "one of: credit, debit, cash, check",
  "documentType": "one of: receipt, invoice, payment_proof, online_order, other",
  "confidence": overall confidence 0-100,
  "fieldConfidence": {
    "date": 0-100,
    "vendor": 0-100,
    "total": 0-100,
    "items": 0-100
  }
}

CRITICAL RULES:
1. Extract tax and tip separately - do NOT include them in the items array
2. If text is unclear, return null for that field - do NOT guess
3. Verify total = subtotal + tax + tip when all are present
4. Choose the MOST SPECIFIC IRS category - do NOT default to "other"
5. Look at vendor name and items for category (e.g., OpenAI = "utilities", Restaurant = "meals")`;

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

    // Normalize payment method to match our values: credit, debit, cash, check
    const normalizePaymentMethod = (method?: string): string => {
      if (!method) return 'credit';
      const lower = method.toLowerCase().trim();
      if (lower.includes('credit') || lower.includes('visa') || lower.includes('mastercard') || lower.includes('amex') || lower.includes('discover')) return 'credit';
      if (lower.includes('debit')) return 'debit';
      if (lower.includes('cash')) return 'cash';
      if (lower.includes('check') || lower.includes('cheque')) return 'check';
      return 'credit'; // Default to credit
    };

    // Extract field confidence scores
    const fieldConfidence = data.fieldConfidence && typeof data.fieldConfidence === 'object'
      ? {
          date: typeof data.fieldConfidence.date === 'number' ? data.fieldConfidence.date : 50,
          vendor: typeof data.fieldConfidence.vendor === 'number' ? data.fieldConfidence.vendor : 50,
          total: typeof data.fieldConfidence.total === 'number' ? data.fieldConfidence.total : 50,
          items: typeof data.fieldConfidence.items === 'number' ? data.fieldConfidence.items : 50,
        }
      : undefined;

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
      paymentMethod: normalizePaymentMethod(data.paymentMethod),
      documentType,
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
      fieldConfidence,
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract receipt data');
  }
}

/**
 * Two-pass verification for critical fields
 * Re-analyzes image focusing only on total amount and date
 * @param imageUrl - Image URL to verify
 * @param initialResult - Initial OCR result to verify
 * @returns Verified ReceiptData with potentially corrected values
 */
export async function verifyReceiptData(
  imageUrl: string,
  initialResult: ReceiptData
): Promise<ReceiptData> {
  // Skip verification if confidence is already high
  const totalConfidence = initialResult.fieldConfidence?.total ?? 100;
  const dateConfidence = initialResult.fieldConfidence?.date ?? 100;

  if (totalConfidence >= 85 && dateConfidence >= 85) {
    console.log('Skipping verification - confidence already high');
    return initialResult;
  }

  console.log('Running two-pass verification for low confidence fields...');

  try {
    const verificationResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `VERIFICATION TASK: Focus ONLY on extracting the TOTAL AMOUNT and DATE from this receipt.

Initial extraction found:
- Total: $${initialResult.amount}
- Date: ${initialResult.date}

Please carefully re-examine the image and verify these values.

Look for:
1. TOTAL: Find "Total", "Grand Total", "Amount Due", "Balance Due" - the final amount
2. DATE: Look at top and bottom of receipt for transaction date

Return JSON:
{
  "verified_amount": the total amount as a number,
  "verified_date": "YYYY-MM-DD format",
  "amount_confidence": 0-100,
  "date_confidence": 0-100,
  "amount_matches_initial": true/false,
  "date_matches_initial": true/false
}

If you cannot clearly read a value, return null for that field.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" as const,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const verifyContent = verificationResponse.choices[0].message.content;
    if (!verifyContent) return initialResult;

    const jsonMatch = verifyContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return initialResult;

    const verifyData = JSON.parse(jsonMatch[0]);

    // Update values if verification found different values with higher confidence
    const verifiedResult = { ...initialResult };

    // Update amount if verification has higher confidence
    if (
      verifyData.verified_amount !== null &&
      verifyData.amount_confidence > totalConfidence &&
      !verifyData.amount_matches_initial
    ) {
      console.log(`Verification corrected amount: ${initialResult.amount} -> ${verifyData.verified_amount}`);
      verifiedResult.amount = parseFloat(verifyData.verified_amount) || initialResult.amount;
      if (verifiedResult.fieldConfidence) {
        verifiedResult.fieldConfidence.total = verifyData.amount_confidence;
      }
    }

    // Update date if verification has higher confidence
    if (
      verifyData.verified_date !== null &&
      verifyData.date_confidence > dateConfidence &&
      !verifyData.date_matches_initial
    ) {
      console.log(`Verification corrected date: ${initialResult.date} -> ${verifyData.verified_date}`);
      verifiedResult.date = verifyData.verified_date || initialResult.date;
      if (verifiedResult.fieldConfidence) {
        verifiedResult.fieldConfidence.date = verifyData.date_confidence;
      }
    }

    return verifiedResult;
  } catch (error) {
    console.error('Verification error (using initial result):', error);
    return initialResult;
  }
}

/**
 * Extract receipt data with automatic verification for low-confidence results
 * @param imageUrl - Image URL
 * @param autoVerify - Whether to automatically verify low-confidence results (default: true)
 * @returns Extracted and optionally verified ReceiptData
 */
export async function extractAndVerifyReceiptData(
  imageUrl: string,
  autoVerify: boolean = true
): Promise<ReceiptData> {
  const initialResult = await extractReceiptData(imageUrl);

  if (!autoVerify) {
    return initialResult;
  }

  return verifyReceiptData(imageUrl, initialResult);
}

