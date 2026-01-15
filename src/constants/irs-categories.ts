/**
 * IRS Schedule C (Form 1040) Categories for Sole Proprietorship
 * Complete category system with subcategories based on IRS guidelines
 * https://www.irs.gov/forms-pubs/about-schedule-c-form-1040
 *
 * Updated: 2025 Tax Year
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Subcategory {
  key: string;
  label: string;
  description: string;
}

export interface IRSCategory {
  key: string;
  label: string;
  line: string;
  description: string;
  deductionRate?: number; // For special deduction rates (e.g., meals at 50%)
  note?: string; // Special IRS notes (e.g., "Requires Form 8829")
  subcategories: Subcategory[];
}

export type CategoryKey = keyof typeof IRS_SCHEDULE_C_CATEGORIES;

// ============================================================================
// SCHEDULE C CATEGORIES WITH SUBCATEGORIES
// ============================================================================

export const IRS_SCHEDULE_C_CATEGORIES: Record<string, IRSCategory> = {
  // LINE 8: Advertising
  advertising: {
    key: 'advertising',
    label: 'Advertising',
    line: '8',
    description: 'Costs to promote your business to potential customers',
    subcategories: [
      { key: 'online_ads', label: 'Online Advertising', description: 'Google Ads, Meta Ads, LinkedIn Ads, etc.' },
      { key: 'social_media', label: 'Social Media Marketing', description: 'Paid social media promotions and sponsored posts' },
      { key: 'print_ads', label: 'Print Advertising', description: 'Newspapers, magazines, flyers, brochures' },
      { key: 'website_seo', label: 'Website & SEO', description: 'Website development, hosting, SEO services' },
      { key: 'promotional_items', label: 'Promotional Items', description: 'Business cards, branded merchandise, giveaways' },
      { key: 'trade_shows', label: 'Trade Shows & Events', description: 'Booth fees, event sponsorships, exhibition costs' },
      { key: 'email_marketing', label: 'Email Marketing', description: 'Email service providers, newsletter tools' },
      { key: 'advertising_other', label: 'Other Advertising', description: 'Other advertising and promotional expenses' },
    ],
  },

  // LINE 9: Car and Truck Expenses
  car_truck: {
    key: 'car_truck',
    label: 'Car and Truck Expenses',
    line: '9',
    description: 'Vehicle expenses for business use. Choose actual expenses OR standard mileage rate.',
    subcategories: [
      { key: 'mileage', label: 'Standard Mileage', description: '67 cents per mile for 2024 (IRS standard rate)' },
      { key: 'gas_fuel', label: 'Gas & Fuel', description: 'Fuel costs for business travel' },
      { key: 'vehicle_repairs', label: 'Repairs & Maintenance', description: 'Oil changes, tire replacement, repairs' },
      { key: 'vehicle_insurance', label: 'Vehicle Insurance', description: 'Auto insurance for business vehicle' },
      { key: 'registration_license', label: 'Registration & License', description: 'Vehicle registration, license plates' },
      { key: 'parking_tolls', label: 'Parking & Tolls', description: 'Parking fees and highway tolls for business' },
      { key: 'lease_payments', label: 'Lease Payments', description: 'Monthly lease payments for business vehicle' },
      { key: 'depreciation_vehicle', label: 'Depreciation', description: 'Vehicle depreciation (actual expense method)' },
      { key: 'car_truck_other', label: 'Other Vehicle Expenses', description: 'Other car and truck related expenses' },
    ],
  },

  // LINE 10: Commissions and Fees
  commissions_fees: {
    key: 'commissions_fees',
    label: 'Commissions and Fees',
    line: '10',
    description: 'Commissions paid to non-employees and fees for services',
    subcategories: [
      { key: 'sales_commissions', label: 'Sales Commissions', description: 'Commissions paid to sales agents' },
      { key: 'referral_fees', label: 'Referral Fees', description: 'Fees paid for customer referrals' },
      { key: 'finder_fees', label: 'Finder\'s Fees', description: 'Fees for business introductions' },
      { key: 'platform_fees', label: 'Platform Fees', description: 'Marketplace and platform transaction fees' },
      { key: 'payment_processing', label: 'Payment Processing', description: 'Stripe, PayPal, Square fees' },
      { key: 'commissions_other', label: 'Other Commissions', description: 'Other commission and fee expenses' },
    ],
  },

  // LINE 11: Contract Labor
  contract_labor: {
    key: 'contract_labor',
    label: 'Contract Labor',
    line: '11',
    description: 'Payments to independent contractors (1099-NEC if $600+)',
    subcategories: [
      { key: 'freelancers', label: 'Freelancers', description: 'Payments to freelance workers' },
      { key: 'consultants', label: 'Consultants', description: 'Business consulting services' },
      { key: 'designers', label: 'Designers', description: 'Graphic, web, UI/UX designers' },
      { key: 'developers', label: 'Developers', description: 'Software developers and programmers' },
      { key: 'writers_editors', label: 'Writers & Editors', description: 'Content writers, copywriters, editors' },
      { key: 'virtual_assistants', label: 'Virtual Assistants', description: 'Remote administrative support' },
      { key: 'subcontractors', label: 'Subcontractors', description: 'Work subcontracted to others' },
      { key: 'contract_labor_other', label: 'Other Contract Labor', description: 'Other independent contractor payments' },
    ],
  },

  // LINE 12: Depletion
  depletion: {
    key: 'depletion',
    label: 'Depletion',
    line: '12',
    description: 'Deduction for using up natural resources (oil, gas, minerals)',
    subcategories: [
      { key: 'cost_depletion', label: 'Cost Depletion', description: 'Based on original cost basis' },
      { key: 'percentage_depletion', label: 'Percentage Depletion', description: 'Based on gross income percentage' },
      { key: 'depletion_other', label: 'Other Depletion', description: 'Other depletion expenses' },
    ],
  },

  // LINE 13: Depreciation and Section 179
  depreciation: {
    key: 'depreciation',
    label: 'Depreciation & Section 179',
    line: '13',
    description: 'Depreciation of business assets and Section 179 deduction',
    subcategories: [
      { key: 'section_179', label: 'Section 179 Deduction', description: 'Immediate expense of qualifying assets (up to $1,160,000 for 2024)' },
      { key: 'bonus_depreciation', label: 'Bonus Depreciation', description: 'First-year bonus depreciation on new assets' },
      { key: 'macrs', label: 'MACRS Depreciation', description: 'Modified Accelerated Cost Recovery System' },
      { key: 'computer_equipment', label: 'Computer Equipment', description: 'Computers, servers, networking equipment' },
      { key: 'furniture_fixtures', label: 'Furniture & Fixtures', description: 'Office furniture, shelving, displays' },
      { key: 'machinery_equipment', label: 'Machinery & Equipment', description: 'Business machinery and equipment' },
      { key: 'depreciation_other', label: 'Other Depreciation', description: 'Other depreciable assets' },
    ],
  },

  // LINE 14: Employee Benefit Programs
  employee_benefits: {
    key: 'employee_benefits',
    label: 'Employee Benefit Programs',
    line: '14',
    description: 'Benefits provided to employees (not yourself if sole proprietor)',
    subcategories: [
      { key: 'health_insurance_emp', label: 'Health Insurance', description: 'Employee health insurance premiums' },
      { key: 'retirement_plans', label: 'Retirement Plans', description: 'SEP-IRA, SIMPLE IRA, 401(k) contributions' },
      { key: 'life_insurance_emp', label: 'Life Insurance', description: 'Group life insurance for employees' },
      { key: 'education_assistance', label: 'Education Assistance', description: 'Tuition reimbursement, training' },
      { key: 'dependent_care', label: 'Dependent Care', description: 'Dependent care assistance programs' },
      { key: 'employee_benefits_other', label: 'Other Benefits', description: 'Other employee benefit expenses' },
    ],
  },

  // LINE 15: Insurance (other than health)
  insurance: {
    key: 'insurance',
    label: 'Insurance (other than health)',
    line: '15',
    description: 'Business insurance premiums (not health insurance for yourself)',
    subcategories: [
      { key: 'liability_insurance', label: 'General Liability', description: 'General liability insurance coverage' },
      { key: 'professional_liability', label: 'Professional Liability', description: 'E&O, malpractice insurance' },
      { key: 'property_insurance', label: 'Property Insurance', description: 'Business property and contents insurance' },
      { key: 'cyber_insurance', label: 'Cyber Insurance', description: 'Data breach and cyber liability coverage' },
      { key: 'workers_comp', label: 'Workers\' Compensation', description: 'Workers\' comp insurance premiums' },
      { key: 'business_interruption', label: 'Business Interruption', description: 'Business interruption insurance' },
      { key: 'insurance_other', label: 'Other Insurance', description: 'Other business insurance' },
    ],
  },

  // LINE 16a: Interest - Mortgage
  interest_mortgage: {
    key: 'interest_mortgage',
    label: 'Interest - Mortgage',
    line: '16a',
    description: 'Interest on mortgage for business property',
    subcategories: [
      { key: 'business_property_mortgage', label: 'Business Property Mortgage', description: 'Mortgage interest on business real estate' },
      { key: 'interest_mortgage_other', label: 'Other Mortgage Interest', description: 'Other mortgage interest expenses' },
    ],
  },

  // LINE 16b: Interest - Other
  interest_other: {
    key: 'interest_other',
    label: 'Interest - Other',
    line: '16b',
    description: 'Other business interest expenses',
    subcategories: [
      { key: 'business_loan', label: 'Business Loan Interest', description: 'Interest on business loans and lines of credit' },
      { key: 'credit_card_interest', label: 'Credit Card Interest', description: 'Interest on business credit cards' },
      { key: 'equipment_financing', label: 'Equipment Financing', description: 'Interest on equipment loans' },
      { key: 'interest_other_misc', label: 'Other Interest', description: 'Other business interest expenses' },
    ],
  },

  // LINE 17: Legal and Professional Services
  legal_professional: {
    key: 'legal_professional',
    label: 'Legal and Professional Services',
    line: '17',
    description: 'Fees for lawyers, accountants, and other professionals',
    subcategories: [
      { key: 'accounting', label: 'Accounting Services', description: 'Bookkeeping, tax preparation, audit services' },
      { key: 'legal_services', label: 'Legal Services', description: 'Attorney fees, legal consultation' },
      { key: 'tax_preparation', label: 'Tax Preparation', description: 'Tax filing and planning services' },
      { key: 'payroll_services', label: 'Payroll Services', description: 'Payroll processing services' },
      { key: 'consulting_services', label: 'Business Consulting', description: 'Management and business consulting' },
      { key: 'professional_memberships', label: 'Professional Memberships', description: 'Industry associations, professional dues' },
      { key: 'legal_professional_other', label: 'Other Professional', description: 'Other professional service fees' },
    ],
  },

  // LINE 18: Office Expense
  office_expense: {
    key: 'office_expense',
    label: 'Office Expense',
    line: '18',
    description: 'General office and administrative expenses',
    subcategories: [
      { key: 'office_supplies', label: 'Office Supplies', description: 'Paper, pens, folders, general supplies' },
      { key: 'postage_shipping', label: 'Postage & Shipping', description: 'Stamps, courier services, shipping costs' },
      { key: 'printing_copying', label: 'Printing & Copying', description: 'Print services, copy center expenses' },
      { key: 'office_furniture_small', label: 'Small Office Items', description: 'Items under $2,500 (not depreciated)' },
      { key: 'cleaning_services', label: 'Cleaning Services', description: 'Office cleaning and janitorial' },
      { key: 'coffee_breakroom', label: 'Coffee & Breakroom', description: 'Coffee, water, breakroom supplies' },
      { key: 'office_expense_other', label: 'Other Office Expense', description: 'Other office-related expenses' },
    ],
  },

  // LINE 19: Pension and Profit-Sharing Plans
  pension_plans: {
    key: 'pension_plans',
    label: 'Pension and Profit-Sharing',
    line: '19',
    description: 'Employer contributions to pension and profit-sharing plans',
    subcategories: [
      { key: 'sep_ira', label: 'SEP-IRA', description: 'Simplified Employee Pension contributions' },
      { key: 'simple_ira', label: 'SIMPLE IRA', description: 'SIMPLE IRA employer contributions' },
      { key: 'solo_401k', label: 'Solo 401(k)', description: 'Solo 401(k) employer contributions' },
      { key: 'profit_sharing', label: 'Profit Sharing', description: 'Profit-sharing plan contributions' },
      { key: 'pension_other', label: 'Other Pension', description: 'Other pension contributions' },
    ],
  },

  // LINE 20a: Rent - Vehicles, Machinery, Equipment
  rent_equipment: {
    key: 'rent_equipment',
    label: 'Rent - Equipment',
    line: '20a',
    description: 'Rent or lease payments for vehicles, machinery, and equipment',
    subcategories: [
      { key: 'vehicle_lease', label: 'Vehicle Lease', description: 'Leased cars and trucks' },
      { key: 'equipment_lease', label: 'Equipment Lease', description: 'Leased machinery and equipment' },
      { key: 'computer_lease', label: 'Computer Lease', description: 'Leased computers and IT equipment' },
      { key: 'copier_lease', label: 'Copier/Printer Lease', description: 'Leased office equipment' },
      { key: 'rent_equipment_other', label: 'Other Equipment Rent', description: 'Other equipment rental expenses' },
    ],
  },

  // LINE 20b: Rent - Other Business Property
  rent_property: {
    key: 'rent_property',
    label: 'Rent - Business Property',
    line: '20b',
    description: 'Rent for office, warehouse, or other business real estate',
    subcategories: [
      { key: 'office_rent', label: 'Office Rent', description: 'Monthly office space rent' },
      { key: 'coworking_space', label: 'Coworking Space', description: 'Coworking membership, hot desk fees' },
      { key: 'warehouse_rent', label: 'Warehouse/Storage', description: 'Warehouse and storage facility rent' },
      { key: 'retail_rent', label: 'Retail Space', description: 'Retail store or showroom rent' },
      { key: 'rent_property_other', label: 'Other Property Rent', description: 'Other business property rent' },
    ],
  },

  // LINE 21: Repairs and Maintenance
  repairs_maintenance: {
    key: 'repairs_maintenance',
    label: 'Repairs and Maintenance',
    line: '21',
    description: 'Repairs and maintenance of business property and equipment',
    subcategories: [
      { key: 'equipment_repairs', label: 'Equipment Repairs', description: 'Repairs to business equipment' },
      { key: 'computer_repairs', label: 'Computer/IT Repairs', description: 'Computer and technology repairs' },
      { key: 'building_repairs', label: 'Building Repairs', description: 'Building and facility repairs' },
      { key: 'hvac_plumbing', label: 'HVAC & Plumbing', description: 'Heating, cooling, plumbing repairs' },
      { key: 'maintenance_contracts', label: 'Maintenance Contracts', description: 'Service and maintenance agreements' },
      { key: 'repairs_other', label: 'Other Repairs', description: 'Other repair and maintenance expenses' },
    ],
  },

  // LINE 22: Supplies
  supplies: {
    key: 'supplies',
    label: 'Supplies',
    line: '22',
    description: 'Materials and supplies consumed in business operations',
    subcategories: [
      { key: 'raw_materials', label: 'Raw Materials', description: 'Materials for products or services' },
      { key: 'packaging', label: 'Packaging Supplies', description: 'Boxes, tape, packaging materials' },
      { key: 'tools_small', label: 'Small Tools', description: 'Hand tools and small equipment' },
      { key: 'safety_supplies', label: 'Safety Supplies', description: 'PPE, safety equipment' },
      { key: 'cleaning_supplies', label: 'Cleaning Supplies', description: 'Cleaning products and janitorial supplies' },
      { key: 'supplies_other', label: 'Other Supplies', description: 'Other business supplies' },
    ],
  },

  // LINE 23: Taxes and Licenses
  taxes_licenses: {
    key: 'taxes_licenses',
    label: 'Taxes and Licenses',
    line: '23',
    description: 'Business taxes and license fees (not income tax)',
    subcategories: [
      { key: 'business_license', label: 'Business License', description: 'Business license and permit fees' },
      { key: 'state_local_tax', label: 'State & Local Taxes', description: 'State and local business taxes' },
      { key: 'property_tax_business', label: 'Property Tax', description: 'Property tax on business assets' },
      { key: 'sales_tax_paid', label: 'Sales Tax Paid', description: 'Sales tax on business purchases' },
      { key: 'payroll_taxes', label: 'Payroll Taxes', description: 'Employer portion of payroll taxes' },
      { key: 'professional_licenses', label: 'Professional Licenses', description: 'Industry licenses and certifications' },
      { key: 'taxes_licenses_other', label: 'Other Taxes', description: 'Other taxes and license fees' },
    ],
  },

  // LINE 24a: Travel
  travel: {
    key: 'travel',
    label: 'Travel',
    line: '24a',
    description: 'Business travel expenses (transportation, lodging, incidentals)',
    subcategories: [
      { key: 'airfare', label: 'Airfare', description: 'Flights for business travel' },
      { key: 'lodging', label: 'Lodging', description: 'Hotels and accommodations' },
      { key: 'ground_transport', label: 'Ground Transportation', description: 'Taxi, Uber, Lyft, rental cars' },
      { key: 'train_bus', label: 'Train & Bus', description: 'Train tickets, bus fare' },
      { key: 'baggage_fees', label: 'Baggage Fees', description: 'Checked baggage and fees' },
      { key: 'travel_incidentals', label: 'Incidentals', description: 'Tips, laundry, dry cleaning while traveling' },
      { key: 'conference_travel', label: 'Conference Travel', description: 'Travel to conferences and events' },
      { key: 'travel_other', label: 'Other Travel', description: 'Other business travel expenses' },
    ],
  },

  // LINE 24b: Deductible Meals (Subject to 50% limitation)
  meals: {
    key: 'meals',
    label: 'Meals (50% deductible)',
    line: '24b',
    description: 'Business meals with clients, prospects, or during business travel',
    deductionRate: 0.5,
    note: '50% DEDUCTIBLE: Only half of meal expenses can be deducted',
    subcategories: [
      { key: 'client_meals', label: 'Client Meals', description: 'Meals with clients and prospects' },
      { key: 'business_travel_meals', label: 'Travel Meals', description: 'Meals while on business travel' },
      { key: 'team_meals', label: 'Team Meals', description: 'Meals with employees (non-entertainment)' },
      { key: 'conference_meals', label: 'Conference Meals', description: 'Meals at conferences and events' },
      { key: 'working_meals', label: 'Working Meals', description: 'Meals during business meetings' },
      { key: 'meals_other', label: 'Other Meals', description: 'Other business meal expenses' },
    ],
  },

  // LINE 25: Utilities
  utilities: {
    key: 'utilities',
    label: 'Utilities',
    line: '25',
    description: 'Utility expenses for business property',
    subcategories: [
      { key: 'electricity', label: 'Electricity', description: 'Electric utility bills' },
      { key: 'gas_heating', label: 'Gas & Heating', description: 'Natural gas, propane, heating' },
      { key: 'water_sewer', label: 'Water & Sewer', description: 'Water and sewer services' },
      { key: 'internet', label: 'Internet', description: 'Business internet service' },
      { key: 'phone_landline', label: 'Phone (Landline)', description: 'Business phone lines' },
      { key: 'cell_phone', label: 'Cell Phone', description: 'Mobile phone for business use' },
      { key: 'trash_disposal', label: 'Trash & Disposal', description: 'Waste management services' },
      { key: 'utilities_other', label: 'Other Utilities', description: 'Other utility expenses' },
    ],
  },

  // LINE 26: Wages
  wages: {
    key: 'wages',
    label: 'Wages',
    line: '26',
    description: 'Wages paid to employees (not yourself or partners)',
    subcategories: [
      { key: 'salaries', label: 'Salaries', description: 'Regular employee salaries' },
      { key: 'hourly_wages', label: 'Hourly Wages', description: 'Hourly employee wages' },
      { key: 'bonuses', label: 'Bonuses', description: 'Employee bonuses and commissions' },
      { key: 'overtime', label: 'Overtime Pay', description: 'Overtime wages' },
      { key: 'sick_vacation_pay', label: 'Sick & Vacation Pay', description: 'Paid time off wages' },
      { key: 'wages_other', label: 'Other Wages', description: 'Other wage expenses' },
    ],
  },

  // LINE 27a: Other Expenses
  other: {
    key: 'other',
    label: 'Other Expenses',
    line: '27a',
    description: 'Other deductible business expenses not listed elsewhere',
    subcategories: [
      { key: 'software_subscriptions', label: 'Software & Subscriptions', description: 'SaaS, cloud services, software licenses' },
      { key: 'cloud_services', label: 'Cloud Services', description: 'AWS, Google Cloud, Azure, hosting' },
      { key: 'bank_fees', label: 'Bank Fees', description: 'Bank account and service fees' },
      { key: 'merchant_fees', label: 'Merchant Fees', description: 'Credit card processing, payment gateway fees' },
      { key: 'education_training', label: 'Education & Training', description: 'Courses, seminars, professional development' },
      { key: 'books_publications', label: 'Books & Publications', description: 'Business books, industry publications' },
      { key: 'dues_subscriptions', label: 'Dues & Subscriptions', description: 'Professional dues, trade publications' },
      { key: 'bad_debts', label: 'Bad Debts', description: 'Uncollectible accounts receivable' },
      { key: 'security_services', label: 'Security Services', description: 'Alarm monitoring, security systems' },
      { key: 'research_development', label: 'Research & Development', description: 'R&D expenses (may qualify for credit)' },
      { key: 'gifts_business', label: 'Business Gifts', description: 'Gifts to clients (max $25/person/year)' },
      { key: 'moving_expenses', label: 'Moving Expenses', description: 'Relocating business equipment' },
      { key: 'uniforms', label: 'Uniforms', description: 'Required work uniforms with logo' },
      { key: 'other_misc', label: 'Miscellaneous', description: 'Other miscellaneous business expenses' },
    ],
  },

  // LINE 30: Business Use of Home (Form 8829)
  home_office: {
    key: 'home_office',
    label: 'Home Office Expense',
    line: '30',
    description: 'Expenses for business use of your home',
    note: 'REQUIRES FORM 8829: Must file Form 8829 to claim home office deduction',
    subcategories: [
      { key: 'simplified_method', label: 'Simplified Method', description: '$5 per sq ft (max 300 sq ft = $1,500)' },
      { key: 'regular_method', label: 'Regular Method', description: 'Actual expenses based on business use percentage' },
      { key: 'home_mortgage_interest', label: 'Mortgage Interest', description: 'Business portion of home mortgage interest' },
      { key: 'home_rent', label: 'Rent (Home)', description: 'Business portion of home rent' },
      { key: 'home_utilities', label: 'Home Utilities', description: 'Business portion of utilities' },
      { key: 'home_insurance', label: 'Home Insurance', description: 'Business portion of homeowner\'s insurance' },
      { key: 'home_repairs', label: 'Home Repairs', description: 'Repairs to home office area' },
      { key: 'home_depreciation', label: 'Home Depreciation', description: 'Depreciation on home office space' },
      { key: 'home_office_other', label: 'Other Home Office', description: 'Other home office expenses' },
    ],
  },
};

// ============================================================================
// LEGACY SUPPORT - Maintain backward compatibility
// ============================================================================

// Category keys array for iteration
export const CATEGORY_KEYS = Object.keys(IRS_SCHEDULE_C_CATEGORIES) as CategoryKey[];

// Color mapping for UI (consistent with existing dashboard colors)
export const CATEGORY_COLORS: Record<string, string> = {
  advertising: '#3B82F6',        // blue-500
  car_truck: '#6366F1',          // indigo-500
  commissions_fees: '#A855F7',   // purple-500
  contract_labor: '#EC4899',     // pink-500
  depletion: '#78716C',          // stone-500
  depreciation: '#0EA5E9',       // sky-500
  employee_benefits: '#22C55E',  // green-500
  insurance: '#EF4444',          // red-500
  interest_mortgage: '#F97316',  // orange-500
  interest_other: '#FB923C',     // orange-400
  legal_professional: '#14B8A6', // teal-500
  office_expense: '#8B5CF6',     // violet-500
  pension_plans: '#06B6D4',      // cyan-500
  rent_equipment: '#84CC16',     // lime-500
  rent_property: '#10B981',      // emerald-500
  repairs_maintenance: '#F59E0B', // amber-500
  supplies: '#65A30D',           // lime-600
  taxes_licenses: '#DC2626',     // red-600
  travel: '#DB2777',             // pink-600
  meals: '#F59E0B',              // amber-500
  utilities: '#EAB308',          // yellow-500
  wages: '#7C3AED',              // violet-600
  other: '#6B7280',              // gray-500
  home_office: '#0891B2',        // cyan-600
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get category label
 */
