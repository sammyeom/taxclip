import { EvidenceItem, ParsedEmailData } from './evidence';

// ============================================================================
// Line Item Types
// ============================================================================

export interface LineItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
  selected: boolean;
}

export const createLineItem = (name: string = '', qty: number = 1, unitPrice: number = 0): LineItem => ({
  id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
  name,
  qty,
  unitPrice,
  amount: qty * unitPrice,
  selected: true,
});

// ============================================================================
// Expense Types (New IRS Audit-Ready Structure)
// ============================================================================

export type Expense = {
  id: string;
  user_id: string;
  user_email: string | null;
  merchant: string;
  date: string;
  total: number;
  irs_category: string;           // IRS Schedule C category
  irs_subcategory?: string | null; // IRS Schedule C subcategory (optional - not in DB yet)
  file_urls: string[];            // Array of uploaded file URLs
  document_types: string[];       // Array of document types (receipt, invoice, etc.)
  raw_text: string | null;        // PDF parsed raw text for audit
  business_purpose: string | null;
  payment_method: string | null;
  notes: string | null;
  tax_year: number | null;
  email_text: string | null;
  parsed_email_data: ParsedEmailData | null;
  created_at: string;
  updated_at: string;
};

export type InsertExpense = Omit<Expense, 'id' | 'user_id' | 'user_email' | 'created_at' | 'updated_at'>;
export type UpdateExpense = Partial<InsertExpense>;

// IRS Schedule C Categories
export const IRS_SCHEDULE_C_CATEGORIES = [
  { value: 'advertising', label: 'Advertising', line: '8' },
  { value: 'car_truck', label: 'Car and Truck Expenses', line: '9' },
  { value: 'commissions', label: 'Commissions and Fees', line: '10' },
  { value: 'contract_labor', label: 'Contract Labor', line: '11' },
  { value: 'depletion', label: 'Depletion', line: '12' },
  { value: 'depreciation', label: 'Depreciation', line: '13' },
  { value: 'employee_benefits', label: 'Employee Benefit Programs', line: '14' },
  { value: 'insurance', label: 'Insurance (other than health)', line: '15' },
  { value: 'interest_mortgage', label: 'Interest (Mortgage)', line: '16a' },
  { value: 'interest_other', label: 'Interest (Other)', line: '16b' },
  { value: 'legal_professional', label: 'Legal and Professional Services', line: '17' },
  { value: 'office_expense', label: 'Office Expense', line: '18' },
  { value: 'pension_profit_sharing', label: 'Pension and Profit-Sharing Plans', line: '19' },
  { value: 'rent_lease_vehicles', label: 'Rent or Lease (Vehicles)', line: '20a' },
  { value: 'rent_lease_equipment', label: 'Rent or Lease (Equipment)', line: '20b' },
  { value: 'repairs_maintenance', label: 'Repairs and Maintenance', line: '21' },
  { value: 'supplies', label: 'Supplies', line: '22' },
  { value: 'taxes_licenses', label: 'Taxes and Licenses', line: '23' },
  { value: 'travel', label: 'Travel', line: '24a' },
  { value: 'meals', label: 'Meals (50% deductible)', line: '24b', deductionRate: 0.5 },
  { value: 'utilities', label: 'Utilities', line: '25' },
  { value: 'wages', label: 'Wages', line: '26' },
  { value: 'other', label: 'Other Expenses', line: '27a' },
] as const;

export type IRSCategory = typeof IRS_SCHEDULE_C_CATEGORIES[number]['value'];

