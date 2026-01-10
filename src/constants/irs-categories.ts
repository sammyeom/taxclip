/**
 * IRS Schedule C Categories for Sole Proprietorship
 * https://www.irs.gov/forms-pubs/about-schedule-c-form-1040
 */

export interface IRSCategory {
  key: string;
  label: string;
  line: string;
  description: string;
  deductionRate?: number; // For special deduction rates (e.g., meals at 50%)
}

export const IRS_SCHEDULE_C_CATEGORIES: Record<string, IRSCategory> = {
  advertising: {
    key: 'advertising',
    label: 'Advertising',
    line: '8',
    description: 'Business advertising and promotional expenses',
  },
  car_truck: {
    key: 'car_truck',
    label: 'Car and truck expenses',
    line: '9',
    description: 'Vehicle expenses for business use (actual expenses or standard mileage)',
  },
  insurance: {
    key: 'insurance',
    label: 'Insurance (other than health)',
    line: '15',
    description: 'Business insurance premiums (liability, malpractice, etc.)',
  },
  legal_professional: {
    key: 'legal_professional',
    label: 'Legal and professional services',
    line: '17',
    description: 'Fees for lawyers, accountants, and other professionals',
  },
  office_expense: {
    key: 'office_expense',
    label: 'Office expense',
    line: '18',
    description: 'Office supplies, postage, and similar expenses',
  },
  rent_lease: {
    key: 'rent_lease',
    label: 'Rent or lease',
    line: '20',
    description: 'Rent for business property, equipment, or vehicles',
  },
  repairs_maintenance: {
    key: 'repairs_maintenance',
    label: 'Repairs and maintenance',
    line: '21',
    description: 'Repairs and maintenance of business property',
  },
  supplies: {
    key: 'supplies',
    label: 'Supplies',
    line: '22',
    description: 'Materials and supplies used in business',
  },
  travel: {
    key: 'travel',
    label: 'Travel',
    line: '24a',
    description: 'Business travel expenses (transportation, lodging)',
  },
  meals: {
    key: 'meals',
    label: 'Meals (50% deductible)',
    line: '24b',
    description: 'Business meals - only 50% is deductible',
    deductionRate: 0.5,
  },
  utilities: {
    key: 'utilities',
    label: 'Utilities',
    line: '25',
    description: 'Utility expenses for business property',
  },
  other: {
    key: 'other',
    label: 'Other expenses',
    line: '27a',
    description: 'Other deductible business expenses',
  },
};

// Category keys array for iteration
export const CATEGORY_KEYS = Object.keys(IRS_SCHEDULE_C_CATEGORIES) as Array<keyof typeof IRS_SCHEDULE_C_CATEGORIES>;

// Color mapping for UI (consistent with existing dashboard colors)
export const CATEGORY_COLORS: Record<string, string> = {
  advertising: '#3B82F6',      // blue-500
  car_truck: '#6366F1',        // indigo-500
  insurance: '#EF4444',        // red-500
  legal_professional: '#14B8A6', // teal-500
  office_expense: '#8B5CF6',   // purple-500
  rent_lease: '#06B6D4',       // cyan-500
  repairs_maintenance: '#84CC16', // lime-500
  supplies: '#10B981',         // green-500
  travel: '#EC4899',           // pink-500
  meals: '#F59E0B',            // orange-500
  utilities: '#EAB308',        // yellow-500
  other: '#6B7280',            // gray-500
};

// Helper function to get category label
export function getCategoryLabel(categoryKey: string): string {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.label || categoryKey;
}

// Helper function to get Schedule C line number
export function getScheduleCLine(categoryKey: string): string {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.line || '';
}

// Helper function to get deduction rate (default 100%)
export function getDeductionRate(categoryKey: string): number {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.deductionRate ?? 1;
}

// Helper to format category for display with line number
export function formatCategoryWithLine(categoryKey: string): string {
  const category = IRS_SCHEDULE_C_CATEGORIES[categoryKey];
  if (!category) return categoryKey;
  return `${category.label} (Line ${category.line})`;
}