export function getCategoryLabel(categoryKey: string): string {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.label || categoryKey;
}

/**
 * Get Schedule C line number
 */
export function getScheduleCLine(categoryKey: string): string {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.line || '';
}

/**
 * Get deduction rate (default 100%)
 */
export function getDeductionRate(categoryKey: string): number {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.deductionRate ?? 1;
}

/**
 * Format category for display with line number
 */
export function formatCategoryWithLine(categoryKey: string): string {
  const category = IRS_SCHEDULE_C_CATEGORIES[categoryKey];
  if (!category) return categoryKey;
  return `Line ${category.line} - ${category.label}`;
}

/**
 * Get subcategories for a category
 */
export function getSubcategories(categoryKey: string): Subcategory[] {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.subcategories || [];
}

/**
 * Get subcategory label
 */
export function getSubcategoryLabel(categoryKey: string, subcategoryKey: string): string {
  const subcategories = getSubcategories(categoryKey);
  const subcategory = subcategories.find(s => s.key === subcategoryKey);
  return subcategory?.label || subcategoryKey;
}

/**
 * Get category note (special IRS notes)
 */
export function getCategoryNote(categoryKey: string): string | undefined {
  return IRS_SCHEDULE_C_CATEGORIES[categoryKey]?.note;
}

/**
 * Get full category with subcategory for display
 */
