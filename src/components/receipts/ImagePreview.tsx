'use client';

import {
  X,
  Loader2,
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
  Upload,
  Sparkles,
  Receipt,
  CreditCard,
  ShoppingCart,
  File,
  ChevronDown,
} from 'lucide-react';
import {
  EvidenceType,
  EVIDENCE_TYPE_LABELS,
  EVIDENCE_TYPE_COLORS,
} from '@/types/evidence';

// File upload status types
export type FileStatus =
  | 'pending'
  | 'uploading'
  | 'analyzing'
  | 'complete'
  | 'error';

// OCR item can be either a string (legacy) or an object with qty, unitPrice, amount
interface OCRItem {
  name: string;
  qty?: number;
  unitPrice?: number;
  amount?: number;
}

export interface FileWithPreview {
  id: string;
  file: File;
  preview: string | null;
  status: FileStatus;
  progress: number;
  error?: string;
  ocrData?: {
    date: string;
    vendor: string;
    amount: number;
    currency: string;
    category: string;
    items?: (string | OCRItem)[];
    paymentMethod?: string;
  };
  evidenceType: EvidenceType; // Tag for IRS audit: receipt, invoice, payment_proof, etc.
  extractedPdfText?: string;  // Text extracted from PDF files
}

interface ImagePreviewProps {
  files: FileWithPreview[];
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry?: (id: string) => void;
  selectedIds?: string[];        // For multi-image selection
  onSelect?: (id: string) => void; // Callback for selection
  multiSelectMode?: boolean;     // Enable multi-select for grouping
  onEvidenceTypeChange?: (id: string, type: EvidenceType) => void; // Callback for evidence type change
}

