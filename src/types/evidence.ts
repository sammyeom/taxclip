// Evidence Types for IRS Audit-Ready Documentation

export enum EvidenceType {
  RECEIPT = 'receipt',
  INVOICE = 'invoice',
  PAYMENT_PROOF = 'payment_proof',
  ONLINE_ORDER = 'online_order',
  OTHER = 'other',
}

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  [EvidenceType.RECEIPT]: 'Receipt',
  [EvidenceType.INVOICE]: 'Invoice',
  [EvidenceType.PAYMENT_PROOF]: 'Payment Proof',
  [EvidenceType.ONLINE_ORDER]: 'Online Order',
  [EvidenceType.OTHER]: 'Other',
};

export const EVIDENCE_TYPE_COLORS: Record<EvidenceType, string> = {
  [EvidenceType.RECEIPT]: '#10B981', // green-500
  [EvidenceType.INVOICE]: '#3B82F6', // blue-500
  [EvidenceType.PAYMENT_PROOF]: '#8B5CF6', // purple-500
  [EvidenceType.ONLINE_ORDER]: '#F59E0B', // amber-500
  [EvidenceType.OTHER]: '#6B7280', // gray-500
};

export const EVIDENCE_TYPE_ICONS: Record<EvidenceType, string> = {
  [EvidenceType.RECEIPT]: 'Receipt',
  [EvidenceType.INVOICE]: 'FileText',
  [EvidenceType.PAYMENT_PROOF]: 'CreditCard',
  [EvidenceType.ONLINE_ORDER]: 'ShoppingCart',
  [EvidenceType.OTHER]: 'File',
};

export interface EvidenceItem {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  evidence_type: EvidenceType;
  extracted_text?: string; // Text extracted from PDF (pdf-parse)
  upload_date: string;
  order: number;
}

export interface ParsedEmailData {
  vendor?: string;
  date?: string;
  total?: number;
  currency?: string;
  order_number?: string;
  payment_method?: string;
  items?: string[];
  raw_text: string;
}

// Helper function to get evidence type from string
export function getEvidenceType(type: string): EvidenceType {
  const normalized = type.toLowerCase();
  if (Object.values(EvidenceType).includes(normalized as EvidenceType)) {
    return normalized as EvidenceType;
  }
  return EvidenceType.OTHER;
}

// Helper function to get label for evidence type
export function getEvidenceTypeLabel(type: EvidenceType | string): string {
  const evidenceType = typeof type === 'string' ? getEvidenceType(type) : type;
  return EVIDENCE_TYPE_LABELS[evidenceType] || 'Other';
}

// Helper function to get color for evidence type
export function getEvidenceTypeColor(type: EvidenceType | string): string {
  const evidenceType = typeof type === 'string' ? getEvidenceType(type) : type;
  return EVIDENCE_TYPE_COLORS[evidenceType] || EVIDENCE_TYPE_COLORS[EvidenceType.OTHER];
}

// Group evidence items by type for IRS audit display
export function groupEvidenceByType(items: EvidenceItem[]): {
  purchase_docs: EvidenceItem[];
  payment_docs: EvidenceItem[];
  receipts: EvidenceItem[];
  other: EvidenceItem[];
} {
  return {
    purchase_docs: items.filter(
      (i) => i.evidence_type === EvidenceType.INVOICE || i.evidence_type === EvidenceType.ONLINE_ORDER
    ),
    payment_docs: items.filter((i) => i.evidence_type === EvidenceType.PAYMENT_PROOF),
    receipts: items.filter((i) => i.evidence_type === EvidenceType.RECEIPT),
    other: items.filter((i) => i.evidence_type === EvidenceType.OTHER),
  };
}