export function formatFullCategory(categoryKey: string, subcategoryKey?: string): string {
  const category = IRS_SCHEDULE_C_CATEGORIES[categoryKey];
  if (!category) return categoryKey;

  if (subcategoryKey) {
    const subcategory = category.subcategories.find(s => s.key === subcategoryKey);
    if (subcategory) {
      return `${category.label} > ${subcategory.label}`;
    }
  }

  return category.label;
}

/**
 * Parse combined category string (category:subcategory format)
 */
export function parseCategoryString(combined: string): { category: string; subcategory?: string } {
  const [category, subcategory] = combined.split(':');
  return { category, subcategory };
}

/**
 * Create combined category string
 */
export function createCategoryString(category: string, subcategory?: string): string {
  if (subcategory) {
    return `${category}:${subcategory}`;
  }
  return category;
}

/**
 * Get categories grouped by line number for organized display
 */
export function getCategoriesGroupedByLine(): Array<{ line: string; categories: IRSCategory[] }> {
  const grouped: Record<string, IRSCategory[]> = {};

  Object.values(IRS_SCHEDULE_C_CATEGORIES).forEach(category => {
    const line = category.line;
    if (!grouped[line]) {
      grouped[line] = [];
    }
    grouped[line].push(category);
  });

  return Object.entries(grouped)
    .sort((a, b) => {
      const lineA = parseInt(a[0]) || 99;
      const lineB = parseInt(b[0]) || 99;
      return lineA - lineB;
    })
    .map(([line, categories]) => ({ line, categories }));
}

// ============================================================================
// FOR DATABASE COMPATIBILITY
// ============================================================================

// Legacy IRS_SCHEDULE_C_CATEGORIES array format for existing code
export const IRS_SCHEDULE_C_CATEGORIES_ARRAY = Object.values(IRS_SCHEDULE_C_CATEGORIES).map(cat => ({
  value: cat.key,
  label: cat.label,
  line: cat.line,
}));