// Status badge component
function StatusBadge({ status, progress }: { status: FileStatus; progress: number }) {
  const configs = {
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      icon: null,
      label: 'Pending',
    },
    uploading: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: <Upload className="w-3 h-3 animate-pulse" />,
      label: `Uploading... ${progress}%`,
    },
    analyzing: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: <Sparkles className="w-3 h-3 animate-pulse" />,
      label: 'OCR Analyzing...',
    },
    complete: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Complete',
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Failed',
    },
  };

  const config = configs[status];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium
        ${config.bg} ${config.text}
      `}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// Progress bar component
function ProgressBar({ progress, status }: { progress: number; status: FileStatus }) {
  if (status !== 'uploading' && status !== 'analyzing') return null;

  return (
    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
      <div
        className={`
          h-full transition-all duration-300 ease-out rounded-full
          ${status === 'uploading' ? 'bg-blue-500' : 'bg-yellow-500'}
        `}
        style={{ width: `${status === 'analyzing' ? 100 : progress}%` }}
      />
    </div>
  );
}

// Evidence type icon mapping
function EvidenceTypeIcon({ type, className = "w-3 h-3" }: { type: EvidenceType; className?: string }) {
  const icons = {
    [EvidenceType.RECEIPT]: Receipt,
    [EvidenceType.INVOICE]: FileText,
    [EvidenceType.PAYMENT_PROOF]: CreditCard,
    [EvidenceType.ONLINE_ORDER]: ShoppingCart,
    [EvidenceType.OTHER]: File,
  };
  const Icon = icons[type] || File;
  return <Icon className={className} />;
}

// Evidence type selector dropdown
function EvidenceTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: EvidenceType;
  onChange: (type: EvidenceType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EvidenceType)}
        disabled={disabled}
        className="appearance-none w-full pr-8 sm:pr-9 py-2 text-[11px] sm:text-xs font-medium rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{
          color: EVIDENCE_TYPE_COLORS[value],
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          paddingLeft: '44px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {Object.values(EvidenceType).map((type) => (
          <option key={type} value={type} style={{ color: EVIDENCE_TYPE_COLORS[type] }}>
            {EVIDENCE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: EVIDENCE_TYPE_COLORS[value],
        }}
      >
        <EvidenceTypeIcon type={value} className="w-4 h-4" />
      </div>
      <div
        className="pointer-events-none text-gray-400"
        style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

// Single file preview card - supports long receipt images with vertical scroll
function FilePreviewCard({
  fileData,
  onRemove,
  onCancel,
  onRetry,
  isSelected,
  onSelect,
  onEvidenceTypeChange,
}: {
  fileData: FileWithPreview;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onEvidenceTypeChange?: (id: string, type: EvidenceType) => void;
}) {
  const { id, file, preview, status, progress, error, evidenceType } = fileData;
  const isProcessing = status === 'uploading' || status === 'analyzing';
  const isPDF = file.type === 'application/pdf';

  return (
    <div
      onClick={() => onSelect?.(id)}
      className={`
        relative bg-white rounded-lg border overflow-hidden transition-all
        ${status === 'error' ? 'border-red-300' : 'border-gray-200'}
        ${status === 'complete' ? 'border-green-300' : ''}
        ${isSelected ? 'ring-2 ring-cyan-500 border-cyan-500' : ''}
        ${onSelect ? 'cursor-pointer hover:border-cyan-400' : ''}
      `}
    >
      {/* Image/File preview area - Fixed width, scrollable for long images */}
      <div className="relative w-full h-40 sm:h-48 bg-gray-100 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {isPDF ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <FileText className="w-12 h-12 text-slate-400" />
          </div>
        ) : preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-auto min-h-full object-contain object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <ImageIcon className="w-12 h-12 text-slate-400" />
          </div>
        )}

        {/* Overlay for processing state */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Remove/Cancel button - perfectly circular */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            isProcessing ? onCancel(id) : onRemove(id);
          }}
          className={`
            absolute top-2 right-2 z-10 shadow-md
            flex items-center justify-center
            rounded-[50%] transition-colors
            ${
              isProcessing
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300'
            }
          `}
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            minHeight: '32px',
            maxWidth: '32px',
            maxHeight: '32px',
            aspectRatio: '1 / 1',
            flexShrink: 0,
          }}
          title={isProcessing ? 'Cancel' : 'Remove'}
        >
          <X className="w-4 h-4" style={{ flexShrink: 0 }} />
        </button>

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-2 left-2 bg-cyan-500 text-white rounded-full p-1">
            <CheckCircle className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* File info section */}
      <div className="p-3">
        {/* File name */}
        <p className="text-sm font-medium text-slate-900 truncate mb-1">
          {file.name}
        </p>

        {/* File size */}
        <p className="text-xs text-slate-500 mb-2">
          {(file.size / 1024).toFixed(1)} KB
        </p>

        {/* Evidence Type Selector */}
        {onEvidenceTypeChange && (
          <div className="mb-2">
            <EvidenceTypeSelector
              value={evidenceType}
              onChange={(type) => onEvidenceTypeChange(id, type)}
              disabled={isProcessing}
            />
          </div>
        )}

        {/* Status badge */}
        <StatusBadge status={status} progress={progress} />

        {/* Progress bar */}
        <ProgressBar progress={progress} status={status} />

        {/* Error message */}
        {status === 'error' && error && (
          <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Retry button for failed uploads */}
        {status === 'error' && onRetry && (
          <button
            onClick={() => onRetry(id)}
            className="mt-2 w-full text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Retry Upload
          </button>
        )}

        {/* OCR data preview for completed files */}
        {status === 'complete' && fileData.ocrData && (
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-slate-600 space-y-1">
            <p>
              <span className="text-slate-400">Vendor:</span>{' '}
              {fileData.ocrData.vendor}
            </p>
            <p>
              <span className="text-slate-400">Amount:</span>{' '}
              ${fileData.ocrData.amount.toFixed(2)}
            </p>
          </div>
        )}

        {/* PDF extracted text indicator */}
        {isPDF && fileData.extractedPdfText && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Text extracted from PDF
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Overall progress component
function OverallProgress({ files }: { files: FileWithPreview[] }) {
  const total = files.length;
  const completed = files.filter((f) => f.status === 'complete').length;
  const processing = files.filter(
    (f) => f.status === 'uploading' || f.status === 'analyzing'
  ).length;
  const failed = files.filter((f) => f.status === 'error').length;

  if (total === 0) return null;

  const overallProgress = Math.round((completed / total) * 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Overall Progress
        </h3>
        <span className="text-sm text-slate-600">
          {completed} / {total} files
          {processing > 0 && ` (${processing} processing...)`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-500 transition-all duration-300 rounded-full"
          style={{ width: `${overallProgress}%` }}
        />
      </div>

      {/* Status summary */}
      <div className="flex gap-4 mt-2 text-xs">
        {completed > 0 && (
          <span className="text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {completed} completed
          </span>
        )}
        {processing > 0 && (
          <span className="text-blue-600 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {processing} processing
          </span>
        )}
        {failed > 0 && (
          <span className="text-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {failed} failed
          </span>
        )}
      </div>
    </div>
  );
}

// Main ImagePreview component
export default function ImagePreview({
  files,
  onRemove,
  onCancel,
  onRetry,
  selectedIds = [],
  onSelect,
  multiSelectMode = false,
  onEvidenceTypeChange,
}: ImagePreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Overall progress bar */}
      <OverallProgress files={files} />

      {/* Multi-select info */}
      {multiSelectMode && selectedIds.length > 0 && (
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-sm text-cyan-800">
          <span className="font-semibold">{selectedIds.length}</span> image{selectedIds.length !== 1 ? 's' : ''} selected for this receipt
          {selectedIds.length > 1 && (
            <span className="text-cyan-600 ml-2">(Multi-page receipt)</span>
          )}
        </div>
      )}

      {/* File grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {files.map((fileData) => (
          <FilePreviewCard
            key={fileData.id}
            fileData={fileData}
            onRemove={onRemove}
            onCancel={onCancel}
            onRetry={onRetry}
            isSelected={selectedIds.includes(fileData.id)}
            onSelect={multiSelectMode ? onSelect : undefined}
            onEvidenceTypeChange={onEvidenceTypeChange}
          />
        ))}
      </div>
    </div>
  );
}

// Utility function to convert HEIC to JPEG for preview
export async function convertHeicToPreview(file: File): Promise<string> {
  if (
    file.type === 'image/heic' ||
    file.type === 'image/heif' ||
    file.name.toLowerCase().endsWith('.heic') ||
    file.name.toLowerCase().endsWith('.heif')
  ) {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8,
      });

      const blob = Array.isArray(convertedBlob)
        ? convertedBlob[0]
        : convertedBlob;
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      return '';
    }
  }

  // For other image types, create object URL directly
  return URL.createObjectURL(file);
}

// Generate unique ID for files
export function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