// ============================================================================
// Receipt Types (Legacy - keeping for backward compatibility)
// ============================================================================
export type Receipt = {
  id: string;
  user_id: string;
  user_email: string | null;
  merchant: string;
  date: string;
  total: number;
  subtotal: number | null;         // Subtotal before tax
  tax: number | null;              // Tax amount (separate from items)
  tip: number | null;              // Tip amount (separate from items)
  category: string;
  subcategory?: string | null;     // IRS Schedule C subcategory (optional - not in DB yet)
  items: ReceiptItem[];            // Only purchased items (no tax/tip)
  image_url: string | null;        // Legacy single image (for backward compatibility)
  image_urls: string[];            // New: Array of image URLs for multi-image support
  evidence_items: EvidenceItem[];  // IRS audit-ready evidence items with tags
  email_text: string | null;       // Stored email body text
  parsed_email_data: ParsedEmailData | null; // Structured data from email
  business_purpose: string | null;
  payment_method: string | null;
  notes: string | null;
  tax_year: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

// Helper to get all image URLs from a receipt (supports both old and new format)
export function getReceiptImages(receipt: Receipt): string[] {
  if (receipt.image_urls && receipt.image_urls.length > 0) {
    return receipt.image_urls;
  }
  if (receipt.image_url) {
    return [receipt.image_url];
  }
  return [];
}

export type ReceiptItem = {
  name: string;
  price: number;
  quantity: number;
  selected?: boolean;  // Preserve checkbox state
};

export type InsertReceipt = Omit<Receipt, 'id' | 'user_id' | 'user_email' | 'created_at' | 'updated_at'>;
export type UpdateReceipt = Partial<Omit<Receipt, 'id' | 'user_id' | 'user_email' | 'created_at' | 'updated_at'>>;

// Alternative Receipt Interface (vendor/amount aliases)
export interface ReceiptInterface {
  id: string;
  user_id: string;
  date: string;
  vendor: string; // alias for merchant
  amount: number; // alias for total
  description?: string;
  category: string;
  subcategory?: string;    // IRS Schedule C subcategory
  business_purpose?: string;
  tax_year: number;
  payment_method?: string;
  notes?: string;
  image_url?: string;      // Legacy
  image_urls?: string[];   // New: multi-image
  evidence_items?: EvidenceItem[];  // IRS audit-ready evidence items
  email_text?: string;
  parsed_email_data?: ParsedEmailData;
  created_at: string;
  updated_at: string;
}

export interface InsertReceiptInterface {
  date: string;
  vendor: string;
  amount: number;
  description?: string;
  category: string;
  subcategory?: string;    // IRS Schedule C subcategory
  business_purpose?: string;
  tax_year: number;
  payment_method?: string;
  notes?: string;
  image_url?: string;      // Legacy
  image_urls?: string[];   // New: multi-image
  evidence_items?: EvidenceItem[];  // IRS audit-ready evidence items
  email_text?: string;
  parsed_email_data?: ParsedEmailData;
}

export interface UpdateReceiptInterface {
  date?: string;
  vendor?: string;
  amount?: number;
  description?: string;
  category?: string;
  subcategory?: string;    // IRS Schedule C subcategory
  business_purpose?: string;
  tax_year?: number;
  payment_method?: string;
  notes?: string;
  image_url?: string;      // Legacy
  image_urls?: string[];   // New: multi-image
  evidence_items?: EvidenceItem[];  // IRS audit-ready evidence items
  email_text?: string;
  parsed_email_data?: ParsedEmailData;
}

// User Settings Types
export interface UserSettings {
  id?: string;
  user_id?: string;

  // General Settings
  currency: string;
  date_format: string;
  default_category: string;
  auto_categorize: boolean;

  // Notifications
  email_notifications: boolean;
  monthly_summary: boolean;
  receipt_reminders: boolean;
  tax_deadline_reminders: boolean;

  // Tax Settings
  business_type: string;
  tax_year_type: string;
  meals_deduction_rate: number;
  mileage_tracking: boolean;
  mileage_rate: number;

  // Data & Privacy
  data_retention_years: number;

  // Profile
  display_name?: string | null;
  business_name?: string | null;
  receipt_goal?: number | null;
  theme_mode?: 'light' | 'dark' | 'auto';

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserSettings {
  currency?: string;
  date_format?: string;
  default_category?: string;
  auto_categorize?: boolean;
  email_notifications?: boolean;
  monthly_summary?: boolean;
  receipt_reminders?: boolean;
  tax_deadline_reminders?: boolean;
  business_type?: string;
  tax_year_type?: string;
  meals_deduction_rate?: number;
  mileage_tracking?: boolean;
  mileage_rate?: number;
  data_retention_years?: number;
  display_name?: string | null;
  business_name?: string | null;
  receipt_goal?: number | null;
  theme_mode?: 'light' | 'dark' | 'auto';
}

